# Team B — KINETIC-MOTION · Design Spec

The whole app is a **choreographed service**. Motion is not decoration — it is the primary information channel. Every state change tells the chef *what just happened, what's about to happen, and in what direction*. Where the baseline uses CSS transitions and timed bezier curves, this system introduces **velocity preservation, spring physics, shared-element continuity, and paired haptic/audio feedback** at every tactile point.

The principle: **the app should feel like the chef's own hand, not a screen they're tapping.**

---

## 1. Tokens

All colors stay OKLCH. Type stays Cormorant / Noto Serif JP / Barlow Condensed. Everything below is an *extension* of the existing token system; no brand rules are broken unless explicitly flagged.

### 1.1 Color (unchanged — baseline already strong)
```
--color-terracotta:          oklch(63.2% 0.148 45);
--color-terracotta-dark:     oklch(40%   0.145 44);
--color-terracotta-contrast: oklch(47%   0.16  45);
--color-gold:                oklch(86.5% 0.089 89);
--color-bone:                oklch(95.3% 0.014 85);
--color-ink:                 oklch(11%   0.004 285);
/* new — motion-reactive accents used only during transient motion states */
--motion-glow-warm:   oklch(72% 0.17  50 / 0.55);  /* scaler dial highlight at release */
--motion-glow-cool:   oklch(78% 0.08 180 / 0.35);  /* drag-snap confirmation ripple */
--motion-shadow-lift: 0 14px 48px oklch(0 0 0 / 0.58);
```

### 1.2 Type (unchanged families; add motion-aware modifiers)
```
--label-track-rest:  0.06em;  /* default Barlow tracking */
--label-track-hot:   0.03em;  /* tightens during active/pressed state */
--display-weight-rest: 500;
--display-weight-hot:  600;   /* engaged/dragged/focused */
```
Labels transition `letter-spacing` and `font-variation-settings: 'wght'` during hover/press — a Stripe-style micro-morph. `font-variation-settings` only fires when a variable-font axis is available; falls back silently otherwise.

### 1.3 Spacing & radii
```
--space-1: 4px;  --space-2: 8px;  --space-3: 12px;
--space-4: 16px; --space-5: 24px; --space-6: 32px;
--space-7: 48px; --space-8: 64px;

--r-xs: 4px;  --r-sm: 6px;  --r-md: 10px;  --r-lg: 16px;
--r-xl: 22px; --r-pill: 9999px;

/* Motion-tier shadow — applied while any element is in a "lifted" pose */
--shadow-drag:    0 24px 72px oklch(0 0 0 / 0.55), 0 0 0 1px oklch(100% 0 0 / 0.08);
--shadow-snap:    0 4px 18px  var(--motion-glow-warm);
```

### 1.4 Durations (renamed & extended from baseline)
The baseline has `--motion-xs…xl` (120–400ms). We keep those tokens intact and add the longer storytelling durations plus the per-gesture ones:

```
--t-quick:  120ms;   /* hover, chip press */
--t-tap:    180ms;   /* primary-button press, scale-in */
--t-step:   260ms;   /* cook-mode step advance, shared-element segments */
--t-settle: 420ms;   /* spring settling window */
--t-story:  620ms;   /* choreographed entrance cascade span */
--t-hero:   880ms;   /* detail-page hero reveal */
```

### 1.5 Easing (bezier — for timed sequences)
Springs are preferred for gestures; beziers are reserved for choreographed, time-deterministic sequences (cascades, field flashes, entrance reveals).
```
--ease-out-quart:  cubic-bezier(0.25, 1,    0.5,  1);    /* default out */
--ease-out-expo:   cubic-bezier(0.16, 1,    0.3,  1);    /* dramatic landings */
--ease-in-expo:    cubic-bezier(0.7, 0,     0.84, 0);    /* exits; feels like blur */
--ease-in-out-exp: cubic-bezier(0.87, 0,    0.13, 1);    /* rare — shared-element curves */
--ease-spring-kiss: cubic-bezier(0.34, 1.22, 0.64, 1);   /* slight overshoot: used once, on first-save */
```
Explicit ban: no `ease-bounce`, no `ease-elastic`, no bezier with a y1 > 1.25 anywhere except the *single* `ease-spring-kiss` allowed on the first-save celebration and the macros match dismiss.

