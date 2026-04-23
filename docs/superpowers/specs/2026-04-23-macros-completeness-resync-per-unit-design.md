# Design — Macros Revision: Completeness Salience, USDA Re-search, Per-Unit Overrides

**Status:** approved design (ready for implementation plan)
**Date:** 2026-04-23
**Author:** JC (via brainstorming + parallel agent adjudication + PMC-grounded web research)
**Supersedes portions of:** `2026-04-23-macros-mvp-design.md` (partial-state display, manual-override basis, modal UX)
**Reserved migration range:** `20260426_003xxx_*.sql`

---

## Goal

Revise the macros feature along three axes — completeness salience, per-ingredient USDA re-search, and per-unit manual-override basis — so that:

1. Partial nutrition is shown **honestly and saliently**, not silently (closes the documented under-reporting gap identified by the 2019 PMC *Evaluation of the Recipe Function in Popular Dietary Apps*).
2. Chefs whose recipes are in Spanish (or otherwise diverge from USDA English terms) can re-query FDC **without mutating the recipe ingredient name**.
3. Manual overrides are entered in the unit the chef already reads on packaging or produce labels ("per 1 tomato", "per 1 tbsp") — not per-100g arithmetic.

## Non-goals

- Changing the USDA data source, compute pipeline core, or recipe data model beyond the additions noted below.
- Revising `computeRecipeMacros` for USDA-matched ingredients (they remain per-100g).
- Adding a daily-value dashboard, micronutrients, or historical tracking.
- Cross-recipe batch re-match workflows.

## Key decisions

| Decision | Choice | Rationale |
|---|---|---|
| Partial-match display policy | **Option B — show partial live with salient annotation** (not Option A "hide", not Option C "threshold") | PMC accuracy gap is a salience problem, not a display-policy problem. Hiding violates Principles 1 (mise en place: everything visible) and 5 (speed: no gating). B mitigates PMC harm via execution: loud annotation + unmatched pills + inline CTA chip. |
| Re-search UX | **Per-row progressive disclosure: `Search again →` reveals inline query input, decoupled from recipe ingredient name** | Preserves authored intent (Spanish names stay Spanish). 10% case unlocks full search; 90% case stays uncluttered. Differentiator — no surveyed app does this. |
| Manual-override basis | **Adaptive per-unit: countable + spoon/cup + container units → `per_unit`; weight (g/kg/oz/lb) and liquid volume (ml/l) → `per_100g`** | Matches real nutrition-label reading behavior. No surveyed app does this (Cronometer closest via named servings). Zero arithmetic for the chef in the common produce/spoon case. Liquids in ml stay per-100g because packaged-liquid nutrition labels almost always read per 100 ml. |
| Schema additions | `macros_override_basis?: 'per_100g' \| 'per_unit'` on each ingredient; `fdc_name?: string` cached alongside `fdc_id` | Basis enables correct compute without heuristic inference. fdc_name enables "currently matched: X" display when saved match falls outside current top-3 candidates. |

## Architecture

### Data layer

#### Ingredient schema additions (JSONB inside `recipes.ingredients`)

```ts
interface Ingredient {
  name: string;
  amount: number | null;
  unit: string | null;
  fdc_id?: number;
  fdc_name?: string;              // NEW — cached at save time
  macros_override?: MacroValues;
  macros_override_basis?: 'per_100g' | 'per_unit';  // NEW — required when macros_override present
}
```

No migration required — JSONB is schemaless. Backfill behavior:
- Existing ingredients with `macros_override` but no `macros_override_basis` → treat as `per_100g` (preserves current behavior for all legacy overrides).
- Existing ingredients with `fdc_id` but no `fdc_name` → compute action fetches name lazily on next modal open and persists.

#### Unit classification

Lives in `lib/macros/unit-basis.ts` (new file).

