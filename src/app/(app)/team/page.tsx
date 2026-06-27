import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getServerT } from '@/lib/i18n-server';
import RecipeCard from '@/components/recipes/RecipeCard';
import InkBrush from '@/components/motion/InkBrush';
import type { Recipe } from '@/types/recipe';

export const metadata: Metadata = { title: 'Team recipes — SEKAI' };
// Shared set changes as teammates share/unshare — always read live.
export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const supabase = await createClient();
  const t = await getServerT();

  // RLS "read shared recipes" grants every authenticated user SELECT on rows
  // where is_shared = true (across all owners). Writes stay owner-only.
  const { data } = await supabase
    .from('recipes')
    .select('*')
    .eq('is_shared', true)
    .order('created_at', { ascending: false });
  const list = (data ?? []) as Recipe[];

  // Resolve owner display names from the public profiles directory.
  const ownerIds = Array.from(new Set(list.map(r => r.user_id)));
  const nameById = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', ownerIds);
    for (const p of profs ?? []) {
      nameById.set(p.id, p.display_name || p.email?.split('@')[0] || '—');
    }
  }

  return (
    <div className="max-w-[min(100%-2rem,1920px)] mx-auto px-4 lg:px-8 py-8">
      <div className="flex items-center justify-between gap-3 mb-8">
        <h1 className="font-display text-3xl font-bold" style={{ color: 'var(--text-1)' }}>
          {t.teamPageTitle}
        </h1>
        <Link href="/recipes" className="btn-ghost">{t.settingsBackToRecipes}</Link>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20" data-testid="team-empty-state">
          <div className="flex justify-center mb-6"><InkBrush /></div>
          <p className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-2)' }}>
            {t.teamEmptyTitle}
          </p>
          <p className="font-body text-base max-w-md mx-auto" style={{ color: 'var(--text-3)' }}>
            {t.teamEmptyBody}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="team-recipe-grid">
          {list.map(r => (
            <div key={r.id}>
              <p
                className="font-label text-xs tracking-widest uppercase mb-1.5"
                style={{ color: 'var(--text-3)' }}
              >
                {t.sharedBy(nameById.get(r.user_id) ?? '—')}
              </p>
              <RecipeCard recipe={r} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
