'use client';

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
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
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.65)' }}
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel */}
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
          className="font-body text-sm mb-6"
          style={{ color: 'var(--text-2)' }}
        >
          {description}
        </p>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="btn-ghost"
          >
            Cancel
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
