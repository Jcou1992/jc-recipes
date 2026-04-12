import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/actions/auth';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <nav
        style={{
          background: 'var(--bg-card)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a
            href="/recipes"
            className="font-display text-xl font-bold tracking-tight"
            style={{ color: 'var(--color-terracotta)' }}
          >
            jc-recipes
          </a>
          <form action={logout}>
            <button
              type="submit"
              className="nav-signout font-label text-xs tracking-widest uppercase transition-colors min-h-[44px] px-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
