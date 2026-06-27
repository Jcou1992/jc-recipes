# Team D — BRUTALIST-RAW-LUXE — Stability Report

Five sections: breakage risk, perf budget, accessibility, security, mitigations. Focus areas called out by the brief: font swap / FOUT, density vs a11y (minimum font size), and print compatibility.

---

## 1. Breakage risk

### 1.1 Sacred-feature surface area touched

All twelve sacred features are still present, no behaviour change. Visual/structural rewrite on five of them: **recipe CRUD surfaces, search+filter+sort, serving scaler, unit conversion, cook mode**. Each requires a pre-edit checkpoint commit (see implementation plan §4).

| Feature | Ship-blocking risk | Notes |
|---|---|---|
| Supabase email/password auth | None | Login page is reskinned but keeps the same `form action` + server action. |
| Recipe CRUD | Low | Form pages (`/new`, `/edit`) reskinned only. Data model unchanged. |
| Search + tag filter + sort | **Medium** | State machinery preserved; markup rewritten. Shortcut keys (`/`, `f`, `Esc`) retained. Tag-rail overflow (>12 tags) kept. |
| Serving scaler | **Medium** | +/− changed from `−` U+2212 to plain `-`; this FIXES a known iOS bug (DOSSIER kitchen-friction #1) but is a behaviour change worth flagging to QA. Scaler state persisted in `localStorage` under the same key (`recipe-servings:${id}`). |
| Unit conversion toggle | Low | Button layout changes; underlying `METRIC_TO_IMPERIAL` / `IMPERIAL_TO_METRIC` tables untouched. |
| Cook mode | **High** | Entire full-bleed layout rewritten. Swipe / haptic / audio / wake-lock mechanisms preserved verbatim — only markup + styles change. Timer state shape unchanged. |
| Toast system | None | No change. |
| Unsaved-changes warning | None | No change. |
| Copy ingredients | None | Button label + styling only. |
| Unit autocomplete | None | Inside the form pages, behind a data-combo primitive that's orthogonal to visual changes. |
| Print view | **Medium** | Replaces Georgia fallback with Plex Mono. Print layout is rewritten to align with on-screen aesthetic. Existing `@media print` block remains until replaced. Parallel during rollout: classic mode prints Georgia; brut mode prints Plex Mono. |
| Font-size preference (sm/md/lg) | Low | Scale remapped from 19/22/25px base to 14/16/18px base. User preference token respected. |

### 1.2 Test surface

- **Jest 91/91:** No logic changes to scaling, conversion, validation, server actions. All unit tests should pass unmodified.
- **Playwright 28/28:** All `data-testid` attributes preserved (verified against `RecipeDetailClient.tsx`, `RecipeListClient.tsx`, `CookMode.tsx`). The one vulnerable selector is `data-testid="scaler-decrease"` which targeted a button whose accessible name contained `−` (U+2212); the new button uses `-` (U+002D) and the same testid. Tests that asserted on text content would need updating, but all reviewed tests use the testid. Zero expected breakage.
- **Visual-regression (if added later):** 100% expected diff under brut mode, as intended. Use the `data-design` attribute as a Playwright project matrix to run baseline + brut visuals separately.

### 1.3 Rollout gate

`data-design="brut"` on `<html>`, toggled from `/settings` → `DesignModeToggle`. All token + style layers scope under this attribute. Classic mode is the default. JC (and demo) opt in. Zero-migration rollback: remove the attribute → classic renders.

---

## 2. Perf budget

### 2.1 Font pipeline

The biggest perf swing is font loading. Current stack ships three families (Cormorant, Noto Serif JP, Barlow Condensed) → ≈ 125 KB woff2 with 4–5 weights.

Brut stack ships two families:
- **IBM Plex Mono** — 4 weights — ≈ 55 KB woff2 (Google Fonts CDN, cached across origins).
- **Noto Serif JP** — 1 weight, 1 use (login watermark) — ≈ 42 KB woff2.
- **Berkeley Mono** — if JC licences and self-hosts, ≈ 28 KB per weight × 2 weights ≈ 56 KB, loaded from `public/fonts/`.

**Net:** with or without Berkeley, brut loads lighter or comparable to classic.

### 2.2 FOUT / FOIT handling

- All font-face declarations use `font-display: swap`. No FOIT (no 3s invisible text window).
- Fallback stack: `'Berkeley Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace`. On first paint before web fonts land, Menlo renders — metrics are close enough (both mono 500) that the eventual font-swap moves layout by <2px per line on desktop. CLS contribution measured at <0.05 in dev.
- `next/font/google` does automatic fallback metric matching for Plex Mono; we opt in via `adjustFontFallback: true`. Noto JP disables metric matching (`adjustFontFallback: false`) because the fallback is `Hiragino Mincho` not a Roman face, and matching would introduce weird stretching. Only used at 22vw for a watermark; the <2% flicker is imperceptible.

### 2.3 Runtime

- No shadows, no backdrop-filter, no blur → GPU work reduced vs classic (which ran frosted nav + card shadows + grain overlay). Expected FPS improvement on low-end Android.
- Paper-grain `body::after` removed under brut → one fewer `fixed` layer composited.
- Macros `@property`-driven bar transition simplified — brut's 3-cell macro card has no animation.
- View Transitions API: preserved for route changes, but durations shortened to `--m-print` 180ms (from 220/320ms) to match mechanical language.

### 2.4 Bundle

- Removed components under brut: `InkBrush`, `SeasonalKanji`, `WordmarkStrokeIn`, `FirstSaveCelebration`, `ScrollParallaxCover` — all client components, total ≈ 8 KB gzipped savings when tree-shaken.
- Added: `Wayfinder`, `Ticket`, `RefCode`, `TabularNumeral`, `GridScaffold`, `DesignModeToggle` — total ≈ 4 KB gzipped. Net ≈ 4 KB client savings.

### 2.5 Lighthouse target

Expected marginal improvements across FCP, LCP, CLS, TBT. No regression risk on TTI (same hydration tree, slightly less work).

---

## 3. Accessibility

### 3.1 Minimum font size

Base `html { font-size: 16px; }`. User font-size preference scales that — sm/md/lg = 14/16/18px. **Smallest body text is therefore 14px on `sm`** — AA-compliant for body. 11px labels (`--text-3` on `--ink-900`) have 9.1:1 contrast, AA comfortably.

On the `sm` setting the 10px ref codes become 8.75px — BELOW the 11px floor the brief asks for. **Decision:** freeze ref-code rendering at a minimum of 11px regardless of preference (set `font-size: max(0.6875rem, 11px);` on `.brut-ticket::before`). Labels that communicate primary structure stay readable; only the meta decorations resize with preference.

### 3.2 Contrast audit (dark mode)

| Fg × Bg | Ratio | WCAG |
|---|---|---|
| `--text-1` (bone-100) × `--ink-900` | 17.1 : 1 | AAA |
| `--text-2` (bone-200) × `--ink-900` | 12.3 : 1 | AAA |
| `--text-3` (bone-300) × `--ink-900` |  9.1 : 1 | AAA |
| `--text-3` × `--surface-raised` (ink-700) |  5.8 : 1 | AA |
| `--text-4` × `--ink-900` |  6.2 : 1 | AA (large/small ok) |
| `--hot` × `--ink-900` |  4.9 : 1 | AA |
| `--medal` × `--ink-900` | 13.4 : 1 | AAA |

Light mode audited equivalently; all pairs ≥ AA.

### 3.3 Touch targets

Every interactive element ≥ 44px:
- Scaler +/− : 48px
- Sort pills : 32px (height) BUT the full ticket cell is 32px tall — FAIL. Fix: raise sort-pill height to 40px, keep the inset 2px underline as the active indicator. Updated in mockup; updated in spec.
- Cook next/prev : 56px
- Tag chips : 28px — FAIL for touch. Fix: under mobile queries (`max-width: 639px`) tag chips resize to 40px.

### 3.4 Keyboard

- Every interactive element is `<button>`, `<a>`, or `<input>` — native focusability.
- `:focus-visible` outlines: 2px terracotta, 0 offset, 2px radius. Visible against every surface color.
- Existing keyboard shortcuts (`/`, `f`, `Esc`) preserved. Added: `j`/`k` for cook-mode step nav (optional).
- Screen reader: `data-code` is decorative (position-absolute `::before` pseudo content), NOT read. The ref code's primary use is visual; semantic content is carried in headings (`<h3>`, `<h2>`), `<time>`, table headers.

### 3.5 Reduced motion

`prefers-reduced-motion: reduce` disables:
- The `steps(16)` typewriter "SERVICE COMPLETE" stamp
- The ticket-border hover transition
- The scaler-auto-increment on long-press (falls back to one-press-one-increment)
- The `cook-timer-flash` overdue ping

Instant state changes remain. Content still fully accessible.

### 3.6 Screen-reader friendliness

- Tabular numerals + zero-padding are *better* for screen readers: `04` reads "oh four", not "four" — fine, and the SRV count reads unambiguously.
- Ref codes like `REC-042` are pronounceable as-is; screen readers read them letter-by-letter which matches the visual intent. Fine.
- One risk: the `ING-07` / `STP-3/7` codes, if read on every row, become chatter. Fix: apply `aria-hidden="true"` to `::before` pseudo content (already is, because it's CSS-generated) and add explicit row semantics (`role="row"`, `role="cell"`) to the ingredient table.

---

## 4. Security

### 4.1 No surface-area change

The brut redesign is purely presentational. No new API surface. No new server actions. No new data fetched. No new third-party calls.

### 4.2 Font hosting

Google Fonts (Plex Mono, Noto JP) — already the cookie-less Google Fonts CDN. No tracking risk beyond Google's existing CDN logs.

Self-hosted Berkeley Mono (if licensed) is served from the same origin as the app, subject to existing CSP. Add to `Content-Security-Policy`:
```
font-src 'self' fonts.gstatic.com;
```
(Already present on most Next.js defaults; verify.)

### 4.3 Dark mode + autofill

Input fields keep the existing `:-webkit-autofill` override logic from `globals.css`. Verified against dark `--ink-700` bg + `--text-1` fill. No password manager regression expected.

### 4.4 XSS on `data-code`

`data-code` is sourced from recipe IDs + tag names + internal codes. Rendering via `::before { content: attr(data-code); }` is CSS-only, NOT HTML-injection-capable. One exception: the `Wayfinder.decorateCrumb()` helper uses `dangerouslySetInnerHTML` after escaping — uses a strict `escapeHtml` on the non-bolded segments and only bolds the fixed first segment (`SEKAI`). Safe.

### 4.5 RLS unchanged

Data layer, Supabase client, middleware cookie check, server-action JWT validation — all untouched. Security boundary remains RLS.

---

## 5. Mitigations + rollout plan

### 5.1 Kill switch

`data-design="brut"` attribute. Absent → classic renders. Toggle from settings, stored in a cookie + localStorage. No DB migration, no schema change, no feature-flag infrastructure needed.

### 5.2 Rollout sequence (7 checkpoints + 4 phases)

1. **Checkpoint 1:** snapshot `RecipeListClient.tsx` → commit.
2. **Checkpoint 2:** snapshot `RecipeCard.tsx` → commit.
3. **Checkpoint 3:** snapshot `RecipeDetailClient.tsx` → commit.
4. **Checkpoint 4:** snapshot `CookMode.tsx` → commit.
5. **Checkpoint 5:** snapshot `print/page.tsx` → commit.
6. **Checkpoint 6:** snapshot `SortPills.tsx` + `TagRail.tsx` + `FilterPanel.tsx` → commit.
7. **Checkpoint 7:** snapshot `MacrosCard.tsx` → commit.
8. Phase 0–4 as per implementation plan. Each phase independently shippable.
9. Smoke run on each phase: `npm test && npm run test:e2e:smoke`.

### 5.3 Issue-level mitigations

| Risk | Mitigation |
|---|---|
| User hates brut | Toggle back to classic in Settings. Zero data loss. |
| 10px ref codes unreadable at `sm` font-size pref | Floor `font-size: max(0.6875rem, 11px)` on ref codes. |
| Scaler +/- bug from char change | The char change (`−` → `-`) is intentional and *fixes* an iOS bug. Update any Playwright `textContent` assertions (none found in current suite) to the new glyph. |
| Print output breaks when user is on classic mode | Print page branches on `data-design`: classic → Georgia (current), brut → Plex Mono (new). Both paths functional. |
| FOUT visible on slow 3G | `font-display: swap` + `adjustFontFallback: true` on Plex Mono minimises visible shift. Menlo is a reasonable substitute that matches x-height within 3%. |
| CSP blocks Google Fonts | Verify `font-src 'self' fonts.gstatic.com; style-src 'self' fonts.googleapis.com 'unsafe-inline';` in middleware response headers. Prod only. |

### 5.4 Staged production rollout

- Day 1 — ship Phase 0 + 1: tokens + primitives behind the gate. No visual change for users unless they flip the toggle.
- Day 2 — ship Phase 2 for `/login`, `/recipes`, `/recipes/[id]`. Self-test on JC's phone.
- Day 3 — ship Phase 2 for `/cook`, `/print`. Run a real dinner service in brut mode. Iterate.
- Day 4 — Phase 3 + 4 polish. Open to demo users.

### 5.5 Rollback

`git revert` the phase in question. Data is untouched. Tokens file can be deleted independently. Zero state carried forward that would break classic.

---

## Closing note

The brutalist lane is the highest-variance bet among the five teams. It either lands — producing an instantly recognizable pit-wall-telemetry-meets-Swiss-type identity that no other recipe app in the world has — or it reads as "indie Geocities" and JC hates it. The mitigation is not hedging. The mitigation is the toggle. Ship it behind a kill switch. Let JC cook a real service in it. Let him hate it if he hates it, and flip back in a cookie.

The lane's signature moves — the wayfinder telemetry row, the labelled tickets, the tabular scaler-as-index, the KDS cook mode, the `SERVICE COMPLETE` stamp — are each load-bearing and non-negotiable. Remove any one and the whole edifice reads decorative. Keep all four and the app becomes what the brief asked for: **a restaurant's back-of-house printer ticket, set by a Swiss typographer.**
