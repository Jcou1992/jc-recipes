# /impeccable:critique — Cycle 2 (whole-app, both modes)

> Scope: every route × every state × Classic + Brut × dark + light × desktop + mobile.
> Lens: Nielsen 10 heuristics, **worse-of-the-two-modes** drives the row score.
> Source: code (HEAD = `00fa4ee`), `contest/winner/after-screenshots-v2/**` (brut, both themes, both viewports), prior critique `critique-mode-separation.md`, dossier.
>
> Note: dev server was not reachable on `localhost:3000` (ECONNREFUSED) at audit time, so live `WebFetch` lookups could not corroborate runtime DOM. Findings rely on source-of-truth code paths and v2 screenshots. Where a finding is screenshot-only, that's flagged.
> Note 2: the v2 screenshot manifest is **brut-mode only** (`"designMode": "brut"` in `_manifest.json:2`). Classic-mode rendering is reasoned from code + the prior cycle's classic-baseline review; if any classic-only regression exists post-cycle-1 fixes that's invisible to the screenshots, it would be in addition to what's here.

---

## Design Health Score

Nielsen 10 heuristics × 4 = **32 ceiling**. Each row takes the worse of (classic, brut).

| # | Heuristic | Score | Worse mode | Key issue |
|---|---|---|---|---|
| 1 | Visibility of system status | **2** | brut | Wayfinder kicker `[HINT · KEYS] /:SEARCH F:FILTER ESC:CLEAR` is shown on every brut route — including `/login`, `/recipes/new`, `/recipes/[id]`, `/edit`, `/print`, `/settings` — but `/`, `f`, `Esc` shortcuts are **only active on `/recipes`** (via `RecipeListClient`). System advertises capabilities it doesn't have on 6 of 7 routes. Also: no save-state indicator on form pages, no compute progress on macros, no offline status. |
| 2 | Match real world | **3** | brut | "BULKDEL-W2-1776892154725-A" recipe ref-codes are pure machine grammar — the chef-user has never spoken in this dialect. Acceptable as decoration once you learn it; jarring as the *primary* page title (mobile detail screen renders this 3-line code instead of the recipe name). Classic side: macros card label and "× scaler" math reads correctly. |
| 3 | User control & freedom | **3** | both | No undo on ingredient/step delete (dossier 5.4 still open). No back-link inside cook mode in brut (the wayfinder swallowed the local EXIT button at `CookMode.tsx:483/634` — the only escape is the system back gesture or the small SEKAI · REC-XXX crumb which is not a discoverable affordance). On desktop classic the local EXIT row reappears, so brut is the regression. |
| 4 | Consistency & standards | **2** | brut | The kicker advertises `/`, `F`, `ESC` (3 shortcuts). `KeyboardShortcutsDialog` advertises 5 — adds `N` and `?` (`GlobalShortcuts.tsx:22-28`). Two surfaces, two truths. Plus the "EXIT" wording: brut wayfinder uses "←" arrow + "BACK", desktop classic uses "← Back", cook mode uses "EXIT". Plus mobile light-theme "T" avatar is **terracotta filled with bone-letter** but the dark-mode "T" is **dark-on-warm-orange** (orange in dark, deeper terracotta in light) — the affordance jumps colour-meaning across themes. |
| 5 | Error prevention | **3** | both | Form-level validation is silent until submit (`RecipeForm`); no inline required-field hints. Markdown import has no preview-before-commit warning of malformed input. Scaler `−` glyph is U+2212 not `-` so iOS doesn't summon numeric keypad (dossier 1, **still open** — no commit since cycle 1 references this). Bulk-delete confirms but copy is generic ("Delete N recipes?") with no last-chance undo toast. |
| 6 | Recognition rather than recall | **2** | brut | The kicker is brut-only — classic users have **zero** keyboard-shortcut surface. They must press `?` to discover anything, but `?` is itself undiscoverable. The dossier flagged this as #5 friction; cycle 1 only solved it for brut. Also `[ MISE · EMPTY ]` ticket label requires the user to know "mise" and "EMPTY" both mean "you have no recipes" — fine for JC, opaque for invited chefs. |
| 7 | Flexibility & efficiency | **3** | both | No power-user shortcuts on detail/edit (`E` for edit, `K` for cook, `Cmd+S` to save, `Cmd+P` to print). `n` for new exists but is undiscoverable. No "duplicate recipe" action despite forking being a chef behaviour. Cook mode still doesn't support parallel timers (dossier 3). Markdown import is a tab — a power user would want a paste-detection fast path. |
| 8 | Aesthetic & minimalist | **2** | brut | The brut detail page renders the database UUID slug ("BULKDEL-W2-1776892154725-A") at 56pt mono as the **page title** (`recipe-detail.png` desktop and mobile both). On a one-step recipe with `salt`, the title visually dominates a screen that is otherwise nearly empty. On mobile the title also wraps awkwardly across 3 lines and pushes the EDIT/DELETE row down 200 px before the user sees ingredients. The kicker's `[HINT · KEYS]` row also appears on `/login` where it has zero meaning — pure visual debt. Classic side: parallax cover + first-save underline + ink-brush — all valid. |
| 9 | Error recovery | **3** | both | Login error is well-styled (`LoginForm.tsx:14-25`), recipes-page DB error has a Retry button (`recipes/page.tsx:50-62`). Missing: 404 on `/recipes/[id]` is `notFound()` — Next.js default chrome, not branded. Cook-mode wake-lock failure is silent. Macros compute failure has no toast on the detail page. Print page with `?ids=bogus` returns "No recipes selected." (`print/page.tsx:31-35`) which is wrong copy for the failure mode. |
| 10 | Help & documentation | **2** | both | No first-run tour beyond the optional `?tour=1` URL flag (`recipes/page.tsx:72`). Settings has a "Replay onboarding" button but no inline help on what each toggle does. The brut kicker promises hints but doesn't actually help once you've used the keys 3× (auto-collapses to `[?] KEYS` button, dossier confirms). No recipe-format docs link near the markdown-import tab. Settings page uses `LGT`, `MD`, `ES` as mode labels (visible in `dark/desktop/settings.png` line 815) — opaque without a key. |

