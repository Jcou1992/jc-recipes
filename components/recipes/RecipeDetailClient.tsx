'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Recipe, Ingredient } from '@/types/recipe';
import { useToast } from '@/components/ui/ToastContext';

// ── Fraction rendering ────────────────────────────────────────────────────────

type Fraction = { whole: number; num: number; den: number };

const FRACTIONS: Array<[number, string]> = [
  [1 / 8,  '⅛'],
  [1 / 4,  '¼'],
  [1 / 3,  '⅓'],
  [3 / 8,  '⅜'],
  [1 / 2,  '½'],
  [5 / 8,  '⅝'],
  [2 / 3,  '⅔'],
  [3 / 4,  '¾'],
  [7 / 8,  '⅞'],
];

function snapFraction(n: number): string | null {
  const TOLERANCE = 0.05;
  for (const [val, sym] of FRACTIONS) {
    if (Math.abs(n - val) < TOLERANCE) return sym;
  }
  return null;
}

function formatAmount(n: number): string {
  if (n <= 0) return '0';
  if (n > 10) {
    // Large batch — decimal rounded to 1 place
    return String(Math.round(n * 10) / 10);
  }
  const whole = Math.floor(n);
  const frac  = n - whole;
  const fracStr = snapFraction(frac);
  if (frac < 0.05) return whole === 0 ? '0' : String(whole);
  if (fracStr) return whole === 0 ? fracStr : `${whole}${fracStr}`;
  // Fallback: round to 2 decimals
  return String(Math.round(n * 100) / 100);
}

// ── Unit conversion ────────────────────────────────────────────────────────────

type UnitSystem = 'metric' | 'imperial';

interface ConvertedIngredient {
  amount: number;
  unit: string | null;
  name: string;
  displayAmount: string;
}

const METRIC_TO_IMPERIAL: Record<string, { factor: number; toUnit: string }> = {
  g:   { factor: 1 / 28.3495,  toUnit: 'oz'    },
  kg:  { factor: 2.20462,      toUnit: 'lb'     },
  mg:  { factor: 1 / 28349.5,  toUnit: 'oz'     },
  ml:  { factor: 1 / 29.5735,  toUnit: 'fl oz'  },
  l:   { factor: 4.22675,      toUnit: 'cups'   },
  dl:  { factor: 3.38140,      toUnit: 'fl oz'  },
};

const IMPERIAL_TO_METRIC: Record<string, { factor: number; toUnit: string }> = {
  oz:     { factor: 28.3495,  toUnit: 'g'   },
  lb:     { factor: 1 / 2.20462, toUnit: 'kg' },
  'fl oz': { factor: 29.5735, toUnit: 'ml'  },
  cup:    { factor: 236.588,  toUnit: 'ml'  },
  cups:   { factor: 236.588,  toUnit: 'ml'  },
};

function convertUnit(
  amount: number,
  unit: string | null,
  targetSystem: UnitSystem,
): { amount: number; unit: string | null } {
  if (!unit) return { amount, unit };
  const u = unit.trim().toLowerCase();

  if (targetSystem === 'imperial') {
    const conv = METRIC_TO_IMPERIAL[u];
    if (conv) return { amount: amount * conv.factor, unit: conv.toUnit };
  } else {
    const conv = IMPERIAL_TO_METRIC[u];
    if (conv) return { amount: amount * conv.factor, unit: conv.toUnit };
  }
  return { amount, unit };
}

