# Team E — AMBIENT-ATMOSPHERIC — Implementation Plan

File-by-file change list against the real repo. Strictly additive where possible. No sacred feature touches — all ambient work happens through new tokens, a provider, and a single backdrop component. Existing pages render unchanged if `TimeOfDayProvider` is removed.

---

## Summary of additions

| Area | New files | Edited files |
|---|---|---|
| Tokens | `app/tokens-ambient.css` | `app/globals.css` (import + radii + glow tokens) |
| Provider | `components/ambient/TimeOfDayProvider.tsx`, `useAtmosphere.ts` | `app/(app)/layout.tsx`, `app/(auth)/layout.tsx` |
| Backdrop | `components/ambient/AuroraBackdrop.tsx` | `app/(app)/layout.tsx`, `app/(auth)/layout.tsx` |
| Glass | `app/glass.css` | `app/globals.css` (import) |
| Recipe meta | SQL migration: `supabase/migrations/<ts>_recipe_cooked_at.sql` | `types/recipe.ts` (cooked_at optional), `lib/cook/record.ts` (new) |
| Components | `components/ambient/CardAura.tsx`, `components/ambient/EmberFrame.tsx` | `components/recipes/RecipeCard.tsx`, `components/recipes/CookMode.tsx` |
| Settings | `app/(app)/settings/skin-override.tsx` | `app/(app)/settings/page.tsx` |
| Tests | `tests/e2e/ambient-skin.spec.ts`, `__tests__/resolveSkin.test.ts` | `playwright.config.ts` (no change), `tests/e2e/helpers.ts` (add `freezeTime()`) |

Total: ~11 new files, 7 edits. No schema changes required at the app level (only one optional nullable column added via migration, fully backward-compatible).

---

## 1. `app/globals.css` — tokens, glow, import

**Before** (relevant excerpt at top of file):
```css
@import "tailwindcss";
@theme { ... }
:root { --bg: ...; --shadow-card: ...; }
```

**After:**
```css
@import "tailwindcss";
@import "./tokens-ambient.css";   /* NEW — five skins + atmosphere keys */
@import "./glass.css";            /* NEW — the five glass classes */
@theme { ... }
:root {
  /* ... existing ... */

  /* Radii — softened */
  --radius-xs: 6px;
  --radius-sm: 8px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;

  /* Shadows → glows (radial, atmosphere-tinted) */
  --glow-card:   ...color-mix(in oklch, var(--atmosphere-key) 35%, transparent)...;
  --glow-raised: ...;
  --glow-dialog: ...;
  --glow-ember:  ...;

  --motion-ambient-md: 4000ms;
  --motion-ambient-xl: 60000ms;
  --ease-breath: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-drift:  cubic-bezier(0.33, 0, 0.67, 1);
}
```

Keep `--shadow-card` / `--shadow-dialog` as aliases to `--glow-card` / `--glow-dialog` for zero-breakage of any site still referencing them:
```css
--shadow-card:   var(--glow-card);
--shadow-dialog: var(--glow-dialog);
```

Delete nothing. The existing light-theme overrides stay. Ambient is off unless provider mounts.

## 2. `app/tokens-ambient.css` — NEW

Five skin blocks on `:root[data-skin="..."]`. Each defines semantic shell + four atmosphere keys (`--atmosphere-key`, `--atmosphere-rim`, `--atmosphere-fill`, `--atmosphere-horizon`). Full content in `key-snippets/tokens-ambient.css`. A `:root:not([data-skin])` default points to `service-ember` values so the file renders usefully without the provider.

## 3. `app/glass.css` — NEW

Three glass utility classes: `.glass-nav`, `.glass-card`, `.glass-dialog`. Each with `-webkit-backdrop-filter` prefix. A `@media (prefers-contrast: more)` block disables all three. Full content in `key-snippets/glass-card.css`.

## 4. `components/ambient/TimeOfDayProvider.tsx` — NEW

Client component. Wraps children. Does three jobs:

