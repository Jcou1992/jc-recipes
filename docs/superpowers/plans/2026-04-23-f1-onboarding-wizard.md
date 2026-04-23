# F1 — Onboarding Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-screen preference setup (theme / language / size / units) as step 0 of the existing tour. Demo@ replays it on every login; existing real users are grandfathered; new real users see it once.

**Architecture:** Extend `user_preferences` with `preferred_units` and discriminate the existing static `TOUR_STEPS` array with a new `kind: 'wizard' | 'spotlight'`. New server actions `resetDemoPreferences()` + `replayOnboarding()` both use user-scoped Supabase client (RLS-safe) and UPDATE-null-all-prefs (no DELETE policy needed). Wizard mirrors prefs to cookies within the same action so SSR paints correctly on next nav.

**Tech Stack:** Next.js 15 (server actions), Supabase (Postgres + RLS), TypeScript, Jest, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-23-onboarding-wizard-design.md`

**Reserved migration range:** `202604250010xx_*.sql`

---

## File structure

- **Create:** `supabase/migrations/20260425001000_add_preferred_units.sql`
- **Create:** `supabase/migrations/20260425001001_backfill_tour_completed.sql`
- **Create:** `components/onboarding/OnboardingWizardStep.tsx`
- **Create:** `tests/e2e/onboarding.spec.ts`
- **Modify:** `lib/preference-cookies.ts` — add `PREF_COOKIE_UNITS` + new `clearAllPrefCookies()` helper.
- **Modify:** `app/actions/preferences.ts` — extend `UpdateInput`, validator, upsert, cookie mirror, `mirrorPrefsToCookies`; add `resetDemoPreferences()` + `replayOnboarding()`.
- **Modify:** `app/actions/auth.ts` — call `resetDemoPreferences()` on demo@ login.
- **Modify:** `types/preferences.ts` — add `preferred_units` to prefs interface.
- **Modify:** `app/layout.tsx` — read + paint `data-units` on `<html>`.
- **Modify:** `lib/i18n.ts` — add wizard keys to `Translations`, `en`, `es`.
- **Modify:** `components/onboarding/TourSteps.ts` — add `kind` discriminator; keep existing 5 steps as `kind: 'spotlight'`; prepend `kind: 'wizard'` entry.
- **Modify:** `components/onboarding/OnboardingTour.tsx` — branch render on `kind`; suppress Skip when `kind === 'wizard'`.
- **Modify:** `app/(app)/settings/SettingsClient.tsx` (or equivalent client) — add "Replay onboarding" row.

---

## Task 1: Migration — `preferred_units` column

**Files:**
- Create: `supabase/migrations/20260425001000_add_preferred_units.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260425001000_add_preferred_units.sql
alter table user_preferences
  add column preferred_units text null
  check (preferred_units is null or preferred_units in ('metric', 'imperial'));

comment on column user_preferences.preferred_units is
  'User''s preferred unit system for ingredient display; null = defaults to metric on render.';
```

Column is nullable (not NOT NULL DEFAULT) so `resetDemoPreferences` can null it back without constraint issues.

- [ ] **Step 2: Apply + verify**

```bash
supabase db reset  # or supabase db push
supabase db remote exec "select column_name, is_nullable from information_schema.columns where table_name = 'user_preferences' and column_name = 'preferred_units';"
```

Expected: `preferred_units | YES`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260425001000_add_preferred_units.sql
git commit -m "feat(f1): add user_preferences.preferred_units column"
```

---

## Task 2: Migration — unconditional backfill of `tour_completed_at`

**Files:**
- Create: `supabase/migrations/20260425001001_backfill_tour_completed.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260425001001_backfill_tour_completed.sql
-- Grandfather all existing users so they don't see the wizard on next login.
-- The demo user is re-nulled by resetDemoPreferences() on next login.
update user_preferences
  set tour_completed_at = coalesce(tour_completed_at, now());
```

No runtime GUC dependency — unconditional. The demo user's next login calls `resetDemoPreferences()` which re-nulls this row.

- [ ] **Step 2: Apply + verify**

```bash
supabase db push
supabase db remote exec "select count(*) filter (where tour_completed_at is null) as null_rows, count(*) as total from user_preferences;"
```

