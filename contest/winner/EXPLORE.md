# SEKAI Brut — How to Explore the New Features

A walk-through of every change shipped in `docs/plans/2026-04-24-001-feat-brut-polish-borrows-plan.md`. Designed for JC at the kitchen counter and any invited chef who picks up the app cold.

## 1. Start the app

From the repo root:

```bash
cd /Users/JC/Dev/jc-recipes/.claude/worktrees/adoring-hamilton-98d792
npm run dev
```

Open http://localhost:3000/login.

## 2. Sign in

| User | When to use |
|---|---|
| `jc@sakai.app` | JC's personal account with real recipes |
| `demo@sakai.app` | demo/showcase account (Classic Smash Burger seed) |
| `test@jc-recipes.local` | QA seed — many test recipes — best for stress-testing the list |

Passwords in `.env.local` (TEST_USER_PASSWORD for the QA user; JC has the others).

## 3. Toggle brut mode

Settings → **DESIGN** section → **`BRUT`**. Cookie flip. The whole app re-skins on the next nav.

To toggle back: same place → **`CLASSIC`**.

To force brut directly via DevTools console (no settings round-trip):

```js
document.cookie = 'design-mode=brut; path=/; max-age=31536000';
location.reload();
```

To force classic:

```js
document.cookie = 'design-mode=classic; path=/; max-age=31536000';
location.reload();
```

## 4. Walk the new features (in shipping order)

### 4.1 Mobile recipe-detail title (U1)

**What to see:** open any recipe with a long single-word title on a 390 × 844 viewport (DevTools mobile emulation works). Before this change, slugs like `BulkDel-w2-1776892154725-A` wrapped one character per line for ~25 lines and pushed COOK off-screen. Now they break sensibly and the font-size steps down via `clamp()` so the title always fits in ≤ 4 lines.

**Try it:**
- Open DevTools → toggle device toolbar → iPhone 12 Pro (390 × 844).
- Navigate to any seed recipe with a long title. (`/recipes` → tap the longest one.)
- Title should fit comfortably and COOK should be visible without scrolling.

### 4.2 Cook-mode single wayfinder (U2)

**What to see:** open `/recipes/<id>/cook` under brut. There used to be two stacked headers — the global SEKAI bar AND the local `← EXIT · STEP n/N` strip. Now there is exactly **one** wayfinder, fed with cook-specific telemetry:

```
SEKAI · REC-A8F3 · COOK   STEP 3/7   T+04:21
```

The `T+MM:SS` ticks live every second while the cook is in progress.

**Try it:**
- Brut mode → open any recipe → tap **COOK**.
- Top of screen: **one** 32 px wayfinder bar. The classic local "EXIT / STEP" strip is hidden.
- Watch `T+MM:SS` increment.
- Tap the next-step arrow (or swipe right). `STEP n/N` updates.
- Reach the last step → completion screen appears. Wayfinder disappears so it doesn't overlap the ✕.
- Switch to classic → cook mode shows the original local `← EXIT · STEP n/N` strip and no global bar.

### 4.3 Empty-state ticket `[ MISE · EMPTY ]` (U3)

**What to see:** the empty state on `/recipes` under brut is now a labelled ticket with a clear first action.

**Try it (truly-empty case):**
- Sign in as a brand-new user with zero recipes (or temporarily filter your DB by deleting your seeds).
- `/recipes` shows:
  ```
  [ MISE · EMPTY ]
  ────────────────────
  NO RECIPES YET.
  PRESS [N] OR TAP + NEW RECIPE.
  ```
- Tap **+ NEW RECIPE** → routes to `/recipes/new`.

**Try it (filtered-empty case):**
- Brut mode + recipe list with seed data → search for `xyzqqq` (no matches).
- Empty state shows:
  ```
  [ MISE · EMPTY ]
  ────────────────────
  NO MATCHES.
  QUERY: "XYZQQQ"
  CLEAR FILTERS · OR REPHRASE QUERY.
  ```
- Tap **CLEAR FILTERS** → list re-populates.

### 4.4 `--hot` token bump to AA-normal (U4)

**What to see:** every brut `--hot` site (cook-mode active step number, scaler `×N.NN` digit, sort-pill underline, hover card border, primary CTA border, etc.) is slightly brighter terracotta. Now ≥ 5.5:1 contrast on `--ink-900`.

**Try it:**
- Open cook mode under brut → step number `3/7` reads with crisp terracotta hue.
- Open any recipe detail → adjust scaler to ×2 → the `×2.00` digit is the brighter terracotta.

### 4.5 `--hot` lint (U5)

**What to see:** if anyone tries to commit a route that uses `--hot` more than once, the pre-commit hook fails with a clear message. The brut grammar's "one active element per screen" rule is now mechanically enforced.

**Try it:**

