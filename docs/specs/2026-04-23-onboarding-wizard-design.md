# Design — Onboarding Wizard (F1)

**Status:** approved (with Open Questions pending)
**Date:** 2026-04-23
**Revised:** 2026-04-23 (post-review)
**Author:** JC (via brainstorming with Claude)
**Related specs:** `2026-04-23-serving-definition-design.md`, `2026-04-23-macros-mvp-design.md`
**Reserved migration range:** `20260425_0010xx_*.sql`

---

## Goal

Give every new SEKAI user a one-screen, in-flow setup of the four display preferences (theme, language, text size, units) as step 0 of the existing tour. Same screen reappears on every demo@ login as part of the demo reset ritual.

## Non-goals

- No marketing / lifestyle copy
- No avatar, no space_name in MVP (candidate for later settings page only)
- No signup flow changes — wizard triggers after auth lands user on `/recipes`
- No retrofit of existing real users — migration backfills `tour_completed_at` for all existing rows; the demo user gets re-nulled on next login by `resetDemoPreferences()`

## Design principles

1. One ceremony only. Wizard is step 0 of the 5-step tour; step 0 is the only non-skippable step. Steps 1–5 retain existing Skip behavior.
2. Live preview. Theme, size, and unit pickers apply instantly to the wizard card itself so chef sees the decision before committing. (Language is an exception — see Error handling.)
3. DB-authoritative, SSR-painted. On Next, upsert `user_preferences` then mirror to `PREF_COOKIE_*` cookies in the same server action so next navigation paints correct server-side.
4. Demo user is a live showcase. Every demo@ login resets the preference row + cookies so the wizard re-runs from defaults.

## User flows

### New real user, first login

1. User signs up at `/signup`, lands on `/recipes` via existing auth flow.
2. Root layout sees `tour_completed_at IS NULL` for this user → sets `data-tour="1"` on `<body>`.
3. Tour controller (existing) opens on step 0 (new wizard card) instead of existing step 1 (spotlight).
4. Chef picks 4 prefs → Next saves + cookies set → tour advances to step 1 spotlight.
5. Tour ends via existing Finish or Skip. `markTourCompleted()` runs, wizard never reappears.

### Demo@ login (every time)

1. Existing `login()` action at `app/actions/auth.ts:14` detects `email === DEMO_EMAIL`.
2. New action `resetDemoPreferences()` runs via the user-scoped Supabase client: UPDATE `user_preferences` setting `preferred_theme = null`, `preferred_font_size = null`, `preferred_language = null`, `preferred_units = null`, `tour_completed_at = null` where `user_id = demo_user_id`. Then `clearAllPrefCookies()` (including language).
3. Redirect to `/recipes?tour=1` as today. Root layout reads null prefs → sets defaults (dark/en/MD/metric) → wizard renders.

Rationale for UPDATE (not DELETE): the existing RLS policy set on `user_preferences` has only SELECT/INSERT/UPDATE policies. Adding a DELETE policy widens the attack surface. Nulling all columns achieves the same effect (wizard loads defaults) without schema-policy changes.

### Existing real user (jc@, test@, others)

1. Migration runs. All existing `user_preferences` rows get `tour_completed_at = coalesce(tour_completed_at, now())` unconditionally (see Architecture for the actual SQL — no runtime-set GUC dependency).
2. Demo@ user gets re-nulled on its next login by `resetDemoPreferences()` — so the unconditional backfill is safe.
3. No wizard at login for real users.
4. Settings page gets a `Replay onboarding` button → calls a new action `replayOnboarding()` (same as demo reset but scoped to the current user, not the demo constant).

## Architecture

### Data model changes

Add one column:

```sql
-- supabase/migrations/20260425_001000_add_preferred_units.sql
ALTER TABLE user_preferences
  ADD COLUMN preferred_units text NULL
  CHECK (preferred_units IS NULL OR preferred_units IN ('metric', 'imperial'));
```

Column is nullable (not NOT NULL DEFAULT) so the demo-reset UPDATE can null it back to defaults without tripping a NOT NULL constraint.

Backfill — unconditional, no runtime GUC dependency:

