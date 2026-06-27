# ui-ux-pro-max — review

> Perspective: product-UX lens. Usability heuristics, kitchen-context ergonomics (phone on counter, hands dirty, pace fast), information architecture, cognitive load, error prevention, accessibility, platform affordances.

---

## Verdict on the winner (Team D · Brutalist-Raw-Luxe)

Team D is the correct winner on brand-coherence grounds — the ticket grammar feels more "for a chef" than any other proposal. But the shipped after-screenshots (not the spec) expose a usability gap the scorecard glosses over: on `/recipes/[id]` mobile, the recipe title renders in 40px mono with `word-break: break-all` or similar, wrapping `BULKDEL-W2-1776892154725-A` at **one character per line for ~25 lines**, pushing `COOK` off the first fold. Execution failure, not spec failure — but the spec invites it. Review treats the lane as implemented.

### Top 3 UX wins from this skill's rubric

1. **`primary-action` (§4 Style) — cook-mode FINISH CTA.** One terracotta `--hot` CTA bottom-right (`FINISH ✓`), muted `← PREVIOUS` to its left. Collapsible `INGREDIENTS ∧` rail keeps it single-purpose. Best-executed surface in the redesign.
2. **`no-precision-required` + `touch-friendly-input` (§2 Touch) — scaler.** 48px `+`/`-` squares, hard borders, `-` as ASCII (not U+2212) so iOS summons the numeric keypad. DOSSIER's #1 friction, fixed inside the aesthetic pass rather than as a footnote.
3. **`bundle-splitting` + `performance` (§3 Performance) — font pipeline.** Dropping Cormorant + Barlow Condensed for IBM Plex Mono + Noto Serif JP (one weight, one use) cuts web-font payload ~30KB gz. Zero shadow/blur/grain layers drops GPU composite work on low-end Android under kitchen light.

### Top 3 UX risks (guideline violations, severity graded)

1. **`truncation-strategy` + `line-length-control` (§6 Typography & §5 Layout) — detail title on mobile. Severity: CRITICAL.** After-screenshot at 390×844 shows the title breaking character-by-character down a ~25-line column. Mono `--t-40` + long unbroken slug + narrow column. Spec says "mono 40px uppercase" but doesn't specify `overflow-wrap`, `min-ch` reserve, or a `clamp()` size. Cosmetic on seed data; visible on every mobile load for any real title longer than ~12 chars. **Ship-blocker.**
2. **`navigation-consistency` + `back-stack-integrity` (§9 Navigation) — double wayfinder on cook mode. Severity: HIGH.** The global SEKAI ribbon stacks on top of cook-mode's `← EXIT · Step 1 of 1` strip, overlapping in the right half. Two nav rows on a sacred full-screen surface violate `persistent-nav` and `bottom-nav-top-level`. In a kitchen at 17:30, mis-tap risk. Spec intended the wayfinder to *be* the cook telemetry; the implementation kept both.
3. **`empty-states` + `content-priority` (§8 Feedback & §5 Layout) — recipe list grey skeletons post-paint. Severity: MEDIUM.** Dark/desktop `/recipes` shows four empty dark rectangles — either skeletons that never resolved, a ticket `::before` that fails without hydration, or state blank until hover. Core content is not above the fold. The `[ MISE · EMPTY ]` ASCII ticket the spec promised is absent.

### Kitchen-context fit (phone, dirty hands, 17:30 service)

**PASS:**
- Scaler `+`/`-` fix (numeric keypad) — real bug, real fix
- Tabular numerals everywhere — amounts don't reflow when scaler ticks
- Zero shadows/blur — legible under kitchen fluorescents, no "glass hazing" under steam
- One primary CTA per surface — thumb lands in the right zone
- `FINISH ✓` in terracotta on cook mode — unambiguous

**CONCERN:**
- Mobile title word-break bug (above) — unusable for long slugs
- Double-header on cook mode — eats 64px on a 390×844 screen
- `UNMATCHED` badge on ingredient rows in `--text-4` on `--surface` — tiny, far from the row action, easy to miss with greasy fingers
- Ref codes (`STP-01`/`ING-01`) as `::before` nameplates add a second read-axis competing with content on first run
- No parallel-timer — brutalism doesn't solve DOSSIER friction #3