Expected: `null_rows = 0, total = N` where N is the current user count.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260425001001_backfill_tour_completed.sql
git commit -m "feat(f1): backfill tour_completed_at for existing users"
```

---

## Task 3: Cookie constants + `clearAllPrefCookies` helper

**Files:**
- Modify: `lib/preference-cookies.ts`

- [ ] **Step 1: Add new constant + helper**

Full rewrite of the file (keeps existing exports intact, adds new ones):

```ts
// lib/preference-cookies.ts
import { cookies } from 'next/headers';

export const PREF_COOKIE_THEME = 'preferred-theme';
export const PREF_COOKIE_FONT_SIZE = 'preferred-font-size';
export const PREF_COOKIE_LANGUAGE = 'preferred-language';
export const PREF_COOKIE_UNITS = 'preferred-units';
export const PREF_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// Existing: preserves preferred-language (auth-agnostic visitors benefit).
export async function clearPrefCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PREF_COOKIE_THEME);
  cookieStore.delete(PREF_COOKIE_FONT_SIZE);
  cookieStore.delete(PREF_COOKIE_UNITS);
  // preferred-language cookie stays — auth-agnostic visitors benefit from it
}

// New: clears ALL 4 including language. Use for demo reset + replay onboarding.
export async function clearAllPrefCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(PREF_COOKIE_THEME);
  cookieStore.delete(PREF_COOKIE_FONT_SIZE);
  cookieStore.delete(PREF_COOKIE_LANGUAGE);
  cookieStore.delete(PREF_COOKIE_UNITS);
}
```

Preserve file header comments if any. Keep existing imports.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: passes. Existing callers of `clearPrefCookies` remain compatible (new body also clears `PREF_COOKIE_UNITS` — this is desired, since logout should clear units too).

- [ ] **Step 3: Commit**

```bash
git add lib/preference-cookies.ts
git commit -m "feat(f1): add PREF_COOKIE_UNITS + clearAllPrefCookies helper"
```

---

## Task 4: TypeScript types — extend `UserPreferences`

**Files:**
- Modify: `types/preferences.ts`

- [ ] **Step 1: Add field**

```ts
// types/preferences.ts
export type PreferredUnits = 'metric' | 'imperial';

export interface UserPreferences {
  user_id: string;
  preferred_theme: string | null;
  preferred_font_size: string | null;
  preferred_language: string | null;
  preferred_units: PreferredUnits | null;
  tour_completed_at: string | null;
  tour_dismissed_until: string | null;
  space_name: string | null;
  // keep any other existing fields
}
```

Export the `PreferredUnits` union for reuse.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Fix any consumer that constructs `UserPreferences` literals by adding `preferred_units: null`.

- [ ] **Step 3: Commit**

```bash
git add types/preferences.ts
git commit -m "feat(f1): UserPreferences.preferred_units type"
```

---

## Task 5: `updateUserPreferences` — extend all 5 touch sites

**Files:**
- Modify: `app/actions/preferences.ts`

- [ ] **Step 1: Add UNITS_VALUES + type-guard**

Near the top of the file, alongside any existing `THEME_VALUES` / `FONT_SIZE_VALUES` arrays:

```ts
const UNITS_VALUES = ['metric', 'imperial'] as const;
type UnitsValue = (typeof UNITS_VALUES)[number];

function isUnits(v: unknown): v is UnitsValue {
  return typeof v === 'string' && (UNITS_VALUES as readonly string[]).includes(v);
}
```

- [ ] **Step 2: Extend `UpdateInput`**

At lines ~78–83:

```ts
interface UpdateInput {
  preferred_theme?: string;
  preferred_font_size?: string;
  preferred_language?: string;
  preferred_units?: UnitsValue;
  space_name?: string;
}
```

- [ ] **Step 3: Extend validator block**

At lines ~92–104, add below the existing validators:

```ts
if (input.preferred_units !== undefined && !isUnits(input.preferred_units)) {
  return { error: 'Invalid preferred_units value' };
}
```

- [ ] **Step 4: Extend upsert builder**

At lines ~106–114, add `preferred_units` to the upsert payload when present in input.

- [ ] **Step 5: Extend cookie mirror**

At lines ~119–132, after existing cookie writes, add:

```ts
if (input.preferred_units !== undefined) {
  cookieStore.set(PREF_COOKIE_UNITS, input.preferred_units, {
    maxAge: PREF_COOKIE_MAX_AGE,
    sameSite: 'lax',
    secure: true,
    path: '/',
  });
}
```

Ensure existing cookie writes already have `sameSite: 'lax', secure: true`. If not, add them for all 4 cookies.

- [ ] **Step 6: Extend `mirrorPrefsToCookies`**

At lines ~50–68, in the function that mirrors DB row fields to cookies during login, add the `preferred_units` mirror with the same attributes.

- [ ] **Step 7: Add unit test**

Create `app/actions/__tests__/preferences.test.ts` if not existing, or extend:

```ts
import { updateUserPreferences } from '../preferences';

