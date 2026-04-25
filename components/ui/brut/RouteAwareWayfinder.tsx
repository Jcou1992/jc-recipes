'use client';

/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <RouteAwareWayfinder> — thin client wrapper around <Wayfinder> that
 * suppresses the global telemetry row on routes that mount their own
 * per-route Wayfinder (currently `/cook`). Without this guard, cook mode
 * would render two stacked 32px headers — a graded-HIGH UX regression.
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

export function RouteAwareWayfinder(props: Props) {
  const pathname = usePathname();
  // `pathname` may be null during certain edge transitions; treat null as
  // "render the global bar" (the safe default for non-cook routes).
  if (pathname && pathname.includes('/cook')) return null;
  return <Wayfinder {...props} />;
}
