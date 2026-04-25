# Team D — BRUTALIST-RAW-LUXE — Design Spec

> **One-sentence brief:** SEKAI is a restaurant back-of-house service ticket, set by a Swiss typographer.

Every surface is a ticket. Every element is labelled with a reference code. Every number is tabular. Every cell is justified to a 4px baseline. Zero rounded corners except two deliberate exceptions. Zero shadows, zero gradients, zero blur. Ink and bone, a single terracotta warning lamp, a single gold medal. The typographic family is one — a monospace — used at four sizes and two weights. Hierarchy is size, weight, position. Nothing else.

---

## 1. Tokens

### 1.1 Color (OKLCH throughout; dark-first)

Broken from brand but justified: brand's Cormorant/Noto/Barlow trio is killed in this lane because the entire premise is *type as architecture via monospace*. Color tokens are kept and tightened — we still use terracotta and gold, but with extreme restraint.

```css
@theme {
  /* Paper */
  --ink-900: oklch(8%  0.004 285);   /* hard black, cards + body bg in dark */
  --ink-800: oklch(12% 0.004 285);   /* raised */
  --ink-700: oklch(17% 0.004 285);   /* input bg, ticket body */
  --ink-600: oklch(22% 0.004 285);   /* dividers */

  --bone-100: oklch(97% 0.008 85);   /* primary text on dark */
  --bone-200: oklch(88% 0.010 85);   /* secondary text */
  --bone-300: oklch(72% 0.012 85);   /* tertiary / labels */
  --bone-400: oklch(52% 0.010 85);   /* disabled / hint */

  /* Accents — one active, one earned */
  --hot:   oklch(63.2% 0.148 45);    /* terracotta, only on the one active/hot element per screen */
  --hot-a: oklch(63.2% 0.148 45 / 0.14);
  --medal: oklch(86.5% 0.089 89);    /* gold, reserved — ticket complete, first save, earned moments */
  --medal-a: oklch(86.5% 0.089 89 / 0.14);

  /* Status */
  --go:   oklch(72% 0.17 145);       /* timer complete, success — used sparingly */
  --late: oklch(58% 0.20 28);        /* timer overdue, destructive — terracotta-shifted red */
}

:root { /* dark default */
  --bg: var(--ink-900);
  --surface: var(--ink-800);
  --surface-raised: var(--ink-700);
  --rule: var(--ink-600);           /* 1px divider color */
  --rule-strong: var(--bone-400);   /* 2px key divider */
  --text-1: var(--bone-100);
  --text-2: var(--bone-200);
  --text-3: var(--bone-300);
  --text-4: var(--bone-400);
  --focus: var(--hot);
}

:root[data-theme="light"] {
  --bg: var(--bone-100);
  --surface: #FFFFFF;
  --surface-raised: #FDFCF8;
  --rule: oklch(20% 0.004 285 / 0.18);
  --rule-strong: oklch(20% 0.004 285 / 0.55);
  --text-1: oklch(12% 0.004 285);
  --text-2: oklch(25% 0.004 285);
  --text-3: oklch(42% 0.008 285);
  --text-4: oklch(58% 0.010 285);
}
```

**Rules of use:**
- **Terracotta `--hot`** is only used on THE one currently-active / currently-hot element on the screen. The active sort pill. The currently-running timer. The active step number in cook mode. Nothing else. If two things on a screen are terracotta, one of them is a bug.
- **Gold `--medal`** is reserved. It appears on: (1) the first-save underline moment, (2) the "SERVICE COMPLETE" stamp at end of cook mode, (3) a single decorative hairline beneath the `SEKAI` wordmark on login. Three sites, period.
- **Bone + ink** do all hierarchy work. Four bone tints do all the text work.

### 1.2 Type scale — monospace primary

**Family choice: Berkeley Mono** (preferred) with **IBM Plex Mono** as the ship-safe fallback stack. Berkeley Mono v2 has:
- Slashed zero that reads clearly at 10px
- True small-caps (ssc1 feature)
- Tabular by default across digits + punctuation
- An optical display cut at 24pt+ that looks cut-from-marble
- A Condensed cut for dense label rows

