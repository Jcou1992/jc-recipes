'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import IngredientRow, { type IngredientField } from './IngredientRow';
import StepRow, { type StepField } from './StepRow';
import { parseTimeToMinutes } from '@/lib/utils/parse-recipe-markdown';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';
import { useToast } from '@/components/ui/ToastContext';
import type { Recipe, RecipePayload, Ingredient, Step } from '@/types/recipe';
import type { ActionResult } from '@/app/actions/recipes';

interface Props {
  initialData?: Partial<Recipe>;
  onSubmit: (payload: RecipePayload) => Promise<ActionResult>;
  submitLabel: string;
}

// ── Amount helpers ────────────────────────────────────────────────────────────

function parseAmount(str: string): number {
  const s = str.trim();
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  return parseFloat(s) || 0;
}

function formatAmount(n: number): string {
  if (n === 0) return '';
  if (n === 0.5)  return '1/2';
  if (n === 0.25) return '1/4';
  if (n === 0.75) return '3/4';
  if (n === 1.5)  return '1 1/2';
  return n % 1 === 0 ? String(n) : String(n);
}

// ── Field conversion ──────────────────────────────────────────────────────────

function ingredientsToFields(ings: Ingredient[]): IngredientField[] {
  return ings.length > 0
    ? ings.map(i => ({ amount: formatAmount(i.amount), unit: i.unit ?? '', name: i.name }))
    : [{ amount: '', unit: '', name: '' }];
}

function stepsToFields(steps: Step[]): StepField[] {
  return steps.length > 0
    ? steps.map(s => ({
        content: s.content,
        timerEnabled: s.timer_seconds != null,
        timerInput: s.timer_seconds != null ? `${s.timer_seconds / 60} min` : '',
      }))
    : [{ content: '', timerEnabled: false, timerInput: '' }];
}

// ── Label style ───────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = { color: 'var(--text-3)' };

// ── Soft-delete ingredient type ───────────────────────────────────────────────

interface IngredientEntry {
  field: IngredientField;
  /** When set, this ingredient is pending deletion — permanently removed after timeout */
  deletedAt?: number;
  undoTimer?: ReturnType<typeof setTimeout>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecipeForm({ initialData, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // Required fields
  const [name, setName]         = useState(initialData?.name ?? '');
  const [servings, setServings] = useState(String(initialData?.servings ?? 1));

  // Ingredients with soft-delete support
  const [ingredientEntries, setIngredientEntries] = useState<IngredientEntry[]>(
    () => ingredientsToFields(initialData?.ingredients ?? []).map(field => ({ field }))
  );

  const [steps, setSteps] = useState<StepField[]>(
    stepsToFields(initialData?.steps ?? [])
  );

  // Optional fields
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [prepTime, setPrepTime]       = useState(initialData?.prep_time ? String(initialData.prep_time) : '');
  const [cookTime, setCookTime]       = useState(initialData?.cook_time ? String(initialData.cook_time) : '');
  const [tags, setTags]               = useState((initialData?.tags ?? []).join(', '));
  const [notes, setNotes]             = useState(initialData?.notes ?? '');

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; ingredients?: string }>({});

  // Ref to the name input for scrolling to first error
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Dirty tracking — true if any field changed from initial
  const [isDirty, setIsDirty] = useState(false);

  // Derive the "live" ingredients (not soft-deleted) for dirty check
  const activeIngredients = ingredientEntries.filter(e => !e.deletedAt);

  useEffect(() => {
    const dirty =
      name !== (initialData?.name ?? '') ||
      servings !== String(initialData?.servings ?? 1) ||
      description !== (initialData?.description ?? '') ||
      notes !== (initialData?.notes ?? '');
    setIsDirty(dirty);
  }, [name, servings, description, notes, initialData]);

  useUnsavedChanges(isDirty);

  // ── Ingredient handlers ──────────────────────────────────────────────────────

  const addIngredient = () =>
    setIngredientEntries(prev => [...prev, { field: { amount: '', unit: '', name: '' } }]);

  const updateIngredient = (i: number, v: IngredientField) =>
    setIngredientEntries(prev => prev.map((e, idx) => idx === i ? { ...e, field: v } : e));

  const softDeleteIngredient = useCallback((i: number) => {
    // Start 4-second undo window
    const timer = setTimeout(() => {
      setIngredientEntries(prev => prev.filter((_, idx) => idx !== i));
    }, 4000);

    setIngredientEntries(prev =>
      prev.map((e, idx) =>
        idx === i ? { ...e, deletedAt: Date.now(), undoTimer: timer } : e
      )
    );
  }, []);

  const undoDeleteIngredient = useCallback((i: number) => {
    setIngredientEntries(prev =>
      prev.map((e, idx) => {
        if (idx !== i) return e;
        if (e.undoTimer) clearTimeout(e.undoTimer);
        return { field: e.field }; // strip deletedAt + undoTimer
      })
    );
  }, []);

  // ── Step handlers ────────────────────────────────────────────────────────────

  const addStep = () =>
    setSteps(prev => [...prev, { content: '', timerEnabled: false, timerInput: '' }]);

  const removeStep = (i: number) =>
    setSteps(prev => prev.filter((_, idx) => idx !== i));

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) {
      errors.name = 'Recipe name is required.';
    }

