'use client';

/**
 * SEKAI · BRUTALIST-RAW-LUXE shortcut-discovery hook.
 *
 * Drives the brut wayfinder kicker hint row:
 *
 *   [HINT · KEYS]  /:SEARCH   F:FILTER   ESC:CLEAR
 *
 * Counts how many times the user actually exercises the three shortcuts
 * (`/`, `f`, `Escape`) inside the brut surface and persists the count to
 * `localStorage` under the key `brut.shortcut.uses`. Once the counter
 * crosses the threshold (3), the kicker auto-collapses; a small `[?] KEYS`
 * button can re-show it on demand.
 *
 * Important: this hook ONLY counts. The actual shortcut behavior already
 * lives in `RecipeListClient` via `useKeyboardShortcut`; we listen passively
 * (capture phase) so we register a use even when the focus target is an
 * input and the existing handler bails. If the user has dismissed the
 * kicker once we stop listening — no need to keep counting forever.
 *
 * SSR-safe: every `localStorage` / `window` access is gated on
 * `typeof window !== 'undefined'`. The default state matches the server
 * render (`uses: 0`, `dismissed: false`) and is reconciled in `useEffect`.
 */

import { useCallback, useEffect, useState } from 'react';

export const SHORTCUT_USES_KEY = 'brut.shortcut.uses';
export const SHORTCUT_DISMISSED_KEY = 'brut.shortcut.dismissed';
export const SHORTCUT_THRESHOLD = 3;

export const TRACKED_KEYS: ReadonlySet<string> = new Set(['/', 'f', 'F', 'Escape']);

/** Pure: should this keypress increment the discovery counter? */
export function isTrackedKey(key: string): boolean {
  return TRACKED_KEYS.has(key);
}

/** Read the persisted counter. Exported for tests + the optional non-hook
 *  callers that just want to peek. SSR-safe (returns fallback on server). */
export function readUseCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(SHORTCUT_USES_KEY);
    if (raw === null) return 0;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

/** Persist a new counter value. SSR-safe (no-op on server). */
export function writeUseCount(value: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SHORTCUT_USES_KEY, String(value));
  } catch {
    /* quota / private mode — silently ignore; counter degrades to in-memory */
  }
}

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SHORTCUT_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

function writeDismissed(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SHORTCUT_DISMISSED_KEY, value ? '1' : '0');
  } catch {
    /* see above */
  }
}

/** Pure threshold check exported for tests. */
export function isCollapsed(uses: number, dismissed: boolean): boolean {
  return dismissed || uses >= SHORTCUT_THRESHOLD;
}

export type ShortcutDiscovery = {
  /** Count of distinct shortcut presses observed this browser. */
  uses: number;
  /** True once the user manually hid the kicker after seeing it. */
  dismissed: boolean;
  /** Convenience: `dismissed || uses >= 3`. */
  collapsed: boolean;
  /** Manually hide the row (used by an inline dismiss control if added). */
  dismiss: () => void;
  /** Re-show the row from the `[?] KEYS` button — also resets the counter
   *  so the user gets a fresh discovery pass. */
  reveal: () => void;
};

export function useShortcutDiscovery(): ShortcutDiscovery {
  const [uses, setUses] = useState<number>(0);
  const [dismissed, setDismissed] = useState<boolean>(false);

  // Reconcile from localStorage on mount (SSR renders 0/false to match).
  useEffect(() => {
    setUses(readUseCount());
    setDismissed(readDismissed());
  }, []);

  // Listen passively for the three tracked keys. Capture phase so we still
  // register a press when an input has focus (the existing app shortcuts
  // bail in that case, but discovery should still count an attempt).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isCollapsed(uses, dismissed)) return; // stop listening once collapsed

    function onKeyDown(e: KeyboardEvent) {
      if (!isTrackedKey(e.key)) return;
      setUses(prev => {
        const next = prev + 1;
        writeUseCount(next);
        return next;
      });
    }
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [uses, dismissed]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    writeDismissed(true);
  }, []);

  const reveal = useCallback(() => {
    setDismissed(false);
    setUses(0);
    writeDismissed(false);
    writeUseCount(0);
  }, []);

  return {
    uses,
    dismissed,
    collapsed: isCollapsed(uses, dismissed),
    dismiss,
    reveal,
  };
}
