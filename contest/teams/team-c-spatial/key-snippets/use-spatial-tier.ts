// lib/spatial/use-spatial-tier.ts
//
// Reactive accessor for the spatial tier. Stable per session.
// Always returns 0 on first SSR render (hydration-safe), upgrades on mount.

'use client';

import { useEffect, useState } from 'react';
import { detectTier, type Tier } from './gpu-tier';

export function useSpatialTier(): Tier {
  // Start at 0 so SSR + first client render match; canvas chunks do not
  // fetch until we upgrade post-hydration.
  const [tier, setTier] = useState<Tier>(0);

  useEffect(() => {
    // Defer to next tick so LCP paint is not blocked by the micro-bench.
    const id = (window.requestIdleCallback ?? window.setTimeout)(() => {
      setTier(detectTier());
    }, { timeout: 500 } as any);
    return () => {
      if ('cancelIdleCallback' in window) {
        (window as any).cancelIdleCallback(id);
      } else {
        clearTimeout(id as unknown as number);
      }
    };
  }, []);

  return tier;
}
