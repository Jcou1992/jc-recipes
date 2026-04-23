'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Recipe } from '@/types/recipe';
import { useToast } from '@/components/ui/ToastContext';
import { useT } from '@/components/ui/LanguageContext';
import { recipeToMarkdown, triggerDownload } from '@/lib/utils/export-recipes';
import { processIngredients, type UnitSystem } from '@/lib/utils/scaling';
import { formatServings } from '@/lib/utils/format-servings';
import { MacrosCard } from '@/components/MacrosCard';
import { MacrosMatchModal } from '@/components/MacrosMatchModal';

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  recipe: Recipe;
}

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function RecipeDetailClient({ recipe }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const t = useT();
  const [targetServings, setTargetServings] = useState(recipe.servings);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [matchOpen, setMatchOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('preferred-unit-system');
      if (stored === 'metric' || stored === 'imperial') setUnitSystem(stored);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`recipe-servings:${recipe.id}`);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (Number.isFinite(parsed) && parsed >= 1) {
          setTargetServings(parsed);
        }
      }
    } catch {}
  }, [recipe.id]);

  function toggleUnitSystem(next: UnitSystem) {
    setUnitSystem(next);
    try { localStorage.setItem('preferred-unit-system', next); } catch {}
  }

  function updateTargetServings(next: number) {
    setTargetServings(next);
    try { localStorage.setItem(`recipe-servings:${recipe.id}`, String(next)); } catch {}
  }

  function handleExportMd() {
    const md = recipeToMarkdown(recipe);
    const filename = recipe.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.md';
    triggerDownload(md, filename, 'text/markdown');
  }

  function handleExportPdf() {
    window.open(`/recipes/print?ids=${recipe.id}`, '_blank');
  }

  const multiplier = targetServings / recipe.servings;
  const isScaled = multiplier !== 1;

  const displayedIngredients = processIngredients(recipe.ingredients, multiplier, unitSystem);

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  const cookUrl = `/recipes/${recipe.id}/cook?servings=${targetServings}&units=${unitSystem}`;

  return (
    <div>
      <MacrosCard recipe={recipe} onOpenMatchModal={() => setMatchOpen(true)} />
      <MacrosMatchModal
        recipe={recipe}
        open={matchOpen}
        onClose={() => setMatchOpen(false)}
        onSaved={() => router.refresh()}
      />

      {/* Times micro-row */}
      {(recipe.prep_time != null || recipe.cook_time != null || totalTime > 0) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1 mb-4" data-testid="recipe-times">
          {recipe.prep_time != null && (
            <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
              {t.prepLabel} {formatTime(recipe.prep_time)}
            </span>
          )}
          {recipe.cook_time != null && (
            <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
              {t.cookLabel} {formatTime(recipe.cook_time)}
            </span>
          )}
          {totalTime > 0 && recipe.prep_time != null && recipe.cook_time != null && (
            <span className="font-label text-sm tracking-wide font-semibold" style={{ color: 'var(--text-1)' }}>
              {t.totalLabel} {formatTime(totalTime)}
            </span>
          )}
        </div>
      )}

      {/* Service bar */}
      <div
        className="flex flex-wrap items-center gap-x-6 gap-y-3 mb-6 pb-6"
        style={{ borderBottom: '1px solid var(--border)' }}
        data-testid="service-bar"
      >
        {/* Serving scaler */}
        <div className="flex items-center gap-2" data-testid="serving-scaler">
          <button
            onClick={() => updateTargetServings(Math.max(1, targetServings - 1))}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors font-label font-bold text-lg"
            style={{ background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            aria-label={t.decreaseServings}
            data-testid="scaler-decrease"
          >
            −
          </button>
          <span
            className="font-label text-sm tracking-wide"
            style={{ color: 'var(--text-2)' }}
            data-testid="scaler-value"
          >
            {formatServings({
              servings: targetServings,
              serving_size_label: recipe.serving_size_label,
            })}
          </span>
          <button
            onClick={() => updateTargetServings(targetServings + 1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full transition-colors font-label font-bold text-lg"
            style={{ background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            aria-label={t.increaseServings}
            data-testid="scaler-increase"
          >
            +
          </button>
          {isScaled && (
            <button
              onClick={() => updateTargetServings(recipe.servings)}
              className="font-label text-xs tracking-wider uppercase px-2 py-0.5 rounded-full transition-colors"
              style={{
                background: 'color-mix(in oklch, var(--color-terracotta) 12%, transparent)',
                color: 'var(--color-terracotta)',
                border: '1px solid color-mix(in oklch, var(--color-terracotta) 25%, transparent)',
              }}
              aria-label={t.resetServingsAriaLabel}
              data-testid="scaler-scaled-badge"
            >
              {multiplier < 1
                ? `×${Math.round(multiplier * 100) / 100}`
                : `×${Math.round(multiplier * 10) / 10}`
              } {t.resetBtn}
            </button>
          )}
        </div>

        {/* Unit toggle */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
          data-testid="unit-toggle"
        >
          {(['metric', 'imperial'] as UnitSystem[]).map(sys => (
            <button
              key={sys}
              onClick={() => toggleUnitSystem(sys)}
              className="font-label text-xs tracking-wider uppercase px-3 min-h-[44px] transition-all capitalize"
              style={unitSystem === sys
                ? { background: 'var(--color-terracotta-contrast)', color: 'var(--color-bone)' }
                : { background: 'transparent', color: 'var(--text-2)' }
              }
              aria-pressed={unitSystem === sys}
              data-testid={`unit-${sys}`}
            >
              {sys === 'metric' ? t.metricLabel : t.imperialLabel}
            </button>
          ))}
        </div>

        {/* Admin export group */}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={handleExportMd}
            className="btn-ghost font-label text-xs tracking-wider uppercase px-3 min-h-[44px] rounded-lg"
            data-testid="recipe-export-md"
          >
            Markdown
          </button>
          <button
            onClick={handleExportPdf}
            className="btn-ghost font-label text-xs tracking-wider uppercase px-3 min-h-[44px] rounded-lg"
            data-testid="recipe-export-pdf"
          >
            Print / PDF
          </button>
        </div>
      </div>

      {/* Two-column body on md+ */}
      <div className="md:grid md:grid-cols-[1fr_2fr] xl:grid-cols-[1fr_3fr] md:gap-12 md:items-start">

        {(recipe.ingredients.length > 0 || recipe.steps.length > 0) && (
          <aside className="md:sticky md:top-20 mb-10 md:mb-0">
            {recipe.ingredients.length > 0 && (
              <section data-testid="ingredients-section">
                <h2 className="section-label mb-4">{t.ingredientsSectionLabel}</h2>
                <ul className="space-y-2.5">
                  {displayedIngredients.map((ing, i) => (
                    <li key={i} className="flex gap-3 items-baseline" data-testid={`ingredient-${i}`}>
                      <span
                        className="font-label text-base font-semibold tracking-wide min-w-[4rem] text-right"
                        style={{ color: 'var(--color-gold)' }}
                        data-testid={`ingredient-amount-${i}`}
                      >
                        {ing.displayAmount}{ing.unit ? ` ${ing.unit}` : ''}
                      </span>
                      <span className="font-body text-base" style={{ color: 'var(--text-1)' }}>
                        {ing.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {recipe.ingredients.length > 0 && (
              <div className="mt-4 mb-6">
                <button
                  onClick={async () => {
                    const text = displayedIngredients
                      .map(i => `${i.displayAmount}${i.unit ? ` ${i.unit}` : ''} ${i.name}`.trim())
                      .join('\n');
                    try {
                      await navigator.clipboard.writeText(text);
                      showToast(t.ingredientsCopiedToast, 'success');
                    } catch {
                      showToast(t.copyFailedToast, 'error');
                    }
                  }}
                  className="btn-ghost text-sm"
                  data-testid="copy-ingredients-btn"
                >
                  {t.copyIngredientsBtn}
                </button>
              </div>
            )}

            {recipe.steps.length > 0 && (
              <div className="hidden md:block">
                <Link
                  href={cookUrl}
                  className="btn-primary w-full text-center"
                  data-testid="cook-mode-btn-desktop"
                >
                  {t.cookBtn}
                </Link>
              </div>
            )}
          </aside>
        )}

        <div>
          {recipe.steps.length > 0 && (
            <section className="mb-10">
              <h2 className="section-label mb-4">{t.preparationLabel}</h2>
              <ol className="space-y-6">
                {[...recipe.steps]
                  .sort((a, b) => a.order - b.order)
                  .map(step => (
                    <li key={step.order} className="flex gap-4 items-start">
                      <span
                        className="font-label flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base font-semibold"
                        style={{
                          color: 'var(--color-gold)',
                          background: 'color-mix(in oklch, var(--color-gold) 14%, transparent)',
                          border: '1px solid color-mix(in oklch, var(--color-gold) 32%, transparent)',
                          minWidth: '2.25rem',
                        }}
                      >
                        {step.order}
                      </span>
                      <div className="pt-1">
                        <p className="font-body text-base leading-relaxed" style={{ color: 'var(--text-1)' }}>
                          {step.content}
                        </p>
                        {step.timer_seconds != null && (
                          <p
                            className="font-label text-xs tracking-wider uppercase mt-1.5"
                            style={{ color: 'var(--color-terracotta)' }}
                          >
                            ⏱ {formatTime(step.timer_seconds / 60)}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
              </ol>
            </section>
          )}

          {recipe.notes && (
            <section
              className="rounded-xl p-5"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)' }}
            >
              <h2 className="section-label mb-3">{t.notesLabel}</h2>
              <p className="font-body text-base whitespace-pre-line" style={{ color: 'var(--text-2)' }}>
                {recipe.notes}
              </p>
            </section>
          )}
        </div>

      </div>

      {/* Mobile sticky footer Cook button */}
      {recipe.steps.length > 0 && (
        <div
          className="md:hidden fixed bottom-0 left-0 right-0 z-20 px-4 py-3"
          style={{
            background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderTop: '1px solid var(--border)',
            paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
          }}
        >
          <Link
            href={cookUrl}
            className="btn-primary w-full text-center block"
            data-testid="cook-mode-btn"
          >
            {t.cookBtn}
          </Link>
        </div>
      )}
    </div>
  );
}
