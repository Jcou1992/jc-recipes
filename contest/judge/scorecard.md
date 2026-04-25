# SEKAI 世界 Design Contest — Judge's Scorecard

Single judge, sealed envelope. All scores on 0–10.

## Executive summary

Five very different proposals, all shippable. Team D (Brutalist) produced the most distinctive, most lane-pure, most "I've never seen a recipe app do this" document of the five — a pit-wall-telemetry KDS that JC would recognise from any line he's ever worked. Team A (Editorial) is the most coherent and the lowest risk, and would already look great in the codebase tomorrow. Team B (Kinetic) has the deepest engineering but pays the highest stability tax. Team C (Spatial) is the most bundled-up-and-polite 3D proposal the contest could have asked for, which is also its weakness — discipline verging on self-erasure. Team E (Ambient) has the subtlest idea of the field (the app has weather) but the weakest lane push. The winner has to be the team that feels most unmistakably 2026 and most unmistakably for a chef — Team D.

## Scoring grid
| Team | Lane | WOW | 2026 | Visual | Utility | Stability | Lane | TOTAL |
|------|------|-----|------|--------|---------|-----------|------|-------|
| A | Editorial | 7 | 7 | 9 | 7 | 9 | 9 | **48 / 60** |
| B | Kinetic | 8 | 8 | 8 | 7 | 6 | 9 | **46 / 60** |
| C | Spatial-3D | 7 | 8 | 7 | 6 | 7 | 6 | **41 / 60** |
| D | Brutalist | 9 | 9 | 9 | 9 | 8 | 10 | **54 / 60** |
| E | Ambient | 7 | 8 | 8 | 7 | 9 | 7 | **46 / 60** |

## Final ranking
1. **Team D — Brutalist-Raw-Luxe** — 54 / 60
2. Team A — Editorial-Magazine — 48 / 60
3. Team B — Kinetic-Motion — 46 / 60 (tie on total with E; wins tiebreak on lane mastery)
4. Team E — Ambient-Atmospheric — 46 / 60
5. Team C — Spatial-3D — 41 / 60

## Team-by-team critique

### Team A — Editorial-Magazine
**Total: 48 / 60**
- What's excellent: the most internally consistent spec in the contest. The 6px vertical rhythm derived from Cormorant 22px × 1.65 = 36.3 actually pays off in the mockup — every rule lines up. The "TOC row, no thumbnails" list view is a brave deletion and it works; it also improves LCP (one of only two teams whose perf delta is negative). The `FeatureSwap` primitive with reserved ch-width is a genuinely clever mapping of OpenType figure-set logic to unit-conversion UI — 160ms crossfade with zero jitter is the right answer, not a count-up tween. The drop-cap on the first ingredient is the one piece of flourish the whole app gets, and it earns it. Stability report is honest — the U+2212 → ASCII `-` scaler fix is correctly flagged as a behavioural change (and it fixes a real kitchen bug).
- What's weak: "make the app more like a magazine" is tasteful but a little safe — this is the most 2019–2024 reference pack in the contest (Cereal, Gentlewoman, Apartamento, Are.na). 2026-ness leans on restraint rather than a new idea. The cook-mode "spread with folio" is pretty but it will wrap awkwardly on a 390px phone held vertically at 17:30 service; `1fr 260px` in `grid-template-columns: 160px 1fr 260px` is desktop-first thinking that the mobile fallback (stack) papers over without re-solving.
- Signature moment: the page-turn clip-wipe between cook-mode steps + the margin folio set huge. It would read instantly as "this is a cookbook I'm inside of."
- Risk flag: lowest in the contest — the `html.ed` gate is a single-line rollback. Confident this ships as plan.

