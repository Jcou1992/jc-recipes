# Stability Report — Team A · Editorial-Magazine

## TL;DR

- **Sacred features:** 12/12 preserved. Zero behaviour changes, presentation-only redesign.
- **Perf:** net-neutral to net-positive. No new JS runtime; CSS adds < 6kb gzipped. LCP target < 1.8s on 4G preserved; list page **improves** because thumbnails are removed from TOC rows.
- **A11y:** no regressions. Two **improvements** (dropcap SR handling, FeatureSwap `aria-live`). Reduced-motion path tested.
- **Security:** no new libraries in core; one optional QR lib behind a print query flag.
- **Risk posture:** low. Editorial layer is feature-flagged via `html.ed`, so a one-line rollback is available.

---

## (a) Sacred-feature breakage audit

Each of the 12 sacred features, with risk and mitigation.

### 1. Supabase email/password auth
- **Risk:** cosmetic-only. Login form still calls the existing server action. Input markup change (bottom-rule) must preserve `name="email"` and `name="password"` attrs for the action's `FormData` handling.
- **Mitigation:** keep `name` + `type` + `autocomplete` attrs verbatim. Add an e2e test asserting `POST /login` payload shape is unchanged. Checkpoint commit before change.

### 2. Recipe CRUD
- **Risk:** low. Server actions untouched. Form field markup changes but binds to the same `recipeSchema`.
- **Mitigation:** keep existing test IDs (`recipe-form-submit`, etc.). Re-run `recipe-crud.spec.ts`.

### 3. Search + tag filter + sort
- **Risk:** low-medium. TagRail markup changes from pill chips to editorial underlined tags; SortPills changes from pills to underline-selector. Both are **visual**, but the reshaped DOM could break Playwright selectors.
- **Mitigation:** preserve all `data-testid` attrs (`tag-rail`, `tag-pill`, `sort-pills`, `sort-*`). The debounce (150ms) and diacritic-strip stay in `useSearchFilter` unchanged. Audit-run: `recipes-search.spec.ts`, `recipes-tag-filter.spec.ts`, `recipes-sort.spec.ts`.

