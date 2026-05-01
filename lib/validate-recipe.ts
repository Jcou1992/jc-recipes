import type { Ingredient, MacroValues, RecipePayload, Step } from '@/types/recipe';
import {
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_RECIPE,
  sanitizeTags,
} from '@/lib/bulk-recipes-tags';

// Mirror DB CHECK constraints in supabase/migrations/20260501000000_recipe_invariants.sql.
// Update both files together when changing limits.
const MAX_RECIPE_NAME_LENGTH = 200;
const MAX_SERVINGS = 999;
const MAX_TIME_MINUTES = 1440;
const MAX_LONG_TEXT_LENGTH = 5000;
const MAX_PHOTOS = 10;
const MAX_INGREDIENTS = 100;
const MAX_STEPS = 100;
const MAX_INGREDIENT_AMOUNT = 1_000_000;
const MAX_INGREDIENT_UNIT_LENGTH = 32;
const MAX_INGREDIENT_NAME_LENGTH = 200;
const MAX_STEP_CONTENT_LENGTH = 2000;
const MAX_TIMER_SECONDS = 86400;
const MAX_SERVING_SIZE_LABEL_LENGTH = 40;

type RecipePayloadRecord = Partial<Record<keyof RecipePayload, unknown>>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function validateNullableText(
  value: unknown,
  label: string,
  maxLength: number,
): { error: string } | null {
  if (value == null) return null;
  if (typeof value !== 'string') return { error: `${label} must be text.` };
  if (value.length > maxLength) return { error: `${label} must be ${maxLength} characters or fewer.` };
  return null;
}

