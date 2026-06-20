import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Build a Supabase client scoped to a single user by their access token. Because
 * PostgREST receives the user's JWT, RLS (`auth.uid() = user_id`) is enforced —
 * the same security boundary as the web app. The anon key is public by design;
 * the service-role key is intentionally NOT used (it would bypass RLS).
 */
export function buildUserClient(
  url: string,
  anonKey: string,
  accessToken: string,
): SupabaseClient {
  return createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