```sql
-- supabase/migrations/20260425_001001_backfill_tour_completed.sql
UPDATE user_preferences
  SET tour_completed_at = coalesce(tour_completed_at, now());
```

The demo user is re-nulled next login. Simpler, no footgun.

No other schema changes. `preferred_theme`, `preferred_font_size`, `preferred_language`, `tour_completed_at`, `tour_dismissed_until` already exist.

### Cookies

Add `PREF_COOKIE_UNITS = 'preferred-units'` to `lib/preference-cookies.ts` alongside existing 3.

**Cookie attributes (explicit, applies to all 4 PREF cookies):**
- `Secure` — always (HTTPS-only)
- `SameSite=Lax` — standard; prevents CSRF preference manipulation
- NOT `HttpOnly` — live-preview requires client-side read

Add a new helper `clearAllPrefCookies()` in `lib/preference-cookies.ts` alongside the existing `clearPrefCookies()`:

```ts
// Existing: preserves preferred-language (auth-agnostic visitors benefit)
export async function clearPrefCookies(): Promise<void> { ... }

// New: clears ALL 4 including language — for demo reset and replay onboarding
export async function clearAllPrefCookies(): Promise<void> { ... }
```

Call sites:
- `clearPrefCookies()` — existing logout flow (unchanged).
- `clearAllPrefCookies()` — `resetDemoPreferences()` and `replayOnboarding()` only.

### Server actions

**`updateUserPreferences()`** (existing at `app/actions/preferences.ts:85`) — adding `preferred_units` touches five sites:

1. `UpdateInput` interface — add `preferred_units?: 'metric' | 'imperial'`.
2. `UNITS_VALUES = ['metric', 'imperial'] as const` constant + `isUnits()` type-guard.
3. Validator block — reject if present and not in `UNITS_VALUES`; return typed error.
4. Upsert payload builder — include `preferred_units` if present in input.
5. Cookie mirror — set `PREF_COOKIE_UNITS` in same-request.

And in the separate `mirrorPrefsToCookies()` helper (called by `login()`): mirror `preferred_units` from DB row to cookie.

Validation runs in-action before any DB call (typed 400 error, not a DB CHECK failure).

**`markTourCompleted()`** (existing) — unchanged; fires on tour finish from step 5.

**`resetDemoPreferences()`** (new) — called from `login()` when email matches `DEMO_EMAIL`. Uses the user-scoped Supabase client (not service role) so RLS enforces that only the demo user's own row is affected. Implementation is an UPDATE nulling all 5 preference columns + `tour_completed_at`. Then `clearAllPrefCookies()`.

Ownership gate: the action asserts `getSession().user.email === DEMO_EMAIL` first. Even though called only from `login()`, the action file exports, and an exported server action is a reachable endpoint.

**`replayOnboarding()`** (new) — same UPDATE but scoped to the calling user (from `getSession()`), for the settings-page replay button. No special ownership gate needed beyond getSession() — user-scoped client + RLS does the rest.

### Root layout

`app/layout.tsx` already reads preference cookies server-side. Extend to read the new `preferred-units` cookie; pass to `<html data-units="metric|imperial">` for CSS/JS consumers.

### Wizard component

**New component:** `components/onboarding/OnboardingWizardStep.tsx`

- Client component (controlled pickers with live preview).
- Props: `currentPrefs` (from server-side cookies / DB), `onComplete(prefs)` callback.
- Layout: centered card, SEKAI brand mark, welcome copy ("Welcome, chef. Set your station before service."), four labeled picker rows (theme, language, size, units), single `Next →` button.

**Picker interaction model (explicit):** use `<fieldset>`/`<legend>` + radio inputs styled as pill buttons (matches existing sort-pill pattern in the filter rail). Gives keyboard nav, screen-reader group labels, and live-preview via onChange — free. On mobile (≤375px), rows with 3+ options wrap to 2-column or stack vertical.

