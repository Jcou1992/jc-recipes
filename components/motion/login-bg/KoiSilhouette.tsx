'use client';

/**
 * KoiSilhouette — sumi-e stroke-only koi fish.
 * Single continuous path for body + tail, one short dorsal fin stroke.
 * No eye, no scales — pure calligraphic silhouette.
 *
 * Animation: horizontal traversal across the full viewport (100vw + 120px margin),
 * duration parametrized, entering from one edge and exiting to the other.
 * Direction can be flipped via `rtl` prop for variety.
 */

import React from 'react';

interface KoiSilhouetteProps {
  /** How wide the fish is in SVG units (scales the whole viewBox width) */
  scale?: number;
  /** Duration in seconds to cross the viewport */
  durationSec?: number;
  /** Animation delay in ms */
  delayMs?: number;
  /** Swim right-to-left instead of left-to-right */
  rtl?: boolean;
  /** Suppress animation entirely (reduced-motion / static ghost) */
  static?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Koi body — single continuous path in a 120×40 viewBox.
// Starts at the nose (left), sweeps through a gentle body arc, fans out at tail.
// Hand-tuned Bézier control points, ~40 control points total.
const KOI_BODY_PATH =
  // Nose tip
  'M 0,20 ' +
  // Upper body arc — rises slightly then levels
  'C 8,14 18,11 30,12 ' +
  'C 42,13 55,15 68,14 ' +
  'C 78,13 88,12 95,10 ' +
  // Upper tail fan — diverges upward
  'C 100,8 106,4 112,2 ' +
  'C 116,0 119,0 120,2 ' +
  // Tail tip to lower fan
  'C 120,4 118,6 115,10 ' +
  'C 111,14 106,16 102,16 ' +
  // Lower tail arc back into body
  'C 98,18 92,22 88,26 ' +
  'C 80,30 68,31 55,30 ' +
  'C 42,29 30,28 18,27 ' +
  // Lower belly back to nose
  'C 10,26 4,24 0,20';

// Dorsal fin — a second short brushstroke suggestion (not connected)
const KOI_DORSAL_PATH =
  'M 35,12 C 42,6 50,4 58,6 C 64,8 68,11 68,14';

export default function KoiSilhouette({
  scale = 1,
  durationSec = 32,
  delayMs = 0,
  rtl = false,
  static: isStatic = false,
  className = '',
  style,
}: KoiSilhouetteProps) {
  // The fish SVG is 120 units wide; we display it at ~80px natural width
  const baseWidth = 80 * scale;
  const baseHeight = 27 * scale;

  // Animation ID must be unique per instance to avoid keyframe collision
  const animId = `koi-swim-${durationSec}-${delayMs}-${rtl ? 'r' : 'l'}`;

  const translateFrom = rtl ? `calc(100vw + ${baseWidth}px)` : `-${baseWidth}px`;
  const translateTo   = rtl ? `-${baseWidth}px`               : `calc(100vw + ${baseWidth}px)`;

  // When static, position mid-screen at the given offset; no animation class applied
  const animClass = isStatic ? '' : `koi-${animId}`;

  return (
    <>
      {!isStatic && (
        <style>{`
          @keyframes ${animId} {
            0%   { transform: translateX(${translateFrom}); }
            100% { transform: translateX(${translateTo}); }
          }
          .koi-${animId} {
            animation: ${animId} ${durationSec}s linear ${delayMs}ms infinite;
            will-change: transform;
          }
        `}</style>
      )}

      <div
        className={`${animClass} ${className}`.trim()}
        style={{
          position: 'absolute',
          width: `${baseWidth}px`,
          height: `${baseHeight}px`,
          transform: rtl ? 'scaleX(-1)' : undefined,
          pointerEvents: 'none',
          ...style,
        }}
        aria-hidden="true"
      >
        <svg
          width={baseWidth}
          height={baseHeight}
          viewBox="0 0 120 40"
          fill="none"
          stroke="var(--color-gold)"
          strokeLinecap="round"
          strokeLinejoin="round"
          overflow="visible"
        >
          {/* Body silhouette */}
          <path d={KOI_BODY_PATH} strokeWidth="1.6" />
          {/* Dorsal fin suggestion */}
          <path d={KOI_DORSAL_PATH} strokeWidth="1.0" strokeOpacity="0.75" />
        </svg>
      </div>
    </>
  );
}
