# Implementation Plan — Team A · Editorial-Magazine

> Strategy: **extend, don't replace.** All additions are additive to the current token system, driven by a new `tokens-editorial.css` imported after `globals.css`. Feature-flag with a CSS class on `<html>` (`class="ed"`) so the old system can be re-enabled in one line if anything regresses. Sacred features (scaler, unit toggle, cook-mode, toast, unsaved-changes, keyboard shortcuts, etc.) remain wired exactly as they are — we change **presentation**, not **behaviour**.

---

## Phase 0 — safety net (checkpoint commit before edits)

Per the dossier rule, any improvements to sacred features require a checkpoint commit first. Phase 0 creates that anchor.

- **`.test-gate/baseline.json`** — no change, but bootstrap baseline re-runs after phase 1.
- **checkpoint** — `chore(editorial): checkpoint before editorial-magazine redesign` so each sacred feature can be reverted in isolation.

## Phase 1 — tokens layer (additive, low risk)

### `app/globals.css`
- Keep every existing token. Only additions.
- Add editorial tokens at the top of the `:root` block: `--paper-*`, `--night-*`, `--ink-body/rule/caption`, `--rule-hair/fine`, the 6-unit `--r-*` rhythm, and the extended `--t-whisper/set/turn/folio` motion scale (`--motion-*` stay for backward compat).
- Expand the tabular-num utility with `font-variant-numeric: lining-nums tabular-nums;` and add `.oldstyle` utility. Add `.kicker` and `.caption` utilities.
- Fix the brand break flagged in audit: `@media print` — replace `font-family: Georgia` with `Cormorant Garamond` with Georgia fallback.

### `app/tokens-editorial.css` (NEW)
- The full editorial overlay from `design-spec.md` §1 and key-snippets. Loaded after `globals.css`. Gated by `html.ed` selector so **legacy UI continues to work** while we roll.

### `app/layout.tsx`
- Add `<link rel="stylesheet" href="/tokens-editorial.css">` or import statement after `globals.css`.
- Add `className="ed"` to `<html>` once the rollout is verified.

## Phase 2 — primitives (new reusable components)

### `components/editorial/EditorialGrid.tsx` (NEW — key snippet)
- Issue-frame wrapper: max-width 62rem, consistent padding, masthead-aware top spacing. Used by list + detail.
- Variants: `variant="list"` | `"detail"` | `"cook"` | `"form"`.

### `components/editorial/DropCap.tsx` (NEW — key snippet)
- Floats a paragraph's first letter 3 lines, terracotta, Cormorant 500, no decorative quote glyph.
- Accessible: wraps first letter in `<span aria-hidden="true" class="dropcap">` with the full word preserved for SR.

### `components/editorial/RuleLine.tsx` (NEW)
- `<hr>` renamed into a styled rule with variants `hair | fine | double` and optional animated `draw` entrance.

### `components/editorial/MarginFolio.tsx` (NEW)
- Margin numeral used on step list and cook mode. Handles old-style vs lining, font-size responsive.

### `components/editorial/FeatureSwap.tsx` (NEW — key snippet)
- Wraps a value that crossfades (160ms) on change, with reserved ch-width. Used for qty column in ingredients, scaler value, macro numerals.
- Imperative API: `<FeatureSwap value={q}>{q} {unit}</FeatureSwap>`.

### `components/editorial/ColophonFooter.tsx` (NEW)
- Rendered once at the bottom of recipe detail and on login. Accepts `setBy`, `lastEdited`, `folio`.

## Phase 3 — surface by surface

### `app/(auth)/login/page.tsx`
- Replace centered card with editorial layout: kicker → wordmark (`SEKAI 世界`) with clip-path wipe animation (already exists, keep it) → hairline rule → italic dek → form → colophon footer.
- Form: bottom-only hairline underline inputs, labels in Barlow-kicker above. Primary button gets ink-fill sweep hover (see snippet).
- **Sacred-feature integrity:** auth action + Supabase client unchanged; only presentation changes.

