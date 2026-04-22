'use client';
import { useEffect } from 'react';

/**
 * Re-applies the user's preferred theme (from localStorage) on every mount.
 * Sibling of FontSizeBootstrap. Necessary because ThemeToggle only mounts
 * inside the avatar-menu dropdown — on a full page reload (or any plain-anchor
 * navigation that retriggers SSR) the html element comes back without a
 * data-theme attribute, so the browser's prefers-color-scheme wins unless the
 * user reopens the avatar dropdown. This bootstrap closes that hole.
 */
export default function ThemeBootstrap() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('preferred-theme');
      const el = document.documentElement;
      if (stored === 'light' || stored === 'dark') {
        el.setAttribute('data-theme', stored);
      } else {
        el.removeAttribute('data-theme');
      }
    } catch {}
  }, []);
  return null;
}