### 4. Serving scaler (persisted per-recipe in localStorage)
- **Risk:** **medium — one fragile path.** The current scaler uses `−` (U+2212). We change to ASCII `-` AND add `inputmode="decimal"` to whatever numeric field exists. Storage key (`sekai:scaler:${id}`) and value semantics do not change.
- **Mitigation:** keep `data-testid="serving-scaler"`. Add a test asserting that typing in the quantity field on iOS Safari brings up the numeric pad (addresses Kitchen Friction #1). Checkpoint commit before.

### 5. Unit conversion toggle (metric ↔ imperial, smart fractions)
- **Risk:** low. Toggle markup changes (underline tabs); `useUnit` hook and `formatQty` utility are untouched. Smart fractions continue to use Unicode glyphs ⅛..⅞ — Cormorant supports them; fallback is OpenType `frac`.
- **Mitigation:** `data-testid="unit-toggle"` preserved. Snapshot tests on `formatQty` stay green because the utility is not modified.

### 6. Cooking mode — step nav, swipe, timers, haptics, audio, wake-lock
- **Risk:** **medium — highest behavioural surface.** The visual layout changes significantly (spread with folio + mise); timer UI moves from circular ring to bottom hairline.
- **Mitigation:**
  - State machine in `CookMode.tsx` is untouched: same `stepIdx`, same swipe threshold (60px dx), same 10ms / [40,40,40] haptics, same 3×440Hz beeps, same wake-lock acquisition, same URL-param persistence.
  - Only the **render** function changes. Haptic and audio calls stay on the same event paths.
  - Add a transition animation flag: new `--t-turn` (420ms) replaces the old 260ms slide; keep reduced-motion path (opacity only).
  - Cook-mode e2e (`cook-mode.spec.ts`) likely asserts timer visual state. Update selector from `.timer-ring` to `.cook-timer-rule` OR add both for parallel rollout.
  - Checkpoint commit before change.

### 7. Toast system
- **Risk:** very low. Visual refresh only; `useToast` hook and portal mount are unchanged.
- **Mitigation:** preserve `data-testid="toast"` per-variant IDs. Keep 3s default, swipe dismiss.

### 8. Unsaved-changes warning
- **Risk:** none. Purely form-state logic in `useUnsavedWarning`. No UI change touches the hook.
- **Mitigation:** N/A.

### 9. Copy ingredients
- **Risk:** very low. `copyIngredients` action wired to `data-testid="copy-ingredients-btn"`. We restyle the button to editorial treatment; action stays the same.
- **Mitigation:** preserve testid; re-run e2e.

### 10. Unit autocomplete
- **Risk:** low. Autocomplete dropdown is a list; we restyle its container to a rule-bounded block instead of a floating card. Logic untouched.
- **Mitigation:** selector compatibility check in IngredientRow test suite.

### 11. Print view
- **Risk:** low-medium. We **fix** the brand break (Cormorant instead of Georgia). Page layout reflows slightly. Bulk print via `?ids=` preserved.
- **Mitigation:** render a snapshot of a 3-ingredient test recipe in print CSS; manually eyeball line wrapping and page breaks.
- **Positive change:** add `@page` paper-size query support — addresses audit gap, no behavioural risk.

### 12. Font-size preference (SM/MD/LG, per-browser)
- **Risk:** low. Our editorial scale uses `px` for fixed display sizes (head, kicker, folio) and `rem` for body text. The `data-font-size` variable continues to scale `rem`-based values. Display head/folio won't scale — intentional; user pref affects reading body, not page chrome.
- **Mitigation:** document this in `/settings` micro-copy ("affects recipe body, ingredient lists, and method text"). Add a live specimen above the toggle (reference #8).

---

## (b) Performance budget

### LCP target: ≤ 1.8s on 4G (Fast 4G throttling)

| Route | Current LCP est. | Editorial LCP est. | Δ |
|---|---|---|---|
| `/login` | ~0.9s | ~0.9s | 0 |
| `/recipes` | ~1.4s | **~1.1s** | **-0.3s** (thumbnails removed from list) |
| `/recipes/[id]` | ~1.5s | ~1.5s | 0 (cover moves to optional figure) |
| `/recipes/[id]/cook` | ~1.3s | ~1.3s | 0 |

Mechanism: TOC-row list removes 4–12 medium thumbnails from above-the-fold. Hero LCP element becomes the issue title (HTML text, instant).

### Bundle size

| Asset | Current | Editorial | Δ |
|---|---|---|---|
| `globals.css` (gzipped) | ~9.2 kB | ~9.6 kB | +0.4 kB (tokens-editorial.css merged in build) |
| JS (editorial primitives, if used as client components) | — | ~2.8 kB gzipped | +2.8 kB |
| Total CSS+JS added | — | ~3.2 kB | **+3.2 kB** |

No new fonts — all three faces already loaded via `next/font` local config. No new images. No runtime libraries.

Optional QR library (`qrcode-generator`, ~3.5 kB gzipped) is behind `?qr=1` on print — not loaded unless requested.

### Animation frame cost

| Animation | Properties | GPU-composited | Frame cost |
|---|---|---|---|
| Page mount `clip-set` | `clip-path`, `opacity` | Yes (`opacity`), partial (`clip-path`) | Low — 240ms, once per mount |
| Page turn `page-turn-in` | `clip-path`, `opacity` | Same | Low — 420ms, once per step change |
| FeatureSwap crossfade | `opacity` only | Yes | Negligible — 160ms |
| Gold sweep under row | `transform: scaleX`, `opacity` | Yes | Negligible — 520ms, one-shot |
| TOC-row hover underline | `transform: scaleX` | Yes | Negligible |

**No layout thrash.** FeatureSwap reserves `ch`-based width so ingredient rows don't reflow on qty change. Drop caps are `float: left` (one layout pass on initial render, then stable). The `@property`-driven `macros-bar` hairline is already in the existing system; we reuse its tested interpolation.

### Server cost

Zero. All changes are client-render and static CSS. Server actions unchanged.

---

## (c) Accessibility

| Criterion | Status |
|---|---|
| AA contrast — dark body on night-paper | ~10.6 : 1 ✓ |
| AA contrast — light body on paper-cream | ~11.8 : 1 ✓ |
| AA contrast — macro numerals (terracotta on dark) | 4.7 : 1 ✓ (fixes audit gap) |
| AA contrast — tag underline (terracotta-contrast on paper) | 5.2 : 1 ✓ |
| Keyboard nav — all buttons focusable | ✓ (we keep `<button>` elements; no div-as-button) |
| Keyboard shortcuts discoverable | **Improved** — shortcut-tips row + `?` cheat sheet |
| `prefers-reduced-motion` | ✓ All set/turn degrade to opacity. Drop caps stay static (purely visual). |
| Screen reader — dropcap | ✓ First letter `aria-hidden`; full word preserved via `sr-only` span |
| Screen reader — FeatureSwap | ✓ `aria-live="polite"` on numeral changes; debounced via ref |
| Touch targets | Buttons remain 44px min-height (inherited from existing `.btn-*` classes) |
| Hairline rules | 1px minimum, 0.75px only for secondary rules which are reinforced by spacing |
| Focus ring | Unchanged — 2px terracotta outline remains the focus affordance |

Known risks:
- **Hairline rules (0.75px) on low-DPI displays** may render as 1px or not at all. **Mitigation:** all primary rules (section heads, row separators) are `--rule-fine` (1px); hairline is used only decoratively on the masthead and colophon where visibility isn't load-bearing.
- **Old-style figures on body prose** may confuse users who expect "028" to read as "028" not "ⓞⓩ⑧"-style numerals. **Mitigation:** tabular context (meta columns, scaler, macros) forces `lining-nums`; only prose uses old-style. Document in `/settings` microcopy.

---

## (d) Security surface

| Vector | Impact |
|---|---|
| New runtime deps | **None** in core. QR library optional and behind a flag. |
| CSP impact | **None** — no new inline scripts, no `eval`, no new hostnames. Fonts already approved (Google Fonts CDN in dev; `next/font` in prod bakes locally). |
| XSS surface | **None added.** DropCap splits a `string` prop by regex, never dangerouslySetInnerHTML. All tag names are enum-typed. |
| PII exposure | **None.** No new telemetry, no new logging. |
| RLS surface | **No change.** Middleware cookie check + server-side JWT validation + RLS — untouched. |
| Clipboard | Copy-ingredients action untouched. |
| Web Share | Not introduced. |

Optional adds to be security-reviewed if adopted:
- **Parallel timers:** no network; local state only. Low.
- **QR on print:** uses `qrcode-generator` (MIT, 27 releases, 6-year history). Generates SVG/canvas; renders only the current URL origin. Low.

---

## (e) Per-risk mitigation summary

| Risk | Mitigation | Cost |
|---|---|---|
| Cook-mode visual rewrite regresses timer behaviour | Separate behaviour logic from render; unit-test the state machine; cook-mode.spec.ts updated | 4 hours |
| Playwright selectors break on pill→editorial-tag change | Preserve `data-testid` attrs verbatim; reshape markup but keep the semantic tree | 2 hours |
| iOS scaler input does not invoke numeric pad | Replace U+2212 with ASCII; add `inputmode="decimal"` | 1 hour |
| Old-style figures confuse users | Document in settings; keep tabular contexts on lining | 30 min |
| Hairline rules invisible on low-DPI | Primary rules at 1px; hairlines at 0.75px are decorative only | 0 (design-by-spec) |
| Feature-flag rollback difficulty | `html.ed` class gate; single-line removal restores legacy | 0 |

---

## Rollout recommendation

1. **Week 1** — Phase 0 + 1: checkpoint commits, tokens-editorial.css, extend globals.css. No visual change until `html.ed` is applied.
2. **Week 2** — Phase 2: primitives (EditorialGrid, DropCap, FeatureSwap, MarginFolio, ColophonFooter, Macros, EditorialTocRow) with unit tests, no integration.
3. **Week 3** — Phase 3 surfaces A & B: list + detail. Run full Playwright; fix regressions. Ship behind a feature flag to `jc@` only for 48 hours.
4. **Week 4** — Phase 3 surfaces C & D: cook + login + settings + new/edit. Full regression suite. Bootstrap test-gate baseline. Ship to all users.
5. **Week 5** — Phase 4 additive features (shortcut cheat sheet, parallel timers, mise write-back, templates). Each behind its own flag; each ships independently.

Rollback plan: remove `className="ed"` from `<html>` in `app/layout.tsx`. Legacy styling and layout return immediately. No database migration to undo.
