'use client';

import { useEffect, useState } from 'react';
import SeasonalKanji from './SeasonalKanji';

const SESSION_KEY = 'sekai_wordmark_played';

interface Props {
  className?: string;
}

// Wraps the SEKAI 世界 wordmark. On the very first mount per browser session
// the roman "SEKAI" performs a calligraphic left-to-right clip-path wipe
// while the 世界 kanji strokes in one path at a time in stroke order
// (calligraphy). Subsequent mounts in the same session (client navigations,
// refreshes) render the final state instantly. Respects reduced-motion via
// the global CSS gate — both animations resolve to final state there.
export default function WordmarkStrokeIn({ className }: Props) {
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
      <span
        className="font-label text-lg font-bold tracking-widest uppercase"
        style={{ color: 'var(--color-terracotta)' }}
      >
        SEKAI
      </span>
      <SeasonalKanji animate={animate} />
    </span>
  );
}
