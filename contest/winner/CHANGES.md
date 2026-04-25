# SEKAI Brut — Polish + Borrows: Changes

Inventory of every change from `docs/plans/2026-04-24-001-feat-brut-polish-borrows-plan.md` execution. Branch `experimentalWork`. 10 commits on top of the contest REVEAL (`94aad56`).

## Commit log

```
c72b3fe feat(brut): card heat-decay + cook completion wiring [Team E + impeccable DORMANT] (R6.B)
0f7226b feat(brut): cooked_at schema + recordCooked action [Team E borrow] (R6.A)
4c45f45 feat(brut): wayfinder kicker hint row [Team A borrow] (R7)
97d7aa8 fix(brut): tag chip 40px mobile + UNMATCHED contrast (R8, R9)
4f341d4 feat(brut): hot-token lint enforces one --hot per route (R5)
edd8195 feat(brut): bump --hot to AA-normal contrast (R4)
98b8869 fix(brut): empty-state ticket also renders on truly-empty list (R3 completion)
ee97ba1 feat(brut): empty-state ticket [ MISE · EMPTY ] (R3)
336016e fix(brut): cook-mode single wayfinder (R2)
3e9c6a0 fix(brut): mobile recipe title overflow-wrap (R1, ui-ux ship-blocker)
```

All commits use conventional-commits format. All include `Co-Authored-By: Claude Opus 4.7` trailer. No `--no-verify` used. Test-gate overrides (4) logged at `.test-gate/overrides.log`.

## Quality gates

| Gate | Status |
|---|---|
| `npm run build` | ✅ clean, 9 routes |
| `npm test` | ✅ 211 / 211 (was 197 + 14 new from this plan: `use-shortcut-discovery` ×3 + `record-cooked` ×4 + `cooked-age` ×7) |
| `npm run lint:hot` | ✅ pass |
| Playwright Desktop Chrome | 43 pass / 3 fail (3 pre-existing, confirmed against `checkpoint/pre-contest-impl`) |
| Playwright Mobile Safari | ✅ 5 pass / 1 skipped |
| Pre-commit hooks | ✅ all commits cleared without bypass |

## Per-unit changes

### U1 — Mobile detail title overflow-wrap (R1) — `3e9c6a0`

**The bug:** Long recipe titles with no word-breakable characters (e.g. seed slug `BulkDel-w2-1776892154725-A`) wrapped one character per line on mobile, producing a ~25-line title that pushed COOK off-screen.

**The fix:** Extended the brut-scoped `.recipe-title` rule in `styles/tokens-brutalist.css` with:
```css
overflow-wrap: anywhere;
word-break: normal;
hyphens: manual;
font-size: clamp(var(--t-20), 5vw, var(--t-40)) !important;
```

Files: `styles/tokens-brutalist.css` (+11 / −1).
Classic mode: untouched.

### U2 — Cook double-wayfinder merge (R2) — `336016e`

**The bug:** Cook mode showed two stacked headers — global SEKAI wayfinder + local `← EXIT · STEP n/N` strip — overlapping on the right half. Two competing nav rows on a sacred full-screen surface eats 64 px on a 390 × 844 phone.

**The fix:**
- New `components/ui/brut/RouteAwareWayfinder.tsx` (32 lines) — client wrapper that suppresses the global Wayfinder on `/cook` paths via `usePathname()` check.
- `app/layout.tsx` swaps `<Wayfinder>` mount → `<RouteAwareWayfinder>`.
- `components/recipes/CookMode.tsx`:
  - Adds `isBrut` state + `liveElapsed` 1 s tick effect (gated on `isBrut && !finished`).
  - Mounts a per-route `<Wayfinder>` with cook telemetry: `crumb="SEKAI · REC-{shortHash} · COOK"`, `modeLabel="STEP n/N"`, `statusRight="T+MM:SS"`, `hot=true`.
  - Adds `data-cook-local-header` attr + inline `display: isBrut ? 'none' : undefined` to both desktop + mobile local strips.
  - Wayfinder suppressed on completion screen so it doesn't overlap the ✕.

Files: `app/layout.tsx`, `components/ui/brut/RouteAwareWayfinder.tsx` (new), `components/recipes/CookMode.tsx`.
Classic mode: pixel-identical (existing local strip rendered, RouteAwareWayfinder returns null because Wayfinder is null in classic).
All 26 cook-mode `data-testid` attributes preserved.

