# Motion & Visual Elevation System — Design Spec

- **Date:** 2026-04-23
- **Branch target:** TBD (separate feature branch, not folded into F1/F2/F3)
- **Status:** Draft for user review

## 1. Goal

Elevate SEKAI 世界 from a competent recipe tool into an interface a user meets with "wow." Deliver a love-at-first-sight reaction on first open, and a sustained "this feels premium" reaction on every subsequent use, without violating the brand's mise-en-place principles. The wow comes from motion as **craft**, not decoration.

## 2. Non-goals

- Not a rewrite of any existing feature. Pure additive motion / typographic / state polish over Phase 1–3.
- Not a WebGL hero shader, particle system, 3D card tilt, animated dish spin, confetti, gradient-text flourish, cursor trail, or any AI-tech-demo visual. These were explicitly rejected by the `impeccable` / `animate` / `overdrive` / `delight` skill consultation as out-of-brand and AI-slop-adjacent.
- Not a new animation library dependency. Everything ships via CSS, the View Transitions API, SVG, `@property`, `animation-timeline: scroll()`, `navigator.vibrate()`, and existing Tailwind 4 tokens. Zero new `package.json` dependencies.
- Not a redesign of palette, typography families, or component layout. The existing terracotta / gold / ink palette and Cormorant / Noto Serif JP / Barlow Condensed typography are kept verbatim and polished.

## 3. Design principles (inherited, motion-specific lens)

1. **Every motion earns its place.** If removing a transition would not be noticed, remove it. Motion conveys state change, teaches spatial relationship, or provides feedback — nothing else.
2. **Legibility under pressure trumps expressiveness.** Cook mode is monastic. Kitchen surfaces never animate in ways that could confuse mid-service.
3. **Polish over reinvention.** Brand is right. Motion is the finish.
4. **Worthy of the name.** If Sakai ever appears in the UI, every transition should belong in a Michelin-grade dining room's digital surface.
5. **Speed first.** Optimistic UI continues; motion wraps feedback rather than delaying it. Exit durations at ~75% of enter.

## 4. Signature moments

Two hero moments carry the "love at first sight" weight. Everything else is system layer.

### 4.1 Signature A — Shared-element recipe card → detail morph

**The wow.** Tap any recipe card in `/recipes` → the card's cover image and title **morph** into the detail hero. Cover grows to hero size, title slides to its detail position, surrounding chrome crossfades. Back navigation reverses.

**Technique:** View Transitions API (`document.startViewTransition`) with `view-transition-name` on the cover `<img>` and title `<h1>`. Same-document transitions in Next 15 App Router via a vendored ~50-line wrapper that intercepts Link navigation, awaits the route transition, and wraps the DOM swap in `startViewTransition`. Zero new npm dependencies. Native React support can replace the vendored wrapper later with no API change.