1. On mount, read `localStorage.getItem('sekai.skin.override')`. If it is one of the five skin names, pin `data-skin` and exit.
2. Otherwise, compute `resolveSkin(new Date())` and apply. Set interval every 5 minutes to re-resolve.
3. On `document.visibilitychange`, re-resolve immediately.

Writes a single attribute (`data-skin`) on `<html>`, plus four inline `--atmosphere-*` custom props on `document.documentElement.style` for the blend. Never touches body or any other node.

Exposes `AtmosphereContext` with `{ skin, override, setOverride }`. Consumed by Settings.

## 5. `components/ambient/useAtmosphere.ts` — NEW

Hook returning the current context. Used by RecipeCard to decide whether to render CardAura (only if the recipe has `cooked_at` within 72h — not dependent on atmosphere, but the hook is the entry point for future atmosphere-sensitive logic).

## 6. `components/ambient/AuroraBackdrop.tsx` — NEW

Single component. Renders three fixed-position divs (`horizon`, `blobs`, `conic`) with `aria-hidden="true"`. The conic layer receives `data-show={surface}` so we can conditionally display it on login and detail via a CSS attribute selector. No JS animation — all motion is CSS.

## 7. `app/(app)/layout.tsx` — EDIT

Wrap children in `<TimeOfDayProvider>` and place `<AuroraBackdrop />` as a sibling before the existing nav. The provider renders once at the app shell; nav and pages remain untouched.

Diff sketch:
```tsx
// Before
export default function AppLayout({ children }) {
  return (
    <>
      <Nav />
      {children}
    </>
  );
}

// After
import { TimeOfDayProvider } from '@/components/ambient/TimeOfDayProvider';
import { AuroraBackdrop } from '@/components/ambient/AuroraBackdrop';
export default function AppLayout({ children }) {
  return (
    <TimeOfDayProvider>
      <AuroraBackdrop />
      <Nav />
      {children}
    </TimeOfDayProvider>
  );
}
```

## 8. `app/(auth)/layout.tsx` — EDIT

Same wrap. The login surface benefits from the full aurora + conic accent.

## 9. `components/recipes/RecipeCard.tsx` — EDIT

Add:
- Read `recipe.cooked_at` (new optional column).
- Compute `heatFactor = clamp(1 - (now - cooked_at) / 72h, 0, 1)`.
- If heatFactor > 0: add `data-heat={heatFactor.toFixed(2)}` and a class `recipe-card--hot`.
- Conditionally render a small dot at top-right as the "recently cooked" indicator (uses `--c-terracotta` + shadow, no badge copy, no number).

CSS for the heat-aura lives in `key-snippets/card-aura.css` and uses `@property --card-heat` to let the glow animate on mount, then settle to a static value derived from data.

No behavioural change to click / keyboard / hover. If `cooked_at` is null, everything renders as before.

## 10. `components/recipes/CookMode.tsx` — EDIT

Three additions, no removals:

1. Wrap the root stage in a div that has `data-stage="cook"` and toggles a class `is-timer-running` based on any active timer's state. Drives the `::before` ember overlay.
2. Emit a single function call on cook completion — `recordCooked(recipeId)` from `lib/cook/record.ts`. This is a Supabase update that sets `cooked_at = now()` on the recipe, giving the card-aura data.
3. Wrap the active step card in `EmberFrame` component which adds the breath animation + ember glow via CSS class.

Existing timer, haptic, audio, wake-lock logic is untouched. The ember overlay is purely presentational.

## 11. `components/ambient/EmberFrame.tsx` — NEW

Tiny wrapper: `<div className="ember-frame">{children}</div>` with the `.ember-frame` class defined in glass.css. Animates `breath` at `var(--motion-ambient-md)`. Respects reduced-motion.

## 12. `components/ambient/CardAura.tsx` — NEW

Optional reusable wrapper for "recently acted on" surfaces. Not used in v1 outside RecipeCard; provided for future use (e.g., recently-saved form returning a card-aura briefly).

## 13. `supabase/migrations/<timestamp>_recipe_cooked_at.sql` — NEW

