import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

/**
 * Admin authorization lives in the user's JWT `app_metadata.role`. app_metadata
 * is writable ONLY via the service-role key (see scripts/seed-users.mjs and the
 * admin actions), so a user can never self-promote by editing client state.
 */
export function isAdmin(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === 'admin';
}

/**
 * Gate for every admin surface. Returns the authenticated admin user or
 * redirects: unauthenticated → /login, non-admin → /recipes.
 *
 * Call this at the START of every admin server action — the layout guard alone
 * is not enough, because server actions are independently invocable endpoints.
 */
export async function requireAdmin(): Promise<User> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  if (!isAdmin(user)) redirect('/recipes');
  return user;
}
