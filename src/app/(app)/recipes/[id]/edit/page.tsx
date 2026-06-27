import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerT } from '@/lib/i18n-server';
import FormWithPreview from '@/components/recipes/FormWithPreview';
import { updateRecipe } from '@/app/actions/recipes';
import type { Recipe, RecipePayload } from '@/types/recipe';

// expectedUpdatedAt is captured into the server-action closure at render time;
// caching the page would freeze a stale timestamp and cause spurious STALE
// errors on the second save. Force a fresh render every request.
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('recipes').select('name').eq('id', id).single();
  return { title: data ? `Edit ${data.name} - jc-recipes` : 'Edit recipe' };
}

export default async function EditRecipePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single<Recipe>();

  if (error || !recipe) notFound();

  const t = await getServerT();
  const expectedUpdatedAt = recipe.updated_at;

  async function handleUpdate(payload: RecipePayload) {
    'use server';
    return updateRecipe(id, payload, expectedUpdatedAt);
  }

  return (
    <div className="max-w-[min(100%-2rem,1280px)] mx-auto px-4 py-8">
      <Link
        href={`/recipes/${id}`}
        className="font-label text-xs tracking-widest uppercase inline-flex items-center min-h-[44px] mb-6 transition-colors"
        style={{ color: 'var(--text-3)' }}
      >
        {t.backBtn}
      </Link>
      <h1
        className="font-display text-3xl font-bold mb-8"
        style={{ color: 'var(--text-1)' }}
      >
        {t.editRecipeTitle}
      </h1>
      <FormWithPreview
        initialData={recipe}
        onSubmit={handleUpdate}
        submitLabel={t.saveChangesSubmitLabel}
        cancelHref={`/recipes/${id}`}
      />
    </div>
  );
}
