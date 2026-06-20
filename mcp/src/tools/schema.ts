import { z } from 'zod';

// Zod fragments mirroring RecipePayload, with descriptions that steer the
// client's LLM. Validation is advisory here — validateRecipePayload (server) is
// the real trust boundary.

const UNIT_HINT =
  'Unit, e.g. g, kg, mg, ml, l, dl, cup, tbsp, tsp, oz, lb, fl oz, pinch, dash, ' +
  'clove, slice, piece, can, bunch, handful, sprig. Use null when unitless (e.g. "2 eggs").';

const ingredient = z.object({
  amount: z.number().min(0).max(1_000_000).describe('Quantity, e.g. 200 for 200 g.'),
  unit: z.string().max(32).nullable().describe(UNIT_HINT),
  name: z.string().min(1).max(200).describe('Ingredient name, e.g. "all-purpose flour".'),
});

const step = z.object({
  order: z.number().int().describe('1-based step number.'),
  content: z.string().min(1).max(2000).describe('Instruction text for this step.'),
  timer_seconds: z
    .number()
    .int()
    .min(0)
    .max(86400)
    .nullable()
    .describe('Optional countdown timer for this step, in seconds; else null.'),
});

export const createRecipeShape = {
  name: z.string().min(1).max(200).describe('Recipe title.'),
  servings: z.number().int().min(1).max(999).describe('Servings the recipe yields.'),
  ingredients: z.array(ingredient).max(100).describe('List of ingredients.'),
  steps: z.array(step).max(100).describe('Ordered preparation steps.'),
  description: z.string().max(5000).nullable().optional().describe('Short summary.'),
  prep_time: z.number().int().min(0).max(1440).nullable().optional().describe('Prep time (minutes).'),
  cook_time: z.number().int().min(0).max(1440).nullable().optional().describe('Cook time (minutes).'),
  serving_size_label: z.string().max(40).nullable().optional().describe('e.g. "per slice".'),
  tags: z
    .array(z.string().max(32))
    .max(20)
    .nullable()
    .optional()
    .describe('Lowercase tags, e.g. ["dinner","vegan"].'),
  notes: z.string().max(5000).nullable().optional().describe('Freeform notes.'),
};

export const searchRecipesShape = {
  query: z.string().min(1).max(200).optional().describe('Text to match against recipe names.'),
  tags: z
    .array(z.string().max(32))
    .max(20)
    .optional()
    .describe('Only recipes containing ALL these tags.'),
  limit: z.number().int().min(1).max(50).optional().describe('Max results (default 20).'),
};

export const getRecipeShape = {
  id: z.string().uuid().describe('Recipe id (UUID) from search_recipes or create_recipe.'),
};
