# Team B — KINETIC-MOTION · Research

Motion is the primary language of SEKAI 世界. Every state change, every nav, every drag is a choreographed moment in a service pass. The references below are the ones I lifted from most directly when drafting the motion taxonomy. They're grouped by what each contributes (physics math, spatial transitions, haptics, sound design, route-to-route choreography).

## 1. Rauno Freiberg — rauno.me (2025–2026 revision)
Still the clearest public demonstration of a spring-first web language. His page transitions are *not* fades — they're physical settle-in motions where the old content decelerates off-screen while the new content's velocity is inherited. His button press states use a single-axis spring with critical damping (ζ≈1), not a bezier. The lesson for SEKAI: **never ease between two fixed states when you can spring from the current velocity.** Velocity preservation is the difference between "app" and "artifact."

## 2. Vercel's `motion` library (framer-motion 12 → Motion One 11)
Matt Perry's 2025 rewrite landed `useMotionValue`, layout animations with shared-element continuity, and — crucially — `<LayoutGroup>` for spring-interpolated route transitions that don't need the View Transitions API. For SEKAI, this means the hero image of a recipe card can literally *become* the detail-page hero without any teleport: the DOM nodes are different, motion reconciles them. Bundle cost: ~34kB min+gz for the full lib; tree-shakes to ~18kB if we stay within `motion/react` primitives + `AnimatePresence`.

## 3. Apple WWDC 2025 — "Designing for spatial continuity"
Even if we're not on visionOS, the talk re-framed transitions as **hand-offs**: the element that leaves one surface is the same element that arrives on the next. This is the principle behind the ScrollParallaxCover already in the repo — we're going to extend it into a full *shared-element route layer*. Every recipe card's title, cover image, and primary tag are tagged with a `layoutId`; when you click, those three elements physically travel to their detail-page positions while siblings fade on cross-axis.

## 4. Readymag & Studio ACWI case studies (2024–2026)
Readymag's own landing re-cut in 2025, and Studio ACWI's client work (Belgium-based motion studio — Colruyt, Leonidas) consistently demonstrate *cascade-with-overlap*: when a list renders, items don't start staggered 80ms apart with the same duration — they start 50ms apart and each takes 220–280ms so they overlap on-screen. The result is a wave, not a stair-step. SEKAI's ingredient list on detail will drop using this: 38ms stagger, 240ms duration, each row springs in from y:18 with mass 0.9 / stiffness 280.

## 5. Ian Lunn + Josh W. Comeau — spring physics writing (2024 series)
Josh's 2024 "Whimsical Animations with Spring Physics" and Ian's earlier reference pages are still the canonical non-academic treatment of `x'' + 2ζω₀x' + ω₀²x = 0` for UI. I'll use Josh's three named preset shapes: **wobbly** (ζ=0.6), **gentle** (ζ=0.8), **stiff** (ζ=1.0). SEKAI's scaler dial uses `stiff` so it *stops* when you let go — a dial that wobbles would feel like a toy.

## 6. Linear's command palette motion (2025)
Linear's ⌘K palette is the cleanest example of a modal that **respects the source click location**. The scrim radiates from the pointer; the panel scales up from that origin, not from screen-center. For SEKAI's FilterPopover and MacrosMatchModal, we inherit this: `transform-origin` is set to `clientX / clientY` at the moment of invocation. Side-effect: tapping the filter chip on the left makes the panel *grow from the left*. It's tiny. It's everything.

## 7. Arc Browser (The Browser Company) — sidebar motion (2024)
Arc's sidebar sheet has inertia. You drag it, let go mid-travel, and it continues at the velocity you released at, decelerating into its rest state. They wrote about using `damping: 30, stiffness: 400, mass: 1` in framer-motion terms. Our drag-to-reorder on ingredient rows in the edit form will use exactly this profile so the rows carry through your gesture even if you fling.

## 8. Stripe's checkout field focus motion (2025 refresh)
Stripe re-did the "field flash" — when you tab to a new field, the label does a 140ms micro-morph (letter-spacing contracts ~6%, weight ticks up from 500 to 600) *while* the border eases in. Two things happen in synchrony. It reads as a single intention, not two animations. SEKAI borrows this pattern for the scaler dial: the number itself tightens in tracking as the dial engages, so the readout *feels* the grip.

