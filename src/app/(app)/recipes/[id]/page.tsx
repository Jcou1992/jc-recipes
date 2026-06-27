import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerT } from '@/lib/i18n-server';
import DeleteRecipeButton from '@/components/recipes/DeleteRecipeButton';
import RecipeDetailClient from '@/components/recipes/RecipeDetailClient';
import ShareToggle from '@/components/recipes/ShareToggle';
import ScrollParallaxCover from '@/components/motion/ScrollParallaxCover';
import FirstSaveCelebration from '@/components/motion/FirstSaveCelebration';
import { RefCode } from '@/components/ui/brut/RefCode';
import { DESIGN_MODE_COOKIE } from '@/lib/brut/design-mode-cookie';
import { fmtRec } from '@/lib/brut/ref-codes';
import type { Recipe } from '@/types/recipe';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('recipes').select('name').eq('id', id).single();
  return { title: data ? `${data.name} — SEKAI` : 'Recipe — SEKAI' };
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single<Recipe>();

  if (error || !recipe) notFound();

  // A recipe reaches here either because the viewer owns it or because it's
  // shared (RLS "read shared recipes"). Owner-only actions (edit/delete/share)
  // are gated on ownership; non-owners get a read-only "shared by" chip.
  const { data: { user } } = await supabase.auth.getUser();
  const isOwner = !!user && recipe.user_id === user.id;

  let sharedByName: string | null = null;
  if (!isOwner) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('display_name, email')
      .eq('id', recipe.user_id)
      .maybeSingle();
    sharedByName = prof?.display_name || prof?.email?.split('@')[0] || null;
  }

  const t = await getServerT();
  // Cycle 2 P0 #2: under brut, render the machine-grammar ref-code as a
  // small chip BELOW the human name — not in the title slot, where it was
  // visually indistinguishable from the recipe name itself. Server-side
  // cookie read keeps this zero-flash; classic mode renders nothing extra.
  const cookieStore = await cookies();
  const isBrut = cookieStore.get(DESIGN_MODE_COOKIE)?.value === 'brut';
  const refCodeId = isBrut ? fmtRec(recipe.id).replace(/^REC-/, '') : '';

  return (
    <div
      className="max-w-[min(100%-2rem,1280px)] mx-auto px-4 py-8 pb-24 md:pb-8 animate-fade-up"
      style={{ viewTransitionName: `recipe-card-${id}` } as React.CSSProperties}
    >
      <Link
        href="/recipes"
        className="font-label text-xs tracking-widest uppercase inline-flex items-center mb-6 transition-colors min-h-[44px]"
        style={{ color: 'var(--text-3)' }}
      >
        {t.backToRecipes}
      </Link>
      <ScrollParallaxCover>
        <div className="flex items-start justify-between gap-4 mb-4 min-w-0">
          <div className="min-w-0 flex-1">
            <h1
              className="recipe-title font-display text-4xl font-bold leading-tight break-words min-w-0"
              style={{
                color: 'var(--text-1)',
                viewTransitionName: `recipe-title-${id}`,
                overflowWrap: 'break-word',
              } as React.CSSProperties}
            >
              {recipe.name}
            </h1>
            {isBrut && (
              <RefCode ns="REC" id={refCodeId} className="brut-detail-ref" />
            )}
            <FirstSaveCelebration recipeId={id} />
          </div>
          <div className="flex gap-2 flex-shrink-0 mt-1 items-center">
            {isOwner ? (
              <>
                <ShareToggle recipeId={id} initialShared={!!recipe.is_shared} />
                <Link href={`/recipes/${id}/edit`} className="btn-ghost">
                  {t.editBtn}
                </Link>
                <DeleteRecipeButton id={id} name={recipe.name} />
              </>
            ) : (
              sharedByName && (
                <span
                  className="font-label text-xs tracking-wider uppercase px-2.5 py-1 rounded-full"
                  style={{
                    background: 'color-mix(in oklch, var(--color-gold) 12%, transparent)',
                    color: 'var(--color-gold)',
                    border: '1px solid color-mix(in oklch, var(--color-gold) 20%, transparent)',
                  }}
                  data-testid="shared-by-chip"
                >
                  {t.sharedBy(sharedByName)}
                </span>
              )
            )}
          </div>
        </div>

        {recipe.description && (
          <p className="font-body text-lg mb-5" style={{ color: 'var(--text-2)' }}>
            {recipe.description}
          </p>
        )}

        {recipe.tags && recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {recipe.tags.map(tag => (
              <span
                key={tag}
                className="font-label text-sm tracking-wider uppercase px-2.5 py-0.5 rounded-full"
                style={{
                  background: 'color-mix(in oklch, var(--color-gold) 12%, transparent)',
                  color: 'var(--color-gold)',
                  border: '1px solid color-mix(in oklch, var(--color-gold) 20%, transparent)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </ScrollParallaxCover>

      <RecipeDetailClient recipe={recipe} />
    </div>
  );
}
