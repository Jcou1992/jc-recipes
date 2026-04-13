Current phase: 2 - Cooking Companion | Status: COMPLETE
Last completed: Phase 2 fully done — build ✓, Playwright e2e 96/96 ✓
Blocking issues: none
Next action: Start Phase 3 (see docs/phase-3.md if it exists)
Notes:
- Middleware uses cookie-presence check (no API calls) for routing; server actions use getSession() (JWT local validation); RLS enforces data security
- playwright.config.ts: timeout=60s, workers=1 (Mobile Safari WebKit is slower; startTransition defers URL updates, so use networkidle waits + element-level timeouts instead of waitForURL for search/filter tests)
- Test user: test@jc-recipes.local (password in .env.local TEST_USER_PASSWORD)
- Phase 2 features: search+tag filter+sort, serving scaler, unit conversion toggle, cooking mode (/cook), toast system, unsaved-changes warning, copy ingredients, unit autocomplete, print view
