'use client';

/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <Wayfinder> — the universal 32px-tall sticky header printed at the top of
 * every route. Renders the pit-wall telemetry line that anchors the whole
 * visual identity:
 *
 *   SEKAI · LIST │ 12 RECIPES │ 20:41 │ JC · DARK·MD
 *
 * Slots (left → right, 1px rule between):
 *   1. `crumb`       — app + resource + mode (`SEKAI · REC-042 · DETAIL`)
 *   2. `modeLabel`   — mode-specific state (`STEP 3/7`, `[06] SHOWN`, `DRAFT`)
 *   3. `statusRight` — live status (`T+04:21`, `×2.00 SCALED`) — terracotta when `hot`
 *   4. `userLabel`   — user + theme + font-size (`USR·JC · DARK·MD`)
 *
 * Below the bar (R7 · Team A borrow) sits an optional 24 px "kicker" row
 * exposing the three keyboard shortcuts as a one-line hint:
 *
 *   [HINT · KEYS]  /:SEARCH   F:FILTER   ESC:CLEAR
 *
 * The kicker auto-collapses once the user has used three of the listed
 * shortcuts (tracked per-browser via `useShortcutDiscovery`). When
 * collapsed, a discreet `[?] KEYS` button replaces the row so the hints
 * are still discoverable later.
 *
 * Client component. Reads `data-design` on `<html>` at mount and, if it's
 * anything other than `'brut'`, returns null. Not subscribing to attribute
 * changes yet — a toggle flip forces a router refresh that re-runs the server
 * layout, which remounts us with the new cookie value.
 */

import { useEffect, useState } from 'react';
import { useShortcutDiscovery } from '@/lib/brut/use-shortcut-discovery';

type WayfinderProps = {
  crumb: string;
  modeLabel?: string;
  statusRight?: string;
  userLabel?: string;
  /** Tint the statusRight slot terracotta — used when the app is actively
   *  running (cook mode timer, scaled servings, etc.). */
  hot?: boolean;
  /** Hide the kicker hint row entirely (e.g. cook mode where the surface
   *  has its own keyboard map). Defaults to showing it. */
  hideKicker?: boolean;
};

export function Wayfinder({
  crumb,
  modeLabel,
  statusRight,
  userLabel,
  hot = false,
  hideKicker = false,
}: WayfinderProps) {
  const [mounted, setMounted] = useState(false);
  const [design, setDesign] = useState<string | null>(null);
  const { collapsed, reveal } = useShortcutDiscovery();

  useEffect(() => {
    setMounted(true);
    setDesign(document.documentElement.getAttribute('data-design'));
  }, []);

  // Classic mode OR pre-hydration: render nothing. (During SSR, omitting
  // the bar is safe — the layout allocates no space for it in classic mode.)
  if (!mounted || design !== 'brut') return null;

  return (
    <>
      <nav
        aria-label="wayfinder"
        className="brut-wayfinder"
        data-hot={hot ? '1' : undefined}
      >
        <span className="brut-way-crumb">{crumb}</span>
        {modeLabel ? <span className="brut-way-mode">{modeLabel}</span> : <span />}
        {statusRight ? <span className="brut-way-status">{statusRight}</span> : <span />}
        <span className="brut-way-user">{userLabel ?? ''}</span>
      </nav>
      {!hideKicker &&
        (collapsed ? (
          <div className="brut-kicker brut-kicker--collapsed" aria-hidden="false">
            <button
              type="button"
              className="brut-show-kicker"
              onClick={reveal}
              aria-label="Show keyboard shortcuts"
            >
              [?] KEYS
            </button>
          </div>
        ) : (
          <div className="brut-kicker" role="note" aria-label="keyboard shortcuts">
            <span className="brut-kicker-label">[HINT · KEYS]</span>
            <span className="brut-kicker-keys">/:SEARCH</span>
            <span className="brut-kicker-keys">F:FILTER</span>
            <span className="brut-kicker-keys">ESC:CLEAR</span>
          </div>
        ))}
    </>
  );
}
