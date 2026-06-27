# Phase 2 — Cooking Companion: Design Spec

**Date:** 2026-04-12  
**Status:** Approved  
**Scope:** Recipe discovery, serving scaler, unit conversion, cooking mode, quality-of-life polish, print view

---

## Context

jc-recipes is a personal recipe manager used equally on desktop web and mobile web (used as a web app on phone). The user cooks frequently, references the phone throughout cooking, needs timers, checks ingredients mid-step, loses their place, and also runs a food business requiring large-batch scaling of sauces and bases.

The app currently works as a recipe storage tool but is not useful as a cooking companion. This spec covers the features that close that gap.

---

## Build Order

| Phase | Feature | Priority |
|-------|---------|----------|
| 2A | Search + tag filter + sort | 1 — immediate value, no schema changes |
| 2B | Serving scaler + unit conversion + cooking mode | 2 — core cooking UX |
| 2C | Toasts + unsaved-changes warning + unit autocomplete | 3 — quality of life |
| 2D | Print view | 4 — lowest urgency |

---

## Phase 2A — Recipe Discovery

### Goal
Make the recipe list useful at scale. All filtering is client-side — no new API calls.

### Architecture
- `app/(app)/recipes/page.tsx` remains a server component and fetches all recipes as today
- A new `'use client'` component `RecipeListClient` receives the full recipe array and handles all filtering/sorting locally
- Filter state lives in URL search params (`?q=pasta&tags=italiano,rapido&sort=fastest`) so the browser Back button works and state survives refresh

### Features

**Search bar**
- Full-width on mobile, always visible (not hidden behind an icon)
- Filters on `name` and `description` fields
- Debounced 150ms
- Clears with an × button
- Case-insensitive, accent-insensitive

**Tag filter strip**
- Horizontal scrollable row showing all unique tags across the recipe collection
- Click a tag to toggle it — multiple selected tags = AND filter (recipe must have ALL selected tags)
- Active tags highlighted in terracotta
- Each tag minimum 44px tall for thumb accessibility on mobile

**Sort control**
- Desktop: compact dropdown
- Mobile: bottom sheet (dropdowns are thumb-hostile on mobile Safari)
- Options: Newest (default), A→Z, Fastest (total cook time ascending), Most ingredients

**Empty filtered state**
- "No recipes match your search" message distinct from the "No recipes yet" empty state
- Clear-filters button resets all active filters

### Mobile requirements
- Search bar top of page, full-width, always visible
- Tag strip scrolls with momentum scrolling (`-webkit-overflow-scrolling: touch`)
- Sort triggers a bottom sheet, not a `<select>`
- All interactive elements minimum 48px tap target

---

## Phase 2B — Serving Scaler + Unit Conversion + Cooking Mode

### 2B-1: Serving Scaler

**Lives on:** Recipe detail page (`/recipes/[id]`), in the meta strip alongside servings/prep/cook time.

**UI:**
- Serving count becomes tappable — opens inline `−` / [number] / `+` control
- `−` and `+` buttons minimum 48px on mobile
- Changing the count recalculates all ingredient amounts in real time via `multiplier = targetServings / baseServings`

**Display:**
- Renders fractions for small values: ½, ¼, ¾, 1½, 2¼, etc.
- Renders decimals for large batch values (> 10 units)
- A "scaled" badge appears in the meta strip when multiplier ≠ 1
- Reset clears the scaler back to original serving count

**Persistence:** Display-only. Original recipe values are never modified. Scaling is session state only.

**Large batch support:** Multipliers up to 50× must display correctly. No upper limit enforced — the user scales sauces for business production.

---

### 2B-2: Unit Conversion

**Lives on:** Same recipe detail page, as a companion control to the serving scaler.

**UI:** A `Metric | Imperial` toggle in the meta strip. Works independently and combined with the scaler.

**Conversion table (built-in, no API):**

| From | To Imperial |
|------|------------|
| g | oz (÷ 28.3495) |
| kg | lb (× 2.20462) |
| mg | oz (÷ 28349.5) |
| ml | fl oz (÷ 29.5735) |
| l | cups (× 4.22675) |
| dl | fl oz (× 3.38140) |

| From | To Metric |
|------|----------|
| oz | g (× 28.3495) |
| lb | kg (÷ 2.20462) |
| fl oz | ml (× 29.5735) |
| cup | ml (× 236.588) |

**Units that do not convert:** tbsp, tsp, pinch, dash, clove, slice, piece, can, bunch, handful, sprig — displayed as-is in both modes.

**Preference persistence:** Selected unit system stored in `localStorage` as `preferred-unit-system`. Applies on every page load until changed.

**Combined behavior:** Scale to 3× AND switch to Imperial — amounts are multiplied first, then converted. Order: `originalAmount × multiplier → convert`.

---

### 2B-3: Cooking Mode

**Route:** `/recipes/[id]/cook`

**Entry:** "Cocinar" button on detail page — full-width on mobile, right-aligned on desktop. Passes `?servings=N&units=metric|imperial` as URL params so scaling is preserved.

**Exit:** "← Salir" in header returns to detail page. Browser Back also works.

#### Mobile Layout (primary surface)

```
┌─────────────────────────────┐
│ ← Salir      Paso 3 de 8   │  persistent header
│ ████████░░░░░░░░░░░░░░░░░   │  progress bar
├─────────────────────────────┤
│                             │
│  Agregar el ajo y           │  large step text
│  sofreír hasta dorar.       │  fills available height
│                             │
│  ⏱ Paso 3 — 02:00  [▶ Iniciar] │  timer (if step has one)
│                             │
├─────────────────────────────┤
│  [← Anterior]  [Siguiente →]│  64px tall, half-width each
├─────────────────────────────┤
│  📋 Ingredientes          ▲ │  bottom sheet handle
└─────────────────────────────┘
```

