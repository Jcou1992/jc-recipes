'use client';

import { useEffect, useState, type ReactNode } from 'react';

const SESSION_KEY = 'sekai_wordmark_played';

interface Props {
  children: ReactNode;
  className?: string;
}

// Wraps the SEKAI 世界 wordmark. On the very first mount per browser session
// the inner elements perform a calligraphic left-to-right reveal (clip-path
// wipe). Subsequent mounts in the same session (client navigations, refreshes)
// render the final state instantly. Respects reduced-motion via the global
// CSS gate — the keyframe resolves to final state in that case.
export default function WordmarkStrokeIn({ children, className }: Props) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const played = sessionStorage.getItem(SESSION_KEY);
    if (!played) {
      setAnimate(true);
      sessionStorage.setItem(SESSION_KEY, '1');
    }
  }, []);

  return (
    <span
      data-testid="sekai-wordmark"
      data-wordmark-animated={animate ? 'true' : 'false'}
      className={`${animate ? 'animate-stroke-in' : ''} ${className ?? ''}`.trim()}
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.375rem' }}
    >
      {children}
    </span>
  );
}
