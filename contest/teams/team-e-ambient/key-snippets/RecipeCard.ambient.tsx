'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SEKAI 世界 — RecipeCard, ambient edit
//
// Minimal diff against the existing RecipeCard. Adds:
//   · cardHeat computation (cooked_at vs now, 72h window)
//   · `recipe-card--hot` class + `--card-heat-target` inline var when heat > 0
//   · the existing card markup untouched
//
// The heat dot (top-right indicator) and the outer glow are driven entirely
// by CSS in glass-card.css. No JS animation loop.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link';
import { cardHeat } from '@/components/ambient/useAtmosphere';
import type { Recipe } from '@/types/recipe';

interface Props { recipe: Recipe; }

export default function RecipeCard({ recipe }: Props) {
  const heat = cardHeat(recipe.cooked_at);
  const isHot = heat > 0;

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={`recipe-card block p-5 rounded-[14px] ${isHot ? 'recipe-card--hot' : ''}`}
      style={isHot ? ({ ['--card-heat-target' as string]: heat.toFixed(3) } as React.CSSProperties) : undefined}
      data-heat={heat > 0 ? heat.toFixed(2) : undefined}
    >
      <h3 className="recipe-title font-body text-[1.3rem] font-semibold leading-[1.25] mb-2">
        {recipe.title}
      </h3>

      {(recipe.total_time_min || recipe.servings) && (
        <div className="flex gap-[14px] font-label text-[0.72rem] mb-[14px]" style={{ color: 'var(--text-3)' }}>
          {recipe.total_time_min && <span>{recipe.total_time_min} min</span>}
          {recipe.servings && <span>{recipe.servings} servings</span>}
          {isHot && <span>cooked {formatAge(recipe.cooked_at!)}</span>}
        </div>
      )}

      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-[6px]">
          {recipe.tags.map(t => (
            <span
              key={t}
              className="font-label text-[0.65rem] px-2 py-[3px] rounded-full"
              style={{
                background: 'var(--tag-bg)',
                border: '1px solid var(--tag-border)',
                color: 'var(--tag-text)',
              }}
            >
              {t}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const h = Math.floor(ms / 36e5);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}
