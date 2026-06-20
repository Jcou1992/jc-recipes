import type { RecipePayload } from '../../../types/recipe';
import { sanitizeTags } from '../../../lib/bulk-recipes-tags';

// Replicated from app/actions/recipes.ts (those helpers are local, not exported).
// Keep in lock-step with that file if normalization rules change.

export function normalizeServingSizeLabel(payload: RecipePayload): RecipePayload {
  const raw = payload.serving_size_label;
  if (raw == null) return payload;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ...payload, serving_size_label: null };
  return { ...payload, serving_size_label: trimmed };
}

export function normalizeTags(payload: RecipePayload): RecipePayload {
  if (!Array.isArray(payload.tags)) return payload;
  return { ...payload, tags: sanitizeTags(payload.tags) };
}
