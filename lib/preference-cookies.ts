// Cookie name constants shared between client + server code paths.
// Kept in a plain module (not a 'use server' file) so root layout + actions
// can both import the names without Next rejecting the non-async export.

export const PREF_COOKIE_THEME     = 'preferred-theme';
export const PREF_COOKIE_FONT_SIZE = 'preferred-font-size';
export const PREF_COOKIE_LANGUAGE  = 'preferred-language';
export const PREF_COOKIE_UNITS     = 'preferred-units';

export const PREF_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