### U3 — Brut empty-state ticket `[ MISE · EMPTY ]` (R3) — `ee97ba1` + `98b8869`

**The bug:** `/recipes` empty state under brut rendered the classic `InkBrush` (or grey card skeletons) instead of the spec'd ticket. New invited chefs saw nothing welcoming.

**The fix:** Two commits cover both empty-state paths:
- `ee97ba1`: `RecipeListClient.tsx` filtered-empty branch (search/tag matches nothing). Brut renders `<Ticket code="MISE · EMPTY">` with sub-cases `NO MATCHES.` (filters applied) vs `NO RECIPES YET.` (no filters), CTA to `/recipes/new`.
- `98b8869`: `app/(app)/recipes/page.tsx` truly-empty server-side branch. Reads `design-mode` cookie via `cookies()` in parallel with the recipes query (zero added latency); renders the same `<Ticket>` shell when `recipes.length === 0` and brut.
- New CSS primitives in `styles/tokens-brutalist.css`: `.brut-empty-ticket`, `.brut-empty-body`, `.brut-empty-rule`, `.brut-empty-headline`, `.brut-empty-meta`, `.brut-empty-cta`, `.brut-empty-hint`, `.brut-empty-key`, `.brut-empty-action`.

Files: 3.
Classic mode: byte-identical InkBrush branch preserved.
All `data-testid="empty-state"` and `data-testid="filtered-empty-state"` selectors preserved.

### U4 — `--brut-hot` token bump to AA-normal (R4) — `edd8195`

(Token was originally named `--hot`; renamed to `--brut-hot` post-cycle-1 critique to disambiguate from any future classic-mode terracotta naming.)

**The fix:** Single-line token value bump (showing the historical diff at U4 time, when the token was still named `--hot`):
```diff
-    --hot:     oklch(63.2% 0.148 45);
-    --hot-a:   oklch(63.2% 0.148 45 / 0.14);
+    /* AA-normal contrast (5.5:1+) on --ink-900; lint enforces ≤ 1 use site per route — see U5 */
+    --hot:     oklch(66% 0.15 45);
+    --hot-a:   oklch(66% 0.15 45 / 0.14);
```

Was 4.9:1 on `--ink-900` (barely AA-large). Now ≥ 5.5:1 (AA-normal). Visually a slightly brighter terracotta — cohesive, no hue shift.

Files: `styles/tokens-brutalist.css` (+3 / −2).
Classic mode: untouched (classic terracotta lives in `app/globals.css` at `--terracotta`, separate token).

### U5 — `--brut-hot` lint pre-commit (R5) — `4f341d4`

**The new rule:** Pre-commit hook fails any change that introduces > 1 `--brut-hot` reference per route page (page.tsx + co-located components). The brut grammar requires "one active element per screen" — this enforces it mechanically so it doesn't rot.

**Implementation:**
- `scripts/hot-token-lint.mjs` (191 lines): scans `app/**/page.tsx` + co-located `.tsx`/`.ts`/`.css`, counts `--brut-hot\b` matches per route, fails when total > 1. Allowlists `styles/tokens-brutalist.css` (the source of the token, not a consumer). Sub-100 ms runtime.
- `.githooks/pre-commit`: invokes `node scripts/hot-token-lint.mjs` before `scripts/test-gate.mjs` when any staged file matches `*.{tsx,ts,css}`. Empty PRs skip the scan.
- `package.json`: adds `"lint:hot": "node scripts/hot-token-lint.mjs"` (task name kept short for ergonomics; internally scans `--brut-hot`).
- Override pattern `[lint:hot-override: <reason>]` mirrors `[test-gate-override: ...]`. Reads `GATE_COMMIT_MSG` env or `--commit-msg=` arg.

**Failure example:**
```
[hot-lint] FAIL  app/(app)/recipes/[id]/page.tsx contains 2 --brut-hot references.
Brut grammar allows ≤ 1 hot element per screen.
Reduce, or move shared sites to tokens-brutalist.css.
```

Files: 3 (1 new, 2 modified).

### U6 — Tag chip touch + UNMATCHED contrast (R8, R9) — `97d7aa8`

**The fix:**
- Tag chips (`[data-testid^="tag-rail"]` + `[data-testid^="tag-filter-"]`) under brut + `@media (max-width: 640px)` get `min-height: 40px; padding-block: 8px;`. Wet-hand-friendly.
- UNMATCHED ingredient badge (`[data-testid^="ingredient-unmatched-"]`) under brut: text colour `--text-2` (88 % L, AA-normal) + 1 px `--rule-strong` border + 0 radius + transparent bg. Reads as a labelled cell, not a low-priority hint.

