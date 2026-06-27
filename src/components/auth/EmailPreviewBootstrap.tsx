'use client';

import { useEffect, useRef } from 'react';
import {
  readThemeForEmail,
  readFontSizeForEmail,
  readLanguageForEmail,
} from '@/lib/preferences-cache';

/**
 * Login-page only. Watches the email input and, when the user blurs it,
 * previews their cached theme / font-size / language if this browser has
 * seen that email before.
 *
 * Privacy-safe: reads only localStorage. Never asks the server whether an
 * account exists.
 */
export default function EmailPreviewBootstrap() {
  const preview = useRef<{ theme: string | null; fontSize: string | null; lang: string | null }>({
    theme: null,
    fontSize: null,
    lang: null,
  });

  useEffect(() => {
    const emailInput = document.getElementById('email') as HTMLInputElement | null;
    if (!emailInput) return;

    const snapshotInitial = () => {
      const html = document.documentElement;
      preview.current = {
        theme: html.getAttribute('data-theme'),
        fontSize: html.getAttribute('data-font-size'),
        lang: html.getAttribute('lang'),
      };
    };
    snapshotInitial();

    function applyPreview(rawEmail: string) {
      const email = rawEmail.trim().toLowerCase();
      if (!email || !email.includes('@')) {
        restoreInitial();
        return;
      }
      const t = readThemeForEmail(email);
      const f = readFontSizeForEmail(email);
      const l = readLanguageForEmail(email);
      const html = document.documentElement;
      if (t === 'light' || t === 'dark') html.setAttribute('data-theme', t);
      else if (t === 'system') html.removeAttribute('data-theme');
      if (f) html.setAttribute('data-font-size', f);
      if (l) html.setAttribute('lang', l);
    }

    function restoreInitial() {
      const html = document.documentElement;
      const { theme, fontSize, lang } = preview.current;
      if (theme) html.setAttribute('data-theme', theme);
      else html.removeAttribute('data-theme');
      if (fontSize) html.setAttribute('data-font-size', fontSize);
      if (lang) html.setAttribute('lang', lang);
    }

    function onBlur() {
      applyPreview(emailInput.value);
    }

    emailInput.addEventListener('blur', onBlur);
    // Also fire immediately if the field already has a value (browser autofill)
    if (emailInput.value) applyPreview(emailInput.value);

    return () => {
      emailInput.removeEventListener('blur', onBlur);
    };
  }, []);

  return null;
}
