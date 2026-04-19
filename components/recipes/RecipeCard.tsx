'use client';

import Link from 'next/link';
import type { MouseEvent } from 'react';
import type { Recipe } from '@/types/recipe';

interface Props {
  recipe: Recipe;
  featured?: boolean;
  selectMode?: boolean;
  selected?: boolean;
  onToggle?: (shift: boolean) => void;
}

export default function RecipeCard({
  recipe,
  featured = false,
  selectMode = false,
  selected = false,
  onToggle,
}: Props) {
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  const metaRow = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
      <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
        {recipe.servings} {recipe.servings !== 1 ? 'servings' : 'serving'}
      </span>
      {totalTime > 0 && (
        <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
          {totalTime} min
        </span>
      )}
      {recipe.ingredients.length > 0 && (
        <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
          {recipe.ingredients.length} ingredients
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
            background: 'rgba(237,209,142,0.1)',
            color: 'var(--color-gold)',
            border: '1px solid rgba(237,209,142,0.15)',
          }}
        >
          {tag}
        </span>
      ))}
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
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          style={{
            background: selected ? 'var(--color-terracotta)' : 'rgba(255,255,255,0.9)',
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
      <h2 className={titleClass} style={{ color: 'var(--text-1)' }}>
        {recipe.name}
      </h2>

      {recipe.description && (
        <p className={descClass} style={{ color: 'var(--text-2)' }}>
          {recipe.description}
        </p>
      )}

      {metaRow}
      {tagRow}
    </>
  );

  if (selectMode) {
    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
      onToggle?.(e.shiftKey);
    };
    return (
      <div
        className={`group relative block rounded-xl ${padClass} transition-colors cursor-pointer select-none`}
        style={{
          background: 'var(--bg-card)',
          border: `2px solid ${selected ? 'var(--color-terracotta)' : 'var(--border)'}`,
          boxShadow: 'var(--shadow-card)',
        }}
        onClick={handleClick}
        role="button"
        aria-pressed={selected}
        aria-label={`${selected ? 'Deselect' : 'Select'} ${recipe.name}`}
        data-testid={`recipe-card-${recipe.id}`}
        data-selected={selected ? 'true' : 'false'}
      >
        {inner}
      </div>
    );
  }

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={`recipe-card relative block rounded-xl ${padClass} transition-all`}
      style={{
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-card)',
      }}
      data-testid={`recipe-card-${recipe.id}`}
    >
      {inner}
    </Link>
  );
}