```ts
const PER_UNIT_UNITS = new Set([
  // countable
  'pieces', 'piece', 'clove', 'cloves', 'slice', 'slices',
  // spoons / cups
  'tbsp', 'tsp', 'tablespoon', 'tablespoons', 'teaspoon', 'teaspoons',
  'cup', 'cups',
  // containers
  'can', 'cans', 'bottle', 'bottles', 'packet', 'packets',
]);

export function inferBasisForUnit(unit: string | null): 'per_100g' | 'per_unit' {
  if (unit === null) return 'per_unit';  // countable default
  const norm = unit.trim().toLowerCase();
  return PER_UNIT_UNITS.has(norm) ? 'per_unit' : 'per_100g';
}

export function basisLabel(unit: string | null, basis: 'per_100g' | 'per_unit'): string {
  if (basis === 'per_100g') return 'Per 100 g';
  const norm = unit?.trim().toLowerCase() ?? null;
  if (norm === null || norm === 'pieces' || norm === 'piece') return 'Per 1 piece';
  return `Per 1 ${norm.replace(/s$/, '')}`;  // clove/slice/tbsp/etc
}
```

### Compute layer (`lib/macros/compute.ts`)

Per-ingredient macro contribution logic:

```
if (ing.macros_override && ing.macros_override_basis === 'per_unit') {
  contribution = amount × override   // NEW path
} else if (ing.macros_override) {
  // legacy / per_100g override
  contribution = gramsOf(amount, unit) / 100 × override
} else if (ing.fdc_id) {
  // USDA match — always per-100g source
  contribution = gramsOf(amount, unit) / 100 × usda[fdc_id]
} else {
  // unmatched — contributes zero; counted in total_count but not matched_count
}
```

Scaling remains linear — `recipe_total × (targetServings / recipe.servings)` still correct for both bases.

### Server actions (`app/actions/macros.ts`)

**Extended `BatchEntry`:**

```ts
export interface BatchEntry {
  ingredientIndex: number;
  expectedName: string;
  fdcId?: number;
  fdcName?: string;           // NEW — client sends when picking radio
  override?: MacroValues | null;
  overrideBasis?: 'per_100g' | 'per_unit';  // NEW — required when override set
}
```

**`setIngredientMatches`** persists both `fdc_name` and `macros_override_basis`. Validation:
- If `override` set → `overrideBasis` required; else reject with `Override basis missing`.
- If `overrideBasis === 'per_unit'` → skip the `fat+carbs+protein ≤ 100g` validation (that rule only makes sense per-100g).
- Per-unit values still validated against reasonable per-piece ceilings (e.g., kcal ≤ 1500 per unit — catches typos like entering per-recipe-total).

**`searchFdcAction(query: string)`** unchanged — already accepts arbitrary query string, decoupled from recipe ingredient name.

**New action: `searchFdcForRowAction(query: string)`** — thin wrapper identical to `searchFdcAction` but rate-limited client-side (debounced 250ms). Optional; if not needed, reuse existing action.

### Unit-change guard (recipe edit flow)

When a user edits a recipe ingredient and changes `unit` such that `inferBasisForUnit(oldUnit) !== inferBasisForUnit(newUnit)`:
- Clear `macros_override` + `macros_override_basis` on that ingredient.
- Clear `fdc_id` + `fdc_name`? **No** — USDA match still valid as long as new unit has a gram conversion. Only override needs clearing (basis changed).
- Emit toast on successful save: `"{Ingredient} macros cleared — re-enter for new unit"`.
- Implementation: hook into `updateRecipe` server action, compare pre/post ingredients by index, clear stale override fields before write.

## UI layer

### MacrosCard — three states

#### State 1: `recipe.macros === null`
Unchanged from today. "Macros not yet computed" + `Compute macros →` button triggers `triggerCompute`.

#### State 2: `matched_count < total_count` (partial — **REVISED per Option B**)

```
┌────────────────────────────────────────────────────────────┐
│ PER SERVING · 2 SERVINGS · ~ESTIMATE         [edit ↗]      │
│                                                            │
│ ~455 kcal                                                  │
│ ~14.2 g fat · ~22.1 g carbs · ~28.3 g protein · ~3.1 g fb  │
│                                                            │
│ [·········· macros bar ··········]                         │
│                                                            │
│ ESTIMATE · 5 OF 7 INGREDIENTS MATCHED                      │
│  ┌──────────────────────────────────┐                      │
│  │  Match 2 remaining →             │ ← terracotta chip,   │
│  └──────────────────────────────────┘   not a tiny link    │
└────────────────────────────────────────────────────────────┘
```

