'use client';

import { useEffect, useRef, useState } from 'react';
import { DESIGN_MODE_COOKIE, type DesignMode } from '@/lib/brut/design-mode-cookie';

const SEQUENCE: readonly string[] = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a',
];

const TOUCH_SEQUENCE: readonly string[] = ['tl', 'tr', 'br', 'bl'];
const TOUCH_RESET_MS = 4000;

function readMode(): DesignMode {
  if (typeof document === 'undefined') return 'classic';
  return document.documentElement.getAttribute('data-design') === 'brut' ? 'brut' : 'classic';
}

function writeModeCookie(mode: DesignMode) {
  document.cookie = `${DESIGN_MODE_COOKIE}=${mode}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

// Hidden keyboard easter egg. Entering the Konami sequence flips the visual
// mode between classic and brut, then persists that preference in the same
// cookie the server layout reads. Never logged.
export default function KonamiEasterEgg() {
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState('Sakai · Est. 2019');
  const lastToggleAtRef = useRef(0);
  const hideTimerRef = useRef<number | null>(null);

  function toggleMode() {
    const now = Date.now();
    if (now - lastToggleAtRef.current < 1500) return;
    lastToggleAtRef.current = now;
    const next = readMode() === 'brut' ? 'classic' : 'brut';
    document.documentElement.setAttribute('data-design', next);
    writeModeCookie(next);
    setMessage(next === 'brut' ? 'Brut service mode' : 'Classic service mode');
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
    }
    setShow(true);
    hideTimerRef.current = window.setTimeout(() => setShow(false), 2200);
    if (!window.location.pathname.startsWith('/login')) {
      window.setTimeout(() => window.location.reload(), 500);
    }
  }

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
        toggleMode();
        buffer = [];
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (hideTimerRef.current !== null) window.clearTimeout(hideTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let touchBuffer: string[] = [];
    let resetTimer: number | null = null;

    function zoneForPoint(x: number, y: number): string | null {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const edgeX = Math.max(72, Math.min(140, w * 0.28));
      const edgeY = Math.max(72, Math.min(160, h * 0.2));
      if (x <= edgeX && y <= edgeY) return 'tl';
      if (x >= w - edgeX && y <= edgeY) return 'tr';
      if (x >= w - edgeX && y >= h - edgeY) return 'br';
      if (x <= edgeX && y >= h - edgeY) return 'bl';
      return null;
    }

    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== 'touch') return;
      const zone = zoneForPoint(e.clientX, e.clientY);
      if (!zone) return;
      touchBuffer.push(zone);
      touchBuffer = touchBuffer.slice(-TOUCH_SEQUENCE.length);
      if (resetTimer) window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        touchBuffer = [];
      }, TOUCH_RESET_MS);
      if (
        touchBuffer.length === TOUCH_SEQUENCE.length &&
        touchBuffer.every((z, i) => z === TOUCH_SEQUENCE[i])
      ) {
        touchBuffer = [];
        if (resetTimer) window.clearTimeout(resetTimer);
        toggleMode();
      }
    }

    window.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
      if (resetTimer) window.clearTimeout(resetTimer);
    };
  }, []);

  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 'max(8%, calc(env(safe-area-inset-bottom, 0px) + 24px))',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <div
        className="animate-fade-up"
        style={{
        fontFamily: 'var(--font-noto, serif)',
        color: 'var(--color-gold)',
        fontSize: '0.875rem',
        letterSpacing: '0.24em',
        textTransform: 'uppercase',
        textAlign: 'center',
        whiteSpace: 'nowrap',
        maxWidth: 'calc(100vw - 32px)',
      }}
      >
        {message}
      </div>
    </div>
  );
}
