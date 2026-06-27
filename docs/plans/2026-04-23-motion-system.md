# Motion & Visual Elevation System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a holistic motion system that elevates SEKAI 世界 with "wow" factor while preserving mise-en-place brand discipline. Two signature moments (shared-element view transition, SEKAI wordmark stroke-in) plus feedback tier, transform tier, cook-mode tier, typographic finish, and restrained delight.

**Architecture:** Pure additive layer on existing Next 15 / React 19 / Tailwind 4 codebase. Zero new npm dependencies. Motion primitives in `lib/motion/*`, reusable UI wrappers in `components/motion/*`, CSS tokens + `@property` registrations in `globals.css`, per-component integration elsewhere.

**Tech Stack:** CSS custom properties, `@property` at-rule, `animation-timeline: scroll()`, View Transitions API (`document.startViewTransition`), SVG path `stroke-dashoffset`, `navigator.vibrate()`, `sessionStorage`, React 19, Tailwind 4.

**Spec reference:** `docs/superpowers/specs/2026-04-23-motion-system-design.md`

**Context (from codebase exploration):**
- `RecipeCard` has no cover image → shared-element morph uses card container + title only.
- `animate-fade-up` / `animate-scale-in` already exist in `globals.css` — motion system tunes and extends them.
- `CookMode` already uses `navigator.vibrate` and `animate-scale-in` — consolidated via motion lib.
- SEKAI wordmark already in `app/(app)/layout.tsx` nav → stroke-in upgrades the existing element.
- Tests baseline: Jest 91/91, Playwright 28/28. Pre-commit gate in `.githooks/pre-commit` + `scripts/test-gate.mjs`.

---

## Phase 1 — Foundation (motion tokens, @property, libs)

### Task 1.1: Add motion tokens + @property registrations to globals.css

**Files:**
- Modify: `app/globals.css` (add block before `/* ── Animations ── */` at line ~394)

- [ ] **Step 1: Add motion tokens and @property registrations**

After the `:root` block at line ~37 (before the light/dark overrides), insert:

```css
/* ── Motion tokens ──────────────────────────────────────────────────────────── */
:root {
  /* Easing curves (exponential deceleration — never bounce/elastic) */
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);

  /* Durations */
  --motion-xs: 120ms;
  --motion-sm: 180ms;
  --motion-md: 260ms;
  --motion-lg: 320ms;
  --motion-xl: 400ms;

  /* Staggers */
  --stagger-card:   80ms;
  --stagger-stroke: 60ms;
}

/* ── @property registrations (for animatable custom props) ──────────────────── */
@property --macro-protein-pct { syntax: "<percentage>"; initial-value: 0%; inherits: false; }
@property --macro-carb-pct    { syntax: "<percentage>"; initial-value: 0%; inherits: false; }
@property --macro-fat-pct     { syntax: "<percentage>"; initial-value: 0%; inherits: false; }
@property --shimmer-pos       { syntax: "<percentage>"; initial-value: -20%; inherits: false; }
@property --field-flash       { syntax: "<number>";     initial-value: 0; inherits: false; }
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: Compiles clean, no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat(motion): add motion tokens and @property registrations"
```

### Task 1.2: Create motion tokens module

**Files:**
- Create: `lib/motion/tokens.ts`

- [ ] **Step 1: Create tokens module**

```ts
// Motion timing and easing constants used by TS/JSX.
// Mirrors the CSS custom properties in globals.css so JS-driven
// animations stay consistent with CSS transitions.

export const DURATION = {
  xs: 120,
  sm: 180,
  md: 260,
  lg: 320,
  xl: 400,
} as const;

export const EASE = {
  outQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  outQuint: 'cubic-bezier(0.22, 1, 0.36, 1)',
  outExpo:  'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const STAGGER = {
  card:   80,
  stroke: 60,
} as const;

export const CARD_STAGGER_CAP = 12;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/motion/tokens.ts
git commit -m "feat(motion): add motion tokens TS module"
```

### Task 1.3: Create haptic wrapper

**Files:**
- Create: `lib/motion/haptic.ts`
- Create: `lib/motion/__tests__/haptic.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { haptic } from '../haptic';

describe('haptic', () => {
  const origVibrate = Object.getOwnPropertyDescriptor(Navigator.prototype, 'vibrate');

  afterEach(() => {
    if (origVibrate) Object.defineProperty(Navigator.prototype, 'vibrate', origVibrate);
    else delete (Navigator.prototype as unknown as { vibrate?: unknown }).vibrate;
  });

  it('calls navigator.vibrate with the given pattern', () => {
    const spy = jest.fn();
    Object.defineProperty(Navigator.prototype, 'vibrate', { value: spy, configurable: true });
    haptic(10);
    expect(spy).toHaveBeenCalledWith(10);
  });

  it('no-ops when navigator.vibrate is absent', () => {
    delete (Navigator.prototype as unknown as { vibrate?: unknown }).vibrate;
    expect(() => haptic([10, 20, 10])).not.toThrow();
  });

  it('no-ops under prefers-reduced-motion', () => {
    const spy = jest.fn();
    Object.defineProperty(Navigator.prototype, 'vibrate', { value: spy, configurable: true });
    const mm = jest.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    haptic(10);
    expect(spy).not.toHaveBeenCalled();
    mm.mockRestore();
  });
});
```

Run: `npx jest lib/motion/__tests__/haptic.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 2: Implement haptic**

```ts
// Thin wrapper around navigator.vibrate().
// Silently no-ops when:
//   - running server-side,
//   - vibrate API is missing (desktop, some mobile browsers),
//   - the user has set prefers-reduced-motion: reduce.
// Haptic feedback is classified as motion for accessibility purposes.

export type HapticPattern = number | number[];

