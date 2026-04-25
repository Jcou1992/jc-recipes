# Team D — BRUTALIST-RAW-LUXE — Implementation Plan

**Scope:** Turn the current SEKAI codebase into a brutalist, monospace, ticket-grammar interface in 4 controlled phases. Each phase is independently shippable behind a `data-design="brut"` root attribute so JC can toggle the look from Settings (and the other four teams' work stays reachable in parallel during contest evaluation).

**Golden rules during the conversion:**
- Every `rounded-*` class stripped from the repo (except `.rounded-full` on exactly the cook-mode step-number bubble and on `:focus-visible`).
- Every shadow deleted.
- Every `backdrop-blur` deleted.
- Every Tailwind `font-serif`-style utility replaced with `font-mono`.
- Every ingredient / step / recipe / tag gets a reference code rendered in 10–11px UPPERCASE mono at `--text-3`.
- Sacred features (detail-dossier list items 1–12) ship checkpoint-committed before any change touches them.

---

## Phase 0 — Font pipeline + design-mode gate (0.5 day)

### `app/fonts.ts` — replace font imports
```ts
import { IBM_Plex_Mono, Noto_Serif_JP } from 'next/font/google';

export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-mono',
  display: 'swap',          // FOUT-friendly — no 3s blocking period
  adjustFontFallback: true, // avoid CLS
});

export const notoJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-noto',
  display: 'swap',
  adjustFontFallback: false, // only used at huge size, metric matching unnecessary
});
```

Berkeley Mono is NOT bundled in the initial rollout; it's a JC-personal drop-in. Ship path:
1. JC licences it (USD 75, personal).
2. Drop the woff2 files in `public/fonts/berkeley-mono/`.
3. Add `@font-face` rules to `app/globals.css` with `font-display: swap`.
4. Reorder `--font-mono` var so Berkeley wins the stack on his devices that have it cached.

This avoids shipping an unlicensed font to demo@ users.

### `app/layout.tsx` — attach font vars + design-mode attr
```tsx
import { plexMono, notoJp } from './fonts';

export default async function RootLayout(...) {
  const designMode = /* read from cookie 'design-mode' */ 'brut';
  return (
    <html lang={lang} className={`${plexMono.variable} ${notoJp.variable}`} data-design={designMode}>
      <body>{children}</body>
    </html>
  );
}
```

### `app/globals.css` — add brutalist tokens (conditionally)
Wrap all Team D tokens under `:root[data-design="brut"]` so the existing theme remains untouched until toggled. Baseline tokens listed in `design-spec.md` §1.

### New file `components/ui/DesignModeToggle.tsx` — settings knob
A segmented pill of `CLASSIC · BRUT` on the settings page that writes a cookie + mirrors to `localStorage`. Server + client both read.

---

## Phase 1 — Universal primitives (1 day)

### `components/ui/Wayfinder.tsx` — NEW
Sticky 32px header. Server component. Props: `resourceCode`, `modeLabel`, `statusTint` (one of `neutral | hot`). Reads theme + font-size prefs to paint the right-most slot.

Mounted in `app/layout.tsx` above `{children}`. Auto-hides on `@media print`.

### `components/ui/Ticket.tsx` — NEW
The universal boxed container. Uses `::before` for the nameplate knock-out effect (see spec §4.1). Accepts `code`, `hot?: boolean`, `children`, optional `as='div' | 'article' | 'section'`.

### `components/ui/TabularNumeral.tsx` — NEW
`<TabularNumeral value={n} pad={2} />` — renders a number in tabular mono with a minimum digit pad. Backs the scaler digit, step-number displays, macros, timers.

### `components/ui/GridScaffold.tsx` — NEW
A thin wrapper for the 16/8/6-col grid. Props: `cols`, `children`. Emits `display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: var(--gap);` with the gap derived from `--cols` mode (8-col grid uses 16px gap; 16-col grid uses 24px gap).

### `components/ui/RefCode.tsx` — NEW
Renders a ticket code (`REC-042`, `ING-04`, `STP-3/7`, `TAG#PORK`). Props: `ns: 'REC'|'ING'|'STP'|'TAG'|'COOK'|'USR'|'VER'|'FIG'`, `id: string`. Handles the sigils (`TAG#`, `USR·`) internally.

### `lib/brut/ref-codes.ts` — NEW
Pure helpers:
- `shortHash(uuid: string): string` → 4-char base36 for REC codes.
- `fmtStep(order, total)` → `STP-3/7`.
- `fmtIng(index)` → `ING-07` (1-indexed, zero-padded).
- `fmtRec(uuid)` → `REC-A8F3`.

---

## Phase 2 — Route conversions (2 days, route by route)

### `app/(app)/recipes/page.tsx`
- Strip the existing "space name" header + terracotta `btn-primary`.
- Mount `<Wayfinder crumb="SEKAI · LIST" modeLabel={\`\${recipes.length} RECIPES\`} />`.
- Render new `<RecipeListClient>` (below).

### `components/recipes/RecipeListClient.tsx` — REWRITE (sacred feature — checkpoint commit first)

```
checkpoint commit: "brut: snapshot RecipeListClient before ticket rewrite"
```

Then:
- Remove `rounded-full` from the search input (brand rule: zero radius). Replace pill with a hard rectangle + visible 1px `--rule-strong` border.
- Sort pills → `SortPills.tsx` becomes a horizontal rule of text labels with a `box-shadow: inset 0 -2px 0 var(--brut-hot)` underline on the active one (see mockup).
- Tag rail → `TagRail.tsx` renders `#TAGNAME` labels in mono, zero radius.
- Grid: `display: grid; grid-template-columns: repeat(12, 1fr); gap: var(--s-3);`. Cards span 4/6/12. Featured card spans 8.
- Kill `InkBrush` from the empty state; replace with a 6-line ASCII ticket: `[ MISE · EMPTY ]` / `────────────` / `NO RECIPES YET.` etc.
- Result count label becomes `[ 12 / 12 RESULTS ]` in mono uppercase.

### `components/recipes/RecipeCard.tsx` — REWRITE
Every card is a `<Ticket code={\`REC-\${shortHash(id)} · FIG.03\`}>`. Contents are:
- Top meta: tags chips + `N TIME AGO · VER-N`
- Title in mono uppercase 20px
- Description in mono 12px, 3-line clamp
- 4-cell stat row: `ING | STP | SRV | TOTAL`
- Footer: `COOKED 14 TIMES · LAST 2026-04-21`
- Hover state: `border-color: var(--brut-hot); border-width: 2px;` with compensating padding so the row doesn't jump 1px.

No hero photo. No gradient. No shadow.

### `app/(app)/recipes/[id]/page.tsx` + `components/recipes/RecipeDetailClient.tsx` — REWRITE (sacred, checkpoint first)

- Wayfinder crumb: `SEKAI · REC-042 · DETAIL` + status right-slot `SCALED ×2.00` in terracotta when scaled.
- Detail head: 2px `--rule-strong` bottom border. Tag chips + code + version on first line.
- Title: mono 40px uppercase.
- Service bar: grid layout with labelled sub-blocks — `[ SCALER · REC-042 ]`, `[ UNIT · TOGGLE ]`, `[ TIME · PREP+COOK ]`, `[ EXPORT · MD/PDF ]`, `[ COOK → ]`.
- Scaler +/- buttons use plain ASCII `-` and `+`, not `−` U+2212. This single-character fix resolves DOSSIER kitchen-friction point #1 (iOS numeric pad).
- Ingredients → a proper `<table class="ing-table">` with columns `CODE | AMT | UNIT | NAME`. Each row keyed by `ING-NN`. When the scaler mutates, amounts update via `<TabularNumeral>` with no crossfade (no motion), no jitter.
- Steps → a labelled rule-bordered table with `STP-N/T` codes.
- Macros → the 3-cell `macro-bar` grid box (see mockup).
- Kill `ScrollParallaxCover`. In this lane, there IS no cover image.

### `components/recipes/CookMode.tsx` — REWRITE (sacred, checkpoint first)
Biggest conversion. Map line-by-line:
- Replace full-bleed radial-gradient background with hard `--bg`.
- Replace the 9h-round step-number badge with the brutalist `cook-step-head` block: `STP-N/T` label + verb between 2px bone rules (see mockup).
- Verb extraction: first imperative in the step body, or fallback to step index. Ship with a simple regex first: `step.content.match(/^([A-Z]\w+)/)[1]`.
- Timer: gigantic tabular digits, color swaps on state (`paused | running | overdue | done`). Flash one frame of `--late` background at overdue transition. Already spec'd.
- Swipe nav preserved. Add tabular `T+MM:SS` elapsed counter bottom.
- Completion: `SERVICE COMPLETE` stamp animated with `clip-path` + `steps(16)` — see mockup script. Medal color (`--medal`). Only time gold appears in normal flow.

### `app/(auth)/login/page.tsx`
- Kill the scale-in wordmark animation and the noren etc — they're from previous design swings.
- New structure: single centred 360px column with `SEKAI` in 64pt mono, gold 1px rule underline, caption `PRIVATE · INVITE ONLY` in 10pt letter-spaced.
- `世界` watermark in Noto Serif JP at 22vw, opacity 0.055.
- Form rows labelled `[ IN · EMAIL ]` and `[ IN · PASS ]` in small-caps above each input.
- Submit button: `[ SIGN IN → ]` mono uppercase, bone-on-ink.
- Build + build-hash strip at the bottom (`SEKAI/AUTH/v2.03 · BUILD 20260424·A8F3`) — brutalist tell.

### `app/(app)/recipes/print/page.tsx`
Already half-brutalist. Changes:
- Swap Georgia back to the app's monospace (Berkeley/Plex Mono) — the printed ticket should match the on-screen ticket.
- Add the wayfinder strip at top of each printed recipe (it prints as plain text row).
- Remove the `rounded-full` fallback on tags in the print CSS block.

### `app/(app)/settings/page.tsx`
- Add the `DesignModeToggle` (CLASSIC · BRUT) at the top of the page.
- Rewrap the three existing toggle blocks as `<Ticket>` components: `[ FIG.S1 · THEME ]`, `[ FIG.S2 · FONT SIZE ]`, `[ FIG.S3 · LANGUAGE ]`.

---

## Phase 3 — Motion + polish (0.5 day)

- Remove `InkBrush`, `SeasonalKanji`, `WordmarkStrokeIn`, `ScrollParallaxCover` from the active tree. Keep their files — classic-mode still uses them.
- Kill the body `::after` grain overlay under `[data-design="brut"]`.
- Remove frosted nav; nav becomes solid `--bg` + 2px bottom rule.
- All `.recipe-card:hover` box-shadow → `border-color` swap (spec §4.1).
- All `rounded-xl / rounded-2xl / rounded-full` under brut root → `border-radius: 0` except the cook step bubble.
- Audit every `animate-*` utility; under brut root, duration → `var(--m-tick) linear` or disabled.

---

## Phase 4 — Accessibility + density + ship (0.5 day)

- Raise the `prefers-reduced-motion` block to cover the `steps(16)` stamp (it's already covered, but double-check).
- Confirm all 11px labels pass AA (`--text-3` on `--ink-900` = 9.1:1; on `--surface-raised` ≈ 5.8:1 ✓).
- Touch targets: every button 44px min. Scaler +/− are 48px. Cook prev/next 56px.
- Keyboard shortcuts cheat-sheet (brut lane's gift to DOSSIER #5): in brut mode the wayfinder right slot rotates through three hints every 8s: `/`=SEARCH · `F`=FILTER · `ESC`=CLEAR. Non-interactive, just informational.
- Add `@media print` tweaks to match the new on-screen grammar (already 80% there).
- Jest + Playwright: existing selectors survive (we kept `data-testid` attributes throughout the rewrite; verified against `RecipeDetailClient.tsx` `data-testid="scaler-value"`, `data-testid="serving-scaler"`, etc). Run `npm test` and `npm run test:e2e:smoke` before merging any route.

---

## File touch list

**New:**
- `components/ui/Wayfinder.tsx`
- `components/ui/Ticket.tsx`
- `components/ui/TabularNumeral.tsx`
- `components/ui/GridScaffold.tsx`
- `components/ui/RefCode.tsx`
- `components/ui/DesignModeToggle.tsx`
- `lib/brut/ref-codes.ts`
- `styles/tokens-brutalist.css` (imported by `globals.css` under `[data-design="brut"]` root scope)

**Modified:**
- `app/layout.tsx` — font vars + design-mode attr + Wayfinder mount
- `app/globals.css` — import brut tokens, strip grain under brut
- `app/fonts.ts` — add plexMono + notoJp
- `app/(auth)/login/page.tsx` — rewrite (see §2)
- `app/(app)/recipes/page.tsx` — swap to new list layout
- `app/(app)/recipes/[id]/page.tsx` — swap to new detail
- `app/(app)/recipes/[id]/cook/page.tsx` — mount new CookMode
- `app/(app)/recipes/print/page.tsx` — swap to mono
- `app/(app)/settings/page.tsx` — add DesignModeToggle + wrap blocks
- `components/recipes/RecipeListClient.tsx` — (sacred, checkpoint)
- `components/recipes/RecipeCard.tsx` — (sacred, checkpoint)
- `components/recipes/RecipeDetailClient.tsx` — (sacred, checkpoint)
- `components/recipes/CookMode.tsx` — (sacred, checkpoint)
- `components/recipes/SortPills.tsx` — brut rewrite
- `components/recipes/TagRail.tsx` — brut rewrite
- `components/recipes/FilterPanel.tsx` — brut rewrite
- `components/MacrosCard.tsx` — brut rewrite (3-cell grid box)

**Deleted (under brut mode — files retained for classic mode):**
- Usage of `InkBrush`, `SeasonalKanji`, `WordmarkStrokeIn`, `ScrollParallaxCover`, `FirstSaveCelebration` (all component files stay; brut mode simply does not mount them).

---

## Checkpoint commits required (per CLAUDE.md "sacred features")

Before any sacred-feature edit, run:
```bash
git commit -am "brut: checkpoint before RecipeListClient rewrite"
```

Sacred features I'm touching that need pre-edit snapshots:
1. Recipe CRUD surfaces (RecipeCard, RecipeDetailClient, RecipeForm derivatives — only visual)
2. Search+filter+sort (RecipeListClient, SortPills, TagRail, FilterPanel)
3. Serving scaler (RecipeDetailClient + CookMode)
4. Unit conversion toggle (RecipeDetailClient + CookMode)
5. Cook mode (CookMode)
6. Print view (print/page.tsx + print CSS)
7. Font-size preference (still honoured — our 14/16/18 scale mirrors sm/md/lg)

One checkpoint per feature, per spec instruction. Seven checkpoints total before Phase 2.

---

## Risk mitigation

- **Ship gate:** the `data-design="brut"` attribute lets JC flip between classic and brut at will. No irreversible change.
- **FOUT:** `font-display: swap` on both families; the Berkeley Mono additions (when he licences) also use swap. On slow links users see Menlo fall back for ≤200ms — visually unified with the target anyway.
- **Test coverage:** All `data-testid` attributes preserved. Existing Playwright tests (28/28) should continue to pass. Scaler tests rely on `data-testid="scaler-value"` which remains.
- **Density a11y:** 14px minimum body, 11px labels only. Mobile font-size `sm` = 14px floor.
- **Bundle:** Only +1 Google font family (Plex Mono + 4 weights ≈ 20KB woff2) relative to the current two families. Net font weight: similar or lighter (Cormorant has many glyph variants we were loading).
