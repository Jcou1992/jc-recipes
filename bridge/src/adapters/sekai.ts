import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildUserClient } from '../../../mcp/src/core/supabase';
import { createRecipeForUser } from '../../../mcp/src/core/recipe-service';
import type { RecipePayload } from '../../../src/types/recipe';
import type { CaptureRecipe, CaptureOptions } from '../schema';
import type { DestinationResult, SekaiAdapter } from '../orchestrator';

/**
 * Headless SEKAI adapter. The real MCP worker fronts these same core ops behind
 * interactive OAuth (built for AI clients, not servers) — so the bridge goes one
 * layer down and reuses mcp/src/core directly with a user-scoped Supabase
 * session (signInWithPassword as JC). Identical RLS boundary, identical
 * validation (`createRecipeForUser`), zero simulation.
 *
 * Duplicate semantics ported 1:1 from the package's sekaiMcp.js:
 * - fingerprint marker `[tanebi-capture-fingerprint:...]` persisted in notes
 * - name versioning as `name · vN`
 * - create() re-checks the fingerprint to guard double-submit races
 */

export interface SekaiEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SEKAI_EMAIL: string;
  SEKAI_PASSWORD: string;
  APP_BASE_URL: string;
}

const MARKER = (fp: string) => `[tanebi-capture-fingerprint:${fp}]`;

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (m) => `\\${m}`);
}

interface Session {
  client: SupabaseClient;
  userId: string;
  expiresAt: number; // epoch seconds
}

export class SupabaseSekaiAdapter implements SekaiAdapter {
  private env: SekaiEnv;
  private session: Session | null = null;

  constructor(env: SekaiEnv) {
    this.env = env;
  }

  private async signedIn(): Promise<Session> {
    const now = Math.floor(Date.now() / 1000);
    if (this.session && this.session.expiresAt - 60 > now) return this.session;

    const authClient = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await authClient.auth.signInWithPassword({
      email: this.env.SEKAI_EMAIL,
      password: this.env.SEKAI_PASSWORD,
    });
    if (error || !data.session || !data.user) {
      throw new Error(`SEKAI sign-in failed: ${error?.message ?? 'no session returned'}`);
    }
    this.session = {
      client: buildUserClient(this.env.SUPABASE_URL, this.env.SUPABASE_ANON_KEY, data.session.access_token),
      userId: data.user.id,
      expiresAt: data.session.expires_at ?? now + 3000,
    };
    return this.session;
  }

  private recipeUrl(id: string): string {
    return `${this.env.APP_BASE_URL}/recipes/${id}`;
  }

  async findByFingerprint(_name: string, fingerprint: string): Promise<DestinationResult | null> {
    const { client } = await this.signedIn();
    // Direct marker search — stronger than the package's name-scoped N+1 walk,
    // same contract: any recipe carrying the marker is THE recipe.
    const { data, error } = await client
      .from('recipes')
      .select('id, name')
      .like('notes', `%${MARKER(fingerprint)}%`)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`SEKAI fingerprint lookup failed: ${error.message}`);
    if (!data) return null;
    return { status: 'reused', id: data.id, name: data.name, url: this.recipeUrl(data.id), error: null };
  }

  async resolveFinalName(requestedName: string, policy: CaptureOptions['duplicatePolicy']): Promise<string> {
    const { client } = await this.signedIn();
    const { data, error } = await client
      .from('recipes')
      .select('name')
      .ilike('name', `${escapeLike(requestedName)}%`)
      .limit(50);
    if (error) throw new Error(`SEKAI name lookup failed: ${error.message}`);

    const names = (data ?? []).map((row) => String(row.name));
    const exact = names.some((name) => name.toLowerCase() === requestedName.toLowerCase());
    if (!exact) return requestedName;
    if (policy === 'reuse') return requestedName;
    if (policy === 'error') {
      throw new Error(`A different SEKAI recipe already uses the name: ${requestedName}`);
    }
    let version = 2;
    while (names.some((name) => name.toLowerCase() === `${requestedName} · v${version}`.toLowerCase())) {
      version += 1;
    }
    return `${requestedName} · v${version}`;
  }

  async create(args: { recipe: CaptureRecipe; fingerprint: string; finalName: string }): Promise<DestinationResult> {
    const { recipe, fingerprint, finalName } = args;

    // Double-submit race guard, same as the package adapter.
    const existing = await this.findByFingerprint(recipe.name, fingerprint);
    if (existing) return existing;

    const notes = [recipe.notes, MARKER(fingerprint)].filter(Boolean).join('\n\n');
    const payload: RecipePayload = {
      name: finalName,
      servings: recipe.servings,
      ingredients: recipe.ingredients.map((i) => ({ amount: i.amount, unit: i.unit, name: i.name })),
      steps: recipe.steps.map((s) => ({ order: s.order, content: s.content, timer_seconds: s.timer_seconds })),
      description: recipe.description,
      prep_time: recipe.prep_time,
      cook_time: recipe.cook_time,
      serving_size_label: recipe.serving_size_label,
      tags: recipe.tags && recipe.tags.length > 0 ? recipe.tags : null,
      notes,
      photos: null,
    };

    const { client, userId } = await this.signedIn();
    const result = await createRecipeForUser(client, payload, userId);
    if (!result.ok) throw new Error(`SEKAI create failed: ${result.error}`);

    return {
      status: 'created',
      id: result.data.id,
      name: finalName,
      url: this.recipeUrl(result.data.id),
      error: null,
    };
  }
}