### `app/(app)/recipes/page.tsx` + `components/recipes/RecipeListClient.tsx`
- Replace card grid with **TOC rows** (see snippet `EditorialTocRow.tsx`). Grid `88px 1fr auto`: folio numeral, title+lede, tabular meta.
- No thumbnails (cover images move to detail page only).
- Tag rail: convert `TagRail.tsx` from pill chips to **underline-set tags** (solid underline = selected, dotted = available). Keep the `f` shortcut, selection logic, and diacritic-strip search untouched.
- Add `shortcut-tips` row at the bottom of the list (kbd hints) — addresses audit "shortcuts have no discoverability."
- `SortPills.tsx`: change visual from pills to **running-head selector**: `Sort: Most Recent · Title · Yield`, with underline-on-active.
- Keep: debounced search, bulk select, shift+range, empty-state InkBrush (InkBrush becomes a small footer mark rather than centered hero).

### `components/recipes/RecipeCard.tsx`
- Renamed-in-intent to "TOC row" but kept as `RecipeCard.tsx` (so nothing else needs updating).
- Rewrite markup to the TOC-row format. Hover affordance: terracotta folio + title underline draw (see snippet).
- `@media (hover: hover)` guard preserved — no sticky hover on touch.

### `app/(app)/recipes/[id]/page.tsx` + `components/recipes/RecipeDetailClient.tsx`
- Use `EditorialGrid variant="detail"`.
- New header: kicker (`N° {id} · {tags} · {totalTime}`) + display title + italic dek + `detail-byline`. Centered manuscript block.
- Replace `ScrollParallaxCover` with an optional **figure-with-caption** block (if recipe has a cover image). Cover is a plate, not a hero. Caption set small in Barlow-kicker underneath.
- Body: two-column `Ingredients | Method`. Ingredients use `DropCap` on the first row. Method uses margin folio (numbers in margin via `MarginFolio`).
- Detail controls: scaler + unit toggle + actions sit in a rule-bounded row. **Print action** added here (addresses audit: "no print button, must export→PDF").
- Scaler button markup: change `-` (U+2212) to regular `-` AND set `inputmode="decimal"` on the quantity input. Preserve haptic on +/– and ripple on ingredient tap.
- Unit toggle: wrap qty in `FeatureSwap` so the swap is a crossfade + tabular-width reserved column. Keep smart-fraction logic.
- Macros: replace the existing `MacrosCard` gold-on-dark small numerals with a **4-column ledger** (`Macros` component key-snippet). Lining figures, big numerals, italic unit suffixes. Better contrast per audit.
- Colophon footer replaces the current button-only bottom bar.

### `components/recipes/MacrosCard.tsx`
- Rewrite markup into the macro ledger (see `Macros.tsx` snippet). Keep `macros-bar` animation for the @property morph; it reads as a hairline rule in editorial mode.

### `app/(app)/recipes/[id]/cook/page.tsx` + `components/recipes/CookMode.tsx`
- Replace the card carousel layout with **spread**: grid `160px 1fr 260px` (folio · body · mise).
- Swipe + arrow-key nav unchanged; the transition animation changes from slide-translate to **clip-wipe (page-turn)**. Duration `--t-turn` (420ms). Keep swipe threshold 60px, keep haptics.
- Drop-cap on step body; first letter of step text rendered via `DropCap`.
- Margin folio uses `MarginFolio` at `--type-folio` (very large, low-contrast).
- Mise-en-place right column: per-step mise ingredients checklist (already computed from ingredient list in state). **Addresses audit gap "no mise-en-place checkboxes on detail."** Note: write-back to detail via localStorage so detail page can show the same checkmarks (additive feature).
- Timer UI changes from the circular ring progress to **bottom hairline**: `fixed, bottom:0, height:2px` drains left-to-right. Gold flash on completion, not chirp-only.
- Keep: wake-lock, audio beeps (respect mute pref), 10ms check haptic, `[40,40,40]` finish, URL params, "start again."
- Per audit: keep ingredient list visible within the mise aside; do not enforce read-only — mise checkboxes are interactive.

### `app/(app)/recipes/print/page.tsx` + `components/print/PrintAutoTrigger.tsx`
- Replace Georgia with Cormorant fallback Georgia in `@media print` (already in Phase 1 tokens fix).
- Add colophon at page footer with `RecipeN° · set by · last modified · page M of N`.
- `@page` size chooser — add `?paper=a4|letter` query → swaps `@page { size: A4|letter }`. Addresses "no A4/letter toggle."
- Optional `?qr=1` flag: small QR in footer linking back to recipe URL (uses `qrcode-generator` tiny library, ~3.5kb gzipped — see stability report for decision).

