'use client';

/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <RouteAwareWayfinder> — thin client wrapper around <Wayfinder> that
 *   1. suppresses the global telemetry row on routes that mount their own
 *      per-route Wayfinder (currently `/cook`)
 *   2. tailors the kicker hint payload per route, so the kicker only ever
 *      advertises shortcuts that are actually bound on the current page.
 *
 * Cycle 2 fix: before this rev the kicker showed the list-page set
 * (`/`, `F`, `Esc`) on every route — including `/login`, `/recipes/new`,
 * detail, edit, print and settings — but those keys are only bound on
 * `/recipes`. The system was advertising capabilities it didn't have on 6
 * of 7 routes (Nielsen #1 + #4 + #6 hit). Per-route payloads now match the
 * actually-bound shortcuts:
 *
 *   /login           → hide kicker entirely (no shortcuts, brand surface)
 *   /recipes/print   → hide kicker entirely (paper-output preview)
 *   /recipes (list)  → /:SEARCH F:FILTER ESC:CLEAR N:NEW ?:HELP
 *   /recipes/new     → ESC:CANCEL ?:HELP
 *   /recipes/[id]/edit → ESC:CANCEL ?:HELP
 *   /recipes/[id]    → E:EDIT K:COOK P:PRINT ?:HELP
 *   /settings        → ESC:BACK ?:HELP
 *   /cook            → wayfinder hidden entirely (cook owns its own bar)
 *
 * The check is client-only (`usePathname()` instead of server `headers()`)
 * because the underlying <Wayfinder> is already client-only and gates on
 * `data-design` at mount, so this preserves the existing zero-SSR-output
 * shape: classic mode renders nothing on the server *and* the client; brut
 * non-cook routes render nothing on the server, then the bar on the client;
 * brut + /cook renders nothing on either side.
 */

import { usePathname } from 'next/navigation';
import { Wayfinder } from './Wayfinder';

type Props = React.ComponentProps<typeof Wayfinder>;

// Routes where the global wayfinder must be fully hidden (the route owns
// its own bar, has none at all, or is a brand/paper surface where the
// 32 px telemetry strip would compete with the hero).
//
// Cycle 4: extend from cook-only to also include /login + /recipes/print.
// Previously the kicker was nulled on these routes (cycle 2 fix) but the
// underlying 32 px Wayfinder bar still mounted, leaving a thin telemetry
// strip above the SEKAI splash and the print preview. Suppressing the
// bar entirely closes the cycle-3 P3 #8 caveat (login aesthetic) and
// keeps the print preview pixel-clean for paper output.
const HIDDEN_PATTERNS = [
  /\/cook(\/|$)/,
  /^\/login(\/|$)/,
  /^\/recipes\/print(\/|$)/,
];

// Per-route kicker payloads. Each route declares the shortcuts that are
// actually bound on it. Order matters: longer patterns must come first so
// `/recipes/new` doesn't match `/recipes`.
type KickerRoute = {
  test: (pathname: string) => boolean;
  payload: ReadonlyArray<string> | null;
};

const KICKER_ROUTES: ReadonlyArray<KickerRoute> = [
  // Auth + paper surfaces — no kicker.
  { test: p => p === '/login' || p.startsWith('/login/'), payload: null },
  { test: p => p.startsWith('/recipes/print'), payload: null },

  // Recipe new + edit forms.
  { test: p => p === '/recipes/new' || p.endsWith('/edit'), payload: ['ESC:CANCEL', '?:HELP'] },

  // Recipe detail (catch-all `/recipes/<id>` after new + edit).
  { test: p => /^\/recipes\/[^/]+$/.test(p), payload: ['E:EDIT', 'K:COOK', 'P:PRINT', '?:HELP'] },

  // List page (and the index `/recipes`).
  { test: p => p === '/recipes' || p === '/', payload: ['/:SEARCH', 'F:FILTER', 'ESC:CLEAR', 'N:NEW', '?:HELP'] },

  // Settings.
  { test: p => p === '/settings' || p.startsWith('/settings/'), payload: ['ESC:BACK', '?:HELP'] },
];

function resolveKicker(pathname: string | null): ReadonlyArray<string> | null | undefined {
  if (!pathname) return undefined; // unknown — fall back to Wayfinder default
  for (const r of KICKER_ROUTES) {
    if (r.test(pathname)) return r.payload;
  }
  return undefined; // unknown route → keep default (cheap, harmless)
}

export function RouteAwareWayfinder(props: Props) {
  const pathname = usePathname();
  // `pathname` may be null during certain edge transitions; treat null as
  // "render the global bar" (the safe default for non-cook routes).
  if (pathname && HIDDEN_PATTERNS.some(re => re.test(pathname))) return null;

  const kicker = resolveKicker(pathname ?? null);
  return <Wayfinder {...props} kicker={kicker} />;
}