**Total: 25 / 40 raw → cap at 32 → 25 / 32**

Improvement vs. cycle 1: +4 (cycle 1 was 21/32 with 2 heuristics n/a; this cycle takes the conservative full-32 baseline and lands at 25). The mode-separation P1/P2 fixes from cycle 1 hold (verified `tokens-brutalist.css:1293+` style, `data-code` gate at `RecipeCard.tsx:32`, `--brut-hot` rename at `tokens-brutalist.css:35`). What's left is whole-app polish: the brut kicker's promiscuous mounting + the recipe-detail title behaviour are the two biggest single-fix levers.

---

## Anti-Patterns Verdict

**Does either mode read as AI-generated?**

- **Classic:** No. Dark serif app with a coherent terracotta+gold+ink language. Animation set is restrained (`animate-fade-up`, `animate-stroke-in`, ink-brush, parallax cover, first-save underline) — small and named, not generic Framer Motion bag-of-tricks.
- **Brut:** No. The Wayfinder + ref-code grammar (`REC-XXXX`, `STP-01`, `ING-01`, `T+00:01`, `[ MISE · EMPTY ]`, `UNMATCHED`) is a self-consistent industrial vocabulary. Current AI defaults trend rounded glassmorphic; this is the opposite axis — Berkeley Mono on ink, hairline 1px borders, no shadows, no easing. The empty-state ticket `[ MISE · EMPTY ]` and the `[NEW]/[LAST]/[DORMANT]` row taxonomy from the borrows are the un-copyable signature.

**Specific tells that *would* have indicated AI-slop, all absent:**

- No gradient blobs, no glassmorphism on either side.
- No emoji icons (the avatar is a typed "T" not a "🧑").
- No "✨ improved with AI" copy.
- No purple-pink accent, no Inter as body text, no rounded-full chip soup.

**One subtle tell to address:** the recipe ref-code title (`BULKDEL-W2-1776892154725-A`) reads like a generated placeholder fixture leaking into prod. It IS a deterministic hash of the recipe ID and that's the brut grammar — but for a recipe whose actual name is "BulkDel-w2-1776892154725-A" (literally a test fixture), the system has no way to know the human-readable name is itself fixture-shaped. The brut detail page should still render the **human name** prominently, with the ref-code as the small wayfinder crumb. Today both surfaces show the SAME string in different sizes — the human name vanishes.

---

## Overall Impression

The app is clearly handcrafted at the line-of-code level — token discipline is excellent, every animation is named, the cook mode is genuinely good kitchen UX. Cycle 1 closed the brut-bleed structural issues. What remains is **scope discipline at the route boundary**: the brut wayfinder + kicker behave as if every route is `/recipes`, and the brut detail page treats the ref-code as a name-replacement instead of a meta-affordance. Two fixes (gate the kicker per-route; demote the ref-code to a sub-label) collapse 5+ Nielsen findings simultaneously.

