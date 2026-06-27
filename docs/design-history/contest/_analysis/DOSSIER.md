# SEKAI 世界 — Contest Dossier

Authoritative briefing for the five design teams. All teams read this before drafting.

## Product

- **SEKAI 世界** — private premium recipe tool for JC (restaurant chef, Sakai) and small invited circle. Not consumer-facing, no public signup, no mass-market patterns.
- **Users:** JC (phone on counter, hands dirty, fast pace), `demo@sakai.app` (showcase), invited chefs/friends later. Every surface must scale gracefully to multiple named users without losing the single-chef voice.
- **Brand shorthand:** "restaurant mise en place — everything visible and within reach, no decorative clutter."
- **Palette:** Terracotta `#D4703F` + Gold `#EDD18E` + Ink/Bone. Dark default, light override via `data-theme`. OKLCH throughout.
- **Typography:** Cormorant Garamond (body), Noto Serif JP (display), Barlow Condensed (labels). Font-size pref SM/MD/LG per browser.
- **Principles:** (1) every pixel earns its place, (2) legibility under pressure, (3) polish don't rebuild, (4) restaurant-grade finish, (5) speed over everything.
- **Anti-references:** engagement-feed consumer apps, lifestyle cooking blogs, generic notes apps, SaaS marketing homepages. Teams MAY break brand rules if a stronger direction justifies it — but must state the case.

## Stack & quality gates

- Next.js app router + Supabase (auth + Postgres + RLS) + TypeScript.
- Jest 91/91, Playwright 28/28 (desktop 23 + mobile 5), pre-commit test-gate.
- `npm run build` must stay clean.
- `middleware.ts` does cookie-presence only; server actions validate JWT locally. RLS is the security boundary.

## Current route inventory

| Route | Purpose | Primary client components |
|---|---|---|
| `app/page.tsx` | Redirect to `/recipes`. | — |
| `app/(auth)/login/page.tsx` | Email + password sign-in. | brand header, form |
| `app/(app)/recipes/page.tsx` | List + search + tag filter + sort + bulk select. | `RecipeListClient`, `TagRail`, `SortPills`, `FilterPanel`, `BulkActionBar`, `InkBrush` (empty state), `EditableSpaceName` |
| `app/(app)/recipes/new/page.tsx` | Manual form or markdown import. | `FormWithPreview`, `RecipeForm`, `MarkdownImport`, `IngredientRow`, `StepRow` |
| `app/(app)/recipes/[id]/page.tsx` | Detail: scaler, unit toggle, macros, export, cook link. | `RecipeDetailClient`, `ScrollParallaxCover`, `MacrosCard`, `FirstSaveCelebration` |
| `app/(app)/recipes/[id]/edit/page.tsx` | Edit form (same shell as new). | `RecipeForm`, `FormWithPreview` |
| `app/(app)/recipes/[id]/cook/page.tsx` | Full-screen step-by-step cook mode. | `CookMode` (timers, haptics, audio, wake-lock, swipe) |
| `app/(app)/recipes/print/page.tsx` | Print / PDF export, optionally bulk. | `PrintAutoTrigger` |
| `app/(app)/settings/page.tsx` | Space name, theme, language, font size, logout, onboarding replay. | `ThemeToggle`, `LanguageToggle`, `FontSizeToggle`, `AvatarMenu` |

## Sacred features (must stay functional)

1. Supabase email/password auth (users: `jc@sakai.app`, `demo@sakai.app`, `test@jc-recipes.local`).
2. Recipe CRUD.
3. Search + tag filter + sort.
4. Serving scaler (persisted per recipe in localStorage).
5. Unit conversion toggle (metric ↔ imperial, smart fractions up to ⅞).
6. Cooking mode (`/cook`) — step nav, swipe, timers, haptics, audio, wake-lock.
7. Toast system.
8. Unsaved-changes warning.
9. Copy ingredients.
10. Unit autocomplete.
11. Print view.
12. Font-size preference (SM/MD/LG, per browser).

Improvements to sacred features require a checkpoint commit before the change so the user can revert that feature alone. Additive new features need no checkpoint.

---

## Current UX audit (per route)

### `/` (root)
- **Score: 2/10.** Pure redirect. Zero brand surface. If someone lands here directly, nothing happens visually.

### `/login`
- **Score: 6/10.** Centred dialog, strong SEKAI + 世界 wordmark, scale-in animation, terracotta+gold palette, AA contrast.
- Gaps: no passkey, no password-reset flow, errors post-submit only, no microcopy about "closed circle," no guest preview. No ambient/time-of-day presence.

