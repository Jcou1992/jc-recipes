'use client';

import { useEffect, useRef } from 'react';

export default function PrintAutoTrigger() {
  const firedRef = useRef(false);

  useEffect(() => {
    // Skip during automated test runs (Playwright/webdriver) to avoid blocking dialogs.
    if (typeof navigator !== 'undefined' && navigator.webdriver) return;
    if (process.env.NODE_ENV === 'test') return;
    if (firedRef.current) return;

    const timer = setTimeout(() => {
      if (firedRef.current) return;
      firedRef.current = true;
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
