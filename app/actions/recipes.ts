'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { computeRecipeMacros } from '@/lib/macros/compute';
import type { RecipePayload } from '@/types/recipe';

export type ActionResult = { error: string } | null;

const SERVING_SIZE_LABEL_MAX = 40;

function normalizeServingSizeLabel(payload: RecipePayload): RecipePayload | { error: string } {
  const raw = payload.serving_size_label;
  if (raw == null) return payload;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ...payload, serving_size_label: null };
  if (trimmed.length > SERVING_SIZE_LABEL_MAX) {
    return { error: `Serving size label must be ${SERVING_SIZE_LABEL_MAX} characters or fewer.` };
  }
  return { ...payload, serving_size_label: trimmed };
}

async function safeCompute(recipeId: string): Promise<void> {
  try {
    await computeRecipeMacros(recipeId);
  } catch (err) {
    console.error('macros compute failed', err);
  }
}

export async function createRecipe(payload: RecipePayload): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const normalized = normalizeServingSizeLabel(payload);
  if ('error' in normalized) return normalized;

  const { data, error } = await supabase
    .from('recipes')
    .insert({ ...normalized, user_id: session.user.id })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await safeCompute(data.id);

  redirect(`/recipes/${data.id}`);
}

export async function updateRecipe(id: string, payload: RecipePayload): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const normalized = normalizeServingSizeLabel(payload);
  if ('error' in normalized) return normalized;

  const { error } = await supabase
    .from('recipes')
    .update(normalized)
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) return { error: error.message };

  await safeCompute(id);

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
