import { requireAdmin } from '@/lib/admin-guard';

/**
 * Server-side gate for the whole /admin segment. requireAdmin() redirects
 * unauthenticated → /login and non-admin → /recipes. This is defense-in-depth
 * alongside the per-action requireAdmin() calls.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