Files: `styles/tokens-brutalist.css` (+25 lines).
No JSX edits required — used existing testids.

### U7 — Wayfinder kicker hint row (R7, Team A borrow) — `4c45f45`

**The new feature:** Below the brut wayfinder, a passive 24 px row showing `[HINT · KEYS]  /:SEARCH   F:FILTER   ESC:CLEAR`. Fades from view after the user has used three of the listed shortcuts (tracked per browser in localStorage). After dismissal, a small `[?] KEYS` button re-shows it.

**Why:** ui-ux review identified DOSSIER friction #5 (shortcut discoverability) and proposed Team A's "kicker / colophon tip" pattern as the fix — passive discovery without a modal. Solves the problem in brut grammar without a popup.

**Implementation:**
- `lib/brut/use-shortcut-discovery.ts` (new) — SSR-safe hook. Counts `keydown` events for `/`, `f`/`F`, `Escape` (capture phase, no `preventDefault`). Persists count to `brut.shortcut.uses` in localStorage. Returns `{ uses, dismissed, collapsed }` + `dismiss()` + `reset()`. Self-detaches once collapsed.
- `lib/brut/__tests__/use-shortcut-discovery.test.ts` (new) — 3 tests: tracked-key + threshold logic, persistence round-trip with corruption fallback, SSR safety.
- `components/ui/brut/Wayfinder.tsx` — wraps the bar in a fragment, conditionally renders the kicker. New `hideKicker` prop.
- `components/recipes/CookMode.tsx` — passes `hideKicker: true` (cook mode shortcuts are space/arrows, not list-page hints).
- `styles/tokens-brutalist.css` — `.brut-kicker` (24 px sticky at top:32px, 10 px mono `--text-3`, 1 px bottom rule), `.brut-kicker--collapsed`, `.brut-kicker-keys`, `.brut-show-kicker`.

Files: 5 (2 new, 3 modified).

### U8 — `cooked_at` schema + `recordCooked` action (R6.A, Team E borrow) — `0f7226b`

**The new data layer:** Recipes get `cooked_at TIMESTAMPTZ NULL` and `cooked_count INT NOT NULL DEFAULT 0`. Atomic increment via `record_cooked(uuid)` Postgres function (RLS-scoped via `auth.uid()`). Server action `recordCooked(recipeId)` calls the RPC.

**Why an RPC instead of a JS-side update?** Supabase JS `.update({ cooked_count: ... })` cannot express `cooked_count + 1` (no expression-side hook). A read-modify-write would race under double-tap. RPC keeps it atomic + RLS-protected.

**Files:**
- `supabase/migrations/20260425004000_recipe_cooked_at.sql` (new). NOT YET APPLIED — operator must `supabase db push` to dev/staging/prod.
- `app/actions/recipes.ts` — adds `recordCooked(recipeId)`.
- `types/recipe.ts` — extends `Recipe` with `cooked_at?: string | null` and `cooked_count?: number`. `RecipePayload` `Omit` widened.
- `app/actions/__tests__/record-cooked.test.ts` (new) — 4 tests covering RPC call shape, missing-auth redirect, other-user RLS miss, double-call independence.

**Migration is null-safe.** Consumer code in U9 reads `cooked_at = null` → renders `[NEW]`. No UI breakage if migration applied later.

### U9 — Card heat-decay rendering + cook completion wiring (R6.B, Team E borrow + impeccable DORMANT) — `c72b3fe`

**The new feature:** Brut recipe cards show a labelled memory row:
- `[NEW]` — never cooked (or `cooked_at` null).
- `[LAST 03H AGO]   [COOKED 14×]` — fresh, brightly-bone-toned. Colour fades bone-100 → bone-300 over 72 h.
- `[LAST 03D AGO]   [COOKED 14×]` — past 72 h, fully bone-300.
- `[DORMANT 12D]` — ≥ 7 days quiet. Painted bone-400, no count. **impeccable's additive proposal:** information without judgement. A recipe you haven't cooked isn't a streak-broken loss; it's a labelled state.

Cook-mode completion now fires `recordCooked(recipe.id).catch(...)` — fire-and-forget. Never awaited. Never blocks completion UI.

