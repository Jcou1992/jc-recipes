import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CookMode from '@/components/recipes/CookMode';
import type { Recipe } from '@/types/recipe';

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ servings?: string; units?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('recipes').select('name').eq('id', id).single();
  return { title: data ? `Cocinando: ${data.name}` : 'Modo cocina' };
}

export default async function CookPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { servings: servingsParam, units } = await searchParams;

  const supabase = await createClient();
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single<Recipe>();

  if (error || !recipe) notFound();
  if (recipe.steps.length === 0) notFound();

  const initialServings = servingsParam ? parseInt(servingsParam, 10) || recipe.servings : recipe.servings;
  const unitSystem = units === 'imperial' ? 'imperial' : 'metric';

  return (
    <CookMode
      recipe={recipe}
      initialServings={initialServings}
      unitSystem={unitSystem}
    />
  );
}
