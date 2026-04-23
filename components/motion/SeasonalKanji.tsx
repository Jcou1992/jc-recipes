'use client';

import { useEffect, useState } from 'react';

// Renders the SEKAI 世界 kanji. On December 31 / January 1 (client timezone),
// the kanji pair is rendered in a gilded gold tone instead of the default
// text-3 neutral — one quiet seasonal touch per the motion-system spec.
// Detection is best-effort client-side only; avoids any server calendar
// branching which would couple timezones.
export default function SeasonalKanji() {
  const [gilded, setGilded] = useState(false);

  useEffect(() => {
    const d = new Date();
    const m = d.getMonth();
    const day = d.getDate();
    if ((m === 11 && day === 31) || (m === 0 && day === 1)) setGilded(true);
  }, []);

  return (
    <span
      className="font-display text-sm"
      style={{ color: gilded ? 'oklch(90% 0.12 85)' : 'var(--text-3)' }}
      aria-label="SEKAI — world"
    >
      世界
    </span>
  );
}
