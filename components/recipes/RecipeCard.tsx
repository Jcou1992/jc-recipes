'use client';

import { useEffect, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { Recipe } from '@/types/recipe';
import { useT } from '@/components/ui/LanguageContext';
import ViewTransitionLink from '@/components/motion/ViewTransitionLink';
import { fmtRec } from '@/lib/brut/ref-codes';
import { fmtCookedAge } from '@/lib/brut/cooked-age';

interface Props {
  recipe: Recipe;
  featured?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggle?: (shift: boolean) => void;
  isSearchMatch?: boolean;
}

export default function RecipeCard({
  recipe,
  featured = false,
  selectMode = false,
  selected = false,
  onToggle,
  isSearchMatch = false,
}: Props) {
  const t = useT();
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
  // Brut ticket nameplate code — rendered via CSS ::before in brut mode, no
  // visual effect in classic (the attribute is present but not read).
  const brutCode = `${fmtRec(recipe.id)} · FIG.03`;

  // Brut detection — same client-only pattern as Wayfinder/CookMode. SSR
  // returns false (heat row hidden by default); the effect flips to true
  // post-mount on brut, triggering a single re-render. Classic stays
  // pixel-identical because the row is not rendered at all in classic.
  const [isBrut, setIsBrut] = useState(false);
  useEffect(() => {
    setIsBrut(document.documentElement.getAttribute('data-design') === 'brut');
  }, []);

  // Compute heat-decay descriptor once per render. Pure function, cheap.
  const cookedAge = fmtCookedAge(recipe.cooked_at);
  const cookedCount = recipe.cooked_count ?? 0;

  const metaRow = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
      <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
        {t.servingLabel(recipe.servings)}
      </span>
      {totalTime > 0 && (
        <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
          {totalTime} min
        </span>
      )}
      {recipe.ingredients.length > 0 && (
        <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
          {t.ingredientsCount(recipe.ingredients.length)}
        </span>
      )}
    </div>
  );

  const tagRow = recipe.tags && recipe.tags.length > 0 && (
    <div className="flex flex-wrap gap-1">
      {recipe.tags.map(tag => (
        <span
          key={tag}
          className="font-label text-xs tracking-wider uppercase px-2 py-0.5 rounded-full"
          style={{
            background: 'var(--tag-bg)',
            color: 'var(--tag-text)',
            border: '1px solid var(--tag-border)',
          }}
        >
          {tag}
        </span>
      ))}
    </div>
  );

  // Brut-only heat-decay row — fixed 24px height keeps fresh / decayed /
  // dormant / NEW states layout-stable (Risk table). Not rendered in
  // classic mode at all. The `--card-heat` percentage is read by the CSS
  // rule `.brut-card-heat-row { color: color-mix(in oklch, var(--bone-100)
  // var(--card-heat), var(--bone-300)); }` to fade across 72 h.
  const heatRow = isBrut && (
    <div
      className="brut-card-heat-row mt-3 flex items-center gap-3 font-label text-xs tracking-widest uppercase tabular-nums"
      style={{
        height: '24px',
        // Dormant rows opt out of the heat ramp by reading --bone-400.
        ['--card-heat' as string]: `${cookedAge.pct}%`,
        ...(cookedAge.dormant ? { color: 'var(--bone-400)' } : null),
      } as React.CSSProperties}
      data-testid="brut-card-heat-row"
      data-dormant={cookedAge.dormant ? '1' : undefined}
    >
      <span data-testid="brut-card-heat-age">[{cookedAge.label}]</span>
      {!cookedAge.dormant && cookedCount > 0 && (
        <span data-testid="brut-card-heat-count">[COOKED {cookedCount}×]</span>
      )}
    </div>
  );

  const padClass = featured ? 'p-6' : 'p-5';
  const titleClass = featured
    ? 'font-display text-2xl font-semibold leading-snug mb-2'
    : 'font-display text-xl font-semibold leading-snug mb-1 line-clamp-2';
  const descClass = featured
    ? 'font-body text-base line-clamp-3 mb-4'
    : 'font-body text-base line-clamp-2 mb-3';

  const inner = (
    <>
      {selectMode && (
        <div
          className={`absolute top-2 left-2 w-4 h-4 rounded flex items-center justify-center transition-all pointer-events-none ${
            selected ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'
          }`}
          style={{
            background: selected ? 'var(--color-terracotta)' : 'oklch(100% 0 0 / 0.9)',
            border: `1.5px solid ${selected ? 'var(--color-terracotta)' : 'var(--border)'}`,
          }}
          aria-hidden="true"
        >
          {selected && (
            <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      )}
      <h2
        className={`${titleClass} ${isSearchMatch ? 'animate-underscore-sweep' : ''}`.trim()}
        style={{
          color: 'var(--text-1)',
          viewTransitionName: selectMode ? undefined : `recipe-title-${recipe.id}`,
        } as React.CSSProperties}
      >
        {recipe.name}
      </h2>

      {recipe.description && (
        <p className={descClass} style={{ color: 'var(--text-2)' }}>
          {recipe.description}
        </p>
      )}

      {metaRow}
      {tagRow}
      {heatRow}
    </>
  );

  if (selectMode) {
    const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
      onToggle?.(e.shiftKey);
    };
    const handleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
      // Shift+Space triggers range-selection the same way Shift+Click does.
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onToggle?.(e.shiftKey);
      }
    };
    return (
      <button
        type="button"
        className={`group relative block rounded-xl ${padClass} transition-colors cursor-pointer select-none text-left w-full`}
        style={{
          background: 'var(--bg-card)',
          border: `2px solid ${selected ? 'var(--color-terracotta)' : 'var(--border)'}`,
          boxShadow: 'var(--shadow-card)',
        }}
        onClick={handleClick}
        onKeyDown={handleKey}
        aria-pressed={selected}
        aria-label={selected ? t.deselectRecipeAriaLabel(recipe.name) : t.selectRecipeAriaLabel(recipe.name)}
        data-testid={`recipe-card-${recipe.id}`}
        data-selected={selected ? 'true' : 'false'}
        data-code={brutCode}
      >
        {inner}
      </button>
    );
  }

  return (
    <ViewTransitionLink
      href={`/recipes/${recipe.id}`}
      className={`recipe-card relative block rounded-xl ${padClass} transition-all`}
      style={{
        background: featured ? 'var(--bg-raised)' : 'var(--bg-card)',
        boxShadow: featured
          ? '0 0 0 1px oklch(100% 0 0 / 0.07), 0 4px 28px oklch(0 0 0 / 0.45), inset 0 1px 0 oklch(100% 0 0 / 0.05)'
          : 'var(--shadow-card)',
        viewTransitionName: `recipe-card-${recipe.id}`,
      } as React.CSSProperties}
      data-testid={`recipe-card-${recipe.id}`}
      data-code={brutCode}
    >
      {inner}
    </ViewTransitionLink>
  );
}
