---
title: "feat: brut polish + targeted borrows from losing teams (E heat-decay, A kicker hint)"
type: feat
status: active
date: 2026-04-24
origin: contest/reviews/impeccable.md, contest/reviews/ui-ux-pro-max.md
---

# feat: brut polish + targeted borrows from losing teams

## Overview

The Brutalist-Raw-Luxe winner shipped behind `data-design="brut"` (10 commits, 8 checkpoint tags, all classic-mode behaviour preserved). Two independent reviews — `contest/reviews/impeccable.md` and `contest/reviews/ui-ux-pro-max.md` — converge on (a) three execution bugs visible in the after-screenshots, (b) two governance gaps that will rot the design without enforcement, and (c) two cross-team borrows that materially raise the design. This plan packages those into one reviewable, dependency-ordered work batch.

Nothing here invents new product behaviour; everything traces to a specific finding in one or both reviews. The plan is implementation-ready but the user has not yet approved execution.

## Problem Frame

The brut redesign is "category-distinctive and chef-recognizable" but ships with three observable defects on mobile, lacks mechanical enforcement of its load-bearing taste rule (one `--hot` per screen), and leaves on the table the single most novel emotional primitive the contest produced (Team E's `cooked_at` decay). The reviews are unanimous that these gaps are fixable inside the brut grammar — the borrows do not require softening the lane, they require expressing memory and discovery in the lane's own vocabulary.

## Borrowed Features Provenance (explicit cross-team origin map)

This plan integrates patterns from three of the four losing teams. Every borrow listed below is implemented in **brut grammar** (monospace, ticket nameplate, ref-code labels, `--hot`/`--medal` discipline, no shadows/gradients/blur). The original lane's surface treatment is NOT carried over — only the underlying structural idea.

| Borrow | Source team / lane | Source artifact | Recommended by | Lands in this plan |
|---|---|---|---|---|
| **`recipe.cooked_at` + `--card-heat` 72 h decay → 7 d dormant** | **Team E · Ambient-Atmospheric** | `contest/teams/team-e-ambient/design-spec.md` (atmosphere layer + cooked-at decay); `contest/teams/team-e-ambient/key-snippets/RecipeCard.ambient.tsx` | Judge scorecard §Recommendations · impeccable §"If you had to borrow ONE more moment" · ui-ux §"Borrow recommendation" — three-way unanimous | **R6**, **Decision E**, **Decision F**, **Unit 8** (schema + action), **Unit 9** (CSS + cook completion wiring) |
| **`DORMANT {Xd}` row after 7 days of inactivity** | **Team E · Ambient-Atmospheric (extension)** | impeccable §"Cross-cutting" — explicit additive proposal on top of Team E's primitive: "a recipe that is not cooked is not a badge-worthy streak-broken loss, just information, stated without emotion. Extremely Team D." | impeccable review only | **R6**, **Decision F**, **Unit 9** (third state in the heat-decay helper) |
| **Wayfinder kicker hint row for passive shortcut discovery** | **Team A · Editorial-Magazine** | `contest/teams/team-a-editorial/design-spec.md` §"kicker / colophon tip" pattern; spec rationale "passive discovery without modal/popover/tooltip" | ui-ux §"Borrow recommendation (one UX pattern beyond the judge's list)" — distinct from judge's `?`-dialog suggestion | **R7**, **Decision B**, **Unit 7** |
| **AA-normal contrast bump for `--hot` (`oklch(63.2%) → oklch(66%)`)** | **Team A · Editorial-Magazine (precedent)** | Team A stability report flagged AA-normal as the bar for any small-text accent use; impeccable extends the same bar to brut `--hot` | impeccable §"Failures / risks" — exact value proposed | **R4**, **Decision A**, **Unit 4** |
| **Pre-commit lint enforcing one `--hot` per route** | impeccable original recommendation, no losing team | impeccable §"One concrete next action" | impeccable only | **R5**, **Unit 5** |

Borrows already absorbed in **prior shipping** (NOT in this plan, listed for traceability only):

| Prior borrow | Source team | Where it landed |
|---|---|---|
| `.brut-reserve-ch` (5 ch reserved tabular column for scaler digit + ingredient qty) | **Team A · Editorial-Magazine** — `FeatureSwap` primitive's reserved-ch-width technique | Phase 4b `feat(brut): recipe detail as spec sheet + ASCII scaler fix` (`1593bcc`) |
| `@media print { canvas { display: none !important; } }` defensive print rule | **Team C · Spatial-3D** — print-CSS branch-on-design-mode | Phase 4b `feat(brut): print as mono service ticket` (`8034f7e`) |
| ASCII `-` (U+002D) replacing U+2212 in scaler buttons (iOS numeric keypad) | DOSSIER friction #1; surfaced first by **Team A · Editorial-Magazine** stability report | Phase 4b `feat(brut): recipe detail as spec sheet + ASCII scaler fix` (`1593bcc`), applied to BOTH classic and brut |

Borrows considered but **explicitly rejected** for this plan:

| Rejected borrow | Source | Why rejected |
|---|---|---|
| Spring-physics rotational scaler dial (with rotational drag + inertia) | **Team B · Kinetic-Motion** — scaler-as-rotary-dial | Both reviews + judge flag this as the "chef will curse it into a brunoise" moment. Lane-hostile. |
| AudioContext-primed 40 Hz tock on scaler integer crossings | **Team B · Kinetic-Motion** | Judge recommended it as a single motion borrow, but this plan's scaler is already mechanical/instant. Add only after a real cook validates whether the silence reads cold; deferred to a separate plan if so. |
| 3D material samples (clay/cedar/gold/shoji/iron/porcelain) on hover-card detail | **Team C · Spatial-3D** | Lane-hostile to brut (no shadows, no depth, no gradients). |
| Time-of-day skin re-toning of `--bg` across the day | **Team E · Ambient-Atmospheric** | Lane-hostile to brut (the bone/ink palette is a hierarchy decision, not a mood feature). The `cooked_at` data primitive borrows the *memory* idea without the colour-shift expression. |

## Requirements Trace

- **R1.** Mobile detail-page recipe title must not break character-by-character on long titles (ui-ux §6 `truncation-strategy`, `line-length-control` — graded **CRITICAL** ship-blocker).
- **R2.** Cook mode must show exactly one wayfinder/header at the top, not two (ui-ux §9 `navigation-consistency`, `back-stack-integrity` — graded **HIGH**).
- **R3.** `/recipes` empty state under brut must render the spec'd `[ MISE · EMPTY ]` ticket, not grey skeletons (ui-ux §8 `empty-states`, `content-priority` — graded **MEDIUM**).
- **R4. [BORROW · TEAM A precedent — Editorial-Magazine]** `--hot` token must satisfy WCAG AA-normal text contrast (≥ 4.5:1 on `--ink-900`) OR be formally restricted to large-text/decorative sites with documented sites and lint enforcement. Borrows Team A's stability-report bar (Team A formally treated AA-normal as the contrast floor for any small-text accent); impeccable extends the same bar to brut `--hot`.
- **R5.** A pre-commit lint must fail any change that introduces more than one `--hot` reference per route (impeccable §"one concrete next action").
- **R6. [BORROW · TEAM E — Ambient-Atmospheric]** Recipes acquire a nullable `cooked_at` column populated on cook-mode completion; brut detail and list surfaces show fresh/decaying/dormant memory rows in ticket grammar — `[LAST 03H AGO]`, `[COOKED 14×]`, `[DORMANT 12D]`. Borrows Team E's `cooked_at` → `--card-heat` 72 h decay primitive; brut grammar replaces Team E's aura glow with a labelled bone-tinted ticket row. The `[DORMANT]` third state is impeccable's additive proposal on top of Team E's two-state (fresh / decaying) original.
- **R7. [BORROW · TEAM A — Editorial-Magazine]** Brut wayfinder gains a passive kicker hint row for shortcut discovery (`/`=SEARCH · `F`=FILTER · `ESC`=CLEAR), auto-collapsing after three uses tracked per browser. Borrows Team A's "kicker / colophon tip" passive-discovery pattern (ui-ux §"Borrow recommendation"); brut grammar reduces it to a 24 px mono row beneath the wayfinder. Addresses DOSSIER friction #5 (shortcut discoverability).
- **R8.** Tag chip touch targets reach 40 px on mobile (ui-ux: tag chips at 28 px without the promised `@media` override are visible in the after-state).
- **R9.** `UNMATCHED` ingredient badge raised to ≥ AA-normal contrast (ui-ux: tiny + low contrast on `--surface`).
- **R10.** Classic mode must remain pixel-identical to baseline. Every change scoped under `[data-design="brut"]` or strictly additive (token bump = both modes; `cooked_at` column = both modes consume it but only brut renders it).

## Scope Boundaries

- This plan does NOT alter the choice of winner.
- This plan does NOT undo any commit between `4ee91f5` (Phase 0) and `94aad56` (REVEAL).
- This plan does NOT introduce new third-party libraries.
- This plan does NOT change classic mode visually. (Token recolouring of `--hot` lives only in `:root[data-design="brut"]`; the legacy classic terracotta in `app/globals.css` is untouched.)
- This plan does NOT touch the e2e test files. The 3 pre-existing chromium failures remain pre-existing; they are unrelated to brut and out of scope.

### Deferred to Separate Tasks

- **`/ssh` ASCII easter egg deletion** — separate issue; impeccable + ui-ux concur "ruthlessly delete or silently ship," requires an explicit user decision before code change.
- **`SERVICE COMPLETE` typewriter `steps(16)` reveal** — ui-ux says ship v1 instant first; revisit after a real cook validates it doesn't block the hand. Token + container preserved in this plan; only the animation delta is deferred.
- **Berkeley Mono font drop-in** — separate JC-personal task; ship Plex per stability report.
- **`/recipes/new` progressive disclosure with `SEKAI · NEW · 2/4` wayfinder progression** — ui-ux §"Top 5 collective shortfalls"; significant UX redesign, separate plan.
- **Parallel ingredient timers** — DOSSIER friction #3, brut did not solve, neither did any contest team. Separate plan.
- **Inline form validation on blur** — DOSSIER baseline gap; separate plan.
- **Visual regression test on `sm` font-size for ref-code 11px floor** — judge recommendation; separate test-infra plan.

## Context & Research

### Relevant Code and Patterns

- `styles/tokens-brutalist.css` — sole token + scoped-override file. Every CSS change in this plan lives here unless explicitly noted. Current size ~1126 lines; target after this plan ≤ 1300 lines.
- `app/layout.tsx` — mounts `<Wayfinder crumb="SEKAI" />` globally inside `<body>`. The cook-mode-double-header issue traces to this mount + cook page's local header chrome.
- `components/ui/brut/Wayfinder.tsx` — already returns `null` outside brut mode; can accept additional props for the kicker hint row (R7).
- `components/recipes/CookMode.tsx` — local cook-mode header lives here. Solution path: keep one, drop the other; selecting which is a Key Technical Decision below.
- `components/recipes/RecipeListClient.tsx` — empty-state branch (R3) renders the classic `InkBrush` empty state; add a brut-mode-only branch for `[ MISE · EMPTY ]`.
- `components/recipes/RecipeDetailClient.tsx` — detail title element (R1).
- `components/MacrosCard.tsx` — `UNMATCHED` badge (R9).
- `app/actions/recipes.ts` (existing pattern for server actions) — model for the new `recordCooked` action (R6).
- `supabase/migrations/` — model for the `cooked_at` migration file (R6). Existing migrations show conventional file naming and RLS-aware schema changes.
- `.githooks/pre-commit` + `scripts/test-gate.mjs` — pattern for the hot-token lint (R5). Test-gate runs as a node script invoked by the hook; the new lint follows the same surface.
- `lib/brut/ref-codes.ts` — utility module pattern for any new helpers (e.g. `fmtCookedAge`).

### Institutional Learnings

- `docs/solutions/` not searched in detail for this plan; no prior brut work exists. Carry forward two known conventions from `CLAUDE.md` and existing memory:
  - Always write absolute dates in commits/specs (project memory).
  - Discard `graphify-out/` churn after `graphify update .` (project memory + .githooks pattern).

### External References

None gathered. The codebase patterns for tokens, server actions, migrations, scoped CSS, and pre-commit lints are all established and locally available.

## Key Technical Decisions

- **Decision A — `--hot` recolouring strategy.** Bump `--hot` from `oklch(63.2% 0.148 45)` (ratio 4.9:1 on `--ink-900`) to `oklch(66% 0.15 45)` (ratio ≥ 5.5:1 estimated; verify with token contrast script in U4). Rationale: impeccable proposes this exact value; ui-ux concurs the alternative (formal large-text-only restriction + lint) is harder to police. Bumping the token costs nothing semantically — terracotta still reads as terracotta — and removes a class of accessibility risk across every `--hot` site at once.
- **Decision B — Where the kicker hint lives.** Render as a second 24 px row attached to `<Wayfinder>` (under brut mode) so layout owns it and per-route mounts inherit. Rationale: Wayfinder is already the single ambient surface; adding a sibling row keeps everything wayfinder-aware in one component, no new layout slot.
- **Decision C — Cook mode wayfinder strategy.** Suppress the global `<Wayfinder>` on `/recipes/[id]/cook` and let `CookMode.tsx` own its own brut wayfinder (built using the same `<Wayfinder>` component but with `crumb="SEKAI · {recipeCode} · COOK"`, `modeLabel="STEP {n}/{total}"`, `statusRight="T+{elapsed}"`, `userLabel`). Rationale: spec §2.1 says cook is the canonical wayfinder use site; deduplicate by deleting the local cook chrome rather than the global mount, so other routes still inherit the layout-level mount.
  - Implementation: cook page renders a per-route `<Wayfinder>` directly; layout-level Wayfinder is suppressed for `/cook` paths via a path-aware conditional inside `app/layout.tsx` (read pathname server-side from `headers().get('x-invoke-path')` OR via a new `<RouteWayfinder>` client wrapper that checks `usePathname()` and returns `null` on `/cook`). Pick the simpler one when implementing — see Open Questions.
- **Decision D — Empty state ticket implementation.** Add a brut-mode-only empty state inside `RecipeListClient.tsx` that renders a `<Ticket code="MISE · EMPTY">` with the spec'd ASCII content. Existing `InkBrush` keeps rendering in classic. Use the existing `<Ticket>` primitive — no new component.
- **Decision E — `cooked_at` write semantics.** Server action `recordCooked(recipeId)` is fire-and-forget from `CookMode.tsx`'s completion branch. Never blocks completion UI. Idempotent: writes `cooked_at = now()` and increments a `cooked_count` integer column. Rationale: judge's flag — "confirm `recordCooked()` call is fire-and-forget so it can never block cook completion." Two-column write keeps the schema honest about the count without re-deriving from a join.
- **Decision F — Heat-decay rendering math.** A CSS `@property --card-heat: <percentage>` registered globally; per-card style sets `--card-heat: <0..100>` from `(72h - hours_since_cooked) / 72h * 100`. Brut card grammar: `[LAST 03H AGO]` row text colour = `color-mix(in oklch, var(--bone-100) calc(var(--card-heat) * 1%), var(--bone-300))`. After 72h: `--card-heat = 0` → row reads bone-300. After 7d: server-side classifier returns `dormant=true`, card renders `[DORMANT 12D]` row in `--bone-400` instead. Computed server-side at fetch (existing list query is the right place).
- **Decision G — Plan does not bundle U7 (kicker hint) and U6 (cooked_at) into one PR.** They land in separable PRs so any one can be reverted without affecting the other.

## Open Questions

### Resolved During Planning

- **Where does the empty state ticket live — new component or inline?** Resolved → inline branch inside `RecipeListClient.tsx`, using the existing `<Ticket>` primitive. No new file.
- **Should `--hot` bump apply to classic mode too?** Resolved → no. The classic mode terracotta lives in `app/globals.css` at `--terracotta` and is unrelated; brut's `--hot` is locally defined in `styles/tokens-brutalist.css`. Bump is brut-scoped.
- **Should `cooked_at` migration ship in this plan or a follow-up?** Resolved → in this plan, but as the LAST unit (U10), so the unrelated CSS work can ship independently if `supabase db push` is blocked.

### Deferred to Implementation

- **Wayfinder pathname-aware suppression: `headers()` server-read vs `usePathname()` client-wrapper.** Both are valid; pick whichever yields the smaller diff during implementation. Mention in commit body.
- **Exact threshold for `cooked_at` "fresh" vs "decaying" vs "dormant" boundaries.** Spec'd as 72 h fade + 7 d dormant in this plan; if a real cook reveals 48 h reads better, change the constant in one helper.
- **Whether the kicker hint auto-collapses after three uses or three sessions.** Implement uses-counter first (simpler to localStorage-track per `?` keypress / `/` keypress); revisit if it feels wrong on first cook.
- **Whether the `--hot` lint runs on `**/*.tsx` + `**/*.css` or also on `*.md` files (mockups in `contest/`).** Default to `app/`, `components/`, `styles/` only — exclude `contest/` (frozen artifact).

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
┌─ R1 mobile title wrap (CSS only, brut-scoped) ───────────────────┐
│   styles/tokens-brutalist.css  →  add to .recipe-title rule:     │
│     overflow-wrap: anywhere;                                     │
│     word-break: normal;                                          │
│     hyphens: manual;                                             │
│     font-size: clamp(1.25rem, 5vw, 2.5rem);                      │
└──────────────────────────────────────────────────────────────────┘

┌─ R2 cook double-wayfinder (suppress global on /cook) ────────────┐
│   app/layout.tsx — conditionally render <Wayfinder> based on     │
│   pathname; OR wrap mount in a <RouteAwareWayfinder> client      │
│   component that returns null when usePathname().endsWith('/cook')│
│   components/recipes/CookMode.tsx — gain its own per-route       │
│   <Wayfinder> at the top with full props                         │
└──────────────────────────────────────────────────────────────────┘

┌─ R6 cooked_at memory ────────────────────────────────────────────┐
│   migrations/  ALTER TABLE recipes ADD COLUMN cooked_at TIMESTAMPTZ NULL,
│                ADD COLUMN cooked_count INT NOT NULL DEFAULT 0;   │
│                CREATE INDEX recipes_cooked_at_idx ON recipes(cooked_at DESC);
│   actions/recipes.ts  recordCooked(id) — fire-and-forget         │
│   CookMode.tsx       on completion → recordCooked() (no await)   │
│   List query         SELECT cooked_at, cooked_count, NOW() - cooked_at
│   RecipeCard         <Ticket>...[LAST 03H AGO] [COOKED 14×]</Ticket>
│   tokens-brutalist.css  @property --card-heat + color-mix on row │
└──────────────────────────────────────────────────────────────────┘
```

Diagram framing: the cook-mode strategy and the heat-decay math are the only non-trivial shapes; everything else is CSS or a one-line JSX edit.

## Implementation Units

- [ ] **Unit 1: R1 — Mobile detail title `overflow-wrap` (CSS only)**

**Goal:** Eliminate the character-by-character word-break on long recipe titles on mobile under brut mode.

**Requirements:** R1, R10.

**Dependencies:** None.

**Files:**
- Modify: `styles/tokens-brutalist.css` (extend the existing `.recipe-title` rule under `:root[data-design="brut"]`)

**Approach:**
- Add `overflow-wrap: anywhere; word-break: normal; hyphens: manual;` to the brut-scoped `.recipe-title` rule.
- Wrap the existing `font-size: var(--t-40)` in `clamp(var(--t-20), 5vw, var(--t-40))` so very long titles step down on narrow viewports.
- Verify against `contest/winner/after-screenshots/dark/mobile/recipe-detail.png` (the BulkDel slug case) — if a screenshot pass shows the title fits in ≤ 4 lines on 390 px, done.

**Patterns to follow:**
- All other brut overrides in `styles/tokens-brutalist.css` (scoped under `:root[data-design="brut"]`).

**Test scenarios:**
- Test expectation: none — pure CSS, behaviour-stable. Verification is visual via screenshot diff against the after-state baseline.

**Verification:**
- Mobile detail title on `/recipes/<id>` with a long slug renders ≤ 4 lines on 390×844, never one character per line.
- Classic mode title rendering is unchanged.

---

- [ ] **Unit 2: R2 — Cook-mode double-wayfinder merge**

**Goal:** Cook mode displays exactly one header. The global `<Wayfinder>` is suppressed on `/cook`; the local `CookMode.tsx` mounts its own per-route `<Wayfinder>` populated with cook-specific telemetry.

**Requirements:** R2, R10.

**Dependencies:** None (uses the existing `<Wayfinder>` primitive).

**Files:**
- Modify: `app/layout.tsx` (conditionally suppress `<Wayfinder>` on `/cook` paths)
- Modify: `components/recipes/CookMode.tsx` (mount per-route `<Wayfinder>` at the top of the brut variant; suppress the existing local `← EXIT · STEP n/N` strip under brut mode)
- Possibly create: `components/ui/brut/RouteAwareWayfinder.tsx` (client wrapper that checks `usePathname()` and returns `null` on `/cook` — only if the `headers()` server-side approach is more invasive)

**Approach:**
- Decision C above: suppress global wayfinder on cook routes.
- Per-route Wayfinder props in CookMode: `crumb="SEKAI · {recipeCode} · COOK"`, `modeLabel="STEP {currentStep}/{totalSteps}"`, `statusRight="T+{elapsed}"`, `userLabel="{userInitials}"`.
- The existing classic-mode local cook header remains intact (`[data-design]` selector on `display: none` for the local strip under brut).

**Patterns to follow:**
- `components/ui/brut/Wayfinder.tsx` for prop shapes.
- Existing CookMode `data-testid="cook-mode"` etc. — preserve all testids.

**Test scenarios:**
- **Happy path:** Switch to brut → open `/cook` for any recipe → page shows exactly one wayfinder row (32 px), no overlap with cook-mode chrome.
- **Edge case:** Classic mode → `/cook` shows the existing local `← EXIT · STEP n/N` strip and no global wayfinder (since classic Wayfinder always returns `null`).
- **Edge case:** Brut mode + `/recipes` (non-cook) shows the global wayfinder; brut mode + `/cook` shows only the cook-owned wayfinder.

**Verification:**
- Visual: cook-mode after-screenshot dark/desktop and dark/mobile show one header band, clean separation between header and step content.
- All existing CookMode Playwright assertions (step nav, timer, completion) continue to pass without selector edits.

---

- [ ] **Unit 3: R3 — Brut empty-state ticket on `/recipes`**

**Goal:** Under brut mode, `/recipes` with no results renders a `<Ticket code="MISE · EMPTY">` containing copy that teaches first action; classic continues to render `<InkBrush>`.

**Requirements:** R3, R10.

**Dependencies:** None.

**Files:**
- Modify: `components/recipes/RecipeListClient.tsx` (add brut-mode branch in the empty-state path)
- Possibly extend: `styles/tokens-brutalist.css` for any minor empty-state grid spacing

**Approach:**
- Read `data-design` on mount (existing pattern from other brut components — read once via `useEffect` + state, default to classic for SSR).
- When brut: render `<Ticket code="MISE · EMPTY"><pre>...</pre><p>NO RECIPES YET. PRESS <kbd>N</kbd> OR TAP <span class="brut-cta">+ NEW RECIPE</span>.</p></Ticket>`.
- Classic branch unchanged (`<InkBrush />` empty state).
- Spec'd ASCII content (per design-spec §2.4 / mockup):
  ```
  [ MISE · EMPTY ]
  ────────────────────
  NO RECIPES YET.
  PRESS N OR TAP + NEW
  ```

**Patterns to follow:**
- `components/ui/brut/Ticket.tsx` API (passes `data-code` + children).
- Existing `useDesignMode` pattern (any brut component that conditionally renders).

**Test scenarios:**
- **Happy path:** Brut + empty list → ticket visible, copy matches spec, "+ NEW RECIPE" CTA navigable.
- **Edge case:** Classic + empty list → ink-brush empty state unchanged.
- **Integration:** Search query that matches nothing under brut → same empty ticket, copy may swap to "NO MATCHES." (decide during implementation; minimum bar is the no-recipes case).

**Verification:**
- Re-run `scripts/contest-screenshots-brut.mjs` on a freshly logged-out + re-seeded user; `/recipes` dark/desktop after-screenshot shows the ticket, not grey rectangles.

---

- [ ] **Unit 4: R4 — `--hot` token bump to AA-normal contrast · [BORROW · TEAM A precedent — Editorial-Magazine]**

**Goal:** Bump brut `--hot` from `oklch(63.2% 0.148 45)` to `oklch(66% 0.15 45)` so AA-normal text use sites become safe.

**Requirements:** R4, R10.

**Dependencies:** None (token-only).

**Files:**
- Modify: `styles/tokens-brutalist.css` (lines defining `--hot` and `--hot-a`)

**Approach:**
- Single-line value change on `--hot` and `--hot-a`.
- Do not touch `app/globals.css` or classic mode.
- Add a comment near the token: `/* AA-normal contrast (5.5:1+) on --ink-900; lint enforces ≤ 1 use site per route — see U5 */`.

**Patterns to follow:**
- Existing token comments in `styles/tokens-brutalist.css`.

**Test scenarios:**
- Test expectation: none — token value change. Visual diff is the verification.

**Verification:**
- Compare a brut after-screenshot featuring a `--hot` text site (e.g. cook-mode active step number) against the prior bump value — no aesthetic regression, slightly brighter terracotta.
- Manual contrast check: pick the smallest visible `--hot` text on dark and verify ≥ 4.5:1 via a contrast checker (e.g. WebAIM).

---

- [ ] **Unit 5: R5 — `--hot` lint rule (pre-commit)**

**Goal:** Pre-commit hook fails any change that introduces a route file containing more than one `--hot` reference (CSS or inline style).

**Requirements:** R5.

**Dependencies:** Unit 4 (token bump landed first so lint runs against the corrected value, no flapping).

**Files:**
- Create: `scripts/hot-token-lint.mjs`
- Modify: `.githooks/pre-commit` (add invocation alongside `scripts/test-gate.mjs`)
- Modify: `package.json` (add `"lint:hot": "node scripts/hot-token-lint.mjs"` script)

**Approach:**
- Lint scope: `app/**/*.{ts,tsx,css}`, `components/**/*.{ts,tsx,css}`, `styles/**/*.css`.
- Definition of "route file": any `app/(app)/**/page.tsx`, `app/(auth)/**/page.tsx`, OR any leaf component imported by exactly one route.
- For the MVP, simplify: count `--hot` occurrences per route page file (the `page.tsx`) plus its directly co-located component file, by static grep — anything > 1 fails with a clear message. Token-definition lines in `styles/tokens-brutalist.css` are excluded by file allowlist.
- Failure message: `[hot-lint] FAIL  app/(app)/recipes/[id]/page.tsx contains 3 --hot references. Brut grammar allows ≤ 1 hot element per screen. Reduce, or move shared sites to tokens-brutalist.css.`
- Exit non-zero on fail; zero on pass. No fix mode (manual decision required).

**Patterns to follow:**
- `scripts/test-gate.mjs` for the script-as-pre-commit-hook pattern.
- `CONTRIBUTING_TESTS.md` documents the test-gate; add a sibling `[hot-lint]` section to that file (or a new `CONTRIBUTING_BRUT.md`) — see U10 docs notes.

**Test scenarios:**
- **Happy path:** Add a route that uses `--hot` once → lint passes.
- **Edge case:** Add a route with two `--hot` references → lint fails with a clear message naming the file and count.
- **Edge case:** Modify `styles/tokens-brutalist.css` (which has many `--hot` references inside the token-definition file) → lint passes (file allowlisted).
- **Edge case:** Empty PR (no `.tsx` / `.css` change) → lint passes immediately, no scan.

**Verification:**
- Manually craft a doomed test PR with two `--hot` in `app/(app)/recipes/page.tsx`, run `npm run lint:hot` → fails. Revert.
- Run `node .githooks/pre-commit` directly on the current HEAD → passes (current state is brut-clean modulo legitimate token-definition file).

---

- [ ] **Unit 6: R8, R9 — Tag chip touch targets + UNMATCHED contrast**

**Goal:** Tag chips are at least 40 px tall on mobile under brut. The `UNMATCHED` ingredient badge meets AA-normal contrast.

**Requirements:** R8, R9, R10.

**Dependencies:** Unit 4 (so `--hot` value is final if UNMATCHED uses it; verify which token UNMATCHED currently uses).

**Files:**
- Modify: `styles/tokens-brutalist.css` (mobile media query for `.tag` selector; UNMATCHED badge selector)
- Possibly modify: `components/MacrosCard.tsx` only if the badge currently has no stable class/testid to target

**Approach:**
- Tag chip: under `:root[data-design="brut"]` + `@media (max-width: 640px)`, set `.tag` `min-height: 40px; padding-block: 8px;`. Desktop unchanged (~28 px is fine for mouse targets).
- UNMATCHED badge: identify its current selector, raise text colour from `--text-4` (52% L) to `--text-2` (88% L) and add a 1 px `--rule-strong` border so it reads as a labelled cell, not a low-priority hint. No layout shift.

**Patterns to follow:**
- Existing brut media-query overrides in `styles/tokens-brutalist.css`.

**Test scenarios:**
- **Happy path:** Brut mobile (390×844) shows tag chips ≥ 40 px tall.
- **Happy path:** Brut detail page with a partial macros card shows UNMATCHED badge with high-contrast text + labelled border.
- **Edge case:** Classic mode tag chips and UNMATCHED badges unchanged.

**Verification:**
- Mobile after-screenshots show tag chips clearly tappable.
- UNMATCHED badge reads at arm's length under kitchen lighting (subjective; objective: text contrast ≥ 4.5:1 against `--surface`).

---

- [ ] **Unit 7: R7 — Wayfinder kicker hint row · [BORROW · TEAM A — Editorial-Magazine]**

**Goal:** Add a passive 24 px row beneath the brut wayfinder showing keyboard shortcut hints. Auto-collapses after the user uses three of the listed shortcuts (tracked per browser).

**Requirements:** R7.

**Dependencies:** None (extends `<Wayfinder>` only).

**Files:**
- Modify: `components/ui/brut/Wayfinder.tsx` (add an optional `<KickerHint>` child or a sibling row)
- Create: `lib/brut/use-shortcut-discovery.ts` (small hook tracking shortcut-uses count in localStorage)
- Modify: `styles/tokens-brutalist.css` (style the `.brut-kicker` row — 24 px, 10 px mono, `--text-3`, single 1 px bottom rule)

**Approach:**
- Hint copy (rotates / shows all 3 inline; pick inline for simplicity): `[HINT · KEYS]  /:SEARCH   F:FILTER   ESC:CLEAR`.
- Render under brut mode by default for first three sessions, OR until the localStorage counter `brut.shortcut.uses` reaches 3, whichever comes first.
- The hook listens for `keydown` of `/`, `f`, `Escape`, increments the counter, and persists.
- After threshold: row collapses (`display: none` + a `<button class="brut-show-kicker">[?] KEYS</button>` re-shows it).

**Patterns to follow:**
- `lib/brut/ref-codes.ts` for utility module shape.
- Existing keyboard-shortcut handlers in `RecipeListClient.tsx` for `/`, `F`, `Esc`.

**Test scenarios:**
- **Happy path:** First-time brut visit → kicker row visible.
- **Happy path:** Use `/` once → counter increments to 1 → row still visible.
- **Happy path:** Use three shortcuts → row hides on next render; small `[?] KEYS` button visible to bring it back.
- **Edge case:** Classic mode → no kicker row visible (Wayfinder is `null` in classic anyway).
- **Edge case:** localStorage cleared → row reappears.
- **Integration:** Existing `/`, `F`, `Esc` keybindings continue to work (the discovery hook only counts; it does not handle).

**Verification:**
- After-screenshot dark/desktop list page (fresh-state browser) shows the kicker row immediately under the wayfinder.
- After three shortcut uses, screenshot shows kicker collapsed.

---

- [ ] **Unit 8: R6.A — `cooked_at` schema migration + server action (DB layer) · [BORROW · TEAM E — Ambient-Atmospheric]**

**Goal:** Recipes table gains `cooked_at TIMESTAMPTZ NULL` and `cooked_count INT NOT NULL DEFAULT 0`. A `recordCooked(recipeId)` server action stamps both. Both modes consume the data; only brut renders it (U9).

**Requirements:** R6, R10.

**Dependencies:** None (schema work is independent of CSS; lands before U9 so the read side has data shape ready).

**Files:**
- Create: `supabase/migrations/<NEXT_TIMESTAMP>_recipe_cooked_at.sql`
- Modify: `app/actions/recipes.ts` (add `recordCooked` server action)
- Modify: `lib/queries/recipes.ts` or wherever the list/detail SELECT lives — extend SELECT to include `cooked_at`, `cooked_count`
- Modify: `types/recipe.ts` (or equivalent type module) — extend the `Recipe` type with the two new optional fields

**Approach:**
- Migration:
  ```
  ALTER TABLE recipes ADD COLUMN cooked_at TIMESTAMPTZ NULL;
  ALTER TABLE recipes ADD COLUMN cooked_count INT NOT NULL DEFAULT 0;
  CREATE INDEX recipes_cooked_at_idx ON recipes(cooked_at DESC) WHERE cooked_at IS NOT NULL;
  -- RLS unchanged — column inherits the existing policies.
  ```
- Server action `recordCooked(recipeId: string)`:
  - Authenticates (existing pattern).
  - `UPDATE recipes SET cooked_at = NOW(), cooked_count = cooked_count + 1 WHERE id = $1 AND user_id = $auth_uid` (RLS-protected).
  - Returns `void`. No `revalidatePath` (the next list fetch picks it up; intentional — completion screen should not block).
- Type extension: `cooked_at?: string | null; cooked_count?: number;` on the Recipe interface.
- Migration must be reviewed before `supabase db push`; this plan ships the migration file but does NOT apply it (per project convention — migration application is a separate operator step).

**Patterns to follow:**
- Existing `supabase/migrations/*.sql` files for header comments + idempotency style.
- Existing server actions in `app/actions/recipes.ts` for auth check + Supabase client pattern.

**Test scenarios:**
- **Happy path (jest, mocked Supabase):** `recordCooked('rec-1')` issues an UPDATE with `cooked_at = NOW()` + `cooked_count = cooked_count + 1`.
- **Edge case:** Missing auth → action throws or returns failure (consistent with existing actions).
- **Edge case:** Recipe owned by another user → update returns 0 rows (RLS), action does not throw, returns void.
- **Edge case:** Called twice in quick succession → both succeed; final `cooked_count` increments by 2.
- **Integration (DB-backed test if available, otherwise document manual verification):** After `supabase db push` + `recordCooked` from the e2e seed user, SELECT shows `cooked_at` populated and `cooked_count = 1`.

**Verification:**
- Migration applies cleanly (`supabase db reset` on local dev). Verified manually before merge.
- Jest unit tests for `recordCooked` pass.
- Existing recipe queries return the new fields (or `null`) without breaking deserialization.

---

- [ ] **Unit 9: R6.B — Brut card heat-decay rendering (CSS + cook completion wiring) · [BORROW · TEAM E — Ambient-Atmospheric, with impeccable's `[DORMANT]` extension]**

**Goal:** Brut recipe cards show `[LAST {age}]` and `[COOKED {n}×]` rows, with text colour fading bone-100 → bone-300 across 72 h via `--card-heat`. After 7 days a `[DORMANT {d}D]` row replaces them in `--bone-400`. Cook-mode completion fires the server action from U8 fire-and-forget.

**Requirements:** R6, R10.

**Dependencies:** Unit 8 (schema + action exist).

**Files:**
- Modify: `components/recipes/CookMode.tsx` (call `recordCooked(recipeId)` in the completion branch — no `await`, wrapped in `try/catch` that swallows + logs)
- Modify: `components/recipes/RecipeCard.tsx` (compute heat percentage, set `style={{ '--card-heat': pct }}`; render the brut-only `<Ticket>` row with last-cooked + count, fall back to `[NEW]` if `cooked_at` is null)
- Modify: `styles/tokens-brutalist.css` (`@property --card-heat`; `.brut-card-heat-row` colour rule with `color-mix`)
- Create: `lib/brut/cooked-age.ts` (helper: `fmtCookedAge(cookedAt: string | null): { label: string; pct: number; dormant: boolean }`)

**Approach:**
- `@property` registration:
  ```
  @property --card-heat {
    syntax: '<percentage>';
    inherits: true;
    initial-value: 0%;
  }
  ```
- Rendering rule:
  ```
  :root[data-design="brut"] .brut-card-heat-row {
    color: color-mix(in oklch, var(--bone-100) var(--card-heat), var(--bone-300));
  }
  ```
- Helper logic:
  - `null` → `{ label: 'NEW', pct: 0, dormant: false }`
  - 0–72 h → `{ label: 'LAST {Xh AGO | Xd AGO}', pct: 100 - (hours / 72) * 100, dormant: false }`
  - 72 h–7 d → `{ label: 'LAST {Xd AGO}', pct: 0, dormant: false }`
  - ≥ 7 d → `{ label: 'DORMANT {Xd}', pct: 0, dormant: true }`
- Card meta block under brut renders one of three states based on the helper output.
- Cook-mode completion wiring:
  ```
  // inside the completion branch:
  recordCooked(recipeId).catch((e) => console.warn('recordCooked failed', e));
  ```
  Never awaited. Never blocks UI.

**Patterns to follow:**
- `components/MacrosCard.tsx` for `@property`-driven CSS variable usage (existing pattern in this codebase).
- `lib/brut/ref-codes.ts` for utility module shape.

**Test scenarios:**
- **Unit (jest):** `fmtCookedAge(null)` → `NEW / 0% / not dormant`.
- **Unit (jest):** `fmtCookedAge(now - 3h)` → `LAST 03H AGO / ~96% / not dormant`.
- **Unit (jest):** `fmtCookedAge(now - 80h)` → `LAST 03D AGO / 0% / not dormant`.
- **Unit (jest):** `fmtCookedAge(now - 12d)` → `DORMANT 12D / 0% / dormant`.
- **Edge case:** `fmtCookedAge` with future date (clock skew) → defensively returns `NEW`.
- **Integration (Playwright, brut mode):** Complete a cook for a recipe → return to `/recipes` → that card shows `[LAST 00H AGO]` + `[COOKED 1×]` row. (Requires `cooked_at` migration applied locally.)
- **Edge case (Playwright, classic mode):** Complete a cook for a recipe → completion still works → `recordCooked` fires (verify via DB) → classic list view shows nothing different (classic doesn't render the rows).

**Verification:**
- Cook a recipe, refresh `/recipes` under brut → see the labelled bright bone-100 last-cooked row on that card.
- Wait synthetically (mock clock in jest) 80 h → row reads bone-300, no `[COOKED ×]` change.
- Wait 12 d → row replaced by dormant text in bone-400.
- Cook completion path is never blocked by network failure on `recordCooked`.

---

## System-Wide Impact

- **Interaction graph:**
  - `app/layout.tsx` Wayfinder mount becomes pathname-aware (U2). Touches every route render — tested via the existing Playwright auth-and-navigate setup.
  - `CookMode.tsx` gains a `recordCooked` call (U9). Cook completion screen + completion-screen testids unchanged.
  - `RecipeCard.tsx` gains a meta-row block under brut (U9). Classic render path unchanged.
- **Error propagation:**
  - `recordCooked` is fire-and-forget; errors logged via `console.warn`, never surfaced to the user (Decision E).
  - Lint failures (U5) abort the commit and show a clear message; documented in `CONTRIBUTING_TESTS.md` next to test-gate.
- **State lifecycle risks:**
  - `cooked_at` and `cooked_count` are write-once-per-completion; no race with edits.
  - localStorage state for shortcut-discovery counter is per-browser; cleared by user normally; degrades gracefully (kicker row shows again, no harm).
- **API surface parity:** Both classic + brut hit the same `recordCooked` action and read the same columns. Renderer choice is mode-scoped only.
- **Integration coverage:**
  - Cook-completion → list-view roundtrip is the one cross-layer flow; covered by U9 Playwright test once migration is applied.
- **Unchanged invariants:**
  - All 28 existing Playwright tests + 197 Jest tests continue to pass.
  - Classic mode visual baseline unchanged.
  - All 8 contest checkpoint tags remain valid for revert.
  - Existing `data-testid` attributes preserved.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `--hot` token bump shifts an active site visually in a way that disrupts cook-mode legibility | Visual screenshot diff before/after U4; if any site reads worse, revert U4 token-only commit; lint (U5) is independent and can ship anyway. |
| Pathname-aware Wayfinder suppression (U2) introduces SSR/CSR mismatch | Pick the simpler implementation (server `headers()` read); if hydration warning fires, switch to client-only `usePathname()` wrapper that defaults to mounted=false during SSR. Either path tested by existing layout-render Playwright assertions. |
| `cooked_at` migration cannot be `supabase db push`'d (operator unavailable, network) | Migration file ships in `supabase/migrations/`; consumer code (U9) defaults `cooked_at = null` → renders `[NEW]`; no UI breakage. Apply migration in a follow-up operator window. |
| Pre-commit lint (U5) is too strict and blocks legitimate bug-fix PRs | Document override mechanism (same `[lint:hot-override: <reason>]` commit-message pattern as test-gate); log overrides to `.test-gate/overrides.log`. |
| Kicker hint (U7) competes for visual weight with the wayfinder | Set kicker text colour to `--text-3` (one tier below wayfinder content) and 10 px (one tier below 11 px wayfinder). Auto-hides after threshold so steady state is the existing wayfinder alone. |
| Heat-decay row pushes card height and breaks list grid rhythm | Reserve fixed 24 px row inside the card under brut (always present, content varies); no layout shift between fresh / decayed / dormant / NEW states. |

## Documentation / Operational Notes

- Update `CLAUDE.md` "Phase 2 features" line to add: "+ recipe heat memory (`cooked_at` + 72 h decay)" once U8+U9 land.
- Add a `[hot-lint]` section to `CONTRIBUTING_TESTS.md` mirroring the test-gate override format.
- Migration in U8 must be applied via `supabase db push` against staging then prod — coordinate with the operator before merging U9 to main; the consumer code in U9 is null-safe and can ship before the migration applies, but `cooked_count` increments will silently fail until the column exists.
- Once U9 is live, refresh the after-screenshots: re-run `scripts/contest-screenshots-brut.mjs` and replace `contest/winner/after-screenshots/` (or save under `contest/winner/after-screenshots-v2/`).

## Sources & References

- **Origin reviews:**
  - [contest/reviews/impeccable.md](contest/reviews/impeccable.md)
  - [contest/reviews/ui-ux-pro-max.md](contest/reviews/ui-ux-pro-max.md)
- **Judge scorecard (background):** [contest/judge/scorecard.md](contest/judge/scorecard.md) — specifically the §Recommendations + §Risks-to-flag sections.
- **Winner's design + plan:** [contest/winner/design-spec.md](contest/winner/design-spec.md), [contest/winner/implementation-plan.md](contest/winner/implementation-plan.md)
- **Project briefing:** [contest/_analysis/DOSSIER.md](contest/_analysis/DOSSIER.md)
- **Visual baseline:** `contest/winner/after-screenshots/` (current brut state with the three visible defects)
- **Implementation conventions:** [CLAUDE.md](CLAUDE.md), [CONTRIBUTING_TESTS.md](CONTRIBUTING_TESTS.md)
- **Rollback safety net:** all 8 `checkpoint/*` tags remain valid; this plan adds new commits, never amends prior ones.