```bash
# Add two --hot in app/(app)/recipes/page.tsx temporarily
echo "/* var(--hot) and var(--hot) */" >> "app/(app)/recipes/page.tsx"
git add "app/(app)/recipes/page.tsx"
git commit -m "test: should fail"
# Expected output:
# [hot-lint] FAIL  app/(app)/recipes/page.tsx contains 2 --hot references.
# Brut grammar allows ≤ 1 hot element per screen.
# Reduce, or move shared sites to tokens-brutalist.css.

# Clean up
git restore --staged "app/(app)/recipes/page.tsx"
git checkout "app/(app)/recipes/page.tsx"
```

To run the lint manually any time:

```bash
npm run lint:hot
```

To override the lint when there's a legitimate reason (e.g. truly two active states need terracotta on a single screen for accessibility), include the override tag in the commit message:

```
feat: explain why two --hot are needed here

[lint:hot-override: cook-mode timer overdue + step number both must be hot per spec §X]
```

The override is logged to `.test-gate/overrides.log`.

### 4.6 Tag chip touch + UNMATCHED contrast (U6)

**What to see:**
- On mobile (≤ 640 px) under brut, every tag chip in the rail and filter panel is at least 40 px tall — comfortable to tap with wet hands.
- On the recipe detail page under brut, any ingredient that didn't match an FDC entry shows an **`UNMATCHED`** badge with bone-toned text, hard rule-strong border, zero radius. Reads as a labelled cell, not a low-priority hint.

**Try it (tag chips):**
- Brut mode + mobile viewport → `/recipes` → tap tag chips. They feel sized for fingers, not pointers.

**Try it (UNMATCHED):**
- Brut mode → open a recipe with a fragile ingredient name (e.g. "drained Castelvetrano olives"). If FDC didn't match it, the badge appears beside the row with high contrast.

### 4.7 Wayfinder kicker hint row (U7)

**What to see:** under brut, immediately beneath the 32 px wayfinder, a 24 px row shows:

```
[HINT · KEYS]   /:SEARCH    F:FILTER    ESC:CLEAR
```

After you've used three of those shortcuts (any combination — tracked per browser via `localStorage`), the row collapses. A small `[?] KEYS` button replaces it for re-discovery.

**Try it:**
- Fresh browser (or DevTools → Application → Storage → Clear site data).
- Sign in → brut mode → `/recipes` → kicker row visible immediately under wayfinder.
- Press `/` → search input focuses. Counter goes to 1.
- Press `Esc` → search clears. Counter goes to 2.
- Press `f` → tag rail expands. Counter goes to 3 → kicker collapses.
- Refresh page → kicker stays collapsed (persisted).
- Tap the small `[?] KEYS` button at the right edge of the wayfinder → kicker re-opens, counter resets.

**Note:** cook mode opts out (`<Wayfinder hideKicker />`) — its keyboard map (space/arrows) isn't represented in the list-page hints.

### 4.8 Recipe heat decay (`cooked_at`) — Team E borrow (U8 + U9)

**What to see:** brut recipe cards display a memory row beneath the title:

| State | Renders |
|---|---|
| Never cooked / `cooked_at` null | `[NEW]` |
| Cooked < 72 h ago | `[LAST 03H AGO]   [COOKED 14×]` — bone-100 fading toward bone-300 over the 72 h |
| Cooked > 72 h, < 7 d ago | `[LAST 03D AGO]   [COOKED 14×]` — fully bone-300 |
| Cooked ≥ 7 d ago | `[DORMANT 12D]` — bone-400, no count |

Cook-mode completion stamps `cooked_at = NOW()` and increments `cooked_count` atomically.

**Operator step (one-time):** apply the migration before this lights up.
```bash
supabase db push   # against dev → staging → prod
```
Migration file: `supabase/migrations/20260425004000_recipe_cooked_at.sql`. Adds `cooked_at TIMESTAMPTZ NULL`, `cooked_count INT NOT NULL DEFAULT 0`, partial index, and the `record_cooked(uuid)` Postgres function.

**Try it (before migration applied):**
- Brut mode → `/recipes` → every card shows `[NEW]`. Cook completion silently fails at the DB layer (caught + logged); UI is unaffected.

**Try it (after migration applied):**
- Brut mode → `/recipes` → cards still show `[NEW]` for any recipe never cooked.
- Open a recipe → enter cook mode → walk through to completion → exit.
- Return to `/recipes` → that card now shows `[LAST 00H AGO]   [COOKED 1×]` in bright bone.
- Wait 80 minutes (or fudge clock for testing) → row colour fades.
- Wait 72 hours → row reads bone-300, `[LAST 03D AGO]`.
- Wait 7 days → row reads `[DORMANT 7D]` in bone-400.

