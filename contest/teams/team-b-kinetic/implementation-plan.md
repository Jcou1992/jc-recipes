# Team B — KINETIC-MOTION · Implementation Plan

File-by-file landing of the motion system on the real repo. Every item is either *additive* (no checkpoint needed), or *refines a sacred feature* (requires a checkpoint commit first per DOSSIER rules). Sacred features touched here: **Serving scaler** (extended to a dial, functionality preserved), **Cook mode** (transition upgraded, swipe/haptic logic preserved), **Detail ingredient list** (new cascade + mise-en-place checkboxes added, read behaviour preserved).

---

## 1. Library decision

**Ship both `framer-motion` 12 and keep vanilla CSS + inline spring engine.**

Reasoning:
- `framer-motion` 12 (package `motion` / `motion/react`) handles `layoutId` shared-element transitions out of the box. Rebuilding that is hundreds of lines of error-prone code (ResizeObserver, scroll corrections, RTL handling). It's the one thing worth the 18–22kB gz.
- `Motion One` (`motion.dev`) at 5.8kB gz is more compact — **but** shared-element layout is a `framer-motion` exclusive. We use framer's `<LayoutGroup>` + `<motion.div layoutId>` for the list→detail hero hand-off, and fall back to plain CSS-driven springs elsewhere.
- `react-spring`: not selected. Its value prop (physics across rerenders) is now a framer-motion 12 default via `useMotionValue`. No sense shipping two physics engines.
- Hand-rolled spring engine (~40 LOC, see `key-snippets/spring-engine.ts`) for the scaler dial because framer-motion's `useTransform`-based numeric scrubber is over-engineered for this; a bare integration loop with preserved velocity is clearer and ~1kB.

**Bundle budget:**

| Dep                             | gz   | Notes                                                     |
|---------------------------------|------|-----------------------------------------------------------|
| `motion` (framer-motion 12)     | ~22kB| Tree-shakes to ~18kB if we stay within `motion/react`     |
| New motion primitives (in-repo) | ~4kB | tokens + hooks + orchestrator                              |
| Web Audio procedural SFX        | 0kB  | No sample files; generated per-use                        |
| **Total net add**               | ~22kB| Dev should set a perf budget in `next.config.ts`          |

Trade: 22kB gz for a fully choreographed app. Next.js splits by route; the detail page and cook page get the bulk; list page gets only `<LayoutGroup>` + the motion tokens (< 4kB on the wire for /recipes).

---

## 2. New files

### `lib/motion/tokens.ts` (NEW)
Single source of truth for duration / ease / spring / stagger / drag / snap / haptic constants. Re-exports SSR-safe. Replaces all magic numbers throughout motion code.

### `lib/motion/springEngine.ts` (NEW)
~40 LOC pure-function `animateSpring(from, to, config, onFrame, onRest, v0)` — used by scaler dial + any scenario where preserved velocity matters but framer-motion's React surface is overkill. Handles cleanup. See `key-snippets/spring-engine.ts`.

### `lib/motion/audio.ts` (NEW)
Lazy-init `AudioContext`, `tone()` primitive, named `SFX` table (`tock`, `start`, `advance`, `back`, `complete`, `confirm`, `fail`). Respects `userPrefs.soundOff`. No sample files.

### `lib/motion/haptic.ts` (EXTEND — already exists at `lib/motion/haptic.ts`)
Keep existing `haptic(pattern)`; add named export `HAPTIC = { tick, nudge, snap, confirm, fail, hero }` matching design-spec §4.1. Any existing call sites keep working; new code uses the named palette.

### `components/motion/MotionTokensProvider.tsx` (NEW)
Pass-through; wires `prefers-reduced-motion` + `userPrefs.soundOff` into a React context so downstream motion primitives read preferences once.

### `components/motion/SharedHero.tsx` (NEW)
Thin wrapper around framer-motion `<motion.div layoutId>` with three fixed layoutIds: `hero-${recipeId}`, `title-${recipeId}`, `tag-${recipeId}-0`. One place to change the shared-element set.

### `components/motion/ChoreographedRoute.tsx` (NEW)
Client layout component that wraps every route with `<LayoutGroup>` + `<AnimatePresence>` for sibling cross-fade on non-hero elements. Handles the *service-in* cascade on mount by spreading `data-cascade-index` across immediate children.

### `components/motion/CookStepTransition.tsx` (NEW)
Dedicated exit/enter pair for cook-mode step changes. Reads swipe velocity from `useCookGesture`, computes direction, picks `cut` variant (see `key-snippets/cook-mode-transition.tsx`). Plays `advance`/`back` audio + `snap` haptic at t=0 pre-announcement.