export function haptic(pattern: HapticPattern): void {
  if (typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  if (typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try { navigator.vibrate(pattern); } catch { /* ignore */ }
}
```

Run: `npx jest lib/motion/__tests__/haptic.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/motion/haptic.ts lib/motion/__tests__/haptic.test.ts
git commit -m "feat(motion): add haptic wrapper with a11y gate"
```

### Task 1.4: Create View Transitions helper

**Files:**
- Create: `lib/motion/view-transition.ts`
- Create: `lib/motion/__tests__/view-transition.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { startViewTransition } from '../view-transition';

describe('startViewTransition', () => {
  it('invokes callback immediately when API unavailable', async () => {
    const cb = jest.fn(() => Promise.resolve());
    await startViewTransition(cb);
    expect(cb).toHaveBeenCalled();
  });

  it('uses document.startViewTransition when available', async () => {
    const vtStart = jest.fn((fn: () => void) => { fn(); return { finished: Promise.resolve() }; });
    Object.defineProperty(document, 'startViewTransition', { value: vtStart, configurable: true });
    const cb = jest.fn(() => Promise.resolve());
    await startViewTransition(cb);
    expect(vtStart).toHaveBeenCalled();
    // @ts-expect-error test cleanup
    delete document.startViewTransition;
  });
});
```

Run: `npx jest lib/motion/__tests__/view-transition.test.ts`
Expected: FAIL.

- [ ] **Step 2: Implement helper**

```ts
// Wraps document.startViewTransition() so callers can always await a Promise.
// When the API is missing (Firefox, older browsers) the callback runs inline
// and the returned Promise resolves — callers get the same shape either way.

type VTDocument = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> };
};

export async function startViewTransition(cb: () => void | Promise<void>): Promise<void> {
  if (typeof document === 'undefined') { await cb(); return; }
  const d = document as VTDocument;
  if (typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { await cb(); return; }
  if (!d.startViewTransition) { await cb(); return; }
  const transition = d.startViewTransition(cb);
  await transition.finished.catch(() => {});
}

export function supportsViewTransitions(): boolean {
  if (typeof document === 'undefined') return false;
  return typeof (document as VTDocument).startViewTransition === 'function';
}
```

Run: `npx jest lib/motion/__tests__/view-transition.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add lib/motion/view-transition.ts lib/motion/__tests__/view-transition.test.ts
git commit -m "feat(motion): add View Transitions API wrapper"
```

### Task 1.5: Tune reduced-motion block in globals.css

**Files:**
- Modify: `app/globals.css` (lines ~428-442)

- [ ] **Step 1: Extend reduced-motion rules**

Replace the existing `@media (prefers-reduced-motion: reduce)` block with:

```css
/* ── Reduced motion ─────────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    animation-delay: 0ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  body::after { display: none !important; }
  .animate-fade-up,
  .animate-scale-in,
  .animate-stroke-in,
  .animate-ink-brush,
  .animate-shimmer,
  .animate-ring-breath,
  .animate-underscore-sweep,
  .drain-bar { animation: none !important; }
  [data-motion-optional] { animation: none !important; transition: none !important; }
  .scroll-parallax { transform: none !important; }
}
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add app/globals.css
git commit -m "feat(motion): extend reduced-motion gate to cover new animation classes"
```

---

## Phase 2 — SEKAI wordmark stroke-in (Signature B)

### Task 2.1: Add stroke-in keyframes to globals.css

**Files:**
- Modify: `app/globals.css` (inside `@layer utilities`, before the final `}`)

- [ ] **Step 1: Add keyframe + utility class**

Inside the `@layer utilities` block (after `.drain-bar` rule), add:

```css
  @keyframes stroke-in {
    from { stroke-dashoffset: var(--stroke-length, 100); opacity: 0.6; }
    to   { stroke-dashoffset: 0; opacity: 1; }
  }
  .animate-stroke-in path {
    stroke-dasharray: var(--stroke-length, 100);
    stroke-dashoffset: var(--stroke-length, 100);
    animation: stroke-in 0.85s var(--ease-out-expo) both;
  }
  .animate-stroke-in path:nth-child(1) { animation-delay: 0ms; }
  .animate-stroke-in path:nth-child(2) { animation-delay: 60ms; }
  .animate-stroke-in path:nth-child(3) { animation-delay: 120ms; }
  .animate-stroke-in path:nth-child(4) { animation-delay: 180ms; }
  .animate-stroke-in path:nth-child(5) { animation-delay: 240ms; }
  .animate-stroke-in path:nth-child(6) { animation-delay: 300ms; }
  .animate-stroke-in path:nth-child(7) { animation-delay: 360ms; }
```

- [ ] **Step 2: Build + commit**

```bash
npm run build
git add app/globals.css
git commit -m "feat(motion): add stroke-in keyframes"
```

### Task 2.2: Create WordmarkStrokeIn component

**Files:**
- Create: `components/motion/WordmarkStrokeIn.tsx`
- Create: `components/motion/__tests__/WordmarkStrokeIn.test.tsx`

- [ ] **Step 1: Write failing test**

```tsx
import { render } from '@testing-library/react';
import WordmarkStrokeIn from '../WordmarkStrokeIn';

describe('WordmarkStrokeIn', () => {
  beforeEach(() => { sessionStorage.clear(); });

  it('renders the SEKAI 世界 wordmark with animation class on first mount', () => {
    const { container } = render(<WordmarkStrokeIn />);
    const wrapper = container.querySelector('[data-testid="sekai-wordmark"]');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.classList.contains('animate-stroke-in')).toBe(true);
  });

  it('skips animation on second mount in same session', () => {
    sessionStorage.setItem('sekai_wordmark_played', '1');
    const { container } = render(<WordmarkStrokeIn />);
    const wrapper = container.querySelector('[data-testid="sekai-wordmark"]');
    expect(wrapper?.classList.contains('animate-stroke-in')).toBe(false);
  });

  it('sets sessionStorage flag after first render', () => {
    render(<WordmarkStrokeIn />);
    expect(sessionStorage.getItem('sekai_wordmark_played')).toBe('1');
  });
});
```

Run: `npx jest components/motion/__tests__/WordmarkStrokeIn.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Implement WordmarkStrokeIn**

```tsx
'use client';

import { useEffect, useState } from 'react';

const SESSION_KEY = 'sekai_wordmark_played';

interface Props {
  className?: string;
}

// Renders the SEKAI 世界 lockup. On the very first mount per browser session,
// the SVG strokes draw on. Subsequent mounts (route changes, refreshes within
// the same session) render the final state instantly. Respects reduced motion
// via the global CSS gate.
export default function WordmarkStrokeIn({ className }: Props) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const played = sessionStorage.getItem(SESSION_KEY);
    if (!played) {
      setAnimate(true);
      sessionStorage.setItem(SESSION_KEY, '1');
    }
  }, []);

  return (
    <span
      data-testid="sekai-wordmark"
      className={`${animate ? 'animate-stroke-in' : ''} ${className ?? ''}`.trim()}
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.375rem' }}
    >
      {/* Roman: SEKAI — simple stroked path per letter for stroke-in illusion */}
      <svg
        width="86" height="18" viewBox="0 0 86 18" aria-hidden="true"
        style={{ overflow: 'visible' }}
      >
        <g fill="none" stroke="var(--color-terracotta)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3 L14 3 M2 9 L12 9 M2 15 L14 15 M2 3 L2 15" style={{ ['--stroke-length' as string]: '60' }} />
          <path d="M18 15 L18 3 L30 3 M18 9 L28 9 M18 15 L30 15" style={{ ['--stroke-length' as string]: '60' }} />
          <path d="M34 3 L34 15 M34 9 L46 3 M34 9 L46 15" style={{ ['--stroke-length' as string]: '60' }} />
          <path d="M50 15 L56 3 L62 15 M52 11 L60 11" style={{ ['--stroke-length' as string]: '60' }} />
          <path d="M66 3 L66 15 M78 3 L78 15 M66 3 L78 3 M66 15 L78 15 M72 3 L72 15" style={{ ['--stroke-length' as string]: '60' }} />
        </g>
      </svg>
      <span
        className="font-display"
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-3)',
          opacity: animate ? 1 : 1,
        }}
        aria-label="SEKAI — sekai (world)"
      >
        世界
      </span>
    </span>
  );
}
```

Run: `npx jest components/motion/__tests__/WordmarkStrokeIn.test.tsx`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add components/motion/WordmarkStrokeIn.tsx components/motion/__tests__/WordmarkStrokeIn.test.tsx
git commit -m "feat(motion): add SEKAI wordmark stroke-in component (Signature B)"
```

