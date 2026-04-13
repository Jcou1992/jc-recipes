import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import RecipeListClient from '@/components/recipes/RecipeListClient';

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

  // Collect all unique tags across the user's recipes
  const allTags = Array.from(
    new Set(recipes.flatMap(r => r.tags ?? []))
  ).sort();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-1)' }}>
          My Recipes
        </h1>
        <Link href="/recipes/new" className="btn-primary min-h-[44px]">
          + New recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div data-testid="empty-state" className="text-center py-20">
          <p className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-2)' }}>
            No recipes yet
          </p>
          <p className="font-body text-base mb-8" style={{ color: 'var(--text-3)' }}>
            Añade tu primera receta para empezar.
          </p>
          <Link href="/recipes/new" className="btn-primary">
            Create your first recipe
          </Link>
        </div>
      ) : (
        <Suspense fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recipes.slice(0, 4).map(r => (
              <div key={r.id} className="rounded-xl h-32 animate-pulse" style={{ background: 'var(--bg-card)' }} />
            ))}
          </div>
        }>
          <RecipeListClient recipes={recipes} allTags={allTags} />
        </Suspense>
      )}
    </div>
  );
}
