'use client';

import type { PreviewData } from './RecipeForm';
import { useT } from '@/components/ui/LanguageContext';

interface Props {
  preview: PreviewData | null;
}

function formatAmount(n: number): string {
  if (n === 0) return '';
  if (n === 0.5)  return '1/2';
  if (n === 0.25) return '1/4';
  if (n === 0.75) return '3/4';
  if (n === 1.5)  return '1 1/2';
  return n % 1 === 0 ? String(n) : String(n);
}

export default function RecipeFormPreview({ preview }: Props) {
  const t = useT();
  const hasContent = !!preview && preview.name.trim().length > 0;

  return (
    <div
      className="md:sticky md:top-24"
      data-testid="recipe-form-preview"
    >
      <p
        className="font-label text-xs tracking-widest uppercase mb-3"
        style={{ color: 'var(--text-3)' }}
      >
        {t.recipePreviewLabel}
      </p>

      {!hasContent ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{
            border: '2px dashed color-mix(in oklch, var(--color-terracotta) 30%, transparent)',
            background: 'var(--bg-card)',
            color: 'var(--text-3)',
          }}
        >
          <p className="font-body text-sm italic">
            {t.recipePreviewEmpty}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl p-6"
          style={{
            background: 'var(--bg-raised)',
            boxShadow:
              '0 0 0 1px color-mix(in oklch, var(--color-terracotta) 10%, transparent), 0 4px 24px oklch(0 0 0 / 0.35)',
          }}
        >
          <h2
            className="font-display text-2xl font-semibold leading-snug mb-2"
            style={{ color: 'var(--text-1)' }}
          >
            {preview!.name}
          </h2>

          {preview!.description && (
            <p
              className="font-body text-base mb-3"
              style={{ color: 'var(--text-2)' }}
            >
              {preview!.description}
            </p>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
            <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
              {t.servingLabel(preview!.servings)}
            </span>
            {(preview!.prep_time || preview!.cook_time) && (
              <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
                {(preview!.prep_time ?? 0) + (preview!.cook_time ?? 0)} min
              </span>
            )}
            {preview!.ingredients.length > 0 && (
              <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
                {t.ingredientsCount(preview!.ingredients.length)}
              </span>
            )}
          </div>

          {preview!.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-4">
              {preview!.tags.map(tag => (
                <span
                  key={tag}
                  className="font-label text-xs tracking-wider uppercase px-2 py-0.5 rounded-full"
                  style={{
                    background: 'color-mix(in oklch, var(--color-gold) 18%, transparent)',
                    color: 'var(--color-gold)',
                    border: '1px solid color-mix(in oklch, var(--color-gold) 40%, transparent)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {preview!.ingredients.length > 0 && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <p
                className="font-label text-xs tracking-widest uppercase mb-2"
                style={{ color: 'var(--text-3)' }}
              >
                {t.ingredientsSectionLabel}
              </p>
              <ul className="space-y-1.5">
                {preview!.ingredients.slice(0, 5).map((ing, i) => {
                  const amount = formatAmount(ing.amount);
                  return (
                    <li key={i} className="flex gap-3 items-baseline">
                      <span
                        className="font-label text-sm font-semibold tracking-wide min-w-[3.5rem] text-right"
                        style={{ color: 'var(--color-gold)' }}
                      >
                        {amount}{ing.unit ? `${amount ? ' ' : ''}${ing.unit}` : ''}
                      </span>
                      <span className="font-body text-sm" style={{ color: 'var(--text-1)' }}>
                        {ing.name}
                      </span>
                    </li>
                  );
                })}
                {preview!.ingredients.length > 5 && (
                  <li
                    className="font-label text-xs tracking-wide"
                    style={{ color: 'var(--text-3)' }}
                  >
                    {t.recipePreviewMoreIngredients(preview!.ingredients.length - 5)}
                  </li>
                )}
              </ul>
            </div>
          )}

          {preview!.stepsCount > 0 && (
            <p
              className="font-label text-xs tracking-widest uppercase mt-4"
              style={{ color: 'var(--text-3)' }}
            >
              {t.recipePreviewStepsCount(preview!.stepsCount)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
