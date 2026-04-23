/**
 * Client-side per-email preference cache.
 *
 * Server-side DB/cookie state is authoritative for authenticated users. This
 * cache exists solely to power the unauthenticated login-page preview: when a
 * returning visitor types their email, we can apply the theme/font-size/lang
 * they previously used on this device — before they submit credentials.
 *
 * Never trusted for authenticated flows. Never consulted on pages inside
 * (app)/* — SSR already sets the correct attrs there.
 *
 * Privacy note: the cache reveals only that "this browser has seen someone
 * type this email before" (the browser's own history). Typing an unknown
 * email silently falls through to system defaults — no account-existence
 * leak, no server round-trip.
 */

export type ThemeValue    = 'light' | 'dark' | 'system';
export type FontSizeValue = 'sm' | 'md' | 'lg';
export type LanguageValue = 'en' | 'es';

const THEME_MAP_KEY     = 'theme-by-email';
const FONTSIZE_MAP_KEY  = 'fontsize-by-email';
const LANGUAGE_MAP_KEY  = 'language-by-email';
const CURRENT_EMAIL_KEY = 'current-email';

// ── Legacy keys (migrated away on first authenticated mount) ────────────────
const LEGACY_THEME    = 'preferred-theme';
const LEGACY_FONTSIZE = 'preferred-font-size';

type EmailMap<V> = Record<string, V>;

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

function safeGet(key: string): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

function safeRemove(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  } catch {
    /* noop */
  }
}

function readMap<V>(key: string): EmailMap<V> {
  const raw = safeGet(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as EmailMap<V>) : {};
  } catch {
    return {};
  }
}

function writeMap<V>(key: string, map: EmailMap<V>): void {
  safeSet(key, JSON.stringify(map));
}

// ── Current email tracking ──────────────────────────────────────────────────
export function getCurrentEmail(): string | null {
  return safeGet(CURRENT_EMAIL_KEY);
}

export function setCurrentEmail(email: string | null): void {
  if (email) safeSet(CURRENT_EMAIL_KEY, normalize(email));
  else safeRemove(CURRENT_EMAIL_KEY);
}

// ── Typed accessors per preference ──────────────────────────────────────────
function isTheme(v: unknown): v is ThemeValue {
  return v === 'light' || v === 'dark' || v === 'system';
}
function isFontSize(v: unknown): v is FontSizeValue {
  return v === 'sm' || v === 'md' || v === 'lg';
}
function isLanguage(v: unknown): v is LanguageValue {
  return v === 'en' || v === 'es';
}

export function readThemeForEmail(email: string): ThemeValue | null {
  const map = readMap<ThemeValue>(THEME_MAP_KEY);
  const v = map[normalize(email)];
  return isTheme(v) ? v : null;
}

export function writeThemeForEmail(email: string, value: ThemeValue): void {
  const map = readMap<ThemeValue>(THEME_MAP_KEY);
  map[normalize(email)] = value;
  writeMap(THEME_MAP_KEY, map);
}

export function readFontSizeForEmail(email: string): FontSizeValue | null {
  const map = readMap<FontSizeValue>(FONTSIZE_MAP_KEY);
  const v = map[normalize(email)];
  return isFontSize(v) ? v : null;
}

export function writeFontSizeForEmail(email: string, value: FontSizeValue): void {
  const map = readMap<FontSizeValue>(FONTSIZE_MAP_KEY);
  map[normalize(email)] = value;
  writeMap(FONTSIZE_MAP_KEY, map);
}

export function readLanguageForEmail(email: string): LanguageValue | null {
  const map = readMap<LanguageValue>(LANGUAGE_MAP_KEY);
  const v = map[normalize(email)];
  return isLanguage(v) ? v : null;
}

export function writeLanguageForEmail(email: string, value: LanguageValue): void {
  const map = readMap<LanguageValue>(LANGUAGE_MAP_KEY);
  map[normalize(email)] = value;
  writeMap(LANGUAGE_MAP_KEY, map);
}

// ── One-shot migration from pre-refactor localStorage keys ──────────────────
/**
 * Old design stored preferences in browser-scoped keys that bled across users.
 * Move any survivors into the current-user's email slot once, then clear them.
 * Safe to call on every authenticated mount — idempotent.
 */
export function migrateLegacyKeys(currentEmail: string | null): void {
  if (!currentEmail) return;
  const email = normalize(currentEmail);

  const legacyTheme = safeGet(LEGACY_THEME);
  if (legacyTheme && isTheme(legacyTheme)) {
    // Only seed if this email has no cached theme yet — don't overwrite a
    // fresher DB-sourced value.
    if (readThemeForEmail(email) == null) {
      writeThemeForEmail(email, legacyTheme);
    }
    safeRemove(LEGACY_THEME);
  }

  const legacyFontSize = safeGet(LEGACY_FONTSIZE);
  if (legacyFontSize && isFontSize(legacyFontSize)) {
    if (readFontSizeForEmail(email) == null) {
      writeFontSizeForEmail(email, legacyFontSize);
    }
    safeRemove(LEGACY_FONTSIZE);
  }
}