### One-line accessibility verdict

Contrast and keyboard are strong (9.1:1 text on ink, 48px targets, native focus rings); `--hot` at 4.9:1 is only AA for large text, flag for audit on small terracotta label uses; touch targets on tag chips (28px) still fail on mobile without the promised 40px media-query override visibly in the shipped state.

---

## Team-by-team UX read

### Team A — Editorial-Magazine

- **Best guideline mastered: `line-height` + `font-scale` (§6 Typography).** A 22px base × 1.65 leading = 36.3px line, divisible by 6, with old-style figures on prose and tabular lining figures on quantities. The `FeatureSwap` primitive with reserved `ch`-width is a premium-grade answer to unit-toggle jitter — zero CLS on a notoriously flicker-prone surface.
- **Worst guideline violated: `mobile-first` (§5 Layout). Severity: MEDIUM.** The `grid-template-columns: 160px 1fr 260px` cook-mode spread and the two-column ingredient pane on detail are desktop-composed; the mobile fallback stacks rather than re-solves. "Margin folio" becomes "numeral with no margin" on a 390px screen.
- **Platform affordance fit:** Great on desktop + iPad portrait. On phone-in-kitchen it becomes a readable-but-slow cookbook — the drop-cap is static decoration where a chef needs a landmark, not a letterform.
- **Kitchen-context score: 6/10.** Legibility is the highest of the five; speed-under-pressure is mid — a 420ms page-turn on every cook-mode swipe loses 3+ seconds across a 7-step cook vs brut's 180ms mechanical tick.

### Team B — Kinetic-Motion

- **Best guideline mastered: `haptic-feedback` + `gesture-feedback` + `press-feedback` (§2 Touch).** The motion taxonomy (`lift/hand-off/service-in/plate/cut/detent/settle/flash/veil/banner/strike`) is the only genuine design-system motion vocabulary in the contest. Paired haptic-plus-audio with explicit 30ms lead on `cut` models what real tactile UI does. `AudioContext` pre-warming + iOS vibrate no-op fallback via 40Hz tock is technically correct.
- **Worst guideline violated: `no-blocking-animation` + `interruptible` (§7 Animation). Severity: HIGH.** An 880ms shared-element hand-off blocks the user's path-to-detail for nearly a second every time they tap a card. Add a knob-style scaler with rotational drag + inertia at 17:30 service and you have an interaction that optimizes for TikTok and punishes a chef going from 4 to 7 servings. Judge flagged this; UX lens amplifies it — this is `no-precision-required` violated too.
- **Platform affordance fit:** Desktop cinematic, mobile taxing. `prefers-reduced-motion` fallbacks exist but the default state is kinetic-heavy, which fails the wet-hands-fast-pace use case.
- **Kitchen-context score: 5/10.** Best-sounding app in the contest, worst fit for a counter phone in fluorescent light. Chef will curse the dial into a brunoise.

### Team C — Spatial-3D

- **Best guideline mastered: `progressive-loading` + `network-fallback` (§3 Performance).** The four-tier pipeline (poster → baked WebP → WebGL2 → WebGPU) with a 256×256 GPU-bench probe is the most honest 3D-on-web architecture in the contest. `SpatialBoundary`, `powerPreference: low-power`, `visibilitychange` pause, kill switch via env var — textbook.
- **Worst guideline violated: `motion-meaning` + `system-controls` (§7 Animation & §4 Style). Severity: MEDIUM.** A 120×120 material sample in the top-right of a hovered recipe card does not carry meaning — it decorates. It also devolves into an 80ms active-state flash on touch, which is the surface JC actually uses. The 80KB three.js budget buys a login steam plume visually indistinguishable from the CSS fallback beneath it. Motion that doesn't express cause→effect is the canonical anti-pattern.
- **Platform affordance fit:** Ironically, the most platform-aware *fallback strategy* and the worst actual mobile experience — because the team's own matrix defaults mobile Safari to Tier 1 CSS. Desktop is indistinguishable from baseline.
- **Kitchen-context score: 4/10.** The cook-mode pass-line lighting is poetry, but it's 400ms of canvas relighting on a wet-hand swipe when a 40ms step change would be kinder.