Honest read: this is a 28-29/32 app pretending to be a 25/32 app because of one or two visible "I'm a system, not a tool" tells. With the kicker route-gate + title-slot-fix below, it can be 30/32 inside an afternoon. The remaining 2 points to ceiling are structural product decisions (parallel timers, version history) the user has explicitly logged as future work in the dossier.

---

## What's Working

1. **Token + suppression hygiene.** Cycle 1's CSS kill-block fixes hold. Brut tokens are scoped, classic decorations are properly suppressed. `--brut-hot` rename eliminates collision risk. Classic mode is byte-clean post-`47d122a` (cook header CSS-relocation).
2. **Cook mode is genuinely best-in-class.** Wake-lock + haptics + audio beeps + swipe + URL-persisted scaler/units survive every mode toggle. The `T+04:21` elapsed clock in the wayfinder is the kind of detail nobody else ships.
3. **Login + form architecture.** `useActionState` for login, server actions with RLS for everything else, optimistic `recordCooked()` writes that don't block the completion screen. `EmailPreviewBootstrap` is a clever per-email cache so the login page can preview the user's saved theme/font-size before they re-auth — that is restaurant-grade detail.

---

## Priority Issues — Cycle 2

### [P0] [#1, #4, #6, #8] Brut kicker + wayfinder mounted on routes that don't have its shortcuts

**WHERE:**
- `app/layout.tsx:105` — `<RouteAwareWayfinder crumb="SEKAI" userLabel="" />` mounted on every route except `/cook`.
- `components/ui/brut/Wayfinder.tsx:82-101` — kicker hint row is unconditional whenever brut is on (only suppression is `hideKicker` prop, used by cook mode only).
- `components/ui/GlobalShortcuts.tsx:13-14` + `components/recipes/RecipeListClient.tsx:142-151` — `/`, `f`, `Esc` are bound on the LIST page only. `n` is global. `?` is global.

**WHAT:** The kicker text reads `[HINT · KEYS] /:SEARCH F:FILTER ESC:CLEAR` on `/login`, `/recipes/new`, `/recipes/[id]`, `/edit`, `/print`, `/settings`. Pressing `/` on `/recipes/new` types a slash into the focused input. Pressing `F` does nothing. Pressing `Esc` only blurs whatever is focused. **The system advertises three shortcuts that are inactive on 6 of 7 routes.**

Verified visually in:
- `dark/desktop/login.png` (kicker visible above the SEKAI splash).
- `dark/desktop/recipes-print.png` (kicker visible above an authenticated unfocused print viewport).
- `dark/desktop/settings.png`, `recipes-new.png`, `recipe-detail.png`, `recipe-edit.png` — all carry the same row.