describe('updateUserPreferences preferred_units', () => {
  it('accepts "metric"', async () => {
    const result = await updateUserPreferences({ preferred_units: 'metric' });
    expect(result).not.toHaveProperty('error');
  });
  it('accepts "imperial"', async () => {
    const result = await updateUserPreferences({ preferred_units: 'imperial' });
    expect(result).not.toHaveProperty('error');
  });
  it('rejects invalid value', async () => {
    // @ts-expect-error invalid on purpose
    const result = await updateUserPreferences({ preferred_units: 'furlongs' });
    expect(result).toHaveProperty('error');
  });
});
```

Run: `npx jest app/actions/__tests__/preferences.test.ts`
Expected: 3 pass.

- [ ] **Step 8: Commit**

```bash
git add app/actions/preferences.ts app/actions/__tests__/preferences.test.ts
git commit -m "feat(f1): updateUserPreferences accepts preferred_units"
```

---

## Task 6: `resetDemoPreferences` server action

**Files:**
- Modify: `app/actions/preferences.ts`

- [ ] **Step 1: Add action**

Append to the file:

```ts
'use server';

import { getSession } from '@/lib/supabase/server-session'; // or whichever existing helper is used
import { clearAllPrefCookies } from '@/lib/preference-cookies';

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? 'demo@sakai.app';

