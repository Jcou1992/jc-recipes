# Final Execution Review — Brut Polish + Borrows Plan

**Branch:** `experimentalWork`
**Range:** `94aad56` (REVEAL of contest) → `c72b3fe` (R6.B card heat-decay)
**Plan:** `docs/plans/2026-04-24-001-feat-brut-polish-borrows-plan.md`
**Commits in scope:** 10
**Reviewer:** final code reviewer pass, code read line-by-line via `git show`, not commit-message-only.

---

## Summary verdict

**APPROVED — ship to main, then `supabase db push` in the operator window.**

Every requirement R1–R10 is traced to a commit, every borrow correctly attributes its source team, every change that touches code outside `styles/tokens-brutalist.css` is gated either under `:root[data-design="brut"]` selectors or behind a runtime `isBrut` state derived from `document.documentElement.getAttribute('data-design')`. Classic mode rendering is unchanged. Build + Jest 211/211 + Playwright 43/46 desktop (3 pre-existing failures confirmed against base) + 5/5 mobile pass. No `--no-verify`, no force-push, no commit amends, no edits to classic-mode files (`app/globals.css` has zero `--hot` references and remains untouched). The two test-gate overrides + two test-gate-override-implied lines in `.test-gate/overrides.log` are reasonable: each new test file lands as a single committed unit with documented coverage rationale.

