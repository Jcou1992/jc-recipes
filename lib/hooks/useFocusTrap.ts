'use client';

import { useEffect, type RefObject } from 'react';

export function useFocusTrap(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const root = ref.current;

    const prevActive = document.activeElement as HTMLElement | null;

    function getFocusables(): HTMLElement[] {
      return Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(el => !el.hasAttribute('aria-hidden'));
    }

    const focusables = getFocusables();
    (focusables[0] ?? root).focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusables();
      if (items.length === 0) { e.preventDefault(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevActive?.focus?.();
    };
  }, [ref, active, onEscape]);
}
