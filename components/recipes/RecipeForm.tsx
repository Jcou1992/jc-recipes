'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import IngredientRow, { type IngredientField } from './IngredientRow';
import StepRow, { type StepField } from './StepRow';
import { parseTimeToMinutes } from '@/lib/utils/parse-recipe-markdown';
import type { Recipe, RecipePayload, Ingredient, Step } from '@/types/recipe';

interface Props {
  initialData?: Partial<Recipe>;
  onSubmit: (payload: RecipePayload) => Promise<{ error: string } | null>;
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
  if (n === 0.5) return '1/2';
  if (n === 0.25) return '1/4';
  if (n === 0.75) return '3/4';
  if (n === 1.5) return '1 1/2';
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

// ── Component ─────────────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white';

export default function RecipeForm({ initialData, onSubmit, submitLabel }: Props) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Required fields
  const [name, setName] = useState(initialData?.name ?? '');
  const [servings, setServings] = useState(String(initialData?.servings ?? 1));
  const [ingredients, setIngredients] = useState<IngredientField[]>(
    ingredientsToFields(initialData?.ingredients ?? [])
  );
  const [steps, setSteps] = useState<StepField[]>(
    stepsToFields(initialData?.steps ?? [])
  );

  // Optional fields
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [prepTime, setPrepTime] = useState(initialData?.prep_time ? String(initialData.prep_time) : '');
  const [cookTime, setCookTime] = useState(initialData?.cook_time ? String(initialData.cook_time) : '');
  const [tags, setTags] = useState((initialData?.tags ?? []).join(', '));
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  const addIngredient = () =>
    setIngredients(prev => [...prev, { amount: '', unit: '', name: '' }]);

  const removeIngredient = (i: number) =>
    setIngredients(prev => prev.filter((_, idx) => idx !== i));

  const addStep = () =>
    setSteps(prev => [...prev, { content: '', timerEnabled: false, timerInput: '' }]);

  const removeStep = (i: number) =>
    setSteps(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const parsedIngredients: Ingredient[] = ingredients
      .filter(i => i.name.trim())
      .map(i => ({
        amount: parseAmount(i.amount),
        unit:   i.unit.trim() || null,
        name:   i.name.trim(),
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
      setError(result.error);
      setLoading(false);
    }
    // On success the server action redirects — loading state stays true briefly
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Name (required) */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="name">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Recipe name"
          className={inputClass}
        />
      </div>

      {/* Servings (required) */}
      <div className="w-32">
        <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="servings">
          Servings <span className="text-red-500">*</span>
        </label>
        <input
          id="servings"
          type="number"
          min="1"
          value={servings}
          onChange={e => setServings(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      {/* Ingredients (required) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-stone-700">
            Ingredients <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={addIngredient}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            + Add
          </button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <IngredientRow
              key={i}
              value={ing}
              onChange={v => setIngredients(prev => prev.map((x, idx) => idx === i ? v : x))}
              onRemove={ingredients.length > 1 ? () => removeIngredient(i) : undefined}
            />
          ))}
        </div>
      </div>

      {/* Steps (required) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-stone-700">
            Steps <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={addStep}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            + Add step
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
        <summary className="cursor-pointer text-sm font-medium text-stone-500 hover:text-stone-700 select-none list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">›</span>
          Optional fields
        </summary>
        <div className="mt-4 space-y-4 pl-4 border-l-2 border-stone-100">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Short description shown in the list view"
              className={`${inputClass} resize-none`}
            />
          </div>

          {/* Prep + Cook time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="prep-time">
                Prep time (min)
              </label>
              <input
                id="prep-time"
                type="number"
                min="0"
                value={prepTime}
                onChange={e => setPrepTime(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="cook-time">
                Cook time (min)
              </label>
              <input
                id="cook-time"
                type="number"
                min="0"
                value={cookTime}
                onChange={e => setCookTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="tags">
              Tags
            </label>
            <input
              id="tags"
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="tag1, tag2, tag3"
              className={inputClass}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1" htmlFor="notes">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Variations, tips, sourcing notes…"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 min-h-[44px]"
        >
          {loading ? 'Saving…' : submitLabel}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-100 transition-colors min-h-[44px]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
