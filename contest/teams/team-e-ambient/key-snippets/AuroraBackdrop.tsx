'use client';

import { useEffect, useRef } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SEKAI 世界 — AuroraBackdrop
//
// The fixed, below-everything ambient layer. Three stacked divs:
//   1. horizon  — vertical gradient from --atmosphere-horizon → --bg
//   2. blobs    — two radial gradients, blurred 70px, drifting ±8% on 60s loop
//   3. conic    — a single conic accent ("low sun") shown only on login/detail
//
// All pure CSS. No canvas, no WebGL. Hook-free motion via @property + CSS
// animation. Idle since mount — nothing runs in React land.
//
// The conic accent is gated by data-surface on <html>, set by a thin effect
// here that mirrors the current route's pathname into a DOM attribute. A
// `data-aurora-intensity` attribute lets callers dim the layer in cook mode.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  /** Dim the whole layer (cook mode sets 0.4). Default 1. */
  intensity?: number;
  /** Override the surface autodetect (test hook). */
  surface?: 'login' | 'list' | 'detail' | 'cook' | 'settings';
};

export function AuroraBackdrop({ intensity = 1, surface }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    if (surface) {
      html.setAttribute('data-surface', surface);
      return () => html.removeAttribute('data-surface');
    }
    // Autodetect: map /recipes/[id] to "detail", /cook to "cook", etc.
    const path = window.location.pathname;
    let detected: string = 'list';
    if (path === '/' || path.startsWith('/login')) detected = 'login';
    else if (path.endsWith('/cook')) detected = 'cook';
    else if (/^\/recipes\/[^/]+$/.test(path)) detected = 'detail';
    else if (path.startsWith('/settings')) detected = 'settings';
    html.setAttribute('data-surface', detected);
  }, [surface]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="aurora-backdrop"
      style={{ opacity: intensity }}
    >
      <div className="aurora-horizon" />
      <div className="aurora-blobs" />
      <div className="aurora-conic" />

      {/*
        Styles live in app/aurora.css alongside the keyframes. Inline here
        only to make this snippet legible standalone; the ship version
        imports from the CSS file.
      */}
      <style jsx>{`
        .aurora-backdrop {
          position: fixed;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          overflow: hidden;
          transition: opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .aurora-horizon {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            var(--atmosphere-horizon) 0%,
            var(--bg) 55%,
            var(--bg) 100%
          );
          transition: background 2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .aurora-blobs {
          position: absolute;
          inset: -10%;
          --drift-x: 0%;
          --drift-y: 0%;
          background:
            radial-gradient(
              65vw 65vw at calc(18% + var(--drift-x)) calc(22% + var(--drift-y)),
              color-mix(in oklch, var(--atmosphere-key) 60%, transparent),
              transparent 55%
            ),
            radial-gradient(
              55vw 55vw at calc(82% - var(--drift-x)) calc(72% - var(--drift-y)),
              color-mix(in oklch, var(--atmosphere-rim) 50%, transparent),
              transparent 55%
            );
          filter: blur(70px);
          opacity: 0.72;
          mix-blend-mode: screen;
          animation: aurora-drift var(--motion-ambient-xl) var(--ease-drift) infinite alternate;
          transition: background 2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .aurora-conic {
          position: absolute;
          left: 50%;
          bottom: -30%;
          width: 140vw;
          height: 100vh;
          transform: translateX(-50%);
          background: conic-gradient(
            from 225deg at 50% 100%,
            transparent 0deg,
            color-mix(in oklch, var(--atmosphere-key) 40%, transparent) 80deg,
            color-mix(in oklch, var(--atmosphere-rim) 35%, transparent) 140deg,
            transparent 200deg
          );
          filter: blur(80px);
          opacity: 0;
          mix-blend-mode: screen;
          transition: opacity 1.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        :global(html[data-surface='login']) .aurora-conic,
        :global(html[data-surface='detail']) .aurora-conic {
          opacity: 0.55;
        }
        :global(html[data-surface='cook']) .aurora-blobs {
          opacity: 0.4;
        }
        @media (prefers-reduced-motion: reduce) {
          .aurora-blobs { animation: none; --drift-x: 0%; --drift-y: 0%; }
        }
      `}</style>
    </div>
  );
}