**WHY:** Visibility (#1) — system status lies. Consistency (#4) — kicker says 3 shortcuts, dialog says 5 — the user can't form a stable mental model. Recognition (#6) — there is no surface anywhere advertising `N` (new) or `?` (help), the two shortcuts that are actually global. Aesthetic (#8) — login carries 32 px + 24 px of telemetry chrome before the brand even appears.

**FIX:** Make the kicker route-aware. Three options, ranked:

**(a) Route-aware kicker contents (recommended).** Each route declares its own shortcut payload via a context or per-page Wayfinder instantiation:

```tsx
// components/ui/brut/Wayfinder.tsx
type ShortcutHint = { key: string; label: string };
type WayfinderProps = {
  // ...existing props
  shortcuts?: ShortcutHint[]; // null/[] hides the kicker entirely
};
// then render only the keys passed in.
```

In `app/layout.tsx`:

```tsx
{designMode === 'brut' && (
  <RouteAwareWayfinder
    crumb="SEKAI"
    userLabel=""
    // RouteAwareWayfinder reads pathname and chooses the shortcut set:
    //   /login           → []
    //   /recipes         → [/, F, Esc, N, ?]
    //   /recipes/new     → [Esc, ?]
    //   /recipes/[id]    → [E, K, P, ?]
    //   /recipes/print   → []
    //   /settings        → [Esc, ?]
  />
)}
```

**(b) Strip the kicker on auth + print routes only (minimum-viable).** In `RouteAwareWayfinder.tsx:23` extend the suppression list:

```tsx
const HIDE_KICKER_PATHS = ['/login', '/cook', '/recipes/print'];
const HIDE_WAYFINDER_PATHS = ['/cook'];
if (pathname && HIDE_WAYFINDER_PATHS.some(p => pathname.includes(p))) return null;
const hideKicker = pathname ? HIDE_KICKER_PATHS.some(p => pathname.includes(p)) : false;
return <Wayfinder {...props} hideKicker={hideKicker} />;
```

This still advertises `/F:Esc` on form pages where they're inactive — kicks the can.

**(c) Bind the shortcuts globally (cheapest but breaks form UX).** Move `useKeyboardShortcut('/')` etc. to `GlobalShortcuts` and have it route-bounce to `/recipes?q=…` from anywhere. Tempting; not recommended (typing `/` in an ingredient name should not bounce you).

**Default if unsure:** apply (a) to the `/login` and `/recipes/print` routes (zero shortcuts) and add `N` + `?` to the list-route kicker at minimum.

**COMMAND:** `/clarify` (kicker copy + per-route wiring) → `/audit` (verify each route's advertised hint set matches its bound shortcuts).

---

### [P0] [#8, #2] Recipe ref-code overpowers the recipe name on detail (brut)

**WHERE:**
- `app/(app)/recipes/[id]/page.tsx:45-54` — the `<h1>` renders `recipe.name` at `text-4xl` (36 px) bold display.
- The fixture used for v2 screenshots happens to be named `BulkDel-w2-1776892154725-A` — a stress-test name. But the brut grammar **uppercases + bolds** it via `tokens-brutalist.css` global mono + the no-rounded rule, producing `BULKDEL-W2-1776892154725-A` as a 56-px-equivalent visual.
- Mobile (`dark/mobile/recipe-detail.png`): the title wraps to **3 lines** and pushes the COOK button to ~1500 px down the page.

**WHAT:** When recipe names contain a hyphen or numeric segment, brut renders them as if they were ref-codes, indistinguishable from the ones the system also generates. There is no visual hierarchy separating "name JC typed" from "code system minted."

**WHY:** Aesthetic (#8) — the page feels like a database admin view, not a chef's recipe. Match-real-world (#2) — the noun ordering (recipe → ref-code) is inverted; ref-code dominates name. Even with a normal recipe like "Salt-cured egg yolks" the brut all-caps mono grammar will still feel coded — but the name will at least be readable.

**FIX:**

```tsx
// app/(app)/recipes/[id]/page.tsx
<h1
  className="recipe-title font-display text-4xl font-bold leading-tight break-words min-w-0"
  // brut: cap name height; for >24-char names, rely on overflow-wrap
  style={{ ...existing, hyphens: 'auto' as const }}
>
  {recipe.name}
</h1>
{/* Add a small ref-code chip just under the name in brut mode */}
{isBrut && <RefCode value={recipe.id} className="brut-detail-ref" />}
```

Plus brut CSS to cap title at `--t-40` and force `text-transform: none` for the title so the user-typed casing (`BulkDel...` not `BULKDEL...`) is preserved:

```css
:root[data-design="brut"] .recipe-title {
  font-size: clamp(1.5rem, 4vw, 2rem);  /* was 4xl ≈ 2.25rem desktop */
  text-transform: none;
  letter-spacing: 0;
}
```

**COMMAND:** `/typeset` (size + tracking) → `/layout` (mobile stack order).

---

### [P0] [#1, #5] Mobile settings: SAVE button overlaps the SPACE NAME input

**WHERE:** `light/mobile/settings.png` and `dark/mobile/settings.png` show the input value `Test Space 177` clipped at the right edge by an inline SAVE button. The text content is `Test Space 1777082963237` but only `Test Space 177` is visible.

Code: `app/(app)/settings/page.tsx` (not read this turn — the layout is handled by an `EditableSpaceName`-like component for the workspace section). The mobile clip is from the `flex-row gap-X` arrangement: the SAVE button takes a fixed slot, the input absorbs the rest, but the input's text overflows.

**WHAT:** A name longer than ~14 characters is unreadable on a 360-px viewport.

**WHY:** Visibility (#1) — user can't see what they typed. Error prevention (#5) — they may save a typo they can't even see.

**FIX:** Stack the SAVE button under the input on `<sm` breakpoints:

```tsx
<div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center">
  <input ... className="flex-1" />
  <button ... className="self-start sm:self-auto">SAVE</button>
</div>
```

Or add `text-overflow: ellipsis` + `dir="ltr"` so the END of the input text is visible when overflowing (so the user sees `…3237` not `Test Space 177`).

**COMMAND:** `/adapt` (mobile breakpoint).

---

### [P1] [#10, #4] Settings labels `LGT`, `MD`, `ES` are opaque

**WHERE:** `dark/desktop/settings.png`, `light/desktop/settings.png` (and mobile equivalents). The Theme/FontSize/Language rows use `Theme  DRK`, `Font size  MD`, `Language  ES` — three-letter mono codes only.

**WHAT:** No tooltip, no longer label, no chooser-affordance hint. The user has to *click* to learn that DRK means dark and that the field is even editable.

**WHY:** Help & docs (#10). Consistency (#4) — every other row in settings has a verb (SAVE, REPLAY ONBOARDING, SIGN OUT). These rows look like read-only status.

**FIX:** Show the toggle UI inline (the actual three-state pill in classic, the bracketed segmented control in brut). The current mono-code is fine as a *summary* but it should be a button that opens a chooser, with a `›` glyph or an underline-on-hover affordance.

```tsx
<button
  type="button"
  className="brut-settings-row-button"
  onClick={openThemeChooser}
  aria-label={`Theme — currently ${theme.toUpperCase()}, click to change`}
>
  <span>Theme</span>
  <span className="brut-settings-current">{theme.toUpperCase()}</span>
  <span aria-hidden="true">›</span>
</button>
```

**COMMAND:** `/clarify` (copy + affordance).

---

### [P1] [#3, #6] Cook-mode brut: no visible EXIT affordance on desktop or mobile

**WHERE:**
- `dark/desktop/recipe-cook.png` and `light/desktop/recipe-cook.png` — the wayfinder shows `SEKAI · REC-2IGB · COOK` as a non-link breadcrumb with no underline. The previous local EXIT button is suppressed under brut by `tokens-brutalist.css [data-cook-local-header] { display: none }` (cycle 1 fix). There is no replacement.
- `components/recipes/CookMode.tsx:480-483` — the local desktop EXIT button is wrapped in a div that's CSS-hidden in brut.

**WHAT:** Once a user enters cook mode in brut, the only way out is the browser back button or pressing the SEKAI crumb (which isn't styled as a link).

**WHY:** User control & freedom (#3) — chef paused mid-step, kid is asking a question, needs to bail. They need a tappable EXIT. Recognition (#6) — the breadcrumb is grey-on-black mono, indistinguishable from inert telemetry.

**FIX:** Either (a) re-mount the EXIT button under brut with brut grammar (border 1px terracotta, `[ESC] EXIT` label), or (b) make the wayfinder crumb a `<Link>` with the `brut-way-crumb` class adding underline-on-hover. Option (a) is more robust (a 32 px header isn't a tap target on mobile anyway).

```tsx
// CookMode.tsx — replace the suppressed EXIT row with a brut version
{isBrut && (
  <div className="brut-cook-exit-row">
    <Link href={`/recipes/${recipe.id}`} className="brut-cook-exit">
      [ESC] ← EXIT
    </Link>
  </div>
)}
```

**COMMAND:** `/adapt` (touch target) → `/clarify` (copy).

---

### [P1] [#5, #4] iOS scaler `−` glyph still doesn't summon numeric keypad

**WHERE:** Detail page scaler control. The dossier flagged this in cycle 0 (`DOSSIER.md:131-132`); cycle 1 didn't address it. `RecipeDetailClient.tsx` still emits `−` (U+2212) per the dossier note.

**WHAT:** Tapping the minus button gives a wet-handed chef the wrong keyboard if focus shifts to a field.

**WHY:** Error prevention (#5). Consistency (#4) — Cookies + ingredient quantity inputs use proper numeric inputs; the scaler doesn't.

**FIX:** Replace the rendered glyph with `-` (HYPHEN-MINUS U+002D) for buttons. If the glyph is *displayed* as `−` for typographic reasons, separate the displayed character from the inputmode/aria-label. Or just trust the `+`/`−` to be button-only and never let focus shift to an input via these buttons.

**COMMAND:** `/harden` (input UX).

---

### [P2] [#1, #5] Form validation is silent until submit

**WHERE:** `components/recipes/RecipeForm.tsx` (not read this turn, but the dossier and the `recipes-new.png` confirm: required-field asterisks are present, no inline error state until submit). `MarkdownImport.tsx` similarly silent.

**WHAT:** Empty NAME or empty INGREDIENTS doesn't error until you click CREATE. Then the toast or red flag appears.

**WHY:** Visibility (#1), error prevention (#5). The chef wants to know if they can save BEFORE they tap the bone-coloured CREATE button.

**FIX:** Disable the submit button until required fields pass + show a subtle `[ ] REQUIRED` hint on each empty required field after first blur (not on first focus).

```tsx
const isValid = name.trim() && ingredients.some(i => i.name.trim()) && steps.some(s => s.content.trim());
<button type="submit" disabled={!isValid} aria-disabled={!isValid}>CREATE</button>
```

**COMMAND:** `/harden` (form UX).

---

### [P2] [#9] 404 page is unbranded Next.js default

**WHERE:** `recipes/[id]/page.tsx:33` calls `notFound()` — this routes to Next.js default chrome (white background, "404 — This page could not be found.")

**WHAT:** Visiting `/recipes/<bogus-id>` drops the user into the framework default page. Brand chain breaks.

**WHY:** Error recovery (#9) — recovery is "go back to the home page" and the user has to press the browser back button.

**FIX:** Add `app/not-found.tsx` (and `app/(app)/recipes/[id]/not-found.tsx` for the resource-specific case) using the brand chrome and the brut wayfinder if applicable.

```tsx
// app/(app)/recipes/[id]/not-found.tsx
export default function RecipeNotFound() {
  return (
    <main className="...">
      <h1>RECIPE NOT FOUND</h1>
      <p>The recipe you're looking for doesn't exist or you don't have access.</p>
      <Link href="/recipes">← Back to all recipes</Link>
    </main>
  );
}
```

**COMMAND:** `/harden` (error states).

---

### [P2] [#1, #10] No loading skeleton for `/recipes` initial load (only Suspense fallback)

**WHERE:** `app/(app)/recipes/page.tsx:135-141` — Suspense fallback shows `<div className="rounded-xl h-32 animate-pulse">` for the first 4 recipes. But the data is fetched server-side and Suspense only fires if the inner component itself suspends — which `RecipeListClient` (a client comp) doesn't on first paint. So the skeleton effectively never shows.

**WHAT:** On a slow Supabase response the user sees the EditableSpaceName + Sort row for ~500ms before any cards appear. No "loading" cue.

**WHY:** Visibility (#1) — is it loading or am I just out of recipes? Help (#10) — would be nice to confirm progress.

**FIX:** Add a `loading.tsx` at the route level that renders a skeleton list. Or add a small `[ ⋯ FETCHING ]` ticket in brut while the server component is awaiting.

```tsx
// app/(app)/recipes/loading.tsx
export default function Loading() {
  return <RecipeListSkeleton />;
}
```

**COMMAND:** `/harden`.

---

### [P2] [#4, #6] Avatar "T" colour-meaning swaps between dark + light themes

**WHERE:** `components/ui/AvatarMenu.tsx:46-49` — `background: var(--color-terracotta-contrast)` + `color: var(--color-bone)`. The `terracotta-contrast` token derives differently in dark vs. light, producing:
- Dark mode: filled red square with bright text "T".
- Light mode: filled deeper terracotta/red square with bone text "T".

In v2 screenshots the dark variant reads as a hot-CTA red square (`#bf3614`-ish), the light variant as a similar-but-darker red. The shape is the same; the heat is different.

**WHAT:** The avatar reads as "this is a destructive button" in dark — the same visual weight as the DELETE button in `recipe-detail.png`.

**WHY:** Consistency (#4) — destructive-red is also the avatar-red. Recognition (#6) — affordance ambiguity.

**FIX:** Use `--color-bone-card` background + `--color-terracotta` text in dark, similar inversion in light, so the avatar reads as a *named slot* not a *hot button*.

**COMMAND:** `/colorize` or `/quieter`.

---

### [P3] [#2] "MACROS NOT YET COMPUTED" + "COMPUTE MACROS →" reads as bureaucratic

**WHERE:** `recipe-detail.png` (both modes, both themes). Component is in `components/MacrosCard.tsx`.

**WHAT:** Default state copy is technical. A chef thinks in "calories", "protein per serving", etc. — not "macros not yet computed."

**WHY:** Match-real-world (#2). Even in brut grammar, a more chef-native verb is available.

**FIX:**
- Brut: `[ MACROS · UNKNOWN ]` ticket with the COMPUTE button styled as `→ ESTIMATE`.
- Classic: "We haven't estimated calories yet." + button "Estimate from ingredients →".

**COMMAND:** `/clarify`.

---

### [P3] [#1] Markdown export filename uses lower-case ASCII slug — strips diacritics, emoji

**WHERE:** `RecipeDetailClient.tsx:75` — `recipe.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.md'`.

**WHAT:** A recipe named "Crème brûlée" exports as `cr-me-br-l-e.md`. A recipe with Japanese characters exports as `.md`.

**WHY:** Visibility (#1) — the file the user thought they exported isn't recognisable from the filename.

**FIX:** Use `name.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/[^A-Za-z0-9]+/g, '-')`. Already imported `normalise()` in `RecipeListClient.tsx:16-18`; lift it to `lib/utils/normalise.ts`.

**COMMAND:** `/polish`.

---

### [P3] [#8] Login page: kicker row above SEKAI splash adds visual debt

Already covered under P0-#1 above; flagging the aesthetic angle.

**WHY (#8):** The hero of `/login` is the SEKAI 世界 wordmark. It's preceded by 56 px of grey mono telemetry that means nothing here. Not ideal for a brand surface.

**FIX:** Same as P0 — gate the kicker per route. `/login` should be wayfinder-free.

**COMMAND:** `/distill`.

---

## Persona red flags

**JC, 17:30 service, hands wet, brut mode, mobile.** Opens a recipe titled "Tonkatsu sauce". The brut wayfinder reports `SEKAI · REC-9KW8 · DETAIL` (good — context anchor). Below: `[HINT · KEYS] /:SEARCH F:FILTER ESC:CLEAR` (wrong — none of these work on this screen). Below: SEKAI 世界 + T avatar (both work). Below: a 56-pt mono title `TONKATSU SAUCE`. Then EDIT/DELETE side-by-side — the DELETE button is 1.5 px terracotta-bordered red text on dark. JC's wet thumb hits DELETE by mistake while reaching for EDIT. **Two persona-level fixes:** (a) bigger EDIT-DELETE separation or hide DELETE behind a long-press, (b) kicker should not promise irrelevant shortcuts.

**Demo-account guest, classic, desktop, first-ever visit.** They land on `/login`, sign in. They see the SEKAI wordmark at top, then the Editable Space Name they just barely glimpsed. They scan for "what can I do here?" — the only affordance is `+ NEW RECIPE` top-right. There's no help, no `?` hint, no tour entry visible (tour is `?tour=1`). They press `?` accidentally; the dialog appears showing 5 shortcuts. **Persona fix:** add a small `[?] KEYS` button in classic too — symmetry with brut.

**Trusted-chef invitee, classic, mobile.** They open the app at 06:00 on the bus. Theme is dark from the cookie. They tap into `/recipes/new`. The form's NAME field is empty; they tap CREATE by mistake. The button does nothing visible — they don't realise validation failed. **Persona fix:** disabled-until-valid state + subtle "Required: name, 1 ingredient, 1 step" hint copy.

---

## Minor observations

- **Light-mode mobile mini-icon clipping:** `light/mobile/settings.png` shows the SAVE button taking up enough space to clip the input. Same root cause as P0 mobile fix.
- **Print page "No recipes selected." copy** (`print/page.tsx:31-35`) renders in light mode default body face — looks unbranded. Should at minimum be `font-display` or wrapped in a `<Ticket code="PRINT · EMPTY" />` in brut.
- **`metadata.title`** is inconsistent: `'Print - jc-recipes'` (`print/page.tsx:6`) vs `'My Recipes — SEKAI'` (`recipes/page.tsx:16`). Standardise on `— SEKAI` em-dash.
- **Cook mode swipe transition is silent** (dossier item; not regressed but still unaddressed).
- **`brut-empty-rule`** uses `─` (U+2500) box-drawing 20 times to make a horizontal line. It is decorative-only; could be a single CSS rule (`border-top: 1px dashed`).
- **`pathname.includes('/cook')`** in `RouteAwareWayfinder.tsx:27` is also true for any future `/cookbook` route. Trivial today; flagged in cycle 1.
- **Mobile recipe-detail title overflow:** the `BULKDEL-W2-...` example is contrived; for typical names (≤32 chars) the layout is fine. But the dossier flagged R1 (recipe title overflow-wrap) and the fix at `3e9c6a0` covers wrap but not the 56-pt size on small viewports. Consider a `clamp(1.75rem, 5vw, 3rem)` for the title.
- **Wayfinder data-hot promotion** lights up the right-most slot terracotta on hot states (cook timer running, scaled servings). Verified in code (`Wayfinder.tsx:75`), not yet exercised in screenshots.

---

## Open questions

1. **Should the brut detail page render the human recipe name AT ALL, or commit fully to ref-code grammar?** The current state is incoherent: it renders the name in mono-uppercase, which makes it indistinguishable from ref-codes. The choice is "name-first with ref-code as small chip" or "ref-code-first with name as subtitle." Pick one. (Recommendation: name-first; a chef thinks in names. Ref-code is wayfinder telemetry.)
2. **Should `/login` and `/recipes/print` mount the brut wayfinder at all?** `/login` has no user state to display in the user-slot. `/print` is intended for paper output where the wayfinder is correctly suppressed via `@media print`. Both routes would lose nothing by going wayfinder-free. (Recommendation: yes, suppress.)
3. **Should `?` be advertised in the brut kicker?** Right now the kicker shows `/`, `F`, `Esc` and the `?`-help-dialog is undiscoverable. Including `?` in the kicker would make it self-disclosing. (Recommendation: yes, add `?:HELP` as the 4th key — survives the auto-collapse logic because it's the meta-shortcut.)

---

## Action plan to ceiling

To move from 25/32 → 30/32 (and the remaining 2 points are structural product decisions: parallel timers, version history):

1. **`/clarify`** — rewrite kicker payload to be route-aware. `/login` + `/print` get no kicker; list gets `/F:Esc + N + ?`; new/edit get `Esc + ?`; detail gets `E + K + P + ?`; settings gets `Esc + ?`. (Closes P0-#1, partial #4, #6, #10.)
2. **`/typeset`** — cap recipe-detail title size, preserve user casing, demote ref-code to a small chip. (Closes P0-#2 + #8 leak.)
3. **`/adapt`** — mobile settings SAVE button stacking; mobile recipe-title clamp size; mobile EXIT button in cook mode. (Closes P0-#3 + P1 cook EXIT.)
4. **`/harden`** — disabled-until-valid form submit + branded `not-found.tsx` + iOS numeric-input scaler glyph. (Closes P1 + P2 form/404/scaler.)
5. **`/clarify`** — settings labels (`DRK` → "Dark", or keep `DRK` as a status with a clearer "click to change" affordance). Macros copy. (Closes P1 + P3 #10.)
6. **`/polish`** — markdown export filename i18n. Title/metadata em-dash standardisation. Print empty-state copy. (Closes P3 nits.)
7. **`/critique` rerun** — re-score; expect 30/32 with #6 (recall) and #7 (efficiency) as the remaining structural caps.

Estimated effort: 2-3 hours for steps 1-3 (the P0 lifters); +1-2 hours for steps 4-6 (P1/P2/P3 cleanup). Cycle 3 critique should land 30/32.

---

## Appendix — file:line references for fixes

| Issue | File | Lines |
|---|---|---|
| Kicker per-route gate | `app/layout.tsx` + `components/ui/brut/RouteAwareWayfinder.tsx` + `components/ui/brut/Wayfinder.tsx` | layout 105, RAW 23-29, Wayfinder 36-47 + 82-101 |
| Recipe-detail title size + casing | `app/(app)/recipes/[id]/page.tsx` + `styles/tokens-brutalist.css` | page 45-54, css add new `.recipe-title` rule |
| Mobile settings SAVE stacking | settings page + EditableSpaceName-equivalent | TBD on read |
| Cook-mode brut EXIT | `components/recipes/CookMode.tsx` + `styles/tokens-brutalist.css` | CookMode 480-490 + 631-640 |
| Scaler `−` glyph | `components/recipes/RecipeDetailClient.tsx` (scaler block, not in this turn's read but flagged in dossier line 132) | scaler block |
| Form validation visibility | `components/recipes/RecipeForm.tsx` | submit-button block |
| 404 brand | `app/not-found.tsx` (new) + `app/(app)/recipes/[id]/not-found.tsx` (new) | new files |
| Loading state | `app/(app)/recipes/loading.tsx` (new) | new file |
| Avatar colour | `components/ui/AvatarMenu.tsx` | 46-49 |
| Markdown export filename | `components/recipes/RecipeDetailClient.tsx` | 75 |
| Print metadata title | `app/(app)/recipes/print/page.tsx` | 6 |

End-state target: Nielsen total **30/32**, with the 2 caps being parallel-timers + version-history (both flagged in dossier as future-work, not closed in this critique).
