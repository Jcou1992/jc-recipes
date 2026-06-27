# Project Structure — jc-recipes (SEKAI 世界)

A map of the repository: what each directory holds, where to find things, and which
folders are load-bearing for the build/test/deploy pipeline (so they aren't moved casually).

> Reorg note: app code is being consolidated under `src/` (see the migration in this branch).
> This document describes the current layout; paths marked _(→ src/)_ move into `src/`.

## Stack

Next.js 15 (App Router) · React 19 · Supabase (SSR auth + Postgres + RLS) · Tailwind v4 ·
TypeScript 6 · Jest (unit) · Playwright (e2e) · OpenNext → Cloudflare Workers.
A **separate** `mcp/` Cloudflare Worker exposes recipe tools to AI clients over OAuth.

## Top-level map

| Path | Kind | What it is |
|---|---|---|
| `app/` _(→ src/)_ | frontend + backend | Next.js routes (App Router). `app/actions/` = server actions (data mutations, auth). |
| `components/` _(→ src/)_ | frontend | React components: `ui/` (generic + `ui/brut/` brutalist design system), `recipes/`, `motion/`, `onboarding/`, `auth/`, `settings/`. |
| `lib/` _(→ src/)_ | shared logic | `macros/` (nutrition/units), `brut/`, `motion/`, `supabase/` (auth middleware/server), `utils/` (export, parse, scale), `hooks/`, i18n, preferences, validation. |
| `types/` _(→ src/)_ | shared | TypeScript types (`recipe.ts`, `preferences.ts`, `global.d.ts`). |
| `styles/` _(→ src/)_ | assets | `tokens-brutalist.css` (design tokens). `app/globals.css` holds the rest. |
| `middleware.ts` _(→ src/)_ | backend | Next.js middleware — cookie-presence routing (no API calls). |
| `tests/e2e/` | tests | Playwright specs + `helpers.ts` (`seedRecipe`), `global.setup.ts`, `.auth/`. **Do not move** — pinned in `playwright.config.ts` + `.test-gate/baseline.json`. |
| `scripts/` | tooling | `test-gate.mjs`, `hot-token-lint.mjs`, `seed-users.mjs`, `gen-icons.mjs`, `contest-screenshots-*.mjs`. **Do not move** — pinned in `.githooks/`, CI, `package.json`. |
| `public/` | assets | PWA icons, manifest, favicon (Next.js convention — served from `/`). |
| `supabase/migrations/` | infrastructure | Postgres schema + RLS, timestamped SQL migrations. |
| `mcp/` | backend (separate deploy) | Standalone Cloudflare Worker (own `package.json`/`tsconfig`/`wrangler.jsonc`). Reads three shared files from `lib/`+`types/`. |
| `docs/` | docs | `plans/`, `specs/`, `ideation/`, runbooks, `design-history/`. |
| `graphify-out/` | generated | Knowledge-graph output (regenerable via `graphify update .`; `cache/` is gitignored). |
| `.githooks/`, `.test-gate/` | tooling | Pre-commit QA gate + its baseline. **Do not move.** |

## Path alias

`@/*` → repo root (`tsconfig.json` `paths`, mirrored in `jest.config.js` `moduleNameMapper`).
Every `@/` import targets `app`/`components`/`lib`/`types`. _(After the src/ move: `@/*` → `src/`.)_
`mcp/` is **excluded** from the root tsconfig — it is a separate package and the app never imports it.

## Tests

- **Unit (Jest):** co-located in `**/__tests__/*.test.ts`. Run `npm test`.
- **E2E (Playwright):** `tests/e2e/*.spec.ts`. Run `npm run test:e2e` (or `:smoke` / `:desktop` / `:mobile`).
- **QA gate:** `.githooks/pre-commit` runs `scripts/test-gate.mjs` + `scripts/hot-token-lint.mjs` on every commit. Rules + override in `CONTRIBUTING_TESTS.md`.

## Build & deploy

- App: `npm run build` (Next) → `npm run cf:deploy` (OpenNext → Cloudflare). GH Action auto-deploys on push.
- MCP: deployed independently from `mcp/` via its own `wrangler`. Not part of the app build.

## Where to look first

- Architecture / "what calls what": `graphify-out/GRAPH_REPORT.md`.
- Design intent: `CLAUDE.md` (Design Context) + `docs/design-history/`.
- Test policy: `CONTRIBUTING_TESTS.md`.