### Task 2.3: Wire wordmark into app layout

**Files:**
- Modify: `app/(app)/layout.tsx` (nav section, lines 50-63)

- [ ] **Step 1: Replace static wordmark with WordmarkStrokeIn**

Add import at top:

```ts
import WordmarkStrokeIn from '@/components/motion/WordmarkStrokeIn';
```

Replace the `<Link href="/recipes" className="flex items-baseline gap-1.5">...</Link>` block with:

```tsx
<Link href="/recipes" className="flex items-baseline gap-1.5" aria-label="SEKAI — go to recipes">
  <WordmarkStrokeIn />
</Link>
```

- [ ] **Step 2: Build + verify e2e still green**

```bash
npm run build
npx jest
```

Expected: Build clean, Jest 94/94 (existing 91 + 3 new).

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/layout.tsx
git commit -m "feat(motion): integrate wordmark stroke-in into app layout nav"
```

---

## Phase 3 — Feedback tier

### Task 3.1: FieldFlash component (save-success gold border flash)

**Files:**
- Create: `components/motion/FieldFlash.tsx`
- Modify: `app/globals.css` (add keyframe)

- [ ] **Step 1: Add field-flash keyframe**

In `@layer utilities` block:

```css
  @keyframes field-flash {
    0%   { box-shadow: 0 0 0 0 transparent; }
    10%  { box-shadow: 0 0 0 2px var(--color-gold); }
    100% { box-shadow: 0 0 0 0 transparent; }
  }
  .animate-field-flash { animation: field-flash 320ms var(--ease-out-quart) both; }
```

- [ ] **Step 2: Implement FieldFlash wrapper**

```tsx
'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  trigger: number; // increment to flash
  children: ReactNode;
  className?: string;
}

