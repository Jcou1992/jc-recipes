import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logout } from '@/app/actions/auth';
import { getServerT } from '@/lib/i18n-server';
import AppProviders from '@/components/ui/AppProviders';
import LanguageToggle from '@/components/ui/LanguageToggle';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  const t = await getServerT();
  const initialLanguage = t.language;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AppProviders initialLanguage={initialLanguage}>
        <nav
          className="nav-frosted sticky top-0 z-10"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
            <a
              href="/recipes"
              className="font-display text-xl font-bold tracking-tight"
              style={{ color: 'var(--color-terracotta)' }}
            >
              jc-recipes
            </a>
            <div className="flex items-center gap-1">
              <LanguageToggle />
              <form action={logout}>
                <button
                  type="submit"
                  className="nav-signout font-label text-xs tracking-widest uppercase transition-colors min-h-[44px] px-2"
                >
                  {t.navSignOut}
                </button>
              </form>
            </div>
          </div>
        </nav>
        <main>{children}</main>
      </AppProviders>
    </div>
  );
}
