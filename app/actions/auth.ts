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

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Drop the pref cookies so the next visitor on this device starts clean.
  // preferred-language is left alone — it's auth-agnostic and browsers hold it.
  await clearPrefCookies();
  redirect('/login');
}
