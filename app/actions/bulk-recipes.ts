'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { BulkActionResult } from '@/types/recipe';

const BATCH_LIMIT = 100;
const DELETE_CHUNK_SIZE = 100;

function overLimit(ids: string[]): BulkActionResult {
  return {
    succeeded: [],
    failed: ids.map(id => ({ id, error: `Max ${BATCH_LIMIT} recipes per operation` })),
  };
}

export async function bulkDeleteRecipes(ids: string[]): Promise<BulkActionResult> {
  if (ids.length === 0) return { succeeded: [], failed: [] };
  if (ids.length > BATCH_LIMIT) return overLimit(ids);

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE)
    chunks.push(ids.slice(i, i + DELETE_CHUNK_SIZE));

  const results = await Promise.all(
    chunks.map(chunk =>
      supabase
        .from('recipes')
        .delete()
        .in('id', chunk)
        .eq('user_id', session.user.id)
        .select('id')
    )
  );

  const succeeded: string[] = [];
  const allErrors: string[] = [];
  for (const { data, error } of results) {
    if (error) { allErrors.push(error.message); continue; }
    (data ?? []).forEach(r => succeeded.push(r.id));
  }

  const succeededSet = new Set(succeeded);
  const failed = ids
    .filter(id => !succeededSet.has(id))
    .map(id => ({ id, error: allErrors[0] ?? 'Not found' }));

  return { succeeded, failed };
}

export async function bulkDuplicateRecipes(ids: string[]): Promise<BulkActionResult> {
  if (ids.length === 0) return { succeeded: [], failed: [] };
  if (ids.length > BATCH_LIMIT) return overLimit(ids);

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: sources, error: fetchError } = await supabase
    .from('recipes')
    .select('*')
    .in('id', ids)
    .eq('user_id', session.user.id);

  if (fetchError || !sources) {
    return {
      succeeded: [],
      failed: ids.map(id => ({ id, error: fetchError?.message ?? 'Fetch failed' })),
    };
  }

  const foundIds = new Set(sources.map(s => s.id));
  const clones = sources.map(r => {
    const { id, created_at, updated_at, ...rest } = r;
    return { ...rest, name: `${r.name} (Copy)` };
  });

  if (clones.length === 0) {
    return {
      succeeded: [],
      failed: ids.map(id => ({ id, error: 'Not found' })),
    };
  }

  const { error: insertError } = await supabase.from('recipes').insert(clones);

  if (insertError) {
    return {
      succeeded: [],
      failed: ids.map(id => ({ id, error: insertError.message })),
    };
  }

  const notFound = ids.filter(id => !foundIds.has(id));
  return {
    succeeded: Array.from(foundIds),
    failed: notFound.map(id => ({ id, error: 'Not found' })),
  };
}

export async function bulkUpdateTags(
  ids: string[],
  addTags: string[],
  removeTags: string[],
): Promise<BulkActionResult> {
  if (ids.length === 0) return { succeeded: [], failed: [] };
  if (ids.length > BATCH_LIMIT) return overLimit(ids);
  if (addTags.length === 0 && removeTags.length === 0) {
    return { succeeded: [...ids], failed: [] };
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { data: sources, error: fetchError } = await supabase
    .from('recipes')
    .select('id, tags')
    .in('id', ids)
    .eq('user_id', session.user.id);

  if (fetchError || !sources) {
    return {
      succeeded: [],
      failed: ids.map(id => ({ id, error: fetchError?.message ?? 'Fetch failed' })),
    };
  }

  const removeSet = new Set(removeTags);

  const results = await Promise.allSettled(
    sources.map(async r => {
      const merged = new Set<string>(r.tags ?? []);
      for (const t of addTags) merged.add(t);
      const newTags = Array.from(merged).filter(t => !removeSet.has(t));
      const { error } = await supabase
        .from('recipes')
        .update({ tags: newTags.length > 0 ? newTags : null })
        .eq('id', r.id)
        .eq('user_id', session.user.id);
      if (error) throw new Error(error.message);
      return r.id as string;
    }),
  );

  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  results.forEach((result, i) => {
    const id = sources[i].id as string;
    if (result.status === 'fulfilled') {
      succeeded.push(id);
    } else {
      const err = result.reason instanceof Error ? result.reason.message : 'Update failed';
      failed.push({ id, error: err });
    }
  });

  const foundIds = new Set(sources.map(s => s.id));
  for (const id of ids) {
    if (!foundIds.has(id)) failed.push({ id, error: 'Not found' });
  }

  return { succeeded, failed };
}
