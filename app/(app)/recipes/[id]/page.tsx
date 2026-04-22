import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerT } from '@/lib/i18n-server';
import DeleteRecipeButton from '@/components/recipes/DeleteRecipeButton';
import RecipeDetailClient from '@/components/recipes/RecipeDetailClient';
import type { Recipe } from '@/types/recipe';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('recipes').select('name').eq('id', id).single();
  return { title: data ? `${data.name} - jc-recipes` : 'Recipe' };
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

  const t = await getServerT();

  return (
    <div className="max-w-[min(100%-2rem,1280px)] mx-auto px-4 py-8 pb-24 md:pb-8 animate-fade-up">
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="font-display text-4xl font-bold leading-tight" style={{ color: 'var(--text-1)' }}>
          {recipe.name}
        </h1>
        <div className="flex gap-2 flex-shrink-0 mt-1">
          <Link href={`/recipes/${id}/edit`} className="btn-ghost">
            {t.editBtn}
          </Link>
          <DeleteRecipeButton id={id} name={recipe.name} />
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

      <RecipeDetailClient recipe={recipe} />
    </div>
  );
}