    const hasAtLeastOneIngredient = activeIngredients.some(e => e.field.name.trim());
    if (!hasAtLeastOneIngredient) {
      errors.ingredients = 'Add at least one ingredient.';
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      // Scroll to first error field
      if (errors.name && nameInputRef.current) {
        nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInputRef.current.focus();
      }
      return false;
    }
    return true;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    const parsedIngredients: Ingredient[] = activeIngredients
      .filter(e => e.field.name.trim())
      .map(e => ({
        amount: parseAmount(e.field.amount),
        unit:   e.field.unit.trim() || null,
        name:   e.field.name.trim(),
      }));

    const parsedSteps: Step[] = steps
      .filter(s => s.content.trim())
      .map((s, idx) => {
        let timer_seconds: number | null = null;
        if (s.timerEnabled && s.timerInput.trim()) {
          const mins = parseTimeToMinutes(s.timerInput);
          timer_seconds = mins != null ? mins * 60 : null;
        }
        return { order: idx + 1, content: s.content.trim(), timer_seconds };
      });

    const payload: RecipePayload = {
      name:        name.trim(),
      servings:    parseInt(servings) || 1,
      ingredients: parsedIngredients,
      steps:       parsedSteps,
      description: description.trim() || null,
      prep_time:   prepTime ? (parseInt(prepTime) || null) : null,
      cook_time:   cookTime ? (parseInt(cookTime) || null) : null,
      tags:        tags.trim() ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      notes:       notes.trim() || null,
      photos:      initialData?.photos ?? null,
    };

    const result = await onSubmit(payload);

    if (result?.error) {
      showToast(result.error, 'error');
      setLoading(false);
      return;
    }

