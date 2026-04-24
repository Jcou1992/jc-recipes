'use client';

import { useEffect, useState } from 'react';

const SEQUENCE: readonly string[] = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

const STORAGE_KEY = 'sekai-login-bg';

// Hidden keyboard easter egg on the login screen. Entering the Konami
// sequence now toggles the login-background glyph between 世界 (default)
// and 龍 (dragon). A brief flash announces the mode change, then fades.
// The choice persists in localStorage and is read by LoginBackground.
//
// The original "Sakai · Est. 2019" reveal is preserved by appending it
// above the mode line on every trigger — JC's restaurant stays the
// quiet signature.
export default function KonamiEasterEgg() {
  const [show, setShow] = useState(false);
  const [modeAfter, setModeAfter] = useState<'kanji' | 'ryu'>('kanji');

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
        // Toggle the persisted background mode.
        let next: 'kanji' | 'ryu' = 'ryu';
        try {
          const current = localStorage.getItem(STORAGE_KEY);
          next = current === 'ryu' ? 'kanji' : 'ryu';
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Storage unavailable — still fire the event so the current view
          // updates for this session even if the preference can't persist.
        }
        setModeAfter(next);
        window.dispatchEvent(new CustomEvent('sekai-bg-mode-change'));
        setShow(true);
        buffer = [];
        setTimeout(() => setShow(false), 2400);
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
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
      }}
    >
      <span>Sakai · Est. 2019</span>
      <span style={{ opacity: 0.75, fontSize: '0.75rem' }}>
        {modeAfter === 'ryu' ? '龍 mode on' : '龍 mode off'}
      </span>
    </div>
  );
}