### Team B — Kinetic-Motion
**Total: 46 / 60**
- What's excellent: the deepest engineering. The motion taxonomy (`lift`, `hand-off`, `service-in`, `plate`, `cut`, `detent`, `settle`, `flash`, `veil`, `banner`, `strike`) is the only one in the contest that reads like a real design-system vocabulary — someone could grep the codebase for `motion="cut"` and find the cook-mode transitions, and that's load-bearing. Spring constants are named and tabled, with explicit damping ceilings ("no spring under ζ 12 except the one `wobbly` use"). Haptic + audio pairing with explicit lead/lag (30ms pre-announcement of the snap) is the one thing here JC will feel under wet hands. The shared-element hand-off is correctly isolated to three `layoutId`s so framer-motion doesn't choke.
- What's weak: the stability report admits what the spec underweights. +22kB gz is the largest bundle delta of the five, iOS Safari silently no-ops `navigator.vibrate` (the team knows this and solves it with a 40Hz tock, but the spec keeps using `haptic()` language as if it works everywhere), and the 880ms shared-element transition is long enough that Playwright e2e becomes a `waitFor('[data-motion-ready="true"]')` nuisance across the whole suite. The scaler dial with rotational drag + inertia is the kind of thing that reads like 0:42 in a reel and annoys a chef at 17:30 — when JC wants to go from 4 servings to 7, a dial that "keeps spinning for a beat like a real knob" is a micro-interaction he will curse into a brunoise. The +/− buttons are retained but demoted.
- Signature moment: the cook-mode `cut` with directional blur (3px, exit only) + paired `advance` 784Hz tone + pre-announcement haptic. This is genuinely cinematic and the one place the motion thesis pays off.
- Risk flag: medium-high on cook mode and list→detail. Cook mode is sacred feature #6 and this proposal rewrites its transition stack + audio module; even with checkpoint commits, the e2e diff is the biggest in the contest.

### Team C — Spatial-3D
**Total: 41 / 60**
- What's excellent: the most disciplined 3D proposal imaginable. The "rule of six" materials (clay, cedar, gold, shoji, iron, porcelain) as first-class design tokens with PBR values AND 2D CSS fallbacks is the right abstraction — the team correctly argues that materiality is a design-system citizen in 2026 (Bjango/Markbåge reference). The four-tier rendering pipeline (poster → baked WebP → WebGL2 → WebGPU) is honest; the GPU bench via 256×256 shader frame is better than UA sniffing. Stability report is thorough — `SpatialBoundary`, `powerPreference: low-power`, `visibilitychange` pause, `NEXT_PUBLIC_SPATIAL_ENABLED=0` kill switch, CSP unchanged. The cook-mode "pass-line lighting rig" — one tungsten spot, current plate lit, next plates in cool dark — is a genuinely good metaphor.
- What's weak: the lane doesn't push hard enough. The team explicitly rejects free-orbit cameras, 3D UI controls, loading screens, and all 3D type except the wordmark — which leaves "a 120×120 material sample in the corner of hovered cards" as the headline 3D moment on the list page. On mobile (touch, pointer:coarse) this becomes an 80ms active-state flash. The spatial lane is supposed to *feel* 3D; this feels like a 2D app that has 3D in the basement, kept behind a boiler-room door. The mockup for login WebGL is a terracotta volumetric radial + curl-noise steam that looks good but is indistinguishable from the CSS fallback below it — the ROI on 80kB of three.js is not visible. The "cedar plank under the scaler" as Tier-2 enhancement is decorative in the strictest sense.
- Signature moment: the cook-mode pass-line with key-lamp travelling in world space over 400ms at step change. This is the one moment where the 3D earns its keep.
- Risk flag: the gate is conservative enough that the app won't break, but the team's own stability report admits mobile Safari WebGL is the highest-risk vector (3/5) and they respond by defaulting mobile to Tier 1 CSS-only. Which means JC, who primarily uses his phone, gets the fallback — and the fallback is nearly indistinguishable from today's product. What was the 80kB for?