### 1.6 Spring configurations (for gestures)
Every named spring gets a (stiffness, damping, mass) triple. These are the only spring configs allowed in the app.

| Name        | stiffness | damping | mass | Use                                             |
|-------------|-----------|---------|------|-------------------------------------------------|
| `snap`      | 520       | 36      | 1.0  | Drag-to-reorder release, sheet snap, button press |
| `stiff`     | 380       | 30      | 1.0  | Scaler dial, unit toggle, chip select           |
| `gentle`    | 220       | 28      | 1.1  | Ingredient cascade, modal enter, cover reveal   |
| `wobbly`    | 180       | 14      | 1.0  | **Reserved — first-save celebration only**      |
| `cushion`   | 140       | 24      | 1.3  | Heavy surfaces (route transition backdrop)      |

Velocity is always preserved across re-renders (framer-motion 12 `useMotionValue` / Motion One `spring()` with inherited initial velocity). No spring is allowed to re-initialize its velocity to 0 mid-gesture — this is the single most common motion bug and the one that separates premium from SaaS.

### 1.7 Inertia & snap
```
drag.powerFactor:  0.6        /* how far momentum carries past release */
drag.timeConstant: 350        /* ms until inertia decays to rest */
drag.restDelta:    0.5        /* px below which motion is considered settled */
snap.threshold:    0.28       /* fraction of rail below which item snaps back, above which it snaps forward */
```

---

## 2. Motion taxonomy — the named palette

Every component speaks in this vocabulary. A reviewer should be able to grep the codebase for `motion="plate"` and find every ingredient cascade in one place.

| Name            | Shape                                             | Duration    | Spring     | Easing                       | Sound        | Haptic         |
|-----------------|---------------------------------------------------|-------------|------------|------------------------------|--------------|----------------|
| **lift**        | Button press: scale 1→0.97, release to 1          | 120ms press, spring release | `stiff`      | –                            | –            | `tick` 5ms     |
| **hand-off**    | Shared element: card hero → detail hero (layoutId) | `--t-hero`  | `gentle`   | `--ease-in-out-exp`          | –            | –              |
| **service-in**  | Ingredient / step cascade: y:18 → 0, opacity 0 → 1, 38ms stagger, 240ms per item | span `--t-story` | `gentle` | `--ease-out-quart` | 'start' tone @ first item | `nudge` 8ms on first item |
| **plate**       | Recipe card entrance on list: y:24→0, scale:0.98→1, 60ms stagger, featured card starts at t=0 and scales from 0.94 | `--t-step` per card | `gentle` | `--ease-out-expo` | – | – |
| **reduce**      | Exit: y:0 → −10, opacity 1→0, fast, no stagger | 180ms | – | `--ease-in-expo` | – | – |
| **cut**         | Cook-mode step change: outgoing accelerates off, incoming decelerates on, direction from gesture velocity | 200ms out + 240ms in (overlapping 60ms) | – | `--ease-in-expo` out, `--ease-out-expo` in | 'advance' 784Hz 40ms | `snap` 12ms |
| **detent**      | Scaler dial integer cross: micro-rotate ±1° ticked into spring rest position | 90ms | `stiff` | – | 40Hz tock 12ms | `tick` 6ms |
| **settle**      | Drag release: spring to nearest rest with preserved velocity | variable | `snap` | – | soft 'tock' on settle | `snap` 10ms |
| **flash**       | Field focus, first-save underline: gold 2px ring pulse | `--t-step` | – | `--ease-out-quart` | – | – |
| **veil**        | Modal backdrop: opacity 0→0.5, origin at click point, scale from 0.86 | `--t-tap` | `gentle` | `--ease-out-quart` | – | – |
| **banner**      | Toast: y:40→0, opacity 0→1, bezier enter, spring-assisted exit | `--t-step` | `gentle` | `--ease-out-expo` | – | – |
| **strike**      | First-save wordmark + underline: 2-beat stroke reveal | `--t-hero` | – | `--ease-spring-kiss` | 'confirm' C#5+G5 dyad 160ms | `confirm` [8,20,8] |

**Composition rules:**
- `service-in` always follows `hand-off` on detail page arrival (hero lands first, then ingredients cascade)
- `cut` is *never* paired with a fade — it's a cut by definition
- Exactly one `strike` per session (first save only). After that, successful saves use `banner`.
- `detent` never fires below 60fps — if the main thread is heavy, it's dropped silently (motion > haptic > sound in priority; if we can't do all three in one frame, we drop the sound first, then the haptic, never the motion)

