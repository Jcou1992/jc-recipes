# /impeccable:critique — Mode-Separation Audit (Classic ↔ Brut)

> Scope: brut polish + borrows execution (commits `3e9c6a0..db0690a`). Lens: **mode separation only** — Classic must look identical to baseline; Brut must own its grammar exclusively. No bleeding either direction.

## Design Health Score (mode-separation lens)

| # | Heuristic | 0-4 | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | DesignModeToggle reflects `data-design` correctly. −1 because dead suppression rules silently fail. |
| 2 | Match real world | n/a | Out of scope (mode boundary, not user model). |
| 3 | User control & freedom | 3 | Toggle works, persists. −1: brut→classic flip in another tab leaves stale `<html>` attr in original tab until next nav. |
| 4 | Consistency & standards | **2** | Suppression strategy is mixed: CSS class kill (correct), testid kill (selectors don't match), JSX `isBrut ? null` (correct). The mismatch is the silent-failure source. |
| 5 | Error prevention | **2** | Dead suppression rules look authoritative but enforce nothing. No lint to catch the gap. |
| 6 | Recognition rather than recall | 3 | Tokens prefixed `--bone-/--ink-/--hot/--medal`. −1: `--card-heat` is unprefixed (collision risk). |
| 7 | Flexibility & efficiency | 3 | Server + client paths agree. −1: classic ships brut Wayfinder JS bundle. |
| 8 | Aesthetic & minimalist | n/a | Out of scope. |
| 9 | Error recovery | **2** | Malformed cookie → falls back to classic OK, but decoration leaks have no diagnostic. |
| 10 | Help & documentation | 3 | Inline JSDoc strong. −1: dead rules carry comments asserting they work. |
| **Total** | | **21 / 32** | (heuristics 2 + 8 n/a) |

## Anti-Patterns Verdict

**Does the brut mode look AI-generated?** No — brutalist-with-conviction is the one aesthetic current AI defaults can't ship (impeccable already flagged this in its earlier review). The signature wayfinder + ref-codes + `[NEW]`/`[LAST]`/`[DORMANT]` rows are un-copyable.

**Automated detector** (`npx impeccable detect --fast app/ components/`): 1 finding total — a false-positive `flat-type-hierarchy` flag on `RecipeListClient.tsx:273` (line attribution wrong; ratio math wrong; sizes are intentional brand hierarchy). **Effectively no automated signal**. Re-run without `--fast` against a built page would yield more, but for THIS audit (mode separation) the manual pass is authoritative.

**Mode separation per detector:** zero leaks flagged. Detector found no shared-file finding that skews to one mode.

## Overall Impression

The mode boundary is **structurally sound at the token + JSX layer, but the "kill classic decorations" CSS rules are 60 % dead code.** Three of five suppression selectors target classes/testids that aren't actually rendered. Brut users still get the SEKAI wordmark stroke-in animation, the recipe-detail parallax rise on scroll, and the first-save underline — none of which fit the brut "precise, mechanical, no easing" grammar.

**Single biggest opportunity:** ten-line CSS edit fixes the P1 leak. After that the system has the cleanest mode boundary I've audited.

## What's Working

1. **Token declaration scoping is rigorous.** Every `--bone-*`, `--ink-*`, `--hot`, `--medal`, etc. declared inside `:root[data-design="brut"]`. Verified line-by-line. Only global is `@property --card-heat` (documented CSS-spec necessity with safe `0%` default).
2. **Server/client cookie consistency.** `page.tsx` reads `cookies()` server-side; client components read `data-design` at mount. Both resolve to the same source-of-truth — `layout.tsx` stamping `data-design` from the cookie. SSR returns `isBrut === false` so brut never flashes for classic users.
3. **The `[data-testid="empty-state"] svg/canvas` fallback** (tokens-brutalist.css L883–887) is a clever rule that actually catches `<InkBrush>` (the SVG nested inside the testid). Single piece of suppression that fires today.

---

## Priority Issues

### [P1] Classic-mode decorations leak through brut

**What:** Three of five "kill classic decorations" suppression rules in `styles/tokens-brutalist.css:1293-1299` target selectors that don't exist:

| Suppression rule | Actual rendered class/testid | Result |
|---|---|---|
| `[data-testid="scroll-parallax-cover"]` | `<div className="scroll-parallax">` (no testid) | **dead** — parallax still active |
| `[data-testid="first-save-celebration"]` | `<span className="first-save-underline">` (no testid) | **dead** — underline still draws |
| `.seasonal-kanji` | `className="font-display"` only | **dead** — seasonal kanji still renders in wordmark |
| `.wordmark-stroke-in` | `className="animate-stroke-in"` (and testid `sekai-wordmark`) | **dead** — wordmark still strokes in |
| `.ink-brush` | `className="animate-ink-brush"` (only catches via the `[data-testid="empty-state"] svg` fallback rule) | **partial — only kills empty-state instance** |

The duplicate kill block at `styles/tokens-brutalist.css:1132-1135` has the same defect.

**Why it matters:** Brut grammar is "precise, mechanical, no easing, no decoration without function." A 14 px parallax rise on scroll (CSS `animation-timeline: scroll()`) and a hand-drawn first-save underline directly contradict the spec. JC will see the bleed instantly — it reads as off-brand polish. The user explicitly forbade cross-mode bleed.

**Fix:** rewrite the kill block to target the actual rendered classes.

```diff
-  :root[data-design="brut"] [data-testid="scroll-parallax-cover"],
-  :root[data-design="brut"] [data-testid="first-save-celebration"],
-  :root[data-design="brut"] .seasonal-kanji,
-  :root[data-design="brut"] .wordmark-stroke-in,
-  :root[data-design="brut"] .ink-brush {
+  /* Neutralize parallax motion (keep wrapper for layout stability) */
+  :root[data-design="brut"] .scroll-parallax {
+    animation: none !important;
+    transform: none !important;
+  }
+  /* Hide first-save underline + animated wordmark + ink-brush + seasonal kanji */
+  :root[data-design="brut"] .first-save-underline,
+  :root[data-design="brut"] [data-testid="sekai-wordmark"],
+  :root[data-design="brut"] .animate-ink-brush,
+  :root[data-design="brut"] .animate-stroke-in {
     display: none !important;
   }
```

Plus delete the dead duplicate at line 1132-1135.

**Suggested commands:** `/audit` (verify suppression coverage post-fix) → `/polish` (final pass).

---

### [P2] Classic users ship + parse the brut Wayfinder JS bundle

**What:** `app/layout.tsx:99-104` mounts `<RouteAwareWayfinder>` unconditionally. The component short-circuits to `null` client-side in classic, but the JS chunk has already been downloaded and parsed.

**Why it matters:** Classic baseline is supposed to be byte-identical to pre-brut. Bundle bloat for a feature classic never sees violates the strict "no bleed" reading.

**Fix:** gate the mount on the server-side cookie value already computed in layout:

```diff
-        <RouteAwareWayfinder crumb="SEKAI" userLabel="" />
+        {designMode === 'brut' && <RouteAwareWayfinder crumb="SEKAI" userLabel="" />}
```

The component's internal pathname check still serves the brut/`/cook` suppression case; this just stops shipping it to classic.

**Suggested command:** `/optimize` (bundle posture).

---

### [P2] CookMode classic local-header carries dynamic `style=""` even in classic

**What:** `components/recipes/CookMode.tsx:483, 634` set `style={{ display: isBrut ? 'none' : undefined }}` on the desktop + mobile EXIT/STEP wrappers. In classic `isBrut === false` → `display` is `undefined` → renders fine. But React still serializes `style=""` on the element — markup differs from pre-brut baseline by exactly that empty attribute.

**Why it matters:** Hairline regression. Functionally classic = baseline. HTML-textually classic ≠ baseline. Strict reading of the user's rule fails this.

**Fix:** move suppression to CSS, drop the inline `display:` from JSX:

```diff
// styles/tokens-brutalist.css (add):
+ :root[data-design="brut"] [data-cook-local-header] {
+   display: none !important;
+ }

// components/recipes/CookMode.tsx (drop the inline style on both wrappers):
-  <div data-cook-local-header="..." style={{ display: isBrut ? 'none' : undefined }}>
+  <div data-cook-local-header="...">
```

Classic returns to byte-identical baseline. Brut hide remains identical.

**Suggested command:** `/polish`.

---

### [P2] `data-code` attribute computed for every recipe card in classic

**What:** `components/recipes/RecipeCard.tsx:32 + 183 + 202` calls `fmtRec(recipe.id)` and emits `data-code={brutCode}` regardless of mode. The CSS `::before` nameplate that consumes the attr is brut-only, so the attr is invisible in classic — but the formatter runs on every card on every list render.

**Why it matters:** Wasted CPU + a non-baseline HTML attribute on every classic card. Strict-reading violation; pragmatic-reading nuisance.

**Fix:** gate the computation:

```diff
-  const brutCode = fmtRec(recipe.id);
+  const brutCode = isBrut ? fmtRec(recipe.id) : undefined;
```

Note: `isBrut` is already in the component (post-U9). The attribute renders only when present. SSR returns `isBrut === false` so first paint is clean for both modes.

**Suggested command:** `/optimize`.

---

### [P3] `recordCooked()` writes DB for classic users who can't see the heat row

**What:** `components/recipes/CookMode.tsx:236` fires `recordCooked(recipe.id).catch(...)` on completion regardless of mode. `cooked_at` and `cooked_count` columns are mutated for classic users who never see `[LAST 03H AGO]` / `[COOKED 14×]`.

**Why it matters:** "Shared infrastructure" interpretation — the user explicitly flagged this as the hardest call (audit prompt question 7). DB columns belong to both modes (forward-compatible: JC may toggle to brut tomorrow). But the trigger fires in classic, mutating state for a feature the user can't see.

**Two valid resolutions, depending on JC's intent:**

**(a) Strict (mode-pure):** gate the call by `isBrut`.

```diff
-  recordCooked(recipe.id).catch((err) => console.warn('recordCooked failed', err));
+  if (isBrut) recordCooked(recipe.id).catch((err) => console.warn('recordCooked failed', err));
```

Cost: classic users' cook history stops being captured. If they later toggle brut, every classic cook is invisible.

**(b) Pragmatic (current state):** leave the call mode-agnostic; rename the JSDoc + spec wording so the column is clearly "mode-neutral cook telemetry that brut renders, classic doesn't." Already implemented this way; just document.

**Recommendation:** ask JC. Question for the thumbs-up gate below.

**Suggested command:** decision-gated. If (a): `/polish`. If (b): `/clarify` (update JSDoc + plan).

---

### [P3] `@property --card-heat` registered globally

**What:** `styles/tokens-brutalist.css:13-17` registers `@property --card-heat` outside any `:root` selector — global registration is intentional because CSS spec disallows nesting `@property` inside `@layer`.

**Why it matters:** Marginal — the property name is unique (no `--card-heat` reference in `app/globals.css`) and the initial value `0%` is safe. **Verdict: not a regression.**

**Fix:** none needed. Document as an explicitly-allowed leak in the spec.

**Suggested command:** `/clarify` (one-line spec note).

---

### [P3] DesignModeToggle styles apply in both modes

**What:** `.brut-design-toggle` rules at `styles/tokens-brutalist.css:380-416` have NO `:root[data-design="brut"]` prefix — they apply unconditionally.

**Why it matters:** **Intentional.** The toggle wants to look the same in both modes so users can find it consistently. With `var(--rule-strong, currentColor)` and `var(--font-plex-mono, ui-monospace)` fallbacks, classic mode renders the toggle with `currentColor` borders + Plex Mono (which IS bundled). Brut grammar leaking into a single component classic page is fine because the user needs to recognise the toggle to escape brut.

**Fix:** none needed. Document as an explicitly-allowed leak.

**Suggested command:** `/clarify` (one-line spec note).

---

## Persona red flags

**JC, hands wet at 17:30 service:** Toggles to brut on his phone. Opens a recipe. Notices the title block "rises 14 px on scroll" because `ScrollParallaxCover` is still active under brut. The brut spec promises mechanical, no-easing motion (`--ease-linear`, `steps()` only). Soft easing on the cover violates that grammar — JC's eye reads the difference instantly. **Diagnostic:** P1 above.

**Demo-account guest, classic mode:** Visits the site after JC enables brut on his own browser. Cookie unset → server defaults to classic → they see baseline (correct). But: their browser still downloads the brut Wayfinder JS bundle. On a slow connection, that's wasted bytes for a user who will never see brut. **Diagnostic:** P2 (Wayfinder ship).

---

## Minor Observations

- **Hot-lint mode-blindness (R5).** Lint scans all route-co-located `.tsx`/`.ts`/`.css` regardless of which mode the file participates in. Today no classic file declares `--hot`, so no false-positive risk. **But** if a future classic-only feature added two `--hot` references in `RecipeListClient.tsx` (a shared file), the lint would block it. Future-proofing fix: rename the brut token to `--brut-hot` to disambiguate.
- **`pathname.includes('/cook')`** in `RouteAwareWayfinder.tsx` matches future hypothetical `/cookbook` route. No such route today; trivial.
- **Stale `<html data-design="brut">`** scenario: user toggles brut→classic in another tab. Tab 1 keeps stale brut markup until next nav. Cookie is updated; `data-design` attr in tab 1 isn't. Edge case, low impact.

---

## Questions for the user (thumbs-up gate)

Before I apply any fixes, please confirm:

**Q1. P1 fix — kill the dead suppression rules?**  
☐ Yes, rewrite the kill block to use the actual rendered class names (10-line CSS edit).  
☐ No, leave brut decorations in.  

*Default if unsure: yes — this is the only audit finding that visibly violates the brut spec.*

**Q2. P2 — gate Wayfinder mount + drop inline `style=""` on cook + gate `data-code`?**  
☐ Apply all three (cleaner classic baseline, smaller bundle).  
☐ Apply only the cook one (markup hygiene).  
☐ Skip — pragmatic reading is fine.  

**Q3. P3 — `recordCooked()` in classic mode?**  
☐ (a) Strict: gate by `isBrut` (classic stops recording cooks).  
☐ (b) Pragmatic: leave it, document as mode-neutral telemetry.  

**Q4. Hot-lint mode-blindness — rename brut `--hot` → `--brut-hot`?**  
☐ Yes — disambiguate now (renames ~30 sites in `tokens-brutalist.css` + lint script).  
☐ No — defer; today's risk is zero.  

---

## Recommended Actions (after thumbs-up)

Tentative action plan, contingent on your answers above:

1. **`/audit`** — verify suppression coverage of classic decorations under brut (P1).
2. **`/polish`** — apply the P1 + P2 cook-header CSS-relocation fix.
3. **`/optimize`** — gate Wayfinder mount + `data-code` computation (Q2).
4. **`/clarify`** — update `tokens-brutalist.css` comments + `contest/winner/CHANGES.md` to document the explicitly-allowed leaks (`@property --card-heat`, `.brut-design-toggle`) and the `recordCooked()` decision from Q3.
5. **`/critique`** rerun — confirm Nielsen 4/5/9 scores improve (currently 2 each).

End-state target: Nielsen total **27 / 32** (up from 21).

---

## Appendix — file:line references for fixes

| Issue | File | Lines |
|---|---|---|
| P1 kill-block rewrite | `styles/tokens-brutalist.css` | 1293-1299 + 1132-1135 (delete) |
| P2 Wayfinder mount gate | `app/layout.tsx` | 99-104 |
| P2 cook-header CSS relocation | `styles/tokens-brutalist.css` (add rule), `components/recipes/CookMode.tsx` | 483 + 634 |
| P2 `data-code` gate | `components/recipes/RecipeCard.tsx` | 32 + 183 + 202 |
| P3 `recordCooked` gate (if Q3=a) | `components/recipes/CookMode.tsx` | 236 |
| P3 spec docs | `tokens-brutalist.css` (comments) + `contest/winner/CHANGES.md` (operator notes) | various |
| Hot-token rename (if Q4=yes) | `styles/tokens-brutalist.css`, `scripts/hot-token-lint.mjs`, multiple consumers | many |
