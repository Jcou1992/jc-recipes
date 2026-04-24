/**
 * lib/motion/tokens.ts
 *
 * Single source of truth for SEKAI's motion language. Everything motion-related
 * in the app imports from this file. Violations (magic numbers inline in TSX/CSS)
 * fail the QA gate via a grep check in the test-gate script.
 *
 * The public shape is intentionally narrow: durations, eases, springs, stagger
 * primitives, drag config, snap thresholds, haptic patterns. Component-specific
 * motion choreography composes these but does not extend the vocabulary.
 */

// ── Durations ─────────────────────────────────────────────────────────────────
// Timed bezier sequences only. Gesture-driven motion uses springs instead.
export const duration = {
  /** Hover, chip press — snappy micro-motion. */
  quick:  120,
  /** Primary-button press, scale-in, field flash — default "acknowledgment." */
  tap:    180,
  /** Cook step cut, shared-element segments — "something substantial shifted." */
  step:   260,
  /** Spring settling window before declaring rest — internal only. */
  settle: 420,
  /** Choreographed entrance cascade span (from first item to last). */
  story:  620,
  /** Detail page hero reveal, list → detail hand-off — "ceremony." */
  hero:   880,
} as const;

// ── Beziers ───────────────────────────────────────────────────────────────────
// Used only for time-deterministic sequences. No spring configuration uses these.
export const ease = {
  /** Default "out" for UI landings. Quartic. */
  outQuart:   [0.25, 1,    0.5,  1]    as const,
  /** Dramatic "out" for hero reveals. Exponential. */
  outExpo:    [0.16, 1,    0.3,  1]    as const,
  /** "In" for exits — creates the impression of acceleration/blur. */
  inExpo:     [0.7,  0,    0.84, 0]    as const,
  /** Hero transitions only — creates a shared-element ease that accelerates
   *  out of origin and decelerates into destination. */
  inOutExp:   [0.87, 0,    0.13, 1]    as const,
  /** Reserved — first-save celebration only. Slight overshoot (y1 > 1). */
  springKiss: [0.34, 1.22, 0.64, 1]    as const,
} as const;

// CSS-string helpers (for inline style / tailwind arbitrary values).
export const easeCss = {
  outQuart:   `cubic-bezier(${ease.outQuart.join(',')})`,
  outExpo:    `cubic-bezier(${ease.outExpo.join(',')})`,
  inExpo:     `cubic-bezier(${ease.inExpo.join(',')})`,
  inOutExp:   `cubic-bezier(${ease.inOutExp.join(',')})`,
  springKiss: `cubic-bezier(${ease.springKiss.join(',')})`,
} as const;

// ── Springs ───────────────────────────────────────────────────────────────────
// Every gesture-driven motion in SEKAI must pick one of these five. Anything
// else is rejected in code review.
//
// Shape matches framer-motion 12's `{ stiffness, damping, mass }` config and
// the in-repo `springEngine.animateSpring()` signature simultaneously.
export const spring = {
  /** Drag release, sheet snap, button press rebound. Fast, no overshoot. */
  snap:    { stiffness: 520, damping: 36, mass: 1.0 },
  /** Scaler dial, unit toggle, chip select. Deterministic, tactile. */
  stiff:   { stiffness: 380, damping: 30, mass: 1.0 },
  /** Ingredient cascade, modal enter, cover reveal. Humane, breathable. */
  gentle:  { stiffness: 220, damping: 28, mass: 1.1 },
  /** RESERVED — first-save celebration only. The one spot with overshoot. */
  wobbly:  { stiffness: 180, damping: 14, mass: 1.0 },
  /** Heavy surfaces (route-transition backdrop). Slow, weighted. */
  cushion: { stiffness: 140, damping: 24, mass: 1.3 },
} as const;

export type SpringName = keyof typeof spring;

// ── Stagger ───────────────────────────────────────────────────────────────────
export const stagger = {
  /** Card-level entrance stagger on list. */
  card:          60,
  /** Row-level entrance stagger (ingredients, steps). */
  row:           38,
  /** Compressed row stagger for cook mode (user is in-flow). */
  rowCompressed: 24,
} as const;

// ── Drag & snap ───────────────────────────────────────────────────────────────
export const drag = {
  /** How far momentum carries past release (framer-motion convention). */
  powerFactor:  0.6,
  /** Time constant (ms) until inertia decays below threshold. */
  timeConstant: 350,
  /** Pixels below which motion is considered settled. */
  restDelta:    0.5,
} as const;

export const snap = {
  /** Drag-to-reorder: snap to new slot when > 40% of row height traversed. */
  rowThreshold:  0.4,
  /** Cook-mode swipe: advance when > 72px horizontally OR */
  cookSwipePx:   72,
  /** ...velocity > 0.35 px/ms (short fast swipe still advances). */
  cookSwipeVx:   0.35,
} as const;

// ── Haptic patterns ───────────────────────────────────────────────────────────
// Passed directly to navigator.vibrate. iOS falls back to audio tones (see
// audio.ts); the pattern is still named so the *intent* is explicit.
export const haptic = {
  tick:    5                  as number,
  nudge:   10                 as number,
  snap:    12                 as number,
  confirm: [8, 20, 8]         as readonly number[],
  fail:    [30, 40, 30]       as readonly number[],
  hero:    [6, 14, 6, 14, 6]  as readonly number[],
} as const;

// ── react-spring vocabulary (legacy) ─────────────────────────────────────────
// If a future contributor prefers react-spring's `{ tension, friction, mass }`
// parameterisation, these are the equivalents. Provided for documentation —
// we don't ship react-spring.
export const springLegacy = {
  snap:    { tension: 520, friction: 36, mass: 1.0 },
  stiff:   { tension: 380, friction: 30, mass: 1.0 },
  gentle:  { tension: 220, friction: 28, mass: 1.1 },
  wobbly:  { tension: 180, friction: 14, mass: 1.0 },
  cushion: { tension: 140, friction: 24, mass: 1.3 },
} as const;
