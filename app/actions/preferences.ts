'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { UserPreferences } from '@/types/preferences';
import {
  PREF_COOKIE_THEME,
  PREF_COOKIE_FONT_SIZE,
  PREF_COOKIE_LANGUAGE,
  PREF_COOKIE_UNITS,
  PREF_COOKIE_MAX_AGE as COOKIE_MAX_AGE,
} from '@/lib/preference-cookies';

type ThemeValue    = 'light' | 'dark' | 'system';
type FontSizeValue = 'sm' | 'md' | 'lg';
type LanguageValue = 'en' | 'es';
type UnitsValue    = 'metric' | 'imperial';

const THEME_VALUES: ThemeValue[] = ['light', 'dark', 'system'];
const FONT_SIZE_VALUES: FontSizeValue[] = ['sm', 'md', 'lg'];
const LANGUAGE_VALUES: LanguageValue[] = ['en', 'es'];
const UNITS_VALUES: UnitsValue[] = ['metric', 'imperial'];

// Must mirror DEMO_EMAIL in app/actions/auth.ts. Kept as a local constant
// rather than re-exported because 'use server' files cannot export non-async
// symbols.
const DEMO_EMAIL = process.env.DEMO_USER_EMAIL?.toLowerCase() ?? 'demo@sakai.app';

function isTheme(v: unknown): v is ThemeValue {
  return typeof v === 'string' && (THEME_VALUES as string[]).includes(v);
}
function isFontSize(v: unknown): v is FontSizeValue {
  return typeof v === 'string' && (FONT_SIZE_VALUES as string[]).includes(v);
}
function isLanguage(v: unknown): v is LanguageValue {
  return typeof v === 'string' && (LANGUAGE_VALUES as string[]).includes(v);
}
function isUnits(v: unknown): v is UnitsValue {
  return typeof v === 'string' && (UNITS_VALUES as string[]).includes(v);
}

// Shared cookie options: long-lived, lax same-site (needed so auth-redirect
// flows still carry the cookie), secure so production only ships over TLS,
// path root so every route sees it.
const COOKIE_OPTS = {
  maxAge: COOKIE_MAX_AGE,
  sameSite: 'lax',
  secure: true,
  path: '/',
} as const;

// ── Read ────────────────────────────────────────────────────────────────────
export async function getUserPreferences(): Promise<Partial<UserPreferences> | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return data;
}

/**
 * Mirror a user's preferences into cookies so the root layout can SSR the
 * correct <html data-theme data-font-size lang data-units> attributes without
 * a flash. Called on login success and on every preference change.
 */
export async function mirrorPrefsToCookies(prefs: Partial<UserPreferences> | null): Promise<void> {
  const cookieStore = await cookies();
  if (isTheme(prefs?.preferred_theme) && prefs.preferred_theme !== 'system') {
    cookieStore.set(PREF_COOKIE_THEME, prefs.preferred_theme, COOKIE_OPTS);
  } else {
    cookieStore.delete(PREF_COOKIE_THEME);
  }
  if (isFontSize(prefs?.preferred_font_size)) {
    cookieStore.set(PREF_COOKIE_FONT_SIZE, prefs.preferred_font_size, COOKIE_OPTS);
  } else {
    cookieStore.delete(PREF_COOKIE_FONT_SIZE);
  }
  if (isUnits(prefs?.preferred_units)) {
    cookieStore.set(PREF_COOKIE_UNITS, prefs.preferred_units, COOKIE_OPTS);
  } else {
    cookieStore.delete(PREF_COOKIE_UNITS);
  }
  if (isLanguage(prefs?.preferred_language)) {
    cookieStore.set(PREF_COOKIE_LANGUAGE, prefs.preferred_language, COOKIE_OPTS);
  } else {
    // Language has an existing cookie-only path — leave it alone if the DB
    // has no value yet. Only overwrite when DB is authoritative.
  }
}

export async function clearPrefCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PREF_COOKIE_THEME);
  cookieStore.delete(PREF_COOKIE_FONT_SIZE);
  cookieStore.delete(PREF_COOKIE_UNITS);
  // preferred-language cookie stays — auth-agnostic visitors benefit from it
}

// Used by replay/reset flows that want a completely clean slate, including
// the language cookie. Distinct from clearPrefCookies() which preserves
// language on logout for next visitor on the same device.
export async function clearAllPrefCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PREF_COOKIE_THEME);
  cookieStore.delete(PREF_COOKIE_FONT_SIZE);
  cookieStore.delete(PREF_COOKIE_UNITS);
  cookieStore.delete(PREF_COOKIE_LANGUAGE);
}