**Requirements:**
- Numbers render live (computed from matched ingredients, unmatched contribute 0).
- Status line directly beneath macros bar, **same visual weight as the provenance line in state 3** (Barlow Condensed 11px, `--text-3`). **Not** parenthetical inside the count row.
- CTA is an **inline chip**, not a text link. Terracotta background tint, 44px min-height, full-width on mobile. Inline on desktop if width permits.
- `aria-live="polite"` on the status line. Count decrement announces on each save.
- Card tone: gold-tinted background (existing `isPartial` styling preserved) — reinforces "in progress."

#### State 3: `matched_count === total_count && total_count > 0` (complete)
Mostly unchanged. Annotation line collapses to provenance: `USDA FoodData Central` in Barlow Condensed 11px, `--text-3`. Small `edit` link top-right.

#### Motion
When the last unmatched ingredient is resolved (save closes modal with `matched_count` hitting `total_count`):
- 200ms crossfade: chip → provenance line.
- No layout jump — chip and provenance line share the same reserved vertical slot.
- Respects `prefers-reduced-motion` (instant swap).

### Unmatched-ingredient pills in ingredients list

Separate from MacrosCard. On recipe detail page, each ingredient row in the ingredient list gains:
- Small amber pill `unmatched` (Barlow Condensed 10px, `--color-gold`-tinted) — only when `fdc_id` + `macros_override` both absent.
- Pill is clickable → opens match modal scrolled to that ingredient's row (`data-testid="match-row-${idx}"` anchor).
- This is the PMC-harm mitigation: the chef cannot miss which rows are the problem.

### MacrosMatchModal — per-row progressive search

#### Default row layout (unchanged where possible)

1. Station header: ingredient name (read-only) + amount/unit context + status pill
2. USDA candidate radio list (top 3 from `searchFdcAction(ing.name)`)
3. Links row: `Search again →` (new) · `Enter manually →` (existing)
4. Manual entry form (shown when `showManual` true or no candidates)

#### `Search again →` disclosure

State additions to `RowState`:
```ts
searchOpen: boolean;          // disclosure
searchQuery: string;          // input value; seeded with ing.name on first open
searchLoading: boolean;       // debounced re-query in flight
```

When open, row reveals:
```
┌─ Search USDA differently ────────────────────────────────┐
│ [ tomato                                          ]  ✕   │
│                                                          │
│  ○ Tomatoes, raw                                         │
│  ○ Tomatoes, red, ripe, canned                           │
│  ○ Tomato sauce, canned                                  │
└──────────────────────────────────────────────────────────┘
```

- Input pre-filled with `ing.name` on first open.
- Live re-query: `onChange` debounced 250ms → `searchFdcAction(query)` → replaces `candidates`.
- ✕ button collapses disclosure, restores previous candidates.
- Picking a candidate collapses disclosure automatically and marks the pick.
- `aria-expanded` on `Search again` button; `aria-controls` points to disclosure region.
- Input `aria-label="Search USDA differently for {ing.name}"`.

#### "Current match" pill (fdc_name display)

When `ing.fdc_id` is set but the id does not appear in `row.candidates`:
- Render a pill above the candidate list: `Current match: {fdc_name}` in terracotta tint, with a radio dot pre-selected.
- User can unselect it by picking a different candidate or entering manual.
- Requires `fdc_name` persisted at match time (see schema additions).

#### Manual entry form — per-unit basis

Replace today's static "values per 100 g" footnote (two existing copy sites in `MacrosMatchModal.tsx`: the per-row `isCountableIngredient` note and the global modal-bottom footnote) with a **dynamic label directly above the five macro inputs**:

```
PER 1 TOMATO                          ← basisLabel(ing.unit, basis)
┌──────┬──────┬──────┬──────┬────────┐
│ kcal │ fat  │carbs │protein│ fiber │
│  22  │ 0.2  │ 4.8  │  1.1  │  1.5  │
└──────┴──────┴──────┴──────┴────────┘
```

- Label style: Barlow Condensed 11px tracking-widest uppercase, `--text-3`.
- Label updates live if the recipe ingredient's unit changes (rare in-modal, but supported).
- No more "divide by piece weight" instruction — eliminated.
- Single global footnote at modal bottom adjusts:
  - Old: "Macros are stored per 100 g of the raw ingredient, so scaling…"
  - New: "Weight / volume ingredients stored per 100 g. Countable items stored per unit. Scaling stays accurate either way."

