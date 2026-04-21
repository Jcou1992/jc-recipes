Current phase: 2 - Cooking Companion | Status: COMPLETE
Last completed: Phase 2 fully done — build ✓, Playwright e2e 96/96 ✓
Blocking issues: none
Next action: Start Phase 3 (see docs/phase-3.md if it exists)
Notes:
- Middleware uses cookie-presence check (no API calls) for routing; server actions use getSession() (JWT local validation); RLS enforces data security
- playwright.config.ts: timeout=60s, workers=1 (Mobile Safari WebKit is slower; startTransition defers URL updates, so use networkidle waits + element-level timeouts instead of waitForURL for search/filter tests)
- Test user: test@jc-recipes.local (password in .env.local TEST_USER_PASSWORD)
- Phase 2 features: search+tag filter+sort, serving scaler, unit conversion toggle, cooking mode (/cook), toast system, unsaved-changes warning, copy ingredients, unit autocomplete, print view

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Design Context

**Brand:** Personal recipe app. May carry the name "Sakai" (JC's restaurant) — design should be worthy of that name whether it appears or not.

**Users:** JC only. Phone on kitchen counter mid-cook. Hands dirty, pace fast. Job: find recipe, scale it, cook it.

**Personality:** precise, proud, functional. Metaphor: restaurant mise en place — everything visible and within reach, no decorative clutter.

**Palette:** Terracotta (#D4703F) + Gold (#EDD18E) + Ink/Bone. Dark default. Keep and polish — do not rethink.

**Typography:** Cormorant Garamond (body) + Noto Serif JP (display) + Barlow Condensed (labels). Keep and tighten hierarchy.

**Principles:**
1. Every pixel earns its place — no decoration without function
2. Legibility under pressure — kitchen lighting, wet hands, fast pace
3. Polish, don't rebuild — refinement over reinvention
4. Restaurant-grade finish — worthy of the Sakai name
5. Speed over everything — optimistic UI, no waiting

**Anti-references:** AllRecipes/Yummly consumer UX, lifestyle cooking blogs, generic notes apps

Full context: `.impeccable.md`

## Context Navigation:
When you need to understand the codebase, docs, or any files in this project:
1. ALWAYS query the knowledge graph first: `/graphify query "your question"`
2. Only read raw files if I explicitly say "read the file" or "look at the raw file"
3. Use `graphify-out/wiki/index.md` as your navigation entrypoint for browsing structure.
