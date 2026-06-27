'use client';

import { useEffect, useState } from 'react';

interface Props {
  targetRect: DOMRect | null;
}

export default function Spotlight({ targetRect }: Props) {
  // Force re-render on resize/scroll so the cutout tracks the target.
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick(t => t + 1);
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, []);

  if (!targetRect) {
    // No target — full-screen dim only
    return (
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{ background: 'oklch(0 0 0 / 0.65)' }}
        aria-hidden="true"
      />
    );
  }

  const pad = 8;
  const x = targetRect.left - pad;
  const y = targetRect.top - pad;
  const w = targetRect.width + pad * 2;
  const h = targetRect.height + pad * 2;

  // Four rectangles dim everything outside the target rect. Simpler than SVG mask.
  return (
    <div className="fixed inset-0 z-40 pointer-events-none" aria-hidden="true">
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          height: Math.max(0, y),
          background: 'oklch(0 0 0 / 0.65)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: y + h,
          right: 0,
          bottom: 0,
          background: 'oklch(0 0 0 / 0.65)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: y,
          width: Math.max(0, x),
          height: h,
          background: 'oklch(0 0 0 / 0.65)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x + w,
          top: y,
          right: 0,
          height: h,
          background: 'oklch(0 0 0 / 0.65)',
        }}
      />
      {/* Terracotta outline ring around target */}
      <div
        data-testid="tour-spotlight-ring"
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          boxShadow:
            '0 0 0 2px var(--color-terracotta), 0 0 24px color-mix(in oklch, var(--color-terracotta) 40%, transparent)',
          borderRadius: '6px',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
