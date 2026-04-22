'use client';

import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  description: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        className="relative rounded-2xl p-6 w-full max-w-sm animate-scale-in"
        style={{
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-dialog)',
        }}
      >
        <h2
          id="confirm-title"
          className="font-display text-xl font-semibold mb-2"
          style={{ color: 'var(--text-1)' }}
        >
          {title}
        </h2>
        <p
          className="font-body text-sm"
          style={{ color: 'var(--text-2)' }}
        >
          {description}
        </p>

        {children && (
          <div
            className="mt-3 mb-6 overflow-y-auto rounded-lg px-3 py-2"
            style={{
              maxHeight: '9rem',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
            }}
          >
            {children}
          </div>
        )}

        <div className={`flex gap-3 justify-end ${children ? '' : 'mt-6'}`}>
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-danger"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
