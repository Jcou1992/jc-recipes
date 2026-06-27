'use client';

import { useEffect, useState } from 'react';

// Renders the 世界 kanji using the Noto Serif JP display font that the app
// already loads. When `animate` is true (first session mount, via
// WordmarkStrokeIn), the parent `.animate-stroke-in` wrapper performs a
// L→R clip-path wipe on this span as its second child (staggered 80ms
// after the roman SEKAI) — calligraphic reveal on real glyphs, not a
// schematic stroke sequence.
//
// On December 31 / January 1 (client timezone) the kanji render in a
// gilded gold tone — one quiet seasonal touch per the motion-system spec.
export default function SeasonalKanji(_: { animate?: boolean } = {}) {
  const [gilded, setGilded] = useState(false);

  useEffect(() => {
    const d = new Date();
    const m = d.getMonth();
    const day = d.getDate();
    if ((m === 11 && day === 31) || (m === 0 && day === 1)) setGilded(true);
  }, []);

  return (
    <span
      className="font-display"
      style={{
        color: gilded ? 'oklch(90% 0.12 85)' : 'var(--text-3)',
        fontSize: '1.05rem',
        lineHeight: 1,
        fontWeight: 500,
        letterSpacing: '0.02em',
      }}
      aria-label="SEKAI — world"
      role="img"
    >
      世界
    </span>
  );
}
