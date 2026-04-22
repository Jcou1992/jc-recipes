'use client';
import { useEffect } from 'react';

/**
 * Applies the stored `preferred-font-size` localStorage value to
 * `<html data-font-size="...">` on mount. Renders nothing. Mounted once
 * inside AppProviders so the preference is honoured on every page load,
 * even before the user has visited /settings where FontSizeToggle lives.
 */
export default function FontSizeBootstrap() {
  useEffect(() => {
    try {
      const stored = localStorage.getItem('preferred-font-size');
      if (stored === 'sm' || stored === 'md' || stored === 'lg') {
        document.documentElement.setAttribute('data-font-size', stored);
      }
    } catch {}
  }, []);
  return null;
}