### Team D — Brutalist-Raw-Luxe (winner)

- **Best guideline mastered: `number-tabular` + `visual-hierarchy` (§6 Typography & §5 Layout).** Monospace, tabular numerals, size-plus-position as the only hierarchy levers. This is 2026-correct for a KDS and has the unique property that every screen reads at a glance under hood lighting. Also masters `primary-action` and `destructive-emphasis` — one terracotta CTA per screen, one red `DELETE`, gold reserved for three labelled moments only.
- **Worst guideline violated: `truncation-strategy` + `line-length-control` (§6 Typography). Severity: CRITICAL.** See detail-page mobile word-break above. A monospace `--t-40` title without a smart overflow strategy and without `min-ch` reservation produces the pathological wrap shown in the after-screenshot. The spec flags tabular reservation for the scaler and ingredient column; it does not flag it for titles. This is a one-line CSS fix (`overflow-wrap: anywhere; word-break: normal; hyphens: manual;` plus a `clamp()` font-size) but it is ship-blocking until fixed.
- **Platform affordance fit:** Desktop excellent. Mobile compromised by (a) the title wrap, (b) the cook-mode double-wayfinder, (c) ticket nameplates (`STP-01`, `ING-01`) adding a second read-axis on a phone. All three are fixable in a polish pass.
- **Kitchen-context score: 7/10** — would be 8.5 if the mobile detail-title wrap and double-wayfinder were resolved. The underlying language is exactly right for the context; the implementation needs one more pass on narrow viewports.

### Team E — Ambient-Atmospheric

- **Best guideline mastered: `dark-mode-pairing` + `color-semantic` (§4 Style & §6 Typography).** The time-of-day skin resolver with `color-mix(in oklch)` blended atmosphere tokens, re-resolving every 5 minutes, is the most thoughtful theming architecture in the contest. The `recipe.cooked_at` → `--card-heat` 72h decay is the single best additive idea anyone submitted — it's information presented as light, not as a badge. This respects every brand anti-ref.
- **Worst guideline violated: `visual-hierarchy` (§5 Layout). Severity: LOW–MEDIUM.** The lane's subtlety is also its weakness: a screenshot at 11:30am and at 8:30pm differs in tone but not in grammar. Without a stable visual signature, the app's identity is "premium dark serif at whatever time" — a hierarchy problem dressed as a mood feature. Also mildly trips `color-not-decorative-only` — the ember glow on a recently-cooked card is meaningful only if the user knows the convention, and there is no label.
- **Platform affordance fit:** Best of the five. Pure CSS, ~8KB bundle delta, no WebGL, `prefers-reduced-motion` respected, `prefers-contrast: more` kills glass. Runs on a 2019 Android in a kitchen.
- **Kitchen-context score: 7/10.** Mid-service skin transition at 20:00 animating `--bg` for 2s is correctly paused when a timer runs — but then the feature self-disables during the one window that matters, which is the subtlety critique made concrete.

---

## Cross-cutting

### Most USABLE cooking surface produced

**Team A's cook spread**, narrowly over Team D's KDS. A's hairline progress line draining across the page bottom + margin folio + quiet typography is the single most *readable* cook surface on any device that can render it properly — a chef reading from a mounted iPad or a phone in landscape will process "3 of 7, 4:22 left" faster than from any of the other four. D's KDS is close behind and wins on mobile-portrait speed, but A's ingredient column in the right margin (always visible, never hidden behind an accordion) is a genuine ergonomic win over D's collapsible `INGREDIENTS ∧` rail and over the baseline's detail-page-only mise-en-place. If `networklatency` rules were all that mattered, A wins usability; D wins signature.

### Most BEAUTIFUL but LEAST usable surface

