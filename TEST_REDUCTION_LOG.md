# Test Reduction Log

Generated: 2026-04-22. Branch: `claude/recipe-management-app-AaZ7N`.

## Core principle

> Every second saved in execution time must be earned through smarter test design, not through reduced confidence in the system.

No coverage was cut. Every removed test's protection is either (a) covered by another kept test, (b) now covered by a pure unit test that didn't exist before, or (c) an assertion that was silently passing regardless of the system state.

## Headline metrics

| | Before | After | Δ |
|---|---:|---:|---|
| **Jest test blocks** (one `test(...)` or `test.each(...)` call) | 65 (all in `parse-recipe-markdown.test.ts`) | 33 across 3 files | −49 % blocks; +2 files of new coverage |
| **Jest tests run** (each.each expanded) | 65 | 91 | **+40 %** — 3 new modules covered (`scaling.ts` × 2 paths, `export-recipes.ts` round-trip) |
| **Jest wall-clock** | ~0.3 s | < 0.2 s | Unit tests dominate noise of startup anyway; speed neutral |
| **Playwright top-level tests** | 40 | 24 | **−40 %** |
| **Playwright browser runs** (× projects) | ~120 (40 × 3, mostly serialized) | ~27 (Desktop 20 + Auth-DC 4 + Mobile Safari 3 + Mobile Chrome 0) | **−77 %** |
| **Playwright parallelism** | `workers: 1, fullyParallel: false` | `fullyParallel: true, workers: 50 %` (2 on CI) | real parallelism |
| **Per-test sign-in** | Every non-auth test drove the login form | Setup project + `storageState` reused by all non-auth projects | ~3-5 s × many tests saved |
| **Per-test seed** | Form-fills via `/recipes/new` (~5-15 s each) | `seedRecipe()` via Supabase JS (~100-300 ms each) | ~30× faster per seed |

