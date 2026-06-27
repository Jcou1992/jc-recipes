'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  getUserPreferences,
  mirrorPrefsToCookies,
  clearPrefCookies,
  resetDemoPreferences,
} from './preferences';

type AuthState = { error: string } | null;

// Demo user's inbox runs the tour on every sign-in so friends browsing the
// showcase account always get the guided walkthrough. The env var is optional
// — any email matching falls through to the default landing.
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL?.toLowerCase() ?? 'demo@sakai.app';

export async function login(prevState: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  const isDemo = email.trim().toLowerCase() === DEMO_EMAIL;

  // Demo user always re-runs the onboarding wizard + tour on every sign-in.
  // Reset wipes prefs + clears pref cookies so the next SSR paints defaults.
  if (isDemo) {
    await resetDemoPreferences();
  }

  // Mirror this user's stored preferences into cookies so the root layout's
  // SSR paints correct theme/font-size/lang attributes on the first request.
  // Zero flash, per-user scope (kills the localStorage-bleed bug).
  // mirrorPrefsToCookies is safe here — nulled fields leave cookies unchanged
  // per its existing semantics (see the language-cookie else branch).
  const prefs = await getUserPreferences();
  await mirrorPrefsToCookies(prefs);

  redirect(isDemo ? '/recipes?tour=1' : '/recipes');
}

/**
 * Change the signed-in user's own password. Uses the anon SSR client, so it
 * acts on the current session only — no service role, no admin power. Surfaced
 * in Settings; new users invited by an admin use this to replace their temp
 * password.
 */
export async function changePassword(
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };
  if (newPassword.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function logout() {
  const supabase = await createClient();
  // scope: 'local' invalidates only this device's session. A global sign-out
  // would revoke every session for this user — including Playwright workers
  // and other devices — which is hostile when a small circle of users may be
  // signed in on multiple devices simultaneously.
  await supabase.auth.signOut({ scope: 'local' });
  // Drop the pref cookies so the next visitor on this device starts clean.
  // preferred-language is left alone — it's auth-agnostic and browsers hold it.
  await clearPrefCookies();
  redirect('/login');
}
