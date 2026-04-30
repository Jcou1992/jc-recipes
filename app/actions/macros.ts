'use server';

import { createClient } from '@/lib/supabase/server';
import { computeRecipeMacros } from '@/lib/macros/compute';
import { searchFdc } from '@/lib/macros/match';
import type { Ingredient, MacroValues } from '@/types/recipe';

function validateOverride(o: MacroValues, basis: 'per_100g' | 'per_unit'): string | null {
  for (const k of ['kcal', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g'] as const) {
    const v = o[k];
    if (!Number.isFinite(v)) return `Invalid ${k}`;
    if (v < 0) return `${k} cannot be negative`;
  }
  if (basis === 'per_100g') {
    if (o.kcal > 900) return 'kcal exceeds 900 per 100 g (check input)';
    for (const k of ['protein_g', 'fat_g', 'carbs_g', 'fiber_g'] as const) {
      if (o[k] > 100) return `${k} exceeds 100 per 100 g (impossible)`;
    }
    if (o.fat_g + o.carbs_g + o.protein_g > 100) {
      return 'fat + carbs + protein cannot exceed 100 g per 100 g';
    }
  } else {
    if (o.kcal > 1500) return 'kcal exceeds 1500 per unit (check input)';
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
  | { supabase: SupabaseClient; ingredients: Ingredient[]; userId: string }
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
  return { supabase, ingredients, userId: session.user.id };
}

export async function setIngredientMatch(
  recipeId: string,
  index: number,
  expectedName: string,
  fdcId: number,
  fdcName?: string,
) {
  const res = await verifyAndGetIngredients(recipeId, index, expectedName);
  if ('error' in res) return res;
  const { supabase, ingredients, userId } = res;
  ingredients[index] = {
    ...ingredients[index],
    fdc_id: fdcId,
    fdc_name: fdcName,
    macros_override: undefined,
    macros_override_basis: undefined,
  };
  const { error, count } = await supabase
    .from('recipes')
    .update({ ingredients }, { count: 'exact' })
    .eq('id', recipeId)
    .eq('user_id', userId);
  if (error) return { error: `Failed to update ingredient match: ${error.message}` };
  if (!count) return { error: 'Recipe update was blocked or stale. Please refresh and try again.' };
  return computeAndReturn(recipeId);
}

export async function setIngredientOverride(
  recipeId: string,
  index: number,
  expectedName: string,
  override: MacroValues | null,
  basis: 'per_100g' | 'per_unit' = 'per_100g',
) {
  if (override !== null) {
    const err = validateOverride(override, basis);
    if (err) return { error: err };
  }
  const res = await verifyAndGetIngredients(recipeId, index, expectedName);
  if ('error' in res) return res;
  const { supabase, ingredients, userId } = res;
  ingredients[index] = {
    ...ingredients[index],
    macros_override: override ?? undefined,
    macros_override_basis: override ? basis : undefined,
  };
  const { error, count } = await supabase
    .from('recipes')
    .update({ ingredients }, { count: 'exact' })
    .eq('id', recipeId)
    .eq('user_id', userId);
  if (error) return { error: `Failed to update ingredient override: ${error.message}` };
  if (!count) return { error: 'Recipe update was blocked or stale. Please refresh and try again.' };
  return computeAndReturn(recipeId);
}

export interface BatchEntry {
  ingredientIndex: number;
  expectedName: string;
  fdcId?: number;
  fdcName?: string;
  override?: MacroValues | null;
  overrideBasis?: 'per_100g' | 'per_unit';
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
      if (entry.override !== null && !entry.overrideBasis) {
        return { error: 'Override basis missing' };
      }
      if (entry.override !== null) {
        const err = validateOverride(entry.override, entry.overrideBasis!);
        if (err) return { error: err };
      }
      ingredients[entry.ingredientIndex] = {
        ...ing,
        macros_override: entry.override ?? undefined,
        macros_override_basis: entry.override ? entry.overrideBasis : undefined,
        // switching to manual clears USDA match + name
        fdc_id: undefined,
        fdc_name: undefined,
      };
    } else if (entry.fdcId !== undefined) {
      ingredients[entry.ingredientIndex] = {
        ...ing,
        fdc_id: entry.fdcId,
        fdc_name: entry.fdcName,
        macros_override: undefined,
        macros_override_basis: undefined,
      };
    }
  }

  const { error: updateError, count } = await supabase
    .from('recipes')
    .update({ ingredients }, { count: 'exact' })
    .eq('id', recipeId)
    .eq('user_id', session.user.id);
  if (updateError) return { error: `Failed to update ingredient matches: ${updateError.message}` };
  if (!count) return { error: 'Recipe update was blocked or stale. Please refresh and try again.' };
  return computeAndReturn(recipeId);
}


function normalizeActionError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

async function computeAndReturn(recipeId: string): Promise<{ ok: true } | { error: string }> {
  try {
    await computeRecipeMacros(recipeId);
    return { ok: true };
  } catch (error) {
    return { error: normalizeActionError(error, 'Failed to compute recipe macros') };
  }
}

export async function triggerCompute(recipeId: string) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { error: 'Not authenticated' };
  return computeAndReturn(recipeId);
}
