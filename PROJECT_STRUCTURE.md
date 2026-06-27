# Project Structure — jc-recipes (SEKAI 世界)

A map of the repository: what each directory holds, where to find things, and which
folders are load-bearing for the build/test/deploy pipeline (so they aren't moved casually).

## Stack

Next.js 15 (App Router) · React 19 · Supabase (SSR auth + Postgres + RLS) · Tailwind v4 ·
TypeScript 6 · Jest (unit) · Playwright (e2e) · OpenNext → Cloudflare Workers.
A **separate** `mcp/` Cloudflare Worker exposes recipe tools to AI clients over OAuth.

## Top-level map

All application code lives under `src/`. The repo root holds only `src/`, config files,
and support directories (tests, scripts, assets, infra, docs).

| Path | Kind | What it is |
|---|---|---|
| `src/app/` | frontend + backend | Next.js routes (App Router). `src/app/actions/` = server actions (data mutations, auth). |
| `src/components/` | frontend | React components: `ui/` (generic + `ui/brut/` brutalist design system), `recipes/`, `motion/`, `onboarding/`, `auth/`, `settings/`. |
| `src/lib/` | shared logic | `macros/` (nutrition/units), `brut/`, `motion/`, `supabase/` (auth middleware/server), `utils/`, `hooks/`, i18n, preferences, validation. |
| `src/types/` | shared | TypeScript types (`recipe.ts`, `preferences.ts`, `global.d.ts`). |
| `src/styles/` | assets | `tokens-brutalist.css` (design tokens). `src/app/globals.css` holds the rest. |
| `src/middleware.ts` | backend | Next.js middleware — cookie-presence routing (no API calls). |
| `tests/e2e/` | tests | Playwright specs + `helpers.ts` (`seedRecipe`), `global.setup.ts`, `.auth/`. **Do not move** — pinned in `playwright.config.ts` + `.test-gate/baseline.json`. |
| `scripts/` | tooling | `test-gate.mjs`, `hot-token-lint.mjs`, `seed-users.mjs`, `gen-icons.mjs`. **Do not move** — pinned in `.githooks/`, CI, `package.json`. |
| `public/` | assets | PWA icons, manifest, favicon (Next.js convention — served from `/`). |
| `supabase/migrations/` | infrastructure | Postgres schema + RLS, timestamped SQL migrations. |
| `mcp/` | backend (separate deploy) | Standalone Cloudflare Worker (own `package.json`/`tsconfig`/`wrangler.jsonc`). Imports three shared files from `src/lib/`+`src/types/`. |
| `docs/` | docs | `plans/`, `specs/`, `ideation/`, `design-history/` (contest archive), runbooks. |
| `graphify-out/` | generated | Knowledge-graph output (regenerable via `graphify update .`; `cache/` is gitignored). |
| `.githooks/`, `.test-gate/` | tooling | Pre-commit QA gate + its baseline. **Do not move.** |

## Path alias

`@/*` → `src/*` (`tsconfig.json` + `jsconfig.json` `paths`, mirrored in `jest.config.js`
`moduleNameMapper` as `<rootDir>/src/$1`). Every `@/` import targets `src/{app,components,lib,types}`.

`mcp/` is **excluded** from the root `tsconfig.json` — it is a separate package with its own
Cloudflare-Workers tsconfig, and the app never imports from it. The MCP Worker reaches three
shared files via deep relative imports (`../../../src/{lib,types}/…`) plus one esbuild `alias`
in `mcp/wrangler.jsonc`; both are updated to point at `src/`.

## Tests

- **Unit (Jest):** co-located in `src/**/__tests__/*.test.ts`. Run `npm test`.
- **E2E (Playwright):** `tests/e2e/*.spec.ts`. Run `npm run test:e2e` (or `:smoke` / `:desktop` / `:mobile`).
- **QA gate:** `.githooks/pre-commit` runs `scripts/test-gate.mjs` + `scripts/hot-token-lint.mjs` on every commit. Rules + override in `CONTRIBUTING_TESTS.md`; baseline in `.test-gate/baseline.json`.

## Build & deploy

- App: `npm run build` (Next) → `npm run cf:deploy` (OpenNext → Cloudflare). GH Action auto-deploys on push.
- MCP: deployed independently from `mcp/` via its own `wrangler`. Not part of the app build.

## Where to look first

- Architecture / "what calls what": `graphify-out/GRAPH_REPORT.md`.
- Design intent + history: `CLAUDE.md` (Design Context) + `docs/design-history/`.
- Test policy: `CONTRIBUTING_TESTS.md`.