**Duration:** 320ms in, 240ms out. Easing `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out-quint).

**Why it wins:** Browser-native, GPU-composited, 60fps on mid-range Android. Chrome 111+ / Edge / Safari 18 support; Firefox falls back to a clean crossfade via `@supports`. Teaches spatial continuity — the thing you touched becomes the next thing. This is the motion language of Linear, Arc, and Apple — not dribbble AI-slop.

**Fallback:** Without support, crossfade-only page transition at 220ms.

### 4.2 Signature B — SEKAI 世界 wordmark stroke-in

**The brand moment.** On auth → home route transition, once per browser session, the `SEKAI 世界` wordmark draws in via SVG path `stroke-dashoffset` animation. Roman letters stroke in left-to-right; kanji 世界 strokes in kanji-stroke-order one radical at a time.

**Duration:** 850ms total, ease-out-expo. Letters stagger 60ms; each kanji stroke 120ms.

**Persistence:** `sessionStorage` flag `sekai_wordmark_played`. Plays at most once per session. Never re-plays on back navigation, refresh within same session, or internal routing.

**Why:** Calligraphy metaphor (ink brush) maps the Japanese half of the name to a brand-appropriate visual gesture. Not a "logo reveal" (AI-slop pattern). Functions as a subtle flex of craft — a chef's equivalent of watching a knife roll up before service.

**Fallback:** Reduced-motion → wordmark appears instantly at final state.

## 5. System layer (always-on, disciplined)

Every transition below is in the <350ms band, uses `transform` / `opacity` / `clip-path` / registered custom properties only, and maps to a real state change. None decorate.

| Surface | Trigger | Motion | Duration | Easing |
|---|---|---|---|---|
| `/recipes` grid | Initial mount | Stagger fade + 4px translateY rise. Cap first 12 cards. | 300ms per card, 80ms offset | ease-out-quart |
| `/recipes` search | `input` event | Matching card titles pulse a gold underscore across the grid. Non-matches fade to 60% opacity. | 200ms | ease-out-quart |
| Recipe detail cover | Scroll | Parallax translateY 0→-12px tied to `animation-timeline: scroll()`. Ingredients-list mask-image reveals from top on viewport enter. | Tied to scroll position | linear (scroll-driven) |
| Macros bar (`MacrosCard`) | Initial render or value change | `@property` registered `--macro-protein`, `--macro-carb`, `--macro-fat` (percent + OKLCH color). Bar widths and hues interpolate from previous to new. Numeric count-up ticks via `CSS counter` + `Intl.NumberFormat` animation. | 400ms | ease-out-quint |
| Ingredient checkbox (cook mode + detail) | `change` | Gold OKLCH ring ripple originating at checkbox center, `transform: scale(0) → scale(1)` + opacity 1 → 0. Haptic `navigator.vibrate(10)` on mobile. Line-through applied to ingredient text with `clip-path` wipe L→R. | 300ms ring, 260ms wipe | ease-out-quart |
| Save action (form fields + recipe save) | Action success | Single gold border flash on saved field: `border-color` 0 → gold → transparent, no toast shake. | 120ms in, 200ms out | linear |
| Unsaved-changes modal | Open | Morph from the "Save" button via View Transitions — button becomes modal. | 260ms | ease-out-quint |
| Cook mode step advance | `Next step` tap | Old step `translateX(0 → -16px)` + opacity 1 → 0. New step `translateX(16px → 0)` + opacity 0 → 1. Progress arc sweeps by one step. Haptic `vibrate(8)`. | 260ms | ease-out-quart |
| Cook mode timer ring | Timer running | `opacity` sine 0.92 → 1.0 → 0.92 over 4s, pauses at 0. Breath metaphor. | 4s loop | ease-in-out (sine) |
| Cook mode timer complete | Timer hits 0 | Ring flashes gold (1 cycle, 400ms) + `navigator.vibrate([80, 40, 80])`. No sound without opt-in. | 400ms + haptic | ease-out-quart |
| Tag filter chip | Toggle | Chip `background-color` wipe L→R via `clip-path`, subtle scale 1 → 0.96 → 1. | 180ms | ease-out-quart |
| Copy-to-clipboard button | Click success | Gold shimmer wipe via `background-position` animation on a registered gradient `@property`. "Copied" label crossfade. | 350ms | ease-out-quint |
| Route transition (non-shared-element pairs) | Any App Router push | View Transitions crossfade. | 220ms | ease-out-quart |
| Toast entry | Render | `translateY(8px → 0)` + opacity 0 → 1, stacked offset. | 220ms | ease-out-quart |
| Unit conversion toggle | Toggle | Affected numbers crossfade: old fades out 120ms, new fades in 160ms, delay 40ms between. | 320ms total | ease-out-quart |
| Serving scaler | Slider / input change | Ingredient numbers and macros tick to new values via `@property` interpolation. | 280ms | ease-out-quint |
| Cooking Mode entry | Tap "Cook" | Detail page `scale(1 → 0.96)` + opacity → 0 while cook view `scale(1.04 → 1)` + opacity 0 → 1. Sense of "going into" the recipe. | 360ms | ease-out-expo |

## 6. Typographic finish (motionless, but part of the wow)

| Element | Feature | Value |
|---|---|---|
| All `Noto Serif JP` usage | `font-feature-settings` | `'palt', 'kern', 'pkna'` (proportional kana + kerning) |
| All `Cormorant Garamond` body copy | `font-feature-settings` | `'kern', 'liga', 'dlig', 'onum', 'ss01'` (kerning, standard + discretionary ligatures, oldstyle numerals, stylistic set 1) |
| All numeric displays (macros, servings, timer) | `font-variant-numeric` | `tabular-nums` (prevents digits from shifting width during count-up) |
| All `Barlow Condensed` labels | `font-feature-settings` | `'kern', 'ss01'`; `letter-spacing: 0.04em`; `text-transform: uppercase` for short labels only |
| Headings | `text-wrap` | `balance` |
| Body paragraphs | `text-wrap` | `pretty` |
| Body paragraphs | `max-width` | `68ch` |

Rationale: the brand asks for restaurant-grade finish. Half of "premium" in a serif-driven UI is typographic features most apps never switch on. Zero runtime cost.

## 7. Delight layer (rare, brand-appropriate)

| Moment | Delight | Constraint |
|---|---|---|
| Empty-state `/recipes` | Single ink-brush SVG stroke draws on mount (`stroke-dashoffset` 0.6s, ease-out-expo), then static. Below it: one specific line — "Your line starts here." No cartoon mascot, no illustration. | One-time per empty visit. Reduced-motion → static final state. |
| First-ever saved recipe | Gold underline draws beneath the recipe title on detail view. Once. Persisted via `profiles.first_recipe_celebrated_at`. | No confetti, no sparkle, no modal. |
| Cook mode session complete (all steps done) | Gold hairline sweeps across the step progress bar L→R. Haptic `vibrate([40,40,40])`. | 500ms. One-time per cook session. |
| Easter egg | Konami code (↑↑↓↓←→←→BA) on auth page reveals "Sakai — Est. [year]" lockup under the wordmark for 2s, then fades. | Never logged, never persisted. Pure hidden gem. |
| Seasonal touch (Dec 31 / Jan 1 only) | One stroke of the 界 kanji in the wordmark renders in extra-gilded gold (`oklch(from var(--sekai-gold) calc(l + 0.08) c h)`). | Detected by client-side `Date`, no server component. No other seasonal themes. |

Explicitly rejected delights (AI-slop or off-brand): confetti on save, floating particles, emoji reactions, streak counters, badges, animated mascots, cute loading messages, playful error copy ("Oops!"), themed icons per month.

## 8. Accessibility

Respected absolutely. Every animation in §4 / §5 has a reduced-motion path:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  [data-motion-optional] {
    animation: none !important;
    transition: none !important;
  }
}
```

