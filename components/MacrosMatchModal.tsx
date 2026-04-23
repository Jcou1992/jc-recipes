'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { searchFdcAction, setIngredientMatches, type BatchEntry } from '@/app/actions/macros';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
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
  /** Cached FDC name so "Current match" can display even when the saved id
   *  falls outside the current top-3 candidate window. */
  fdcName?: string;
  showManual: boolean;
  manualValues: MacroValues;
  /** True when the row has never had a persisted override — inputs render with
   *  placeholders instead of literal "0" to avoid the illusion of real data. */
  manualPristine: boolean;
  /** Re-search disclosure state — query is decoupled from recipe ingredient
   *  name so a Spanish "tomate" can search USDA as "tomato" without mutating
   *  authored intent. */
  searchOpen: boolean;
  searchQuery: string;
  searchLoading: boolean;
}

type RowStatus = 'loading' | 'matched' | 'manual' | 'unmatched' | 'error';

function defaultOverride(): MacroValues {
  return { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 };
}

function initialRow(ing: Ingredient): RowState {
  return {
    candidatesLoading: true,
    candidates: [],
    candidatesError: false,
    selectedFdcId: ing.fdc_id,
    fdcName: ing.fdc_name,
    showManual: !!ing.macros_override,
    manualValues: ing.macros_override ?? defaultOverride(),
    manualPristine: !ing.macros_override,
    searchOpen: false,
    searchQuery: ing.name,
    searchLoading: false,
  };
}

function isCountableIngredient(ing: Ingredient): boolean {
  if (ing.unit === null) return true;
  const normalized = ing.unit.trim().toLowerCase();
  return ['pieces', 'piece', 'clove', 'cloves', 'slice', 'slices'].includes(normalized);
}

function formatIngredientContext(ing: Ingredient): string {
  const parts: string[] = [];
  if (ing.amount && ing.amount > 0) {
    const amt = Number.isInteger(ing.amount) ? String(ing.amount) : ing.amount.toString();
    parts.push(ing.unit ? `${amt} ${ing.unit}` : amt);
  } else if (ing.unit) {
    parts.push(ing.unit);
  }
  return parts.join(' ');
}

function rowStatus(ing: Ingredient, row: RowState | undefined): RowStatus {
  if (!row || row.candidatesLoading) return 'loading';
  if (row.candidatesError) return 'error';
  if (row.showManual) return 'manual';
  if (row.selectedFdcId) return 'matched';
  return 'unmatched';
}

const STATUS_LABEL: Record<RowStatus, string> = {
  loading: 'Searching',
  matched: 'Matched',
  manual: 'Manual',
  unmatched: 'No match',
  error: 'Error',
};

const STATUS_STYLE: Record<RowStatus, React.CSSProperties> = {
  loading: {
    background: 'color-mix(in oklch, var(--text-3) 12%, transparent)',
    color: 'var(--text-3)',
    border: '1px solid color-mix(in oklch, var(--text-3) 28%, transparent)',
  },
  matched: {
    background: 'color-mix(in oklch, var(--color-gold) 16%, transparent)',
    color: 'var(--color-gold)',
    border: '1px solid color-mix(in oklch, var(--color-gold) 38%, transparent)',
  },
  manual: {
    background: 'color-mix(in oklch, var(--color-terracotta) 14%, transparent)',
    color: 'var(--color-terracotta)',
    border: '1px solid color-mix(in oklch, var(--color-terracotta) 34%, transparent)',
  },
  unmatched: {
    background: 'color-mix(in oklch, var(--color-terracotta) 10%, transparent)',
    color: 'var(--color-terracotta)',
    border: '1px solid color-mix(in oklch, var(--color-terracotta) 30%, transparent)',
  },
  error: {
    background: 'color-mix(in oklch, var(--color-gold) 10%, transparent)',
    color: 'var(--color-gold)',
    border: '1px solid color-mix(in oklch, var(--color-gold) 30%, transparent)',
  },
};

