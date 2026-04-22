import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getServerT } from '@/lib/i18n-server';
import { getUserPreferences } from '@/app/actions/preferences';
import SettingsClient from '@/components/settings/SettingsClient';

export const metadata: Metadata = { title: 'Settings — SEKAI' };

export default async function SettingsPage() {
  const [supabase, t, prefs] = await Promise.all([
    createClient(),
    getServerT(),
    getUserPreferences(),
  ]);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const spaceName = prefs?.space_name ?? '';
  const fallback = t.recipesPageTitle;

  return (
    <div className="max-w-[min(100%-2rem,800px)] mx-auto px-4 py-8">
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
