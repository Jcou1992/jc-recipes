'use client';

/**
 * LoginBackground — "Below the Surface" atmospheric login background.
 *
 * Layer stack (bottom to top):
 *   1. Ink base — pure var(--bg) fill; body grain bleeds through naturally.
 *   2. DragonSilhouette — ambient watermark, sumi-e serpentine coil.
 *      In 'ryu' mode (localStorage 'sekai-login-bg' === 'ryu'):
 *        elevated opacity + one dramatic 30s accelerated pass on mount.
 *   3. KoiSilhouette ×3 — gold-tinted, staggered horizontal swim paths.
 *   4. HeatHazeShader — WebGL UV-distortion overlay (or CSS fallback).
 *
 * Respects:
 *   - prefers-reduced-motion: all animation disabled, single static shader frame
 *   - pointer: coarse (touch devices): shader frozen, one static frame
 *   - Page Visibility API: RAF loop pauses when tab is backgrounded
 *   - sekai-bg-mode-change custom event: listener seeded for future Konami extension
 *   - localStorage 'sekai-login-bg': 'kanji' (default) | 'ryu' (dragon-prominent)
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import DragonSilhouette from './login-bg/DragonSilhouette';
import KoiSilhouette from './login-bg/KoiSilhouette';

// Lazy-load the WebGL shader — it must not execute on the server
const HeatHazeShader = dynamic(
  () => import('./login-bg/HeatHazeShader'),
  { ssr: false }
);

type BgMode = 'kanji' | 'ryu';

/** Read BG mode from localStorage safely (SSR guard) */
function readBgMode(): BgMode {
  if (typeof window === 'undefined') return 'kanji';
  try {
    const v = localStorage.getItem('sekai-login-bg');
    return v === 'ryu' ? 'ryu' : 'kanji';
  } catch {
    return 'kanji';
  }
}

/** Returns true if animations should be frozen (reduced-motion OR coarse pointer) */
function shouldFreezeAnimation(): boolean {
  if (typeof window === 'undefined') return true;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
  return reducedMotion || coarsePointer;
}

// Koi configuration — three fish, staggered y-offsets and timings
// so they never occupy the same region simultaneously.
const KOI_CONFIGS: Array<{
  yPercent: number;   // vertical position as % of container height
  durationSec: number;
  delayMs: number;
  rtl: boolean;
  scale: number;
  opacity: number;
}> = [
  { yPercent: 22, durationSec: 38, delayMs: 0,      rtl: false, scale: 1.0, opacity: 0.07 },
  { yPercent: 55, durationSec: 28, delayMs: 12000,  rtl: true,  scale: 0.8, opacity: 0.05 },
  { yPercent: 74, durationSec: 44, delayMs: 6000,   rtl: false, scale: 1.2, opacity: 0.06 },
];

export default function LoginBackground() {
  const [bgMode, setBgMode]         = useState<BgMode>('kanji');
  const [frozen, setFrozen]         = useState(true); // start frozen until mount check
  const [webglFailed, setWebglFailed] = useState(false);
  const containerRef                = useRef<HTMLDivElement>(null);

  // Mount: resolve mode + motion preferences
  useEffect(() => {
    setBgMode(readBgMode());
    setFrozen(shouldFreezeAnimation());
  }, []);

  // Listen for future Konami-triggered mode toggle
  const handleModeChange = useCallback((e: Event) => {
    const mode = (e as CustomEvent<{ mode: BgMode }>).detail?.mode;
    if (mode === 'ryu' || mode === 'kanji') {
      setBgMode(mode);
      try {
        localStorage.setItem('sekai-login-bg', mode);
      } catch {
        // localStorage unavailable — ignore
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('sekai-bg-mode-change', handleModeChange);
    return () => window.removeEventListener('sekai-bg-mode-change', handleModeChange);
  }, [handleModeChange]);

  const prominent = bgMode === 'ryu';

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        // Ink base
        background: 'var(--bg)',
        // CSS fallback when WebGL unavailable — soft blur on children
        ...(webglFailed
          ? { filter: 'blur(0.5px)', opacity: 0.95 }
          : {}),
      }}
    >
      {/* Layer 2: Dragon watermark */}
      <DragonSilhouette
        prominent={prominent}
        style={{
          // Dragon spans roughly 85% viewport width, centered vertically
          top: '10%',
          left: '5%',
          width: '90%',
          height: '80%',
        }}
      />

      {/* Layer 3: Koi school */}
      {!frozen &&
        KOI_CONFIGS.map((cfg, i) => (
          <KoiSilhouette
            key={i}
            durationSec={cfg.durationSec}
            delayMs={cfg.delayMs}
            rtl={cfg.rtl}
            scale={cfg.scale}
            style={{
              top: `${cfg.yPercent}%`,
              opacity: cfg.opacity,
              left: 0,
            }}
          />
        ))}

      {/* Reduced-motion static koi (no animation, just a single ghost) */}
      {frozen && (
        <KoiSilhouette
          static
          scale={1.1}
          style={{
            top: '50%',
            left: '30%',
            opacity: 0.04,
          }}
        />
      )}

      {/* Layer 4: Heat-haze WebGL shader */}
      <HeatHazeShader
        sourceCanvas={null}
        intensity={prominent ? 1.6 : 1.0}
        frozen={frozen}
        onFallback={() => setWebglFailed(true)}
      />
    </div>
  );
}
