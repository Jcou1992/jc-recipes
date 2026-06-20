import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpAgent } from 'agents/mcp';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from './env';
import type { SekaiProps } from './core/props';
import { buildUserClient } from './core/supabase';
import { registerCreateRecipe } from './tools/create-recipe';
import { registerSearchRecipes } from './tools/search-recipes';
import { registerGetRecipe } from './tools/get-recipe';

const REFRESH_SKEW_SECONDS = 60;
const REAUTH_MESSAGE = 'Your SEKAI session expired. Reconnect the connector to continue.';

export class SekaiMcp extends McpAgent<Env, unknown, SekaiProps> {
  server = new McpServer({ name: 'SEKAI Recipes', version: '0.1.0' });

  async init(): Promise<void> {
    registerCreateRecipe(this);
    registerSearchRecipes(this);
    registerGetRecipe(this);
  }

  get appBaseUrl(): string {
    return this.env.APP_BASE_URL;
  }

  requireUserId(): string {
    if (!this.props?.userId) throw new Error(REAUTH_MESSAGE);
    return this.props.userId;
  }

  /**
   * Supabase client acting as the signed-in user (RLS principal). Refreshes the
   * access token when near expiry and persists the rotated refresh token via
   * updateProps so the next call stays valid.
   */
  async authedClient(): Promise<SupabaseClient> {
    const props = this.props;
    if (!props) throw new Error(REAUTH_MESSAGE);

    let accessToken = props.accessToken;
    const nowSec = Math.floor(Date.now() / 1000);

    if (nowSec > props.expiresAt - REFRESH_SKEW_SECONDS) {
      const tmp = createClient(this.env.SUPABASE_URL, this.env.SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await tmp.auth.refreshSession({ refresh_token: props.refreshToken });
      if (error || !data.session) throw new Error(REAUTH_MESSAGE);

      accessToken = data.session.access_token;
      await this.updateProps({
        ...props,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
      });
    }

    return buildUserClient(this.env.SUPABASE_URL, this.env.SUPABASE_ANON_KEY, accessToken);
  }
}
