'use server';

import { createClient } from '@/lib/supabase/server';
import { computeRecipeMacros } from '@/lib/macros/compute';
import { searchFdc } from '@/lib/macros/match';
import type { Ingredient, MacroValues } from '@/types/recipe';

function validateOverride(o: MacroValues): string | null {
  for (const k of ['kcal', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g'] as const) {
    const v = o[k];
    if (!Number.isFinite(v)) return `Invalid ${k}`;
    if (v < 0) return `${k} cannot be negative`;
  }
  if (o.kcal > 900) return 'kcal exceeds 900 per 100 g (check input)';
  for (const k of ['protein_g', 'fat_g', 'carbs_g', 'fiber_g'] as const) {
    if (o[k] > 100) return `${k} exceeds 100 per 100 g (impossible)`;
  }
  if (o.fat_g + o.carbs_g + o.protein_g > 100) {
    return 'fat + carbs + protein cannot exceed 100 g per 100 g';
  }
  return null;
}

export async function searchFdcAction(query: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };
  const candidates = await searchFdc(query, 5);
  return { candidates };
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function verifyAndGetIngredients(
  recipeId: string,
  index: number,
  expectedName: string
): Promise<
  | { error: string }
  | { supabase: SupabaseClient; ingredients: Ingredient[] }
> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('id, ingredients')
    .eq('id', recipeId)
    .eq('user_id', session.user.id)
    .single();
  if (error || !recipe) return { error: 'Recipe not found' };
  const ingredients = (recipe.ingredients ?? []) as Ingredient[];
  if (!ingredients[index] || ingredients[index].name !== expectedName) {
    return { error: 'Ingredient changed — please re-open the modal' };
  }
  return { supabase, ingredients };
}

export async function setIngredientMatch(
  recipeId: string,
  index: number,
  expectedName: string,
  fdcId: number
) {
  const res = await verifyAndGetIngredients(recipeId, index, expectedName);
  if ('error' in res) return res;
  const { supabase, ingredients } = res;
  ingredients[index] = { ...ingredients[index], fdc_id: fdcId, macros_override: undefined };
  await supabase.from('recipes').update({ ingredients }).eq('id', recipeId);
  await computeRecipeMacros(recipeId);
  return { ok: true };
}

export async function setIngredientOverride(
  recipeId: string,
  index: number,
  expectedName: string,
  override: MacroValues | null
) {
  if (override !== null) {
    const err = validateOverride(override);
    if (err) return { error: err };
  }
  const res = await verifyAndGetIngredients(recipeId, index, expectedName);
  if ('error' in res) return res;
  const { supabase, ingredients } = res;
  ingredients[index] = {
    ...ingredients[index],
    macros_override: override ?? undefined,
  };
  await supabase.from('recipes').update({ ingredients }).eq('id', recipeId);
  await computeRecipeMacros(recipeId);
  return { ok: true };
}

export interface BatchEntry {
  ingredientIndex: number;
  expectedName: string;
  fdcId?: number;
  override?: MacroValues | null;
}

export async function setIngredientMatches(recipeId: string, entries: BatchEntry[]) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('id, ingredients')
    .eq('id', recipeId)
    .eq('user_id', session.user.id)
    .single();
  if (error || !recipe) return { error: 'Recipe not found' };
  const ingredients = (recipe.ingredients ?? []) as Ingredient[];

  for (const entry of entries) {
    const ing = ingredients[entry.ingredientIndex];
    if (!ing || ing.name !== entry.expectedName) {
      return {
        error: `Ingredient #${entry.ingredientIndex} changed — please re-open the modal`,
      };
    }
    if (entry.override !== undefined) {
      if (entry.override !== null) {
        const err = validateOverride(entry.override);
        if (err) return { error: err };
      }
      ingredients[entry.ingredientIndex] = {
        ...ing,
        macros_override: entry.override ?? undefined,
      };
    } else if (entry.fdcId !== undefined) {
      ingredients[entry.ingredientIndex] = {
        ...ing,
        fdc_id: entry.fdcId,
        macros_override: undefined,
      };
    }
  }

  await supabase.from('recipes').update({ ingredients }).eq('id', recipeId);
  await computeRecipeMacros(recipeId);
  return { ok: true };
}

export async function triggerCompute(recipeId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };
  await computeRecipeMacros(recipeId);
  return { ok: true };
}