export async function resetDemoPreferences(): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session?.user) return { error: 'Not authenticated' };
  if (session.user.email !== DEMO_EMAIL) return { error: 'Forbidden' };

  const supabase = await createServerClient(); // existing helper, user-scoped
  const { error } = await supabase
    .from('user_preferences')
    .update({
      preferred_theme: null,
      preferred_font_size: null,
      preferred_language: null,
      preferred_units: null,
      tour_completed_at: null,
    })
    .eq('user_id', session.user.id);

  if (error) return { error: error.message };

  await clearAllPrefCookies();
  return { ok: true };
}
```

Rationale for UPDATE over DELETE: the existing `user_preferences` RLS policies cover SELECT/INSERT/UPDATE only. UPDATE-null achieves the same wizard-replay effect without widening RLS.

- [ ] **Step 2: Add unit test**

```ts
describe('resetDemoPreferences', () => {
  it('forbids non-demo caller', async () => {
    mockSession({ email: 'jc@sakai.app' });
    const result = await resetDemoPreferences();
    expect(result).toEqual({ error: 'Forbidden' });
  });
  it('nulls all prefs + clears cookies for demo caller', async () => {
    mockSession({ email: DEMO_EMAIL });
    const result = await resetDemoPreferences();
    expect(result).toEqual({ ok: true });
    // verify DB row fields are null, cookies deleted
  });
});
```

Run: `npx jest app/actions/__tests__/preferences.test.ts`
Expected: 2 new pass.

- [ ] **Step 3: Commit**

```bash
git add app/actions/preferences.ts app/actions/__tests__/preferences.test.ts
git commit -m "feat(f1): resetDemoPreferences server action"
```

---

## Task 7: `replayOnboarding` server action

**Files:**
- Modify: `app/actions/preferences.ts`

- [ ] **Step 1: Add action**

Append:

```ts
export async function replayOnboarding(): Promise<{ ok: true } | { error: string }> {
  const session = await getSession();
  if (!session?.user) return { error: 'Not authenticated' };

  const supabase = await createServerClient();
  const { error } = await supabase
    .from('user_preferences')
    .update({
      preferred_theme: null,
      preferred_font_size: null,
      preferred_language: null,
      preferred_units: null,
      tour_completed_at: null,
    })
    .eq('user_id', session.user.id); // RLS doubles this, but we're explicit

  if (error) return { error: error.message };

  await clearAllPrefCookies();
  return { ok: true };
}
```

- [ ] **Step 2: Unit test**

```ts
describe('replayOnboarding', () => {
  it('requires session', async () => {
    mockSession(null);
    const result = await replayOnboarding();
    expect(result).toEqual({ error: 'Not authenticated' });
  });
  it('nulls prefs for the calling user', async () => {
    mockSession({ email: 'jc@sakai.app' });
    const result = await replayOnboarding();
    expect(result).toEqual({ ok: true });
  });
});
```

- [ ] **Step 3: Commit**

```bash
git add app/actions/preferences.ts app/actions/__tests__/preferences.test.ts
git commit -m "feat(f1): replayOnboarding server action"
```

---

## Task 8: `login` integrates `resetDemoPreferences`

**Files:**
- Modify: `app/actions/auth.ts`

- [ ] **Step 1: Wire it in**

At lines ~14–31 of `login`, after the existing `if (email === DEMO_EMAIL)` branch but before the redirect, call the reset. Current file likely already detects demo in the redirect branch; adjust:

```ts
// app/actions/auth.ts (near line 29)
if (data.user?.email === DEMO_EMAIL) {
  await resetDemoPreferences();
  redirect('/recipes?tour=1');
}
```

Import: `import { resetDemoPreferences } from './preferences';`

- [ ] **Step 2: Verify existing auth test still passes**

Run: `npx playwright test tests/e2e/auth.spec.ts --project="Auth (Desktop Chrome)"`
Expected: pass. (The reset writes null to DB — log-in still succeeds.)

- [ ] **Step 3: Commit**

```bash
git add app/actions/auth.ts
git commit -m "feat(f1): login triggers resetDemoPreferences for demo@"
```

---

## Task 9: i18n wizard keys

**Files:**
- Modify: `lib/i18n.ts`

- [ ] **Step 1: Add keys to `Translations` interface**

Near the tour-related keys (search for `tourStep`), add an `onboarding` grouping:

```ts
onboardingWelcomeTitle: string;
onboardingWelcomeBody: string;
onboardingNextButton: string;
onboardingErrorSave: string;
onboardingThemeLabel: string;
onboardingThemeDark: string;
onboardingThemeLight: string;
onboardingThemeAuto: string;
onboardingLanguageLabel: string;
onboardingSizeLabel: string;
onboardingUnitsLabel: string;
onboardingUnitsMetric: string;
onboardingUnitsImperial: string;
onboardingUnitsHelper: string;
```

- [ ] **Step 2: Add English values**

In the `en` dict:

```ts
onboardingWelcomeTitle: 'Welcome, chef',
onboardingWelcomeBody: 'Set your station before service.',
onboardingNextButton: 'Next →',
onboardingErrorSave: 'Couldn\'t save — try again',
onboardingThemeLabel: 'Theme',
onboardingThemeDark: 'Dark',
onboardingThemeLight: 'Light',
onboardingThemeAuto: 'Auto',
onboardingLanguageLabel: 'Language / 言語',
onboardingSizeLabel: 'Text size',
onboardingUnitsLabel: 'Units',
onboardingUnitsMetric: 'Metric',
onboardingUnitsImperial: 'Imperial',
onboardingUnitsHelper: 'Applies to ingredient amounts.',
```

- [ ] **Step 3: Add Spanish values**

```ts
onboardingWelcomeTitle: 'Bienvenido, chef',
onboardingWelcomeBody: 'Prepara tu estación antes del servicio.',
onboardingNextButton: 'Siguiente →',
onboardingErrorSave: 'No se pudo guardar — reintentar',
onboardingThemeLabel: 'Tema',
onboardingThemeDark: 'Oscuro',
onboardingThemeLight: 'Claro',
onboardingThemeAuto: 'Automático',
onboardingLanguageLabel: 'Idioma / 言語',
onboardingSizeLabel: 'Tamaño de texto',
onboardingUnitsLabel: 'Unidades',
onboardingUnitsMetric: 'Métrico',
onboardingUnitsImperial: 'Imperial',
onboardingUnitsHelper: 'Aplica a cantidades de ingredientes.',
```

- [ ] **Step 4: Build + commit**

```bash
npm run build
git add lib/i18n.ts
git commit -m "feat(f1): i18n onboarding wizard keys (en, es)"
```

---

## Task 10: `TourSteps` discriminator + wizard entry

**Files:**
- Modify: `components/onboarding/TourSteps.ts`

- [ ] **Step 1: Extend `TourStep` interface**

```ts
// components/onboarding/TourSteps.ts (lines ~1–10)
interface SpotlightStep {
  kind: 'spotlight';
  targetSelector: string;
  titleKey: keyof Translations;
  bodyKey: keyof Translations;
}