export function MacrosMatchModal({ recipe, open, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Map<number, RowState>>(new Map());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open, onClose);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const needsAttentionCount = useMemo(() => {
    let n = 0;
    recipe.ingredients.forEach((ing, idx) => {
      const row = rows.get(idx);
      const status = rowStatus(ing, row);
      if (status === 'unmatched' || status === 'error') n++;
    });
    return n;
  }, [recipe.ingredients, rows]);

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

  if (!open || !mounted) return null;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      data-testid="macros-match-modal"
    >
      {/* Full-bleed scrim, separate from panel so modal renders over any
          transformed ancestor. Click dismisses. */}
      <div
        className="absolute inset-0"
        style={{ background: 'oklch(0 0 0 / 0.65)' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full sm:dialog-panel-2xl flex flex-col h-[92dvh] sm:h-auto sm:max-h-[88dvh] rounded-t-2xl sm:rounded-2xl animate-scale-in overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-dialog)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header — sticky, shares bg so underline hairline reads as chrome */}
        <header
          className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6 pb-4"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div>
            <h2
              id="match-modal-title"
              className="font-display text-xl sm:text-2xl leading-tight"
              style={{ color: 'var(--text-1)' }}
            >
              Match ingredients
            </h2>
            <p
              className="mt-1 font-label text-[11px] tracking-widest uppercase"
              style={{ color: 'var(--text-3)' }}
            >
              {recipe.ingredients.length > 0 && (
                needsAttentionCount === 0
                  ? `All ${recipe.ingredients.length} ready to save`
                  : `${needsAttentionCount} of ${recipe.ingredients.length} need attention`
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-m-2 p-3 rounded-full transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4 L14 14 M14 4 L4 14" />
            </svg>
          </button>
        </header>

        {/* Scrollable body — ingredient stations, mise en place */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-4">
          {error && (
            <p
              className="mb-4 font-label text-xs tracking-wide rounded-lg px-3 py-2"
              style={{
                color: 'var(--color-terracotta)',
                background: 'color-mix(in oklch, var(--color-terracotta) 10%, transparent)',
                border: '1px solid color-mix(in oklch, var(--color-terracotta) 30%, transparent)',
              }}
              role="alert"
            >
              {error}
            </p>
          )}

          <ul className="flex flex-col">
            {recipe.ingredients.map((ing, idx) => {
              const row = rows.get(idx);
              const status = rowStatus(ing, row);
              const context = formatIngredientContext(ing);
              const isLast = idx === recipe.ingredients.length - 1;
              return (
                <li
                  key={idx}
                  className="py-4 first:pt-0"
                  style={!isLast ? { borderBottom: '1px solid color-mix(in oklch, var(--color-gold) 16%, transparent)' } : undefined}
                  data-testid={`match-row-${idx}`}
                >
                  {/* Station header */}
                  <div className="flex items-baseline justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3
                        className="font-label text-[11px] tracking-widest uppercase truncate"
                        style={{ color: 'var(--text-2)' }}
                      >
                        {ing.name}
                      </h3>
                      {context && (
                        <p
                          className="font-body text-xs mt-0.5"
                          style={{ color: 'var(--text-3)' }}
                        >
                          {context}
                        </p>
                      )}
                    </div>
                    <span
                      className="font-label text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full whitespace-nowrap"
                      style={STATUS_STYLE[status]}
                      aria-label={`Status: ${STATUS_LABEL[status]}`}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </div>

                  {/* Loading skeleton */}
                  {status === 'loading' && (
                    <div className="space-y-2" aria-busy="true">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-9 rounded-md animate-pulse"
                          style={{ background: 'color-mix(in oklch, var(--border) 120%, transparent)' }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {status === 'error' && (
                    <p
                      className="font-body text-sm"
                      style={{ color: 'var(--text-2)' }}
                    >
                      Couldn&apos;t load USDA suggestions. Enter macros manually below.
                    </p>
                  )}

                  {/* USDA candidate list */}
                  {row && !row.candidatesLoading && !row.candidatesError && !row.showManual && row.candidates.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {row.candidates.map((c) => {
                        const checked = row.selectedFdcId === c.fdc_id;
                        return (
                          <label
                            key={c.fdc_id}
                            className="relative flex items-start gap-3 cursor-pointer rounded-lg px-3 py-2.5 transition-colors"
                            style={{
                              minHeight: '44px',
                              background: checked
                                ? 'color-mix(in oklch, var(--color-terracotta) 9%, transparent)'
                                : 'transparent',
                              border: checked
                                ? '1px solid color-mix(in oklch, var(--color-terracotta) 42%, transparent)'
                                : '1px solid var(--border)',
                            }}
                          >
                            <input
                              type="radio"
                              name={`match-${idx}`}
                              checked={checked}
                              onChange={() =>
                                setRows((prev) => {
                                  const next = new Map(prev);
                                  const r = next.get(idx);
                                  if (!r) return prev;
                                  next.set(idx, {
                                    ...r,
                                    selectedFdcId: c.fdc_id,
                                    fdcName: c.name,
                                    showManual: false,
                                    searchOpen: false,
                                  });
                                  return next;
                                })
                              }
                              className="sr-only"
                            />
                            <span
                              className="mt-[3px] shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-colors"
                              aria-hidden="true"
                              style={{
                                border: checked
                                  ? '1.5px solid var(--color-terracotta)'
                                  : '1.5px solid var(--border-input)',
                                background: 'transparent',
                              }}
                            >
                              <span
                                className="block rounded-full transition-transform"
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  background: 'var(--color-terracotta)',
                                  transform: checked ? 'scale(1)' : 'scale(0)',
                                }}
                              />
                            </span>
                            <span
                              className="font-body text-sm leading-snug"
                              style={{ color: 'var(--text-1)' }}
                            >
                              {c.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {/* No-match warm copy */}
                  {row && !row.candidatesLoading && !row.candidatesError && !row.showManual && row.candidates.length === 0 && !row.searchOpen && (
                    <p
                      className="font-body text-sm italic"
                      style={{ color: 'var(--text-2)' }}
                    >
                      Fresh ingredient — not in the USDA catalog. Enter macros manually below, or search differently.
                    </p>
                  )}

                  {/* Row action links — always rendered once candidates are
                      loaded (even with zero results), since Search-again IS the
                      escape hatch when the ingredient is in Spanish, spelled
                      oddly, etc. */}
                  {row && !row.candidatesLoading && !row.candidatesError && !row.showManual && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <button
                        type="button"
                        aria-expanded={row.searchOpen}
                        aria-controls={`search-again-${idx}`}
                        data-testid={`search-again-btn-${idx}`}
                        className="mt-2 inline-flex items-center gap-1 font-label text-[11px] tracking-widest uppercase transition-opacity hover:opacity-80"
                        style={{ color: 'var(--color-terracotta)', minHeight: '32px' }}
                        onClick={() =>
                          setRows((prev) => {
                            const next = new Map(prev);
                            const r = next.get(idx);
                            if (!r) return prev;
                            next.set(idx, { ...r, searchOpen: !r.searchOpen });
                            return next;
                          })
                        }
                      >
                        {row.searchOpen ? '↑ Close search' : 'Search again →'}
                      </button>
                      {row.candidates.length > 0 && (
                        <button
                          type="button"
                          className="mt-2 inline-flex items-center gap-1 font-label text-[11px] tracking-widest uppercase transition-opacity hover:opacity-80"
                          style={{ color: 'var(--color-terracotta)', minHeight: '32px' }}
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
                          {row.showManual ? '← Use a USDA match' : 'Enter manually →'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Re-search disclosure panel */}
                  {row?.searchOpen && !row.showManual && (
                    <div
                      id={`search-again-${idx}`}
                      className="mt-2 p-3 rounded-lg"
                      style={{
                        background: 'color-mix(in oklch, var(--border) 28%, transparent)',
                        border: '1px solid var(--border)',
                      }}
                      data-testid={`search-again-panel-${idx}`}
                    >
                      <p
                        className="font-label text-[10px] tracking-widest uppercase mb-2"
                        style={{ color: 'var(--text-3)' }}
                      >
                        Search USDA differently
                      </p>
                      <input
                        type="text"
                        value={row.searchQuery}
                        placeholder="Try a different name…"
                        aria-label={`Search USDA differently for ${ing.name}`}
                        data-testid={`search-again-input-${idx}`}
                        className="input-base w-full"
                        onChange={(e) =>
                          setRows((prev) => {
                            const next = new Map(prev);
                            const r = next.get(idx);
                            if (!r) return prev;
                            next.set(idx, { ...r, searchQuery: e.target.value });
                            return next;
                          })
                        }
                      />
                      {row.searchLoading && (
                        <div className="space-y-2 mt-2" aria-busy="true" data-testid={`search-again-loading-${idx}`}>
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="h-9 rounded-md animate-pulse"
                              style={{ background: 'color-mix(in oklch, var(--border) 120%, transparent)' }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual entry form — shown when toggled on OR when no
                      candidates exist (so the user always has a path forward). */}
                  {row && !row.candidatesLoading && (row.showManual || row.candidates.length === 0) && (
                    <div className="mt-3">
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                        {(['kcal', 'fat_g', 'carbs_g', 'protein_g', 'fiber_g'] as const).map((k) => {
                          const value = row.manualValues[k];
                          const displayValue = row.manualPristine && value === 0 ? '' : value;
                          return (
                            <label
                              key={k}
                              className="flex flex-col font-label text-[10px] tracking-widest uppercase gap-1"
                              style={{ color: 'var(--text-3)' }}
                            >
                              <span>{k.replace('_g', '')}</span>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                inputMode="decimal"
                                placeholder="0"
                                value={displayValue}
                                onChange={(e) =>
                                  setRows((prev) => {
                                    const next = new Map(prev);
                                    const r = next.get(idx);
                                    if (!r) return prev;
                                    const v = e.target.value === '' ? 0 : Number(e.target.value);
                                    next.set(idx, {
                                      ...r,
                                      manualValues: { ...r.manualValues, [k]: v },
                                      manualPristine: false,
                                    });
                                    return next;
                                  })
                                }
                                className="input-base"
                              />
                            </label>
                          );
                        })}
                      </div>
                      {isCountableIngredient(ing) && (
                        <p
                          className="mt-2 font-body text-xs italic"
                          style={{ color: 'var(--text-3)' }}
                        >
                          Values per 100 g of raw ingredient. If your label lists per piece, divide by piece weight.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Single global footnote re: per-100g convention — lives at bottom
              of scroll area so it appears once, not per station. */}
          <p
            className="mt-4 font-body text-xs"
            style={{ color: 'var(--text-3)' }}
          >
            Macros are stored per 100 g of the raw ingredient, so scaling a recipe or switching units stays accurate.
          </p>
        </div>

        {/* Sticky footer — always reachable even mid-scroll */}
        <footer
          className="flex items-center justify-end gap-2 px-5 sm:px-6 py-4"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-card)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost font-label text-xs tracking-widest uppercase"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="btn-primary font-label text-xs tracking-widest uppercase"
            data-testid="macros-save-btn"
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </footer>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