If we cannot licence Berkeley (USD 75 personal — JC pays it out of pocket for his phone; we ship Plex Mono in prod for RLS tenants who haven't licensed), **IBM Plex Mono** via Google Fonts does 90% of the job for free and is already CDN-cached on most devices.

```css
--font-mono: 'Berkeley Mono', 'IBM Plex Mono', 'Menlo', ui-monospace, monospace;
--font-display: 'Berkeley Mono Display', 'Berkeley Mono', 'IBM Plex Mono', monospace;
/* No sans. No serif. One family rules. */

/* One exception — the Japanese watermark. */
--font-jp: 'Noto Serif JP', 'Hiragino Mincho ProN', serif;
/* Used once on login: 世界 as a background watermark at 30% opacity, scale 12rem. */
```

**Scale** (px → rem at 1rem=16px base; tabular-nums always on):

| Token | px | rem | Use |
|---|---|---|---|
| `--t-10` | 10 | 0.625 | ticket reference codes, meta footer |
| `--t-11` | 11 | 0.6875 | small labels, row meta |
| `--t-12` | 12 | 0.75 | dense row body, secondary copy |
| `--t-14` | 14 | 0.875 | standard body, ingredient names |
| `--t-16` | 16 | 1.00 | section headers |
| `--t-20` | 20 | 1.25 | recipe title |
| `--t-28` | 28 | 1.75 | step body in cook mode, number displays |
| `--t-40` | 40 | 2.50 | cook-mode step number, scaler digit |
| `--t-64` | 64 | 4.00 | login wordmark, service-complete stamp |
| `--t-96` | 96 | 6.00 | one-off: the 世界 watermark opacity-30% |

**Weights:** `400` regular + `600` semibold. Two. Not three. The job is done.

**Minimum on-screen size: 11px.** The user-level font-size preference (sm/md/lg) scales the base 16px to 14/16/18 — minimum 11px on the smallest setting satisfies AA at 4.5:1 contrast against `--ink-900`.

**Tabular numerals everywhere.** `font-variant-numeric: tabular-nums;` set globally on `html`. Nothing opts out.

### 1.3 Spacing — strict 4px grid

```css
--s-0:  0px;
--s-1:  4px;   /* hairline breath */
--s-2:  8px;   /* inside-a-cell padding */
--s-3:  12px;  /* dense row gap */
--s-4:  16px;  /* default gap */
--s-5:  20px;
--s-6:  24px;  /* section gap */
--s-8:  32px;  /* block gap */
--s-10: 40px;  /* page-block gap */
--s-12: 48px;  /* header gap */
--s-16: 64px;  /* route padding on desktop */
--s-24: 96px;  /* hero spacing, cook-mode gutter */
```

**Rule:** no inline spacing values off this scale. If you need 14px, you need 12 or 16, pick one.

**Baseline: 4px.** Every component height is a multiple of 4. Row heights: 32 / 40 / 48 / 56 / 64.

### 1.4 Radii — 0 with two deliberate exceptions

```css
--r-0:  0px;   /* default — everything */
--r-1:  2px;   /* exception #1: the single focus ring + the :focus-visible outline, which needs a tiny corner to not look like a prison window */
--r-full: 9999px; /* exception #2: the one circular element — the cook-mode step-number bubble. Labelled and intentional. */
```

That is it. Recipe cards: 0. Buttons: 0. Inputs: 0. Dialogs: 0. Tag pills: 0. Corners are load-bearing. They earn their right angles.

### 1.5 Borders

Two weights only.

```css
--border-1: 1px solid var(--rule);        /* hairlines — cell walls, dividers */
--border-2: 2px solid var(--rule-strong); /* key boundaries — top of cook ticket, bottom of page header */
```

Focus ring: `outline: 2px solid var(--focus); outline-offset: 0;` (not 2px — the offset is a brand break; brutalist rule = the focus is *in* the cell wall, not floating above it).

### 1.6 Motion — minimal

```css
--m-instant: 0ms;    /* state change is instant — the chef doesn't wait */
--m-tick:    80ms;   /* single frame, for ticket-row flips */
--m-print:   180ms;  /* for "new ticket printed" animations */
--m-reveal:  320ms;  /* used once: login wordmark, completion stamp */

--ease-linear: linear;     /* the only easing — ticket printers are linear */
--ease-step:   steps(6);   /* for the typewriter stamp at completion */
```

No spring, no bounce, no easing curves from `--ease-out-expo`. Motion is mechanical — like a receipt printer advancing one line, then stopping hard. Everything else is instant.

### 1.7 Shadows — banned
No shadows. Period. Elevation is expressed by `--border-2` vs `--border-1`, never by shadow.

### 1.8 Gradients — banned
Same. Except one exception: the background paper of the printed cook-mode ticket has a 1px-to-transparent top border that *reads* like a perforation. That is a 2% exception on one element, and it is a stylistic tell, not a gradient.

### 1.9 Blur / backdrop-filter — banned
Kill the frosted nav. The header is `border-bottom: var(--border-2)` on a solid `--bg`. The chef can read it. It is not pretty. It is correct.

---

## 2. Grid system

### 2.1 The global wayfinder

Every route has a **fixed 32px-tall header** printed in mono at the top of the viewport. Four slots, vertical 1px dividers between them, pipe-character `|` where a rule cannot be drawn:

```
┌──────────────────────────────────────────────────────────────┐
│ SEKAI · REC-042 · COOK · STEP 3/7 │ T+04:21 │ ×2 │ JC · 20:41 │
└──────────────────────────────────────────────────────────────┘
```

Slots:
- **Left:** app + resource code (`SEKAI/REC-042/COOK`) — always clickable to navigate up
- **Center-left:** mode-specific state (`STEP 3/7`, `[08] RESULTS`, `DRAFT`)
- **Center-right:** time (`T+04:21` in cook mode; `20:41` elsewhere)
- **Right:** user tag (`JC` or `demo@`) + theme / font-size indicator (`DARK · MD`)

This is the single most signature element of the whole app. Every screenshot shows it. Every shared link shows it. It is the pit-wall telemetry.

### 2.2 Layout grids

**Mobile (≤639px):** 6 columns, 16px outer gutter, 8px column gutter.
**Tablet (640–1023px):** 8 columns, 24px outer gutter, 16px column gutter.
**Desktop (≥1024px):** 16 columns, 32px outer gutter, 24px column gutter.

All widths snap to column boundaries. Recipe cards span **3 cols desktop / 4 cols tablet / 6 cols (full) mobile**. The featured first-recipe card spans **6 cols desktop** (brutalist version of the current "featured" treatment — wider, but same ticket visual language, not a visual upgrade).

### 2.3 Baseline grid
4px vertical baseline. All text set on a 20px or 24px line-height (both multiples of 4). No `line-height: 1.7` (that lands us on 22.4px — off-grid).

### 2.4 Per-route layout

- **/login:** Single centred column, 320px. Wordmark `SEKAI` in display mono 64pt. Beneath: `世界` as a 96pt JP serif watermark at 8% opacity, positioned -8px below the wordmark baseline. Form: two fields, 48px row height, hairline borders.
- **/recipes (list):** 16-col grid. Header (wayfinder) 32px. Search+filter bar 48px. Sort row 32px. Tag rail 32px. Grid body: cards at 3×6-row ticket height (160px) on desktop.
- **/recipes/[id] (detail):** 16-col grid, but 4/12 split. Left 4 cols: fixed ingredient panel (`[INGREDIENTS · 08]`). Right 12 cols: steps, notes, macros.
- **/recipes/[id]/cook:** Single centred column, 640px max. Step number as 6rem digit in hot color. Step body mono 28pt. Timer: gigantic MM:SS, tabular, running or paused. One step per screen. This is the KDS.

---

## 3. Labelling system — the ticket grammar

Every entity in the system has a **reference code**. The code is a first-class UI element, rendered in mono uppercase, 10–11px, `--text-3`, and it IS part of the visual identity. This is the single highest-leverage signature move.

### 3.1 Code grammar

```
<NAMESPACE>-<ID-OR-INDEX>
```

| Namespace | Meaning | Example |
|---|---|---|
| `REC` | Recipe | `REC-042`, `REC-A8F3` (short-hash of UUID) |
| `ING` | Ingredient row index within a recipe | `ING-01`, `ING-07` |
| `STP` | Step index within a recipe | `STP-3/7` (step 3 of 7) |
| `TAG` | Tag | `TAG#DESSERT` (yes — the `#` is intentional, it's a tag sigil) |
| `COOK` | A cook-mode session | `COOK-20:41` (start time) |
| `USR` | User | `USR·JC` (the `·` separator is intentional — a user is not a reference code, it's a subject) |
| `VER` | Version | `VER-01` (currently unused; reserved for future history) |
| `FIG` | A figure / surface label | `FIG. 01 · LIST`, `FIG. 07 · COOK` |

### 3.2 Rendering rules

- Always mono. Always 10/11px. Always `letter-spacing: 0.02em` (mono doesn't need much).
- Uppercase. Digits are tabular by default.
- Placement: **top-left of each labelled cell**, separated from cell content by 4px baseline padding.
- Color: `--text-3` (bone-300). Never `--hot`, never `--medal`.
- When a cell is the *active* one (e.g. the current sort), the cell's code stays `--text-3` but the cell content — and the cell's bottom-border only — turn `--hot`. Even the active cell's code itself does not change color. The code is the cell's name; names do not change when the cell is selected.

### 3.3 Ticket composition rule

Every boxed component prints its label code like this:

```
┌─ [FIG. 03 · CARD · REC-042] ──────────────────┐
│                                               │
│  CRISPY PORK KATSU                            │
│  12 ING · 07 STP · 00:45                      │
│                                               │
└───────────────────────────────────────────────┘
```

The label is part of the top border, baked in. Use an absolute-positioned span at `top: -6px; left: 12px; padding: 0 4px; background: var(--bg);` — the background knock-out creates the "nameplate" effect. This is the *classic* brutalist motif. We own it.

---

## 4. Component rules

Every component is **a box with a label code**. No exceptions. Even a button has a code (`[BTN · SUBMIT]`) rendered on its focus-visible state. Even an input has a code (`[IN · EMAIL]`) rendered as its placeholder in small-caps.

### 4.1 The universal box

```tsx
<Ticket code="FIG. 03 · CARD · REC-042">
  <TicketRow>...</TicketRow>
  <TicketRow>...</TicketRow>
  <TicketMeta>12 ING · 07 STP · 00:45</TicketMeta>
</Ticket>
```

Rendered CSS:
```css
.ticket {
  position: relative;
  border: var(--border-1);
  background: var(--surface);
  padding: var(--s-6) var(--s-4) var(--s-4);
}
.ticket::before {
  /* the nameplate */
  content: attr(data-code);
  position: absolute;
  top: -6px;
  left: var(--s-3);
  padding: 0 var(--s-1);
  background: var(--bg);
  font-family: var(--font-mono);
  font-size: var(--t-10);
  letter-spacing: 0.04em;
  color: var(--text-3);
  text-transform: uppercase;
}
```

### 4.2 Buttons

Three variants.
- **Primary (`.btn-brut-primary`):** bone bg on dark, ink text. 1px solid bone border. 48px min-height. Mono 12px uppercase. Zero radius. On hover: invert (ink bg, bone text). Active: same as hover with `transform: translateY(1px)` — press, not ease.
- **Ghost (`.btn-brut-ghost`):** transparent bg, `--text-2` text, 1px `--rule` border. Hover: `--text-1` text, `--rule-strong` border.
- **Hot (`.btn-brut-hot`):** only used on one button per screen, if any. 1px `--hot` border, `--hot` text, transparent bg. Hover: `--hot` bg, `--bg` text. This is the button that means *now, do the thing*. Example: the COOK button on a recipe detail.

### 4.3 Inputs

Single base: 48px, 1px `--rule-strong` border (inputs get the stronger rule — they're primary chrome), `--surface` bg, mono 14px, `--text-1` text, `--text-4` placeholder in small-caps. Focus: `outline: 2px solid var(--hot); outline-offset: 0;`.

### 4.4 Tables / rows

The ingredient list is a table. The step list is a table. The search result is a table. **Lists are tables.** Columns are fixed-width where possible (`--col-code: 48px; --col-amount: 96px; --col-unit: 48px; --col-name: 1fr; --col-meta: 80px;`). Row height: 40px. Hover: row bg goes to `--surface-raised`, cursor becomes pointer.

### 4.5 Tags

Zero radius. `1px solid var(--rule)` border. 11px uppercase mono, `--text-2` text. Prefix `#`. Active: invert — `--text-1` bg, `--bg` text, still 0 radius. No pill. No shadow. A label.

### 4.6 Dialogs

Centred modal, 0 radius, 2px `--rule-strong` border, no shadow, no backdrop blur. Backdrop: `--ink-900` at 88% opacity. The dialog has a ticket-style header (`[DIALOG · CONFIRM-DELETE]`) and a hairline-bordered footer with primary / ghost button pair.

### 4.7 Numbers

Anywhere a number is displayed, it is:
- Tabular nums
- Zero-padded when it's a count-of-n (`03/07`, not `3/7`)
- Monospace
- Never italicised

---

## 5. Three killer moments

### 5.1 LIST-AS-SERVICE-TICKET (the recipe list)

The recipe list is the hot-line printer queue. The background is `--ink-900`. The list is a 1px-grid of 160px-tall cards, each card rendered as a literal ticket:

```
┌─ REC-042 · TAG#MAIN TAG#PORK ─────────── 03h AGO ─┐
│                                                    │
│  CRISPY PORK KATSU                                 │
│  Breaded cutlet, cabbage slaw, tonkatsu sauce.     │
│                                                    │
│  ING 12 · STP 07 · SRV 04 · T 00:45               │
│  ──────────────────────────────────────────────   │
│  LAST COOKED ——— · COOKED 00 TIMES                 │
└────────────────────────────────────────────────────┘
```

No photo. No hero image. The ticket *is* the card. When JC hovers, the top border flips from `--rule` 1px to `--hot` 2px — the ticket "fires," one single visual event. Click: the card's whole top border animates to `--medal` in 80ms (linear), then navigates. The featured (first) card is 2× the width with a second column containing the ingredient list preview as a mini-table. That's it. Dense, legible, unlike anything else in the category.

### 5.2 SCALER-AS-INDEX (on the detail page)

The servings scaler is not a pill. It is a cell from a spec sheet. Labelled `[SCALER · REC-042]`, it displays three stacked fields:

```
SCALER · REC-042
─────────────────
  BASE   04 SRV
  TARGET 08 SRV        [ − ][ ×2.00 ][ + ]
  MULT   ×2.00
─────────────────
```

- The `×2.00` digit is set in `--t-40` mono (40px) and switches to `--hot` the instant you're not at base servings. The `−` and `+` are 48×48px boxes with 1px `--rule-strong` borders, no radius, mono 28px glyphs (intentionally plain ASCII `-` and `+`, NOT `−` U+2212 — DOSSIER #1 fix — so iOS summons the numeric keypad on inline number edit).
- Holding `+` for >500ms starts an auto-increment at 2 per second, with the digit counting up in instant steps (no tween). Haptic tick every increment.
- Below: a hairline rule, then `[INGREDIENTS · SCALED ×2.00]` and the ingredient table *counts up* digit-by-digit, tabular, zero jitter. This is the killer moment — the table updates as a mechanical odometer would. No fade, no crossfade: pure discrete ticks.

### 5.3 COOK-MODE-AS-LINE-PRINTER (the KDS screen)

Full-screen. Black bg. One column, 640px max, centred. The wayfinder at the top (`SEKAI · REC-042 · COOK · STEP 3/7 · T+04:21 · ×2 · JC`). Below:

```
                STP-3/7
                ───

               ═══════
                SEAR
               ═══════

   Lay the cutlets in a hot pan.
   Do not move for 90 seconds.
   Flip once. Brown both sides.

                01:22

              [ PAUSE ]
             [ RESTART ]

   ────────────────────────────
   ING-04 · 02 TBSP · NEUTRAL OIL  ✓
   ING-05 · 450 G · PORK CUTLETS    ✓
   ────────────────────────────

   [ PREV STP-2 ]    [ NEXT STP-4 → ]
```

- The step number is 40px mono, hot color, tabular. The step VERB ("SEAR") is set in 64pt display mono, in bone, between two horizontal bone rules — like a title card on a service ticket. Every step gets a verb auto-extracted from step one (we can lean on the step content for the verb, or fall back to `STP-3`). This IS the visual event.
- The timer is gigantic (40–64pt depending on viewport), tabular, counts down linearly. When it hits 00:00, the ticket flashes `--late` for 180ms (one frame of terracotta bg behind the whole ticket), audio beeps, haptic fires. Then the timer reads `OVERDUE +00:04` in `--late`. No modal. No celebration. Just the ticket status changing.
- Completing the last step triggers the **SERVICE COMPLETE** stamp: 64pt display mono, gold, with six `steps(6)` animation ticks making it "print" onto the ticket as if from a dot-matrix head (`█▓▒░` reveal). Below: `COOK-20:41 · DUR 23:14 · STP 07/07 · SRV 04`. That's the medal. That's the one time gold appears in normal use.

---

## 6. What we break from brand (and why)

- **Killed Cormorant Garamond, Noto Serif JP (as body), Barlow Condensed.** Replaced by a single mono family. *Why:* the brief says monospace rebellion, and three-family serif stacks can't carry the ticket aesthetic. We keep Noto Serif JP for a single watermark (`世界` on login at 8% opacity) — respect the name, hand off the body.
- **Killed the grain overlay.** *Why:* grain is decorative by definition. Brutalist-luxe rejects it. Hard paper, not textured paper.
- **Killed frosted nav.** *Why:* blur is ornamental. Replaced with hard 2px rule-strong border + solid bg. More legible under kitchen glare.
- **Killed all shadows on buttons and cards.** *Why:* same reason.
- **Kept:** dark default, terracotta + gold + ink + bone palette, OKLCH everywhere, dark/light toggle, Sm/Md/Lg font preference (scaled to our monospace metrics: 14/16/18px).

The argument: this lane is the most different from the baseline, which is the point of running five teams in parallel. A weak brutalist-luxe that still uses serif would be no answer. The whole bet is type as architecture, mono as the single family, every surface a ticket.

---

## 7. Accessibility

- **Minimum body text 14px.** Scales with user preference — 14/16/18 at sm/md/lg. 11px labels are AA at 4.5:1 against `--ink-900` (`--text-3` = bone-300 = oklch(72% ...), contrast ratio 9.1:1 on ink-900; 5.8:1 on surface-raised; both AA).
- **Tabular mono is a screen-reader friend.** Numbers don't reflow. Amounts read cleanly.
- **Focus rings visible.** 2px terracotta outline, 0 offset, 0 radius — inside the cell, always drawable.
- **Touch targets: 44px min.** Scaler +/− are 48px. Sort pills are 48px. The cook-mode next/prev buttons are 56px. We don't cheat density by shrinking targets.
- **Reduced motion:** disables the `steps(6)` typewriter stamp, the ticket-firing border flip, and the scaler-odometer auto-increment. Leaves state changes instant.

---

## 8. What we don't build

- No photo hero on recipes. (Brand-aligned anti-ref kept.)
- No ratings, streaks, social counts.
- No decorative illustration.
- No gradient backgrounds, no blur, no shadow, no rounded corners beyond the two stated exceptions.
- No third font.
- No animated splash. Login renders instantly. `SEKAI` is printed, not animated in.
- One and only one easter egg: typing `/ssh` in the list search re-renders the list as an ASCII box-drawing table. No one but JC will ever do this. That's the point.
