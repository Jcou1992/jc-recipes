Build ✓ | Jest 258/258 ✓ | Playwright 28/28 (desktop 23, mobile 5) ✓ | No blocking issues

## Technical Notes
- Middleware uses cookie-presence check (no API calls) for routing; server actions use getSession() (JWT local validation); RLS enforces data security
- playwright.config.ts: timeout=60s, fullyParallel=true, workers=50% locally (2 on CI). Setup project writes storageState to tests/e2e/.auth/user.json; all non-auth projects reuse it. Desktop Chrome runs @regression/@smoke/untagged; Mobile Safari runs @mobile|@cross-browser only; Mobile Chrome runs @cross-browser only. WebKit/Mobile Safari is slower; startTransition defers URL updates → use networkidle + element-level timeouts, not waitForURL, for search/filter tests
- E2E seeding: tests/e2e/helpers.ts exports seedRecipe() (Supabase JS API, ~200ms). Never fill /recipes/new by hand unless the test itself covers the form — gate enforces this
- Three Supabase users (see `docs/runbook-seed-users.md`):
  - `jc@sakai.app` — JC personal (owns real recipes)
  - `demo@sakai.app` — demo account shown to friends (owns Classic Smash Burger seed)
  - `test@jc-recipes.local` — QA user for e2e tests (password in .env.local TEST_USER_PASSWORD)
- QA optimization gate: .githooks/pre-commit + scripts/test-gate.mjs run on every commit. Rules and override procedure in CONTRIBUTING_TESTS.md. Baseline in .test-gate/baseline.json (regenerate: `npm run test:gate:bootstrap`)
- Phase 2 features: search+tag filter+sort, serving scaler, unit conversion toggle, cooking mode (/cook), toast system, unsaved-changes warning, copy ingredients, unit autocomplete, print view

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Design Context

**Brand:** Recipe tool branded **SEKAI 世界** (adjacent to JC's restaurant Sakai). Design worthy of both names whether SEKAI or Sakai ever appears prominently.

**Users:** JC primary (phone on kitchen counter, hands dirty, pace fast). Plus demo@ showcase account. May grow to a small circle of shared users (invited chefs/friends). Not a mass-consumer product — no public signup — but every surface must scale gracefully to multiple named users without losing the single-chef voice.

**Personality:** precise, proud, functional. Metaphor: restaurant mise en place — everything visible and within reach, no decorative clutter.

**Palette:** Terracotta (#D4703F) + Gold (#EDD18E) + Ink/Bone. Dark default, light override via `data-theme`. OKLCH tokens throughout.

**Typography:** Cormorant Garamond (body) + Noto Serif JP (display) + Barlow Condensed (labels). Font-size preference SM/MD/LG stored per-browser.

**Principles:**
1. Every pixel earns its place — no decoration without function
2. Legibility under pressure — kitchen lighting, wet hands, fast pace
3. Polish, don't rebuild — refinement over reinvention
4. Restaurant-grade finish — worthy of the Sakai name
5. Speed over everything — optimistic UI, no waiting

**Anti-references** (resist even as audience grows):
- Engagement-driven consumer feed (streaks, badges, social counts, recommendation carousels, stock hero photos, upsell CTAs)
- Lifestyle cooking blog (soft watercolor, "rustic" illustration, long narrative preambles)
- Generic notes app with a recipe plugin (every field exists because cooking needs it)
- SaaS marketing homepage (no pricing tables, testimonial rows, landing-page patterns — users arrive logged-in, not landing)

Full context: `.impeccable.md`

## Context Navigation:
When you need to understand the codebase, docs, or any files in this project:
1. ALWAYS query the knowledge graph first: `/graphify query "your question"`
2. Only read raw files if I explicitly say "read the file" or "look at the raw file"
3. Use `graphify-out/wiki/index.md` as your navigation entrypoint for browsing structure.