    // On success the server action calls redirect() — framework handles navigation
    setIsDirty(false);
  };

  // ── Error message style ──────────────────────────────────────────────────────

  const fieldErrorStyle: React.CSSProperties = {
    color: 'var(--color-terracotta)',
    fontSize: '0.75rem',
    marginTop: '0.375rem',
    display: 'block',
  };

  const inputErrorStyle: React.CSSProperties = {
    borderColor: 'var(--color-terracotta)',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name (required) */}
      <div>
        <label
          className="font-label block text-xs tracking-widest uppercase mb-1.5"
          style={labelStyle}
          htmlFor="name"
        >
          Name <span style={{ color: 'var(--color-terracotta)' }}>*</span>
        </label>
        <input
          ref={nameInputRef}
          id="name"
          type="text"
          value={name}
          onChange={e => {
            setName(e.target.value);
            if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
          }}
          placeholder="Recipe name"
          className="input-base"
          style={fieldErrors.name ? inputErrorStyle : undefined}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && (
          <span id="name-error" style={fieldErrorStyle}>{fieldErrors.name}</span>
        )}
      </div>

      {/* Servings (required) */}
      <div className="w-32">
        <label
          className="font-label block text-xs tracking-widest uppercase mb-1.5"
          style={labelStyle}
          htmlFor="servings"
        >
          Servings <span style={{ color: 'var(--color-terracotta)' }}>*</span>
        </label>
        <input
          id="servings"
          type="number"
          min="1"
          value={servings}
          onChange={e => setServings(e.target.value)}
          required
          className="input-base"
        />
      </div>

      {/* Ingredients (required) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="font-label block text-xs tracking-widest uppercase"
            style={labelStyle}
          >
            Ingredients <span style={{ color: 'var(--color-terracotta)' }}>*</span>
          </label>
          <button
            type="button"
            onClick={addIngredient}
            className="font-label text-xs tracking-widest uppercase transition-colors"
            style={{ color: 'var(--color-terracotta)' }}
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {ingredientEntries.map((entry, i) => {
            const isDeleted = !!entry.deletedAt;
            const visibleCount = activeIngredients.length;

            if (isDeleted) {
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1 rounded"
                  style={{
                    background: 'rgba(212,112,63,0.07)',
                    border: '1px dashed rgba(212,112,63,0.3)',
                  }}
                >
                  <span
                    className="font-label text-xs tracking-widest uppercase"
                    style={{ color: 'var(--text-3)', textDecoration: 'line-through', flex: 1 }}
                  >
                    {entry.field.name || 'Ingredient'} removed
                  </span>
                  <button
                    type="button"
                    onClick={() => undoDeleteIngredient(i)}
                    className="font-label text-xs tracking-widest uppercase transition-colors"
                    style={{ color: 'var(--color-terracotta)' }}
                  >
                    Undo
                  </button>
                </div>
              );
            }

            return (
              <IngredientRow
                key={i}
                value={entry.field}
                onChange={v => {
                  updateIngredient(i, v);
                  if (fieldErrors.ingredients) setFieldErrors(prev => ({ ...prev, ingredients: undefined }));
                }}
                onRemove={visibleCount > 1 ? () => softDeleteIngredient(i) : undefined}
              />
            );
          })}
        </div>
        {fieldErrors.ingredients && (
          <span style={fieldErrorStyle}>{fieldErrors.ingredients}</span>
        )}
      </div>

      {/* Steps (required) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="font-label block text-xs tracking-widest uppercase"
            style={labelStyle}
          >
            Steps <span style={{ color: 'var(--color-terracotta)' }}>*</span>
          </label>
          <button
            type="button"
            onClick={addStep}
            className="font-label text-xs tracking-widest uppercase transition-colors"
            style={{ color: 'var(--color-terracotta)' }}
          >
            + Step
          </button>
        </div>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <StepRow
              key={i}
              index={i}
              value={step}
              onChange={v => setSteps(prev => prev.map((x, idx) => idx === i ? v : x))}
              onRemove={steps.length > 1 ? () => removeStep(i) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Optional fields — collapsible */}
      <details className="group">
        <summary
          className="cursor-pointer font-label text-xs tracking-widest uppercase select-none list-none flex items-center gap-1 transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          <span className="group-open:rotate-90 transition-transform inline-block">›</span>
          Optional fields
        </summary>
        <div
          className="mt-4 space-y-4 pl-4"
          style={{ borderLeft: '2px solid var(--border)' }}
        >
          {/* Description */}
          <div>
            <label
              className="font-label block text-xs tracking-widest uppercase mb-1.5"
              style={labelStyle}
              htmlFor="description"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Short description for the list view"
              className="input-base resize-none"
            />
          </div>

          {/* Prep + Cook time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="font-label block text-xs tracking-widest uppercase mb-1.5"
                style={labelStyle}
                htmlFor="prep-time"
              >
                Prep time (min)
              </label>
              <input
                id="prep-time"
                type="number"
                min="0"
                value={prepTime}
                onChange={e => setPrepTime(e.target.value)}
                className="input-base"
              />
            </div>
            <div>
              <label
                className="font-label block text-xs tracking-widest uppercase mb-1.5"
                style={labelStyle}
                htmlFor="cook-time"
              >
                Cook time (min)
              </label>
              <input
                id="cook-time"
                type="number"
                min="0"
                value={cookTime}
                onChange={e => setCookTime(e.target.value)}
                className="input-base"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label
              className="font-label block text-xs tracking-widest uppercase mb-1.5"
              style={labelStyle}
              htmlFor="tags"
            >
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className="input-base"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              className="font-label block text-xs tracking-widest uppercase mb-1.5"
              style={labelStyle}
              htmlFor="notes"
            >
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Variations, tips, shopping notes…"
              className="input-base resize-none"
            />
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            if (isDirty && !window.confirm('You have unsaved changes. Leave anyway?')) return;
            router.back();
          }}
          className="btn-ghost"
        >
          Cancel
        </button>
        {isDirty && (
          <span
            className="font-label text-xs tracking-widest uppercase"
            style={{ color: 'var(--color-terracotta)' }}
            aria-live="polite"
          >
            ● Unsaved changes
          </span>
        )}
      </div>
    </form>
  );
}
