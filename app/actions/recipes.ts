'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { RecipePayload } from '@/types/recipe';

type ActionResult = { error: string } | null;

export async function createRecipe(payload: RecipePayload): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data, error } = await supabase
    .from('recipes')
    .insert({ ...payload, user_id: session.user.id })
    .select('id')
    .single();

  if (error) return { error: error.message };

  redirect(`/recipes/${data.id}`);
}

export async function updateRecipe(id: string, payload: RecipePayload): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { error } = await supabase
    .from('recipes')
    .update(payload)
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) return { error: error.message };

  redirect(`/recipes/${id}`);
}

export async function deleteRecipe(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) return { error: error.message };

  redirect('/recipes');
}