### `app/(app)/recipes/new/page.tsx` + `components/recipes/RecipeForm.tsx` + `FormWithPreview.tsx`
- Treat the form itself as a spread: labels in Barlow-kicker above bottom-rule inputs, no boxed fields.
- The live preview on ≥md screens renders the in-progress recipe in the editorial layout — the form previews exactly what will be printed.
- No change to the markdown-import tab logic.

### `app/(app)/settings/page.tsx`
- Cross-stack the sections into a ledger: space name, theme, language, font size — each with a hairline rule separator and aligned Barlow-kicker labels. Keep the toggles/logic as-is.
- Font-size preference toggle renders a **live type specimen** above the control — "A A A" at the three sizes, and body/ingredient/step rendered in the selected size — addressing the reference #8 "specimen-as-settings" steal.

### `components/brand/Masthead.tsx` (NEW, wraps existing nav)
- Add a masthead above existing nav on `/recipes` and `/recipes/[id]` when `html.ed` is present.
- Renders: left mast ("SEKAI Edition · Vol. I · 2026"), center wordmark (Cormorant+Noto Serif JP), right (nav links, user menu).

### `components/ui/ToastContainer.tsx`
- Visual pass only: replace pill container with hairline-topped strip, serif italic message, Barlow-kicker action label. Keep timing (3s), keep portal, keep swipe dismiss.

---

## Phase 4 — feature polish (net-new, addresses audit gaps)

Additive and optional — can ship after core redesign lands.

- **Shortcut cheat sheet**: `?` opens a dialog listing every shortcut. Label it "Keys — N° 1." Rule-lined.
- **Parallel timers** (cook mode): tiny chiclet row above the hairline rule showing up to 3 active timers, each with a mini progress hairline.
- **Mise-en-place write-back**: cook-mode's mise checkboxes persist per-recipe in localStorage and re-appear on `/recipes/[id]` as a mise block.
- **Recipe templates** (new form): seed JSON + "Start from a template" pill row above the form fields.

## Phase 5 — tests, gate, docs

- `jest.config.js` + unit tests — none of the logic changes; existing 91 tests should pass without modification. Snapshot tests (if any on RecipeCard/MacrosCard) need re-approval.
- Playwright: selectors largely unchanged because we preserved data-testid attributes (`serving-scaler`, `unit-toggle`, `cook-mode-btn`, `copy-ingredients-btn`). Update two probable regressions:
  - `recipes-list.spec.ts`: if it asserts "grid of cards," rewrite to "list of TOC rows."
  - `cook-mode.spec.ts`: if it asserts the circular ring, replace with the bottom progress hairline assertion.
- Bootstrap gate: `npm run test:gate:bootstrap` after all tests green.
- `CHANGELOG.md`: one line per sacred feature confirming each one still works; call out 4 new additive features.

---

## File inventory (changed / added)

Changed:
- `app/globals.css`
- `app/layout.tsx`
- `app/(auth)/login/page.tsx`
- `app/(app)/recipes/page.tsx`
- `app/(app)/recipes/[id]/page.tsx`
- `app/(app)/recipes/[id]/cook/page.tsx`
- `app/(app)/recipes/print/page.tsx`
- `app/(app)/recipes/new/page.tsx`
- `app/(app)/recipes/[id]/edit/page.tsx`
- `app/(app)/settings/page.tsx`
- `components/recipes/RecipeListClient.tsx`
- `components/recipes/RecipeCard.tsx`
- `components/recipes/RecipeDetailClient.tsx`
- `components/recipes/CookMode.tsx`
- `components/recipes/MacrosCard.tsx`
- `components/recipes/TagRail.tsx`
- `components/recipes/SortPills.tsx`
- `components/recipes/RecipeForm.tsx`
- `components/recipes/FormWithPreview.tsx`
- `components/ui/ToastContainer.tsx`
- `components/print/PrintAutoTrigger.tsx`

Added:
- `app/tokens-editorial.css`
- `components/editorial/EditorialGrid.tsx`
- `components/editorial/DropCap.tsx`
- `components/editorial/RuleLine.tsx`
- `components/editorial/MarginFolio.tsx`
- `components/editorial/FeatureSwap.tsx`
- `components/editorial/ColophonFooter.tsx`
- `components/editorial/Macros.tsx`
- `components/editorial/EditorialTocRow.tsx`
- `components/brand/Masthead.tsx`

Total: 21 changed, 10 added. No files deleted. No third-party deps added in core; QR library is optional.
