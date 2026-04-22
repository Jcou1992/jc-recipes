'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import IngredientRow, { type IngredientField } from './IngredientRow';
import StepRow, { type StepField } from './StepRow';
import { parseTimeToMinutes } from '@/lib/utils/parse-recipe-markdown';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';
import { useToast } from '@/components/ui/ToastContext';
import { useT } from '@/components/ui/LanguageContext';
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

const labelStyle: React.CSSProperties = { color: 'var(--text-3)' };

interface IngredientEntry {
  field: IngredientField;
  deletedAt?: number;
  undoTimer?: ReturnType<typeof setTimeout>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecipeForm({ initialData, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const t = useT();
  const [loading, setLoading] = useState(false);

  const [name, setName]         = useState(initialData?.name ?? '');
  const [servings, setServings] = useState(String(initialData?.servings ?? 1));

  const [ingredientEntries, setIngredientEntries] = useState<IngredientEntry[]>(
    () => ingredientsToFields(initialData?.ingredients ?? []).map(field => ({ field }))
  );

  interface StepEntry {
    field: StepField;
    deletedAt?: number;
    undoTimer?: ReturnType<typeof setTimeout>;
  }

  const [stepEntries, setStepEntries] = useState<StepEntry[]>(
    () => stepsToFields(initialData?.steps ?? []).map(field => ({ field }))
  );

  const [description, setDescription] = useState(initialData?.description ?? '');
  const [prepTime, setPrepTime]       = useState(initialData?.prep_time ? String(initialData.prep_time) : '');
  const [cookTime, setCookTime]       = useState(initialData?.cook_time ? String(initialData.cook_time) : '');
  const [tags, setTags]               = useState((initialData?.tags ?? []).join(', '));
  const [notes, setNotes]             = useState(initialData?.notes ?? '');

  const [fieldErrors, setFieldErrors] = useState<{ name?: string; ingredients?: string }>({});
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [isDirty, setIsDirty] = useState(false);

  const activeIngredients = ingredientEntries.filter(e => !e.deletedAt);
  const activeSteps = stepEntries.filter(e => !e.deletedAt);

  useEffect(() => {
    const dirty =
      name !== (initialData?.name ?? '') ||
      servings !== String(initialData?.servings ?? 1) ||
      description !== (initialData?.description ?? '') ||
      notes !== (initialData?.notes ?? '') ||
      activeIngredients.length !== (initialData?.ingredients?.length ?? 1) ||
      activeSteps.length !== (initialData?.steps?.length ?? 1);
    setIsDirty(dirty);
  }, [name, servings, description, notes, activeIngredients.length, activeSteps.length, initialData]);

  useUnsavedChanges(isDirty);

  // ── Ingredient handlers ──────────────────────────────────────────────────────

  const addIngredient = () =>
    setIngredientEntries(prev => [...prev, { field: { amount: '', unit: '', name: '' } }]);

  const updateIngredient = (i: number, v: IngredientField) =>
    setIngredientEntries(prev => prev.map((e, idx) => idx === i ? { ...e, field: v } : e));

  const softDeleteIngredient = useCallback((i: number) => {
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
        return { field: e.field };
      })
    );
  }, []);

  // ── Step handlers ────────────────────────────────────────────────────────────

  const addStep = () =>
    setStepEntries(prev => [...prev, { field: { content: '', timerEnabled: false, timerInput: '' } }]);

  const softDeleteStep = useCallback((i: number) => {
    const timer = setTimeout(() => {
      setStepEntries(prev => prev.filter((_, idx) => idx !== i));
    }, 4000);
    setStepEntries(prev =>
      prev.map((e, idx) =>
        idx === i ? { ...e, deletedAt: Date.now(), undoTimer: timer } : e
      )
    );
  }, []);

  const undoDeleteStep = useCallback((i: number) => {
    setStepEntries(prev =>
      prev.map((e, idx) => {
        if (idx !== i) return e;
        if (e.undoTimer) clearTimeout(e.undoTimer);
        return { field: e.field };
      })
    );
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!name.trim()) errors.name = t.nameRequired;

    const hasAtLeastOneIngredient = activeIngredients.some(e => e.field.name.trim());
    if (!hasAtLeastOneIngredient) errors.ingredients = t.ingredientRequired;

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
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

    const parsedSteps: Step[] = activeSteps
      .map(e => e.field)
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

    setIsDirty(false);
  };

  const inputErrorStyle: React.CSSProperties = {
    borderColor: 'var(--color-terracotta)',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <label
          className="font-label block text-xs tracking-widest uppercase mb-1.5"
          style={labelStyle}
          htmlFor="name"
        >
          {t.nameLabel} <span style={{ color: 'var(--color-terracotta)' }}>*</span>
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
          placeholder={t.namePlaceholder}
          className="input-base"
          style={fieldErrors.name ? inputErrorStyle : undefined}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && (
          <span id="name-error" className="field-error">{fieldErrors.name}</span>
        )}
      </div>

      {/* Servings */}
      <div className="w-32">
        <label
          className="font-label block text-xs tracking-widest uppercase mb-1.5"
          style={labelStyle}
          htmlFor="servings"
        >
          {t.servingsLabel} <span style={{ color: 'var(--color-terracotta)' }}>*</span>
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

      {/* Ingredients */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="font-label block text-xs tracking-widest uppercase"
            style={labelStyle}
          >
            {t.ingredientsFormLabel} <span style={{ color: 'var(--color-terracotta)' }}>*</span>
          </label>
          <button
            type="button"
            onClick={addIngredient}
            className="font-label text-xs tracking-widest uppercase transition-colors"
            style={{ color: 'var(--color-terracotta)' }}
          >
            {t.addIngredientBtn}
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
                  className="rounded overflow-hidden"
                  style={{ border: '1px dashed rgba(212,112,63,0.3)' }}
                >
                  <div
                    className="flex items-center gap-2 px-2 py-1"
                    style={{ background: 'rgba(212,112,63,0.07)' }}
                  >
                    <span
                      className="font-label text-xs tracking-widest uppercase"
                      style={{ color: 'var(--text-3)', textDecoration: 'line-through', flex: 1 }}
                    >
                      {t.ingredientRemovedLabel(entry.field.name || t.ingredientDefault)}
                    </span>
                    <button
                      type="button"
                      onClick={() => undoDeleteIngredient(i)}
                      className="font-label text-xs tracking-widest uppercase transition-colors"
                      style={{ color: 'var(--color-terracotta)' }}
                    >
                      {t.undoBtn}
                    </button>
                  </div>
                  <div className="drain-bar" />
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
          <span className="field-error">{fieldErrors.ingredients}</span>
        )}
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            className="font-label block text-xs tracking-widest uppercase"
            style={labelStyle}
          >
            {t.stepsLabel} <span style={{ color: 'var(--color-terracotta)' }}>*</span>
          </label>
          <button
            type="button"
            onClick={addStep}
            className="font-label text-xs tracking-widest uppercase transition-colors"
            style={{ color: 'var(--color-terracotta)' }}
          >
            {t.addStepBtn}
          </button>
        </div>
        <div className="space-y-3">
          {stepEntries.map((entry, i) => {
            const isDeleted = !!entry.deletedAt;
            if (isDeleted) {
              return (
                <div
                  key={i}
                  className="rounded overflow-hidden"
                  style={{ border: '1px dashed rgba(212,112,63,0.3)' }}
                >
                  <div
                    className="flex items-center gap-2 px-2 py-1"
                    style={{ background: 'rgba(212,112,63,0.07)' }}
                  >
                    <span
                      className="font-label text-xs tracking-widest uppercase"
                      style={{ color: 'var(--text-3)', textDecoration: 'line-through', flex: 1 }}
                    >
                      {t.stepRemovedLabel(i + 1)}
                    </span>
                    <button
                      type="button"
                      onClick={() => undoDeleteStep(i)}
                      className="font-label text-xs tracking-widest uppercase transition-colors"
                      style={{ color: 'var(--color-terracotta)' }}
                    >
                      {t.undoBtn}
                    </button>
                  </div>
                  <div className="drain-bar" />
                </div>
              );
            }
            return (
              <StepRow
                key={i}
                index={i}
                value={entry.field}
                onChange={v => setStepEntries(prev => prev.map((e, idx) => idx === i ? { ...e, field: v } : e))}
                onRemove={activeSteps.length > 1 ? () => softDeleteStep(i) : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Optional fields */}
      <details className="group">
        <summary
          className="cursor-pointer font-label text-xs tracking-widest uppercase select-none list-none flex items-center gap-1 transition-colors"
          style={{ color: 'var(--text-3)' }}
        >
          <span className="group-open:rotate-90 transition-transform inline-block">›</span>
          {t.optionalFields}
        </summary>
        <div
          className="mt-4 space-y-4 pl-4"
          style={{ borderLeft: '2px solid var(--border)' }}
        >
          <div>
            <label
              className="font-label block text-xs tracking-widest uppercase mb-1.5"
              style={labelStyle}
              htmlFor="description"
            >
              {t.descriptionLabel}
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder={t.descriptionPlaceholder}
              className="input-base resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="font-label block text-xs tracking-widest uppercase mb-1.5"
                style={labelStyle}
                htmlFor="prep-time"
              >
                {t.prepTimeLabelForm}
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
                {t.cookTimeLabelForm}
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

          <div>
            <label
              className="font-label block text-xs tracking-widest uppercase mb-1.5"
              style={labelStyle}
              htmlFor="tags"
            >
              {t.tagsLabel}
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder={t.tagsPlaceholder}
              className="input-base"
            />
          </div>

          <div>
            <label
              className="font-label block text-xs tracking-widest uppercase mb-1.5"
              style={labelStyle}
              htmlFor="notes"
            >
              {t.notesFormLabel}
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder={t.notesPlaceholder}
              className="input-base resize-none"
            />
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? t.savingBtn : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            if (isDirty && !window.confirm(t.unsavedChangesWarning)) return;
            router.back();
          }}
          className="btn-ghost"
        >
          {t.cancelBtn}
        </button>
        {isDirty && (
          <span
            className="font-label text-xs tracking-widest uppercase"
            style={{ color: 'var(--color-terracotta)' }}
            aria-live="polite"
          >
            {t.unsavedChangesIndicator}
          </span>
        )}
      </div>
    </form>
  );
}
