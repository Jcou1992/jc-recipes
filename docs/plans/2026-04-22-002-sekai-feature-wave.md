# 2026-04-22 · Feature Wave — SEKAI refresh

Source: `Notes for new features.md` (Obsidian vault raw/).

Brand decision: app name = **SEKAI 世界** (Japanese for "world"). Replaces `jc-recipes` banner. Treatment: `SEKAI` in Barlow Condensed uppercase (terracotta), `世界` in Noto Serif JP (`var(--text-3)`) beside it.

Scope: 7 plans (A–G) across 4 waves. Decisions below are locked — do not re-ask.

## Decisions (locked)

| # | Topic | Decision |
|---|---|---|
| 1 | App banner | Hardcoded `SEKAI 世界` — not user-editable |
| 2 | Recipe space title | Editable per user, field named `space_name` (future-proof for multiple spaces) |
| 3 | Font-size levels | 3 (SM/MD/LG). Base bumped to 17px |
| 4 | Demo user | `demo@sakai.app`, full access (writable) |
| 5 | Seed content | 1 recipe: classic Smash Burger (EN default) |
| 6 | Onboarding | 6 steps, **opt-in only**, no auto-trigger |
| 7 | Tour re-trigger | "Replay tour" button in `/settings` |
| 8 | Settings entry | Avatar-menu dropdown in nav (replaces separate toggles) |
| 9 | Desktop widths | Fully fluid to ultra-wide, no fixed container cap |

## Wave graph

```
Wave 1 (parallel)
├── A: containers           ~1.5h
├── B: font-size toggle     ~1h
└── D: users + seed         ~2h   (manual SQL + script execution by JC)

Wave 2 (blocks on D)
└── C: editable space name  ~3h

Wave 3 (parallel, blocks on A+B+C)
├── F: form preview pane    ~2h
└── G: /settings + avatar   ~4h

Wave 4 (blocks on C+G)
└── E: onboarding tour      ~6h
```

Total ~19.5h serial · ~11h wall-clock with agents.

---

## Plan A — Responsive Fluid Containers

**Intent**: kill `max-w-3xl` blanket; desktop scales to ultra-wide; list grid grows with viewport.

**Files**
- `app/globals.css` — add container tokens in `@theme` block:
  ```css
  --container-narrow:  40rem;
  --container-default: 68rem;
  --container-wide:    96rem;
  ```
- `app/(app)/recipes/page.tsx` — `max-w-3xl` → `max-w-[min(100%-2rem,1920px)]`. Add `lg:px-8`.
- `components/recipes/RecipeListClient.tsx` L622 grid — `grid-cols-1 sm:grid-cols-2` → `grid-cols-[repeat(auto-fit,minmax(320px,1fr))]`. Featured card `sm:col-span-2` → `col-span-full md:col-span-2`.
- `app/(app)/recipes/[id]/page.tsx` — `max-w-3xl` → `max-w-[min(100%-2rem,1280px)]`.
- `components/recipes/RecipeDetailClient.tsx` L180 grid — `md:grid-cols-[2fr_3fr] md:gap-10` → `md:grid-cols-[1fr_2fr] xl:grid-cols-[1fr_3fr] md:gap-12`.
- `app/(app)/layout.tsx` nav inner — `max-w-3xl` → `max-w-[min(100%-2rem,1920px)]`.
- Form shells (`new/page.tsx`, `[id]/edit/page.tsx`) — land behind F (wave 3). For now widen to `max-w-[min(100%-2rem,1280px)]` at least.

**Tests**: smoke at 1920px width → ≥4 cols; at 2560px → ≥6 cols.

**Risk**: wrapping / overflow on narrow sidebars. Verify detail page at 1024px (no sidebar sticks wrong).

---

## Plan B — Font-Size Preference (3 levels)

**Intent**: base bump from 16px → 17px; user picks SM/MD/LG via preference stored in localStorage.

**Files**
- `app/globals.css`
  ```css
  html { font-size: 1.0625rem; }
  body { line-height: 1.7; }
  :root[data-font-size="sm"] { font-size: 0.9375rem; }
  :root[data-font-size="md"] { font-size: 1.0625rem; }
  :root[data-font-size="lg"] { font-size: 1.1875rem; }
  ```
- NEW `components/ui/FontSizeToggle.tsx` — mirrors ThemeToggle. Cycles SM/MD/LG. localStorage key `preferred-font-size`. Writes `data-font-size` on `<html>`.
- `lib/i18n.ts` — add `fontSizeLabel`, `fontSizeSm`, `fontSizeMd`, `fontSizeLg` (EN+ES).

**Tests**: toggle persists across reload; body text noticeably larger at LG.

**Risk**: long button labels may wrap at LG (e.g., `Iniciar Cocina`). Verify on cook mode + filter buttons.

---

## Plan D — Three-User Seed + Hamburger Demo

**Intent**: Decouple personal / demo / QA users. Seed demo with one recipe.