```sql
-- Add an optional cook-timestamp so the list can render "warm" cards.
-- Null-safe, backward-compatible, no RLS delta (same policy as other mutable columns).
alter table public.recipes
  add column if not exists cooked_at timestamptz;

comment on column public.recipes.cooked_at is
  'Last time this recipe was completed in cook mode. Drives ambient "recently-cooked" aura.';
```

## 14. `types/recipe.ts` — EDIT

Add `cooked_at?: string | null;` to the Recipe interface. All existing code paths accept null / undefined.

## 15. `lib/cook/record.ts` — NEW

```ts
'use server';
import { createClient } from '@/lib/supabase/server';
export async function recordCooked(recipeId: string) {
  const sb = await createClient();
  const { error } = await sb.from('recipes').update({ cooked_at: new Date().toISOString() }).eq('id', recipeId);
  // Fire-and-forget; cook-mode completion should never block on this
  if (error) console.warn('[sekai] recordCooked failed', error);
}
```

CookMode calls this in its existing completion branch.

## 16. `app/(app)/settings/skin-override.tsx` — NEW + `page.tsx` EDIT

One small row in settings: "Kitchen light — Auto / Morning / Midday / Afternoon / Service / Late night." Pinning writes to localStorage and updates the provider immediately (via the AtmosphereContext `setOverride`). "Auto" clears the override.

## 17. `app/layout.tsx` (root) — EDIT (optional but recommended)

Add `<meta name="theme-color">` with a dynamic colour per skin so iOS Safari's status bar blends with the atmosphere. Implemented as a `<script>` in the head that reads the skin on mount and sets the meta tag; updates on skin change via provider.

## 18. Tests

### `__tests__/resolveSkin.test.ts` (Jest) — NEW
Covers:
- 00:00, 02:00, 07:30, 12:30, 16:30, 20:00, 23:59 → correct primary skin + blend t.
- Wrap at midnight: 00:30 blends between `late-indigo` and `morning-mist` correctly.

### `tests/e2e/ambient-skin.spec.ts` (Playwright) — NEW
- Seed a recipe with `cooked_at = now`, navigate to `/recipes`, assert `.recipe-card--hot` is present.
- Override skin to `service-ember` via settings, assert `html[data-skin="service-ember"]`.
- Freeze time via `page.addInitScript` to fix the clock for deterministic tests. Helper added to `tests/e2e/helpers.ts`.

### `tests/e2e/helpers.ts` — EDIT
Add `freezeTime(page, date)` helper that stubs `Date` in the page context before navigation. Useful for tests across skins.

No changes to existing Jest 91/91 or Playwright 28/28 baselines — these are net-new specs under the existing test-gate.

---

## Rollout order (commits)

1. **Scaffold tokens (no render change):** `tokens-ambient.css`, `glass.css`, `globals.css` edits. Commit + gate passes (tokens only).
2. **Add provider + backdrop (opt-in render):** TimeOfDayProvider, AuroraBackdrop, layout wraps. First visible change. Smoke on all surfaces.
3. **Migration + cooked_at:** DB migration, types update, CookMode completion hook. Card aura CSS. This is the data layer for card-heat.
4. **EmberFrame + CookMode wiring:** active-step breath + timer-running ember overlay. Full motion pass.
5. **Settings skin override:** final polish. Ship.

Each step is its own reverting boundary. If Step 4 is rolled back, the ambient system still functions with neutral cook mode.

## Feature-flag-free rollback strategy

Ambient layer is gated by `<TimeOfDayProvider>`. Removing the provider from `app/(app)/layout.tsx` reverts the entire ambient system in a single-line change. The tokens file remains but has no effect on unattributed `:root`.

## Risks to watch (see stability-report.md for full list)

- Safari backdrop-filter perf at 28px blur on dialogs.
- iOS battery from constant CSS aurora drift on a full-screen fixed element. Mitigation: pause drift after 30s of no interaction.
- `color-mix(in oklch, ...)` support — works on Safari 16.4+, Chrome 111+, Firefox 113+. Fallback: pre-computed semantic tokens per-skin (already present in `tokens-ambient.css`).
- Contrast on glass — we keep body text on solid cards, which are never glass. Only nav text sits on glass, and has been spot-checked to 8.5:1 at `--bg` 72%.