Specifically:
- Signature A (view transition) → CSS fallback crossfade at 10ms.
- Signature B (wordmark stroke-in) → final-state SVG shown instantly.
- Cook-mode timer ring breath → static 1.0 opacity.
- Scroll-driven cover parallax → disabled entirely (translateY 0).
- Macros `@property` color interp → jumps to end state.
- Haptics continue to fire — `navigator.vibrate()` is not motion; a user can mute at OS level.

Focus rings are never animated away; all focus states remain on focus regardless of motion preferences.

## 9. Performance budget

| Device | Target |
|---|---|
| iPhone 13 (JC's likely phone) | 60fps on all surfaces, no frame drop on list stagger with 24 cards |
| Mid-range Android (Pixel 5a equivalent) | ≥ 55fps on list stagger, ≥ 58fps cook mode |
| Reduced-motion session | 0 transitions, 0 scroll listeners |
| Cook mode mobile thermal | Timer ring is the only always-on animation. Others fire on interaction. |
| Bundle delta | 0 new JS dependencies. ≤ 8 kb added CSS (gzipped). ≤ 2 kb added SVG (wordmark path). |

Verification path: Chrome DevTools Performance panel on emulated mid-range mobile, target 60fps during typical session (open app → browse list → enter recipe → enter cook mode → check 5 ingredients → advance 3 steps → complete). Any dropped frame > 16.7ms on a non-cold-start interaction = spec fails and motion is reduced.

## 10. Architecture

### 10.1 File layout

```
app/
  globals.css                              # @property registrations, @keyframes, ease tokens
  (app)/
    layout.tsx                             # wordmark stroke-in session gate + view-transition root
components/
  ui/
    WordmarkStrokeIn.tsx                   # signature B
    MacrosCard.tsx                         # existing — extended with @property interp
    IngredientCheckbox.tsx                 # new: ripple + line-through wipe + haptic
    TagFilterChip.tsx                      # existing — motion added
    CopyButton.tsx                         # existing — shimmer added
    ToastHost.tsx                          # existing — entry tweaked
  motion/
    ViewTransitionLink.tsx                 # thin Link wrapper invoking document.startViewTransition
    ScrollParallaxCover.tsx                # animation-timeline: scroll() wrapper
    FieldFlash.tsx                         # save-success gold border flash
lib/
  motion/
    tokens.ts                              # duration / easing / stagger constants
    haptic.ts                              # navigator.vibrate wrapper + feature-detect
```

### 10.2 CSS tokens (added to `globals.css`)

```css
:root {
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1);

  --motion-xs: 120ms;
  --motion-sm: 180ms;
  --motion-md: 260ms;
  --motion-lg: 320ms;
  --motion-xl: 400ms;

  --stagger-card: 80ms;
  --stagger-stroke: 60ms;
}

@property --macro-protein { syntax: "<percentage>"; initial-value: 0%; inherits: false; }
@property --macro-carb    { syntax: "<percentage>"; initial-value: 0%; inherits: false; }
@property --macro-fat     { syntax: "<percentage>"; initial-value: 0%; inherits: false; }
@property --macro-hue     { syntax: "<angle>";      initial-value: 40deg; inherits: false; }
```

### 10.3 View Transitions integration

Wrap App Router navigation in a helper that calls `document.startViewTransition` when available, falls back to immediate navigation otherwise. Set `view-transition-name` on:
- Recipe card cover img → `recipe-cover-{id}`
- Recipe card title → `recipe-title-{id}`

Matching DOM on detail page receives the same names. Browser auto-morphs.

### 10.4 Haptic wrapper

```ts
export function haptic(pattern: number | number[]) {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try { navigator.vibrate(pattern); } catch { /* ignore */ }
}
```

## 11. Testing strategy

| Concern | Test type | Notes |
|---|---|---|
| Reduced-motion fallback renders final state | Jest (RTL) + `matchMedia` mock | Every signature + system motion has a reduced-motion assertion |
| Wordmark plays once per session | Jest + sessionStorage mock | Second mount in same session → no animation class applied |
| View-transition link degrades without API | Jest | `document.startViewTransition` undefined → plain navigation |
| View-transition happy path | Playwright desktop | Assert `::view-transition-group` exists during navigation |
| List stagger caps at 12 | Jest | Render 30 cards, assert only first 12 carry stagger delay |
| Macros `@property` interp | Playwright visual snapshot at 50% keyframe | Optional, stretch |
| Cook mode timer ring pauses at 0 | Jest | `opacity: 1` asserted, no animation class when timer === 0 |
| Haptic no-ops in reduced-motion | Jest | vibrate mock not called |
| Performance: stagger on 24 cards ≤ 20ms total JS | Playwright trace | Stretch goal |

## 12. Rollout plan (high-level — full implementation plan follows via writing-plans skill)

1. **Foundation.** Motion tokens, `@property` registrations, reduced-motion base, `lib/motion/*` helpers.
2. **Signature B first.** Wordmark stroke-in. Small, isolated, safe to land.
3. **System layer — feedback tier.** Save flash, ingredient ripple + haptic, tag chip wipe, copy shimmer, toast entry. Isolated per component.
4. **System layer — transform tier.** List stagger, scroll parallax, macros `@property` interp, serving scaler, unit toggle.
5. **Signature A.** View Transitions across `/recipes` ↔ `/recipes/[id]`. Requires matched `view-transition-name` pairs on both sides.
6. **Cook mode tier.** Step advance, timer ring breath, completion flash, cook-entry zoom.
7. **Typographic finish.** One-pass feature flags across all font stacks.
8. **Delight layer.** Empty-state ink stroke, first-save underline, Konami easter egg, seasonal kanji stroke.

Each step lands in its own commit, passes the existing test gate, and can be reverted independently.

## 13. Risks & open questions

| Risk | Mitigation |
|---|---|
| View Transitions + React 19 / Next 15 integration quirks | Vendor a thin wrapper; detect support; fall back to crossfade silently. Reference: existing `next-view-transitions` community patterns. |
| `@property` registered on older Safari | Safari 16.4+ supports. Older → fallback interpolation jumps (still readable). |
| Scroll-driven `animation-timeline` not in Firefox stable | `@supports` gate; Firefox users get static cover, no parallax. |
| Haptic perceived as gimmicky | Gate behind reduced-motion + a user setting `settings.haptics_enabled` default `true`. Off in settings disables all `navigator.vibrate` calls. |
| Cook-mode thermal under long timer | Timer ring is the only long-running animation; opacity-only; no layout thrash. Verified on iPhone 13 before ship. |
| Typographic `dlig` causes unwanted ligatures in recipe titles (e.g. "st" → fancy form) | Scope `dlig` to body copy and headings, not recipe title `<h1>` / ingredient names. |
| Search-typing opacity fade on non-matches may break existing Playwright search tests | All non-match dimming applied via `data-search-dim` attribute; tests assert DOM presence not visual opacity. Re-run search suites per step. If brittle, remove opacity fade and keep only gold underscore pulse. |
| Signature A `view-transition-name` collisions across recipes with duplicate covers | IDs scoped to recipe UUID in name (`recipe-cover-{uuid}`). Browser enforces uniqueness per transition; collisions throw and we catch + fall back to crossfade. |

Open questions for implementation planning:
- Does the `next-view-transitions` package qualify as "zero new deps," or must it be vendored inline? (Prefer vendored ~50 lines.)
- Which SVG wordmark source? Requires a clean SVG with ordered paths matching kanji stroke order for 世 and 界.
- Should Signature A apply to `/recipes` → search result detail, or only to unfiltered grid? (Default: all list → detail pairs.)

## 14. Success criteria

- JC opens the app on their phone the morning after deploy and says, unprompted, "wow."
- A friend shown the app for the first time asks "how did you build this?" — not "which AI built this?"
- Playwright desktop + mobile suites remain 28/28 green.
- Jest remains 91+/91+ green (new motion tests additive).
- Lighthouse Performance ≥ 95 on `/recipes` and `/recipes/[id]` on mid-range mobile emulation.
- Chrome Performance trace of a full session (list → detail → cook → complete) shows ≤ 0 long tasks > 50ms on interaction frames.
- `prefers-reduced-motion: reduce` session is fully navigable and visually complete with all signatures reduced to final states.
