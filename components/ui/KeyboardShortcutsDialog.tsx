'use client';

import { useRef } from 'react';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  shortcuts: Array<{ key: string; description: string }>;
  closeLabel?: string;
}

export default function KeyboardShortcutsDialog({
  open,
  onClose,
  title,
  shortcuts,
  closeLabel = 'Close',
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'oklch(0 0 0 / 0.65)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative rounded-2xl p-6 w-full max-w-sm animate-scale-in"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-dialog)' }}
      >
        <h2
          id="shortcuts-title"
          className="font-display text-xl font-semibold mb-4"
          style={{ color: 'var(--text-1)' }}
        >
          {title}
        </h2>
        <ul className="flex flex-col gap-2 mb-6">
          {shortcuts.map((s, i) => (
            <li key={i} className="flex items-baseline gap-3">
              <kbd
                className="font-label text-xs tracking-wider uppercase px-2 py-0.5 rounded"
                style={{
                  background: 'var(--bg-raised)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-2)',
                  minWidth: '2.25rem',
                  textAlign: 'center',
                }}
              >
                {s.key}
              </kbd>
              <span className="font-body text-sm" style={{ color: 'var(--text-2)' }}>
                {s.description}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            data-testid="shortcuts-close"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
