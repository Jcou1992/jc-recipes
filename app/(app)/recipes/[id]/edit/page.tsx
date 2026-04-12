import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import RecipeForm from '@/components/recipes/RecipeForm';
import { updateRecipe } from '@/app/actions/recipes';
import type { Recipe, RecipePayload } from '@/types/recipe';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('recipes').select('name').eq('id', id).single();
  return { title: data ? `Edit ${data.name} - jc-recipes` : 'Edit Recipe' };
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

  async function handleUpdate(payload: RecipePayload) {
    'use server';
    return updateRecipe(id, payload);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href={`/recipes/${id}`} className="inline-block text-stone-500 hover:text-stone-700 mb-6 text-sm">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold text-stone-800 mb-8">Edit recipe</h1>
      <RecipeForm
        initialData={recipe}
        onSubmit={handleUpdate}
        submitLabel="Save changes"
      />
    </div>
  );
}
