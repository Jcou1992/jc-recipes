# Design — Serving Definition (F2)

**Status:** approved (with Open Questions pending)
**Date:** 2026-04-23
**Revised:** 2026-04-23 (post-review)
**Author:** JC (via brainstorming with Claude)
**Related specs:** `2026-04-23-macros-mvp-design.md` (direct consumer)
**Reserved migration range:** `20260425_0020xx_*.sql`

---

## Goal

Let chef label one portion of a recipe in their own words — "1 burger", "250 g", "150 ml", "1 slice" — without coupling this label to macro math.

## Non-goals

- No weighing of the finished dish required.
- No yield %, no density of finished dish, no per-100g view.
- No impact on existing `servings` integer field (unchanged).

## Key insight — and its limit

Macros math at the per-serving level can be computed from raw ingredient sums divided by `servings_count`. Per-serving macros = `total_raw_macros / servings`. Therefore finished-dish weight is **not required** for the math F3 does.

**Known approximation:** raw ingredient sums ignore real-world cooking losses — fat rendered off and discarded (10–30% of fat grams on fatty cuts), removed items (bay leaves, bouquet garni, ginger chunks in stock), water absorbed into ingredients from cooking (rice). Macros are not truly conserved through cooking — they are *reasonably approximated* by raw sums minus known losses. The MVP does not model losses; it treats the raw sum as the estimate, accepting systematic bias on fatty cuts and broths. Future work can add per-ingredient render factors or explicit `yield_grams` without schema migration pain.

## Design

### Schema change

```sql
-- supabase/migrations/20260425_002000_add_serving_size_label.sql
ALTER TABLE recipes
  ADD COLUMN serving_size_label text NULL
  CHECK (serving_size_label IS NULL OR length(trim(serving_size_label)) > 0);
```

One nullable text column. NULL means no custom label (UI falls back to showing just "Serves N"). Non-null with whitespace-only is disallowed to prevent meaningless displays.

### TypeScript type

`types/recipe.ts`:

```ts
export interface Recipe {
  // ...existing...
  serving_size_label: string | null;
}

export interface RecipePayload {
  // ...existing...
  serving_size_label?: string;
}
```

### Form UX

In the recipe form (`/recipes/new` and `/recipes/[id]/edit`), add **one new row** below the existing `Servings` field:

```
Servings (portions per recipe)
[ 4 ]

Serving size label (optional)                 [ 12/40 ]
[ 1 burger                                 ]
^ example: "1 burger", "250 g", "1 slice", "150 ml"
```

No unit picker. No amount splitter. Single free-text input with helper text showing 4 example formats.

Maximum length: 40 characters (validation; rejects overflow that would break card layout).

**Character counter:** visible to the right of the label, shows `N/40`. Displays in neutral color when N ≤ 30; amber at 31–40; rejected at > 40 with inline error "Serving size label must be 40 characters or fewer".

### Display

Recipe detail page (existing), replace the current `Serves N` chip with:

- If `serving_size_label` null: `Serves 4`
- Else: `Serves 4 · 1 burger`

Cooking mode (`/cook`), recipe cards, print view: inherit the same formatting helper.

**Display truncation:** on list-card chips (space-constrained), truncate label at 20 characters with ellipsis. Full label on detail page only.

**New helper:** `lib/utils/format-servings.ts` — exports `formatServings(recipe, opts?): string` returning the combined label. Optional `opts.truncate?: number` for constrained surfaces. Single source of truth for the surfaces that render servings.

### Import / markdown

Existing markdown import (`parseRecipeMarkdown()`) gains optional front-matter support:

```yaml
servings: 4
serving_size_label: 1 burger
```

Backward compatible — absence means null.

### Scaling

Existing serving scaler (`lib/utils/scaling.ts:86` — `processIngredients`) is unaffected. Scaler multiplies amounts by `newServings / originalServings`.

**Scaled-display concern:** a "1 burger" recipe (servings=4) scaled to 8 servings currently displays as `Serves 8 · 1 burger`. This composite string is ambiguous under kitchen pressure. MVP keeps the label static (simplest; no pluralization engine; no parse-and-multiply heuristics). Known UX limit — tracked in Open Questions.

## Error handling

- Empty string submitted: coerce to null before insert.
- Over 40 chars: client + server validation error, inline message "Serving size label must be 40 characters or fewer".
- Whitespace only: rejected by CHECK constraint; form validates client-side too.

## Testing

### Jest

- `formatServings` helper: null label → "Serves 4"; with label → "Serves 4 · 1 burger"; singular fallback on servings=1; truncation with `opts.truncate = 20` cuts at boundary + ellipsis.

### Playwright

Extend existing `recipes-crud.spec.ts` (`@regression`):

- Create recipe with `serving_size_label = "1 burger"` → verify card + detail render.
- Edit recipe, clear label → verify fallback to "Serves N".
- Create recipe with label > 40 chars → verify inline error.
- Type past 30 chars → verify amber counter state.
- Import markdown with `serving_size_label` front-matter → verify round-trip.

## Out-of-scope / future

- `yield_grams` for per-100g view and render-loss modeling
- Unit-aware label parsing (e.g. extract "g" from "250 g" for analytics)
- i18n pluralization for `Serves N` beyond current handling
- Scaled-label multiplication ("1 burger" × 8 = "8 burgers")

## Dependencies and ordering

F2 is a prerequisite for F3's display card (MacrosCard renders the label next to per-serving macros). Ship F2 before F3. Reserved migration prefix `20260425_002*` places it before F3's `003*` in lexicographic order.

## Rollback

Drop the `serving_size_label` column. Form field is gated on column presence via the TypeScript type; builds fail loud if the column disappears, which is correct — ensures UI and schema stay in sync.

---

## Open Questions (deferred to user decision; review round 1)

### Scope questions

- **OQ-1. Markdown front-matter support — keep or drop?** Not in original ask. The serving-label goal is met without it. Argument for keeping: parseRecipeMarkdown already handles other fields, so front-matter parity is low effort. Argument for dropping: +1 feature surface, +1 e2e test, no named user problem.
- **OQ-2. format-servings helper — does it earn its keep?** Created to centralize formatting across "3+ surfaces" (detail, /cook, list cards, print). If cooking-mode and print-view display are deferred (see F3 OQs), only detail-page uses it → abstraction with one consumer.

### Design questions

- **OQ-3. Scaled-display ambiguity.** "Serves 8 · 1 burger" is admitted-weird. Under kitchen pressure, chef could read it two ways. Alternatives: (a) suppress label when scaled (show only "Serves 8"); (b) naive scale (extract leading number and multiply: "8 burgers" with English-s pluralization); (c) accept the ambiguity as MVP cost. Current MVP = (c). Upgrade when chef complaints surface.

### Identity questions

- **OQ-4. Should F2 ship independent of F3?** F2 stands alone as a chef-voice improvement even if F3 is deferred or restructured. The cross-spec coupling is cosmetic (MacrosCard renders the label beside macros). If F3 scope changes radically, F2 is still worth shipping.