#### Hint for USDA-gram-equivalent

Deferred — see Open Question 1. Ship the per-unit manual entry without a gram-equivalent hint; add only if users report guessing.

### Accessibility

- `aria-live="polite"` on MacrosCard status line.
- `aria-expanded` / `aria-controls` on `Search again` buttons.
- Unmatched pill in ingredients list: `aria-label="Ingredient {name} unmatched, tap to resolve"`.
- All new tap targets ≥44px per project baseline.
- No color-only semantics — amber pill carries `unmatched` text label.

## Interaction model

### End-to-end walkthrough (Classic Smash Burger, 4 servings, 5 ingredients)

1. **Create recipe** → Ground beef 600 g, Tomato 2 pieces, Garlic 3 clove, Olive oil 2 tbsp, Salt 1 tsp.
2. **Detail page** → MacrosCard state 1 (`macros === null`). Chef taps `Compute macros →`.
3. **Compute completes** → Auto-match returns high-confidence USDA match for ground beef only. MacrosCard enters **state 2**: numbers show ~1524 kcal recipe total from beef alone, per-serving ~381, status line `ESTIMATE · 1 OF 5 INGREDIENTS MATCHED`, chip `Match 4 remaining →`.
4. **Tap chip** → MacrosMatchModal opens. Beef row shows matched radio pre-selected + `Current match: Beef, ground, 80% lean, raw`. Tomato/garlic/oil/salt rows all show `No match` status pill.
5. **Tomato row** → USDA returned nothing (query was English "tomato" but chef typed Spanish "tomate"). Actually — `searchFdcAction("tomate")` returns zero candidates. Chef taps `Enter manually →`. Label reads `PER 1 PIECE`. Enters 22 / 0.2 / 4.8 / 1.1 / 1.5. Status pill flips to `Manual`.
6. **Garlic row** → 3 USDA candidates. Chef taps `Enter manually →`, label `PER 1 CLOVE`, enters 4 / 0 / 1 / 0.2 / 0.1. Status → `Manual`.
7. **Olive oil row** → 3 candidates (all per-100g). Chef taps `Enter manually →`, label `PER 1 TBSP`, enters 120 / 14 / 0 / 0 / 0. Status → `Manual`.
8. **Salt row** → Chef leaves at zero manual, or picks top USDA candidate. Either works.
9. **Save** → Modal closes. `matched_count === total_count`. MacrosCard state 3: full readout, provenance line `USDA FoodData Central · edit`. 200ms crossfade from chip to provenance.
10. **Next cook** → Chef scales 4 → 2 servings. Numbers halve. Unit toggle metric → imperial: beef displays as lb, macros unchanged (per-100g uses stored grams; per-unit ingredients unit-invariant).

### Re-search walkthrough

1. Open modal on a recipe with ingredient "tomate" (Spanish), unmatched.
2. Row shows `No match` pill, no candidates.
3. Chef taps `Search again →` (rendered even with zero candidates, because the disclosure is the escape hatch).
4. Input appears pre-filled with `tomate`.
5. Chef types `tomato`, 250ms debounce fires → live re-query → 3 candidates appear.
6. Chef picks "Tomatoes, raw" → disclosure collapses, radio marked, status pill flips to `Matched`.
7. Recipe ingredient name **stays** `tomate` — authored intent preserved.

## Key states summary

| Surface | State | Trigger | Visual |
|---|---|---|---|
| MacrosCard | Empty | `recipe.macros === null` | "Macros not yet computed" + Compute button |
| MacrosCard | Partial (**NEW behavior**) | `matched_count < total_count` | Numbers + `ESTIMATE · N OF M MATCHED` status line + inline chip CTA + gold-tinted card |
| MacrosCard | Complete | `matched_count === total_count` | Numbers + provenance line + `edit` link |
| Ingredients list | Unmatched row (**NEW**) | Ingredient has neither `fdc_id` nor `macros_override` | Amber `unmatched` pill, clickable to modal |
| Match modal row | Matched | `fdc_id` set, in top 3 candidates | Radio pre-selected |
| Match modal row | Matched-off-list (**NEW**) | `fdc_id` set, not in top 3 candidates | `Current match: {fdc_name}` pill above list, pre-selected |
| Match modal row | Manual | `macros_override` set | Manual form visible, basis label shown, status `Manual` |
| Match modal row | Search open (**NEW**) | User tapped `Search again` | Disclosure reveals input + live candidates |
| Match modal row | Unmatched | No data | Zero candidates + both escape hatches (manual + search) visible |