interface WizardStep {
  kind: 'wizard';
}

export type TourStep = SpotlightStep | WizardStep;
```

- [ ] **Step 2: Update `TOUR_STEPS` array**

Prepend the wizard step and add `kind: 'spotlight'` to each existing entry:

```ts
export const TOUR_STEPS: TourStep[] = [
  { kind: 'wizard' },
  { kind: 'spotlight', targetSelector: '...', titleKey: 'tourStep1Title', bodyKey: 'tourStep1Body' },
  // ... keep existing 4 more
];
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: TypeScript forces the consumer (`OnboardingTour.tsx`) to handle both variants — next task fixes that.

- [ ] **Step 4: Commit**

```bash
git add components/onboarding/TourSteps.ts
git commit -m "feat(f1): discriminate TourStep into wizard|spotlight variants"
```

---

## Task 11: Wizard component

**Files:**
- Create: `components/onboarding/OnboardingWizardStep.tsx`

- [ ] **Step 1: Write component**

```tsx
// components/onboarding/OnboardingWizardStep.tsx
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserPreferences } from '@/app/actions/preferences';
import { getT, type Language } from '@/lib/i18n';
import type { PreferredUnits } from '@/types/preferences';

interface Props {
  initialPrefs: {
    preferred_theme: string | null;
    preferred_font_size: string | null;
    preferred_language: string | null;
    preferred_units: PreferredUnits | null;
  };
  onComplete: () => void;
}

export function OnboardingWizardStep({ initialPrefs, onComplete }: Props) {
  const router = useRouter();
  const [theme, setTheme] = useState(initialPrefs.preferred_theme ?? 'auto');
  const [fontSize, setFontSize] = useState(initialPrefs.preferred_font_size ?? 'md');
  const [language, setLanguage] = useState<Language>(
    (initialPrefs.preferred_language as Language) ?? 'en'
  );
  const [units, setUnits] = useState<PreferredUnits>(initialPrefs.preferred_units ?? 'metric');
  const [error, setError] = useState<string | null>(null);
  const [srAnnounce, setSrAnnounce] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const t = getT(language);

  // Apply theme + size live on document element
  const applyTheme = (v: string) => {
    setTheme(v);
    document.documentElement.dataset.theme = v;
    setSrAnnounce(
      v === 'dark'
        ? t.onboardingThemeDark
        : v === 'light'
        ? t.onboardingThemeLight
        : t.onboardingThemeAuto
    );
  };
  const applyFontSize = (v: string) => {
    setFontSize(v);
    document.documentElement.dataset.fontSize = v;
    setSrAnnounce(v.toUpperCase());
  };

  const onNext = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateUserPreferences({
        preferred_theme: theme,
        preferred_font_size: fontSize,
        preferred_language: language,
        preferred_units: units,
      });
      if ('error' in result) {
        setError(t.onboardingErrorSave);
        return;
      }
      // Refresh SSR so already-painted /recipes re-renders in the selected language
      router.refresh();
      onComplete();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      className="mx-auto max-w-md rounded-lg bg-bone p-8 shadow-lg"
    >
      <h2 id="wizard-title" className="font-display text-2xl">
        {t.onboardingWelcomeTitle}
      </h2>
      <p className="mb-6 text-sm text-ink-70">{t.onboardingWelcomeBody}</p>

      <fieldset className="mb-4">
        <legend className="label mb-2">{t.onboardingThemeLabel}</legend>
        <div className="flex gap-2">
          {(['dark', 'light', 'auto'] as const).map((v) => (
            <label key={v} className={`pill ${theme === v ? 'pill--active' : ''}`}>
              <input
                type="radio"
                name="theme"
                value={v}
                checked={theme === v}
                onChange={() => applyTheme(v)}
                className="sr-only"
              />
              {v === 'dark'
                ? t.onboardingThemeDark
                : v === 'light'
                ? t.onboardingThemeLight
                : t.onboardingThemeAuto}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="label mb-2">{t.onboardingLanguageLabel}</legend>
        <div className="flex gap-2">
          {(['en', 'es'] as const).map((v) => (
            <label key={v} className={`pill ${language === v ? 'pill--active' : ''}`}>
              <input
                type="radio"
                name="language"
                value={v}
                checked={language === v}
                onChange={() => {
                  setLanguage(v);
                  setSrAnnounce(v === 'en' ? 'English' : 'Español');
                }}
                className="sr-only"
              />
              {v === 'en' ? 'English' : 'Español'}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="label mb-2">{t.onboardingSizeLabel}</legend>
        <div className="flex gap-2">
          {(['sm', 'md', 'lg'] as const).map((v) => (
            <label key={v} className={`pill ${fontSize === v ? 'pill--active' : ''}`}>
              <input
                type="radio"
                name="fontSize"
                value={v}
                checked={fontSize === v}
                onChange={() => applyFontSize(v)}
                className="sr-only"
              />
              {v.toUpperCase()}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-6">
        <legend className="label mb-2">{t.onboardingUnitsLabel}</legend>
        <div className="flex gap-2">
          {(['metric', 'imperial'] as const).map((v) => (
            <label key={v} className={`pill ${units === v ? 'pill--active' : ''}`}>
              <input
                type="radio"
                name="units"
                value={v}
                checked={units === v}
                onChange={() => setUnits(v)}
                className="sr-only"
              />
              {v === 'metric' ? t.onboardingUnitsMetric : t.onboardingUnitsImperial}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-ink-50">{t.onboardingUnitsHelper}</p>
      </fieldset>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={onNext}
        disabled={isPending}
        className="btn-primary w-full"
      >
        {isPending ? '…' : t.onboardingNextButton}
      </button>

      <div aria-live="polite" className="sr-only">
        {srAnnounce}
      </div>
    </div>
  );
}
```

