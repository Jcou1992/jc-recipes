'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import IngredientRow, { type IngredientField } from './IngredientRow';
import StepRow, { type StepField } from './StepRow';
import { parseTimeToMinutes } from '@/lib/utils/parse-recipe-markdown';
import { useUnsavedChanges } from '@/lib/hooks/useUnsavedChanges';
import { useToast } from '@/components/ui/ToastContext';
import { useT } from '@/components/ui/LanguageContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { Recipe, RecipePayload, Ingredient, Step } from '@/types/recipe';
import type { ActionResult } from '@/app/actions/recipes';

export interface PreviewData {
  name: string;
  description: string | null;
  servings: number;
  prep_time: number | null;
  cook_time: number | null;
  tags: string[];
  ingredients: Ingredient[];
  stepsCount: number;
}

interface Props {
  initialData?: Partial<Recipe>;
  onSubmit: (payload: RecipePayload) => Promise<ActionResult>;
  submitLabel: string;
  onPreviewChange?: (preview: PreviewData) => void;
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
    ? ings.map(i => ({
        amount: formatAmount(i.amount),
        unit: i.unit ?? '',
        name: i.name,
        fdc_id: i.fdc_id,
      }))
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

function formSignature(data: {
  name: string;
  servings: string;
  servingSizeLabel: string;
  description: string;
  prepTime: string;
  cookTime: string;
  tags: string;
  notes: string;
  ingredients: IngredientField[];
  steps: StepField[];
}) {
  return JSON.stringify({
    name: data.name,
    servings: data.servings,
    servingSizeLabel: data.servingSizeLabel,
    description: data.description,
    prepTime: data.prepTime,
    cookTime: data.cookTime,
    tags: data.tags,
    notes: data.notes,
    ingredients: data.ingredients.map(i => ({
      amount: i.amount,
      unit: i.unit,
      name: i.name,
      fdc_id: i.fdc_id ?? null,
    })),
    steps: data.steps.map(s => ({
      content: s.content,
      timerEnabled: s.timerEnabled,
      timerInput: s.timerInput,
    })),
  });
}

interface IngredientEntry {
  field: IngredientField;
  deletedAt?: number;
  undoTimer?: ReturnType<typeof setTimeout>;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RecipeForm({ initialData, onSubmit, submitLabel, onPreviewChange }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const t = useT();
  const [loading, setLoading] = useState(false);

  const [name, setName]         = useState(initialData?.name ?? '');
  const [servings, setServings] = useState(String(initialData?.servings ?? 1));
  const [servingSizeLabel, setServingSizeLabel] = useState(initialData?.serving_size_label ?? '');

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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  // Cycle 2 P2: track which required fields the user has interacted with
  // so we can show the inline `REQUIRED` hint after first blur (not on
  // first focus, which would feel hostile to the empty form).
  const [touched, setTouched] = useState<{ name?: boolean; ingredients?: boolean }>({});

  const activeIngredients = ingredientEntries.filter(e => !e.deletedAt);
  const activeSteps = stepEntries.filter(e => !e.deletedAt);

  const initialSignature = useMemo(() => formSignature({
    name: initialData?.name ?? '',
    servings: String(initialData?.servings ?? 1),
    servingSizeLabel: initialData?.serving_size_label ?? '',
    description: initialData?.description ?? '',
    prepTime: initialData?.prep_time ? String(initialData.prep_time) : '',
    cookTime: initialData?.cook_time ? String(initialData.cook_time) : '',
    tags: (initialData?.tags ?? []).join(', '),
    notes: initialData?.notes ?? '',
    ingredients: ingredientsToFields(initialData?.ingredients ?? []),
    steps: stepsToFields(initialData?.steps ?? []),
  }), [initialData]);

  const currentSignature = useMemo(() => formSignature({
    name,
    servings,
    servingSizeLabel,
    description,
    prepTime,
    cookTime,
    tags,
    notes,
    ingredients: activeIngredients.map(e => e.field),
    steps: activeSteps.map(e => e.field),
  }), [
    name,
    servings,
    servingSizeLabel,
    description,
    prepTime,
    cookTime,
    tags,
    notes,
    ingredientEntries,
    stepEntries,
  ]);

  // Disabled-until-valid for the submit button. Mirrors `validate()` but
  // computed cheaply on every render so the button reflects state live.
  const hasName = name.trim().length > 0;
  const hasIngredient = activeIngredients.some(e => e.field.name.trim().length > 0);
  const hasStep = activeSteps.some(e => e.field.content.trim().length > 0);
  const isValid = hasName && hasIngredient && hasStep;

  useEffect(() => {
    setIsDirty(currentSignature !== initialSignature);
  }, [currentSignature, initialSignature]);

  useUnsavedChanges(isDirty);

  // ── Preview pipe (debounced) ────────────────────────────────────────────────

  useEffect(() => {
    if (!onPreviewChange) return;
    const id = setTimeout(() => {
      onPreviewChange({
        name: name.trim(),
        description: description.trim() || null,
        servings: parseInt(servings) || 1,
        prep_time: prepTime ? (parseInt(prepTime) || null) : null,
        cook_time: cookTime ? (parseInt(cookTime) || null) : null,
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        ingredients: activeIngredients
          .filter(e => e.field.name.trim())
          .map(e => ({
            amount: parseAmount(e.field.amount),
            unit: e.field.unit.trim() || null,
            name: e.field.name.trim(),
            ...(e.field.fdc_id !== undefined ? { fdc_id: e.field.fdc_id } : {}),
          })),
        stepsCount: activeSteps.filter(e => e.field.content.trim()).length,
      });
    }, 150);
    return () => clearTimeout(id);
  }, [name, description, servings, prepTime, cookTime, tags, activeIngredients, activeSteps, onPreviewChange]);

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
    // First-attempt submit: mark all required fields touched so the inline
    // hints surface even if the user never blurred them.
    setTouched({ name: true, ingredients: true });
    if (!validate()) return;

    setLoading(true);

    const parsedIngredients: Ingredient[] = activeIngredients
      .filter(e => e.field.name.trim())
      .map(e => ({
        amount: parseAmount(e.field.amount),
        unit:   e.field.unit.trim() || null,
        name:   e.field.name.trim(),
        ...(e.field.fdc_id !== undefined ? { fdc_id: e.field.fdc_id } : {}),
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
      name:                name.trim(),
      servings:            parseInt(servings) || 1,
      serving_size_label:  servingSizeLabel.trim() || null,
      ingredients:         parsedIngredients,
      steps:               parsedSteps,
      description:         description.trim() || null,
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
    <form onSubmit={handleSubmit} className="space-y-6" aria-busy={loading}>
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
          onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
          placeholder={t.namePlaceholder}
          className="input-base"
          style={fieldErrors.name ? inputErrorStyle : undefined}
          aria-describedby={fieldErrors.name ? 'name-error' : undefined}
          aria-invalid={!!fieldErrors.name}
        />
        {fieldErrors.name && (
          <span id="name-error" className="field-error">{fieldErrors.name}</span>
        )}
        {!fieldErrors.name && touched.name && !hasName && (
          <span
            className="font-label text-xs tracking-widest uppercase mt-1 inline-block"
            style={{ color: 'var(--text-3)' }}
          >
            [ ] REQUIRED
          </span>
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

      {/* Serving size label */}
      <div>
        <label
          className="font-label block text-xs tracking-widest uppercase mb-1.5"
          style={labelStyle}
          htmlFor="serving-size-label"
        >
          {t.servingSizeLabel}
        </label>
        <input
          id="serving-size-label"
          type="text"
          value={servingSizeLabel}
          onChange={e => setServingSizeLabel(e.target.value)}
          maxLength={40}
          className="input-base"
          placeholder={t.servingSizeHelper}
          aria-describedby="serving-size-helper"
        />
        <div
          id="serving-size-helper"
          className="mt-1 flex items-center justify-between text-xs"
          style={{ color: 'var(--text-3)' }}
        >
          <span>{t.servingSizeHelper}</span>
          <span
            style={{
              color: servingSizeLabel.length >= 31
                ? 'var(--color-gold)'
                : 'var(--text-3)',
            }}
          >
            {servingSizeLabel.length}/40
          </span>
        </div>
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
                  style={{ border: '1px dashed color-mix(in oklch, var(--color-terracotta) 30%, transparent)' }}
                >
                  <div
                    className="flex items-center gap-2 px-2 py-1"
                    style={{ background: 'color-mix(in oklch, var(--color-terracotta) 7%, transparent)' }}
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
                  style={{ border: '1px dashed color-mix(in oklch, var(--color-terracotta) 30%, transparent)' }}
                >
                  <div
                    className="flex items-center gap-2 px-2 py-1"
                    style={{ background: 'color-mix(in oklch, var(--color-terracotta) 7%, transparent)' }}
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
        <div className="mt-4 space-y-4 pl-4">
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
        <button
          type="submit"
          disabled={loading || !isValid}
          aria-disabled={loading || !isValid}
          className="btn-primary"
        >
          {loading ? t.savingBtn : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            if (isDirty) setShowCancelConfirm(true);
            else router.back();
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

      {loading && (
        <div
          className="h-[2px] rounded overflow-hidden"
          style={{ background: 'color-mix(in oklch, var(--color-terracotta) 20%, transparent)' }}
          aria-hidden="true"
          data-testid="form-save-progress"
        >
          <div
            className="h-full animate-pulse"
            style={{ width: '40%', background: 'var(--color-terracotta)' }}
          />
        </div>
      )}

      <ConfirmDialog
        open={showCancelConfirm}
        title="Discard changes"
        description={t.unsavedChangesWarning}
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setShowCancelConfirm(false);
          router.back();
        }}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </form>
  );
}
