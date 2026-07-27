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

// Shared field constraints — create and update must never drift apart.
const nameField = z.string().min(1).max(200);
const servingsField = z.number().int().min(1).max(999);
const ingredientsField = z.array(ingredient).max(100);
const stepsField = z.array(step).max(100);
const descriptionField = z.string().max(5000).nullable();
const prepTimeField = z.number().int().min(0).max(1440).nullable();
const cookTimeField = z.number().int().min(0).max(1440).nullable();
const servingSizeLabelField = z.string().max(40).nullable();
const tagsField = z.array(z.string().max(32)).max(20).nullable();
const notesField = z.string().max(5000).nullable();

export const createRecipeShape = {
  name: nameField.describe('Recipe title.'),
  servings: servingsField.describe('Servings the recipe yields.'),
  ingredients: ingredientsField.describe('List of ingredients.'),
  steps: stepsField.describe('Ordered preparation steps.'),
  description: descriptionField.optional().describe('Short summary.'),
  prep_time: prepTimeField.optional().describe('Prep time (minutes).'),
  cook_time: cookTimeField.optional().describe('Cook time (minutes).'),
  serving_size_label: servingSizeLabelField.optional().describe('e.g. "per slice".'),
  tags: tagsField.optional().describe('Lowercase tags, e.g. ["dinner","vegan"].'),
  notes: notesField.optional().describe('Freeform notes.'),
};

export const updateRecipeShape = {
  id: z.string().uuid().describe('Recipe id (UUID) from search_recipes or create_recipe.'),
  name: nameField.optional().describe('New recipe title. Omit to keep the current one.'),
  servings: servingsField.optional().describe('New servings count. Omit to keep the current one.'),
  ingredients: ingredientsField
    .optional()
    .describe('Full replacement ingredient list — send it complete. Omit to keep the current list.'),
  steps: stepsField
    .optional()
    .describe('Full replacement list of ordered steps — send it complete. Omit to keep the current list.'),
  description: descriptionField.optional().describe('Short summary. Null clears it; omit to keep.'),
  prep_time: prepTimeField.optional().describe('Prep time (minutes). Null clears it; omit to keep.'),
  cook_time: cookTimeField.optional().describe('Cook time (minutes). Null clears it; omit to keep.'),
  serving_size_label: servingSizeLabelField
    .optional()
    .describe('e.g. "per slice". Null clears it; omit to keep.'),
  tags: tagsField
    .optional()
    .describe('Full replacement tag list, lowercase. Null clears all tags; omit to keep.'),
  notes: notesField.optional().describe('Freeform notes. Null clears them; omit to keep.'),
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
