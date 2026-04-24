'use client';

import { forwardRef, useEffect, useRef, useState } from 'react';

/**
 * Animated noren (Japanese shop-entry curtain) behind the login card. Reads
 * as the moment of stepping through the noren into the kitchen.
 *
 * Defaults to a blank indigo fabric — no text on the curtain. Keeping it
 * silent resists the "big-centered-kanji-on-aesthetic-background" AI-slop
 * trap and lets the login card itself carry the SEKAI wordmark.
 *
 * On Konami trigger (KonamiEasterEgg.tsx), the persisted `sekai-login-bg`
 * flag flips to `ryu` and the 龍 glyph resolves on the curtain during a
 * one-time agitated sway cycle — as if the curtain were disturbed by a
 * gust. Persists in localStorage.
 *
 * Refinements applied from parallel ui-ux-pro-max + impeccable:critique
 * reviews: near-black indigo, top-anchored rotateY perspective, asymmetric
 * keyframe with weighted pause at peak, split panels with stagger, RAF-
 * throttled bounded mouse parallax, touch devices get no parallax, reduced-
 * motion respected, curtain aria-hidden (decorative).
 */

export type BackgroundMode = 'kanji' | 'ryu';

const STORAGE_KEY = 'sekai-login-bg';

const INDIGO = 'oklch(22% 0.08 270)';
const INDIGO_DEEP = 'oklch(18% 0.06 270)';

function readMode(): BackgroundMode {
  if (typeof window === 'undefined') return 'kanji';
  try {
    return localStorage.getItem(STORAGE_KEY) === 'ryu' ? 'ryu' : 'kanji';
  } catch {
    return 'kanji';
  }
}

export default function LoginBackground() {
  const [mode, setMode] = useState<BackgroundMode>('kanji');
  const [agitate, setAgitate] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMode(readMode());

    function onChange() {
      setMode(readMode());
      setAgitate(true);
      setTimeout(() => setAgitate(false), 1800);
    }
    window.addEventListener('sekai-bg-mode-change', onChange);
    return () => window.removeEventListener('sekai-bg-mode-change', onChange);
  }, []);

  // Bounded mouse parallax, pointer-only (no touch). Cap at 6px X / 4px Y
  // opposite cursor. RAF-throttled.
  useEffect(() => {
    const coarse = typeof window !== 'undefined'
      && window.matchMedia('(pointer: coarse)').matches;
    const reduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (coarse || reduced) return;

    let raf = 0;
    let targetX = 0;
    let targetY = 0;

    function apply() {
      raf = 0;
      [leftRef.current, rightRef.current].forEach((el) => {
        if (!el) return;
        el.style.setProperty('--noren-px', `${targetX}px`);
        el.style.setProperty('--noren-py', `${targetY}px`);
      });
    }

    function handle(e: PointerEvent) {
      const w = window.innerWidth || 1;
      const h = window.innerHeight || 1;
      const nx = (e.clientX / w) * 2 - 1;
      const ny = (e.clientY / h) * 2 - 1;
      targetX = -nx * 6;
      targetY = -ny * 4;
      if (!raf) raf = requestAnimationFrame(apply);
    }

    window.addEventListener('pointermove', handle, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handle);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const glyph = mode === 'ryu' ? '龍' : '';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
      data-testid="login-background"
      data-mode={mode}
    >
      <NorenPanel
        ref={leftRef}
        side="left"
        agitate={agitate}
        glyph={glyph}
        indigo={INDIGO}
        indigoDeep={INDIGO_DEEP}
      />
      <NorenPanel
        ref={rightRef}
        side="right"
        agitate={agitate}
        glyph={glyph}
        indigo={INDIGO}
        indigoDeep={INDIGO_DEEP}
      />
    </div>
  );
}

interface PanelProps {
  side: 'left' | 'right';
  agitate: boolean;
  glyph: string;
  indigo: string;
  indigoDeep: string;
}

const NorenPanel = forwardRef<HTMLDivElement, PanelProps>(function NorenPanel(
  { side, agitate, glyph, indigo, indigoDeep },
  ref,
) {
  const leftSide = side === 'left';
  return (
    <div
      className={`absolute top-0 h-[62vh] noren-sway ${leftSide ? 'noren-sway-left' : 'noren-sway-right'}`}
      ref={ref}
      data-agitate={agitate ? 'true' : 'false'}
      data-side={side}
      style={{
        left: leftSide ? '0' : '50%',
        right: leftSide ? '50%' : '0',
        marginLeft: leftSide ? '0' : '2px',
        marginRight: leftSide ? '2px' : '0',
        transformOrigin: 'top center',
        background: `
          linear-gradient(180deg, ${indigoDeep} 0%, ${indigo} 12%, ${indigo} 80%, ${indigoDeep} 100%),
          repeating-linear-gradient(
            90deg,
            rgba(255,255,255,0.012) 0px,
            rgba(255,255,255,0.012) 1px,
            transparent 1px,
            transparent 3px
          ),
          repeating-linear-gradient(
            0deg,
            rgba(0,0,0,0.04) 0px,
            rgba(0,0,0,0.04) 1px,
            transparent 1px,
            transparent 2px
          )
        `,
        boxShadow: leftSide
          ? 'inset -8px 0 16px -8px rgba(0,0,0,0.4)'
          : 'inset 8px 0 16px -8px rgba(0,0,0,0.4)',
        willChange: 'transform',
      }}
    >
      {glyph && (
        <span
          className="font-display"
          style={{
            position: 'absolute',
            top: '34%',
            [leftSide ? 'right' : 'left']: '12%',
            fontSize: 'min(38vmin, 360px)',
            lineHeight: 1,
            fontWeight: 500,
            color: 'var(--color-gold)',
            opacity: 0.14,
            letterSpacing: 0,
            userSelect: 'none',
          }}
        >
          {glyph}
        </span>
      )}
    </div>
  );
});
