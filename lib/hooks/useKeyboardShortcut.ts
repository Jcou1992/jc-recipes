'use client';

import { useEffect } from 'react';

export function useKeyboardShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  options: { ignoreInInputs?: boolean } = {},
) {
  const { ignoreInInputs = true } = options;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (ignoreInInputs) {
        const t = e.target as HTMLElement | null;
        const tag = t?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || t?.isContentEditable) return;
      }
      const spec = key.toLowerCase();
      let match = false;
      if (spec.includes('+')) {
        const parts = spec.split('+').map(s => s.trim());
        const mainKey = parts[parts.length - 1];
        const needMeta = parts.some(p => p === '⌘' || p === 'meta' || p === 'cmd');
        const needCtrl = parts.some(p => p === 'ctrl' || p === 'control');
        match = e.key.toLowerCase() === mainKey && (!needMeta || e.metaKey) && (!needCtrl || e.ctrlKey);
      } else if (spec === 'escape') {
        match = e.key === 'Escape';
      } else {
        match = e.key.toLowerCase() === spec && !e.metaKey && !e.ctrlKey && !e.altKey;
      }
      if (match) {
        e.preventDefault();
        handler(e);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [key, handler, ignoreInInputs]);
}