// ── Write ───────────────────────────────────────────────────────────────────
interface UpdateInput {
  space_name?:          string | null;
  preferred_theme?:     ThemeValue | null;
  preferred_font_size?: FontSizeValue | null;
  preferred_language?:  LanguageValue | null;
  preferred_units?:     UnitsValue | null;
}

export async function updateUserPreferences(
  patch: UpdateInput,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  // Validate each field
  if (patch.space_name != null && patch.space_name.length > 30) {
    return { ok: false, error: 'Space name must be 30 characters or fewer' };
  }
  if (patch.preferred_theme != null && !isTheme(patch.preferred_theme)) {
    return { ok: false, error: 'Invalid theme value' };
  }
  if (patch.preferred_font_size != null && !isFontSize(patch.preferred_font_size)) {
    return { ok: false, error: 'Invalid font-size value' };
  }
  if (patch.preferred_language != null && !isLanguage(patch.preferred_language)) {
    return { ok: false, error: 'Invalid language value' };
  }
  if (patch.preferred_units != null && !isUnits(patch.preferred_units)) {
    return { ok: false, error: 'Invalid units value' };
  }

  const upsert: Record<string, unknown> = { user_id: user.id };
  if ('space_name' in patch) upsert.space_name = patch.space_name?.trim() || null;
  if ('preferred_theme' in patch) upsert.preferred_theme = patch.preferred_theme;
  if ('preferred_font_size' in patch) upsert.preferred_font_size = patch.preferred_font_size;
  if ('preferred_language' in patch) upsert.preferred_language = patch.preferred_language;
  if ('preferred_units' in patch) upsert.preferred_units = patch.preferred_units;

  const { error } = await supabase
    .from('user_preferences')
    .upsert(upsert, { onConflict: 'user_id' });

  if (error) return { ok: false, error: error.message };

  // Mirror to cookies for SSR on next request.
  const cookieStore = await cookies();
  if ('preferred_theme' in patch) {
    if (patch.preferred_theme && patch.preferred_theme !== 'system') {
      cookieStore.set(PREF_COOKIE_THEME, patch.preferred_theme, COOKIE_OPTS);
    } else {
      cookieStore.delete(PREF_COOKIE_THEME);
    }
  }
  if ('preferred_font_size' in patch && patch.preferred_font_size) {
    cookieStore.set(PREF_COOKIE_FONT_SIZE, patch.preferred_font_size, COOKIE_OPTS);
  }
  if ('preferred_language' in patch && patch.preferred_language) {
    cookieStore.set(PREF_COOKIE_LANGUAGE, patch.preferred_language, COOKIE_OPTS);
  }
  if ('preferred_units' in patch && patch.preferred_units) {
    cookieStore.set(PREF_COOKIE_UNITS, patch.preferred_units, COOKIE_OPTS);
  }

  revalidatePath('/', 'layout');
  return { ok: true };
}

export async function markTourCompleted(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: user.id, tour_completed_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  return { ok: !error };
}

/**
 * Reset the demo account's preferences back to null so the tour + wizard
 * re-fire on every demo@ login. Guarded to the demo user only — any other
 * caller gets a forbidden result and no writes.
 */
export async function resetDemoPreferences(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };
  if ((user.email ?? '').toLowerCase() !== DEMO_EMAIL) {
    return { ok: false, error: 'Forbidden' };
  }

  const { error } = await supabase
    .from('user_preferences')
    .update({
      preferred_theme: null,
      preferred_font_size: null,
      preferred_language: null,
      preferred_units: null,
      tour_completed_at: null,
    })
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };
  await clearAllPrefCookies();
  return { ok: true };
}

/**
 * User-initiated "Replay onboarding" from settings. Same shape as the demo
 * reset but scoped to whoever is calling — unguarded beyond the session
 * check because resetting one's own prefs is harmless.
 */
export async function replayOnboarding(): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase
    .from('user_preferences')
    .update({
      preferred_theme: null,
      preferred_font_size: null,
      preferred_language: null,
      preferred_units: null,
      tour_completed_at: null,
    })
    .eq('user_id', user.id);

  if (error) return { ok: false, error: error.message };
  await clearAllPrefCookies();
  return { ok: true };
}

export async function dismissTour(days: number): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const until = new Date();
  until.setDate(until.getDate() + days);
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: user.id, tour_dismissed_until: until.toISOString() },
      { onConflict: 'user_id' },
    );
  return { ok: !error };
}
