import Link from 'next/link';
import type { Recipe } from '@/types/recipe';

interface Props {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: Props) {
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-orange-300 hover:shadow-sm transition-all"
    >
      <h2 className="font-semibold text-stone-800 text-base leading-snug mb-1 line-clamp-2">
        {recipe.name}
      </h2>

      {recipe.description && (
        <p className="text-stone-500 text-sm line-clamp-2 mb-3">{recipe.description}</p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-400">
        <span>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</span>
        {totalTime > 0 && <span>{totalTime} min</span>}
        {recipe.ingredients.length > 0 && (
          <span>{recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {recipe.tags.map(tag => (
            <span
              key={tag}
              className="bg-stone-100 text-stone-500 text-xs px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
