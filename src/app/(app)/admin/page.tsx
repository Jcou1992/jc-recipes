import type { Metadata } from 'next';
import Link from 'next/link';
import { listUsers } from '@/app/actions/admin';
import AdminDashboard from '@/components/admin/AdminDashboard';

export const metadata: Metadata = { title: 'Admin — SEKAI' };
// User list + counts must reflect the live DB on every visit.
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const { users, stats } = await listUsers();

  return (
    <div className="max-w-[min(100%-2rem,1280px)] mx-auto px-4 lg:px-8 py-8">
      <Link
        href="/recipes"
        className="font-label text-xs tracking-widest uppercase inline-flex items-center mb-6 transition-colors min-h-[44px]"
        style={{ color: 'var(--text-3)' }}
      >
        ← Recipes
      </Link>
      <AdminDashboard initialUsers={users} stats={stats} />
    </div>
  );
}
