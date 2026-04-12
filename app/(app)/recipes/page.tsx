import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import RecipeCard from '@/components/recipes/RecipeCard';

export const metadata: Metadata = { title: 'My Recipes - jc-recipes' };

export default async function RecipesPage() {
  const supabase = await createClient();
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-red-600 text-sm">
        Failed to load recipes: {error.message}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">My Recipes</h1>
        <Link
          href="/recipes/new"
          className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors min-h-[44px] flex items-center"
        >
          + New recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div
          data-testid="empty-state"
          className="text-center py-16 text-stone-400"
        >
          <p className="text-lg font-medium mb-2">No recipes yet</p>
          <p className="text-sm mb-6">Add your first recipe to get started.</p>
          <Link
            href="/recipes/new"
            className="inline-block bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-600 transition-colors"
          >
            Create your first recipe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
