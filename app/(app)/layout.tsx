import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerT } from '@/lib/i18n-server';
import { getUserPreferences } from '@/app/actions/preferences';
import AppProviders from '@/components/ui/AppProviders';
import GlobalShortcuts from '@/components/ui/GlobalShortcuts';
import FontSizeBootstrap from '@/components/ui/FontSizeBootstrap';
import AvatarMenu from '@/components/ui/AvatarMenu';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  const [t, prefs] = await Promise.all([getServerT(), getUserPreferences()]);
  const initialLanguage = t.language;

  const email = session.user.email ?? '';
  const initial = (prefs?.space_name || email || '?').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AppProviders initialLanguage={initialLanguage}>
        <FontSizeBootstrap />
        <nav
          className="nav-frosted sticky top-0 z-10"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="max-w-[min(100%-2rem,1920px)] mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/recipes" className="flex items-baseline gap-1.5">
              <span
                className="font-label text-lg font-bold tracking-widest uppercase"
                style={{ color: 'var(--color-terracotta)' }}
              >
                SEKAI
              </span>
              <span
                className="font-display text-sm"
                style={{ color: 'var(--text-3)' }}
              >
                世界
              </span>
            </a>
            <AvatarMenu initial={initial} email={email} />
          </div>
        </nav>
        <GlobalShortcuts />
        <main>{children}</main>
      </AppProviders>
    </div>
  );
}
