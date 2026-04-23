'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { triggerCompute } from '@/app/actions/macros';
import { formatServings } from '@/lib/utils/format-servings';
import type { Recipe } from '@/types/recipe';

interface Props {
  recipe: Recipe;
  onOpenMatchModal: () => void;
}

const panelStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--bg-raised)',
};

export function MacrosCard({ recipe, onOpenMatchModal }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State 1: not yet computed
  if (recipe.macros === null) {
    return (
      <div
        className="rounded-lg p-4 mb-6 flex items-center justify-between flex-wrap gap-3"
        style={panelStyle}
        data-testid="macros-card-empty"
      >
        <p className="font-label text-xs tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
          Macros not yet computed
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
          {isPending ? 'Computing…' : 'Compute macros →'}
        </button>
      </div>
    );
  }

  const m = recipe.macros;

  // State 2: zero matched → invite to match
  if (m.matched_count === 0) {
    return (
      <div
        className="rounded-lg p-4 mb-6 flex items-center justify-between flex-wrap gap-3"
        style={panelStyle}
        data-testid="macros-card-unmatched"
      >
        <p className="font-label text-xs tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>
          Ingredients need matching
        </p>
        <button
          type="button"
          onClick={onOpenMatchModal}
          className="btn-ghost font-label text-xs tracking-widest uppercase"
          style={{ color: 'var(--color-terracotta)' }}
          data-testid="macros-match-btn"
        >
          Match ingredients →
        </button>
      </div>
    );
  }

  const isPartial = m.matched_count < m.total_count;
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
      aria-label={`Macros per serving${isPartial ? ` — estimate, ${m.matched_count} of ${m.total_count} ingredients matched` : ''}`}
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
          {isPartial && ' · ~estimate'}
        </span>
        <button
          type="button"
          onClick={onOpenMatchModal}
          className="font-label text-xs tracking-widest uppercase transition-colors"
          style={{ color: 'var(--color-terracotta)' }}
          data-testid="macros-edit-btn"
        >
          edit
        </button>
      </div>

      <p
        className="font-display mt-2 text-3xl leading-none"
        style={{ color: 'var(--text-1)' }}
        data-testid="macros-kcal"
      >
        {prefix}{Math.round(perServing.kcal)} <span className="text-base" style={{ color: 'var(--text-2)' }}>kcal</span>
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
      >
        {servingsLabel} · {prefix}{Math.round(m.kcal)} kcal total ·{' '}
        <span
          style={{
            color: isPartial ? 'var(--color-gold)' : 'var(--color-terracotta)',
          }}
        >
          {isPartial
            ? `${m.matched_count} of ${m.total_count} matched`
            : `all ${m.total_count} matched`}
        </span>
      </p>
    </div>
  );
}
