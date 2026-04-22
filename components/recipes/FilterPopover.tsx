'use client';

import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
}

export default function FilterPopover({ open, onClose, anchorRef, children }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click. If the click landed inside the anchor button,
  // leave it alone — the button's own onClick will toggle state.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open, onClose, anchorRef]);

  useFocusTrap(popoverRef, open, onClose);

  if (!open) return null;

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-modal="true"
      aria-label="Filter and sort options"
      tabIndex={-1}
      className="absolute z-40 mt-2 rounded-xl animate-scale-in"
      style={{
        top: '100%',
        left: 0,
        minWidth: '380px',
        maxWidth: '480px',
        maxHeight: '70vh',
        overflowY: 'auto',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-dialog)',
        padding: '1.25rem',
      }}
      data-testid="filter-popover"
    >
      {children}
    </div>
  );
}