**Team B's scaler dial.** It is the single most cinematic component proposed — rotational drag, inertia, detents with paired 40Hz tock audio, haptic tick, "material weight" via 15ms spring lag. It also requires a dry thumb, a precise gesture, and a 420ms settle window in a context where the user wants to jump from 4 servings to 7 in one tap. The `+`/`-` buttons remain but are "demoted" — explicitly against `gesture-alternative` (don't rely on gesture-only; critical actions keep visible controls *co-equal*). Gorgeous in a reel, hostile on a counter.

### Top 5 UX guidelines this contest collectively fell short on

1. **`truncation-strategy` (§6 Typography).** D ships a mobile detail-title wrap catastrophe; A and C don't stress-test long recipe titles either. Only E visibly reserves width for tonal consistency.
2. **`empty-states` (§8 Forms & Feedback).** D's brutalist empty state (`[ MISE · EMPTY ]`) is specified but not visible in the after screenshots. None of the teams shipped a visible loading skeleton narrative beyond "cards that haven't resolved yet."
3. **`adaptive-navigation` + `safe-area-awareness` (§9 Navigation).** D stacks two headers on cook mode. A's cook spread assumes desktop. C's login steam plume ignores notch positioning. Nobody stress-tests landscape orientation, which is relevant for iPads clamped on a range hood.
4. **`error-clarity` + `error-recovery` (§8 Forms & Feedback).** Every team accepts the baseline's silent-until-submit validation. None propose an inline-validation-on-blur upgrade for `/recipes/new`, which the DOSSIER audit called out at 5/10.
5. **`progressive-disclosure` (§8 Forms & Feedback).** `/recipes/new` on mobile (D's implementation) dumps all fields + ingredients + steps + optional fields into one long scroll. Ticket grammar doesn't fix this — if anything, labelled boxes make the scroll longer. A staged form with `SEKAI · NEW · 2/4` wayfinder progression would have been perfectly on-brand and nobody proposed it.

### Borrow recommendation (one UX pattern beyond the judge's list)

**From Team A — the `kicker` colophon tip pattern for shortcut discovery.** Judge already borrows A's `FeatureSwap` and the `?` dialog. The bigger UX win is A's *kicker-row idle hint* — passive discovery that teaches shortcuts without a modal, popover, or tooltip. In brut grammar this is trivial: the wayfinder's rotating right-slot hint (`/`=SEARCH · `F`=FILTER · `ESC`=CLEAR) becomes a permanent 10px `[HINT · KEYS] /:SEARCH  F:FILTER  ESC:CLEAR` row under the wayfinder on first visit, auto-collapsing after three uses (localStorage-tracked). Solves DOSSIER friction #5 without a popup, stays in-grammar. `?`-dialog is the power-user path; this is the discovery path.

---

## Signature verdict

Does this redesign help JC cook faster / cleaner / better under pressure? **Mostly yes, with two execution bugs that must be fixed before a real service.** Team D's lane answers the brief — tabular numerals, ticket grammar, one primary CTA per screen, monospace as architecture, the scaler keypad fix. Those are wins a chef feels on the first night. The `data-design="brut"` kill switch is the correct risk posture. Ship: Phases 0–2 for login, settings, list, detail, after fixing the mobile-title `overflow-wrap` and merging the cook-mode double-header into a single wayfinder. Defer: the ASCII `/ssh` easter egg (delete, not document); the `SERVICE COMPLETE` typewriter stamp (v1 instant, add `steps(16)` only after a real cook validates it doesn't block the hand); Berkeley Mono (ship Plex). Borrow Team E's `cooked_at` + 72h heat-decay and Team A's kicker-hint colophon pre-release — free quality. One note the judge missed: the `/recipes` empty state needs a narrative (`[ MISE · EMPTY ]` ticket with "Your first recipe goes here. Press N or tap + NEW RECIPE.") — grey rectangles are the first thing a new invited chef sees, and they don't speak.

This is the rare contest where the winner won for the right reason (category-distinctive signature, chef-recognizable grammar) and still ships with two mobile execution bugs the scorecard didn't surface. Fix them, ship the kill-switch, borrow two patterns, and SEKAI moves from premium-dark-serif-app to the first recipe tool a chef would text a friend about.
