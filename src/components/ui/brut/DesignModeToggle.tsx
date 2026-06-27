'use client';

/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <DesignModeToggle> — segmented [ CLASSIC · BRUT ] control for the settings
 * page. Flips `data-design` on `<html>` optimistically, writes the
 * `design-mode` cookie via server action, then refreshes so the server layout
 * re-runs with the new cookie (keeping SSR + client in sync without a hard
 * reload).
 *
 * Pattern mirrors ThemeToggle.tsx: read initial state from
 * `document.documentElement.getAttribute('data-design')` on mount to stay in
 * lock-step with what the server rendered.
 */

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setDesignMode } from '@/app/actions/design-mode';
import type { DesignMode } from '@/lib/brut/design-mode-cookie';

function readInitialMode(): DesignMode {
  if (typeof document === 'undefined') return 'classic';
  const attr = document.documentElement.getAttribute('data-design');
  return attr === 'brut' ? 'brut' : 'classic';
}

export default function DesignModeToggle() {
  const [mode, setMode] = useState<DesignMode>('classic');
  const [, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setMode(readInitialMode());
  }, []);

  function select(next: DesignMode) {
    if (next === mode) return;
    // 1. Optimistic: flip the root attribute now so the brutalist token layer
    //    kicks in before the server round-trip.
    setMode(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-design', next);
    }
    // 2. Persist cookie + revalidate the layout on the server.
    startTransition(() => {
      void setDesignMode(next).then(() => router.refresh());
    });
  }

  return (
    <div
      className="brut-design-toggle"
      role="group"
      aria-label="Design mode"
      style={{ color: 'var(--text-2)' }}
    >
      <button
        type="button"
        aria-pressed={mode === 'classic'}
        onClick={() => select('classic')}
      >
        <span>CLASSIC</span>
      </button>
      <span className="brut-design-sep" aria-hidden="true" />
      <button
        type="button"
        aria-pressed={mode === 'brut'}
        onClick={() => select('brut')}
      >
        <span>BRUT</span>
      </button>
    </div>
  );
}
