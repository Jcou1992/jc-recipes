'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { BulkActionResult } from '@/types/recipe';

const BATCH_LIMIT = 100;
const DELETE_CHUNK_SIZE = 100;
export const MAX_TAGS_PER_RECIPE = 20;
export const MAX_TAG_LENGTH = 32;

type TagValidationError = NonNullable<BulkActionResult['failed'][number]['details']>;

export function sanitizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(tags.map(tag => tag.trim().toLowerCase()).filter(Boolean))
  );
}

export function validateTagPayload(
  addTags: string[],
  removeTags: string[],
): { addTags: string[]; removeTags: string[]; errors: TagValidationError[] } {
  const nextAddTags = sanitizeTags(addTags);
  const nextRemoveTags = sanitizeTags(removeTags);
  const errors: TagValidationError[] = [];

  const pushLengthErrors = (field: 'addTags' | 'removeTags', tags: string[]) => {
    for (const tag of tags) {
      if (tag.length > MAX_TAG_LENGTH) {
        errors.push({
          field,
          reason: 'tag_too_long',
          max: MAX_TAG_LENGTH,
          actual: tag.length,
          tag,
        });
      }
    }
  };

  pushLengthErrors('addTags', nextAddTags);
  pushLengthErrors('removeTags', nextRemoveTags);

  return { addTags: nextAddTags, removeTags: nextRemoveTags, errors };
}

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE)
    chunks.push(ids.slice(i, i + DELETE_CHUNK_SIZE));

  const results = await Promise.all(
    chunks.map(chunk =>
      supabase
        .from('recipes')
        .delete()
        .in('id', chunk)
        .eq('user_id', user.id)
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: sources, error: fetchError } = await supabase
    .from('recipes')
    .select('*')
    .in('id', ids)
    .eq('user_id', user.id);

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

  const { data: inserted, error: insertError } = await supabase
    .from('recipes')
    .insert(clones)
    .select('id');

  if (insertError) {
    return {
      succeeded: [],
      failed: ids.map(id => ({ id, error: insertError.message })),
    };
  }

  const notFound = ids.filter(id => !foundIds.has(id));
  return {
    succeeded: (inserted ?? []).map(r => r.id as string),
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
  const normalized = validateTagPayload(addTags, removeTags);
  if (normalized.errors.length > 0) {
    return {
      succeeded: [],
      failed: ids.map(id => ({
        id,
        code: 'TAG_VALIDATION',
        error: 'Invalid tags supplied',
        details: normalized.errors[0],
      })),
    };
  }

  if (normalized.addTags.length === 0 && normalized.removeTags.length === 0) {
    return { succeeded: [...ids], failed: [] };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: sources, error: fetchError } = await supabase
    .from('recipes')
    .select('id, tags')
    .in('id', ids)
    .eq('user_id', user.id);

  if (fetchError || !sources) {
    return {
      succeeded: [],
      failed: ids.map(id => ({ id, error: fetchError?.message ?? 'Fetch failed' })),
    };
  }

  const removeSet = new Set(normalized.removeTags);

  const results = await Promise.allSettled(
    sources.map(async r => {
      const merged = new Set<string>(r.tags ?? []);
      for (const t of normalized.addTags) merged.add(t);
      const newTags = Array.from(merged).filter(t => !removeSet.has(t));
      if (newTags.length > MAX_TAGS_PER_RECIPE) {
        return Promise.reject({
          code: 'TAG_VALIDATION' as const,
          message: `Recipes may have at most ${MAX_TAGS_PER_RECIPE} tags`,
          details: {
            field: 'recipeTags' as const,
            reason: 'too_many_tags' as const,
            max: MAX_TAGS_PER_RECIPE,
            actual: newTags.length,
          },
        });
      }
      const { error } = await supabase
        .from('recipes')
        .update({ tags: newTags.length > 0 ? newTags : null })
        .eq('id', r.id)
        .eq('user_id', user.id);
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
      if (
        result.reason &&
        typeof result.reason === 'object' &&
        'code' in result.reason &&
        result.reason.code === 'TAG_VALIDATION'
      ) {
        failed.push({
          id,
          code: 'TAG_VALIDATION',
          error: result.reason.message ?? 'Invalid tags supplied',
          details: result.reason.details,
        });
      } else {
        const err = result.reason instanceof Error ? result.reason.message : 'Update failed';
        failed.push({ id, error: err });
      }
    }
  });

  const foundIds = new Set(sources.map(s => s.id));
  for (const id of ids) {
    if (!foundIds.has(id)) failed.push({ id, error: 'Not found' });
  }

  return { succeeded, failed };
}