**Live-preview application per picker:**
- Theme: mutates `document.documentElement.dataset.theme` on change.
- Size: mutates `data-font-size` on change.
- Units: no visual effect inside the wizard; helper text under the picker: "Applies to ingredient amounts." (sets expectation).
- Language: switches an in-memory translation dict so wizard copy flips. SSR-painted pages outside the wizard remain in the previous language until next navigation — see Error handling.

**Screen-reader announcement:** visually-hidden `aria-live="polite"` status region on the wizard card; each picker change writes a brief confirmation string. When language flips, the announcement fires in the NEW language.

**Next button states:**
- Idle: `Next →` (localized).
- In-flight (during `updateUserPreferences` save): disabled + spinner.
- Server error: re-enable; inline error beneath the button ("Couldn't save — try again"); wizard stays open.
- Validation error (per field): inline error on the offending picker row; Next stays disabled.
- Cookie write failure: silent proceed; DB is authoritative; dev-mode log only.

**Skip disabled on step 0** (component simply does not render the Skip affordance).

**Back navigation:** step 0 is not skippable visually, but the browser back button is not intercepted. If chef hits back, they leave `/recipes` (auth redirect target) — defaults persist as-is in the DB from signup seed. On next return to `/recipes`, wizard reappears since `tour_completed_at` is still null. This is acceptable: no state corruption, just a re-prompt.

**Tour integration (to be verified before implementation):** the existing tour controller at `components/onboarding/OnboardingTour.tsx` + `components/onboarding/TourSteps.ts` is assumed to be a step array. **Before coding F1, verify:** is TourSteps a static array with a discriminator (`kind: 'wizard' | 'spotlight'`) viable, or are the steps imperative per-page popovers? If the latter, the wizard must render as a standalone overlay on `/recipes`, not as a tour step — which does not change the wizard UX but changes the tour controller refactor scope.

**Committed decision:** the wizard uses its own i18n keys (`onboarding.*`) so the existing 5-step tour keys (`tour.step1..step5`) stay intact. No re-indexing of existing strings.

### i18n

Add keys to `lib/i18n.ts` in both `en` and `es`:

Core wizard:
- `onboarding.welcomeTitle` — "Welcome, chef" / "Bienvenido, chef"
- `onboarding.welcomeBody` — "Set your station before service." / "Prepara tu estación antes del servicio."
- `onboarding.nextButton` — "Next →" / "Siguiente →"
- `onboarding.errorSave` — "Couldn't save — try again" / "No se pudo guardar — reintentar"

Picker labels and options (translate every visible string; leave "SM/MD/LG" as universal symbols):
- `onboarding.themeLabel`, `onboarding.themeDark`, `onboarding.themeLight`, `onboarding.themeAuto`
- `onboarding.languageLabel` (option names in native script: "English", "Español")
- `onboarding.sizeLabel` ("SM / MD / LG" stays universal)
- `onboarding.unitsLabel` ("Units" / "Unidades"), `onboarding.unitsMetric`, `onboarding.unitsImperial`, `onboarding.unitsHelper` ("Applies to ingredient amounts." / "Aplica a cantidades de ingredientes.")

Existing theme/language/size labels can be reused if already present (audit at implementation).

### Settings page (Replay onboarding button)

Place in a clearly labeled "Preferences" or "Display" section (not top-level). Row:

> **Replay onboarding**
> Reset your preferences and walk through the setup again.
> `[ Replay ]` button → confirmation step ("This will reset your theme, language, text size, and units to defaults. Continue?") → on confirm, calls `replayOnboarding()` → redirects to `/recipes?tour=1`.

Settings page path: verify at implementation (likely `/settings` — audit the existing route before building).

### Defaults

- Theme: auto (respects `prefers-color-scheme`) with dark as fallback
- Language: inferred from `Accept-Language` header via existing `getServerLanguage()`, with `en` as fallback
- Text size: MD
- Units: metric

## Error handling

