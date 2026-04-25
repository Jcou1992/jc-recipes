'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { triggerCompute } from '@/app/actions/macros';
import { formatServings } from '@/lib/utils/format-servings';
import type { Recipe } from '@/types/recipe';

interface Props {
  recipe: Recipe;
  onOpenMatchModal: () => void;
}

function useIsBrut(): boolean {
  const [isBrut, setIsBrut] = useState(false);
  useEffect(() => {
    setIsBrut(document.documentElement.getAttribute('data-design') === 'brut');
  }, []);
  return isBrut;
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
};

export function MacrosCard({ recipe, onOpenMatchModal }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isBrut = useIsBrut();

  // State 1: not yet computed
  if (recipe.macros === null) {
    // Cycle 2 P3: brut copy uses ticket grammar so the "macros not yet
    // computed" line reads like everything else under brut, and the
    // primary verb shifts from "compute" (engineer-speak) to "estimate"
    // (chef-speak). Classic copy unchanged — we promised "no rebuild."
    const emptyLabel = isBrut ? '[ MACROS · UNKNOWN ]' : 'Macros not yet computed';
    const computeLabel = isBrut
      ? (isPending ? '⋯ ESTIMATING' : '→ ESTIMATE')
      : (isPending ? 'Computing…' : 'Compute macros →');
    return (
      <div
        className="rounded-lg p-4 mb-6 flex items-center justify-between flex-wrap gap-3"
        style={panelStyle}
        data-testid="macros-card-empty"
      >
        <p className="font-label text-xs tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
          {emptyLabel}
        </p>
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              await triggerCompute(recipe.id);
              router.refresh();
            })
          }
          disabled={isPending}
          className="btn-ghost font-label text-xs tracking-widest uppercase"
          data-testid="macros-compute-btn"
        >
          {computeLabel}
        </button>
      </div>
    );
  }

  const m = recipe.macros;

  const isPartial = m.matched_count < m.total_count;
  const remaining = m.total_count - m.matched_count;

  const perServing = {
    kcal: m.kcal / recipe.servings,
    protein_g: m.protein_g / recipe.servings,
    fat_g: m.fat_g / recipe.servings,
    carbs_g: m.carbs_g / recipe.servings,
    fiber_g: m.fiber_g / recipe.servings,
  };
  const prefix = isPartial ? '~' : '';
  const servingsLabel = formatServings({
    servings: recipe.servings,
    serving_size_label: recipe.serving_size_label,
  });

  const cardStyle: React.CSSProperties = isPartial
    ? {
        border: '1px solid color-mix(in oklch, var(--color-gold) 40%, transparent)',
        background: 'color-mix(in oklch, var(--color-gold) 8%, var(--bg-raised))',
      }
    : panelStyle;

  return (
    <div
      role="group"
      aria-label={`Macros per serving${
        isPartial ? ` — estimate, ${m.matched_count} of ${m.total_count} ingredients matched` : ''
      }`}
      className="rounded-lg p-4 mb-6"
      style={cardStyle}
      data-testid={isPartial ? 'macros-card-partial' : 'macros-card-complete'}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="font-label text-xs tracking-widest uppercase"
          style={{ color: 'var(--text-3)' }}
        >
          Per serving{recipe.serving_size_label ? ` · ${recipe.serving_size_label}` : ''}
        </span>
        {!isPartial && (
          <button
            type="button"
            onClick={onOpenMatchModal}
            className="font-label text-xs tracking-widest uppercase transition-colors"
            style={{ color: 'var(--color-terracotta)' }}
            data-testid="macros-edit-btn"
          >
            edit
          </button>
        )}
      </div>

      <p
        className="font-display mt-2 text-3xl leading-none"
        style={{ color: 'var(--text-1)' }}
        data-testid="macros-kcal"
      >
        {prefix}{Math.round(perServing.kcal)}{' '}
        <span className="text-base" style={{ color: 'var(--text-2)' }}>kcal</span>
      </p>

      <p
        className="mt-2 font-body text-sm flex flex-wrap gap-x-3 gap-y-1 tabular-nums"
        style={{ color: 'var(--text-2)' }}
      >
        <span>{prefix}{perServing.fat_g.toFixed(1)} g fat</span>
        <span aria-hidden="true">·</span>
        <span>{prefix}{perServing.carbs_g.toFixed(1)} g carbs</span>
        <span aria-hidden="true">·</span>
        <span>{prefix}{perServing.protein_g.toFixed(1)} g protein</span>
        <span aria-hidden="true">·</span>
        <span>{prefix}{perServing.fiber_g.toFixed(1)} g fiber</span>
      </p>

      {(() => {
        const total = perServing.protein_g + perServing.carbs_g + perServing.fat_g;
        if (total <= 0) return null;
        const p = (perServing.protein_g / total) * 100;
        const c = (perServing.carbs_g / total) * 100;
        return (
          <div
            className="macros-bar mt-3"
            style={{
              ['--macro-protein-pct' as string]: `${p.toFixed(2)}%`,
              ['--macro-carb-pct' as string]: `${c.toFixed(2)}%`,
            } as React.CSSProperties}
            aria-hidden="true"
            data-testid="macros-bar"
          />
        );
      })()}

      <p
        className="font-label mt-3 text-[11px] tracking-widest uppercase tabular-nums"
        style={{ color: 'var(--text-3)' }}
        data-testid="macros-totals-line"
      >
        {servingsLabel} · {prefix}{Math.round(m.kcal)} kcal total
      </p>

      <div className="relative mt-3">
        <div
          key={isPartial ? 'partial' : 'complete'}
          className="macros-card-footer-swap"
        >
          {isPartial ? (
            <div
              className="flex flex-col gap-2"
              data-testid="macros-partial-footer"
              aria-live="polite"
            >
              <p
                className="font-label text-[11px] tracking-widest uppercase"
                style={{ color: 'var(--color-gold)' }}
              >
                Estimate · {m.matched_count} of {m.total_count} ingredients matched
              </p>
              <button
                type="button"
                onClick={onOpenMatchModal}
                data-testid="macros-match-btn"
                className="self-start font-label text-[11px] tracking-widest uppercase rounded-full px-4 min-h-[44px] transition-colors"
                style={{
                  color: 'var(--color-terracotta)',
                  background: 'color-mix(in oklch, var(--color-terracotta) 12%, transparent)',
                  border: '1px solid color-mix(in oklch, var(--color-terracotta) 42%, transparent)',
                }}
              >
                Match {remaining} remaining →
              </button>
            </div>
          ) : (
            <p
              className="font-label text-[11px] tracking-widest uppercase"
              style={{ color: 'var(--text-3)' }}
              data-testid="macros-provenance"
            >
              USDA FoodData Central
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
