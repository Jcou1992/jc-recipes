'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { computeRecipeMacros } from '@/lib/macros/compute';
import { inferBasisForUnit } from '@/lib/macros/unit-basis';
import type { Ingredient, RecipePayload } from '@/types/recipe';

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

  // Read existing ingredients so we can clear stale overrides when a unit
  // change flips the macros basis.
  const { data: existing } = await supabase
    .from('recipes')
    .select('ingredients')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single();

  if (existing) {
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
  }

  const { error } = await supabase
    .from('recipes')
    .update(normalized)
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) return { error: error.message };

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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  await supabase.rpc('record_cooked', { recipe_id: recipeId });
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
