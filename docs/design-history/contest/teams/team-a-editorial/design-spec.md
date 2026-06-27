# Design Spec — Team A · Editorial-Magazine

> SEKAI as a cookbook printed by a private press. Interactive, but set — not decorated.

## 0. Position statement

The product already has the right palette, the right type trio, the right motion restraint. What it lacks is **editorial rigour**: a columnar grid, a real type scale, rule-line navigation, drop caps, margin numerals, footnote-style meta, and old-style figures where they belong. This spec upgrades SEKAI from *premium dark serif app* to *book-object*.

Three anti-patterns we reject:
1. Cards with thumbnails (recipe cards are a table of contents, not a gallery).
2. Centered modals for everything (annotations are inline margin glosses).
3. Tabbed or pill-row filters (filters are running-heads: "Section: BREAKFAST · N° 1–12 of 47").

---

## 1. Tokens

A single new stylesheet, `tokens-editorial.css`, is loaded after `globals.css`. It **extends** rather than replaces the existing OKLCH palette. All additions are additive to avoid breaking sacred features (see `stability-report.md`).

### Colour — extended palette
```css
:root {
  /* Existing brand colours preserved verbatim ------------------------ */
  --color-terracotta:          oklch(63.2% 0.148 45);
  --color-gold:                oklch(86.5% 0.089 89);
  --color-ink:                 oklch(11% 0.004 285);
  --color-bone:                oklch(95.3% 0.014 85);

  /* NEW — editorial paper tones (light theme; press-worthy) --------- */
  --paper-newsprint:   oklch(93.5% 0.018 82);  /* off-white, slight warm */
  --paper-cream:       oklch(96.5% 0.024 85);  /* page cream           */
  --paper-deckle:      oklch(89.0% 0.020 82);  /* margin / deckle edge */
  --ink-body:          oklch(14% 0.008 60);     /* warm black for body  */
  --ink-rule:          oklch(38% 0.010 60);     /* rule line grey       */
  --ink-caption:       oklch(42% 0.012 60);     /* caption muted        */

  /* NEW — editorial dark tones (night-press) ------------------------ */
  --night-paper:       oklch(12% 0.008 50);     /* warm dark, not flat  */
  --night-raised:      oklch(15% 0.009 50);
  --night-body:        oklch(89% 0.014 80);     /* warm bone            */
  --night-rule:        oklch(55% 0.010 60);
  --night-caption:     oklch(68% 0.012 70);

  /* Rules — hairlines must match typography weight -------------------*/
  --rule-hair:         0.75px;                  /* "hairline" */
  --rule-fine:         1px;
  --rule-double-gap:   3px;                     /* for double rules */
}
```

### Type scale — editorial, modular, old-style default
Base `1rem = 22px` (matches current `md` font-size preference).

| Token | px @ md | rem | Use |
|---|---|---|---|
| `--type-kicker`   | 11 | 0.500 | Kickers / eyebrow / folio |
| `--type-caption`  | 13 | 0.590 | Captions, colophon |
| `--type-meta`     | 15 | 0.681 | Tabular meta (time/yield) |
| `--type-body-sm`  | 18 | 0.818 | Sidebar prose, step meta |
| `--type-body`     | 22 | 1.000 | Ingredient / step body |
| `--type-lede`     | 26 | 1.181 | Recipe lede / pull quote |
| `--type-dek`      | 32 | 1.454 | Section decks |
| `--type-head-sm`  | 44 | 2.000 | List item title |
| `--type-head`     | 72 | 3.272 | Recipe title |
| `--type-head-lg`  | 128 | 5.818 | Hero / login wordmark |
| `--type-folio`    | 160 | 7.272 | Cook-mode margin numeral |

Line heights paired to scale:
```
--lh-tight:  1.05;   /* display heads */
--lh-snug:   1.2;    /* deks, ledes */
--lh-normal: 1.45;   /* ingredients, tabular */
--lh-body:   1.65;   /* body prose */
--lh-loose:  1.85;   /* cook-mode step at focus */
```

