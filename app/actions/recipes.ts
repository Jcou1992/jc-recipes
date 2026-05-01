'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { safeCompute } from '@/lib/macros/safe-compute';
import { inferBasisForUnit } from '@/lib/macros/unit-basis';
import { validateRecipePayload } from '@/lib/validate-recipe';
import { sanitizeTags } from '@/lib/bulk-recipes-tags';
import type { Ingredient, RecipePayload } from '@/types/recipe';

export type ActionResult = { error: string } | null;

const STALE_RECIPE_ERROR = 'This recipe was changed in another tab. Refresh and try again.';
const NOT_FOUND_ERROR = 'Recipe not found.';

function normalizeServingSizeLabel(payload: RecipePayload): RecipePayload {
  const raw = payload.serving_size_label;
  if (raw == null) return payload;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ...payload, serving_size_label: null };
  return { ...payload, serving_size_label: trimmed };
}

function normalizeTags(payload: RecipePayload): RecipePayload {
  if (!Array.isArray(payload.tags)) return payload;
  return { ...payload, tags: sanitizeTags(payload.tags) };
}

export async function createRecipe(payload: RecipePayload): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const validationError = validateRecipePayload(payload);
  if (validationError) return validationError;
  const normalized = normalizeTags(normalizeServingSizeLabel(payload));

  const { data, error } = await supabase
    .from('recipes')
    .insert({ ...normalized, user_id: user.id })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await safeCompute(data.id);

  redirect(`/recipes/${data.id}`);
}

export async function updateRecipe(
  id: string,
  payload: RecipePayload,
  expectedUpdatedAt: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const validationError = validateRecipePayload(payload);
  if (validationError) return validationError;
  const normalized = normalizeTags(normalizeServingSizeLabel(payload));

  // Preflight read: avoids an unnecessary write under the common no-conflict
  // case AND lets us distinguish not-found from stale-edit. The DB-level
  // .eq('updated_at', expectedUpdatedAt) on the UPDATE below is the
  // load-bearing guard against the TOCTOU window.
  const { data: existing } = await supabase
    .from('recipes')
    .select('ingredients, updated_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!existing) return { error: NOT_FOUND_ERROR };
  if (existing.updated_at !== expectedUpdatedAt) return { error: STALE_RECIPE_ERROR };

  const prev = (existing.ingredients ?? []) as Ingredient[];
  const next = (normalized.ingredients ?? []) as Ingredient[];
  for (let i = 0; i < next.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (!p || !n) continue;
    if (!n.macros_override) continue;
    if (inferBasisForUnit(p.unit) !== inferBasisForUnit(n.unit)) {
      delete n.macros_override;
      delete n.macros_override_basis;
    }
  }

  const { error, count } = await supabase
    .from('recipes')
    .update(normalized, { count: 'exact' })
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('updated_at', expectedUpdatedAt);

  if (error) return { error: error.message };
  if (!count) return { error: STALE_RECIPE_ERROR };

  await safeCompute(id);

  redirect(`/recipes/${id}`);
}

/**
 * Record a cook completion. Atomic: stamps `cooked_at = NOW()` and increments
 * `cooked_count` for a recipe owned by the authenticated user.
 *
 * Mode-neutral telemetry: this fires from cook-mode completion regardless of
 * design-mode. Brut renders the heat-decay row on recipe cards; classic does
 * not. The DB column is the source of truth for both modes — JC can toggle to
 * brut later and still see real cook history.
 *
 * Atomic via the `record_cooked(uuid)` Postgres function (see migration
 * 20260425004000). Silent on RLS misses: 0 rows updated, no throw.
 * No `revalidatePath` — heat decay reads via re-mount or client refresh.
 *
 * Fire-and-forget from CookMode. Failures (e.g. migration unapplied) are
 * logged + swallowed at the call site.
 */
export async function recordCooked(recipeId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase.rpc('record_cooked', { recipe_id: recipeId });
}

export async function deleteRecipe(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('recipes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  redirect('/recipes');
}