**Implementation:**
- `lib/brut/cooked-age.ts` (new). Pure helper `fmtCookedAge(cookedAt, now?)`. Branches: NEW / in-72 h / past-72 h / dormant. Defensive against null, undefined, malformed strings, future dates (clock skew).
- `lib/brut/__tests__/cooked-age.test.ts` (new). 7 truth-table cases via `test.each` + 1 decay-precision assertion.
- `components/recipes/RecipeCard.tsx` — adds `isBrut` detection, computes `cookedAge`, renders brut-only `.brut-card-heat-row` with fixed 24 px height (so layout never shifts between states). Inline `style={{ '--card-heat': pct }}` drives the colour.
- `components/recipes/CookMode.tsx` — fires `recordCooked(recipe.id).catch(...)` in completion branch.
- `styles/tokens-brutalist.css`:
  - Globally registers `@property --card-heat { syntax: '<percentage>'; inherits: true; initial-value: 0%; }` (outside `@layer` because `@property` cannot nest).
  - Brut-scoped paint rule: `.brut-card-heat-row { color: color-mix(in oklch, var(--bone-100) var(--card-heat), var(--bone-300)); }`.

Files: 5 (3 new, 2 modified).

## Borrows summary

| Borrow | Source | Recommended by | Landed in |
|---|---|---|---|
| `cooked_at` + 72 h heat decay | **Team E · Ambient-Atmospheric** | judge + impeccable + ui-ux | U8 + U9 |
| `[DORMANT Xd]` after 7 days | impeccable extension on Team E | impeccable | U9 |
| Wayfinder kicker hint row | **Team A · Editorial-Magazine** ("kicker colophon tip") | ui-ux | U7 |
| `--brut-hot` AA-normal bump | **Team A precedent** (stability bar) | impeccable | U4 |
| Pre-commit lint enforcing one `--brut-hot` per route | impeccable original | impeccable | U5 |

## Files added

- `components/ui/brut/RouteAwareWayfinder.tsx`
- `lib/brut/cooked-age.ts`
- `lib/brut/use-shortcut-discovery.ts`
- `lib/brut/__tests__/cooked-age.test.ts`
- `lib/brut/__tests__/use-shortcut-discovery.test.ts`
- `app/actions/__tests__/record-cooked.test.ts`
- `scripts/hot-token-lint.mjs`
- `supabase/migrations/20260425004000_recipe_cooked_at.sql`

## Files modified

- `app/layout.tsx`
- `app/(app)/recipes/page.tsx`
- `app/actions/recipes.ts`
- `components/recipes/RecipeCard.tsx`
- `components/recipes/RecipeListClient.tsx`
- `components/recipes/CookMode.tsx`
- `components/ui/brut/Wayfinder.tsx`
- `styles/tokens-brutalist.css` (~+360 lines)
- `types/recipe.ts`
- `.githooks/pre-commit`
- `package.json`

## Operator follow-ups

1. **Apply the migration:** `supabase db push` against dev → staging → prod. Until applied, `cooked_at` and `cooked_count` are null/0 on existing rows; `recordCooked` server action will fail at the DB layer (caught + logged in the cook-mode completion handler — does not break completion flow).
2. **Verify `--brut-hot` lint** runs on next commit by anyone — `node scripts/hot-token-lint.mjs` from the repo root.
3. **Re-baseline the test-gate** after this PR merges: `npm run test:gate:bootstrap`. The 4 logged overrides are intentional (3 brand-new test files); after baseline they become the new floor.
4. **Refresh `CLAUDE.md`** "Phase 2 features" line to add: "+ recipe heat memory (`cooked_at` + 72 h decay)" once U8 migration is live.

## Rollback

Every commit reverts cleanly. Granular options:

```bash
# Whole-plan rollback (keep contest artifacts)
git revert c72b3fe..3e9c6a0

# Per-feature
git revert c72b3fe              # heat decay rendering
git revert 0f7226b              # cooked_at schema (NB: revert SQL too)
git revert 4c45f45              # kicker hint
git revert 97d7aa8              # tag chip + UNMATCHED
git revert 4f341d4              # hot lint
git revert edd8195              # hot bump
git revert 98b8869 ee97ba1      # empty-state ticket
git revert 336016e              # cook single wayfinder
git revert 3e9c6a0              # title overflow-wrap

# All-the-way rollback (back to REVEAL)
git reset --hard 94aad56
```

For runtime-only disable without code revert: **Settings → DESIGN → CLASSIC** (cookie flip, instant).