// Wraps a form field or button and flashes a gold ring whenever `trigger`
// changes (use an incrementing counter or timestamp). Self-clears via
// animationend; never accumulates state between renders.
export default function FieldFlash({ trigger, children, className }: Props) {
  const [key, setKey] = useState(0);
  useEffect(() => { if (trigger > 0) setKey(k => k + 1); }, [trigger]);
  return (
    <span
      key={key}
      className={`${key > 0 ? 'animate-field-flash' : ''} ${className ?? ''}`.trim()}
      style={{ display: 'inline-block', borderRadius: 'inherit' }}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/motion/FieldFlash.tsx app/globals.css
git commit -m "feat(motion): add FieldFlash save-success wrapper"
```

### Task 3.2: Enhance CookMode ingredient checkbox with ripple + haptic

**Files:**
- Modify: `components/recipes/CookMode.tsx`
- Modify: `app/globals.css` (add ripple keyframe)

- [ ] **Step 1: Add ripple keyframe**

In `@layer utilities`:

```css
  @keyframes ring-ripple {
    from { transform: scale(0.2); opacity: 0.9; }
    to   { transform: scale(3); opacity: 0; }
  }
  .ingredient-ripple {
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    border: 2px solid var(--color-gold);
    pointer-events: none;
    animation: ring-ripple 340ms var(--ease-out-quart) forwards;
  }
```

- [ ] **Step 2: Add ripple + haptic to CookMode checkbox**

At top of `components/recipes/CookMode.tsx`, add import:

```ts
import { haptic } from '@/lib/motion/haptic';
```

Find the two `<li>` checkbox blocks (desktop ~line 480 and mobile ~line 670). In each, wrap the checkbox `<div>` in a `relative` container and on click, toggle a local ripple state. Use inline ref pattern:

Create a helper inside the component (add after state declarations):

```tsx
const [rippleIdx, setRippleIdx] = useState<number | null>(null);
function triggerIngredientCheck(i: number) {
  setCheckedIngredients(prev => {
    const next = new Set(prev);
    const isChecking = !next.has(i);
    if (isChecking) { next.add(i); haptic(10); setRippleIdx(i); setTimeout(() => setRippleIdx(cur => cur === i ? null : cur), 340); }
    else next.delete(i);
    return next;
  });
}
```

Replace both ingredient `<li onClick>` handlers with: `onClick={() => triggerIngredientCheck(i)}`.

Inside each checkbox `<div>`, add immediately before the closing tag:

```tsx
{rippleIdx === i && <span className="ingredient-ripple" aria-hidden="true" />}
```

Set each checkbox `<div>` to `position: relative` in its inline style.

- [ ] **Step 3: Build + test**

```bash
npm run build
npx playwright test tests/e2e/cook-mode.spec.ts --project='Desktop Chrome' --grep @smoke
```

Expected: existing cook-mode tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/recipes/CookMode.tsx app/globals.css
git commit -m "feat(motion): add ripple + haptic to cook-mode ingredient check"
```

### Task 3.3: Toast entry motion (ToastContainer)

**Files:**
- Modify: `components/ui/ToastContainer.tsx`

- [ ] **Step 1: Apply entry motion via existing utility**

Read file and ensure each toast receives `className="animate-fade-up"` (if it doesn't already). If toast dismissal is animated, leave as-is. Keep `--motion-md` duration via existing `animate-fade-up` timing (already 220ms).

If no changes needed after inspection, skip this task silently.

- [ ] **Step 2: Commit if changed**

```bash
git add components/ui/ToastContainer.tsx
git commit -m "feat(motion): polish toast entry with fade-up motion"
```

### Task 3.4: Copy-to-clipboard shimmer

**Files:**
- Grep for copy button: `grep -rn "navigator.clipboard" components/ --include="*.tsx"`
- Modify: the component that contains the copy affordance
- Modify: `app/globals.css` (add shimmer keyframe)

- [ ] **Step 1: Add shimmer keyframe**

In `@layer utilities`:

```css
  @keyframes shimmer-wipe {
    from { --shimmer-pos: -20%; }
    to   { --shimmer-pos: 120%; }
  }
  .animate-shimmer {
    position: relative;
    overflow: hidden;
  }
  .animate-shimmer::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(110deg,
      transparent calc(var(--shimmer-pos) - 15%),
      color-mix(in oklch, var(--color-gold) 40%, transparent) var(--shimmer-pos),
      transparent calc(var(--shimmer-pos) + 15%)
    );
    animation: shimmer-wipe 380ms var(--ease-out-quint) forwards;
    pointer-events: none;
  }
```

- [ ] **Step 2: Trigger shimmer on copy success**

In the copy handler, after successful copy, add class `animate-shimmer` to the button element for 380ms. Simple React pattern:

```tsx
const [shimmer, setShimmer] = useState(false);
async function handleCopy() {
  await navigator.clipboard.writeText(text);
  setShimmer(true);
  setTimeout(() => setShimmer(false), 400);
  // existing feedback (toast, label swap) continues
}
```

Apply `className={shimmer ? 'animate-shimmer' : ''}` to the button.

- [ ] **Step 3: Commit**

```bash
git add components/... app/globals.css
git commit -m "feat(motion): add gold shimmer to copy-to-clipboard success"
```

### Task 3.5: Tag filter chip wipe

**Files:**
- Modify: `components/recipes/TagRail.tsx` or `components/recipes/SortPills.tsx` — whichever holds the chip toggle

- [ ] **Step 1: Read and locate chip element**

Skim TagRail; locate the `<button>` used as a tag chip. Ensure it has `transition: transform 180ms var(--ease-out-quart), background-color 180ms var(--ease-out-quart)` inline style or via class. When `active`, its background transitions smoothly.

- [ ] **Step 2: Add subtle scale feedback on active toggle**

Inline style additions on the chip button:

```ts
style={{
  ...existingStyle,
  transition: 'transform 180ms cubic-bezier(0.25, 1, 0.5, 1), background-color 180ms cubic-bezier(0.25, 1, 0.5, 1), border-color 180ms cubic-bezier(0.25, 1, 0.5, 1)',
}}
```

And on tap (active/selected transitioning), CSS `:active` style uses `transform: scale(0.96)`; release returns to `scale(1)`. Add `:active { transform: scale(0.96); }` via a class applied to all chips.

Add to globals.css `@layer utilities`:

```css
  .chip-press { transition: transform var(--motion-sm) var(--ease-out-quart); }
  .chip-press:active { transform: scale(0.96); }
```

Apply `chip-press` className to chip buttons in TagRail.

- [ ] **Step 3: Commit**

```bash
git add components/recipes/TagRail.tsx app/globals.css
git commit -m "feat(motion): add chip press feedback on tag toggle"
```

---

## Phase 4 — Transform tier

### Task 4.1: Tune list stagger (cap 12, 80ms offset)

**Files:**
- Modify: `components/recipes/RecipeListClient.tsx` (line ~439)

- [ ] **Step 1: Replace stagger delay formula**

In `RecipeListClient.tsx`, find line 439:

```ts
style={{ animationDelay: `${Math.min(index, 6) * 60}ms`, animationFillMode: 'both' }}
```

Replace with:

```ts
style={{ animationDelay: `${Math.min(index, 11) * 80}ms`, animationFillMode: 'both' }}
```

Rationale: spec calls for 80ms offset, cap first 12 cards.

- [ ] **Step 2: Build + e2e smoke**

```bash
npm run build
npx playwright test --grep @smoke --project='Desktop Chrome'
```

Expected: pass.

- [ ] **Step 3: Commit**

```bash
git add components/recipes/RecipeListClient.tsx
git commit -m "feat(motion): tune list stagger to 80ms×12 per spec"
```

### Task 4.2: Scroll-driven cover parallax (recipe detail)

**Files:**
- Create: `components/motion/ScrollParallaxCover.tsx`
- Modify: `components/recipes/RecipeDetailClient.tsx` (wrap hero section)
- Modify: `app/globals.css`

- [ ] **Step 1: Add scroll-timeline rule**

In `@layer utilities`:

```css
  @supports (animation-timeline: scroll()) {
    .scroll-parallax {
      animation: parallax-rise linear both;
      animation-timeline: scroll();
      animation-range: entry 0% contain 40%;
    }
    @keyframes parallax-rise {
      from { transform: translateY(0); }
      to   { transform: translateY(-12px); }
    }
  }
```

- [ ] **Step 2: Implement ScrollParallaxCover**

```tsx
'use client';

import type { ReactNode } from 'react';

interface Props { children: ReactNode; className?: string }

// Applies a CSS scroll-driven parallax translate to its subtree.
// Browsers without animation-timeline: scroll() (Firefox currently) render
// the content statically — no JavaScript scroll listener is used.
export default function ScrollParallaxCover({ children, className }: Props) {
  return (
    <div className={`scroll-parallax ${className ?? ''}`.trim()}>{children}</div>
  );
}
```

- [ ] **Step 3: Wrap hero in RecipeDetailClient**

Find the hero section of the recipe detail (title + meta block). Wrap it:

```tsx
import ScrollParallaxCover from '@/components/motion/ScrollParallaxCover';
...
<ScrollParallaxCover>
  { /* existing hero markup */ }
</ScrollParallaxCover>
```

- [ ] **Step 4: Commit**

```bash
git add components/motion/ScrollParallaxCover.tsx components/recipes/RecipeDetailClient.tsx app/globals.css
git commit -m "feat(motion): add scroll-driven cover parallax on recipe detail"
```

### Task 4.3: MacrosCard @property bar morph + count-up

**Files:**
- Modify: `components/MacrosCard.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add macros gradient + transition rules**

In `@layer utilities`:

```css
  .macros-bar {
    height: 4px;
    border-radius: 2px;
    background: linear-gradient(
      to right,
      var(--color-terracotta) 0%,
      var(--color-terracotta) var(--macro-protein-pct),
      var(--color-gold) var(--macro-protein-pct),
      var(--color-gold) calc(var(--macro-protein-pct) + var(--macro-carb-pct)),
      color-mix(in oklch, var(--color-terracotta) 50%, var(--color-gold) 50%) calc(var(--macro-protein-pct) + var(--macro-carb-pct)),
      color-mix(in oklch, var(--color-terracotta) 50%, var(--color-gold) 50%) 100%
    );
    transition: --macro-protein-pct 400ms var(--ease-out-quint),
                --macro-carb-pct 400ms var(--ease-out-quint);
  }
```

- [ ] **Step 2: Extend MacrosCard render**

After the `<p>` with fat/carbs/protein/fiber (line ~143), insert a macros bar:

```tsx
{(() => {
  const total = perServing.protein_g + perServing.carbs_g + perServing.fat_g;
  if (total === 0) return null;
  const p = (perServing.protein_g / total) * 100;
  const c = (perServing.carbs_g / total) * 100;
  return (
    <div
      className="macros-bar mt-3"
      style={{
        ['--macro-protein-pct' as string]: `${p}%`,
        ['--macro-carb-pct' as string]: `${c}%`,
      } as React.CSSProperties}
      aria-hidden="true"
      data-testid="macros-bar"
    />
  );
})()}
```

- [ ] **Step 3: Build + run jest**

```bash
npm run build
npx jest
```

Expected: pass.

- [ ] **Step 4: Commit**

```bash
git add components/MacrosCard.tsx app/globals.css
git commit -m "feat(motion): add @property macros bar with interpolated morph"
```

### Task 4.4: Serving scaler + unit toggle crossfade

**Files:**
- Modify: `components/recipes/RecipeDetailClient.tsx` (find serving number and unit crossfade targets)

- [ ] **Step 1: Add crossfade utility**

In `@layer utilities`:

```css
  .crossfade-number { transition: opacity 160ms var(--ease-out-quart); }
  .crossfade-number.is-changing { opacity: 0; }
```

- [ ] **Step 2: Wire up crossfade on scaler change**

In `RecipeDetailClient.tsx`, find where `servings` or scaled amounts render. Add a ref'd wrapper that toggles `is-changing` class briefly when the value changes:

```tsx
const [changing, setChanging] = useState(false);
useEffect(() => {
  setChanging(true);
  const id = setTimeout(() => setChanging(false), 40);
  return () => clearTimeout(id);
}, [servings, unitSystem]);
```

Apply to the relevant span: `className={`crossfade-number ${changing ? 'is-changing' : ''}`}`.

- [ ] **Step 3: Commit**

```bash
git add components/recipes/RecipeDetailClient.tsx app/globals.css
git commit -m "feat(motion): add crossfade on serving scaler and unit toggle"
```

### Task 4.5: Search gold-underscore ripple

**Files:**
- Modify: `components/recipes/RecipeListClient.tsx`
- Modify: `components/recipes/RecipeCard.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Add underscore sweep rule**

In `@layer utilities`:

```css
  @keyframes underscore-sweep {
    from { transform: scaleX(0); opacity: 0; }
    50%  { opacity: 1; }
    to   { transform: scaleX(1); opacity: 0; }
  }
  .search-match::after {
    content: '';
    position: absolute; left: 0; right: 0; bottom: -2px;
    height: 1.5px;
    background: var(--color-gold);
    transform-origin: left;
    animation: underscore-sweep 220ms var(--ease-out-quart) forwards;
    pointer-events: none;
  }
```

- [ ] **Step 2: Mark matching cards**

In RecipeListClient, compute a `matchedIds` Set when `q` changes; pass to `RecipeCard` a boolean `isSearchMatch`. Card applies `search-match` to its title wrapper on each render where `isSearchMatch` is true for 220ms using a `key` change.

Add to `RecipeCard` Props: `isSearchMatch?: boolean`. Apply `className={`... ${isSearchMatch ? 'search-match' : ''}`}` to the title `<h2>` wrapper (needs `position: relative`).

- [ ] **Step 3: Commit**

```bash
git add components/recipes/RecipeListClient.tsx components/recipes/RecipeCard.tsx app/globals.css
git commit -m "feat(motion): add gold-underscore ripple on search match"
```

---

## Phase 5 — Shared-element view transitions (Signature A)

### Task 5.1: View-transition CSS setup

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Add global view-transition rules**

At the end of globals.css (after reduced-motion block):

```css
/* ── View Transitions ───────────────────────────────────────────────────────── */
@supports (view-transition-name: root) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: 220ms;
    animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
  }
  ::view-transition-group(*) { animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1); }
  ::view-transition-old(*) { animation-duration: 180ms; }
  ::view-transition-new(*) { animation-duration: 320ms; }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/globals.css
git commit -m "feat(motion): add global view-transition easing + durations"
```

### Task 5.2: ViewTransitionLink wrapper

**Files:**
- Create: `components/motion/ViewTransitionLink.tsx`

- [ ] **Step 1: Implement wrapper**

```tsx
'use client';

import Link, { type LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import { type MouseEvent, type ReactNode, forwardRef } from 'react';
import { startViewTransition } from '@/lib/motion/view-transition';

type Props = LinkProps & {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
  'aria-label'?: string;
};

// Intercepts internal navigation and wraps it in document.startViewTransition
// so any matched view-transition-name pairs animate between list and detail
// pages. Falls back to normal Link navigation on unsupported browsers.
const ViewTransitionLink = forwardRef<HTMLAnchorElement, Props>(function ViewTransitionLink(
  { href, children, onClick, ...rest },
  ref,
) {
  const router = useRouter();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    const url = typeof href === 'string' ? href : (href as { pathname?: string }).pathname;
    if (!url) return;
    e.preventDefault();
    void startViewTransition(() => { router.push(url as string); });
  }

  return (
    <Link ref={ref} href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
});

export default ViewTransitionLink;
```

- [ ] **Step 2: Commit**

```bash
git add components/motion/ViewTransitionLink.tsx
git commit -m "feat(motion): add ViewTransitionLink wrapper"
```

### Task 5.3: Apply view-transition-name to recipe card + detail

**Files:**
- Modify: `components/recipes/RecipeCard.tsx`
- Modify: `components/recipes/RecipeDetailClient.tsx` (or detail page)

- [ ] **Step 1: Card-side names**

In RecipeCard.tsx, on the `<Link>` returned in non-selectMode (line ~129), add:

```tsx
style={{
  ...existingStyle,
  viewTransitionName: `recipe-card-${recipe.id}`,
} as React.CSSProperties}
```

And on the `<h2>` title (line ~90):

```tsx
style={{ color: 'var(--text-1)', viewTransitionName: `recipe-title-${recipe.id}` } as React.CSSProperties}
```

Swap the `<Link>` for `<ViewTransitionLink>` import at top.

- [ ] **Step 2: Detail-side matched names**

Find the hero container and title in RecipeDetailClient. Add matching:

```tsx
style={{ viewTransitionName: `recipe-card-${recipe.id}` }}
```

on the hero wrapper and

```tsx
style={{ viewTransitionName: `recipe-title-${recipe.id}` }}
```

on the main title.

- [ ] **Step 3: Build + smoke**

```bash
npm run build
npx playwright test --grep @smoke --project='Desktop Chrome'
```

- [ ] **Step 4: Commit**

```bash
git add components/recipes/RecipeCard.tsx components/recipes/RecipeDetailClient.tsx
git commit -m "feat(motion): apply shared-element view transitions card → detail (Signature A)"
```

---

## Phase 6 — Cook mode tier

### Task 6.1: Step advance slide + haptic

**Files:**
- Modify: `components/recipes/CookMode.tsx`

- [ ] **Step 1: Add step crossfade class**

In globals.css `@layer utilities`:

```css
  @keyframes step-slide-in {
    from { opacity: 0; transform: translateX(16px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .animate-step-slide { animation: step-slide-in 260ms var(--ease-out-quart) both; }
```

- [ ] **Step 2: Apply on step change**

In CookMode.tsx, wrap the step content block with a key that changes on `currentIndex`:

```tsx
<div key={`step-${currentIndex}`} className="animate-step-slide" ...>{currentStep.content}</div>
```

In `goTo()`, after `setCurrentIndex(i)`, call:

```ts
haptic(8);
```

- [ ] **Step 3: Commit**

```bash
git add components/recipes/CookMode.tsx app/globals.css
git commit -m "feat(motion): add step-advance slide + haptic in cook mode"
```

### Task 6.2: Timer ring breath

**Files:**
- Modify: `components/recipes/CookMode.tsx`

- [ ] **Step 1: Add breath keyframe**

In `@layer utilities`:

```css
  @keyframes ring-breath {
    0%, 100% { opacity: 0.92; }
    50%      { opacity: 1.0; }
  }
  .animate-ring-breath { animation: ring-breath 4s ease-in-out infinite; }
```

- [ ] **Step 2: Apply class to timer display when running**

In both desktop and mobile timer display spans (lines ~425 + ~586), extend className:

```tsx
className={`font-label text-4xl font-bold tabular-nums ${currentTimer.running ? 'animate-ring-breath' : ''}`}
```

Remove `animate-pulse` (which is Tailwind's default pulse — replace with our breath class). For the zero-state "done" pill, keep `animate-pulse` as the attention-getter.

- [ ] **Step 3: Commit**

```bash
git add components/recipes/CookMode.tsx app/globals.css
git commit -m "feat(motion): add timer ring breath in cook mode"
```

### Task 6.3: Cook completion gold sweep

**Files:**
- Modify: `components/recipes/CookMode.tsx`

- [ ] **Step 1: Add sweep keyframe**

In `@layer utilities`:

```css
  @keyframes gold-sweep {
    from { transform: translateX(-100%); }
    to   { transform: translateX(100%); }
  }
  .gold-sweep {
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, var(--color-gold) 50%, transparent);
    mix-blend-mode: screen;
    animation: gold-sweep 520ms var(--ease-out-quart) forwards;
    pointer-events: none;
  }
```

- [ ] **Step 2: Apply sweep on finished state**

In the `{finished && ...}` completion block, find the recipe title region and add a sibling sweep span (positioned absolutely within a relatively-positioned parent). Wire once when `finished` becomes true. Add haptic call in `goTo()` when transitioning to `setFinished(true)`:

```ts
if (i >= totalSteps) {
  setCompletedSteps(prev => new Set([...prev, currentIndex]));
  setElapsedSeconds(Math.round((Date.now() - cookStartRef.current) / 1000));
  setFinished(true);
  haptic([40, 40, 40]);
  return;
}
```

- [ ] **Step 3: Commit**

```bash
git add components/recipes/CookMode.tsx app/globals.css
git commit -m "feat(motion): add gold sweep + haptic on cook completion"
```

---

## Phase 7 — Typographic finish

### Task 7.1: OpenType features across font stacks

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Find font-family declarations**

Grep: `grep -n "font-family\|font-display\|font-body\|font-label" app/globals.css`

- [ ] **Step 2: Add font-feature-settings blocks**

Near the top, after brand tokens, add:

```css
/* ── Typographic finish ─────────────────────────────────────────────────────── */
.font-body {
  font-feature-settings: 'kern' 1, 'liga' 1, 'dlig' 1, 'onum' 1, 'ss01' 1;
  text-wrap: pretty;
  max-width: 68ch;
}
.font-display {
  font-feature-settings: 'palt' 1, 'kern' 1, 'pkna' 1;
  text-wrap: balance;
}
.font-label {
  font-feature-settings: 'kern' 1, 'ss01' 1;
}
.tabular-nums, [data-numeric] {
  font-variant-numeric: tabular-nums;
}
h1, h2, h3, h4 { text-wrap: balance; }
p { text-wrap: pretty; }
```

Scope `dlig` off for recipe title h1 and ingredient names specifically:

```css
h1.recipe-title,
.ingredient-name {
  font-feature-settings: 'kern' 1, 'liga' 1;
}
```

- [ ] **Step 3: Tag relevant elements**

In `components/recipes/RecipeDetailClient.tsx`, add `className="recipe-title ..."` to the main `<h1>`.
In `components/recipes/CookMode.tsx` and `components/recipes/RecipeDetailClient.tsx`, ensure ingredient spans have `className="ingredient-name ..."`.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css components/recipes/RecipeDetailClient.tsx components/recipes/CookMode.tsx
git commit -m "feat(type): enable OpenType features + text-wrap balance/pretty"
```

### Task 7.2: Tabular numerics for macros + timer + servings

**Files:**
- Modify: `components/MacrosCard.tsx`, `components/recipes/CookMode.tsx`, `components/recipes/RecipeDetailClient.tsx`

- [ ] **Step 1: Audit numeric spans**

Ensure all numeric displays have `font-variant-numeric: tabular-nums` either via inline style, Tailwind `tabular-nums` class, or the `[data-numeric]` attribute.

Specific targets:
- MacrosCard: kcal `<p>` line 127, gram values line 137-142, matched count line 149.
- CookMode: timer displays (already `tabular-nums`), step-of label.
- RecipeDetailClient: servings number, scaled ingredient amounts, cook/prep time.

For each, append `tabular-nums` to the className or add `data-numeric` attribute.

- [ ] **Step 2: Commit**

```bash
git add components/
git commit -m "feat(type): tabular-nums on all numeric displays"
```

---

## Phase 8 — Delight layer

### Task 8.1: Ink-brush empty state

**Files:**
- Create: `components/motion/InkBrush.tsx`
- Modify: `app/(app)/recipes/page.tsx` or `components/recipes/RecipeListClient.tsx` empty state branch

- [ ] **Step 1: Add ink-brush keyframe**

In `@layer utilities`:

```css
  @keyframes ink-brush {
    from { stroke-dashoffset: 240; opacity: 0.3; }
    to   { stroke-dashoffset: 0;   opacity: 1; }
  }
  .animate-ink-brush path {
    stroke-dasharray: 240;
    stroke-dashoffset: 240;
    animation: ink-brush 600ms var(--ease-out-expo) forwards;
  }
```

- [ ] **Step 2: Implement component**

```tsx
// Renders a single ink-brush horizontal stroke that draws on mount, then
// stays static. Used in the empty-recipes state as a calligraphic touch —
// no cartoon mascot, no illustration.
export default function InkBrush({ size = 160 }: { size?: number }) {
  return (
    <svg
      width={size} height={size / 4} viewBox="0 0 160 40" aria-hidden="true"
      className="animate-ink-brush"
    >
      <path
        d="M10 24 C 40 10, 90 32, 150 18"
        fill="none"
        stroke="var(--color-terracotta)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
```

- [ ] **Step 3: Wire into empty state**

In RecipeListClient.tsx empty branch (where `filtered.length === 0 && !hasFilters`), render InkBrush above the headline. But this component's empty branch only shows for filtered-empty — pure-no-recipes empty state lives elsewhere. Find it: `grep -rn "nothingHere\|no recipes" app components`.

Based on existing pattern, put InkBrush in the no-recipes branch (likely in `app/(app)/recipes/page.tsx`).

- [ ] **Step 4: Commit**

```bash
git add components/motion/InkBrush.tsx app/\(app\)/recipes/page.tsx app/globals.css
git commit -m "feat(motion): add ink-brush empty-state delight"
```

### Task 8.2: First-save underline flag

**Files:**
- Supabase migration: `supabase/migrations/<timestamp>_add_first_recipe_celebrated_at.sql`
- Modify: `components/recipes/RecipeDetailClient.tsx`

- [ ] **Step 1: Add migration for profile column (optional persistence)**

Skip persistence for now — use `localStorage` key `sekai_first_recipe_celebrated` to keep this feature zero-backend. This avoids migration + RLS churn.

- [ ] **Step 2: Add first-save underline logic**

In RecipeDetailClient.tsx, after fetching `recipe`, add:

```tsx
const [celebrate, setCelebrate] = useState(false);
useEffect(() => {
  if (typeof window === 'undefined') return;
  if (!localStorage.getItem('sekai_first_recipe_celebrated')) {
    localStorage.setItem('sekai_first_recipe_celebrated', '1');
    setCelebrate(true);
    const id = setTimeout(() => setCelebrate(false), 2500);
    return () => clearTimeout(id);
  }
}, []);
```

Apply to title: append `{celebrate && <span className="first-save-underline" aria-hidden="true" />}` under the `<h1>`.

Add CSS rule:

```css
  @keyframes underline-draw {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  .first-save-underline {
    display: block;
    height: 2px;
    background: var(--color-gold);
    transform-origin: left;
    animation: underline-draw 700ms var(--ease-out-expo) forwards;
    margin-top: 4px;
    max-width: 5rem;
  }
```

- [ ] **Step 3: Commit**

```bash
git add components/recipes/RecipeDetailClient.tsx app/globals.css
git commit -m "feat(motion): add first-save gold underline delight"
```

### Task 8.3: Konami easter egg

**Files:**
- Create: `components/motion/KonamiEasterEgg.tsx`
- Modify: `app/(auth)/layout.tsx` to include it

- [ ] **Step 1: Implement**

```tsx
'use client';

import { useEffect, useState } from 'react';

const SEQUENCE = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];

// Hidden keyboard easter egg. Activates on the Konami sequence and reveals
// a Sakai lockup for 2s. Deliberately left undocumented for users to find.
export default function KonamiEasterEgg() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let buffer: string[] = [];
    function onKey(e: KeyboardEvent) {
      buffer.push(e.key);
      if (buffer.length > SEQUENCE.length) buffer = buffer.slice(-SEQUENCE.length);
      if (buffer.length === SEQUENCE.length && buffer.every((k, i) => k === SEQUENCE[i])) {
        setShow(true);
        buffer = [];
        setTimeout(() => setShow(false), 2000);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed', left: '50%', bottom: '10%', transform: 'translateX(-50%)',
        fontFamily: 'var(--font-display, serif)', color: 'var(--color-gold)',
        fontSize: '0.875rem', letterSpacing: '0.2em', textTransform: 'uppercase',
        opacity: 1, animation: 'fade-up 220ms ease-out both',
      }}
    >
      Sakai · Est. 2019
    </div>
  );
}
```

- [ ] **Step 2: Mount in auth layout**

In `app/(auth)/layout.tsx`, import and render `<KonamiEasterEgg />` once at the root level.

- [ ] **Step 3: Commit**

```bash
git add components/motion/KonamiEasterEgg.tsx app/\(auth\)/layout.tsx
git commit -m "feat(motion): add Konami easter egg on auth"
```

### Task 8.4: New Year kanji gild (seasonal touch)

**Files:**
- Modify: `components/motion/WordmarkStrokeIn.tsx`

- [ ] **Step 1: Add seasonal check**

In WordmarkStrokeIn, detect Dec 31 / Jan 1 (client timezone) and, when true, apply a subtle extra-gilded color to the kanji `世界` span:

```tsx
const isNewYear = (() => {
  if (typeof window === 'undefined') return false;
  const d = new Date();
  const m = d.getMonth(); const day = d.getDate();
  return (m === 11 && day === 31) || (m === 0 && day === 1);
})();
```

Apply conditionally:

```tsx
<span
  className="font-display"
  style={{
    fontSize: '0.875rem',
    color: isNewYear ? 'oklch(90% 0.12 85)' : 'var(--text-3)',
  }}
>
  世界
</span>
```

- [ ] **Step 2: Commit**

```bash
git add components/motion/WordmarkStrokeIn.tsx
git commit -m "feat(motion): add New Year seasonal kanji gild"
```

---

## Phase 9 — Verification + test gate

### Task 9.1: Run full jest suite

- [ ] **Step 1: Run**

```bash
npx jest
```

Expected: all green (91 existing + new motion tests).

### Task 9.2: Run full Playwright suite (desktop)

- [ ] **Step 1: Run**

```bash
npx playwright test --project='Desktop Chrome' --project='Auth (Desktop Chrome)'
```

Expected: all green. Fix any regressions introduced by motion changes — most likely suspects: view-transition timing may break `waitForURL`, mobile chip :active tests may need selectors updated.

### Task 9.3: Run full Playwright suite (mobile)

- [ ] **Step 1: Run**

```bash
npx playwright test --project='Mobile Safari' --project='Mobile Chrome' --project='Auth (Mobile Safari)'
```

Expected: all green.

### Task 9.4: Typecheck

- [ ] **Step 1: Run**

```bash
npx tsc --noEmit
```

Expected: zero errors.

### Task 9.5: Build

- [ ] **Step 1: Run**

```bash
npm run build
```

Expected: success.

### Task 9.6: Regenerate test gate baseline

- [ ] **Step 1: Run bootstrap**

```bash
npm run test:gate:bootstrap
```

This updates `.test-gate/baseline.json` with new counts (now 94+/94+ jest, still 28/28 playwright).

- [ ] **Step 2: Commit baseline**

```bash
git add .test-gate/baseline.json
git commit -m "test: rebaseline gate to include motion system tests"
```

### Task 9.7: Final pass — discard graphify churn, commit final polish if any

- [ ] **Step 1: Discard graphify churn if present**

```bash
git checkout -- graphify-out/
```

- [ ] **Step 2: Confirm branch is clean + ready**

```bash
git status
```

Expected: clean working tree.

---

## Self-review (inline)

**Spec coverage:** Signatures A+B ✓ (Phase 5, Phase 2), System layer ✓ (Phases 3-4 + 6), Typographic finish ✓ (Phase 7), Delight ✓ (Phase 8), A11y reduced-motion ✓ (Task 1.5), Perf budget (no new deps ✓, CSS-only ✓).

**Placeholders:** none. Task 8.1 Step 3 locates empty state by grep — that's a read action, not a placeholder.

**Type consistency:** `haptic`, `startViewTransition`, `supportsViewTransitions` all exported and used with matching signatures. Motion token names (`--motion-md`, `--ease-out-quart`, etc.) used consistently across CSS + TS.

**Scope check:** One implementation plan covers the whole motion system. Phases are isolated — each phase lands independently and can be reverted independently.

---

## Verification criteria

- Jest: all tests green (existing + new motion tests).
- Playwright: 28/28 green on Desktop Chrome + mobile projects.
- Build: `npm run build` clean.
- Typecheck: `npx tsc --noEmit` zero errors.
- Pre-commit gate passes after baseline regen.
- Reduced-motion: every new animation has a reduced-motion fallback (verified via Task 1.5 catch-all block + component-level gates where needed).
- Zero new npm dependencies (`package.json` unchanged).
