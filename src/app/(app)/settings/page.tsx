import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getServerT } from '@/lib/i18n-server';
import { getUserPreferences } from '@/app/actions/preferences';
import SettingsClient from '@/components/settings/SettingsClient';

export const metadata: Metadata = { title: 'Settings — SEKAI' };

interface PageProps {
  searchParams: Promise<{ return?: string }>;
}

// F5: only accept same-origin paths. Reject protocol-relative `//host`,
// path traversal `..`, and anything outside a conservative URL-safe charset.
// Defense-in-depth — Next will refuse cross-origin redirects too, but we
// keep the check tight so we never render a hostile href into the link.
function sanitizeReturn(raw: string | undefined): string {
  if (!raw) return '/recipes';
  if (!raw.startsWith('/')) return '/recipes';
  if (raw.startsWith('//')) return '/recipes';
  if (raw.includes('..')) return '/recipes';
  if (!/^\/[A-Za-z0-9/_\-?=&,#%]*$/.test(raw)) return '/recipes';
  return raw;
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const [supabase, t, prefs, params] = await Promise.all([
    createClient(),
    getServerT(),
    getUserPreferences(),
    searchParams,
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const spaceName = prefs?.space_name ?? '';
  const fallback = t.recipesPageTitle;
  const backHref = sanitizeReturn(params.return);

  return (
    <div className="max-w-[min(100%-2rem,800px)] mx-auto px-4 py-8">
      <Link
        href={backHref}
        className="font-label text-xs tracking-widest uppercase inline-flex items-center mb-6 transition-colors min-h-[44px]"
        style={{ color: 'var(--text-3)' }}
      >
        {t.backBtn}
      </Link>
      <h1
        className="font-display text-3xl md:text-4xl font-bold mb-8"
        style={{ color: 'var(--text-1)' }}
      >
        {t.settingsTitle}
      </h1>
      <SettingsClient
        email={user.email ?? ''}
        initialSpaceName={spaceName}
        spaceNameFallback={fallback}
      />
    </div>
  );
}
