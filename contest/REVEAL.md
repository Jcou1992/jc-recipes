# SEKAI 世界 Design Contest — Reveal

A silent 5-team, 6-deliverable-per-team contest to find the 2026 look for the app. Pre-assigned lanes. No copying. One sealed-envelope judge. One winner implemented behind a toggleable `data-design` flag so nothing is destroyed.

## 🏆 Winner — Team D · **Brutalist-Raw-Luxe** · 54 / 60

> **Elevator pitch:** SEKAI becomes a restaurant back-of-house service ticket, set by a Swiss typographer. Monospace as architecture. Every entity labelled with a reference code (`REC-042`, `ING-07`, `STP-3/7`). F1 pit-wall telemetry at the top of every screen. Terracotta as a single active-lamp warning. Gold as an earned medal, not decoration. Zero shadows, zero gradients, zero blur, zero radii (except two deliberate exceptions). The chef recognises this from every line they've ever worked.

### Three killer moments

1. **Wayfinder telemetry row** — `SEKAI · REC-042 · COOK · STEP 3/7 · T+04:21 · ×2 · JC · 20:41` pinned at 32px across every route. The signature element of the whole system; every screenshot is instantly SEKAI.
2. **Scaler-as-index** — the serving scaler becomes a labelled spec-sheet cell (`SCALER · REC-042` / `BASE 04 SRV / TARGET 08 SRV / MULT ×2.00`). Ingredients count up digit-by-digit as a mechanical odometer, pure discrete ticks, zero crossfade jitter.
3. **SERVICE COMPLETE stamp** — cook-mode finish screen prints a gold `SERVICE COMPLETE` via a 6-step typewriter reveal. The only time gold appears in normal flow. Restaurant medal.

### Mockup
`contest/winner/mockup.html` — standalone offline demo of login + list + detail + cook in brut grammar.

### What was implemented

All behind `design-mode` cookie. `'classic'` (default) preserves the existing interface pixel-for-pixel. `'brut'` delivers the winner. Toggle lives in **Settings → DESIGN**.

**Phase 0 — Scaffolding (`4ee91f5`):**
- `app/fonts.ts` — IBM Plex Mono (400/500/600/700) + Noto Serif JP via `next/font/google`.
- `styles/tokens-brutalist.css` — complete token layer scoped under `:root[data-design="brut"]`.
- `app/layout.tsx` — reads `design-mode` cookie, sets `<html data-design={mode}>`.
- `app/actions/design-mode.ts` — server action writing the cookie.

**Phase 1 — Primitives (`a8fd24d`):**
- `components/ui/brut/{Wayfinder,Ticket,TabularNumeral,GridScaffold,RefCode,DesignModeToggle}.tsx`
- `lib/brut/ref-codes.ts` + jest tests (4 / 4 passing).

**Phase 2 — Route conversions (7 commits, all with pre-edit checkpoint tags):**
- Wayfinder mount in layout (`6d4300d`)
- Settings DesignModeToggle (`2ff2aad`)
- Login surface + global chrome (`2b20d55`)
- Recipe list as service ticket (`896661b`) — cards render nameplate `FIG.03 · CARD · REC-XXXX`, hover flips top border 1 px → 2 px hot
- Recipe detail as spec sheet + ASCII scaler fix (`1593bcc`) — **U+2212 → ASCII `-` summons iOS numeric keypad**; this single-character fix in both classic and brut resolves DOSSIER kitchen-friction #1
- Cook mode as KDS line printer (`0ebf701`) — step verb between bone rules, 64 pt timer, `SERVICE COMPLETE` stamp
- Print as mono service ticket (`8034f7e`) — replaces Georgia with Plex Mono (brand fix inherited from DOSSIER)

**Phase 3 + 4 — Polish (`009fc59`):**
- `prefers-reduced-motion` block disables `steps(16)` stamp + ticket-fire flips.
- Touch targets audited: scaler +/− 48 px, cook prev/next 56 px, sort pills 48 px.
- Classic decorations (`InkBrush`, `SeasonalKanji`, `WordmarkStrokeIn`, `ScrollParallaxCover`, `FirstSaveCelebration`) hidden under brut via CSS / mount guard — files retained for classic mode.

