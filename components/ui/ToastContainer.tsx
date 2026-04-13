'use client';

import { useToast } from './ToastContext';

const VARIANT_STYLES = {
  success: {
    background: 'rgba(34,197,94,0.12)',
    border: '1px solid rgba(34,197,94,0.25)',
    color: '#4ade80',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
  error: {
    background: 'rgba(212,112,63,0.12)',
    border: '1px solid rgba(212,112,63,0.3)',
    color: 'var(--color-terracotta)',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  info: {
    background: 'rgba(237,209,142,0.1)',
    border: '1px solid rgba(237,209,142,0.2)',
    color: 'var(--color-gold)',
    icon: (
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
};

export default function ToastContainer() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed z-50 flex flex-col gap-2 pointer-events-none"
      style={{
        bottom: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'min(calc(100vw - 2rem), 360px)',
      }}
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map(toast => {
        const style = VARIANT_STYLES[toast.variant];
        return (
          <button
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl text-left animate-fade-up"
            style={{
              background: style.background,
              border: style.border,
              color: style.color,
              backdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-dialog)',
            }}
            aria-label={`Dismiss: ${toast.message}`}
            data-testid={`toast-${toast.variant}`}
          >
            {style.icon}
            <span className="font-label text-sm tracking-wide">{toast.message}</span>
          </button>
        );
      })}
    </div>
  );
}
