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
