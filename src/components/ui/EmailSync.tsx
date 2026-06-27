'use client';

import { useEffect } from 'react';
import {
  setCurrentEmail,
  migrateLegacyKeys,
  readThemeForEmail,
  readFontSizeForEmail,
  writeThemeForEmail,
  writeFontSizeForEmail,
  writeLanguageForEmail,
  type ThemeValue,
  type FontSizeValue,
  type LanguageValue,
} from '@/lib/preferences-cache';

interface Props {
  email: string;
  theme: ThemeValue | null;          // current user's theme from DB (null = system)
  fontSize: FontSizeValue | null;
  language: LanguageValue | null;
}

/**
 * Mounts once inside (app)/layout. Three jobs:
 *   1. Record the active user's email in localStorage so the ThemeToggle /
 *      FontSizeToggle / LanguageToggle can cache changes per-email.
 *   2. Mirror the server-side DB values into the per-email cache so the
 *      login page preview has accurate data even for users who've never
 *      clicked a toggle on this device (e.g. first visit with DB prefs set
 *      from another device).
 *   3. Run the one-shot migration from pre-refactor localStorage keys.
 *
 * Renders nothing. No layout impact.
 */
export default function EmailSync({ email, theme, fontSize, language }: Props) {
  useEffect(() => {
    setCurrentEmail(email);
    migrateLegacyKeys(email);

    // Seed the per-email cache from DB state if unset, without overwriting
    // fresher values the toggle may have written since the last DB sync.
    if (theme && readThemeForEmail(email) == null) writeThemeForEmail(email, theme);
    if (fontSize && readFontSizeForEmail(email) == null) writeFontSizeForEmail(email, fontSize);
    if (language) writeLanguageForEmail(email, language); // always refresh — language is cookie-authoritative
  }, [email, theme, fontSize, language]);

  return null;
}