---

## 3. Physics system

All springs use the continuous form with preserved velocity:
```
x''(t) = −(stiffness/mass) · (x − xRest) − (damping/mass) · x'
```

Implementation: `framer-motion` v12 `useSpring(sourceMotionValue, springConfig)` when the driver is another motion value (scaler dial, drag); `Motion.animate(el, { prop: to }, { type: 'spring', ...config })` for one-shot fires. Both pick up from the element's current state, including any in-flight animation's velocity.

**Snap thresholds:**
- Drag-to-reorder ingredient row: snap to new index when dragged ≥ 40% of row height
- Cook-mode swipe: advance step when `|dx| > 72px` OR `|vx| > 0.35 px/ms` (velocity-first — a fast short swipe still advances)
- Filter sheet: snap to nearest of `[0%, 50%, 100%]` opened positions, weighted by release velocity

**Rest detection:** any spring is considered at rest when `|x − xRest| < 0.5px && |x'| < 0.02px/ms` for 2 consecutive frames.

**Damping ceiling:** no spring in production is allowed `damping < 12` except `wobbly` (14, used once). This prevents the "Slack springy modal" look universally; a ζ below that trends toward "toy."

---

## 4. Haptic + sound spec

Two channels, always paired; either channel may be absent, but they are never mismatched in timing.

### 4.1 Haptic tokens (`lib/motion/haptic.ts` — extends existing file)
| Token      | Pattern (ms)    | Use                                            |
|------------|-----------------|------------------------------------------------|
| `tick`     | `5`             | Scaler integer cross, button press, chip select|
| `nudge`    | `10`            | First cascade item, ingredient check           |
| `snap`     | `12`            | Drag release settle, cook-mode step advance    |
| `confirm`  | `[8, 20, 8]`    | First-save, cook-mode finish                   |
| `fail`     | `[30, 40, 30]`  | Validation error, save failure                 |
| `hero`     | `[6, 14, 6, 14, 6]` | Once per session on login land             |

`navigator.vibrate` is honoured on Android and is silently no-op on iOS. Hence **every haptic also triggers a paired audio tick** on iOS via a pre-warmed `AudioContext`.

### 4.2 Audio tokens (Web Audio, procedurally generated — no files)
All use a single-oscillator `OscillatorNode` routed through a `GainNode` with an ADSR envelope. No sample files ship.