function processIngredients(
  ingredients: Ingredient[],
  multiplier: number,
  unitSystem: UnitSystem,
): ConvertedIngredient[] {
  return ingredients.map(ing => {
    const scaled = ing.amount * multiplier;
    const { amount: converted, unit } = convertUnit(scaled, ing.unit, unitSystem);
    return {
      amount: converted,
      unit,
      name: ing.name,
      displayAmount: formatAmount(converted),
    };
  });
}

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
  const { showToast } = useToast();
  const [targetServings, setTargetServings] = useState(recipe.servings);
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');

  // Restore unit preference from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('preferred-unit-system');
      if (stored === 'metric' || stored === 'imperial') setUnitSystem(stored);
    } catch {}
  }, []);

  function toggleUnitSystem(next: UnitSystem) {
    setUnitSystem(next);
    try { localStorage.setItem('preferred-unit-system', next); } catch {}
  }

  const multiplier = targetServings / recipe.servings;
  const isScaled = multiplier !== 1;

  const displayedIngredients = processIngredients(recipe.ingredients, multiplier, unitSystem);

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  const cookUrl = `/recipes/${recipe.id}/cook?servings=${targetServings}&units=${unitSystem}`;

  return (
    <div>
      {/* Meta strip */}
      <div
        className="flex flex-wrap gap-x-6 gap-y-3 mb-6 pb-6"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        {/* Serving scaler */}
        <div className="flex items-center gap-2" data-testid="serving-scaler">
          <button
            onClick={() => setTargetServings(s => Math.max(1, s - 1))}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors font-label font-bold text-lg"
            style={{ background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            aria-label="Decrease servings"
            data-testid="scaler-decrease"
          >
            −
          </button>
          <span
            className="font-label text-sm tracking-wide"
            style={{ color: 'var(--text-2)' }}
            data-testid="scaler-value"
          >
            {targetServings} {targetServings !== 1 ? 'servings' : 'serving'}
          </span>
          <button
            onClick={() => setTargetServings(s => s + 1)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg transition-colors font-label font-bold text-lg"
            style={{ background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            aria-label="Increase servings"
            data-testid="scaler-increase"
          >
            +
          </button>
          {isScaled && (
            <button
              onClick={() => setTargetServings(recipe.servings)}
              className="font-label text-xs tracking-wider uppercase px-2 py-0.5 rounded-full transition-colors"
              style={{
                background: 'rgba(212,112,63,0.12)',
                color: 'var(--color-terracotta)',
                border: '1px solid rgba(212,112,63,0.25)',
              }}
              aria-label="Reset to original serving count"
              data-testid="scaler-scaled-badge"
            >
              {multiplier < 1
                ? `×${Math.round(multiplier * 100) / 100}`
                : `×${Math.round(multiplier * 10) / 10}`
              } Reset
            </button>
          )}
        </div>

        {/* Time info */}
        {recipe.prep_time != null && (
          <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
            Prep: {formatTime(recipe.prep_time)}
          </span>
        )}
        {recipe.cook_time != null && (
          <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
            Cook: {formatTime(recipe.cook_time)}
          </span>
        )}
        {totalTime > 0 && recipe.prep_time != null && recipe.cook_time != null && (
          <span className="font-label text-sm tracking-wide font-semibold" style={{ color: 'var(--text-1)' }}>
            Total: {formatTime(totalTime)}
          </span>
        )}

        {/* Unit toggle */}
        <div
          className="flex items-center rounded-lg overflow-hidden ml-auto"
          style={{ border: '1px solid var(--border)' }}
          data-testid="unit-toggle"
        >
          {(['metric', 'imperial'] as UnitSystem[]).map(sys => (
            <button
              key={sys}
              onClick={() => toggleUnitSystem(sys)}
              className="font-label text-xs tracking-wider uppercase px-3 min-h-[36px] transition-all capitalize"
              style={unitSystem === sys
                ? { background: 'var(--color-terracotta)', color: '#fff' }
                : { background: 'transparent', color: 'var(--text-2)' }
              }
              aria-pressed={unitSystem === sys}
              data-testid={`unit-${sys}`}
            >
              {sys === 'metric' ? 'Metric' : 'Imperial'}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column body on md+ */}
      <div className="md:grid md:grid-cols-[2fr_3fr] md:gap-10 md:items-start">

        {/* LEFT: sticky sidebar — shown when there are ingredients or steps */}
        {(recipe.ingredients.length > 0 || recipe.steps.length > 0) && (
          <aside className="md:sticky md:top-20 mb-10 md:mb-0">
            {recipe.ingredients.length > 0 && (
              <section data-testid="ingredients-section">
                <h2 className="section-label mb-4">Ingredients</h2>
                <ul className="space-y-2.5">
                  {displayedIngredients.map((ing, i) => (
                    <li key={i} className="flex gap-3 items-baseline" data-testid={`ingredient-${i}`}>
                      <span
                        className="font-label text-base font-semibold tracking-wide min-w-[4rem] text-right"
                        style={{ color: 'var(--color-terracotta)' }}
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

            {/* Copy ingredients button */}
            {recipe.ingredients.length > 0 && (
              <div className="mt-4 mb-6">
                <button
                  onClick={async () => {
                    const text = displayedIngredients
                      .map(i => `${i.displayAmount}${i.unit ? ` ${i.unit}` : ''} ${i.name}`.trim())
                      .join('\n');
                    try {
                      await navigator.clipboard.writeText(text);
                      showToast('Ingredients copied', 'success');
                    } catch {
                      showToast('Failed to copy to clipboard', 'error');
                    }
                  }}
                  className="btn-ghost text-sm"
                  data-testid="copy-ingredients-btn"
                >
                  Copy ingredients
                </button>
              </div>
            )}

            {/* Desktop Cocinar button — always in left column when there are steps */}
            {recipe.steps.length > 0 && (
              <div className="hidden md:block">
                <Link
                  href={cookUrl}
                  className="btn-primary w-full text-center"
                  data-testid="cook-mode-btn-desktop"
                >
                  Cook
                </Link>
              </div>
            )}
          </aside>
        )}

        {/* RIGHT: steps + notes */}
        <div>
          {recipe.steps.length > 0 && (
            <section className="mb-10">
              <h2 className="section-label mb-4">Preparation</h2>
              <ol className="space-y-6">
                {[...recipe.steps]
                  .sort((a, b) => a.order - b.order)
                  .map(step => (
                    <li key={step.order} className="flex gap-4 items-start">
                      <span
                        className="font-label flex-shrink-0"
                        style={{ fontSize: '2.5rem', lineHeight: 1, color: 'var(--color-terracotta)', minWidth: '2.5rem' }}
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
              <h2 className="section-label mb-3">Notes</h2>
              <p className="font-body text-base whitespace-pre-line" style={{ color: 'var(--text-2)' }}>
                {recipe.notes}
              </p>
            </section>
          )}
        </div>

      </div>

      {/* Mobile sticky footer Cocinar button */}
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
            Cook
          </Link>
        </div>
      )}
    </div>
  );
}
