import type { RecipePayload } from '../../../src/types/recipe';
import type { SekaiMcp } from '../mcp-agent';
import { createRecipeForUser } from '../core/recipe-service';
import { createRecipeShape } from './schema';

export function registerCreateRecipe(agent: SekaiMcp): void {
  agent.server.registerTool(
    'create_recipe',
    {
      title: 'Create recipe',
      description:
        'Save a new recipe to the signed-in SEKAI account. Provide a title, servings, ' +
        'ingredients, and ordered steps. Returns a link to the saved recipe.',
      inputSchema: createRecipeShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    async (args) => {
      const payload: RecipePayload = {
        name: args.name,
        servings: args.servings,
        ingredients: args.ingredients.map((i) => ({ amount: i.amount, unit: i.unit, name: i.name })),
        steps: args.steps.map((s) => ({
          order: s.order,
          content: s.content,
          timer_seconds: s.timer_seconds,
        })),
        description: args.description ?? null,
        prep_time: args.prep_time ?? null,
        cook_time: args.cook_time ?? null,
        serving_size_label: args.serving_size_label ?? null,
        tags: args.tags ?? null,
        notes: args.notes ?? null,
        photos: null,
      };

      const client = await agent.authedClient();
      const result = await createRecipeForUser(client, payload, agent.requireUserId());

      if (!result.ok) {
        return { isError: true, content: [{ type: 'text', text: `Couldn't save recipe: ${result.error}` }] };
      }

      const url = `${agent.appBaseUrl}/recipes/${result.data.id}`;
      return {
        content: [{ type: 'text', text: `Created "${payload.name}". View it at ${url}` }],
        structuredContent: { id: result.data.id, url },
      };
    },
  );
}
