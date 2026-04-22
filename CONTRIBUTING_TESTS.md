# Contributing tests

## Core principle

> Every new test must earn its place by adding **net coverage value**, not net execution cost.

Tests are a long-term asset. A duplicate test, a tautological assert, or a 30-second form-fill when a 0.3-second API seed would do — those are liabilities, not coverage. They slow every contributor and hide real regressions in noise.

## Three rules

1. **One tag per Playwright test.** Choose exactly one of `@smoke`, `@regression`, `@mobile`, or `@cross-browser`. No tag, multiple tags → gate blocks.
2. **Prefer unit over e2e.** Pure logic belongs in `lib/**/__tests__/*.test.ts`. If behavior can be proved without driving the DOM, it should be.
3. **No silent data setup via the UI.** When seeding for e2e, use `seedRecipe()` from `tests/e2e/helpers.ts` (Supabase API, ~100-300 ms) — never fill `/recipes/new` by hand unless the *test itself* is covering the form.

## Tag meaning

| Tag | Scope | Runs when |
|---|---|---|
| `@smoke` | Single representative happy path per feature area. Must be fast. | Pre-commit (local), every PR |
| `@regression` | Full desktop behavior. Can include multi-step flows. | Every PR |
| `@mobile` | Genuinely viewport-dependent — touch targets, mobile sheets, stacking, Mobile-Safari WebKit idiosyncrasies. | Runs under Mobile Safari project only |
| `@cross-browser` | Mobile-Blink-specific regressions. Opt-in. | Runs under Mobile Chrome project only |

**Default to `@regression`.** Promote to `@smoke` when you are sure the test is the single representative happy path for its feature. Downgrade to `@mobile` only when desktop cannot prove the behavior.

## The gate

`scripts/test-gate.mjs` runs automatically on:
- `git commit` (via `.githooks/pre-commit`, installed by `npm run prepare`)
- Pull requests (`.github/workflows/test-gate.yml`)

### Rules enforced (block on violation)

| Rule | Why | Fix |
|---|---|---|
| **DUPLICATE_TITLE** — new test name is ≥85 % similar to an existing one | Duplicate coverage slows the suite without adding signal | Merge into the existing test or rename if it genuinely covers a different behavior |
| **PARAMETERIZABLE** — ≥ 3 of the file's tests have a single `expect()` and they dominate the file | One `expect()` per test block is usually a truth table in disguise | Collapse to a `test.each` table |
| **FORM_FILL_SEEDING** — e2e test drives `/recipes/new` form-fill when `seedRecipe()` exists | Each form-fill costs 5-15 s vs ~200 ms via the API | Use `seedRecipe({ name, ... })` from `tests/e2e/helpers.ts` |
| **MISSING_OR_MULTIPLE_TAGS** — e2e test title does not contain exactly one recognized tag | Tag drives project routing and tiered runs | Add exactly one of `@smoke`, `@regression`, `@mobile`, `@cross-browser` |
| **BUDGET_EXCEEDED** — more than 1 net new test in a file vs baseline | Suite bloat accumulates silently | Merge, parameterize, or justify via override |
| **CLAUDE_DUPLICATE** — Claude's semantic analysis identifies a duplicate the heuristic missed | Semantic equivalence, not just textual similarity | Merge or rename |

### Warning (not blocking)

- **POSSIBLE_DUPLICATE** — 0.70–0.85 similarity to an existing test
- **CLAUDE_LOW_VALUE** — Claude judges the test tautological, or the existing suite already covers it

### Claude escalation

If the `claude` CLI is on `PATH`, the gate escalates to Claude for semantic judgment *only when heuristics don't block first*. This catches duplicates that use different wording but assert the same thing, and flags low-value assertions like `expect(true).toBe(true)`.

If Claude is unavailable (no CLI, timeout, network error), the gate degrades gracefully to heuristic-only. The heuristic layer alone is authoritative — Claude is an enhancement, never a requirement.

## Override

Block is the default. Explicit overrides are recorded, never silent.

Include this tag in the commit message (or PR title/body on CI):

```
[test-gate-override: <reason>]
```

The gate emits a warning, writes the reason to `.test-gate/overrides.log`, and exits 0. Examples of legitimate overrides:

- "Regression-driven: test duplicates an existing title because it's pinning behavior we almost lost."
- "One-off characterization test for a legacy area; will be deleted in the follow-up refactor."

`--no-verify` on `git commit` bypasses the hook entirely. It is **not** a legitimate override — it leaves no trail. Use the commit-message tag instead.

## Running the gate manually

```bash
# Against specific files
npm run test:gate -- tests/e2e/my-new.spec.ts

# Against currently staged files
npm run test:gate

# Regenerate the baseline (do this after a green release or a deliberate widening)
npm run test:gate:bootstrap
```

Every run writes `.test-gate/last-report.md` summarizing inputs, metrics, findings, and the verdict.

## Tiered runs

```bash
npm test                 # Jest — fast, unit-only, < 1 s
npm run test:e2e:smoke   # Playwright smoke tier — Desktop Chrome only, < 60 s
npm run test:e2e:desktop # Full desktop regression
npm run test:e2e:mobile  # Mobile Safari (WebKit) + Mobile Chrome (cross-browser opt-in)
npm run test:e2e         # Everything
```

Smoke before push, regression before merge, mobile on features that move the viewport.

## Why this exists

Before this gate:
- 65 Jest tests were 65 duplicate parser invocations because each row of a truth table was a separate `test()` block
- 40 Playwright tests × 3 browsers × `workers: 1` = ~120 serialized runs
- Every non-auth test signed in through the UI despite a `global.setup.ts` that already captured `storageState`
- The `export-recipes.ts` helper and the scaler/unit-conversion math in `RecipeDetailClient.tsx` had zero direct unit coverage

After:
- Jest parameterized to truth tables; `scaling.ts` + `export-recipes.test.ts` added (~91 Jest tests, < 0.2 s)
- Playwright cut to 24 top-level tests, storage state reused, browser matrix pruned, ~3× fewer runs in parallel → ~1-2 min wall-clock on a clean CI box

See `TEST_REDUCTION_LOG.md` for the per-change accounting.