**Borrowed moments integrated** (per judge's recommendations):
- **From Team A (Editorial):** `.brut-reserve-ch` utility — reserved 5ch column for scaler digit + ingredient quantity, prevents digit jitter on odometer ticks.
- **From Team E (Ambient):** `cooked_at` pattern deferred — stability report explicitly allowed skipping the Supabase migration; TODO hook in `finishCooking` for future wire-up.
- **From Team C (Spatial):** `@media print { canvas { display: none !important; } }` defensive rule for forward-compat with any future spatial pilot.

**Deferred / not-shipped:**
- Berkeley Mono licensing decision — shipped on IBM Plex Mono per winner's own fallback guidance.
- `/ssh` ASCII easter egg — not implemented, per judge's "ruthlessly delete or silently ship" directive.
- `recipe.cooked_at` DB migration — requires `supabase db push`; punted to a follow-up PR.
- `?` keyboard-shortcut cheat-sheet dialog — punted to a follow-up.

### Verification

| Gate | Result |
|---|---|
| `npm run build` | ✅ clean, 10 routes compiled |
| `npm test` (Jest) | ✅ 197 / 197 |
| `npx playwright test --project="Desktop Chrome"` | 43 pass / 3 fail — **all 3 pre-existing** (confirmed by running against `checkpoint/pre-contest-impl` where the same 3 fail identically; no test files changed since baseline) |
| `npx playwright test --project="Mobile Safari"` | ✅ 5 pass / 1 skipped |
| `graphify update .` | ✅ ran, churn discarded per convention |

---

## 🥈 2nd — Team A · **Editorial-Magazine** · 48 / 60

> **Elevator pitch:** SEKAI as a cookbook that happens to be interactive. Print-grade editorial rigour — asymmetric columnar grids, drop caps, rule lines, margin annotations, ligature-rich Cormorant on a 6 px vertical rhythm, old-style figures on prose + lining figures on tabular data.

**What was great:**
- The most internally consistent spec in the contest. 6 px baseline derived from Cormorant 22 px × 1.65 = 36.3 actually paid off in the mockup — every rule lines up.
- `FeatureSwap` primitive (160 ms crossfade, reserved ch-width, `aria-live="polite"`) is a genuinely clever mapping of OpenType figure-set logic to unit-conversion UI. **Borrowed into the winner's implementation.**
- The "TOC row, no thumbnails" list view is a brave deletion that improves LCP.
- Lowest risk in the field — single `html.ed` gate = single-line rollback.

**What was lost:** 2026-ness leaned on restraint rather than a new idea. The reference pack (Kinfolk, Cereal, Gentlewoman) is 2019–2024. Cook-mode spread with folio is beautiful but its desktop-first `grid-template-columns: 160px 1fr 260px` papers over the 390 px phone case rather than re-solving it.

---

## 🥉 3rd — Team B · **Kinetic-Motion** · 46 / 60 (tied on total, won tiebreak on lane mastery)

> **Elevator pitch:** Motion is the primary language. Page transitions choreographed route-to-route. Named motion palette (`lift`, `hand-off`, `service-in`, `cut`, `plate`). Spring physics with named damping constants. Haptic + audio paired with explicit lead/lag.

**What was great:** Deepest engineering of the five. The motion taxonomy reads like a real design-system vocabulary — someone could grep for `motion="cut"` and find cook-mode transitions. Haptic + audio pairing with 30 ms pre-announcement is kitchen-grade.

**What was lost:** +22 kB gz bundle delta (largest in the field). iOS Safari silently no-ops `navigator.vibrate`. The 880 ms shared-element transition is long enough that Playwright e2e becomes a `waitFor('[data-motion-ready="true"]')` nuisance. The rotational-inertia scaler dial is a micro-interaction the chef will curse at 17:30 service.

---

## Honorable mentions

- **Team E · Ambient-Atmospheric · 46 / 60** — the subtlest idea in the contest: "the app has weather." Time-of-day skins interpolate across the day; a recipe you cooked yesterday glows faintly today and fades over 72h (`--card-heat`). Hedged its lane too gently. The `cooked_at` data pattern is borrowable and flagged for follow-up.
- **Team C · Spatial-3D · 41 / 60** — most disciplined 3D proposal imaginable: four-tier rendering pipeline (poster → baked WebP → WebGL2 → WebGPU), GPU bench via 256×256 shader frame, `NEXT_PUBLIC_SPATIAL_ENABLED=0` kill switch. Discipline verging on self-erasure — on JC's phone the proposal defaults to Tier 1 CSS, indistinguishable from today. What was the 80 kB for?

---

## Rollback map

Every sacred feature is protected by a pre-edit checkpoint tag. Selectively revert any single feature without losing the rest.

| Tag | Protects | Revert command |
|---|---|---|
| `checkpoint/pre-contest-impl` | Full pre-implementation state (all contest artifacts present, no code touched) | `git reset --hard checkpoint/pre-contest-impl` |
| `checkpoint/feature-layout-pre` | `app/layout.tsx` (Wayfinder mount) | `git revert 6d4300d` |
| `checkpoint/feature-settings-pre` | Settings page (`DesignModeToggle`) | `git revert 2ff2aad` |
| `checkpoint/feature-login-pre` | Login surface | `git revert 2b20d55` |
| `checkpoint/feature-list-pre` | Recipe list + card + filters | `git revert 896661b` |
| `checkpoint/feature-detail-pre` | Recipe detail + macros + **U+2212 fix** | `git revert 1593bcc` |
| `checkpoint/feature-cook-pre` | Cook mode | `git revert 0ebf701` |
| `checkpoint/feature-print-pre` | Print page | `git revert 8034f7e` |

**Full rollback (restore pre-contest state):**
```bash
git reset --hard checkpoint/pre-contest-impl
```

**Disable brut globally without touching code:**
Settings → DESIGN → `CLASSIC`. Cookie-only. Instant.

---

## Before / After gallery

- **Before (classic baseline):** `contest/_analysis/current-state/{dark,light}/{desktop,mobile}/*.png` (36 PNGs, captured during Phase 1)
- **After (brut mode):** `contest/winner/after-screenshots/{dark,light}/{desktop,mobile}/*.png` (Phase 5)

Toggle between them in the app: Settings → DESIGN → `CLASSIC | BRUT`.

---

## Contest artifacts

| Path | Purpose |
|---|---|
| `contest/_analysis/DOSSIER.md` | Team briefing — palette, sacred features, friction points, opportunity list |
| `contest/teams/team-{a,b,c,d,e}-*/` | All 5 teams' full submissions (research, spec, mockup, plan, snippets, stability report) |
| `contest/judge/scorecard.md` | Sealed-envelope scorecard, team-by-team critique, borrow recommendations |
| `contest/winner/` | Copy of Team D submission + `after-screenshots/` |
| `contest/REVEAL.md` | This file |