### Team D — Brutalist-Raw-Luxe
**Total: 54 / 60**
- What's excellent: the clearest, most lane-pure, most "chef would nod" proposal of the five. Every move is argued against the brief: monospace as architecture, ticket grammar as the signature, reference codes (`REC-042`, `ING-07`, `STP-3/7`, `COOK-20:41`) as first-class UI elements, one accent color used with extreme restraint (`--hot`), gold as an earned medal that appears in exactly three places. The wayfinder row (`SEKAI · REC-042 · COOK · STEP 3/7 · T+04:21 · ×2 · JC`) is the single most distinctive element any of the five teams proposed — it's F1 pit-wall telemetry / KDS service ticket / NASA flight card, and it's perfect for a chef. The cook-mode `SERVICE COMPLETE` stamp with `steps(6)` typewriter reveal + gold is the correct use of gold (earned, rare, mechanical). The scaler's jump from `−` (U+2212) to plain `-` is called out as a deliberate DOSSIER-1 fix. Zero shadows, zero gradients, zero blur, zero radii (except two labelled exceptions) is design by subtraction done with conviction. The `data-design="brut"` toggle kill switch lets JC revert in one settings click.
- What's weak: Berkeley Mono at USD 75 personal is a real licensing conversation. The team's fallback (IBM Plex Mono) is credible but explicitly "90% of the job for free" — this is a shipping decision, not an open question. The "ASCII box-drawing easter egg via `/ssh`" is a lovely tell but cutesy relative to the rest of the document; it should be ruthlessly deleted or quietly shipped. Monospace at 14px on `sm` font-size is 11px ref codes → the spec catches this and floors it at 11px, but it means the user-controlled font-size preference partially doesn't apply, which the settings microcopy must be honest about. Display ratio math for `--hot` at 4.9:1 is just barely AA (large text), flag for audit.
- Signature moment: three tied — (1) the wayfinder telemetry row, (2) the scaler-as-index with odometer digit ticks, (3) the `SERVICE COMPLETE` stamp. The cook-mode KDS as a whole is the single moment in the contest that made me audibly react.
- Risk flag: medium. Five sacred features are visually rewritten (not behaviourally). The checkpoint-commits-per-sacred-feature discipline is correctly called out (seven checkpoints before Phase 2). Print CSS needs to branch on `data-design`. Font bundle is lighter than today (good). Test surface: all `data-testid` attributes preserved.

### Team E — Ambient-Atmospheric
**Total: 46 / 60**
- What's excellent: the subtlest idea in the contest — "the app has weather." The time-of-day resolver with five anchor skins (morning-mist, midday-bright, afternoon-amber, service-ember, late-indigo) interpolated across 5-minute re-resolves is the correct architecture. The `recipe.cooked_at` nullable column feeding a `--card-heat` CSS variable that decays linearly over 72h is the single best additive feature in the contest — a recipe you cooked yesterday glows faintly today, then fades. No badges, no streaks, no "you've cooked this 14 times" — a light that remembers. This is exactly the "premium premium" move and it respects every brand anti-reference. The glass system's "rule of earn" (glass is only allowed on five named surfaces; every other surface is solid) is mature restraint; Apple visionOS cited correctly as the anti-pattern to iOS 17 frost-spam. Stability report is solid — additive tokens, kill switch is removing the provider, 7.7kB total bundle delta, color-mix(in oklch) supported everywhere in the test matrix.
- What's weak: ambient is the hardest lane to push without hedging, and this proposal hedges. The "skin re-tones across the day" is the core idea and it is weather-subtle *by design*, which means the WOW is also subtle. If JC opens the app at 11:30am and at 8:30pm, there's a tonal shift — but the chrome and grammar are identical. Compare to D's wayfinder: there, every screenshot is unmistakably SEKAI. Here, a screenshot is premium-dark-serif-app-at-whatever-time. The aurora blobs + horizon gradient + conic accent stack is tastefully done but reads closer to Linear marketing than to a restaurant kitchen tool — the jump from "Linear in 2024" to "this in 2026" is the least 2026 among the field. The mid-service skin transition (19:59 afternoon-amber → 20:00 service-ember) animating `--bg` over 2s is correctly flagged in the stability report's watch-items and the mitigation is "pause skin changes when a timer is running" — smart, but it also means the feature self-disables during the one window JC actually cooks.
- Signature moment: the recently-cooked card aura decaying over 72 hours. Borrowable even by the winner.
- Risk flag: low. The whole layer is gated behind one provider; one line of layout removes it. The `cooked_at` migration is nullable and RLS-safe.

## Why the winner won (one paragraph)

Team D wins because its three signature moves (wayfinder telemetry row, ticket grammar with reference codes, KDS cook mode with SERVICE COMPLETE stamp) do not exist in any recipe app on earth — and they do exist, almost identically, in the back-of-house software JC has spent 15 years reading under heat lamps. Every other team made SEKAI more beautiful; Team D made it *itself*. The lane mastery is total — no accidental drift into kinetic motion, no glass, no decoration; the restraint is itself the signature. Stability is managed via a literal `data-design="brut"` toggle so JC can cook one service in brut and flip back in a cookie if he hates it. The proposal also fixes the iOS U+2212 scaler bug as a deliberate act inside the new aesthetic, not as a footnote. It's the only proposal where a chef's friend would text "what is that" instead of "that's nice."

