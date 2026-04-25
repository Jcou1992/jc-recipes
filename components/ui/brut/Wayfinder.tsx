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
 * exposing the keyboard shortcuts active on the current route as a one-line
 * hint:
 *
 *   [HINT · KEYS]  /:SEARCH   F:FILTER   ESC:CLEAR
 *
 * The kicker payload is ROUTE-AWARE — different routes advertise different
 * shortcuts because different routes bind different shortcuts. Cycle 2 fix:
 * before this rev the kicker showed the list-page set on every route, lying
 * about which keys were live. Pass `kicker` as an array of `KEY:LABEL` strings
 * (e.g. `["/:SEARCH","F:FILTER","ESC:CLEAR"]`); pass `null` or `[]` to suppress
 * the row entirely (used on /login, /print, etc. — surfaces with no shortcuts).
 *
 * On the LIST route the kicker still auto-collapses once the user has used
 * three of the listed shortcuts (tracked per-browser via `useShortcutDiscovery`).
 * When collapsed, a discreet `[?] KEYS` button replaces the row so the hints
 * are still discoverable later. Other routes with smaller payloads do not
 * collapse (the cost of showing 2-3 keys is much smaller than the loss of
 * discoverability).
 *
 * If `exitHref` is passed the kicker line gains a small `[ESC] ← EXIT` link on
 * the left side. Used by cook mode under brut to restore the EXIT affordance
 * suppressed by the cook local-header CSS kill rule.
 *
 * Client component. Reads `data-design` on `<html>` at mount and, if it's
 * anything other than `'brut'`, returns null. Not subscribing to attribute
 * changes yet — a toggle flip forces a router refresh that re-runs the server
 * layout, which remounts us with the new cookie value.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useShortcutDiscovery } from '@/lib/brut/use-shortcut-discovery';

const DEFAULT_KICKER: ReadonlyArray<string> = ['/:SEARCH', 'F:FILTER', 'ESC:CLEAR'];

type WayfinderProps = {
  crumb: string;
  modeLabel?: string;
  statusRight?: string;
  userLabel?: string;
  /** Tint the statusRight slot terracotta — used when the app is actively
   *  running (cook mode timer, scaled servings, etc.). */
  hot?: boolean;
  /** Hide the kicker hint row entirely (e.g. cook mode where the surface
   *  has its own keyboard map). Defaults to showing it.
   *  @deprecated Use `kicker={null}` instead. Retained for back-compat. */
  hideKicker?: boolean;
  /** Per-route kicker payload. Each entry is a `KEY:LABEL` token rendered
   *  as a single mono span. `null` or `[]` hides the kicker entirely. When
   *  omitted, defaults to the list-page set for back-compat. */
  kicker?: ReadonlyArray<string> | null;
  /** When set, the kicker grows a small `[ESC] ← EXIT` link on the left
   *  pointing at this href. Used by cook mode to restore an EXIT affordance
   *  under brut where the local header is CSS-suppressed. */
  exitHref?: string;
};

export function Wayfinder({
  crumb,
  modeLabel,
  statusRight,
  userLabel,
  hot = false,
  hideKicker = false,
  kicker,
  exitHref,
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

  // Resolve the kicker payload:
  //   - `kicker === undefined` → default (back-compat with cycle 0/1 callers).
  //   - `kicker === null`      → hide.
  //   - `kicker === []`        → hide.
  //   - otherwise              → use the provided list.
  // Plus the legacy `hideKicker` prop forces hide regardless.
  const resolvedKeys: ReadonlyArray<string> | null =
    hideKicker ? null
    : kicker === undefined ? DEFAULT_KICKER
    : kicker === null ? null
    : kicker.length === 0 ? null
    : kicker;

  // The auto-collapse logic only applies to the default (3-key list-page)
  // payload. Smaller per-route payloads stay visible — they're cheap, and
  // hiding them would re-create the cycle 1 discoverability problem.
  const usesAutoCollapse = resolvedKeys === DEFAULT_KICKER;
  const shouldShowExit = !!exitHref && resolvedKeys !== null;

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
      {resolvedKeys !== null &&
        (usesAutoCollapse && collapsed ? (
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
            {shouldShowExit && (
              <Link
                href={exitHref!}
                className="brut-kicker-exit"
                data-testid="brut-kicker-exit"
              >
                [ESC] ← EXIT
              </Link>
            )}
            <span className="brut-kicker-label">[HINT · KEYS]</span>
            {resolvedKeys.map(token => (
              <span key={token} className="brut-kicker-keys">
                {token}
              </span>
            ))}
          </div>
        ))}
    </>
  );
}