Tracking:
```
--track-tight:   -0.02em;   /* display titles */
--track-normal:  0;
--track-caption: 0.02em;
--track-kicker:  0.18em;    /* uppercase eyebrow */
--track-folio:   -0.04em;   /* folio numerals collapse */
```

Weight map:
- Cormorant Garamond 400 (body), 500 (emphasis), 600 (rare ingredient emphasis).
- Noto Serif JP 500 (display — SEKAI · 世界 · section markers).
- Barlow Condensed 500 (kickers, buttons, tags — always uppercase, tracked 0.12–0.18em).

OpenType (mandatory):
```css
font-feature-settings: 'kern' 1, 'liga' 1, 'onum' 1, 'ss01' 1;
/* body uses old-style figures; tabular nums ONLY on: macros, scaler, timer, counts */
.tabular { font-variant-numeric: lining-nums tabular-nums; }
```

### Spacing rhythm — baseline of 8, but editorial is a 6-unit vertical rhythm
Editorial rhythm ≠ 8pt grid. We use **6px vertical rhythm**, because body line-height in Cormorant at 22px × 1.65 = 36.3px — divisible by 6 cleanly. All vertical margins snap to multiples of 6px, so consecutive paragraphs, rules, and figures line up on the same invisible baseline.

```
--r-0:  0;
--r-1:  6px;
--r-2:  12px;
--r-3:  18px;
--r-4:  24px;
--r-5:  36px;
--r-6:  48px;   /* section break */
--r-7:  72px;   /* folio gap */
--r-8:  108px;  /* spread gutter */
--r-9:  144px;  /* page margin */
```

### Radii — near zero
Editorial objects do not have rounded corners. Buttons become understated rectangular blocks with hairline rules. Only the avatar and one toast carry any radius.

```
--radius-none: 0;
--radius-hair: 1px;   /* implied by hairline border */
--radius-pill: 9999px;/* retained only for avatar + toast dismiss */
```

### Shadows — replaced by rules
We ship ONE shadow token, used only for toast and dialog. Cards carry no elevation — they are rule-bounded like a table in a book.

```
--rule-card-edge:   inset 0 0 0 1px var(--ink-rule);
--rule-card-edge-dark: inset 0 0 0 1px var(--night-rule);
--shadow-dialog:    0 24px 64px oklch(0 0 0 / 0.28);
```

### Motion durations & easings — quiet press
Only four durations, three easings. Press cadence is paper turning, not cards flying.

```
--ease-press:      cubic-bezier(0.4, 0.0, 0.2, 1);   /* neutral press */
--ease-set:        cubic-bezier(0.22, 1, 0.36, 1);   /* out-quint, typesetting */
--ease-page:       cubic-bezier(0.16, 1, 0.3, 1);    /* out-expo, page turn */

--t-whisper:  120ms;
--t-set:      240ms;
--t-turn:     420ms;
--t-folio:    620ms;   /* the longest motion — folio count-up on scale */
```

Rule: anything longer than `--t-folio` is wrong. Anything that springs is wrong. Anything that bounces is banned.

---

## 2. Typography mapping per surface