## Content requirements

| String | Copy |
|---|---|
| Partial card status line | `ESTIMATE · {N} OF {M} INGREDIENTS MATCHED` |
| Partial card CTA | `Match {N} remaining →` (singular: `Match 1 remaining →`) |
| Complete card provenance | `USDA FoodData Central` |
| Ingredient list unmatched pill | `unmatched` |
| Modal: re-search disclosure header | `Search USDA differently` |
| Modal: re-search input placeholder | `Try a different name…` |
| Modal: per-unit label | `PER 1 {UNIT}` (e.g., `PER 1 PIECE`, `PER 1 CLOVE`, `PER 1 TBSP`) |
| Modal: per-100g label | `PER 100 G` |
| Modal: footnote (revised) | `Weight and volume ingredients stored per 100 g. Countable items stored per unit. Scaling stays accurate either way.` |
| Unit-change toast | `{Ingredient} macros cleared — re-enter for new unit` |
| Complete-state motion live announce | `Macros ready` |

## Testing

### Jest (unit)
- `inferBasisForUnit` — table-driven: countable, spoons, weight, volume, null, unknown units.
- `basisLabel` — table-driven including plural stripping (`cloves` → `Per 1 clove`).
- `computeRecipeMacros` — new tests for per-unit overrides, mixed per-unit + per-100g + USDA in one recipe, scaling linearity.
- `validateOverride` — per-unit path (no fat+carbs+protein ≤ 100 check, but per-unit ceilings).

### Playwright (e2e)
- `@regression` — partial state renders numbers + status + chip; chip navigates to modal.
- `@regression` — unmatched pill in ingredient list is clickable + scrolls modal to correct row.
- `@regression` — re-search: type in disclosure input, candidates update, pick one, name unchanged on close.
- `@regression` — per-unit manual entry: label reflects ingredient unit, saves with correct basis, compute uses per-unit math.
- `@regression` — complete-state transition: last match triggers provenance crossfade (reduced-motion variant: instant).
- `@regression` — unit-change guard: edit ingredient unit pieces → g, override clears, toast shows.

### Manual smoke
- Spanish recipe ingredients → re-search with English term → match succeeds.
- Recipe with zero matches → partial state shows 0 numbers + chip (PMC-mitigation verified: pills visible, cannot miss).

## Telemetry (optional, follow-up)

Track match-resolution funnel:
- `macros_partial_state_viewed` — emit when state 2 renders
- `macros_match_chip_tapped`
- `macros_resolve_success` — `matched_count` reaches `total_count`
- `macros_research_query` — count re-search uses per row to measure if the decoupled-search hypothesis pays off

Deferred if metrics infra is not already in place.

## Open Questions

1. **USDA-gram-equivalent hint for per-unit overrides.** Surfacing "typical 1 tbsp olive oil ≈ 14 g" as a hint below the manual form requires either (a) maintaining a hand-curated per-unit→grams table, or (b) a best-effort lookup from USDA's Foundation Foods `foodPortions` table if seeded. Deferred — ship without hint, add if users report guessing.
2. **Cook mode macros display.** Spec does not revise `/cook`. If cook mode today shows partial estimates, should it adopt the same state-2 treatment? Lean yes for consistency, but out of scope here — flag for follow-up spec.
3. **Export surfaces (PDF/MD).** Do exported recipe macros inherit the "estimate" annotation when partial, or should we block macros inclusion entirely in exports until 100%? Lean: label with "estimate" in exports too, same salience principle. Confirm before implementation.
4. **fdc_name backfill.** Legacy ingredients with `fdc_id` but no `fdc_name` — lazy-fetch on next modal open, or one-time migration that queries `nutrition_facts` and patches all rows? Lazy is simpler and avoids touching prod data; migration is cleaner. Lean lazy.
