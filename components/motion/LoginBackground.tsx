'use client';

import { useEffect, useState } from 'react';

/**
 * Oversized brushwork watermark that sits behind the login card. Two modes:
 *
 *   - 'kanji' (default): renders 世界 — the wordmark itself, blown up.
 *   - 'ryu'   (easter):  renders 龍 — the kanji for dragon. Toggled by the
 *                        Konami sequence (see KonamiEasterEgg.tsx).
 *
 * Both modes reuse the existing clip-path wipe (.animate-stroke-in) so the
 * reveal matches the motion language of the wordmark itself — a brushstroke
 * appearing on the pass, not a schematic SVG trace.
 *
 * The selected mode persists in localStorage so the toggle survives refresh.
 * Mount listens for 'sekai-bg-mode-change' so a Konami trigger in the same
 * session updates the render without a reload.
 */

export type BackgroundMode = 'kanji' | 'ryu';

const STORAGE_KEY = 'sekai-login-bg';
const SESSION_KEY = 'sekai-login-bg-played';

function readMode(): BackgroundMode {
  if (typeof window === 'undefined') return 'kanji';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'ryu') return 'ryu';
  } catch {}
  return 'kanji';
}

export default function LoginBackground() {
  const [mode, setMode] = useState<BackgroundMode>('kanji');
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setMode(readMode());
    try {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        setAnimate(true);
        sessionStorage.setItem(SESSION_KEY, '1');
      }
    } catch {
      setAnimate(true);
    }

    function onChange() {
      setMode(readMode());
      setAnimate(true);
      // Let the new glyph perform one wipe, then settle.
      setTimeout(() => setAnimate(false), 500);
    }
    window.addEventListener('sekai-bg-mode-change', onChange);
    return () => window.removeEventListener('sekai-bg-mode-change', onChange);
  }, []);

  const glyph = mode === 'ryu' ? '龍' : '世界';
  const color = mode === 'ryu' ? 'var(--color-gold)' : 'var(--color-terracotta)';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 flex items-center justify-center overflow-hidden"
      style={{ zIndex: 0 }}
      data-testid="login-background"
      data-mode={mode}
    >
      <span
        className={animate ? 'animate-stroke-in' : ''}
        style={{
          display: 'inline-block',
          // Wrapper for .animate-stroke-in > * selector.
        }}
      >
        <span
          className="font-display"
          style={{
            fontSize: 'min(72vmin, 620px)',
            lineHeight: 1,
            fontWeight: 500,
            color,
            opacity: 0.07,
            letterSpacing: mode === 'ryu' ? '0' : '-0.05em',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {glyph}
        </span>
      </span>
    </div>
  );
}
