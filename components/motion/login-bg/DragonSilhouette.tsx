'use client';

/**
 * DragonSilhouette — sumi-e single-stroke serpentine coil, stroke-only.
 * Inspired by Hokusai dragon brush studies: fat tail tapering to a fine head,
 * flowing S-curve across the viewport, single whisker suggestion at the apex.
 *
 * Props:
 *   prominent — if true, elevates opacity and triggers one dramatic accelerated
 *               drift pass (ryu mode from localStorage 'sekai-login-bg').
 */

import React from 'react';

interface DragonSilhouetteProps {
  prominent?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// Single continuous cubic-bezier path tracing a diagonal S-curve body.
// Dimensions: 1200×600 viewBox; placed to span the viewport at full-width.
// Control points hand-tuned: stroke starts thick at tail (bottom-left),
// tapers through the serpentine coil to a narrow head (upper-right) with
// a single whisker stroke.
const DRAGON_BODY_PATH =
  // Tail base — fat curved sweep from bottom-left
  'M 20,560 ' +
  // First coil — large arc upward and right
  'C 60,520 120,480 180,440 ' +
  'C 240,400 260,340 300,300 ' +
  // Mid-body S-inflection
  'C 340,260 420,280 480,250 ' +
  'C 540,220 560,160 620,130 ' +
  // Upper coil — narrowing
  'C 680,100 760,120 820,100 ' +
  'C 880,80 900,40 960,30 ' +
  // Head suggestion — tapers to fine stroke
  'C 1000,22 1040,18 1080,12';

// Single whisker from the head — a short diverging stroke
const DRAGON_WHISKER_PATH =
  'M 1080,12 C 1100,0 1120,-8 1140,-4';

// Tail flare — a second broader flourish from the tail base
const DRAGON_TAIL_PATH =
  'M 20,560 C 30,590 50,600 70,590 C 90,580 100,570 80,555';

export default function DragonSilhouette({
  prominent = false,
  className = '',
  style,
}: DragonSilhouetteProps) {
  return (
    <>
      <style>{`
        @keyframes dragon-drift {
          0%   { transform: translate(0px, 0px) scale(1); }
          25%  { transform: translate(6px, -4px) scale(1.003); }
          50%  { transform: translate(10px, -8px) scale(1.005); }
          75%  { transform: translate(4px, -3px) scale(1.002); }
          100% { transform: translate(0px, 0px) scale(1); }
        }

        @keyframes dragon-prominent-pass {
          0%   { transform: translate(0px, 0px) scale(1);      opacity: 0.07; }
          10%  { transform: translate(-12px, 8px) scale(1.01); opacity: 0.12; }
          50%  { transform: translate(18px, -14px) scale(1.015); opacity: 0.12; }
          90%  { transform: translate(-8px, 6px) scale(1.005); opacity: 0.07; }
          100% { transform: translate(0px, 0px) scale(1);      opacity: 0.07; }
        }

        .dragon-ambient {
          --dragon-base-opacity: ${prominent ? '0.07' : '0.03'};
          --dragon-peak-opacity: ${prominent ? '0.12' : '0.05'};
          opacity: var(--dragon-base-opacity);
          animation: dragon-drift ${prominent ? '120s' : '240s'} ease-in-out infinite;
          transform-origin: 600px 300px;
          will-change: transform;
        }

        .dragon-prominent-overlay {
          opacity: 0;
          animation: dragon-prominent-pass 30s ease-in-out 0.5s 1 forwards;
          transform-origin: 600px 300px;
          pointer-events: none;
        }
      `}</style>

      {/* Ambient drift layer */}
      <svg
        className={`dragon-ambient ${className}`}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
          pointerEvents: 'none',
          ...style,
        }}
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <g
          stroke="color-mix(in oklch, var(--color-terracotta) 45%, var(--text-1))"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Body — stroke-width tapers from 5 at tail to 1.5 at head
              Achieved via two overlapping paths with different widths */}
          <path d={DRAGON_BODY_PATH} strokeWidth="4" strokeOpacity="0.9" />
          {/* Head portion fine taper — same path, thinner, overlaid */}
          <path
            d={
              'M 820,100 C 880,80 900,40 960,30 C 1000,22 1040,18 1080,12'
            }
            strokeWidth="1.8"
            strokeOpacity="1"
          />
          {/* Whisker */}
          <path d={DRAGON_WHISKER_PATH} strokeWidth="1.2" strokeOpacity="0.8" />
          {/* Tail flare */}
          <path d={DRAGON_TAIL_PATH} strokeWidth="3" strokeOpacity="0.7" />
        </g>
      </svg>

      {/* Prominent-mode one-shot dramatic pass overlay */}
      {prominent && (
        <svg
          className="dragon-prominent-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
          }}
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <g
            stroke="color-mix(in oklch, var(--color-terracotta) 45%, var(--text-1))"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={DRAGON_BODY_PATH} strokeWidth="4" strokeOpacity="0.9" />
            <path
              d={'M 820,100 C 880,80 900,40 960,30 C 1000,22 1040,18 1080,12'}
              strokeWidth="1.8"
              strokeOpacity="1"
            />
            <path d={DRAGON_WHISKER_PATH} strokeWidth="1.2" strokeOpacity="0.8" />
            <path d={DRAGON_TAIL_PATH} strokeWidth="3" strokeOpacity="0.7" />
          </g>
        </svg>
      )}
    </>
  );
}
