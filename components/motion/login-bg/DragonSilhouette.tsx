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
  'M 20,540 ' +
  // First coil — large arc upward and right
  'C 40,510 80,470 140,430 ' +
  'C 200,390 240,360 280,340 ' +
  // Mid-body S-inflection — belly drops then spine rises
  'C 320,320 380,380 440,400 ' +
  'C 500,420 540,380 580,320 ' +
  // Upper coil — narrowing
  'C 620,260 660,180 720,140 ' +
  'C 780,100 840,90 900,70 ' +
  // Head suggestion — tapers to fine stroke
  'C 940,55 980,35 1040,20 ' +
  'C 1060,14 1075,10 1080,8';

// Single whisker from the head — a short diverging stroke
const DRAGON_WHISKER_PATH =
  'M 1080,8 C 1095,0 1110,-4 1125,-2';

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

        @keyframes dragon-draw-in {
          0%   { stroke-dashoffset: 1000; opacity: 0; }
          5%   { opacity: 0.22; }
          100% { stroke-dashoffset: 0; opacity: 0.22; }
        }

        @keyframes dragon-draw-hold-fade {
          0%   { opacity: 0.22; }
          14%  { opacity: 0.18; }
          100% { opacity: 0; }
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
          pointer-events: none;
        }

        .dragon-prominent-overlay path.draw-path {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          opacity: 0;
          animation:
            dragon-draw-in 4s cubic-bezier(0.25, 1, 0.5, 1) 0.3s 1 forwards,
            dragon-draw-hold-fade 3s ease-in-out 4.3s 1 forwards;
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
              'M 720,140 C 780,100 840,90 900,70 C 940,55 980,35 1040,20 C 1060,14 1075,10 1080,8'
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

      {/* Prominent-mode one-shot calligraphic draw-in overlay */}
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
            {/* Body — draws itself in via dasharray animation */}
            <path
              className="draw-path"
              d={DRAGON_BODY_PATH}
              strokeWidth="4"
              strokeOpacity="0.9"
              pathLength="1000"
            />
            {/* Head taper overlay */}
            <path
              className="draw-path"
              d={'M 720,140 C 780,100 840,90 900,70 C 940,55 980,35 1040,20 C 1060,14 1075,10 1080,8'}
              strokeWidth="1.8"
              strokeOpacity="1"
              pathLength="1000"
            />
            {/* Whisker */}
            <path
              className="draw-path"
              d={DRAGON_WHISKER_PATH}
              strokeWidth="1.2"
              strokeOpacity="0.8"
              pathLength="1000"
            />
          </g>
        </svg>
      )}
    </>
  );
}