- `updateUserPreferences` validation failure: wizard keeps current step, inline error on offending row, no DB write.
- `updateUserPreferences` server error: wizard keeps current step, inline error beneath Next button ("Couldn't save — try again"), Next re-enables.
- Cookie write failure: proceed to tour normally; DB is authoritative; re-reads on next server render; dev-mode log.
- `resetDemoPreferences` failure: login still proceeds (tour may not replay that session); error logged for ops.
- Language-picked-mid-wizard mixed-language window: after Next, the server action sets cookie + returns; client triggers `router.refresh()` on the segment so `/recipes` SSR re-paints in the new language before tour step 1 spotlight appears.
- Concurrent demo@ logins from two tabs: first login's `resetDemoPreferences` wins, second login is a no-op on the (already nulled) row. Acceptable race: worst case, one tab's wizard re-renders mid-flow. Demo is single-session by convention — documented here as a known limitation.

## Testing

### Jest (unit)

- `updateUserPreferences` accepts valid `preferred_units`, rejects invalid enum with typed error (no DB CHECK reliance).
- `resetDemoPreferences` asserts caller email matches DEMO_EMAIL; UPDATE affects exactly the demo row; `clearAllPrefCookies()` called.
- `replayOnboarding` scopes to `getSession().user.id`; UPDATE affects only caller's row.
- `clearAllPrefCookies` clears all 4 cookies (including language).
- Wizard component: live-preview state changes mutate document dataset keys.

### Playwright (e2e)

New file `tests/e2e/onboarding.spec.ts`:

- `@smoke new signup sees wizard, commits prefs, tour plays` — sign up a disposable user, assert step 0 renders, pick all 4, assert DB row + cookies, assert tour advances to step 1.
- `@regression demo@ login always replays wizard` — log in demo@, complete wizard, log out, log in demo@ again, assert wizard replays from defaults.
- `@regression existing user skips wizard` — log in test@ (whose tour_completed_at is set), assert no wizard.
- `@regression replayOnboarding from settings resets current user` — log in test@, click Replay, confirm dialog, assert wizard renders.
- `@regression language picked mid-wizard → SSR refreshes after Next` — pick es, assert tour tooltip copy is es (not en).
- `@mobile wizard layout on iPhone 12 viewport` — single column, all pickers reachable, Next fires.

## Out-of-scope / future

- `space_name` picker (SEKAI personalization)
- Notifications prefs
- Print defaults
- Per-device vs per-account prefs split

## Dependencies and ordering

Independent of F2 / F3 tactically. F1 can ship in parallel with F2; F3 can ship after F2. Reserved migration prefix `20260425_001*` avoids collision with F2 (`002*`) and F3 (`003*`).

## Rollback

Drop the `preferred_units` column, drop the backfill (already-landed backfill is additive; tour_completed_at values stay), remove cookie, remove wizard step from tour. Existing tour functions unchanged. No data loss (defaults reapply).

---

## Open Questions (deferred to user decision; review round 1)

These items require strategic judgment and were deferred from the doc-review pass. None block implementation of the tactical spec above; decisions can come in a later revision.

### Scope questions

- **OQ-1. Replay onboarding button — keep or drop?** Original ask scoped replay to demo@ only. The Settings-page button adds a new action, a UI row, and a test path. The argument for keeping: symmetry + self-service. The argument for dropping: individual pref editors already solve the case.
- **OQ-2. Units picker in wizard — keep or move?** Original ask was theme/language/size (3 items). Units crept in. Argument for keeping: display-critical pref deserves first-touch. Argument for moving: single-chef app with one dominant unit system; put it in settings only.

### Product / identity questions

- **OQ-3. Is the wizard itself consumer-app ceremony?** CLAUDE.md says "users arrive logged-in, not landing". All 4 prefs have sensible auto-defaults. Alternative: skip wizard for real users entirely; demo@ keeps the replay ritual; real users see a one-line hint on existing tour step 1 ("Change theme/language/size/units in Settings").
- **OQ-4. Demo email as a string in auth — scale risk.** `login()` has `email === DEMO_EMAIL` equality. As the user base grows to "small circle of invited chefs", this pattern metastasizes. Alternative: `user_preferences.reset_on_login boolean` flag. Defer — current scale doesn't warrant.

### Design questions

- **OQ-5. Picker row more than 3 options on mobile (language might grow).** Current spec covers 2-option toggles and 3-option groups. If language expands to ja/fr/it, layout strategy needs revisiting.
