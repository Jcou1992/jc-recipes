'use client';

import { useEffect, useState } from 'react';

const SEQUENCE: readonly string[] = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

// Hidden keyboard easter egg on the login screen. Entering the Konami
// sequence briefly surfaces a "Sakai — Est. …" lockup, then fades. Exists
// for discovery by the small circle of users who know JC's restaurant.
// Never logged, never persisted.
export default function KonamiEasterEgg() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let buffer: string[] = [];
    function onKey(e: KeyboardEvent) {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      buffer.push(key);
      if (buffer.length > SEQUENCE.length) buffer = buffer.slice(-SEQUENCE.length);
      if (
        buffer.length === SEQUENCE.length &&
        buffer.every((k, i) => k === SEQUENCE[i])
      ) {
        setShow(true);
        buffer = [];
        setTimeout(() => setShow(false), 2200);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      className="animate-fade-up"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '8%',
        transform: 'translateX(-50%)',
        fontFamily: 'var(--font-noto, serif)',
        color: 'var(--color-gold)',
        fontSize: '0.875rem',
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      Sakai · Est. 2019
    </div>
  );
}
