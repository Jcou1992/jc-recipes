import type { Metadata } from 'next';
import { Suspense } from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getServerT } from '@/lib/i18n-server';
import { getUserPreferences } from '@/app/actions/preferences';
import RecipeListClient from '@/components/recipes/RecipeListClient';
import RetryButton from '@/components/ui/RetryButton';
import EditableSpaceName from '@/components/recipes/EditableSpaceName';
import OnboardingTourGate from '@/components/onboarding/OnboardingTour';
import InkBrush from '@/components/motion/InkBrush';
import { Ticket } from '@/components/ui/brut/Ticket';
import { DESIGN_MODE_COOKIE } from '@/lib/brut/design-mode-cookie';

export const metadata: Metadata = { title: 'My Recipes — SEKAI' };

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string }>;
}) {
  const supabase = await createClient();
  const [recipesRes, prefs, t, sp, cookieStore] = await Promise.all([
    supabase.from('recipes').select('*').order('created_at', { ascending: false }),
    getUserPreferences(),
    getServerT(),
    searchParams,
    cookies(),
  ]);
  const { data: recipes, error } = recipesRes;
  const tourActive = sp?.tour === '1';
  // Brut design-mode detection — gates the [ MISE · EMPTY ] ticket on the
  // truly-empty path (R3). Reads the `design-mode` cookie server-side so the
  // first paint matches the eventual hydrated tree (no flash of InkBrush).
  const isBrut = cookieStore.get(DESIGN_MODE_COOKIE)?.value === 'brut';

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
      {tourActive && (
        <OnboardingTourGate
          initialPrefs={{
            preferred_theme: prefs?.preferred_theme ?? null,
            preferred_font_size: prefs?.preferred_font_size ?? null,
            preferred_language: prefs?.preferred_language ?? null,
            preferred_units: prefs?.preferred_units ?? null,
          }}
        />
      )}
      <div className="flex items-start justify-between gap-3 mb-8 min-w-0">
        <EditableSpaceName
          initial={spaceName}
          fallback={t.recipesPageTitle}
          ariaLabel={t.spaceNameEditAriaLabel}
          savedToast={t.spaceNameSaved}
          failedToast={t.spaceNameSaveFailed}
        />
        <Link
          href="/recipes/new"
          className="btn-primary min-h-[44px] flex-shrink-0 whitespace-nowrap"
        >
          {t.newRecipeBtn}
        </Link>
      </div>

      {recipes.length === 0 ? (
        isBrut ? (
          <div className="py-12" data-testid="empty-state">
            <Ticket code="MISE · EMPTY" className="brut-empty-ticket">
              <div className="brut-empty-body">
                <p className="brut-empty-rule" aria-hidden="true">────────────────────</p>
                <p className="brut-empty-headline">NO RECIPES YET.</p>
                <p className="brut-empty-cta">
                  <span className="brut-empty-hint">PRESS </span>
                  <kbd className="brut-empty-key">N</kbd>
                  <span className="brut-empty-hint"> OR TAP </span>
                  <Link href="/recipes/new" className="brut-empty-action">+ NEW RECIPE</Link>
                  <span className="brut-empty-hint">.</span>
                </p>
              </div>
            </Ticket>
          </div>
        ) : (
          <div data-testid="empty-state" className="text-center py-20">
            <div className="flex justify-center mb-6">
              <InkBrush />
            </div>
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
        )
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