| Surface element | Font | Size | Weight | Tracking | Notes |
|---|---|---|---|---|---|
| Login wordmark "SEKAI" | Cormorant | --type-head-lg | 500 | --track-tight | Clip-path wipe reveal |
| Login 世界 | Noto Serif JP | --type-head | 500 | 0 | Staggered 80ms after SEKAI |
| Login colophon | Barlow Condensed | --type-kicker | 500 | --track-kicker | Uppercase |
| List kicker (`N° 041`) | Barlow Condensed | --type-kicker | 600 | --track-kicker | Folio figure |
| List item title | Cormorant | --type-head-sm | 500 | --track-tight | Old-style figures |
| List lede (1 line) | Cormorant | --type-body | 400 | 0 | Italic `ss01` |
| List tabular meta | Barlow Condensed | --type-meta | 500 | --track-caption | Lining figures |
| Recipe detail title | Cormorant | --type-head | 500 | --track-tight | Centered manuscript |
| Recipe detail dek | Cormorant italic | --type-lede | 400 | 0 | Centered, max 32ch |
| Drop cap (ingredients) | Cormorant | ~4.5rem | 500 | 0 | 3-line drop, terracotta |
| Ingredient name | Cormorant | --type-body | 400 | 0 | Old-style figures off for qty column |
| Ingredient qty | Barlow Condensed | --type-body | 500 | --track-caption | `.tabular` — lining |
| Step number (margin) | Cormorant | --type-folio | 300 | --track-folio | Old-style, very large |
| Step body | Cormorant | --type-body | 400 | 0 | Leading --lh-body |
| Tag | Barlow Condensed | --type-caption | 500 | --track-kicker | Uppercase, no pill — hairline underline |
| Button | Barlow Condensed | --type-caption | 600 | 0.14em | Uppercase |
| Cook-mode step | Cormorant | --type-dek | 400 | 0 | Leading --lh-loose |
| Cook-mode folio | Cormorant | --type-folio | 300 | --track-folio | "III / VII" roman OR "3 / 7" arabic (user pref) |
| Colophon footer | Barlow Condensed | --type-kicker | 500 | --track-kicker | Dark rule above |

---

## 3. Motion language — typesetting cadence

Motion in SEKAI-Editorial is one of four things only:

1. **Set** — text arrives via a `clip-path: inset(0 100% 0 0)` → `0 0 0 0` wipe at `--t-set --ease-set`. Used for page mount, list items, and the login wordmark. Never more than one element per focal point animates at a time.
2. **Turn** — page/spread transitions. `--t-turn --ease-page`. Used between cook-mode steps and recipe-list ↔ detail. The outgoing content clip-wipes **out** right-to-left; the incoming content clip-wipes **in** right-to-left, with a 60ms overlap. No translate, no scale. The content is *set again*, not slid.
3. **Feature-swap** — unit toggle (metric ↔ imperial) and scaler morph. Implemented as an OpenType feature change + a 160ms crossfade on the numeral only. The rest of the ingredient row does not move. Zero pixel jitter because the qty column reserves its max width.
4. **Whisper** — hover, focus, button press. 120ms opacity / `letter-spacing` / underline-draw. No transforms.

Stagger:
- List load: 40ms stagger per row, capped at 8 rows (max 320ms); everything beyond renders instant.
- Ingredients: 30ms stagger per row, capped at 10 rows.
- Steps: no stagger — steps are a single column of prose that sets as one block.

Reduced motion: all of the above become instant opacity toggles; clip-path and crossfades become `opacity 0→1` only.

Choreography rule: at any moment, **only one "set" animation** may be the focal point. If two happen in sequence (list item, then detail title), the first must be complete before the second begins. No parallel choreography.

---

## 4. Component rules

### Button (primary / ghost / danger)
- Rectangle. Radius `--radius-none`. Hairline rule border. No drop shadow.
- Text is Barlow Condensed, uppercase, tracked 0.14em.
- Hover: **ink-fill sweep** — background fills from the left over 180ms, text colour swaps at 50% mark. No lift, no scale.
- Active: 2px inset shadow, no scale.
- Primary: terracotta-contrast fill by default, bone text; hover fills to terracotta-dark.
- Ghost: transparent with hairline; hover fills with `--paper-deckle` (light) or `--night-raised` (dark).
- Danger: terracotta hairline, terracotta text; hover fills with 8% terracotta.

### Card (list item)
- No card. A **row**: numeral + title stack + lede + tabular meta. Bounded top and bottom by a hairline rule. No background fill. No hover lift. Hover raises only the left-numeral colour from `--ink-caption` to `--color-terracotta` and draws an underline under the title over 220ms.
- No thumbnails in the list view. Imagery (when it exists) lives on detail.

### Input
- 0 radius. Bottom-only hairline rule (no box). Label above in Barlow-kicker. Focus: rule thickens to 1.5px terracotta. Error: rule to terracotta + single-line error in caption size.
- `inputmode="decimal"` forced on qty + scaler inputs. `inputmode="numeric"` on timer inputs. Keypad fix is a tokens-editorial requirement.

