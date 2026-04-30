import { createClient } from '@/lib/supabase/server';
import { resolveGrams } from './unit-to-grams';
import { autoMatch } from './match';
import type {
  Ingredient,
  MacroValues,
  RecipeMacros,
  UnresolvedIngredient,
} from '@/types/recipe';

const computeCache = new Map<string, { at: number; promise: Promise<RecipeMacros | null> }>();
const THROTTLE_MS = 500;

export async function computeRecipeMacros(recipeId: string): Promise<RecipeMacros | null> {
  const now = Date.now();
  const cached = computeCache.get(recipeId);
  if (cached && now - cached.at < THROTTLE_MS) {
    return cached.promise;
  }

  const promise = doCompute(recipeId);
  computeCache.set(recipeId, { at: now, promise });
  const cleanupTimer = setTimeout(() => {
    const c = computeCache.get(recipeId);
    if (c && c.at === now) computeCache.delete(recipeId);
  }, THROTTLE_MS);
  cleanupTimer.unref?.();
  return promise;
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function doCompute(recipeId: string): Promise<RecipeMacros | null> {
  const supabase = await createClient();
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('id, servings, ingredients')
    .eq('id', recipeId)
    .single();
  if (error || !recipe) return null;

  const ingredients = (recipe.ingredients ?? []) as Ingredient[];
  if (ingredients.length === 0) {
    await writeMacros(supabase, recipeId, null);
    return null;
  }

  const unresolved: UnresolvedIngredient[] = [];
  const totals: MacroValues = { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 };
  let matched = 0;

  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];

    // Per-unit override: skip gram lookup — contribution is amount × override.
    if (ing.macros_override && ing.macros_override_basis === 'per_unit') {
      const n = ing.amount;
      totals.kcal += ing.macros_override.kcal * n;
      totals.protein_g += ing.macros_override.protein_g * n;
      totals.fat_g += ing.macros_override.fat_g * n;
      totals.carbs_g += ing.macros_override.carbs_g * n;
      totals.fiber_g += ing.macros_override.fiber_g * n;
      matched++;
      continue;
    }

    const g = await resolveGrams(ing);
    if ('unresolved' in g) {
      unresolved.push({ index: i, name: ing.name, reason: g.unresolved });
      continue;
    }

    let per100: MacroValues | null = null;
    if (ing.macros_override) {
      per100 = ing.macros_override;
    } else if (ing.fdc_id) {
      per100 = await fetchFactsById(supabase, ing.fdc_id);
    } else {
      // Auto-match is recomputed on every call. We deliberately do NOT
      // persist the auto-matched fdc_id back to the ingredient row — doing
      // so would race with concurrent user edits (e.g. a chef saving a
      // different match via setIngredientMatch mid-compute would be
      // clobbered by the writeback). Auto-match is a cheap (~20ms) pg_trgm
      // lookup, so recomputing is acceptable. Any chef-confirmed match is
      // persisted only through setIngredientMatch.
      const autoId = await autoMatch(ing.name);
      if (autoId !== null) {
        per100 = await fetchFactsById(supabase, autoId);
      }
    }

    if (!per100) {
      unresolved.push({ index: i, name: ing.name, reason: 'no match' });
      continue;
    }

    const scale = g.grams / 100;
    totals.kcal += per100.kcal * scale;
    totals.protein_g += per100.protein_g * scale;
    totals.fat_g += per100.fat_g * scale;
    totals.carbs_g += per100.carbs_g * scale;
    totals.fiber_g += per100.fiber_g * scale;
    matched++;
  }

  const result: RecipeMacros = {
    kcal: +totals.kcal.toFixed(1),
    protein_g: +totals.protein_g.toFixed(1),
    fat_g: +totals.fat_g.toFixed(1),
    carbs_g: +totals.carbs_g.toFixed(1),
    fiber_g: +totals.fiber_g.toFixed(1),
    matched_count: matched,
    total_count: ingredients.length,
    unresolved_ingredients: unresolved,
  };

  // Only persist the computed macros + timestamp. Never write back
  // ingredients — see auto-match comment above.
  await supabase
    .from('recipes')
    .update({
      macros: result,
      macros_computed_at: new Date().toISOString(),
    })
    .eq('id', recipeId);

  return result;
}

async function fetchFactsById(
  supabase: SupabaseClient,
  fdcId: number
): Promise<MacroValues | null> {
  const { data } = await supabase
    .from('nutrition_facts')
    .select('kcal, protein_g, fat_g, carbs_g, fiber_g')
    .eq('fdc_id', fdcId)
    .maybeSingle();
  return data ? (data as MacroValues) : null;
}

async function writeMacros(
  supabase: SupabaseClient,
  recipeId: string,
  macros: RecipeMacros | null
) {
  await supabase.from('recipes').update({ macros, macros_computed_at: null }).eq('id', recipeId);
}
