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

const THEME_VALUES: ThemeValue[] = ['light', 'dark', 'system'];
const FONT_SIZE_VALUES: FontSizeValue[] = ['sm', 'md', 'lg'];
const LANGUAGE_VALUES: LanguageValue[] = ['en', 'es'];

function isTheme(v: unknown): v is ThemeValue {
  return typeof v === 'string' && (THEME_VALUES as string[]).includes(v);
}
function isFontSize(v: unknown): v is FontSizeValue {
  return typeof v === 'string' && (FONT_SIZE_VALUES as string[]).includes(v);
}
function isLanguage(v: unknown): v is LanguageValue {
  return typeof v === 'string' && (LANGUAGE_VALUES as string[]).includes(v);
}

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
 * correct <html data-theme data-font-size lang> attributes without a flash.
 * Called on login success and on every preference change.
 */
export async function mirrorPrefsToCookies(prefs: Partial<UserPreferences> | null): Promise<void> {
  const cookieStore = await cookies();
  if (isTheme(prefs?.preferred_theme) && prefs.preferred_theme !== 'system') {
    cookieStore.set(PREF_COOKIE_THEME, prefs.preferred_theme, { maxAge: COOKIE_MAX_AGE, sameSite: 'lax', path: '/' });
  } else {
    cookieStore.delete(PREF_COOKIE_THEME);
  }
  if (isFontSize(prefs?.preferred_font_size)) {
    cookieStore.set(PREF_COOKIE_FONT_SIZE, prefs.preferred_font_size, { maxAge: COOKIE_MAX_AGE, sameSite: 'lax', path: '/' });
  } else {
    cookieStore.delete(PREF_COOKIE_FONT_SIZE);
  }
  if (isLanguage(prefs?.preferred_language)) {
    cookieStore.set(PREF_COOKIE_LANGUAGE, prefs.preferred_language, { maxAge: COOKIE_MAX_AGE, sameSite: 'lax', path: '/' });
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

  const upsert: Record<string, unknown> = { user_id: user.id };
  if ('space_name' in patch) upsert.space_name = patch.space_name?.trim() || null;
  if ('preferred_theme' in patch) upsert.preferred_theme = patch.preferred_theme;
  if ('preferred_font_size' in patch) upsert.preferred_font_size = patch.preferred_font_size;
  if ('preferred_language' in patch) upsert.preferred_language = patch.preferred_language;

  const { error } = await supabase
    .from('user_preferences')
    .upsert(upsert, { onConflict: 'user_id' });

  if (error) return { ok: false, error: error.message };

  // Mirror to cookies for SSR on next request.
  const cookieStore = await cookies();
  if ('preferred_theme' in patch) {
    if (patch.preferred_theme && patch.preferred_theme !== 'system') {
      cookieStore.set(PREF_COOKIE_THEME, patch.preferred_theme, { maxAge: COOKIE_MAX_AGE, sameSite: 'lax', path: '/' });
    } else {
      cookieStore.delete(PREF_COOKIE_THEME);
    }
  }
  if ('preferred_font_size' in patch && patch.preferred_font_size) {
    cookieStore.set(PREF_COOKIE_FONT_SIZE, patch.preferred_font_size, { maxAge: COOKIE_MAX_AGE, sameSite: 'lax', path: '/' });
  }
  if ('preferred_language' in patch && patch.preferred_language) {
    cookieStore.set(PREF_COOKIE_LANGUAGE, patch.preferred_language, { maxAge: COOKIE_MAX_AGE, sameSite: 'lax', path: '/' });
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
