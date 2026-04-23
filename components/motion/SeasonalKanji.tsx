'use client';

import { useEffect, useState } from 'react';

// Simplified stroke-order paths for 世 (5 strokes) and 界 (9 strokes).
// Hand-authored on a 64×32 viewBox (two 32×32 glyph cells). These are
// intentionally schematic — they TRACE each stroke in canonical order so
// the animation reads as calligraphy, not a literal font rendering.
const SEKAI_STROKES = [
  // 世 — 5 strokes (left cell, x: 0–30)
  'M 2 12 L 30 12',                      // 1. top horizontal
  'M 6 6 L 6 22',                        // 2. left vertical descending
  'M 15 6 L 15 18',                      // 3. middle short vertical
  'M 24 12 L 24 22',                     // 4. right inner vertical
  'M 3 22 L 3 28 L 30 28',               // 5. bottom L (down + across)
  // 界 — 9 strokes (right cell, x: 34–64)
  'M 36 6 L 62 6',                       // 1. top horizontal
  'M 36 6 L 36 16',                      // 2. left vertical
  'M 36 11 L 62 11',                     // 3. middle horizontal
  'M 49 6 L 49 16',                      // 4. inner vertical of 田
  'M 62 6 L 62 16 L 36 16',              // 5. right vertical + bottom close
  'M 34 18 L 64 18',                     // 6. under bar (roof of 介)
  'M 44 20 L 40 30',                     // 7. left diagonal of 介
  'M 49 20 L 49 26',                     // 8. center tick
  'M 54 20 L 58 30',                     // 9. right diagonal of 介
];

interface Props {
  animate?: boolean;
}

// Renders the SEKAI 世界 kanji as an SVG whose paths stroke in one at a time
// when `animate` is true (first session mount, via WordmarkStrokeIn). When
// `animate` is false, renders the final inked state instantly. On
// December 31 / January 1 (client timezone) the stroke color shifts to a
// gilded gold — one quiet seasonal touch per the motion-system spec.
export default function SeasonalKanji({ animate = false }: Props) {
  const [gilded, setGilded] = useState(false);

  useEffect(() => {
    const d = new Date();
    const m = d.getMonth();
    const day = d.getDate();
    if ((m === 11 && day === 31) || (m === 0 && day === 1)) setGilded(true);
  }, []);

  const stroke = gilded ? 'oklch(90% 0.12 85)' : 'var(--text-3)';

  return (
    <svg
      role="img"
      aria-label="SEKAI — world"
      viewBox="0 0 66 32"
      width="44"
      height="22"
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={animate ? 'kanji-stroke-in' : ''}
      style={{ overflow: 'visible' }}
    >
      <title>世界</title>
      {SEKAI_STROKES.map((d, i) => (
        <path
          key={i}
          d={d}
          pathLength={1}
          style={{ animationDelay: `calc(var(--stagger-stroke) * ${i})` }}
        />
      ))}
    </svg>
  );
}