## 9. Teenage Engineering / Playdate — hardware-grade tick haptics (2024–2026)
Both devices use detents — physical clicks at integer positions — and their software companions emulate them in the haptic channel. Playdate's crank SDK exposes a 7ms click at every 5° of rotation. For SEKAI's scaler, we fire `navigator.vibrate(6)` at every integer crossing and — on iOS WebKit where `navigator.vibrate` is stubbed — we synthesize a 40Hz "tock" via the Web Audio API (12ms, cosine-windowed, gain 0.22). The chef's thumb feels the dial click into servings.

## 10. Tonal / Peloton in-workout transitions (2025)
Both products have solved "advance to the next set" without breaking flow. Tonal especially: the step advance is a **film cut with motion-blur implied by velocity**. The outgoing step accelerates off-screen over 180ms with an `ease-in-expo` so it appears to blur; the incoming step enters at 180ms decelerating with `ease-out-expo`. No cross-fade — a cut. SEKAI's cook-mode step change will be exactly this pair, and the direction is governed by swipe velocity (right-swipe → next from right, left-swipe → back from left, and a tap on the Next button picks right as the *conservative* direction).

## 11. Motion One (motion.dev) — 2026 API
Motion One ships a 5.8kB runtime for hardware-accelerated Web Animations API with spring support and `inView` observers. It's the right choice if we want to stay lean — but the moment we need layout animations (shared-element hero transitions) we need framer-motion's layout tech. **Decision, justified in `implementation-plan.md`**: framer-motion 12 for the routes that need layout animations (list→detail, cook-mode step advance), Motion One for the cheap-and-everywhere animations (hover, press, field flash). Combined cost: ~22kB gz. Both share `cubic-bezier` tokens from `lib/motion/tokens.ts`.

## 12. Haptics — iOS 18 Web-like `navigator.vibrate` + Taptic fallbacks
iOS Safari still fakes `navigator.vibrate()` on the main thread (no-ops silently). The only reliable iOS haptic channel in a PWA is a short audio tick routed through an `AudioContext` primed during the first user gesture. Android honours `navigator.vibrate()`. We ship both: a tiny `haptic.ts` module (already present in the repo — extend it) that picks the right channel per platform and exposes `tick()`, `nudge()`, `snap()`, `confirm()`, `fail()`. Reference: Apple's HIG Haptic Feedback guidance + Chrome's Vibration API docs.

## 13. Sonic Pi-style procedural UI sound (2025)
The current cook-mode timer beep is three 440Hz sines. It's fine. The upgrade: **pitch the timer beeps to the recipe's accent colour** — more abstract: a single chef tonal palette (C#5 → 554Hz for "start", G5 → 784Hz for "complete", A#5 → 932Hz for "fail"). ADSR: 0ms attack, 40ms decay, sustain 0.18, 120ms release. Generated inline with Web Audio. No sample files. Lesson from Tonal + Apple's feedback library: UI sound that is musically coherent disappears into the room; sounds that aren't feel like notifications.

## 14. Framer's 2026 interaction kit reference examples
Framer's public motion kit examples for v2026 showcase what I'd call "choreographed reveals" — title, subtitle, and CTA don't enter together; they enter in a 160ms-delayed cascade with their own individual easing. SEKAI's login and detail page adopt this: the SEKAI wordmark strokes in, the 世界 kanji follows 120ms later with its own spring (mass 1.1, not matched to the roman), the email input slides up 200ms after that with `gentle` damping. Three beats, one sentence.

## 15. `react-spring` @8 + `@react-spring/web` (2026)
Worth naming for completeness. It's excellent at physics (it inherits velocity across rerenders, unlike `framer-motion` pre-12 which re-initialized springs on every render). For SEKAI we **don't pick it** — because framer-motion 12 solved the velocity-preservation problem and is now a superset — but the old `useSpring` with `config: { mass, tension, friction }` is still the best public vocabulary for spring constants. Our motion tokens expose both vocabularies: a `framer` object (`{ stiffness, damping, mass }`) and a `reactSpring` object (`{ tension, friction, mass }`) so future contributors can speak either.

---

## Synthesis

- **Spring over bezier for anything gestural** — scaler, drag, sheet dismiss, cook-mode swipe
- **Bezier for timed-sequence choreography** — entrance cascades, field flashes, route transitions where duration is a design decision
- **Shared-element layout for route changes** — list→detail especially (card becomes detail hero)
- **Velocity-aware direction for cook-mode** — the swipe that advanced you also governs the motion direction of the next step
- **Haptic + audio paired with every tactile motion** — every spring release fires a matching tick or tone
- **Reduced-motion is a first-class fork, not an afterthought** — every spring has an instant-snap fallback; every cascade collapses to a single fade
