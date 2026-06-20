import type { SekaiMcp } from '../mcp-agent';
import { searchRecipesForUser } from '../core/recipe-service';
import { searchRecipesShape } from './schema';

export function registerSearchRecipes(agent: SekaiMcp): void {
  agent.server.registerTool(
    'search_recipes',
    {
      title: 'Search recipes',
      description:
        "Search the signed-in SEKAI account's recipes by name and/or tags. Returns a list " +
        'with names and links. Use get_recipe for full details.',
      inputSchema: searchRecipesShape,
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true },
    },
    async (args) => {
      const client = await agent.authedClient();
      const result = await searchRecipesForUser(client, {
        query: args.query,
        tags: args.tags,
        limit: args.limit,
      });

      if (!result.ok) {
        return { isError: true, content: [{ type: 'text', text: `Search failed: ${result.error}` }] };
      }

      const text = result.data.length
        ? result.data
            .map((r, i) => {
              const tags = r.tags && r.tags.length ? ` [${r.tags.join(', ')}]` : '';
              return `${i + 1}. ${r.name}${tags} — ${agent.appBaseUrl}/recipes/${r.id}`;
            })
            .join('\n')
        : 'No recipes found.';

      return { content: [{ type: 'text', text }], structuredContent: { results: result.data } };
    },
  );
}