Adjust class names (`pill`, `pill--active`, `btn-primary`) to match existing styling in the codebase — mirror the sort-pill pattern referenced in commit `7d19e20`.

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/onboarding/OnboardingWizardStep.tsx
git commit -m "feat(f1): OnboardingWizardStep component with 4 pickers + live preview"
```

---

## Task 12: Tour controller branches on `kind`

**Files:**
- Modify: `components/onboarding/OnboardingTour.tsx`

- [ ] **Step 1: Branch render**

At the render site where `TOUR_STEPS[stepIdx]` is consumed, introduce a branch:

```tsx
const step = TOUR_STEPS[stepIdx];

if (step.kind === 'wizard') {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50">
      <OnboardingWizardStep
        initialPrefs={initialPrefs}
        onComplete={() => setStepIdx(1)}
      />
    </div>
  );
}

// Existing spotlight rendering:
return <Spotlight step={step} /* existing props */ />;
```

Import: `import { OnboardingWizardStep } from './OnboardingWizardStep';`

- [ ] **Step 2: Suppress Skip on wizard step**

If the Skip button is rendered in this component (not the child), gate it:

```tsx
{step.kind === 'spotlight' && <button onClick={onSkip}>{t.tourSkip}</button>}
```

- [ ] **Step 3: Pass `initialPrefs` to `OnboardingTour`**

The parent (likely the `/recipes` page layout or `AppLayout`) must pass the server-loaded prefs. If it doesn't yet, extend its props. Pass the same object the SSR root layout already reads via cookies.

- [ ] **Step 4: Verify build + manual smoke**

Run: `npm run build`
Start dev. Create a fresh user (or null out `tour_completed_at` for `test@` manually). Visit `/recipes`. Expect wizard overlay as step 0.

- [ ] **Step 5: Commit**

```bash
git add components/onboarding/OnboardingTour.tsx
git commit -m "feat(f1): tour renders wizard step 0 then existing spotlights"
```

---

## Task 13: Root layout reads `preferred-units` cookie

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Add cookie read**

In the existing cookie-reads block (around lines 40–66), add:

```tsx
const unitsCookie = cookieStore.get(PREF_COOKIE_UNITS)?.value;
const units =
  unitsCookie === 'imperial' || unitsCookie === 'metric' ? unitsCookie : 'metric';
```

And on `<html>`:

```tsx
<html
  lang={language}
  data-theme={theme}
  data-font-size={fontSize}
  data-units={units}
  suppressHydrationWarning
