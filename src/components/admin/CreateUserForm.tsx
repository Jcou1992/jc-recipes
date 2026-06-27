'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import { useToast } from '@/components/ui/ToastContext';
import { createUserAccount } from '@/app/actions/admin';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type Success = { email: string; tempPassword: string; emailSent: boolean; emailReason?: string };

export default function CreateUserForm({ open, onClose, onCreated }: Props) {
  const { showToast } = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<Success | null>(null);

  useFocusTrap(dialogRef, open, onClose);
  useEffect(() => setMounted(true), []);

  // Reset transient state whenever the dialog opens.
  useEffect(() => {
    if (open) {
      setEmail('');
      setPassword('');
      setMakeAdmin(false);
      setError(null);
      setSuccess(null);
      setBusy(false);
    }
  }, [open]);

  if (!open || !mounted) return null;

  async function submit() {
    setBusy(true);
    setError(null);
    const result = await createUserAccount({
      email,
      password: password.trim() || undefined,
      makeAdmin,
    });
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setSuccess({
      email: email.trim().toLowerCase(),
      tempPassword: result.tempPassword,
      emailSent: result.emailSent,
      emailReason: result.emailReason,
    });
    onCreated();
  }

  async function copyCreds() {
    if (!success) return;
    const text = `Sign in: ${location.origin}/login\nEmail: ${success.email}\nTemporary password: ${success.tempPassword}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Credentials copied', 'success');
    } catch {
      showToast('Could not copy', 'error');
    }
  }

  const dialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-user-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0" style={{ background: 'oklch(0 0 0 / 0.65)' }} onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="dialog-panel relative rounded-2xl p-6 animate-scale-in"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-dialog)' }}
      >
        <h2 id="create-user-title" className="font-display text-xl font-semibold mb-4" style={{ color: 'var(--text-1)' }}>
          Create account
        </h2>

        {success ? (
          <div className="space-y-4">
            <p className="font-body text-sm" style={{ color: 'var(--text-2)' }}>
              {success.emailSent
                ? `Account created and an invite was emailed to ${success.email}.`
                : `Account created. Email was not sent${success.emailReason ? ` (${success.emailReason})` : ''} — share these credentials directly.`}
            </p>
            <div
              className="rounded-lg px-3 py-2 font-label text-sm"
              style={{ background: 'var(--bg-raised)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
            >
              <div>Email: <span data-testid="created-email">{success.email}</span></div>
              <div>
                Temp password: <code data-testid="created-temp-password">{success.tempPassword}</code>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={copyCreds} className="btn-ghost">Copy</button>
              <button type="button" onClick={onClose} className="btn-primary" data-testid="create-user-done">Done</button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); void submit(); }}
            className="space-y-4"
          >
            {error && (
              <p role="alert" className="font-label text-xs tracking-wide uppercase px-3 py-2.5 rounded-lg"
                 style={{
                   background: 'color-mix(in oklch, var(--color-terracotta) 10%, transparent)',
                   border: '1px solid color-mix(in oklch, var(--color-terracotta) 30%, transparent)',
                   color: 'var(--color-terracotta)',
                 }}>
                {error}
              </p>
            )}
            <div>
              <label className="font-label block text-xs tracking-widest uppercase mb-1.5" style={{ color: 'var(--text-3)' }} htmlFor="new-user-email">
                Email
              </label>
              <input
                id="new-user-email" type="email" required autoComplete="off"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="chef@email.com" className="input-base"
                data-testid="new-user-email"
              />
            </div>
            <div>
              <label className="font-label block text-xs tracking-widest uppercase mb-1.5" style={{ color: 'var(--text-3)' }} htmlFor="new-user-password">
                Temporary password (optional)
              </label>
              <input
                id="new-user-password" type="text" autoComplete="off"
                value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to auto-generate" className="input-base"
                data-testid="new-user-password"
              />
            </div>
            <label className="flex items-center gap-2 font-body text-sm" style={{ color: 'var(--text-2)' }}>
              <input type="checkbox" checked={makeAdmin} onChange={(e) => setMakeAdmin(e.target.checked)} data-testid="new-user-admin" />
              Make this user an admin
            </label>
            <div className="flex gap-3 justify-end mt-2">
              <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
              <button type="submit" disabled={busy} aria-busy={busy} className="btn-primary" data-testid="create-user-submit">
                {busy ? 'Creating…' : 'Create account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
