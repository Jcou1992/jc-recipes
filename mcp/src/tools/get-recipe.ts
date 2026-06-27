import type { Recipe } from '../../../src/types/recipe';
import type { SekaiMcp } from '../mcp-agent';
import { getRecipeForUser } from '../core/recipe-service';
import { getRecipeShape } from './schema';

function renderRecipe(r: Recipe, appBaseUrl: string): string {
  const lines: string[] = [`# ${r.name}`, `Servings: ${r.servings}`];
  if (r.description) lines.push('', r.description);
  if (r.prep_time != null || r.cook_time != null) {
    const parts: string[] = [];
    if (r.prep_time != null) parts.push(`prep ${r.prep_time} min`);
    if (r.cook_time != null) parts.push(`cook ${r.cook_time} min`);
    lines.push('', parts.join(' · '));
  }
  lines.push('', '## Ingredients');
  for (const ing of r.ingredients) {
    const unit = ing.unit ? ` ${ing.unit}` : '';
    lines.push(`- ${ing.amount}${unit} ${ing.name}`);
  }
  lines.push('', '## Steps');
  for (const step of [...r.steps].sort((a, b) => a.order - b.order)) {
    const timer = step.timer_seconds ? ` (timer: ${step.timer_seconds}s)` : '';
    lines.push(`${step.order}. ${step.content}${timer}`);
  }
  if (r.notes) lines.push('', '## Notes', r.notes);
  if (r.tags && r.tags.length) lines.push('', `Tags: ${r.tags.join(', ')}`);
  lines.push('', `${appBaseUrl}/recipes/${r.id}`);
  return lines.join('\n');
}

export function registerGetRecipe(agent: SekaiMcp): void {
  agent.server.registerTool(
    'get_recipe',
    {
      title: 'Get recipe',
      description: 'Fetch one recipe (full ingredients + steps) by its id from the signed-in SEKAI account.',
      inputSchema: getRecipeShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const client = await agent.authedClient();
      const result = await getRecipeForUser(client, args.id);

      if (!result.ok) {
        return { isError: true, content: [{ type: 'text', text: result.error }] };
      }

      return {
        content: [{ type: 'text', text: renderRecipe(result.data, agent.appBaseUrl) }],
        structuredContent: result.data as unknown as Record<string, unknown>,
      };
    },
  );
}
