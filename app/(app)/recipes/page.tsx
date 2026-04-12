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
      <div className="max-w-3xl mx-auto px-4 py-8 text-sm" style={{ color: 'var(--color-terracotta)' }}>
        Error al cargar recetas: {error.message}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1
          className="font-display text-3xl font-bold"
          style={{ color: 'var(--text-1)' }}
        >
          My Recipes
        </h1>
        <Link href="/recipes/new" className="btn-primary">
          + New recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div
          data-testid="empty-state"
          className="text-center py-20"
        >
          <p
            className="font-display text-xl font-semibold mb-2"
            style={{ color: 'var(--text-2)' }}
          >
            No recipes yet
          </p>
          <p
            className="font-body text-base mb-8"
            style={{ color: 'var(--text-3)' }}
          >
            Añade tu primera receta para empezar.
          </p>
          <Link href="/recipes/new" className="btn-primary">
            Create your first recipe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-up">
          {recipes.map(recipe => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