### `components/motion/ScalerDial.tsx` (NEW)
New component — wraps the existing +/− buttons and the servings readout in a draggable dial. Uses `springEngine.ts`. Emits the same `onChange(n)` callback as the current `<button onClick>` pair; `RecipeDetailClient.tsx` swaps three lines of JSX and is done.

### `components/motion/useCookGesture.ts` (NEW)
Hook that consumes pointer events on cook-mode body, emits `{ direction, velocity }` at release. Replaces the inline 20-line `touchStart/touchMove/touchEnd` block in `CookMode.tsx`.

### `components/motion/useSpringValue.ts` (NEW)
Hook that reads a numeric input and returns a framer-motion `MotionValue` updated by spring. Used by the scaler's drag-to-release decay and the ingredient-dot pulses.

### `package.json` (EDIT)
Add `"motion": "^12.0.0"` (the new name for framer-motion 12).

---

## 3. Edited files

### `app/globals.css` (EDIT — additive)
Append the new motion tokens section:
- `--t-*` durations (quick/tap/step/settle/story/hero)
- `--ease-in-expo`, `--ease-in-out-exp`, `--ease-spring-kiss`
- `--shadow-drag`, `--shadow-snap`
- New keyframes: `cook-in-right`, `cook-in-left`, `cook-out-left`, `cook-out-right`, `cascade-in`, `plate-in`
- `.cascade > *` + `.plate-cascade > *` utilities with staggered delays
- Extend `@media (prefers-reduced-motion: reduce)` block to null the new animations

*No existing tokens removed.* Existing `--motion-xs/sm/md/lg/xl` continue to resolve.

**Checkpoint commit:** NOT required (additive only).

### `app/layout.tsx` (EDIT — wrap children in `<ChoreographedRoute>`)
Replace the body children wrapper:
```tsx
<body>
  <LanguageProvider>
    <ToastProvider>
      <MotionTokensProvider>
        <ChoreographedRoute>{children}</ChoreographedRoute>
      </MotionTokensProvider>
    </ToastProvider>
  </LanguageProvider>
</body>
```

No functional change; adds the `<LayoutGroup>` + `<AnimatePresence>` container required for shared-element transitions.

### `components/recipes/RecipeCard.tsx` (EDIT — wrap cover + title + first tag in shared-element markers)
Three `motion.div` wrappers with `layoutId="hero-${r.id}"`, `"title-${r.id}"`, `"tag-${r.id}-0"`. Disables Next.js `<Link prefetch>` view-transition-id (conflict), enables framer-motion's layout reconciliation instead.

**Sacred feature touched:** recipe list interactivity. All existing behaviour (keyboard nav, bulk-select overlay, hover border) preserved — only the cover/title/first-tag elements gain `layoutId`. **Checkpoint commit required** before edit.

