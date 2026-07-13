import crypto from 'node:crypto';
import type { CaptureRecipe } from './schema';

// Ported unchanged from the package (backend/src/utils.js). The fingerprint
// algorithm is a cross-system contract: it is persisted in SEKAI notes as
// [tanebi-capture-fingerprint:...] and in the Markdown frontmatter — never
// change it without a migration story.

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function recipeFingerprint(recipe: CaptureRecipe): string {
  const normalized = {
    name: recipe.name.trim().toLowerCase(),
    servings: recipe.servings,
    ingredients: recipe.ingredients.map((item) => ({
      amount: item.amount,
      unit: item.unit,
      name: item.name.trim().toLowerCase(),
    })),
    steps: recipe.steps.map((step) => ({
      order: step.order,
      content: step.content.trim().toLowerCase(),
      timer_seconds: step.timer_seconds,
    })),
    description: recipe.description?.trim().toLowerCase() || null,
    prep_time: recipe.prep_time,
    cook_time: recipe.cook_time,
    serving_size_label: recipe.serving_size_label?.trim().toLowerCase() || null,
    tags: [...(recipe.tags || [])].map((tag) => tag.trim().toLowerCase()).sort(),
    notes: recipe.notes?.trim().toLowerCase() || null,
  };
  return crypto.createHash('sha256').update(stableStringify(normalized)).digest('hex');
}

export function newCaptureId(): string {
  return crypto.randomUUID();
}

export function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 160) || 'Receta';
}

export function dateStamp(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Monterrey',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function compactError(error: unknown): string {
  if (!error) return 'Unknown error';
  if (error instanceof Error) return error.message.slice(0, 1000);
  return String(error).slice(0, 1000);
}