**Files**
- NEW `scripts/seed-users.mjs`
  - Reads env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JC_USER_PASSWORD`, `DEMO_USER_PASSWORD`, `TEST_USER_PASSWORD`
  - Creates `jc@sakai.app`, `demo@sakai.app`, `test@jc-recipes.local` if missing (idempotent upsert by email)
  - Inserts one recipe for demo@: **Classic Smash Burger**
    - 8 ingredients: 454g ground beef chuck, 4 brioche buns, 4 slices American cheese, 1 head iceberg lettuce, 2 tomatoes, 1 white onion, pickles, ketchup + mustard
    - 6 steps: season beef / press smash / sear 90s / flip+cheese / toast buns / assemble
    - `prep_time: 10`, `cook_time: 8`, `tags: ['beef', 'classic', 'american']`
  - Idempotent: skips if demo already has a recipe named "Classic Smash Burger"
- NEW `supabase/migrations/<ts>_transfer_jc_recipes.sql` — one-off ownership transfer from test@ → jc@. Non-idempotent, run once manually.
- `.env.local` additions: `JC_USER_EMAIL`, `JC_USER_PASSWORD`, `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY`.
- `CLAUDE.md` Test user section — document the three users.
- `tests/e2e/helpers.ts` — add optional `loginAs(email, password)` helper (only if we want e2e against non-default user).

**Manual steps (JC)**:
1. Add env vars to `.env.local`.
2. Run `node scripts/seed-users.mjs`.
3. Run the transfer migration in Supabase dashboard (or via CLI).
4. Sign out of test@ session; sign in as jc@.

**Tests**: e2e regression — login as demo, see exactly 1 recipe (Smash Burger), zero jc@ recipes visible (RLS check).

**Risk**: service-role key in env. Add to `.gitignore` scrutiny (already covered by `.env.local`).

---

## Plan C — App Name + Editable Space Name

**Intent**: hardcode SEKAI banner; editable space_name per user.

**Files**
- `app/(app)/layout.tsx` — replace `jc-recipes` anchor with:
  ```tsx
  <a href="/recipes" className="flex items-baseline gap-1.5">
    <span className="font-label text-lg font-bold tracking-widest uppercase"
          style={{ color: 'var(--color-terracotta)' }}>SEKAI</span>
    <span className="font-display text-sm"
          style={{ color: 'var(--text-3)' }}>世界</span>
  </a>
  ```
- `app/layout.tsx` — metadata title: `SEKAI — recipe tool`. Description update.
- NEW `supabase/migrations/<ts>_create_user_preferences.sql`:
  ```sql
  create table user_preferences (
    user_id uuid primary key references auth.users(id) on delete cascade,
    space_name text,
    tour_completed_at timestamptz,
    tour_dismissed_until timestamptz,
    preferred_font_size text,  -- sm|md|lg (shadow of localStorage, optional DB mirror)
    preferred_theme text,      -- system|dark|light (optional)
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  alter table user_preferences enable row level security;
  create policy "select own prefs"  on user_preferences for select using (auth.uid() = user_id);
  create policy "insert own prefs"  on user_preferences for insert with check (auth.uid() = user_id);
  create policy "update own prefs"  on user_preferences for update using (auth.uid() = user_id);
  ```
  Font-size + theme columns optional — only populated if user chooses "Sync across devices" later (out of scope now).
- NEW `app/actions/preferences.ts` — server actions:
  - `getUserPreferences()` — returns prefs or `null`
  - `updateUserPreferences({ space_name?, tour_completed_at?, tour_dismissed_until? })` — upsert
- `app/(app)/recipes/page.tsx` — read prefs server-side. Title falls back to `t.recipesPageTitle` if `space_name` unset.
- NEW `components/recipes/EditableSpaceName.tsx` — client wrapper around the h1. Double-click (desktop) or pencil icon (mobile) → inline input. Enter saves, Esc cancels. Auto-save on blur. 30-char limit. Toast on save.

**Tests**: e2e — edit space name, reload, persists. Empty string falls back to default.

**Risk**: XSS in user-supplied space_name. Ensure React renders as text (default behavior is safe). Length enforced server-side too.

---

## Plan F — Desktop Form Preview Pane

**Intent**: use freed desktop width on new/edit form with a live recipe-card preview on the right.

**Files**
- `app/(app)/recipes/new/page.tsx` + `[id]/edit/page.tsx` — wrap form + preview in `md:grid md:grid-cols-[3fr_2fr] md:gap-12 md:items-start`. Form left, preview right. Preview `md:sticky md:top-24`.
- NEW `components/recipes/RecipeFormPreview.tsx`
  - Props: `{ preview: { name, description, servings, prep_time, cook_time, tags, ingredients, steps } }`
  - Renders compact `<RecipeCard featured />` using form values.
  - Below card: first 5 ingredients with gold amounts, then `+N more` if >5.
  - Step count badge.
  - Empty state: terracotta-outlined dashed card "Preview appears here" when name blank.
- `components/recipes/RecipeForm.tsx` — add `onPreviewChange?: (preview) => void` callback, fires debounced 150ms.

**Tests**: typing name updates preview card title within 200ms.

**Risk**: preview re-renders cause form laggy. Memoize aggressively + debounce.

---

## Plan G — /settings Page + Avatar Menu

**Intent**: one place for workspace/appearance/language/account. Avatar dropdown in nav as entry.

**Files**
- NEW `app/(app)/settings/page.tsx` — server component. Reads session + prefs. Passes to client.
- NEW `components/settings/SettingsClient.tsx` — sections:
  - **Workspace**: space_name input (same editable control as C, surfaced here too)
  - **Appearance**: theme toggle (reuse `<ThemeToggle />`) + font-size toggle (reuse `<FontSizeToggle />` from B)
  - **Language**: `<LanguageToggle />` segmented or select
  - **Account**: email (read-only), sign-out button
  - **Tour**: "Replay tour" button — writes `tour_dismissed_until = null`, redirects to `/recipes?tour=1`
- NEW `components/ui/AvatarMenu.tsx`
  - Circular button, initial letter (first letter of `space_name` or email local-part), terracotta bg, bone text.
  - Click → dropdown (reuse popover pattern from FilterPopover or simplify)
  - Dropdown items: Settings · divider · quick Theme toggle · quick Language toggle · Sign out
  - Focus trap via `useFocusTrap`; Esc closes.
- `app/(app)/layout.tsx` nav — replace `<LanguageToggle />` + `<ThemeToggle />` + signout `<form>` with single `<AvatarMenu />`.
- `lib/i18n.ts` — new keys: `settingsTitle`, `settingsWorkspaceSection`, `settingsAppearanceSection`, `settingsLanguageSection`, `settingsAccountSection`, `settingsTourSection`, `settingsReplayTour`, `settingsSignOut`, `settingsEmailLabel`, `settingsSpaceNameLabel`.

**Tests**: e2e — avatar click opens menu; "Settings" navigates; font-size change persists; sign-out works.

**Risk**: Avatar-dropdown position on narrow viewports — test mobile.

---

## Plan E — Opt-In Onboarding Tour

**Intent**: 6-step guided walkthrough. Triggered ONLY from /settings "Replay tour" (not auto-fires).

**Files**
- NEW `components/onboarding/OnboardingTour.tsx` — state machine. Reads step index from URL query (`?tour=1&step=2`) or internal state. Renders spotlight + tooltip.
- NEW `components/onboarding/TourSteps.ts` — declarative config:
  ```ts
  export const STEPS = [
    { id: 'welcome', targetSelector: '[data-testid="avatar-menu"]', page: '/recipes' },
    { id: 'search', targetSelector: '[data-testid="recipe-search"]', page: '/recipes' },
    { id: 'filter', targetSelector: '[data-testid="filter-desktop-btn"], [data-testid="filter-mobile-btn"]', page: '/recipes' },
    { id: 'new',    targetSelector: 'a[href="/recipes/new"]', page: '/recipes' },
    { id: 'card',   targetSelector: '[data-testid^="recipe-card-"]', page: '/recipes' },
    { id: 'cook',   targetSelector: '[data-testid="cook-mode-btn"]', page: '/recipes/[id]' }
  ];
  ```
- NEW `components/onboarding/Spotlight.tsx` — SVG mask overlay. Cuts a rect around target (via `getBoundingClientRect`). Updates on scroll/resize.
- NEW `components/onboarding/TourTooltip.tsx` — card with Barlow-caps title, Cormorant body, Next/Back/Skip buttons. Arrow-key support.
- `app/(app)/recipes/page.tsx` — if `?tour=1`, mount `<OnboardingTour />`. Wait 300ms for hydration.
- `lib/i18n.ts` — 18 step keys (6 steps × title/body/cta) EN + ES.
- `app/actions/preferences.ts` — `markTourCompleted()`, `dismissTour(durationDays: number)`.

**Tests**: e2e — from /settings click "Replay tour"; step through all 6; final step marks completed.

**Risk**: target elements don't exist on some viewports (e.g., filter-desktop-btn only visible ≥sm). Gracefully skip missing steps.

---

# Implementation Order

Dispatch agents per wave. Each wave's agents run in parallel when they own disjoint file sets.

### Wave 1 (3 parallel agents)
- Agent A: globals.css container tokens + per-page max-w + list grid
- Agent B: FontSizeToggle + globals.css font-size data-attrs + i18n keys
- Agent D: seed-users.mjs + migration SQL + CLAUDE.md docs (JC runs manually)

Main thread verifies build + smoke after each.

### Wave 2 (1 agent, depends on D manual run)
- Agent C: migration + actions + editable h1 + nav banner update

### Wave 3 (2 parallel agents)
- Agent F: form preview component + wire callbacks
- Agent G: /settings page + AvatarMenu + nav refactor + i18n

### Wave 4 (1 agent)
- Agent E: onboarding tour components + steps + actions + i18n

Final: commit + push + re-run /critique and /audit.

---

# Rollback

Each wave is a separate commit. If a wave fails verification, revert and iterate. DB migrations reversible only for new tables (drop table user_preferences). Recipe-ownership transfer is irreversible without backup — snapshot test@ recipes before running.