**Manual stress-test for the dormant state without waiting 7 days:** apply a SQL update against the dev DB:
```sql
UPDATE recipes SET cooked_at = NOW() - INTERVAL '12 days' WHERE id = '<recipe-id>';
```
Refresh `/recipes` → that card reads `[DORMANT 12D]`.

## 5. Verify the safety net

| Property | How to verify |
|---|---|
| Classic mode unchanged | Toggle to classic → `/recipes` and detail look pixel-identical to baseline |
| All sacred features work | Auth, CRUD, search/filter/sort, scaler, unit toggle, cook mode, toasts, copy ingredients, unit autocomplete, print, font-size pref — exercise each on both modes |
| Build clean | `npm run build` |
| Tests pass | `npm test` (211/211) |
| Pre-commit hooks fire | `git commit` on any test branch — both `lint:hot` + `test-gate` should run |

## 6. Kitchen scenarios — the real test

These are the moments the polish was for. Run them before declaring "ready for service."

### Scenario A — service rush at 17:30
1. iPhone in counter mount, brut mode, hands floured.
2. Open `/recipes` → search by `/`, type **`yakit`**, results filter.
3. Tap a result → detail loads → tap **+** twice on scaler → ingredients re-tally instantly, `×3.00` reads bright terracotta.
4. Tap **COOK** → step 1 fills the screen → swipe → step 2 → step 3.
5. Step 3 has a 90 s timer → tap **START** → timer counts down in 64 pt mono.
6. Reach completion → **SERVICE COMPLETE** stamp prints in gold.
7. Back to `/recipes` → that card now shows `[LAST 00H AGO]   [COOKED 1×]` in bright bone. Brain confirms: yes, that's the one I just made.

**Pass criteria:** zero stuck moments, zero misreads, zero off-screen UI, zero cursing.

### Scenario B — first invited chef
1. New user `chef-friend@invite.com` signs in.
2. `/recipes` shows `[ MISE · EMPTY ]` ticket. They understand: press N or tap + NEW RECIPE.
3. Wayfinder kicker row teaches them `/`, `F`, `Esc` over the next three sessions.
4. They cook three of JC's recipes → those cards now glow brightly bone in their list, they remember which are recent.

**Pass criteria:** no documentation read, no tutorial, brut is self-teaching.

### Scenario C — left for a week, came back
1. JC opens the app after a 12-day break.
2. `/recipes` → cards he hasn't touched in over a week show `[DORMANT 9D]`, `[DORMANT 12D]` in muted bone.
3. The recipe he cooked last night still shows `[LAST 22H AGO]` in bright bone.
4. He re-cooks one of the dormant recipes → it returns to bright `[LAST 00H AGO]   [COOKED 4×]`.

**Pass criteria:** the app remembered. No badges, no streaks, no "you haven't cooked X in 12 days!" notification — just a labelled state, stated without emotion.

## 7. Where everything lives

| You want to... | Look here |
|---|---|
| Toggle brut/classic in app | Settings → DESIGN |
| Toggle brut/classic via cookie | DevTools → `document.cookie = 'design-mode=brut; path=/'; location.reload()` |
| See all CSS that defines brut | `styles/tokens-brutalist.css` |
| See the wayfinder + kicker | `components/ui/brut/Wayfinder.tsx` |
| See the heat-decay helper | `lib/brut/cooked-age.ts` |
| See the shortcut-discovery hook | `lib/brut/use-shortcut-discovery.ts` |
| See the cook completion stamp | `components/recipes/CookMode.tsx` (search `recordCooked`) |
| See the heat-decay paint rule | `styles/tokens-brutalist.css` (search `--card-heat`) |
| Manually run the hot-lint | `npm run lint:hot` |
| Apply the cooked_at migration | `supabase db push` (dev→staging→prod) |
| Roll back any single feature | `git revert <sha>` (see `contest/winner/CHANGES.md` rollback table) |

## 8. Known limitations / follow-ups

- The `cooked_at` migration is **not yet applied**. Apply via `supabase db push` to enable the heat decay end-to-end.
- The `/ssh` ASCII easter egg is intentionally not implemented (judge said "delete or silently ship"; deferred to a separate decision).
- The `SERVICE COMPLETE` typewriter `steps(16)` reveal is currently rendered instant (per ui-ux: ship v1 instant, add typewriter only after a real cook validates it doesn't block the hand).
- Berkeley Mono is not bundled — ship is on IBM Plex Mono. JC can drop personal woff2 files into `public/fonts/berkeley-mono/` and add `@font-face` to the brut tokens stylesheet to enable on his devices.
- `/recipes/new` does not yet have a staged `SEKAI · NEW · 2/4` wayfinder progression (ui-ux flagged this; separate plan).
- Parallel ingredient timers (DOSSIER friction #3) remain unsolved (separate plan).
- Inline form validation on blur (DOSSIER baseline gap) deferred (separate plan).
