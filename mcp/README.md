# sekai-mcp

Remote **MCP server** for SEKAI recipes. Lets a user drive the app from their own
AI client (Claude.ai, ChatGPT) — the client calls these tools; the app stores no
LLM keys and pays no per-token cost.

Separate Cloudflare Worker (`sekai-mcp`) so it doesn't touch the OpenNext app
worker. Reuses the app's recipe types + `validateRecipePayload` + `sanitizeTags`
by relative import (one source of truth). Recipe ops live in `src/core/` so a CLI
or Claude Code Skill can reuse them later.

## Tools (v1)
- `create_recipe` — validate + insert a recipe into the signed-in account.
- `search_recipes` — by name / tags.
- `get_recipe` — full recipe by id.

All scoped to the user via Supabase **RLS** (`auth.uid() = user_id`). The worker
never uses the service-role key.

## Auth
OAuth 2.1 via `@cloudflare/workers-oauth-provider`. `/authorize` renders a SEKAI
login that signs the user into Supabase; the session is carried in the grant's
`props` and refreshed per call (rotated refresh token persisted via `updateProps`).

## One-time setup
```bash
cd mcp
npm ci
npx wrangler kv namespace create OAUTH_KV   # paste the id into wrangler.jsonc
# secrets (reuse the app's Supabase values; cookie key = openssl rand -hex 32):
npx wrangler secret put SUPABASE_URL --name sekai-mcp
npx wrangler secret put SUPABASE_ANON_KEY --name sekai-mcp
npx wrangler secret put COOKIE_ENCRYPTION_KEY --name sekai-mcp
```

## Local dev
```bash
cp .dev.vars.example .dev.vars   # fill in real values
npm run cf-typegen               # generates worker-configuration.d.ts (gitignored)
npm run typecheck
npm run dev                      # wrangler dev
```

## Deploy (manual)
```bash
cd mcp && npx wrangler deploy
```

## Connect a client
Claude.ai → Settings → Connectors → Add custom connector →
`https://sekai-mcp.<subdomain>.workers.dev/mcp` → sign in with a SEKAI user.
ChatGPT: Connectors / Developer mode, same URL. Gemini consumer app: not yet supported.
