import type { RecipePayload } from '../../../src/types/recipe';
import type { SekaiMcp } from '../mcp-agent';
import { updateRecipeForUser } from '../core/recipe-service';
import { updateRecipeShape } from './schema';

export function registerUpdateRecipe(agent: SekaiMcp): void {
  agent.server.registerTool(
    'update_recipe',
    {
      title: 'Update recipe',
      description:
        'Modify an existing recipe in the signed-in SEKAI account. Provide the recipe id plus ' +
        'only the fields to change; omitted fields keep their current value. A provided list ' +
        '(ingredients, steps, tags) replaces the whole list — send it complete.',
      inputSchema: updateRecipeShape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
    },
    async (args) => {
      const partial: Partial<RecipePayload> = {};
      if (args.name !== undefined) partial.name = args.name;
      if (args.servings !== undefined) partial.servings = args.servings;
      if (args.ingredients !== undefined) {
        partial.ingredients = args.ingredients.map((i) => ({ amount: i.amount, unit: i.unit, name: i.name }));
      }
      if (args.steps !== undefined) {
        partial.steps = args.steps.map((s) => ({
          order: s.order,
          content: s.content,
          timer_seconds: s.timer_seconds,
        }));
      }
      if (args.description !== undefined) partial.description = args.description;
      if (args.prep_time !== undefined) partial.prep_time = args.prep_time;
      if (args.cook_time !== undefined) partial.cook_time = args.cook_time;
      if (args.serving_size_label !== undefined) partial.serving_size_label = args.serving_size_label;
      if (args.tags !== undefined) partial.tags = args.tags;
      if (args.notes !== undefined) partial.notes = args.notes;

      const client = await agent.authedClient();
      const result = await updateRecipeForUser(client, args.id, partial, agent.requireUserId());

      if (!result.ok) {
        return { isError: true, content: [{ type: 'text', text: `Couldn't update recipe: ${result.error}` }] };
      }

      const url = `${agent.appBaseUrl}/recipes/${result.data.id}`;
      return {
        content: [{ type: 'text', text: `Updated "${result.data.name}". View it at ${url}` }],
        structuredContent: { id: result.data.id, url },
      };
    },
  );
}