#### Desktop Layout

Two-column:
- **Left (60%):** Current step panel — large text, Anterior/Siguiente buttons, step timers
- **Right (40%):** Ingredients panel always visible, checkboxes, scrollable
- **Timers:** Float top-right as persistent pills

#### Step navigation
- `Anterior` / `Siguiente` buttons: full half-width, 64px tall on mobile
- Swipe left/right gesture also advances steps
- Progress bar at top shows position at all times
- "Paso N de M" always visible in header
- Completed steps tracked in session state (can tap back to any previous step)
- Previous steps shown dimmed with checkmark in a mini step-list accessible from the header

#### Ingredient bottom sheet (mobile)
- Handle at bottom of screen — peek at 40% height, full expand at 80%
- All ingredients listed with checkboxes
- Amounts reflect current scaler + unit conversion settings
- Tap to check off an ingredient — struck through, opacity reduced
- Persists for session duration
- Does not block step navigation when collapsed

#### Timers
- Steps with `timer_seconds` show an `[▶ Iniciar]` button
- Tap → countdown starts
- Timer appears as a persistent floating pill at top of screen: "Paso 3 — 02:00"
- Multiple timers run simultaneously
- Each pill shows step number and remaining time
- At zero: pulse animation + device vibration (`navigator.vibrate([200, 100, 200])`) if supported
- Timers survive navigation between steps within the cooking session
- Tap a timer pill to pause/resume

#### Screen wake lock
- `navigator.wakeLock.request('screen')` called on route mount
- Released on route unmount (exit cooking mode)
- Silent graceful fallback if API not supported (no error shown to user)

#### State management
All cooking mode state (current step, checked ingredients, running timers) is React state only — not persisted to DB or localStorage. Refreshing the page resets to step 1. This is intentional — cooking sessions are ephemeral.

---

## Phase 2C — Quality of Life

### Toast notification system
- Lightweight: one React context (`ToastContext`) + one `ToastContainer` component
- No external library
- Variants: `success` (green), `error` (terracotta), `info` (neutral/gold)
- Position: bottom-center on mobile, bottom-right on desktop
- Auto-dismiss after 3 seconds
- Tap/click to dismiss early
- Max 3 toasts visible simultaneously — oldest dismissed first

**Used for:**
- Markdown import successful
- Recipe saved (create or edit)
- Recipe deleted
- Copy ingredient list to clipboard
- Error messages from server actions (replaces inline error display)

### Unsaved changes warning
- Applies to: `RecipeForm` when used in edit mode
- Implementation: custom hook `useUnsavedChanges(isDirty: boolean)`
- `isDirty` = true as soon as any field value differs from initial load
- Intercepts `window.beforeunload` (browser close/refresh + tab close)
- Next.js App Router navigation interception: wrap Cancel button and Back link with a confirm check; `beforeunload` covers all other exit paths
- Shows browser-native confirmation dialog: "Tienes cambios sin guardar. ¿Salir de todas formas?"
- Clears on successful form submit

### Copy ingredient list
- A "Copiar ingredientes" button on the recipe detail page, below the ingredient list
- Copies all ingredients to clipboard as plain text: one per line, format `amount unit name` (scaled + converted if active)
- On success: toast "Ingredientes copiados" (success variant)
- On failure (clipboard API unavailable): toast with error message
- Button uses `.btn-ghost` style, minimum 44px tap target

### Unit autocomplete on ingredient rows
- The `unit` field in `IngredientRow` gets `list` attribute pointing to a `<datalist>`
- Datalist contains all supported units: `g, kg, mg, ml, l, dl, cup, tbsp, tsp, oz, lb, fl oz, pinch, dash, clove, slice, piece, can, bunch, handful, sprig`
- Native HTML — no library, works on mobile Safari
- Free text still allowed — user can type anything not in the list

---

## Phase 2D — Print View

**Implementation:** `@media print` CSS block in `globals.css`. No new page or route.

**Hidden on print:** nav bar, "Cocinar" button, Edit button, Delete button, scaler/unit controls, tag filter strip, page background textures/shadows.

**Printed:** Recipe title, meta strip (servings, prep time, cook time), ingredients as clean list, steps as numbered list, notes. Scaled amounts print as shown on screen.

**Typography:** Print uses system serif fallback for compatibility. Font size 12pt minimum.

---

## Cross-Cutting Requirements

### Mobile-first, desktop-equal
Every feature must be designed and tested for both surfaces. Mobile constraints:
- All tap targets minimum 48px
- No hover-only interactions
- Bottom sheets instead of dropdowns for complex selection on mobile
- Text legible at arm's length (cooking mode: minimum 18px body, 24px+ for step text)
- Screen orientation: portrait primary, landscape must not break

### Design system consistency
- All new UI uses existing CSS custom properties (`var(--bg-card)`, `var(--text-1)`, etc.)
- New component classes added to `globals.css` `@layer components`
- No hardcoded colors in components
- Font hierarchy: display (Noto Serif JP) for titles, label (Barlow Condensed) for UI labels, body (Cormorant Garamond) for content

### No schema changes
Phases 2A, 2C, 2D require zero database changes.
Phase 2B (cooking mode) requires zero database changes — all state is ephemeral.
The `photos` field already exists in the schema but is out of scope for this spec.

### Test preservation
All existing Playwright e2e tests must continue passing. New features add new tests but do not modify existing test strings, aria-labels, or data-testids.

---

## Out of Scope (this spec)

- Photo upload/display
- Recipe sharing / export
- Last-cooked date tracking
- Favorites / ratings
- Bulk operations
- Offline/PWA manifest
- AI recipe generation
