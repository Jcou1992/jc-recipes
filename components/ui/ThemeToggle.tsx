'use client';

import { useEffect, useState, useTransition } from 'react';
import { updateUserPreferences } from '@/app/actions/preferences';
import { getCurrentEmail, writeThemeForEmail } from '@/lib/preferences-cache';

type Theme = 'light' | 'dark' | 'system';

function applyTheme(t: Theme) {
  const el = document.documentElement;
  if (t === 'system') el.removeAttribute('data-theme');
  else el.setAttribute('data-theme', t);
}

function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'system';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return 'system';
}

export default function ThemeToggle() {
  // Initial state mirrors what the server-rendered <html> attribute says.
  // SSR is now authoritative (root layout reads the cookie-mirrored DB state),
  // so the toggle starts in sync with the actual theme without a flash.
  const [theme, setTheme] = useState<Theme>('system');
  const [, startTransition] = useTransition();

  useEffect(() => {
    setTheme(readInitialTheme());
  }, []);

  function cycle() {
    const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    // 1. Apply to DOM immediately for fast visual feedback.
    setTheme(next);
    applyTheme(next);
    // 2. Cache for the login-page preview on this device (per email).
    const email = getCurrentEmail();
    if (email) writeThemeForEmail(email, next);
    // 3. Persist to DB + refresh cookie via server action (fire-and-forget).
    startTransition(() => {
      void updateUserPreferences({ preferred_theme: next });
    });
  }

  const label = theme === 'system' ? 'SYS' : theme === 'dark' ? 'DRK' : 'LGT';

  return (
    <button
      onClick={cycle}
      className="font-label text-xs tracking-widest uppercase transition-colors min-h-[44px] px-2"
      style={{ color: 'var(--text-3)' }}
      aria-label={`Theme: ${theme}. Click to cycle.`}
    >
      {label}
    </button>
  );
}