## What the runner-up does better than the winner (one paragraph)

Team A's editorial 6-unit vertical rhythm and OpenType figure-set discipline (old-style figures on prose, lining figures on tabular data, smart-fraction Unicode glyphs ⅛–⅞) is a level of typographic craft the brutalist winner does not match — Team D uses one monospace at two weights and does hierarchy through size and position, which is correct for the lane but leaves type-quality wins on the table. Team A's `FeatureSwap` primitive (160ms crossfade with reserved ch-width, `aria-live="polite"` debounced) is a cleaner solution to the unit-toggle and scaler-value-change surfaces than D's "no-motion instant swap," and the brutalist implementation should absorb the `min-ch` reserved-width technique to prevent jitter on the scaler digit and ingredient quantities. Team A also has a better answer for the detail page's drop-cap on the first ingredient — a single flourish that reads as "this is a printed cookbook," compatible with D's monospace stance if applied to the recipe title or section head rather than ingredient letterforms.

## Recommendations for implementation

**Risks in Team D's plan to flag before starting:**
- Berkeley Mono licensing is a real conversation. Decide in week one: ship on IBM Plex Mono, or negotiate a shop licence + JC-drops-woff2-in-public/. Do not half-ship with Berkeley on JC's phone only; either commit or ship Plex.
- `--hot` contrast at 4.9:1 on `--ink-900` is AA for large text only. Audit every `--hot` use site against AA normal-text 4.5:1; adjust to `oklch(66% 0.15 45)` if any small-text use comes up.
- The `/ssh` ASCII easter egg is either ruthlessly deleted or silently shipped. Do not document it in any README; it exists in code only.
- The seven sacred-feature checkpoint commits are non-negotiable. Write a single runbook mapping each checkpoint to the file it snapshots so a revert is one `git revert <sha>`.
- Monospace at 14px on the `sm` font-size setting drops ref codes to 8.75px. The spec floors them at 11px via `max(0.6875rem, 11px)` — verify this at build time; add a visual regression test on the sm breakpoint so the floor never regresses.
- Cook-mode swipe/haptic/audio/wake-lock logic is preserved verbatim — confirm the completion-branch `recordCooked()` call (borrowed from Team E below) is fire-and-forget so it can never block cook completion.

**Moments to steal from losing teams (without breaking D's coherence):**
- **From Team E (Ambient):** absorb the `recipe.cooked_at` nullable column + the `--card-heat` decay-over-72h system. In brut grammar this is *not* a glow — it is a "COOKED 03h AGO · 14×" row on the ticket that starts bright and fades to muted bone over 72h. The data feature is free; the visual expression stays brutalist. This single borrow solves the "no streaks / no badges / still shows me what I made recently" problem elegantly.
- **From Team A (Editorial):** the `FeatureSwap` reserved-ch-width primitive for the scaler digit and ingredient quantity columns. D's spec currently updates amounts "digit-by-digit, tabular, zero jitter" via instant ticks, which is correct, but formalising the reserved width as a utility (`.brut-tabular-reserve` with `min-width: 5ch` on the qty column) prevents any future regression.
- **From Team A (Editorial):** the keyboard shortcut cheat-sheet (`?` opens a dialog listing shortcuts). D already has a rotating wayfinder right-slot hint, but a full `?` dialog is a better first-run discovery surface. Render it as a ticket (`[DIALOG · KEYS]`) to stay in-grammar.
- **From Team B (Kinetic):** the AudioContext-primed 40Hz tock on scaler integer crossings (12ms, cosine-windowed, gain 0.22). This is the one motion borrow — brut motion is "linear, mechanical, no spring," and a 40Hz tock on the scaler odometer is exactly that. Do not borrow the spring-physics scaler dial; that's lane-hostile.
- **From Team C (Spatial):** the `@media print` canvas-suppression + print-CSS branch-on-design-mode. D's print plan is to swap Georgia for the app's monospace; reinforce that with Team C's `canvas { display: none !important; }` defensive rule (even though D ships zero canvases) for forward-compat with any future spatial pilot.

## Identified winner
**Team D — Brutalist-Raw-Luxe** — to be implemented.