>
```

Import: `import { PREF_COOKIE_UNITS } from '@/lib/preference-cookies';`

- [ ] **Step 2: Build + smoke**

Run: `npm run build`
Verify browser shows `<html data-units="metric">` on first load.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(f1): paint data-units on <html> from cookie"
```

---

## Task 14: Settings page — Replay onboarding row

**Files:**
- Modify: `app/(app)/settings/SettingsClient.tsx` (or whichever client is rendered by `app/(app)/settings/page.tsx`)

- [ ] **Step 1: Add a row in a "Preferences" section**

```tsx
import { replayOnboarding } from '@/app/actions/preferences';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

// inside the client component:
const router = useRouter();
const [isPending, startTransition] = useTransition();
const [showConfirm, setShowConfirm] = useState(false);

const handleReplay = () => {
  startTransition(async () => {
    const result = await replayOnboarding();
    if ('ok' in result) router.push('/recipes?tour=1');
  });
};

// in the render, within a "Preferences" section:
<section className="space-y-2">
  <h3 className="font-display text-lg">Preferences</h3>
  <div className="flex items-center justify-between">
    <div>
      <p className="font-medium">Replay onboarding</p>
      <p className="text-sm text-ink-60">Reset your preferences and walk through the setup again.</p>
    </div>
    <button
      type="button"
      onClick={() => setShowConfirm(true)}
      className="btn-secondary"
    >
      Replay
    </button>
  </div>
</section>

{showConfirm && (
  <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50">
    <div className="rounded-lg bg-bone p-6 shadow-lg">
      <p className="mb-4">This will reset your theme, language, text size, and units to defaults. Continue?</p>
      <div className="flex justify-end gap-2">
        <button onClick={() => setShowConfirm(false)} className="btn-secondary">Cancel</button>
        <button onClick={handleReplay} disabled={isPending} className="btn-primary">
          {isPending ? '…' : 'Continue'}
        </button>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify**

Run: `npm run build`, start dev, open `/settings`, see the row, click Replay, confirm, land on `/recipes?tour=1` with wizard showing.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/settings/SettingsClient.tsx
git commit -m "feat(f1): settings page Replay onboarding row with confirmation"
```

---

## Task 15: Playwright e2e — 5 onboarding scenarios

**Files:**
- Create: `tests/e2e/onboarding.spec.ts`

- [ ] **Step 1: Write tests**

```ts
// tests/e2e/onboarding.spec.ts
import { test, expect } from '@playwright/test';
import { signIn, uniqueName } from './helpers';

test.describe('F1 onboarding wizard', () => {
  test('new signup sees wizard, commits prefs, tour plays @smoke', async ({ page }) => {
    // signup a disposable user (requires a helper or signup UI flow)
    // ... (adapt to existing signup path)
    await expect(page.getByRole('dialog', { name: /welcome, chef/i })).toBeVisible();
    await page.getByRole('radio', { name: 'Dark' }).check();
    await page.getByRole('radio', { name: 'English' }).check();
    await page.getByRole('radio', { name: 'MD' }).check();
    await page.getByRole('radio', { name: 'Metric' }).check();
    await page.getByRole('button', { name: /next/i }).click();
    // tour step 1 spotlight should appear
    await expect(page.locator('[data-tour-spotlight]')).toBeVisible();
  });

  test('demo@ login always replays wizard @regression', async ({ page }) => {
    await signIn(page, { email: process.env.DEMO_USER_EMAIL ?? 'demo@sakai.app' });
    await expect(page.getByRole('dialog', { name: /welcome, chef/i })).toBeVisible();
    // complete wizard
    await page.getByRole('button', { name: /next/i }).click();
    // logout
    await page.getByRole('button', { name: /log out/i }).click();
    // login again
    await signIn(page, { email: process.env.DEMO_USER_EMAIL ?? 'demo@sakai.app' });
    // wizard replays
    await expect(page.getByRole('dialog', { name: /welcome, chef/i })).toBeVisible();
  });

  test('existing user skips wizard @regression', async ({ page }) => {
    await signIn(page); // test@ user — tour_completed_at is set
    await page.waitForURL('/recipes');
    await expect(page.getByRole('dialog', { name: /welcome, chef/i })).not.toBeVisible();
  });

  test('replayOnboarding from settings resets current user @regression', async ({ page }) => {
    await signIn(page);
    await page.goto('/settings');
    await page.getByRole('button', { name: /^replay$/i }).click();
    await page.getByRole('button', { name: /continue/i }).click();
    await page.waitForURL('/recipes?tour=1');
    await expect(page.getByRole('dialog', { name: /welcome, chef/i })).toBeVisible();
  });

  test('language picked mid-wizard applies to tour step 1 @regression', async ({ page }) => {
    await signIn(page, { email: process.env.DEMO_USER_EMAIL ?? 'demo@sakai.app' });
    await page.getByRole('radio', { name: 'Español' }).check();
    await page.getByRole('button', { name: /siguiente/i }).click();
    // tour tooltip text is Spanish
    await expect(page.getByText(/^(bienvenido|explora|cocina)/i)).toBeVisible();
  });

  test('wizard renders on iPhone 12 @mobile', async ({ page }) => {
    // project config sets viewport
    await signIn(page, { email: process.env.DEMO_USER_EMAIL ?? 'demo@sakai.app' });
    const dialog = page.getByRole('dialog', { name: /welcome, chef/i });
    await expect(dialog).toBeVisible();
    // no horizontal scroll
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
```

