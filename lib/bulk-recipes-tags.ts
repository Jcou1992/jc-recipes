import type { BulkActionResult } from '@/types/recipe';

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