### `/recipes` (list)
- **Score: 7/10.** Strong: debounced search (150ms) with diacritic-strip normalization, tag rail with `f`-key overflow, keyboard-first (`/`, `f`, `Esc`), bulk select with shift+range, empty-state `InkBrush`, editable space name.
- Gaps: keyboard shortcuts have no discoverability, search input loses focus on some state updates, tag rail truncation is silent if tags ≤ 12, no recipe count, no active-sort indicator on pills, no drag-reorder or favourites, no "you've cooked this N times" re-ranking.

### `/recipes/new`
- **Score: 5/10.** Dual-mode (manual form + markdown import) is flexible. Live preview on ≥md screens. Remembers servings/tags/timers across edits.
- Gaps: no recipe templates, no inline FDC ingredient lookup (the column exists and is unused from the UI), no macros estimate upfront, markdown import hidden behind a tab, step timer input demands "45 min" not "45," no URL scraper, no undo for deleted rows, validation is silent until submit.

### `/recipes/[id]` (detail)
- **Score: 7/10.** Excellent scaler (haptic on +/–, ripple on ingredient), unit toggle, smart fraction rounding, macros card with match modal, export MD + PDF, scroll parallax cover, view-transition nav, localStorage-scoped per recipe.
- Gaps: uses `−` (U+2212) which fails to summon numeric keypad on iOS, detail page has no mise-en-place checkboxes (only cook mode does), no print button (must export→PDF), macros card has low contrast on dark (gold on dark, small), no shopping list export, no voice-read.

### `/recipes/[id]/edit`
- **Score: 5/10.** Reuses new-recipe shell, consistent.
- Gaps: no version history, no diff vs. previous, no "save as draft," no collab awareness, no conflict detection.

### `/recipes/[id]/cook`
- **Score: 8/10. Highest baseline.** Full-screen, wake-lock, swipe (dx>60), haptics (10ms on check, [40,40,40] on finish), audio beeps (3×440Hz), timers persist scaler/unit state via URL params, elapsed counter, "start again."
- Gaps: silent swipe transitions, ingredient list is read-only mid-cook, one timer per step (no parallel), no voice input ("next step"), no voice-read, no notes visible, no high-contrast option, completion doesn't write back "last cooked" to recipe.

### `/recipes/print`
- **Score: 6/10.** Clean print CSS, rule lines, meta, bulk via `?ids=...`, auto-trigger on load, respects single-recipe scaling.
- Gaps: font is Georgia not Cormorant (brand break), no QR back to online, no watermark, no A4/letter toggle, no preview.

### `/settings`
- **Score: 5/10.** Clean sections, toast on save, persists theme/language/font-size to cookies+localStorage, onboarding replay.
- Gaps: no data export/import, no integrations, no account deletion (GDPR risk), theme tri-state (sys/dark/light) has weak active indication.

### Baseline average: **6.0 / 10**

The product reads 2024: premium materials, solid motion + haptics, good accessibility primitives. To hit 2026 it needs a distinctive language rather than more features.

---

## Design-system audit

### Tokens
- Colors OKLCH throughout, semantic `--bg/card/raised/input`, `--text-1/2/3`, `--border*`, `--ring`, tag system (`--tag-bg/text/border`).
- Motion tokens: `--ease-out-quart/quint/expo`, `--motion-xs..xl` (120–400ms), `--stagger-card` 80ms, `--stagger-stroke` 60ms.
- Shadows: `--shadow-card`, `--shadow-dialog`, both OKLCH-alpha-blended and theme-aware.
- **Gaps:** ~46 inline raw-px sites (`minHeight: 52`, `fontSize: '0.875rem'`, `letterSpacing: '0.24em'`), inline `rgba()` in OnboardingTour, bare OKLCH in `SeasonalKanji`. Radius tokens not centralized (components use mixed `rounded-xl/2xl/full` + a `6px` in globals). Arbitrary `text-[11px]` / `text-[10px]` in `MacrosCard`.

### Motion
Pure CSS + React state. No framer-motion. View Transitions API wired (220/320ms). CSS Scroll Timeline for parallax cover (no-ops on Firefox). Animations: fade-up `.22s`, scale-in `.18s`, underscore-sweep `.26s`, ripple `.34s`, shimmer `.42s`, ink-brush `.62s`, first-save underline `.76s`. `@property`-driven macro bar.

### Motion gaps
No feedback animation on form errors, no row exit animation on ingredient/step delete, no stagger on filter result transitions, no spinner / pulse on macros compute, no feedback sound on cook-mode swipe.