function validateMacroValues(value: unknown): { error: string } | null {
  if (!isRecord(value)) return { error: 'Macro overrides must be a nutrition object.' };
  const fields: Array<keyof MacroValues> = ['kcal', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g'];
  for (const field of fields) {
    const macro = value[field];
    if (!isFiniteNumber(macro) || macro < 0) {
      return { error: 'Macro override values must be finite non-negative numbers.' };
    }
  }
  return null;
}

function validateIngredient(value: unknown, index: number): { error: string } | null {
  if (!isRecord(value)) return { error: `Ingredient ${index + 1} must be an object.` };
  const ingredient = value as Partial<Ingredient>;

  if (!isFiniteNumber(ingredient.amount) || ingredient.amount < 0 || ingredient.amount > MAX_INGREDIENT_AMOUNT) {
    return { error: `Ingredient ${index + 1} amount must be between 0 and ${MAX_INGREDIENT_AMOUNT}.` };
  }

  if (ingredient.unit != null) {
    if (typeof ingredient.unit !== 'string') return { error: `Ingredient ${index + 1} unit must be text.` };
    if (ingredient.unit.length > MAX_INGREDIENT_UNIT_LENGTH) {
      return { error: `Ingredient ${index + 1} unit must be ${MAX_INGREDIENT_UNIT_LENGTH} characters or fewer.` };
    }
  }

  if (typeof ingredient.name !== 'string' || ingredient.name.trim().length === 0) {
    return { error: `Ingredient ${index + 1} needs a name.` };
  }
  if (ingredient.name.length > MAX_INGREDIENT_NAME_LENGTH) {
    return { error: `Ingredient ${index + 1} name must be ${MAX_INGREDIENT_NAME_LENGTH} characters or fewer.` };
  }

  if (ingredient.fdc_id != null && (!isFiniteInteger(ingredient.fdc_id) || ingredient.fdc_id <= 0)) {
    return { error: `Ingredient ${index + 1} USDA match must be a positive integer.` };
  }

  if (ingredient.macros_override != null) {
    const macroError = validateMacroValues(ingredient.macros_override);
    if (macroError) return macroError;
  }

  return null;
}

function validateStep(value: unknown, index: number): { error: string } | null {
  if (!isRecord(value)) return { error: `Step ${index + 1} must be an object.` };
  const step = value as Partial<Step>;

  if (!isFiniteInteger(step.order)) return { error: `Step ${index + 1} order must be an integer.` };
  if (typeof step.content !== 'string' || step.content.trim().length === 0) {
    return { error: `Step ${index + 1} needs instructions.` };
  }
  if (step.content.length > MAX_STEP_CONTENT_LENGTH) {
    return { error: `Step ${index + 1} instructions must be ${MAX_STEP_CONTENT_LENGTH} characters or fewer.` };
  }
  if (
    step.timer_seconds != null &&
    (!isFiniteInteger(step.timer_seconds) || step.timer_seconds < 0 || step.timer_seconds > MAX_TIMER_SECONDS)
  ) {
    return { error: `Step ${index + 1} timer must be between 0 and ${MAX_TIMER_SECONDS} seconds.` };
  }

  return null;
}

export function validateRecipePayload(payload: RecipePayload): { error: string } | null {
  if (!isRecord(payload)) return { error: 'Recipe payload is invalid.' };
  const p = payload as RecipePayloadRecord;

  if (typeof p.name !== 'string' || p.name.trim().length === 0) {
    return { error: 'Recipe name is required.' };
  }
  if (p.name.length > MAX_RECIPE_NAME_LENGTH) {
    return { error: `Recipe name must be ${MAX_RECIPE_NAME_LENGTH} characters or fewer.` };
  }

  if (!isFiniteInteger(p.servings) || p.servings < 1 || p.servings > MAX_SERVINGS) {
    return { error: `Servings must be a whole number between 1 and ${MAX_SERVINGS}.` };
  }

  for (const [field, label] of [
    ['prep_time', 'Prep time'],
    ['cook_time', 'Cook time'],
  ] as const) {
    const value = p[field];
    if (value != null && (!isFiniteInteger(value) || value < 0 || value > MAX_TIME_MINUTES)) {
      return { error: `${label} must be between 0 and ${MAX_TIME_MINUTES} minutes.` };
    }
  }

  const descriptionError = validateNullableText(p.description, 'Description', MAX_LONG_TEXT_LENGTH);
  if (descriptionError) return descriptionError;

  const notesError = validateNullableText(p.notes, 'Notes', MAX_LONG_TEXT_LENGTH);
  if (notesError) return notesError;

  if (p.serving_size_label != null) {
    if (typeof p.serving_size_label !== 'string') {
      return { error: 'Serving size label must be text.' };
    }
    if (p.serving_size_label.trim().length > MAX_SERVING_SIZE_LABEL_LENGTH) {
      return { error: `Serving size label must be ${MAX_SERVING_SIZE_LABEL_LENGTH} characters or fewer.` };
    }
  }

  if (p.tags != null) {
    if (!Array.isArray(p.tags) || p.tags.some(tag => typeof tag !== 'string')) {
      return { error: 'Tags must be a list of text labels.' };
    }
    const tags = sanitizeTags(p.tags);
    if (tags.length > MAX_TAGS_PER_RECIPE) {
      return { error: `Recipes may have at most ${MAX_TAGS_PER_RECIPE} tags.` };
    }
    if (tags.some(tag => tag.length > MAX_TAG_LENGTH)) {
      return { error: `Tags must be ${MAX_TAG_LENGTH} characters or fewer.` };
    }
  }

  if (p.photos != null) {
    if (!Array.isArray(p.photos) || p.photos.some(photo => typeof photo !== 'string' || photo.trim().length === 0)) {
      return { error: 'Photos must be a list of non-empty strings.' };
    }
    if (p.photos.length > MAX_PHOTOS) return { error: `Recipes may have at most ${MAX_PHOTOS} photos.` };
  }

  if (!Array.isArray(p.ingredients)) return { error: 'Ingredients must be a list.' };
  if (p.ingredients.length > MAX_INGREDIENTS) {
    return { error: `Recipes may have at most ${MAX_INGREDIENTS} ingredients.` };
  }
  for (let i = 0; i < p.ingredients.length; i++) {
    const error = validateIngredient(p.ingredients[i], i);
    if (error) return error;
  }

  if (!Array.isArray(p.steps)) return { error: 'Steps must be a list.' };
  if (p.steps.length > MAX_STEPS) return { error: `Recipes may have at most ${MAX_STEPS} steps.` };
  for (let i = 0; i < p.steps.length; i++) {
    const error = validateStep(p.steps[i], i);
    if (error) return error;
  }

  return null;
}
