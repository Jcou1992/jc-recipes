import Link from 'next/link';
import type { Recipe } from '@/types/recipe';

interface Props {
  recipe: Recipe;
  featured?: boolean;
}

export default function RecipeCard({ recipe, featured = false }: Props) {
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  const metaRow = (
    <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
      <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
        {recipe.servings} {recipe.servings !== 1 ? 'porciones' : 'porción'}
      </span>
      {totalTime > 0 && (
        <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
          {totalTime} min
        </span>
      )}
      {recipe.ingredients.length > 0 && (
        <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
          {recipe.ingredients.length} ingredientes
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

  if (featured) {
    return (
      <Link
        href={`/recipes/${recipe.id}`}
        className="recipe-card block rounded-xl p-6 transition-all"
        style={{
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        <h2
          className="font-display text-2xl font-semibold leading-snug mb-2"
          style={{ color: 'var(--text-1)' }}
        >
          {recipe.name}
        </h2>

        {recipe.description && (
          <p
            className="font-body text-base line-clamp-3 mb-4"
            style={{ color: 'var(--text-2)' }}
          >
            {recipe.description}
          </p>
        )}

        {metaRow}
        {tagRow}
      </Link>
    );
  }

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="recipe-card block rounded-xl p-5 transition-all"
      style={{
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <h2
        className="font-display text-xl font-semibold leading-snug mb-1 line-clamp-2"
        style={{ color: 'var(--text-1)' }}
      >
        {recipe.name}
      </h2>

      {recipe.description && (
        <p
          className="font-body text-base line-clamp-2 mb-3"
          style={{ color: 'var(--text-2)' }}
        >
          {recipe.description}
        </p>
      )}

      {metaRow}
      {tagRow}
    </Link>
  );
}
