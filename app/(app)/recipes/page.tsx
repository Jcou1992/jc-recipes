import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getServerT } from '@/lib/i18n-server';
import { getUserPreferences } from '@/app/actions/preferences';
import RecipeListClient from '@/components/recipes/RecipeListClient';
import RetryButton from '@/components/ui/RetryButton';
import EditableSpaceName from '@/components/recipes/EditableSpaceName';

export const metadata: Metadata = { title: 'My Recipes — SEKAI' };

export default async function RecipesPage() {
  const supabase = await createClient();
  const [recipesRes, prefs, t] = await Promise.all([
    supabase.from('recipes').select('*').order('created_at', { ascending: false }),
    getUserPreferences(),
    getServerT(),
  ]);
  const { data: recipes, error } = recipesRes;

  const spaceName = prefs?.space_name || t.recipesPageTitle;

  if (error) {
    return (
      <div className="max-w-[min(100%-2rem,1920px)] mx-auto px-4 lg:px-8 py-8">
        <EditableSpaceName
          initial={spaceName}
          fallback={t.recipesPageTitle}
          ariaLabel={t.spaceNameEditAriaLabel}
          savedToast={t.spaceNameSaved}
          failedToast={t.spaceNameSaveFailed}
        />
        <div data-testid="recipes-error-state" className="py-20 text-center">
          <p className="font-display text-xl font-semibold mb-3" style={{ color: 'var(--text-2)' }}>
            Can&apos;t load recipes.
          </p>
          <p className="font-body text-base mb-8" style={{ color: 'var(--text-3)' }}>
            {error.message}
          </p>
          <div className="flex items-center justify-center gap-3">
            <RetryButton label="Retry" testId="retry-btn" />
            <a href="/" className="btn-ghost">Home</a>
          </div>
        </div>
      </div>
    );
  }

  const allTags = Array.from(
    new Set(recipes.flatMap(r => r.tags ?? []))
  ).sort();

  return (
    <div className="max-w-[min(100%-2rem,1920px)] mx-auto px-4 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <EditableSpaceName
          initial={spaceName}
          fallback={t.recipesPageTitle}
          ariaLabel={t.spaceNameEditAriaLabel}
          savedToast={t.spaceNameSaved}
          failedToast={t.spaceNameSaveFailed}
        />
        <Link href="/recipes/new" className="btn-primary min-h-[44px]">
          {t.newRecipeBtn}
        </Link>
      </div>

      {recipes.length === 0 ? (
        <div data-testid="empty-state" className="text-center py-20">
          <p className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-2)' }}>
            {t.noRecipesYet}
          </p>
          <p className="font-body text-base mb-8" style={{ color: 'var(--text-3)' }}>
            {t.noRecipesGetStarted}
          </p>
          <Link href="/recipes/new" className="btn-primary">
            {t.noRecipesCreateFirst}
          </Link>
          <p className="font-label text-xs tracking-widest uppercase mt-6" style={{ color: 'var(--text-3)' }}>
            <Link href="/recipes/new#import">Or paste a recipe from Markdown</Link>
          </p>
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