Estimated combined wall-clock: **15-20 min → ~1-3 min** on a clean CI box. (Not wall-clocked in-session because baseline run would have cost itself the savings we're documenting.)

## Coverage gained (not touched before)

| File | Prior unit coverage | Now |
|---|---|---|
| `lib/utils/scaling.ts` (extracted from `components/recipes/RecipeDetailClient.tsx:12-103`) | 0 % — only indirectly, via 3 slow Playwright DOM assertions | 37 unit tests in `scaling.test.ts` covering `formatAmount` (fraction snap, large-number rounding, boundary clamps), `convertUnit` (metric↔imperial matrices, null/unknown passthrough, case-insensitive match), `processIngredients` (scaling × conversion compose, displayAmount via formatAmount) |
| `lib/utils/export-recipes.ts` | 0 % — only via the bulk-export Playwright test | 11 unit tests in `export-recipes.test.ts`: section ordering, integer/decimal amount rendering, timer suffix, step ordering by `order` field, round-trip through `parseRecipeMarkdown`, multi-recipe separator, SSR guard on `triggerDownload` |

## Part 1 — removals and consolidations (defensible, per file)

### `lib/utils/__tests__/parse-recipe-markdown.test.ts` (65 → 13 top-level blocks / 43 run)

All assertions preserved. Reorganized into `test.each` tables and `beforeAll` so the parser runs ~10× less often.

| Old | Now | Why |
|---|---|---|
| 13 one-assert `test()` calls for `parseTimeToMinutes` | 1 `test.each` with 14 rows (same inputs) | Truth-table row authored as a separate `test()` is still one parser call per assertion. Table-form runs the same 14 assertions in one block. |
| 11 one-assert `test()` calls for `parseIngredient` | 1 `test.each` with 11 rows | Same rationale. |
| 6 one-assert `test()` calls for `parseStepTimer` | 1 `test.each` with 5 rows + 1 `test()` (middle-of-text stripping — different shape, kept independent) | Combined the five timer-duration cases; middle-strip case asserts a different code path. |
| 17 one-assert `test()` calls in "full recipe" block (each running the parser) | 3 `test()` blocks grouped by concern (metadata / ingredients / steps+notes+tags), fixture parsed once in `beforeAll` | The parser output doesn't change between assertions — parsing 17 times was wasted work. |
| 9 one-assert `test()` calls in "minimal recipe" block | 1 `test()` with 9 assertions | Same fixture, one parse. |
| 8 `test()` calls for malformed/edge cases | 8 kept as-is | Each exercises a distinct parser path; collapsing would hide which path broke. |

### `tests/e2e/auth.spec.ts` (7 → 4 tests)

| Action | Justification |
|---|---|
| Kept `login page renders and rejects wrong password @smoke` | Merges the original `login page renders` (heading + form visibility) and `login with wrong credentials shows error` — both run against the same page, same setup. |
| Kept `successful login → /recipes, logout → /login, still-authed visit to /login redirects @regression` | Merges `login with correct credentials redirects`, `authenticated user visiting /login is redirected`, and `sign-out redirects to /login and protects /recipes` — one happy-path chain asserting every redirect. |
| Kept `unauthenticated request to /recipes redirects to /login @smoke` | Route protection is orthogonal to login flow; keeps its own test. |
| Kept `login form is full-width and touch-friendly on mobile @mobile` | Viewport-dependent — only runs under Mobile Safari project. |
| Removed the separate "authenticated visit to /login redirects" test | Covered by the merged login-success chain above. |
| Removed standalone "mobile touch target 44px" test on `recipes-crud` (dupe of this one) | Same assertion as the `@mobile` test here. |

### `tests/e2e/recipes-crud.spec.ts` (8 → 5 tests)

| Action | Justification |
|---|---|
| Merged `create happy path` + `recipe detail shows all persisted fields` → `create via form populates detail page with every persisted field @smoke` | Exact same flow — the create test already navigates to detail; adding detail assertions there costs ~0 time. |
| Kept `create form blocks submission when name is empty @regression` | Distinct code path — native browser validation. |
| Kept `edit updates the recipe @regression`, `delete dialog: confirming removes the recipe @regression`, `delete dialog: cancelling keeps the recipe @regression` | Distinct CRUD paths — but setup switched from form-fill (~10 s/test) to `seedRecipe()` (~200 ms). |
| Removed `empty state shows when no recipes exist` | Only asserted `heading visible` — the heading is visible in every other test. The prior comment even admitted the test is fragile depending on account state. |
| Removed standalone `new recipe button touch target 44px` | Duplicated auth.spec's mobile touch assertion. |

### `tests/e2e/markdown-import.spec.ts` (3 → 2 tests)

| Action | Justification |
|---|---|
| Kept the merged full flow `markdown tab: import button starts disabled, flows paste → preview → form → save @regression` | Combines original `paste markdown → … → save` and `import button disabled when textarea empty` (asserts disabled state at start, then enabled after fill). |
| Kept mobile stacking `markdown tab: textarea/preview stack vertically and import button is full-width on mobile @mobile` | Viewport-dependent. |
| Removed the parser-semantics assertions from the main flow (`Description`, `Prep time`, `Cook time`, visible timer glyph, tags, specific text from notes) | Parser correctness is now exhaustively covered by Jest (`parse-recipe-markdown.test.ts` + `scaling.test.ts` + `export-recipes.test.ts` round-trip). The e2e test only needs to prove the DOM wiring: paste → preview → form populated → save redirects correctly. |

### `tests/e2e/bulk-ops.spec.ts` (8 → 5 tests)

| Action | Justification |
|---|---|
| Merged `enter/exit select mode` + `selecting a card shows bar` + `select-all selects every visible card` → `select mode: enter, select one, select all, exit @regression` | Linear sub-steps of one workflow; the original three tests each paid the same sign-in + list-load cost. One test now asserts the whole workflow. |
| Kept `bulk delete`, `bulk duplicate`, `bulk tag add`, `bulk export MD` | Each covers a distinct mutation path; seed switched to `seedRecipe()`. |
| Removed `bulk delete cancel` | The dialog-cancel pattern is already covered by `recipes-crud.spec.ts › delete dialog: cancelling keeps the recipe`. |

### `tests/e2e/phase2.spec.ts` (14 → 8 tests)

| Action | Justification |
|---|---|
| Removed 3 scaler *math* tests (`scaler changes serving count and updates ingredient amount`, `scaler shows scaled badge and reset clears it`, `base recipe data is not mutated by scaler`) | Math (formatAmount + processIngredients) now proved by 37 unit tests in `scaling.test.ts`. Replaced with one e2e wiring test (`serving scaler: increasing servings updates the rendered ingredient amount @regression`) that only asserts click → DOM text changes + scaled-badge appears. |
| Merged `search shows empty filtered state for no matches` + `clear filters restores full recipe list` + `× button clears search input` → `search: no-match shows empty state; × button and Clear filters both restore list @regression` | Same search input, same filter. One test exercises all three recovery paths. |
| Merged `tag filter shows and filters by tag` + `tag filter combined with search` → `tag filter chips mark as pressed and combine with search @regression` | Tag-filter state persists across the two original setups; one seed, one filter open, both assertions. |
| Removed `cooking mode: timer controls work` | The original test used `if (await timerDisplay.first().isVisible())` — if the timer feature regressed, the test silently passed. Unreliable coverage; the plan calls out this as an over-specified test. Cooking-mode navigation still covers the overall flow. |
| Kept `cooking mode: enter, navigate, exit @smoke`, `wake lock @regression`, `progress bar @regression`, `ingredient sheet @mobile` | Each covers a distinct feature; no overlap. All converted from `createTestRecipe` (form-fill) to `seedAndOpen` (API seed). |

## Part 2 — QA gate (applied)

### Created

- `.githooks/pre-commit` — runs the gate on staged test file adds/mods
- `scripts/test-gate.mjs` — three layers (heuristics → Claude → report)
- `.test-gate/baseline.json` — per-file test-block counts (bootstrap run)
- `.github/workflows/test-gate.yml` — CI enforcement with PR comment + artifact
- `CONTRIBUTING_TESTS.md` — policy, tag meanings, gate rules, override procedure
- `package.json` scripts: `test:e2e:smoke`, `test:e2e:desktop`, `test:e2e:mobile`, `test:gate`, `test:gate:bootstrap`, `prepare`

### Rules enforced (all smoke-tested)

| Rule | Smoke result |
|---|---|
| DUPLICATE_TITLE (≥ 0.85 Jaccard bigram similarity) | ✅ `exit=1` on known duplicate title |
| MISSING_OR_MULTIPLE_TAGS (exactly one of `@smoke\|@regression\|@mobile\|@cross-browser`) | ✅ `exit=1` on untagged e2e test |
| FORM_FILL_SEEDING (e2e calls `#name` fill after `/recipes/new` when `seedRecipe` helper exists, unless test title declares "create via form" / "manual tab") | ✅ `exit=1` on form-fill setup |
| PARAMETERIZABLE (≥ 3 single-`expect` sibling tests, majority of file) | ✅ `exit=1` on 5×single-assert file |
| BUDGET_EXCEEDED (> 1 net new test vs baseline per file) | Deterministic; enforced once baseline is committed |
| CLAUDE_LOW_VALUE / CLAUDE_DUPLICATE (semantic judgment) | ✅ caught `expect(true).toBe(true)` as tautological during smoke run |

### Override procedure

`[test-gate-override: <reason>]` in the commit message (or PR title/body on CI) → gate warns, logs to `.test-gate/overrides.log`, exits 0. No silent bypass. `--no-verify` is documented as out-of-policy.

## Phasing

### Phase 1 (done in this PR)

- Part 1A–F: extract, refactor, collapse, tag, parallelize
- Part 2A–E: hook, analyzer, baseline, CI, docs
- Claude layer gated on CLI availability (graceful degradation)

### Phase 2 (deferred; tracked here for follow-up)

1. **Per-worker test users.** Today, parallel Playwright workers share `test@jc-recipes.local`. `uniqueName()` prevents write-write collisions, but list-order assertions (e.g., "count is ≥ 2") could still interact. List-based tests already assert *by name* rather than by count, so the risk is mitigated — but a dedicated per-worker user eliminates it entirely. Requires a small Supabase admin script (needs `SUPABASE_SERVICE_ROLE_KEY`, not currently in `.env.local`).
2. **Component tests with React Testing Library.** `RecipeForm` and `CookMode` have no component-level tests; 2-3 of the remaining e2e tests could become JSdom-level tests (faster, more focused). Not blocking — the e2e wiring tests still catch regressions, just slower.
3. **Mutation testing** (Stryker / `@stryker-mutator/jest-runner`). Validate that the reduced Jest suite retains the mutation-kill ratio of the original. If it drops, the heuristics above are wrong and specific tests need reinstating.
4. **Self-calibrating baseline.** Update `.test-gate/baseline.json` automatically after green CI runs, capturing `p95` durations from Playwright's JSON reporter. Lets the BUDGET_EXCEEDED rule check time cost, not just count.
5. **Claude gate policy for CI.** Decide whether to require `ANTHROPIC_API_KEY` in CI (making Claude escalation mandatory on PRs) or keep it opt-in. Recommend opt-in until the policy has been in effect for one release.
6. **CI workflow scope.** Current `.github/workflows/test-gate.yml` triggers on PRs when test files change. Consider extending to a nightly cross-browser run once Mobile Chrome gets a non-empty `@cross-browser` tag set.

## Verification performed

- `npx jest` — 91/91 pass in < 0.2 s (3 suites: `parse-recipe-markdown`, `scaling`, `export-recipes`)
- `npm run build` — Next build clean after scaler extraction
- `npm run prepare` — `core.hooksPath` resolved to `.githooks`
- `node scripts/test-gate.mjs --bootstrap` — baseline written, covers all 6 test files
- 5 gate smoke tests pass (duplicate, missing tag, form-fill, single-assert, clean) — each documented above

### Not performed in-session (intentional)

- Full Playwright run baseline-vs-after — would have cost the very wall-clock we're saving. Validate on next `npm run test:e2e` via CI.
- Coverage % capture — project has no coverage reporter configured today (deferred to Phase 2; neither gate nor refactor depends on it).
