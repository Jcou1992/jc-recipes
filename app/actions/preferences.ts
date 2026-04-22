'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { UserPreferences } from '@/types/preferences';

export async function getUserPreferences(): Promise<Partial<UserPreferences> | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();
  return data;
}

export async function updateUserPreferences(
  patch: { space_name?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not authenticated' };

  // Validate space_name length
  if (patch.space_name != null && patch.space_name.length > 30) {
    return { ok: false, error: 'Space name must be 30 characters or fewer' };
  }
  const normalized = patch.space_name?.trim() || null;

  const { error } = await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, space_name: normalized }, { onConflict: 'user_id' });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/recipes');
  return { ok: true };
}

export async function markTourCompleted(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: user.id, tour_completed_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  return { ok: !error };
}

export async function dismissTour(days: number): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const until = new Date();
  until.setDate(until.getDate() + days);
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      { user_id: user.id, tour_dismissed_until: until.toISOString() },
      { onConflict: 'user_id' },
    );
  return { ok: !error };
}