### Components
- Button variants `btn-primary` / `btn-ghost` / `btn-danger`.
- Single `input-base` (44 min-height, token colors, autofill override).
- `.recipe-card` (hover lift 3px, gold border on hover, hover-media gated).
- `ConfirmDialog` with focus trap + scrim.
- `SortPills` (52 min-height, ARIA radio group).
- `FilterPopover`, `MacrosMatchModal` with portal scrims.
- `ToastContainer` bottom-centre, 360px max, 3 variants.
- Motion primitives: `WordmarkStrokeIn`, `FirstSaveCelebration`, `InkBrush`, `ScrollParallaxCover`, `SeasonalKanji`, `ViewTransitionLink`, `KonamiEasterEgg`.

### Design debt
Duplicated `.dialog-panel` width logic (RecipeCard + MacrosCard). Magic animation values (`stroke-dasharray: 260`, ripple scale `3.2`). Box-shadow sometimes inline and hardcoded.

### Brand-rule adherence: **7/10**
Dark-first is locked, palette is exclusive, no engagement patterns, typography trio is precise, motion is restrained and functional. What's missing: full token abstraction, completed motion language, a design-token reference doc, and a more distinctive visual identity beyond "clean dark serif app."

---

## Kitchen-workflow friction points

1. **Soft keyboard clash:** `−` on scaler won't summon iOS numeric pad. Finger is damp, keyboard is wrong, taps feel fragile.
2. **Can't re-scale mid-cook:** miscounted servings → exit cook mode → detail → re-scale → re-enter. ~10s with wet hands.
3. **Parallel timers impossible:** "sear 3min + reduce 5min at the same time" requires a second phone-alarm.
4. **No voice:** hands dirty, eyes on stove; every step advance needs a wipe + tap or a swipe.
5. **Shortcut discoverability:** `/`, `f`, `Esc` are invisible to any user except JC after he remembers them.
6. **No mise-en-place on detail:** prep checkboxes live only in cook mode.
7. **Print is an afterthought:** no "print this" on detail.
8. **Tag truncation silent:** if ≤12 tags, `f` does nothing and user sees no hint.
9. **No collab awareness:** silent-clobber risk when a second chef edits a recipe already open.
10. **No version history:** risky for team-owned recipes.

---

## Top 10 premium opportunity targets (WOW-to-risk)

Ranked by (delight × ease).

1. **Voice "next step" in cook mode** — WOW 9 / risk 3. Web Speech API, swipe fallback.
2. **Parallel ingredient timers** — WOW 8 / risk 2. State redesign only, no API.
3. **Recipe templates** (breakfast, pasta, dessert) — WOW 7 / risk 2. JSON seed + prefill.
4. **Mise-en-place checkboxes on detail page** — WOW 6 / risk 1. localStorage sync with cook mode.
5. **AI ingredient substitution** — WOW 8 / risk 6. Claude API, rate + hallucination risk.
6. **Shortcut cheat sheet + tooltips** — WOW 6 / risk 1. UI only.
7. **Aisle-grouped shopping list** — WOW 7 / risk 3. Needs ingredient taxonomy.
8. **Realtime collab hints** — WOW 7 / risk 5. Supabase Realtime.
9. **Voice-read step text** — WOW 6 / risk 2. Web Speech synthesis.
10. **Version history + rollback** — WOW 6 / risk 4. DB schema + timeline UI.

---

## Lane assignments (read-only reminder)

| Team | Lane | Direction |
|---|---|---|
| A | Editorial-Magazine | Typography-driven, layout-centric, print-grade hierarchy, restrained motion |
| B | Kinetic-Motion | Choreography-first, physics, spring systems, haptics, motion as primary language |
| C | Spatial-3D | WebGL/WebGPU, depth, parallax, shaders, dimensional materiality |
| D | Brutalist-Raw-Luxe | Monospace rebellion, grid density, stark contrast, "ugly-beautiful" luxury |
| E | Ambient-Atmospheric | Light, glass, aurora, volumetric colour, mood-driven skins, time-of-day awareness |

Teams must push their lane to its extreme and not hedge into others' territory. Teams run silent — no peeking.

## Deliverables checklist (per team)

- `research.md` — 10+ concrete 2026 references with short thesis.
- `design-spec.md` — visual system (tokens, type scale, motion language, component rules, 3 killer moments).
- `mockup.html` — standalone self-contained HTML/CSS/JS demonstrating login + list + detail + cook at minimum.
- `implementation-plan.md` — file-by-file change list against the real repo.
- `key-snippets/` — decisive TSX/CSS (shader, motion primitive, new layout system, whatever is core).
- `stability-report.md` — breakage risk, perf budget, a11y, security, mitigations.
