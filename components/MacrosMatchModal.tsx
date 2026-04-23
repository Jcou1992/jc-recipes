'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { searchFdcAction, setIngredientMatches, type BatchEntry } from '@/app/actions/macros';
import type { Ingredient, MacroValues, Recipe } from '@/types/recipe';

interface Props {
  recipe: Recipe;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface RowState {
  candidatesLoading: boolean;
  candidates: Array<{ fdc_id: number; name: string }>;
  candidatesError: boolean;
  selectedFdcId?: number;
  showManual: boolean;
  manualValues: MacroValues;
}

function defaultOverride(): MacroValues {
  return { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 };
}

function initialRow(ing: Ingredient): RowState {
  return {
    candidatesLoading: true,
    candidates: [],
    candidatesError: false,
    selectedFdcId: ing.fdc_id,
    showManual: !!ing.macros_override,
    manualValues: ing.macros_override ?? defaultOverride(),
  };
}

function isCountableIngredient(ing: Ingredient): boolean {
  if (ing.unit === null) return true;
  const normalized = ing.unit.trim().toLowerCase();
  return ['pieces', 'piece', 'clove', 'cloves', 'slice', 'slices'].includes(normalized);
}

export function MacrosMatchModal({ recipe, open, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Map<number, RowState>>(new Map());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const firstUnmatchedRadioRef = useRef<HTMLInputElement | null>(null);
  const saveButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const seeded = new Map<number, RowState>();
    recipe.ingredients.forEach((ing, idx) => {
      seeded.set(idx, initialRow(ing));
    });
    setRows(seeded);
    setError(null);

    let cancelled = false;
    (async () => {
      for (let idx = 0; idx < recipe.ingredients.length; idx++) {
        const ing = recipe.ingredients[idx];
        const r = await searchFdcAction(ing.name);
        if (cancelled) return;
        setRows((prev) => {
          const next = new Map(prev);
          const existing = next.get(idx);
          if (!existing) return prev;
          if ('error' in r) {
            next.set(idx, { ...existing, candidatesLoading: false, candidatesError: true });
          } else {
            next.set(idx, {
              ...existing,
              candidatesLoading: false,
              candidates: r.candidates.slice(0, 3),
              selectedFdcId:
                existing.selectedFdcId ?? (r.candidates[0]?.fdc_id as number | undefined),
            });
          }
          return next;
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, recipe.ingredients]);

  // Determine the index of the first unmatched ingredient so we can attach
  // the initial-focus ref to its first radio input.
  const firstUnmatchedIndex = (() => {
    for (let i = 0; i < recipe.ingredients.length; i++) {
      const ing = recipe.ingredients[i];
      const row = rows.get(i);
      // Unmatched when the ingredient has no persisted fdc_id/override and
      // no selection has been made yet, or when there are no candidates at all.
      const hasPersistedMatch = !!ing.fdc_id || !!ing.macros_override;
      if (!hasPersistedMatch) return i;
      if (row && !row.candidatesLoading && row.candidates.length === 0) return i;
    }
    return -1;
  })();

  // Capture previous focus on open; restore on close.
  const hasFocusedRef = useRef(false);
  useEffect(() => {
    if (!open) {
      hasFocusedRef.current = false;
      return;
    }
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    // Defer initial focus to next tick so the dialog has rendered.
    // Candidates load asynchronously — if no radio exists yet, focus the
    // Save or Close button as a fallback (a second effect will hand off
    // to the first radio once candidates arrive).
    const handle = setTimeout(() => {
      if (firstUnmatchedRadioRef.current) {
        firstUnmatchedRadioRef.current.focus();
        hasFocusedRef.current = true;
      } else if (saveButtonRef.current) {
        saveButtonRef.current.focus();
      } else if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      } else {
        dialogRef.current?.focus();
      }
    }, 0);
    return () => {
      clearTimeout(handle);
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [open]);

  // Once the first unmatched radio renders (after async candidate loading),
  // move focus to it — but only once, and only if focus is still inside the
  // dialog (don't steal focus from a user who has tabbed elsewhere).
  useEffect(() => {
    if (!open) return;
    if (hasFocusedRef.current) return;
    const radio = firstUnmatchedRadioRef.current;
    if (!radio) return;
    const root = dialogRef.current;
    const active = document.activeElement as HTMLElement | null;
    if (root && (active === root || root.contains(active))) {
      radio.focus();
      hasFocusedRef.current = true;
    }
  }, [open, rows, firstUnmatchedIndex]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const root = dialogRef.current;
    if (!root) return;
    const focusable = root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const save = () => {
    setError(null);
    startTransition(async () => {
      const entries: BatchEntry[] = [];
      recipe.ingredients.forEach((ing, idx) => {
        const row = rows.get(idx);
        if (!row) return;
        if (row.showManual) {
          entries.push({
            ingredientIndex: idx,
            expectedName: ing.name,
            override: row.manualValues,
          });
          return;
        }
        if (row.selectedFdcId !== undefined && row.selectedFdcId !== ing.fdc_id) {
          entries.push({
            ingredientIndex: idx,
            expectedName: ing.name,
            fdcId: row.selectedFdcId,
          });
        }
      });
      if (entries.length === 0) {
        onClose();
        return;
      }
      const result = await setIngredientMatches(recipe.id, entries);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-modal-title"
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'color-mix(in srgb, var(--bg) 70%, black 40%)' }}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="macros-match-modal"
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg p-5"
        style={{
          background: 'var(--bg-raised)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <h2
            id="match-modal-title"
            className="font-display text-xl"
            style={{ color: 'var(--text-1)' }}
          >
            Match ingredients
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            ref={closeButtonRef}
            className="font-label text-lg leading-none p-2 -m-2"
            style={{ color: 'var(--text-3)' }}
          >
            ×
          </button>
        </div>

        {error && (
          <p
            className="mb-3 font-label text-xs tracking-wide"
            style={{ color: 'var(--color-terracotta)' }}
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="space-y-4">
          {recipe.ingredients.map((ing, idx) => {
            const row = rows.get(idx);
            return (
              <fieldset
                key={idx}
                className="rounded p-3"
                style={{ border: '1px solid var(--border)' }}
                data-testid={`match-row-${idx}`}
              >
                <legend
                  className="px-2 font-label text-xs tracking-widest uppercase"
                  style={{ color: 'var(--text-2)' }}
                >
                  {ing.name}
                </legend>

                {row?.candidatesLoading && (
                  <div className="space-y-2" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-8 rounded animate-pulse"
                        style={{ background: 'color-mix(in srgb, var(--border) 60%, transparent)' }}
                      />
                    ))}
                  </div>
                )}

                {row && !row.candidatesLoading && row.candidatesError && (
                  <p
                    className="font-label text-xs tracking-wide"
                    style={{ color: 'var(--color-gold)' }}
                  >
                    Couldn't load suggestions.
                  </p>
                )}

                {row &&
                  !row.candidatesLoading &&
                  !row.candidatesError &&
                  row.candidates.length === 0 && (
                    <p
                      className="font-body text-sm"
                      style={{ color: 'var(--text-3)' }}
                    >
                      No close matches — enter manually below.
                    </p>
                  )}

                {row && !row.candidatesLoading && row.candidates.length > 0 && (
                  <div className="space-y-1.5">
                    {row.candidates.map((c, cIdx) => (
                      <label
                        key={c.fdc_id}
                        className="flex items-start gap-2 font-body text-sm cursor-pointer"
                        style={{ color: 'var(--text-1)' }}
                      >
                        <input
                          type="radio"
                          name={`match-${idx}`}
                          ref={
                            idx === firstUnmatchedIndex && cIdx === 0
                              ? firstUnmatchedRadioRef
                              : undefined
                          }
                          checked={row.selectedFdcId === c.fdc_id && !row.showManual}
                          onChange={() =>
                            setRows((prev) => {
                              const next = new Map(prev);
                              next.set(idx, { ...row, selectedFdcId: c.fdc_id, showManual: false });
                              return next;
                            })
                          }
                          className="mt-1"
                        />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="mt-3 font-label text-[11px] tracking-widest uppercase"
                  style={{ color: 'var(--color-terracotta)' }}
                  onClick={() =>
                    setRows((prev) => {
                      const next = new Map(prev);
                      const r = next.get(idx);
                      if (!r) return prev;
                      next.set(idx, { ...r, showManual: !r.showManual });
                      return next;
                    })
                  }
                >
                  {row?.showManual ? 'Use a USDA match instead' : 'Enter manually →'}
                </button>

                {row?.showManual && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(['kcal', 'fat_g', 'carbs_g', 'protein_g', 'fiber_g'] as const).map((k) => (
                      <label key={k} className="flex flex-col font-label text-[11px] tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
                        <span>{k.replace('_g', '')}</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.manualValues[k]}
                          onChange={(e) =>
                            setRows((prev) => {
                              const next = new Map(prev);
                              const r = next.get(idx);
                              if (!r) return prev;
                              next.set(idx, {
                                ...r,
                                manualValues: {
                                  ...r.manualValues,
                                  [k]: Number(e.target.value),
                                },
                              });
                              return next;
                            })
                          }
                          className="input-base mt-1"
                        />
                      </label>
                    ))}
                    <p
                      className="sm:col-span-5 font-body text-xs mt-1"
                      style={{ color: 'var(--text-3)' }}
                    >
                      Per 100 g of raw ingredient.
                      {isCountableIngredient(ing) && (
                        <> Tip: if your nutrition label lists values per piece, divide accordingly.</>
                      )}
                    </p>
                  </div>
                )}
              </fieldset>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost font-label text-xs tracking-widest uppercase">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            ref={saveButtonRef}
            className="btn-primary font-label text-xs tracking-widest uppercase"
            data-testid="macros-save-btn"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