| Token       | Freq (Hz) | Wave  | Dur   | Envelope              | Use                              |
|-------------|-----------|-------|-------|-----------------------|----------------------------------|
| `tock`      | 40        | sine  | 12ms  | 0-2-8-2               | Scaler detent, drag snap         |
| `start`     | 554 (C#5) | sine  | 80ms  | 0-18-32-30            | Cook-mode step begin, cascade 1st|
| `advance`   | 784 (G5)  | sine  | 60ms  | 0-10-22-28            | Cook-mode step change            |
| `complete`  | 932 (A#5) | triangle | 220ms | 0-30-100-90        | Cook-mode finish                 |
| `confirm`   | 554+784 (dyad) | sine | 160ms | 0-25-60-75          | First-save, successful save      |
| `fail`      | 220 (A3)  | sawtooth| 140ms| 0-12-30-98            | Validation error                 |

AudioContext is created lazily on first user gesture and reused for the session. All sounds respect a global `prefersReducedMotion || userPrefs.soundOff` gate.

### 4.3 Event → pair table (abridged)
| Event                           | Motion       | Haptic    | Sound      |
|---------------------------------|--------------|-----------|------------|
| Primary button press            | `lift`       | `tick`    | —          |
| Scaler +/− tap                  | `detent`     | `tick`    | `tock`     |
| Scaler dial integer cross       | `detent`     | `tick`    | `tock`     |
| Ingredient check (cook or detail) | `flash`    | `nudge`   | —          |
| Cook-mode next step (swipe)     | `cut` (R→L)  | `snap`    | `advance`  |
| Cook-mode next step (tap)       | `cut` (R→L)  | `snap`    | `advance`  |
| Cook-mode finish                | `strike`     | `confirm` | `complete` |
| Recipe card → detail            | `hand-off`   | —         | —          |
| First-save celebration (1× session) | `strike` | `confirm` | `confirm`  |
| Validation error on save        | `flash` (red)| `fail`    | `fail`     |
| List render on load             | `plate`      | —         | —          |
| Detail page ingredient list     | `service-in` | `nudge` (1st only) | `start` (1st only) |
| Timer complete                  | `flash`      | `confirm` | `complete` |

---

## 5. Component rules — per-state behaviour

### 5.1 Button (primary / ghost / danger)
- **rest**: static
- **hover (hover-capable pointers only)**: border color + 1px translate-y up, 120ms bezier
- **press**: `lift` — scale to 0.97 on pointerdown, spring back on pointerup (`stiff`)
- **disabled**: opacity 0.4, no motion allowed, pointer-events none
- Sound/haptic: `tick` on tap fires at pointerdown (not pointerup) so it feels like hitting a key, not confirming one

### 5.2 Input field
- **focus**: border + ring animate in 180ms bezier, label tightens tracking (`--label-track-rest` → `--label-track-hot`) and ticks weight up, 160ms bezier
- **blur valid**: label relaxes back over 220ms
- **blur invalid**: `flash` in terracotta (not gold), `fail` haptic, `fail` sound
- No layout shift — the label is positioned with absolute transform, never takes flow

### 5.3 Recipe card (list)
- **entry**: `plate` staggered by index
- **hover**: y:0 → −4, scale:1 → 1.01, shadow lift, 200ms bezier
- **press**: `lift`
- **exit (tap → detail)**: `hand-off` with three `layoutId`s — `hero-${id}` (cover), `title-${id}`, `tag-${id}-0` (first tag only)
- **bulk-select toggled on**: card shifts its checkbox in from left with a 180ms spring (`stiff`), card itself stays put

### 5.4 Scaler dial — the hero component
- **rest**: circular dial, integer value centered, ring gauge showing 1× at 12 o'clock
- **pointer-drag** (horizontal or rotational): dial rotates with pointer, `stiff` spring lagging ~15ms so there's a sense of material weight
- **integer cross**: `detent` — dial snaps slightly into the new integer (2° back-then-forward), haptic `tick`, sound `tock`
- **release**: if between integers, springs to nearest with `snap` config; settling fires final `tock`
- **quick +/− tap**: buttons increment/decrement one integer with `detent` motion (no drag)
- **reset tap**: spring back to recipe's native servings via `stiff`; 3 detents cross → 3 ticks (**yes, audibly**)

### 5.5 Ingredient row (detail page)
- **entry**: `service-in` cascade
- **scale up/down** (when scaler changes): each row's number crossfades in place, 160ms; the dot at the left expands briefly (scale 1 → 1.35 → 1, 220ms bezier) so the eye catches which rows updated most
- **tap to check (mise-en-place — new feature)**: ring ripple + line-through stroke draws L→R in 260ms; haptic `nudge`
- **long-press**: enters reorder mode on edit shell

### 5.6 Cook-mode step
- **advance**: `cut` — direction from swipe velocity or button direction
- **step body**: `service-in` for ingredient list, but compressed (24ms stagger, 180ms per) because the user's in-flow
- **timer ring**: circular progress with radial fill that springs in from 0 when started (`stiff`, 220ms); the dial itself rotates with the countdown at constant angular velocity
- **finish**: `strike` + `complete` sound + `confirm` haptic; wordmark painted on screen L→R one stroke

### 5.7 Toast
- **enter**: `banner` (spring-assisted y from below)
- **exit (auto)**: fade + 6px y-drop, 220ms
- **exit (swipe-dismiss)**: `settle` — velocity-preserved fling off-screen

### 5.8 Modal (confirm, macros match)
- **enter**: `veil` with transform-origin at click point (captured from the triggering event)
- **exit**: reverse + 140ms
- **backdrop click**: same exit + tiny scale-down on the panel so the cause is legible

### 5.9 Tag chip / sort pill
- **select**: chip background color animates in 160ms; stroke ring draws L→R 220ms as confirmation
- **deselect**: reverse
- **drag (mobile tag rail)**: horizontal scroll with inertia; at ends, rubber-band (translateX clamped to ±20px, spring back with `snap`)

---

## 6. Three killer moments

### Moment 1 — Hand-off (list → detail)
User taps a recipe card. In the same frame:
1. All *other* cards fade + drop with `reduce` (staggered 30ms, they go first and get out of the way)
2. The tapped card's cover image, title, and first tag each have a `layoutId` that matches a detail-page target. Framer-motion reconciles — those three DOM elements *physically travel* (position + size) from grid cell to detail-hero over 880ms with `--ease-in-out-exp`
3. The detail page's ingredient list, macros card, and service bar slide up from below (y:40 → 0) starting at 340ms, with `service-in` cascade overlapping the hero's final 200ms

Result: the recipe *opens* like a menu card being slid from the pass onto the table. There's no route change visible — continuity of space.

### Moment 2 — Scaler dial with detents
The `+`/`−` buttons remain for precision. Added: a circular dial surrounding the servings number. The chef drags the dial clockwise/counter-clockwise with their thumb (even with slight hand tremor — the spring smooths it). Each integer crossing:
- 6ms `tick` haptic
- 12ms 40Hz `tock` audio
- Dial micro-overshoots 2° past the integer then springs back (`stiff`)
- Number crossfade (existing 160ms) becomes a 90ms pop (`service-in` scale 0.96 → 1)
- Ingredient amounts simultaneously recompute and each one's dot pulses (row 1 then 2 then 3… with 20ms stagger) — visually the whole list *breathes* with the dial

Release: if between integers, springs to nearest with preserved velocity. Chef feels the weight of the dial.

### Moment 3 — Cook-mode step advance as a film cut
User in cook mode. Swipes right (toward next step):
1. Pointer captures `vx` at release
2. Outgoing step animates off-screen to the left with `transform: translateX(-48px)`, `opacity: 1 → 0`, `filter: blur(0 → 3px)` — 200ms `--ease-in-expo`. The blur *implies* motion blur without needing a shader.
3. Incoming step enters from the right (`translateX(48px → 0)`, `opacity: 0 → 1`, *no blur*) over 240ms `--ease-out-expo`, starting 60ms before the outgoing finishes (so they overlap — a cross-cut, not a wipe)
4. `snap` haptic fires at t=0 (pre-announcement, so the hand feels the decision before the eye sees the result — 30ms lead)
5. `advance` 784Hz 60ms sound fires at t=30ms
6. The ingredient list inside the new step does `service-in` compressed (24ms stagger) starting at t=120ms
7. If the user tapped "Next" instead of swiping, direction defaults to right-to-left (forward), same timing; if they tapped "Back", direction reverses, `advance` sound drops a third to D5 (587Hz) as a semantic cue

The chef's hand and the step move together. There's no cross-fade limbo — at every moment, *exactly one step* owns the frame, but the transition between them has the cadence of a cinematic cut, not a wipe.

---

## 7. Reduced-motion fallbacks

Every motion token has a `reduce` variant:

| Motion name  | Reduced form                       |
|--------------|------------------------------------|
| `lift`       | static (no scale)                  |
| `hand-off`   | 180ms cross-fade, no layout animation |
| `service-in` | single 180ms fade on the group     |
| `plate`      | single 180ms fade on the group     |
| `cut`        | 120ms cross-fade                   |
| `detent`     | number updates instantly, no rotation, no detent sound |
| `settle`     | instant snap                       |
| `strike`     | final state only, no stroke reveal |
| `flash`      | ring appears and disappears with no bezier (stepwise) |
| `veil`       | instant fade, no transform-origin dance |

Haptics respect `prefers-reduced-motion` — when reduced, haptics are also suppressed (they share the "peripheral sensory" channel). Sound respects a separate `userPrefs.soundOff` toggle that defaults to `off` on first visit.

---

## 8. Tokens file shape (summary)

A single `lib/motion/tokens.ts` exports:
```ts
export const duration = { quick, tap, step, settle, story, hero };
export const ease = { outQuart, outExpo, inExpo, inOutExp, springKiss };
export const spring = { snap, stiff, gentle, wobbly, cushion };
export const stagger = { card: 60, row: 38, rowCompressed: 24 };
export const drag = { powerFactor: 0.6, timeConstant: 350, restDelta: 0.5 };
export const snap = { rowThreshold: 0.4, cookSwipePx: 72, cookSwipeVx: 0.35 };
export const haptic = { tick: 5, nudge: 10, snap: 12, confirm: [8,20,8], fail: [30,40,30], hero: [6,14,6,14,6] };
```

Motion never uses a raw number outside this file.
