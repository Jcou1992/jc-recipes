import type { SupabaseClient } from '@supabase/supabase-js';
import type { Recipe, RecipePayload } from '../../../src/types/recipe';
import { validateRecipePayload } from '../../../src/lib/validate-recipe';
import { sanitizeTags } from '../../../src/lib/bulk-recipes-tags';
import { normalizeServingSizeLabel, normalizeTags } from './normalize';

/**
 * Front-end-agnostic recipe operations. Each takes an already-authenticated
 * Supabase client (RLS does the scoping) so this module is reusable by the MCP
 * worker now and a CLI/Skill later — it knows nothing about MCP or OAuth.
 */

export type ServiceResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface RecipeSummary {
  id: string;
  name: string;
  description: string | null;
  tags: string[] | null;
  servings: number;
  created_at: string;
}

export interface SearchOptions {
  query?: string;
  tags?: string[];
  limit?: number;
}

const SEARCH_DEFAULT_LIMIT = 20;
const SEARCH_MAX_LIMIT = 50;

// Escape PostgreSQL LIKE/ILIKE metacharacters so user text matches literally.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

export async function createRecipeForUser(
  client: SupabaseClient,
  payload: RecipePayload,
  userId: string,
): Promise<ServiceResult<{ id: string }>> {
  // Server-side trust boundary — never rely on the client model's pre-validation.
  const validationError = validateRecipePayload(payload);
  if (validationError) return { ok: false, error: validationError.error };

  const normalized = normalizeTags(normalizeServingSizeLabel(payload));

  const { data, error } = await client
    .from('recipes')
    .insert({ ...normalized, user_id: userId })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { id: data.id as string } };
}

export async function updateRecipeForUser(
  client: SupabaseClient,
  id: string,
  partial: Partial<RecipePayload>,
  userId: string,
): Promise<ServiceResult<{ id: string; name: string }>> {
  const { data: existing, error: fetchError } = await client
    .from('recipes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!existing) return { ok: false, error: 'Recipe not found.' };

  const current = existing as Recipe;

  // PATCH semantics: undefined = keep current, null = clear (nullable fields
  // only — the schema forbids null on name/servings/ingredients/steps).
  const merged: RecipePayload = {
    name: partial.name ?? current.name,
    servings: partial.servings ?? current.servings,
    ingredients: partial.ingredients ?? current.ingredients,
    steps: partial.steps ?? current.steps,
    description: partial.description !== undefined ? partial.description : current.description,
    prep_time: partial.prep_time !== undefined ? partial.prep_time : current.prep_time,
    cook_time: partial.cook_time !== undefined ? partial.cook_time : current.cook_time,
    serving_size_label:
      partial.serving_size_label !== undefined ? partial.serving_size_label : current.serving_size_label,
    tags: partial.tags !== undefined ? partial.tags : current.tags,
    notes: partial.notes !== undefined ? partial.notes : current.notes,
    photos: current.photos,
  };

  // Server-side trust boundary — never rely on the client model's pre-validation.
  const validationError = validateRecipePayload(merged);
  if (validationError) return { ok: false, error: validationError.error };

  const normalized = normalizeTags(normalizeServingSizeLabel(merged));

  // Optimistic concurrency: the updated_at captured above guards the
  // read-merge-write window against concurrent edits (same pattern as the
  // web app's updateRecipe action).
  const { error, count } = await client
    .from('recipes')
    .update(normalized, { count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId)
    .eq('updated_at', current.updated_at);

  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: 'Recipe was modified elsewhere — fetch it again and retry.' };
  return { ok: true, data: { id, name: merged.name } };
}

export async function searchRecipesForUser(
  client: SupabaseClient,
  opts: SearchOptions,
): Promise<ServiceResult<RecipeSummary[]>> {
  const limit = Math.min(Math.max(opts.limit ?? SEARCH_DEFAULT_LIMIT, 1), SEARCH_MAX_LIMIT);

  let query = client
    .from('recipes')
    .select('id, name, description, tags, servings, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts.query && opts.query.trim().length > 0) {
    query = query.ilike('name', `%${escapeLike(opts.query.trim())}%`);
  }
  if (opts.tags && opts.tags.length > 0) {
    query = query.contains('tags', sanitizeTags(opts.tags));
  }

  const { data, error } = await query;
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data ?? []) as RecipeSummary[] };
}

export async function getRecipeForUser(
  client: SupabaseClient,
  id: string,
): Promise<ServiceResult<Recipe>> {
  const { data, error } = await client
    .from('recipes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: 'Recipe not found.' };
  return { ok: true, data: data as Recipe };
}
