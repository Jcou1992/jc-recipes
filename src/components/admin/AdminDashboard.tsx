'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import CreateUserForm from '@/components/admin/CreateUserForm';
import {
  setUserAdmin,
  resetUserPassword,
  deleteUserAccount,
  type AdminUserRow,
} from '@/app/actions/admin';

interface Props {
  initialUsers: AdminUserRow[];
  stats: { totalUsers: number; totalRecipes: number; sharedRecipes: number };
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-xl px-5 py-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <p className="font-label text-xs tracking-widest uppercase" style={{ color: 'var(--text-3)' }}>{label}</p>
      <p className="font-display text-3xl font-bold tabular-nums" style={{ color: 'var(--text-1)' }}>{value}</p>
    </div>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
  } catch {
    return '—';
  }
}

export default function AdminDashboard({ initialUsers, stats }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUserRow | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserRow | null>(null);
  const [resetPw, setResetPw] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleAdmin(u: AdminUserRow) {
    setBusyId(u.id);
    const result = await setUserAdmin(u.id, !u.isAdmin);
    setBusyId(null);
    if ('error' in result) { showToast(result.error, 'error'); return; }
    showToast(u.isAdmin ? 'Admin removed' : 'Admin granted', 'success');
    router.refresh();
  }

  async function confirmReset() {
    if (!resetTarget) return;
    setBusyId(resetTarget.id);
    const result = await resetUserPassword(resetTarget.id, resetPw);
    setBusyId(null);
    if ('error' in result) { showToast(result.error, 'error'); return; }
    showToast(`Password reset for ${resetTarget.email}`, 'success');
    setResetTarget(null);
    setResetPw('');
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    const result = await deleteUserAccount(deleteTarget.id);
    setBusyId(null);
    if ('error' in result) { showToast(result.error, 'error'); setDeleteTarget(null); return; }
    showToast(`Deleted ${deleteTarget.email}`, 'success');
    setDeleteTarget(null);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--text-1)' }}>Admin</h1>
        <button type="button" className="btn-primary" onClick={() => setCreateOpen(true)} data-testid="admin-create-user-btn">
          + Create account
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard label="Users" value={stats.totalUsers} />
        <StatCard label="Recipes" value={stats.totalRecipes} />
        <StatCard label="Shared" value={stats.sharedRecipes} />
      </div>

      <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid var(--border)' }}>
        <table className="w-full text-left" data-testid="admin-user-table">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {['User', 'Recipes', 'Role', 'Created', 'Last sign-in', 'Actions'].map(h => (
                <th key={h} className="font-label text-xs tracking-widest uppercase px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-3)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initialUsers.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }} data-testid={`admin-user-row-${u.email}`}>
                <td className="px-4 py-3 align-top">
                  <div className="font-body text-sm" style={{ color: 'var(--text-1)' }}>{u.email}</div>
                  {u.spaceName && (
                    <div className="font-label text-xs tracking-wide" style={{ color: 'var(--text-3)' }}>{u.spaceName}</div>
                  )}
                </td>
                <td className="px-4 py-3 align-top font-body text-sm tabular-nums" style={{ color: 'var(--text-2)' }}>{u.recipeCount}</td>
                <td className="px-4 py-3 align-top">
                  {u.isAdmin ? (
                    <span className="font-label text-xs tracking-wider uppercase px-2 py-0.5 rounded-full"
                          style={{
                            background: 'color-mix(in oklch, var(--color-terracotta) 12%, transparent)',
                            color: 'var(--color-terracotta)',
                            border: '1px solid color-mix(in oklch, var(--color-terracotta) 25%, transparent)',
                          }}>
                      Admin
                    </span>
                  ) : (
                    <span className="font-body text-sm" style={{ color: 'var(--text-3)' }}>Member</span>
                  )}
                </td>
                <td className="px-4 py-3 align-top font-body text-sm whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{fmtDate(u.createdAt)}</td>
                <td className="px-4 py-3 align-top font-body text-sm whitespace-nowrap" style={{ color: 'var(--text-2)' }}>{fmtDate(u.lastSignInAt)}</td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busyId === u.id} className="btn-ghost text-xs"
                            onClick={() => toggleAdmin(u)} data-testid={`admin-toggle-${u.email}`}>
                      {u.isAdmin ? 'Revoke admin' : 'Make admin'}
                    </button>
                    <button type="button" disabled={busyId === u.id} className="btn-ghost text-xs"
                            onClick={() => { setResetTarget(u); setResetPw(''); }} data-testid={`admin-reset-${u.email}`}>
                      Reset password
                    </button>
                    <button type="button" disabled={busyId === u.id} className="btn-danger text-xs"
                            onClick={() => setDeleteTarget(u)} data-testid={`admin-delete-${u.email}`}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CreateUserForm open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => router.refresh()} />

      <ConfirmDialog
        open={!!resetTarget}
        title="Reset password"
        description={resetTarget ? `Set a new password for ${resetTarget.email}.` : ''}
        confirmLabel={busyId ? 'Saving…' : 'Reset'}
        cancelLabel="Cancel"
        onConfirm={() => { void confirmReset(); }}
        onCancel={() => { setResetTarget(null); setResetPw(''); }}
      >
        <input
          type="text"
          value={resetPw}
          onChange={(e) => setResetPw(e.target.value)}
          placeholder="New password (min 8 chars)"
          className="input-base w-full"
          autoComplete="off"
          data-testid="admin-reset-password-input"
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete account"
        description={deleteTarget ? `Permanently delete ${deleteTarget.email} and all their recipes? This cannot be undone.` : ''}
        confirmLabel={busyId ? 'Deleting…' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={() => { void confirmDelete(); }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
