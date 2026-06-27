import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client. BYPASSES Row Level Security.
 *
 * `import 'server-only'` makes any accidental import from a Client Component a
 * build error, so the service-role key can never be bundled for the browser.
 * The key is read from SUPABASE_SERVICE_ROLE_KEY (NOT prefixed NEXT_PUBLIC_),
 * so Next.js never inlines it into client output even if this guard regressed.
 *
 * ONLY call this from admin server actions that have already verified the
 * caller is an admin via requireAdmin() (see @/lib/admin-guard). It has no
 * session and no RLS — it is a full-power key.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      'Admin client unavailable: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.',
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
