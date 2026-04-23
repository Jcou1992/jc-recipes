import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerT } from '@/lib/i18n-server';
import { getUserPreferences } from '@/app/actions/preferences';
import AppProviders from '@/components/ui/AppProviders';
import GlobalShortcuts from '@/components/ui/GlobalShortcuts';
import EmailSync from '@/components/ui/EmailSync';
import AvatarMenu from '@/components/ui/AvatarMenu';
import WordmarkStrokeIn from '@/components/motion/WordmarkStrokeIn';
import type { ThemeValue, FontSizeValue, LanguageValue } from '@/lib/preferences-cache';

function narrowTheme(v: unknown): ThemeValue | null {
  return v === 'light' || v === 'dark' || v === 'system' ? v : null;
}
function narrowFontSize(v: unknown): FontSizeValue | null {
  return v === 'sm' || v === 'md' || v === 'lg' ? v : null;
}
function narrowLanguage(v: unknown): LanguageValue | null {
  return v === 'en' || v === 'es' ? v : null;
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) redirect('/login');

  const [t, prefs] = await Promise.all([getServerT(), getUserPreferences()]);
  const initialLanguage = t.language;

  const email = session.user.email ?? '';
  const initial = (prefs?.space_name || email || '?').charAt(0).toUpperCase();

  // Feed the per-email client cache from authoritative server state so the
  // login-page preview on this device has accurate data even before the user
  // clicks any toggle.
  const theme = narrowTheme(prefs?.preferred_theme);
  const fontSize = narrowFontSize(prefs?.preferred_font_size);
  const language = narrowLanguage(prefs?.preferred_language) ?? initialLanguage;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <AppProviders initialLanguage={initialLanguage}>
        <EmailSync email={email} theme={theme} fontSize={fontSize} language={language} />
        <nav
          className="nav-frosted sticky top-0 z-10"
          style={{
            borderBottom: '1px solid var(--border)',
            paddingTop: 'env(safe-area-inset-top, 0)',
          }}
        >
          <div
            className="max-w-[min(100%-2rem,1920px)] mx-auto py-3 flex items-center justify-between"
            style={{
              paddingLeft: 'max(1rem, env(safe-area-inset-left))',
              paddingRight: 'max(1rem, env(safe-area-inset-right))',
            }}
          >
            <Link href="/recipes" aria-label="SEKAI — go to recipes">
              <WordmarkStrokeIn />
            </Link>
            <AvatarMenu initial={initial} email={email} />
          </div>
        </nav>
        <GlobalShortcuts />
        <main>{children}</main>
      </AppProviders>
    </div>
  );
}
