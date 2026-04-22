/**
 * Shared e2e helpers.
 *
 * - `signIn(page)` drives the login form (used by auth.spec.ts only).
 *   All other specs should rely on the setup project's stored auth
 *   (see playwright.config.ts `storageState`).
 *
 * - `seedRecipe(...)` creates a recipe via the Supabase JS client using
 *   the test user's credentials. ~30× faster than driving the UI form.
 *
 * - `uniqueName(prefix)` yields a worker-scoped unique string so parallel
 *   workers cannot collide on list queries.
 */
import { expect, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RecipePayload } from '@/types/recipe';

export const TEST_EMAIL    = 'test@jc-recipes.local';
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD ?? 'changeme';

// ── signIn (UI) ───────────────────────────────────────────────────────────────

export async function signIn(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 15_000 });
}

// ── uniqueName ────────────────────────────────────────────────────────────────

export function uniqueName(prefix: string): string {
  const worker = process.env.TEST_WORKER_INDEX ?? '0';
  return `${prefix}-w${worker}-${Date.now()}`;
}

// ── seedRecipe (Supabase API) ─────────────────────────────────────────────────

let cachedClient: SupabaseClient | null = null;

async function getAuthedClient(): Promise<SupabaseClient> {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('seedRecipe: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.');
  }
  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`seedRecipe sign-in failed: ${error.message}`);
  cachedClient = client;
  return client;
}

export interface SeedOptions {
  name: string;
  servings?: number;
  ingredients?: Array<{ amount: number; unit: string | null; name: string }>;
  steps?: Array<{ content: string; timer_seconds?: number | null }>;
  description?: string;
  prep_time?: number;
  cook_time?: number;
  tags?: string[];
  notes?: string;
}

export async function seedRecipe(opts: SeedOptions): Promise<{ id: string; name: string }> {
  const client = await getAuthedClient();
  const { data: { user }, error: userErr } = await client.auth.getUser();
  if (userErr || !user) throw new Error('seedRecipe: no authenticated user');

  const payload: RecipePayload = {
    name: opts.name,
    ingredients: opts.ingredients ?? [{ amount: 1, unit: null, name: 'salt' }],
    steps: (opts.steps ?? [{ content: 'Stir.' }]).map((s, i) => ({
      order: i,
      content: s.content,
      timer_seconds: s.timer_seconds ?? null,
    })),
    servings: opts.servings ?? 1,
    description: opts.description ?? null,
    prep_time: opts.prep_time ?? null,
    cook_time: opts.cook_time ?? null,
    tags: opts.tags ?? null,
    notes: opts.notes ?? null,
    photos: null,
  };

  const { data, error } = await client
    .from('recipes')
    .insert({ ...payload, user_id: user.id })
    .select('id, name')
    .single();

  if (error) throw new Error(`seedRecipe insert failed: ${error.message}`);
  return data as { id: string; name: string };
}

export async function deleteSeededRecipes(namePattern: string): Promise<number> {
  const client = await getAuthedClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return 0;
  const { data, error } = await client
    .from('recipes')
    .delete()
    .eq('user_id', user.id)
    .like('name', namePattern)
    .select('id');
  if (error) return 0;
  return (data ?? []).length;
}
