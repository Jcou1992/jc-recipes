import { z } from 'zod';

// Ported unchanged from the Tanebi Recipe Scribe package (backend/src/schema.js).
// This IS the GPT Action contract — keep in lockstep with ../openapi.yaml.

const nullableText = (max: number) => z.string().max(max).nullable().optional();

export const ingredientSchema = z
  .object({
    amount: z.number().min(0).max(1_000_000),
    unit: z.string().max(32).nullable(),
    name: z.string().min(1).max(200),
  })
  .strict();

export const stepSchema = z
  .object({
    order: z.number().int().min(1),
    content: z.string().min(1).max(2000),
    timer_seconds: z.number().int().min(0).max(86400).nullable(),
  })
  .strict();

export const recipeSchema = z
  .object({
    name: z.string().min(1).max(200),
    servings: z.number().int().min(1).max(999),
    ingredients: z.array(ingredientSchema).min(1).max(100),
    steps: z.array(stepSchema).min(1).max(100),
    description: nullableText(5000),
    prep_time: z.number().int().min(0).max(1440).nullable().optional(),
    cook_time: z.number().int().min(0).max(1440).nullable().optional(),
    serving_size_label: nullableText(40),
    tags: z.array(z.string().max(32)).max(20).nullable().optional(),
    notes: nullableText(5000),
  })
  .strict()
  .transform((recipe) => ({
    ...recipe,
    description: recipe.description ?? null,
    prep_time: recipe.prep_time ?? null,
    cook_time: recipe.cook_time ?? null,
    serving_size_label: recipe.serving_size_label ?? null,
    tags: recipe.tags ?? [],
    notes: recipe.notes ?? null,
    steps: [...recipe.steps]
      .sort((a, b) => a.order - b.order)
      .map((step, index) => ({ ...step, order: index + 1 })),
  }));

export const captureRequestSchema = z
  .object({
    captureId: z.string().max(100).nullable().optional(),
    source: z
      .object({
        type: z.enum(['text', 'dictation', 'photo', 'conversation', 'combined', 'unknown']),
        language: z.string().min(2).max(20).default('es-MX'),
        originalText: nullableText(100000),
        notes: nullableText(5000),
      })
      .strict(),
    recipes: z.array(recipeSchema).min(1).max(10),
    options: z
      .object({
        saveToSekai: z.boolean().default(true),
        saveToDrive: z.boolean().default(true),
        duplicatePolicy: z.enum(['reuse', 'version', 'error']).default('version'),
      })
      .strict()
      .optional(),
  })
  .strict()
  .transform((payload) => ({
    ...payload,
    captureId: payload.captureId || null,
    options: {
      saveToSekai: payload.options?.saveToSekai ?? true,
      saveToDrive: payload.options?.saveToDrive ?? true,
      duplicatePolicy: payload.options?.duplicatePolicy ?? 'version',
    },
  }));

export type CaptureRecipe = z.infer<typeof recipeSchema>;
export type CaptureRequest = z.infer<typeof captureRequestSchema>;
export type CaptureSource = CaptureRequest['source'];
export type CaptureOptions = CaptureRequest['options'];