### `components/recipes/RecipeDetailClient.tsx` (EDIT)
- Replace the servings `<button>−</button><span>N</span><button>+</button>` block (lines ~131–158) with `<ScalerDial value={targetServings} native={recipe.servings} onChange={updateTargetServings} />`. Existing `updateTargetServings` function unchanged; dial wraps and emits identical signal.
- Wrap hero title in `motion.div layoutId="title-${recipe.id}"` and hero image (to be added — currently there's a `ScrollParallaxCover` but no cover image component on detail; we add a matching `SharedHero`).
- Ingredient list gets `className="cascade"` — the existing list is already a flat `<ul>`, so the CSS cascade picks up automatically.
- Add mise-en-place checkbox logic (additive, not in current detail page): each ingredient row gets `onClick` toggle, stores checked state in `localStorage('recipe-checked:${id}')` keyed to the recipe so cook mode inherits.

**Sacred feature touched:** scaler (functional surface area preserved, visual replaced), ingredient display. **Checkpoint commit required.**

### `components/recipes/CookMode.tsx` (EDIT)
- Replace inline swipe logic with `useCookGesture()` hook
- Replace inline step `<div key={currentIndex}>` with `<CookStepTransition direction={dir}>{step}</CookStepTransition>`
- Replace the three-sine `playBeeps()` local function with `import { SFX } from '@/lib/motion/audio'` and call `SFX.advance()` / `SFX.complete()` at the same event sites
- All other logic (timers, wake-lock, completed-steps set, ingredient check) unchanged

**Sacred feature touched:** cook mode. **Checkpoint commit required.**

### `components/ui/ToastContext.tsx` + `ToastContainer.tsx` (EDIT — additive)
Add framer-motion `<AnimatePresence>` around the toast list so exit is spring-driven (settle) rather than CSS fade. Add swipe-to-dismiss gesture (optional; net new behaviour; not a regression).

### `components/FirstSaveCelebration.tsx` (EDIT — swap timing to `--t-hero` and `--ease-spring-kiss`)
Existing animation stays. Tokens swap. Adds paired `SFX.confirm()` on mount.

### `components/WordmarkStrokeIn.tsx` (EDIT — extend stagger to 120ms to match spec)
Move the magic `var(--stagger-card)` (80ms) to `var(--stagger-stroke-wordmark)` (120ms) exposed in `tokens.ts`. Also pair with `SFX.confirm()` + `HAPTIC.hero()` on first session play.

### `app/(auth)/login/page.tsx` (EDIT — add login-to-list transition)
After successful sign-in, animate card out (y:-24, scale:0.96, blur:6px) over 380ms before `router.push('/recipes')`. On arrival, list uses `plate` cascade (already in CSS). Net addition: ~12 lines.

### `app/(app)/recipes/[id]/page.tsx` (EDIT — pass shared-element seeds)
Server component. Passes recipe id + tags down to `<RecipeDetailClient>` unchanged; wrapping lives in the client component.

---

## 4. Deleted / deprecated

None. Everything is additive or swap-in.

---

## 5. Rollout order (12 PRs, each ~200 LOC max)

1. `tokens.ts` + `audio.ts` + `haptic.ts` extension + globals.css additions (foundation — no UX change)
2. `MotionTokensProvider` + `ChoreographedRoute` + layout wiring (infra — no visible change yet)
3. `SharedHero` + RecipeCard wrappers + RecipeDetail hero wrapper → **list → detail hand-off is live** ⭐
4. `ScalerDial` component; RecipeDetail swap (+ checkpoint of existing scaler) → **dial is live** ⭐
5. Ingredient cascade + mise-en-place checkboxes (additive)
6. `CookStepTransition` + `useCookGesture` + CookMode swap (+ checkpoint) → **cook cut is live** ⭐
7. FirstSaveCelebration token + audio pair
8. WordmarkStrokeIn extension + login transition
9. Toast exit spring + swipe dismiss
10. Tag chip select ring animation
11. Unit toggle glider + detail service-bar spring chain
12. Macros card match-modal `veil` transform-origin from click

Each PR ships behind a `featureFlag('motion-v2')` boolean in `lib/flags.ts` so we can land one at a time, flip per-user for JC + demo@ first, and keep e2e green.

---

## 6. E2E + Jest impact

Playwright 28/28 and Jest 91/91 must stay green. Risks:

- **Shared-element transitions take 880ms.** Every test that does `await page.click('[data-testid="recipe-card"]')` then immediately asserts on `/recipes/${id}` will race. Mitigation: add `data-motion-ready="true"` attribute on `<RecipeDetailClient>` once the hand-off completes; update Playwright helpers to `waitFor('[data-motion-ready="true"]')`.
- **`framer-motion` `<LayoutGroup>` uses `getBoundingClientRect()` during render.** JSDOM returns zeros. Tests that snapshot the DetailClient component must stub via `vi.mock('motion/react', () => ({ motion: proxyFallback }))` OR render in a real browser via `@testing-library/react` with JSDOM's bbox polyfill.
- **Reduced-motion in tests.** Set `--prefers-reduced-motion: reduce` globally in `tests/e2e/helpers.ts`'s context opts so animations resolve to final state instantly — preserves assertion timing.
- **Audio context.** `AudioContext` is undefined in JSDOM. Wrap audio calls in `typeof window !== 'undefined' && 'AudioContext' in window` guards (already present via `ensureAudio()`).

---

## 7. Performance budget

| Surface           | Target                            | Tool                                    |
|-------------------|-----------------------------------|-----------------------------------------|
| First paint (list)| ≤ baseline + 30ms                 | `next build` + Lighthouse               |
| Hand-off transition| ≥ 58fps on iPhone SE (2020)      | Chrome DevTools Performance, 6× CPU    |
| Scaler dial drag  | ≥ 60fps during drag               | Same                                    |
| Cook step advance | ≥ 60fps (2 elements animated only)| Same                                    |
| Bundle gz (shared)| +22kB ceiling                     | `@next/bundle-analyzer`                 |

If any target misses, the fallback sequence is:
1. Lower spring `mass` (lighter feel, cheaper math)
2. Replace `filter: blur()` in cook cut with a translate-only variant (blur is the most expensive composite op)
3. Gate hand-off behind `hover: hover AND viewport > 768px` (mobile does a cross-fade)