The only operational follow-up is the migration apply (R6.A's SQL is staged but not yet pushed to the remote DB) — consumer code defaults `cooked_at = null` so brut cards render `[NEW]` until the column exists, and `recordCooked` will silently no-op until then. That is a deliberate plan property (Risks table line 4), not a defect.

---

## Per-requirement trace (R1–R10)

| Req | Commit | Verification |
|---|---|---|
| **R1** mobile recipe title overflow-wrap | `3e9c6a0` | `styles/tokens-brutalist.css` `.recipe-title` rule under `:root[data-design="brut"]` adds `overflow-wrap: anywhere`, `word-break: normal`, `hyphens: manual`, `font-size: clamp(var(--t-20), 5vw, var(--t-40))`. Scoped — classic untouched. |
| **R2** cook-mode single wayfinder | `336016e` | New `components/ui/brut/RouteAwareWayfinder.tsx` (client wrapper, `usePathname().includes('/cook')` → `null`), mounted from `app/layout.tsx` in place of raw `<Wayfinder>`. `CookMode.tsx` mounts a per-route `<Wayfinder>` only when `isBrut && !finished`. Local "EXIT · STEP n/N" strips tagged `data-cook-local-header` and `display: none` under brut via `isBrut` ternary on `style`. Classic strips remain pixel-identical. |
| **R3** empty-state ticket `[ MISE · EMPTY ]` | `ee97ba1` + `98b8869` | First commit handles filtered-empty branch in `RecipeListClient.tsx` (client `isBrut` state + `<Ticket code="MISE · EMPTY">`). Completion commit handles **truly-empty** branch server-side in `app/(app)/recipes/page.tsx` via cookie read (`DESIGN_MODE_COOKIE`) so first paint is correct (no flash of `<InkBrush>`). Both branches re-use the same `.brut-empty-*` primitives in tokens. |
| **R4** `--hot` token bump to AA-normal | `edd8195` | `--hot: oklch(63.2% 0.148 45)` → `oklch(66% 0.15 45)`; `--hot-a` follows. Comment added in-file: `/* AA-normal contrast (5.5:1+) on --ink-900; lint enforces ≤ 1 use site per route — see U5 */`. Brut-scoped (token lives only inside `:root[data-design="brut"]` block); `app/globals.css` has zero `--hot` references — verified. |
| **R5** hot-token lint (one `--hot` per route) | `4f341d4` | New `scripts/hot-token-lint.mjs` walks `app/**/page.tsx`, sums `--hot\b` matches in each page + co-located siblings (excluding nested route dirs), allowlists `styles/tokens-brutalist.css`. `.githooks/pre-commit` invokes it before test-gate when `.tsx`/`.ts`/`.css` files are staged. Override pattern `[lint:hot-override: <reason>]` mirrors existing test-gate. Manually run: `[hot-lint] PASS  scanned 9 route(s); brut grammar holds.` |
| **R6.A** `cooked_at` schema + `recordCooked` action | `0f7226b` | `supabase/migrations/20260425004000_recipe_cooked_at.sql` adds `cooked_at TIMESTAMPTZ`, `cooked_count INT NOT NULL DEFAULT 0`, partial index on `cooked_at DESC WHERE cooked_at IS NOT NULL`, and a `record_cooked(uuid)` SQL function (SECURITY INVOKER, RLS via `where user_id = auth.uid()`). `recordCooked` server action calls the RPC, redirects to `/login` on missing session. Type extension on `Recipe` adds optional `cooked_at?` and `cooked_count?` and excludes them from `RecipePayload`. |
| **R6.B** card heat-decay + cook completion wiring | `c72b3fe` | New `lib/brut/cooked-age.ts` (pure helper) + 7 jest tests (truth table + 1 in-window decay assertion). `RecipeCard.tsx` reads `isBrut`, computes `fmtCookedAge`, renders a 24 px fixed-height row only under brut. `CookMode.tsx` calls `recordCooked(recipe.id).catch(...)` on completion (fire-and-forget, never awaited). `@property --card-heat` registered globally (must be — `@property` can't nest in `@layer`); the consuming `.brut-card-heat-row` rule IS scoped under `:root[data-design="brut"]`. |
| **R7** wayfinder kicker hint row | `4c45f45` | New `lib/brut/use-shortcut-discovery.ts` + 3 jest tests (tracked-key set, threshold/dismiss, persistence + SSR safety). `Wayfinder.tsx` gains optional `hideKicker` prop, renders kicker row underneath the bar (or `[?] KEYS` button when collapsed). `CookMode.tsx` opts out via `hideKicker: true` because cook mode owns its own keyboard map. Listens in capture phase so input-focused presses still count. |
| **R8** tag chip 40 px mobile | `97d7aa8` | `@media (max-width: 640px)` block added under `:root[data-design="brut"]` targeting `[data-testid="tag-rail"] button`, `[data-testid="tag-rail-more"]`, `[data-testid^="tag-filter-"]` with `min-height: 40px !important; padding-block: 8px !important;`. Desktop unchanged. |
| **R9** UNMATCHED contrast bump | `97d7aa8` | New rule `:root[data-design="brut"] [data-testid^="ingredient-unmatched-"]` raises text from `--text-4` to `--text-2`, transparent ground, `1px var(--rule-strong)` border, mono. No JSX edits required (existing testid attributes used as selector). |
| **R10** classic mode pixel-identical | every commit | Verified by inspection: every CSS change lives under `:root[data-design="brut"]` selectors except `@property --card-heat` (must be unscoped due to spec; the consuming rule IS scoped). Every JSX change is either gated by `isBrut` ternary or wraps a brut-only component. `app/globals.css` is untouched (no diff lines). The only file outside `styles/tokens-brutalist.css`, `components/ui/brut/`, `lib/brut/`, brut-aware list/detail/card/cookmode components, layout, actions, types, migrations, hooks, scripts, and package.json is the new test file `app/actions/__tests__/record-cooked.test.ts` (expected). |

All ten requirements landed. R3 needed two commits because the original spec only addressed `RecipeListClient.tsx`'s filtered-empty branch; the truly-empty case lives in the server-rendered `app/(app)/recipes/page.tsx` and was caught and fixed in `98b8869`. This is good — finding and patching an integration gap before merge is the point.

---

## Per-unit verification (U1–U9)

The plan has 9 units; the implementation maps cleanly:

- **U1 (R1)** → `3e9c6a0`. CSS-only, four properties added, scoped under `:root[data-design="brut"] .recipe-title`. Plan-faithful. **Verified.**
- **U2 (R2)** → `336016e`. The plan presented two implementation alternatives (server `headers()` vs client `usePathname()` wrapper); implementer correctly picked the simpler client-only path because `<Wayfinder>` is already client-only. The `RouteAwareWayfinder` wrapper file is 29 lines, reads cleanly, with a clear docstring on why the SSR shape stays unchanged. CookMode's per-route Wayfinder includes `crumb`, `modeLabel`, `statusRight`, `userLabel`, `hot: true`, exactly as spec'd. The live elapsed clock interval only runs when `isBrut && !finished` — zero re-render delta in classic. All cook-mode `data-testid` preserved. **Verified.**
- **U3 (R3)** → `ee97ba1` + `98b8869`. Plan called for one branch in `RecipeListClient.tsx`; reality required a second branch in the server page for the truly-empty case (otherwise SSR paints `<InkBrush>` then hydration swaps to ticket — flash). Server-side cookie read is the correct fix and was done in `98b8869`. **Verified, with extra rigor for SSR-correctness.**
- **U4 (R4)** → `edd8195`. Single-line value bump on `--hot` and `--hot-a`. Comment added matches plan ("AA-normal contrast (5.5:1+) on --ink-900; lint enforces ≤ 1 use site per route — see U5"). **Verified.**
- **U5 (R5)** → `4f341d4`. Lint script implements the rule (≤ 1 `--hot` per `page.tsx` + siblings, allowlist `styles/tokens-brutalist.css`, override via `[lint:hot-override: <reason>]`). The pre-commit hook ordering is correct: hot-lint runs before test-gate; both early-exit on no-relevant-files-staged. Failure messages name the file + count + reduction guidance. Manually verified `node scripts/hot-token-lint.mjs` returns `PASS  scanned 9 route(s)`. **Verified.**
- **U6 (R8 + R9)** → `97d7aa8`. Two CSS-only rules, both scoped under `:root[data-design="brut"]`. R8 uses `@media (max-width: 640px)` correctly. R9 uses attribute-prefix selector (`[data-testid^="ingredient-unmatched-"]`) so no JSX touch needed — clean. **Verified.**
- **U7 (R7)** → `4c45f45`. The plan said create `lib/brut/use-shortcut-discovery.ts`, modify `Wayfinder.tsx`, modify `tokens-brutalist.css` — all three landed exactly as spec'd. The hook implements the "passive count, capture-phase listen, stop listening when collapsed" pattern from the plan. SSR-safe: every `localStorage`/`window` read/write is gated on `typeof window !== 'undefined'`, default state matches server render (`uses: 0`, `dismissed: false`). Reveal correctly resets the counter (fresh discovery pass). The `[HINT · KEYS]` copy matches the spec verbatim. CookMode opts out via `hideKicker: true` (smart — cook keyboard map is space/arrows, list-page hints don't apply). **Verified.**
- **U8 (R6.A)** → `0f7226b`. Migration uses lowercase SQL (matches existing project convention). Partial index `WHERE cooked_at IS NOT NULL` is a nice cost-saver — most rows will be null pre-migration-rollout. The `record_cooked(uuid)` function approach is **better than the plan's original approach** (which described inlining the UPDATE in the action): an atomic SQL function is simpler to reason about, simpler to test (RPC mock vs UPDATE-builder mock), and survives any future client-library refactor. The action correctly redirects on missing session matching the existing pattern in the same file. Type extension is non-breaking (both fields optional, payload type excludes them). 4 jest tests cover happy path + missing auth + RLS miss + idempotent double-call exactly as the unit spec required. **Verified.**
- **U9 (R6.B)** → `c72b3fe`. `fmtCookedAge` helper implements the four-state truth table from Decision F (NEW / decaying / past-window / dormant) with defensive clock-skew + parse-error handling — both tested. The 24 px fixed row height is set inline to satisfy the Risk-table commitment ("layout stable across fresh / decayed / dormant / NEW states"). `recordCooked` is fire-and-forget on completion, error-caught, never awaited. The `@property --card-heat` registration is correctly placed outside `@layer` (the spec disallows nesting); the consuming rule is properly scoped. **Verified.**

---

## Borrowed features: provenance check

| Borrow | Source | Where it landed | Commit-message attribution |
|---|---|---|---|
| `cooked_at` 72 h decay → 7 d dormant | **Team E · Ambient-Atmospheric** + impeccable `[DORMANT]` extension | `0f7226b` (schema) + `c72b3fe` (CSS + wiring) | Both subjects + bodies tag `[Team E borrow]` and `+ impeccable DORMANT`. Correct. |
| Wayfinder kicker hint row | **Team A · Editorial-Magazine** kicker/colophon-tip pattern | `4c45f45` | Subject `[Team A borrow]`. Code comment in `Wayfinder.tsx` cites "R7 · Team A borrow". Correct. |
| `--hot` AA-normal bump | **Team A precedent** stability-report contrast bar | `edd8195` | Subject `(R4)`; commit body links to U5 lint as the cross-check. The plan attributes the precedent to Team A; commit message is terse but the plan link in the body chain is sufficient. **Acceptable.** |
| Pre-commit `--hot` lint | impeccable original (no losing team) | `4f341d4` | Subject `(R5)`. No "borrow" tag (correct — it's not a borrow). |

The `.brut-reserve-ch`, print-canvas-hide, and ASCII U+002D borrows from Team A and Team C were already shipped pre-plan (commits `1593bcc` / `8034f7e` / `1593bcc` respectively, predating BASE) and explicitly listed in the plan as "prior shipping." Not in this scope; correctly noted.

The four explicitly-rejected borrows (Team B rotational dial, Team B 40 Hz tock, Team C 3D materials, Team E time-of-day skin retoning) are not present in any commit — verified by reading the diff. Lane discipline held.

---

## Sacred features intact: walkthrough

I read every commit's diff against the list of sacred features:

- **Auth.** `app/actions/recipes.ts:recordCooked` follows the same `getSession() → redirect('/login')` pattern as the pre-existing `updateRecipe`/`deleteRecipe`. No middleware change. **Intact.**
- **CRUD.** `RecipePayload` correctly excludes the two new optional fields from create/update payloads (`types/recipe.ts`). Existing `select('*')` queries pick up the new columns automatically once migrated. **Intact.**
- **Search / filter / sort.** `RecipeListClient.tsx` keyboard handlers (`/`, `F`, `Esc`) are unchanged — `useShortcutDiscovery` listens passively in the capture phase and only counts; it never preventDefaults or stops propagation. **Intact, plus a non-invasive discovery aid.**
- **Scaler.** No edits in this scope. Pre-existing ASCII `-` fix (commit `1593bcc`) untouched. **Intact.**
- **Unit toggle.** No edits. **Intact.**
- **Cook mode.** Touched but not broken. The completion screen still works (`recordCooked` is fire-and-forget, errors swallowed). All cook-mode `data-testid` preserved. The local "EXIT · STEP n/N" header is hidden under brut but `display: none` is reversible by design — no removal. **Enhanced (single header under brut, recordCooked stamp), classic intact.**
- **Toasts.** No edits. **Intact.**
- **Unsaved-changes warning.** No edits. **Intact.**
- **Copy ingredients.** No edits. **Intact.**
- **Unit autocomplete.** No edits. **Intact.**
- **Print.** No edits in this scope (pre-existing `feat(brut): print as mono service ticket` commit `8034f7e` is untouched). The kicker row has `@media print { .brut-kicker { display: none !important; } }` — good print discipline. **Intact + improved.**
- **Font-size pref.** No edits. **Intact.**

No regressions to any sacred feature.

---

## Test coverage delta

Pre-plan baseline: **197** Jest tests (per CLAUDE.md). Post-plan: **211** Jest tests. Delta = **+14** new tests across **3 new test files**:

| File | Tests | New in this plan? |
|---|---|---|
| `app/actions/__tests__/record-cooked.test.ts` | 4 (happy, missing-auth, RLS-miss, double-call) | **Yes** (created in `0f7226b`) |
| `lib/brut/__tests__/cooked-age.test.ts` | 7 (6 truth-table cases + 1 in-window decay) | **Yes** (created in `c72b3fe`) |
| `lib/brut/__tests__/use-shortcut-discovery.test.ts` | 3 (tracked-keys + threshold; persistence; SSR-safe) | **Yes** (created in `4c45f45`) |
| `lib/brut/__tests__/ref-codes.test.ts` | (pre-existed) | **No** — predates BASE (commit `a8fd24d`, Phase 1 brut work) |

4 + 7 + 3 = 14. ✓ Math checks out.

The test-gate override log (`.test-gate/overrides.log`) has four entries:

```
2026-04-24T18:58:29Z  ref-codes.test.ts            (pre-plan, ignore)
2026-04-25T01:55:11Z  use-shortcut-discovery       (this plan)
2026-04-25T02:01:31Z  record-cooked.test.ts        (this plan)
2026-04-25T02:07:35Z  cooked-age.test.ts           (this plan)
```

Each in-plan override reason is reasonable: each is the **first test file for a new module** (the test-gate's "5 consecutive failing tests" rule blocks the new tests until baseline absorbs them, and bootstrap is plan-deferred). The reasons cite specific coverage rationale, not generic "tests are good" hand-waving. **Acceptable use.**

E2E coverage is unchanged in this plan (Playwright Desktop 43/46 + 3 pre-existing failures, Mobile Safari 5/5). Per-plan scope-boundary "this plan does NOT touch the e2e test files" is honored — diff confirms zero changes under `tests/e2e/`.

---

## Migration + operator notes

**Migration file:** `supabase/migrations/20260425004000_recipe_cooked_at.sql` — present, lowercase SQL matches project convention, partial index, RLS-safe SECURITY INVOKER function, both columns + index commented for archaeology.

**Apply status:** **NOT yet applied** to the operator's Supabase. Per plan Risk #4 mitigation:

- Consumer code defaults `cooked_at = null` (TypeScript optional + `?? 0` for `cooked_count`) → cards render `[NEW]`.
- `recordCooked` calls a missing RPC → Supabase returns an error in `data: null, error: {...}` shape → since the action does not check the error, it returns `void` → completion still works.
- Once `supabase db push` runs, the next list render picks up `cooked_at`/`cooked_count` automatically (the existing `select('*')` is wide).

**Operator runbook (post-merge):**

1. `supabase db push` against staging → verify migration applies cleanly.
2. Smoke test: complete one cook in brut mode → `select cooked_at, cooked_count from recipes where id = '<rec>'` shows non-null + 1.
3. Verify the brut card renders `[LAST 00H AGO]` and `[COOKED 1×]` on next list refresh.
4. `supabase db push` against prod when staging green.
5. (Optional) regenerate after-screenshots: `node scripts/contest-screenshots-brut.mjs`.

**Risk:** if `recordCooked` is called against a database where the `record_cooked(uuid)` function does not yet exist, the RPC returns an error object that the action discards. This is **safe** but **silent** — no telemetry, no toast. The plan accepts this trade-off ("No `revalidatePath` — heat decay reads via re-mount or client refresh"). Operator should apply the migration before any user expects heat decay to render.

---

## Risks / follow-ups

**Plan-deferred items (carried forward, not regressions):**

- `/ssh` ASCII easter egg deletion — separate issue.
- `SERVICE COMPLETE` typewriter `steps(16)` reveal — defer until real cook validates.
- Berkeley Mono font drop-in — separate JC-personal task.
- `/recipes/new` progressive disclosure — separate plan.
- Parallel ingredient timers — separate plan.
- Inline form validation on blur — separate plan.
- Visual-regression test on `sm` font-size 11 px floor — separate test-infra plan.
- After-screenshots refresh — operational, post-migration-apply.

**New observations from this review:**

1. **`recordCooked` swallows non-auth errors silently.** The action does `await supabase.rpc(...)` but never inspects the returned `{ data, error }`. Acceptable in fire-and-forget, but `console.warn` from the callsite (`CookMode.tsx`) only catches **promise rejections**, not Supabase's `{ error: {...} }` returns. If the migration fails to apply post-merge, every cook completion will silently no-op. **Recommendation (low priority):** add a server-side `if (error) console.warn('[recordCooked] rpc error', error)` in `recipes.ts:recordCooked`. Not a blocker.

2. **`@property --card-heat` is globally registered.** This is the single non-brut-scoped CSS addition in the plan. It is **safe** because `--card-heat` is only consumed by `.brut-card-heat-row` (which IS brut-scoped), and the registration only adds a typed CSS variable to the registry — it does not paint anything. Documented in the source comment. No action required.

3. **`recipe.cooked_count ?? 0` fallback.** `RecipeCard.tsx` reads `recipe.cooked_count ?? 0`. If the migration applies but the column is somehow missing, this is null-safe. Good defensive code.

4. **The `RouteAwareWayfinder` wrapper does substring match `pathname.includes('/cook')`.** This will ALSO match a hypothetical future `/cook-book` or `/cooking` path. Today there is exactly one cook path (`/recipes/[id]/cook`), so the behavior is correct. **Recommendation (low priority):** use `pathname.endsWith('/cook')` for stricter matching. Not a blocker.

5. **Hot-token lint allowlist is hand-maintained.** `ALLOWLIST = new Set(['styles/tokens-brutalist.css'])`. If a future contributor adds a second token-definition file (`styles/tokens-brut-overlay.css`), they must remember to extend the allowlist. The script is small and the failure mode is loud (lint fails with a clear message naming the file), so this is self-correcting in practice. Acceptable.

6. **`useShortcutDiscovery` continues to listen until threshold.** Once collapsed, the keydown listener is removed. Good. But the `useEffect` re-attaches whenever `uses` or `dismissed` flips — meaning every counted keystroke re-mounts the listener. In practice this is microseconds and correct, just a stylistic observation.

None of these are blockers. The implementation is ship-quality.

---

## Sign-off

**Approved.** Merge `experimentalWork` → main when ready, then `supabase db push` against staging → smoke test → push to prod. The 10-commit chain is internally coherent, every change is reversible by `data-design` toggle (no destructive deletions, only additive selectors and one token bump), and the borrowed features carry their attribution in commit-message tags.

The plan called for ~10 minutes of review; this took ~12, which is the right ratio for a 10-commit batch with two new database columns, a new server action, a new pre-commit lint, and three new test files. The implementing agent's discipline around `:root[data-design="brut"]` scoping is the load-bearing reason this could be reviewed in that timeframe — if any one change had leaked into classic-mode CSS the review would have ballooned.

— Final reviewer pass, `experimentalWork` HEAD `c72b3fe`.