Note: signup helper may need adding to `tests/e2e/helpers.ts` if not already present. Use a fresh disposable email (`uniqueName('@test.local')`) and call `supabase.auth.signUp` via the test client.

- [ ] **Step 2: Run tests**

```bash
npx playwright test tests/e2e/onboarding.spec.ts
```

Expected: all 6 pass.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/onboarding.spec.ts tests/e2e/helpers.ts
git commit -m "test(f1): e2e coverage for onboarding wizard + replay + demo reset"
```

---

## Task 16: Test gate + final verification

**Files:**
- None (verification only)

- [ ] **Step 1: Full Jest**

Run: `npm test`
Expected: all existing + new preferences tests pass.

- [ ] **Step 2: Full Playwright @regression**

Run: `npx playwright test --grep @regression`
Expected: all pass.

- [ ] **Step 3: Full Playwright @smoke + @mobile**

Run: `npx playwright test --grep "@smoke|@mobile"`
Expected: all pass.

- [ ] **Step 4: Test gate**

Run: `npm run test:gate`
If gate fails with count increase, run `npm run test:gate:bootstrap` + commit baseline.

- [ ] **Step 5: Manual smoke**

- Log in as demo@ — wizard shows.
- Pick prefs, Next, tour plays.
- Log out, log in as demo@ again — wizard re-shows.
- Log in as test@ — no wizard.
- Open `/settings` → Replay → confirm → wizard reappears.

- [ ] **Step 6: Commit any gate baseline updates**

```bash
git add .test-gate/baseline.json
git commit -m "chore(f1): update test gate baseline"
```

---

## Self-review summary

- Spec requirement → Task coverage:
  - `preferred_units` column + cookie + SSR paint → Tasks 1, 3, 13 ✓
  - `clearAllPrefCookies` distinct helper → Task 3 ✓
  - `updateUserPreferences` all 5 sites → Task 5 ✓
  - `resetDemoPreferences` with ownership gate → Task 6 ✓
  - `replayOnboarding` → Task 7 ✓
  - `login` demo integration → Task 8 ✓
  - Unconditional backfill (no GUC dependency) → Task 2 ✓
  - i18n keys → Task 9 ✓
  - `TourStep` discriminator → Task 10 ✓
  - Wizard component with 4 pickers, live preview, aria-live, router.refresh on language → Task 11 ✓
  - Tour controller branch + Skip suppression on step 0 → Task 12 ✓
  - Settings Replay row with confirmation → Task 14 ✓
  - Playwright coverage for all 6 scenarios → Task 15 ✓
  - Test gate → Task 16 ✓

- Spec Open Questions not executed by plan (by design):
  - OQ-1 Replay button (plan DOES include it — user signal was to ship as spec'd; deferrable by dropping Task 14)
  - OQ-2 units in wizard (plan DOES include — user signal was ship as spec'd)
  - OQ-3 wizard for real users (plan DOES include real-user path; new signups see wizard per spec)
  - OQ-4 demo-email DB flag (not planned — current string-based check retained)
  - OQ-5 4+ option picker layout (YAGNI until 3rd language)

- Types consistent: `PreferredUnits = 'metric' | 'imperial'` from Task 4 used in Tasks 5, 6, 7, 11, 13. `UserPreferences` interface defined in Task 4, consumed identically throughout.