### Tag
- Not a pill. Uppercase Barlow-kicker, tracked, with a 1px underline that **draws** on active. Selected state: terracotta text + solid underline. Unselected: ink-caption text + dotted underline. Multi-select supported, keyboard affordance inherited from current TagRail.

### Dialog
- Paper card. White (or night-paper) fill. Hairline double-rule top and bottom. Centered title in Cormorant, body in Cormorant. Buttons right-aligned, editorial button treatment. Scrim: 40% ink, no blur.
- Max width retained from existing `.dialog-panel` utilities (protects font-size preference math).

### Toast
- Bottom-center, max 360px, 2px hairline top only, no background fill (only a slight vignette). Message in Cormorant italic. Action in Barlow-kicker. Duration 3s, dismiss by swipe or click.

### Print
- Print view mandates Cormorant (fix brand break from audit item). Hairline rules. Drop cap on first ingredient retained. No backgrounds. Colophon set at footer. QR (small) linking back to /recipes/[id] — **optional**, controlled by a query flag. Page size choice A4/Letter via `@page` and a toggle on print trigger (addresses audit gap).

---

## 5. Three killer moments

These are the three hero demonstrations that should carry the judging.

### K1 — The Spread
Opening a recipe feels like opening a book to a spread. The list → detail transition runs a page-turn: the outgoing list clip-wipes L→R while the incoming detail clip-wipes L→R (60ms overlap). The detail page mounts with a **centered manuscript title block**: eyebrow (`N° 041 · WEEKNIGHT · 28 MIN`), display title, italic dek, hairline rule. The first ingredient gets a **drop cap** — 3-line tall, terracotta, real drop-cap float, not a fake inline letter. The ingredient list is two columns, steps are one wide column, with step numerals set in margin at `--type-folio` (typeset large, low-contrast). It **looks like a printed cookbook page.**

### K2 — The Feature Swap
When the user toggles metric ↔ imperial (or scales servings), the number does not slide or count-up. It **glyph-swaps** as if the typesetter reset the line. Qty column has a reserved width (`ch`-based) so nothing jitters. The swap is a 160ms crossfade on the numeral alone, paired with a 1px left-to-right **gold underscore sweep** under the changed row — like the compositor’s loupe marking the line they just reset. Zero layout shift. Smart fractions (½, ⅓, ¼, ⅔, ¾, ⅛, ⅜, ⅝, ⅞) use the real Unicode glyphs where Cormorant has them, otherwise fall back to OpenType numerator/denominator feature (`font-feature-settings: 'frac' 1`).

### K3 — The Cook Spread
Cook mode is not a card carousel. It is a **page** with margin folio: step numeral set huge in the left margin (`--type-folio`), step prose set center-column at `--type-dek` with `--lh-loose`, mise-en-place checkboxes in the right margin under a "prep" rubric, and a running head top-right (`RECIPE TITLE · N° 041 · PAGE 3 / 7`). Swipe = page turn (clip-wipe, 420ms). Timer is a **hairline progress line** across the page bottom — draining from 100% to 0% width — not a circular ring. When a timer completes, the page's hairline rule flashes gold once and the margin shows a small `†` footnote marker until dismissed. No ambient glow. No chirp unless user enables. The page is quiet and total.

---

## 6. Accessibility notes

- All body text meets AA at 22px base (light on paper-cream: 11.8:1; night-body on night-paper: 10.6:1).
- Rules replace shadows; users with dark-mode-prefers-high-contrast retain all affordances since rules are 1px hairlines at `--ink-rule` / `--night-rule`.
- Tag underline pattern (dotted unselected, solid selected) doubles as a non-colour affordance.
- `prefers-reduced-motion`: all "set" and "turn" animations degrade to opacity crossfades. Drop cap, margin folio, rules, and OpenType features are static and unaffected.
- Keyboard discoverability: the kicker row on `/recipes` renders a colophon-style tip on idle ("press `/` to search · `f` for filter · `esc` to clear"), addressing the audit gap.
