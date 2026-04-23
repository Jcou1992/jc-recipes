# Design — Macronutrient Calculator MVP (F3)

**Status:** approved (with Open Questions pending)
**Date:** 2026-04-23
**Revised:** 2026-04-23 (post-review)
**Author:** JC (via brainstorming + web research with Claude)
**Related specs:** `2026-04-23-serving-definition-design.md` (display coupling)
**Reserved migration range:** `20260425_0030xx_*.sql`

---

## Goal

Display calories, fat, carbs, protein, and fiber for every recipe — both per-recipe total and per-serving — with zero ongoing API cost and chef-grade accuracy within the known approximations (see Key limits). Chef matches each ingredient to a USDA entry once; values cache on the recipe and recompute on ingredient change.

## Non-goals

- Micronutrients (sodium, iron, vitamins, etc.)
- LLM compound decomposition (deferred; separate spec if ever needed)
- Per-100g finished-dish view
- Daily-value percentages
- Historical macro trends / diet tracking
- Branded packaged products (USDA Branded subset dropped)

## Key limits (honest about approximation)

Macros computed from raw-ingredient sums. Known systematic biases:

- Fat rendered off and discarded (pan grease) — typically 10–30% fat-gram overstatement on fatty cuts.
- Items removed before plating (bay leaves, bouquet garni, ginger chunks in stock) — kcal overstatement.
- Water absorbed into ingredients changes mass but not macros.
- Bone weight included in some USDA "meat with bone" entries — select "meat only" variants where possible.

Display surfaces labeled "estimate" when any ingredient is unresolved. Chef can manually override per-ingredient to correct for these biases.

## Key decisions (from brainstorm + review)

| Decision | Choice |
|---|---|
| Data source | USDA FoodData Central (Foundation + SR Legacy), bulk CSV, CC0 |
| API calls | None. Data lives in Supabase. |
| Matching | Lazy — recipe saves without matches. Chef matches later via modal. |
| Display | Always-on card above ingredients on recipe detail page only (other surfaces deferred — see OQ) |
| Override | Per-ingredient only (5 fields per 100g). No per-recipe override. |
| Auto-match confidence rule | Top score ≥ 0.75 AND gap from 2nd ≥ 0.15 AND query token count ≥ 3; otherwise unresolved (never silent-wrong). |
| Cached fields on ingredient | `fdc_id`, `macros_override` only. **No cached `grams`** — always recomputed from amount+unit at compute time. Avoids stale-cache bug on amount edit. |

## Architecture

### Data layer

#### 1. `nutrition_facts` (reference data, public read)

```sql
-- supabase/migrations/20260425_003000_enable_pg_trgm.sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

```sql
-- supabase/migrations/20260425_003001_create_nutrition_facts.sql
CREATE TABLE nutrition_facts (
  fdc_id        integer PRIMARY KEY,
  name          text NOT NULL,
  kcal          numeric NOT NULL,       -- per 100 g
  protein_g     numeric NOT NULL,
  fat_g         numeric NOT NULL,
  carbs_g       numeric NOT NULL,
  fiber_g       numeric NOT NULL,
  source        text NOT NULL CHECK (source IN ('foundation','sr_legacy'))
);

CREATE INDEX nutrition_facts_name_trgm
  ON nutrition_facts
  USING GIN (name gin_trgm_ops);

ALTER TABLE nutrition_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY nutrition_facts_authenticated_read
  ON nutrition_facts FOR SELECT
  TO authenticated
  USING (true);
```

Seed flow:
- `scripts/seed-usda.mjs` downloads USDA bulk CSV (Foundation + SR Legacy only) over HTTPS.
- Script verifies downloaded CSV against a SHA-256 hash recorded in `scripts/.usda-csv.sha256` (committed).
- Filters to the 6 columns above.
- Generates `supabase/migrations/20260425_003002_seed_nutrition_facts.sql` as multi-row INSERT batches of 500 rows each + `ON CONFLICT (fdc_id) DO UPDATE SET ...` so the migration is idempotent and re-running updates in place.
- The committed migration is the authoritative artifact (no runtime network dep).
- Annual refresh is a separate maintenance script that re-runs the generator; reviewers diff the new migration and merge intentionally.

pg_trgm note: extension is available on all Supabase tiers (pre-approved allowlist) and `CREATE EXTENSION IF NOT EXISTS` is run by the `supabase db push` process with the postgres role. No special credentials needed.

#### 2. `ingredient_densities` (for volume→g, public read)

```sql
-- supabase/migrations/20260425_003003_create_ingredient_densities.sql
CREATE TABLE ingredient_densities (
  name        text PRIMARY KEY,
  g_per_cup   numeric,
  g_per_tbsp  numeric,
  g_per_tsp   numeric
);

ALTER TABLE ingredient_densities ENABLE ROW LEVEL SECURITY;
CREATE POLICY ingredient_densities_authenticated_read
  ON ingredient_densities FOR SELECT
  TO authenticated
  USING (true);
```

Hand-curated seed via migration, ~100 rows: flour, sugar, rice, oats, oil, etc. Source: USDA SR density appendix + general culinary reference.

#### 3. `ingredient_count_weights` (for "2 eggs", "1 onion", public read)

```sql
-- supabase/migrations/20260425_003004_create_ingredient_count_weights.sql
CREATE TABLE ingredient_count_weights (
  name        text PRIMARY KEY,
  g_per_item  numeric NOT NULL
);

ALTER TABLE ingredient_count_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY ingredient_count_weights_authenticated_read
  ON ingredient_count_weights FOR SELECT
  TO authenticated
  USING (true);
```

Hand-curated seed, ~80 rows: egg (large)=50, onion (medium)=150, garlic clove=5, etc.

#### 4. Additions to `recipes`

```sql
-- supabase/migrations/20260425_003005_add_macros_to_recipes.sql
ALTER TABLE recipes
  ADD COLUMN macros jsonb NULL,
  ADD COLUMN macros_computed_at timestamptz NULL;
```

`macros` shape (or NULL if never computed):

```json
{
  "kcal": 1562,
  "protein_g": 98,
  "fat_g": 72,
  "carbs_g": 120,
  "fiber_g": 18,
  "matched_count": 5,
  "total_count": 5,
  "unresolved_ingredients": []
}
```

`unresolved_ingredients` is an array of `{index, name, reason}` objects for ingredients that could not be computed.

**Three distinct display states distinguished by the column value:**
| State | Condition | UI |
|---|---|---|
| Not yet computed | `macros IS NULL` | MacrosCard renders CTA: "Compute macros" (triggers server action) |
| Zero matched | `macros.matched_count = 0` | MacrosCard renders CTA: "Match ingredients to see macros" (opens modal) |
| Partial | `0 < matched_count < total_count` | Amber badge with values + list of unresolved in modal |
| Complete | `matched_count = total_count` | Green badge + full values |

**Backfill on F3 ship:** migration does NOT backfill macros for existing recipes. They stay `NULL` and display the "Not yet computed" CTA. Chef clicks CTA to compute the first time. Rationale: compute needs autoMatch + chef confirmation for accuracy; running it in a migration would silently produce half-accurate data.

#### 5. Extension to `recipes.ingredients` JSONB (backward compatible)

Current: `{amount, unit, name}`
Extended: `{amount, unit, name, fdc_id?, macros_override?}`

- `fdc_id`: integer — resolved match, persisted after chef confirms in modal (or auto-match hits the strict threshold).
- `macros_override`: `{kcal, protein_g, fat_g, carbs_g, fiber_g}` per 100 g — if present, bypasses FDC lookup entirely.

**No cached `grams` field.** Grams are computed from `amount + unit + name` on every compute call. Cheap (table lookup or arithmetic). Removes an entire class of stale-cache bugs on amount edits.

All new fields optional. Absence = chef has not matched yet.

**Ingredient identity:** position in the array is the identifier (existing pattern). setIngredientMatch/setIngredientOverride read back the ingredient at the given index and verify `name` matches the expected name (passed by the UI); if the name no longer matches (concurrent edit reordered or renamed), the action returns an error asking the user to re-open the modal. Prevents silent cross-ingredient writes.

### Library code

#### `lib/macros/unit-to-grams.ts`

```ts
resolveGrams(ingredient: Ingredient): { grams: number } | { unresolved: string }
```

Deterministic rules:

| Unit | Strategy |
|---|---|
| `g`, `kg`, `mg` | Direct conversion (kg×1000, mg÷1000) |
| `oz`, `lb` | Fixed: 1 oz = 28.35 g, 1 lb = 453.6 g |
| `ml`, `l` | Volume × density (default 1.0 g/ml; future: per-ingredient density) |
| `fl oz` | 1 fl oz = 29.57 ml → density |
| `cup`, `tbsp`, `tsp` | Lookup in `ingredient_densities` by name; if miss, generic (cup=240 ml, tbsp=15 ml, tsp=5 ml) × density 1.0 |
| `pieces`, `clove`, `slice`, `null` (countable) | Lookup in `ingredient_count_weights` by name |

Returns `{ unresolved: reason }` if no rule matches — caller flags the ingredient.

Unit normalization: lowercased, stripped, aliases mapped (`'tablespoon' → 'tbsp'`, `'teaspoons' → 'tsp'`, etc.). Alias table lives beside the resolver.

#### `lib/macros/match.ts`

```ts
searchFdc(query: string, limit = 5): Promise<FdcCandidate[]>
```

pg_trgm search over `nutrition_facts.name` with similarity threshold 0.3 (tunable). Returns ranked candidates for the match UI and the form autocomplete.

```ts
autoMatch(ingredientName: string): Promise<number | null>
```

Conservative auto-match used by `computeRecipeMacros` when chef hasn't picked. Returns fdc_id only if ALL conditions hold:
- Top candidate's similarity score ≥ 0.75.
- Gap from 2nd-place candidate ≥ 0.15.
- Query token count ≥ 3 (rejects bare words like "chicken" which ambiguously match 15+ entries).

Otherwise returns null → ingredient flagged unresolved. **Prefer unresolved over wrong match.**

#### `lib/macros/compute.ts`

```ts
computeRecipeMacros(recipeId: string): Promise<RecipeMacros>
```

For each ingredient:

1. Resolve grams via `resolveGrams(ingredient)`. If fails: skip, log in `unresolved_ingredients`.
2. If `macros_override` present: use it × (grams / 100).
3. Else if `fdc_id` present: load from `nutrition_facts`, apply × (grams / 100).
4. Else: call `autoMatch(name)`. If match: persist fdc_id back to ingredient (conditional UPDATE — only if the ingredient still has null fdc_id), use macros. If no match: skip, log in `unresolved_ingredients`.

Sum matched ingredients. Write back to `recipes.macros`, `recipes.macros_computed_at`. The write is scoped to the caller's recipes via RLS — no service role.

### Server actions

`app/actions/macros.ts`:

- `computeRecipeMacros(recipeId)` — idempotent recompute. Ownership gate: action uses user-scoped Supabase client; RLS enforces that the caller owns the recipe. Throws if recipe not found (RLS-hidden).
- `setIngredientMatch(recipeId, ingredientIndex, expectedName, fdcId)` — verifies ingredient at index still has `name === expectedName` before writing; updates the ingredients JSONB at index, then recomputes. Prevents stale-index race.
- `setIngredientOverride(recipeId, ingredientIndex, expectedName, override | null)` — same verification; override payload validated (finite positive numbers; kcal ≤ 900 per 100 g; each of fat_g/carbs_g/protein_g/fiber_g ≤ 100 per 100 g; fat_g + carbs_g + protein_g ≤ 100 per 100 g). Rejects NaN/Infinity/negative with typed 400 error.
- `setIngredientMatches(recipeId, entries[])` — batch variant for MatchModal save; accepts array of `{ingredientIndex, expectedName, fdcId | override}`. Single recompute after all writes. Used by the modal's Save button so N ingredient edits = 1 compute.
- `searchFdcAction(query)` — server action wrapper for `searchFdc`. Asserts `getSession()` (401 if unauthenticated). Used by ingredient autocomplete in recipe form and by MatchModal.

Existing `createRecipe` / `updateRecipe` in `app/actions/recipes.ts` gain a post-save call to `computeRecipeMacros` **before** the existing `redirect()` call. Redirect throws a special Next.js error that terminates the action; compute must complete first.

**Compute throttle:** if `computeRecipeMacros` is called twice for the same recipeId within 500ms, the second call is deduplicated (in-memory cache keyed on recipeId, server-instance-local). Prevents storms from rapid form edits.

### UI components

#### `components/MacrosCard.tsx`

Rendered on recipe detail page between header and ingredients list.

**Four states, each with explicit layout:**

**State 1 — Not yet computed (macros NULL):**
```
┌──────────────────────────────────────────────────────────┐
│ Macros not yet computed                                  │
│                            [ Compute macros → ]          │
└──────────────────────────────────────────────────────────┘
```
Button triggers `computeRecipeMacros(recipeId)`. Shows spinner during compute.

**State 2 — Zero matched (matched_count = 0):**
```
┌──────────────────────────────────────────────────────────┐
│ Ingredients need matching to compute macros              │
│                    [ Match ingredients → ]               │
└──────────────────────────────────────────────────────────┘
```
Button opens MatchModal.

**State 3 — Partial match (amber):**
```
┌──────────────────────────────────────────────────────────┐
│ Per serving · 1 burger · ~estimate                       │
│ ~260 kcal · ~15 g fat · ~12 g carbs · ~21 g protein · -- │
│                                                          │
│ Per recipe (4 servings) · ~1,040 kcal · 3 of 5 matched   │
│                                              [ edit → ]  │
└──────────────────────────────────────────────────────────┘
```
Prefix `~` on all numbers + "estimate" qualifier. Dashes (`--`) where unresolved ingredient affected that macro. "3 of 5 matched" link opens MatchModal with unresolved section expanded.

**State 4 — Complete match (green):**
```
┌──────────────────────────────────────────────────────────┐
│ Per serving · 1 burger                                   │
│ 390 kcal · 22 g fat · 18 g carbs · 31 g protein · 4 g fb │
│                                                          │
│ Per recipe (4 servings) · 1,562 kcal total     [ edit ]  │
│ ○ all 5 ingredients matched                              │
└──────────────────────────────────────────────────────────┘
```

**Card height is constant across states** — no shift in ingredient-list position on state change.

**Mobile wrap layout (≤375px):** kcal on its own line (largest typography); fat/carbs/protein/fiber wrap as a group; at LG font size allow 2nd-line wrap. `formatServings(recipe)` provides the label.

Layout respects `preferred_font_size` and `preferred_theme`.

#### `components/MacrosMatchModal.tsx`

Opened by the `[edit]` link or `[Match ingredients →]` CTA on MacrosCard.

**Dialog contract:** `role="dialog"`, `aria-modal="true"`, `aria-labelledby` → modal heading. Focus trap active while open. Initial focus: first unmatched ingredient's first radio option. Escape / X / backdrop click = close (discards in-session changes, no warning — the modal is non-destructive). Focus returns to the trigger element on close.

**Per-ingredient row states:**

- **Loading:** 3 skeleton rows at ~40px each while `searchFdcAction` fetches.
- **Has candidates:** 3 radios with USDA names. "Can't find it? Enter manually" link below → expands accordion with 5 numeric inputs (per 100 g).
- **Empty results:** "No close matches found — enter manually" + auto-expanded accordion.
- **Fetch error (per-row):** "Couldn't load suggestions" + retry button + manual-override accordion available.
- **Modal-level error** (global): inline banner at top "Couldn't load suggestions — check connection" + retry button; rows still offer manual override.

**Override accordion:**

5 numeric inputs labeled `kcal / protein_g / fat_g / carbs_g / fiber_g` with unit helper: **"per 100 g of raw ingredient"**.

Additional helper per ingredient when the ingredient resolves via count-weight: "For 1 egg (~50 g), nutrition-label kcal × 2 to enter here." Acknowledges the mental-math tax and prevents the "1 egg = 70 kcal" → silent-wrong-2x bug. Server-side validation catches extreme outliers (see validation above).

**Save:** batch-calls `setIngredientMatches` with all chef-touched rows. Single compute run afterward. Modal closes on success.

**Partial-save semantics:** Save writes matches for any row the chef touched; untouched rows remain in their prior state. Cancel/X discards all changes made in-session.

#### Recipe form changes (`/recipes/new`, `/recipes/[id]/edit`)

Ingredient name input gets an autocomplete combobox sourced from `searchFdcAction`. Behavior:

- Trigger: 2+ characters typed, 300 ms debounce.
- Max 5 results in dropdown.
- `role="combobox"`, `aria-expanded`, `role="listbox"` on dropdown.
- Escape: dismiss dropdown, keep typed text.
- Arrow keys / Enter: navigate and select.
- Blur without selection: keep typed text, `fdc_id` remains unset.
- Empty results: dropdown absent (no "No matches" noise — free-text path is normal).

On pick: fills the ingredient name, stores `fdc_id` on the ingredient object before submit (silent — chef doesn't see IDs).

Chef can ignore the dropdown and type free-text. The lazy-match path handles it on save. This intentionally contradicts pure "lazy matching" as a soft nudge — not blocking, just visible — and is flagged for reconsideration in Open Questions.

### Display in other surfaces (deferred — see Open Questions)

Spec-authoritative display surface for MVP: **recipe detail page only**. Display in `/cook`, recipe list cards, and print view is deferred pending JTBD confirmation (OQ-1).

## Error handling

| Failure | Behavior |
|---|---|
| Recipe save but compute fails | Recipe saved; macros null; next edit triggers another attempt; error logged. |
| pg_trgm missing | `searchFdcAction` returns empty array; modal shows empty state; CTA appears on card. |
| Ingredient amount < 0 or NaN | Skipped in compute; unresolved list includes it with reason "invalid amount". |
| Chef-typed override out of bounds | Rejected at server action with typed 400; inline error in modal. |
| `nutrition_facts` row deleted out from under a recipe | Treat ingredient as unresolved; chef re-matches on next visit. |
| Recipe with 0 ingredients saved | Compute skipped; macros stays null. MacrosCard renders "Not yet computed" state until ingredients exist. |
| Concurrent edit races stale modal | setIngredientMatch verifies `expectedName` before writing; returns error; UI re-fetches recipe and reopens modal. |
| Rapid compute calls | Throttled 500ms window; second call deduplicated. |

## Migrations (ordered)

1. `20260425_003000_enable_pg_trgm.sql`
2. `20260425_003001_create_nutrition_facts.sql`
3. `20260425_003002_seed_nutrition_facts.sql` (generated via `scripts/seed-usda.mjs`, multi-row INSERT + ON CONFLICT DO UPDATE, idempotent)
4. `20260425_003003_create_ingredient_densities.sql` (table + seed + RLS)
5. `20260425_003004_create_ingredient_count_weights.sql` (table + seed + RLS)
6. `20260425_003005_add_macros_to_recipes.sql` — `macros jsonb`, `macros_computed_at timestamptz`. `serving_size_label` lives in F2's own migration (`20260425_002000_*`) which MUST merge before this one.

## Testing

### Jest

`lib/macros/__tests__/unit-to-grams.test.ts`:
- Every unit family (mass, volume, count) covered.
- Alias normalization.
- Unresolved paths.

`lib/macros/__tests__/match.test.ts`:
- autoMatch returns null for single-token queries.
- autoMatch returns null when gap < 0.15 even if top ≥ 0.75.
- autoMatch returns fdc_id only when all three conditions hold.

`lib/macros/__tests__/compute.test.ts`:
- 3-ingredient recipe with all matched → expected totals.
- Override wins over fdc_id.
- Partial match: matched ingredients contribute, others in `unresolved`.
- Edit amount 500→600 → grams recompute → macros shift (no cache staleness).
- Servings change does not trigger recompute (verified by call-counting).

`app/actions/__tests__/macros.test.ts`:
- `setIngredientMatch` rejects stale `expectedName`.
- `setIngredientOverride` rejects NaN/Infinity/negative/out-of-bounds.
- `setIngredientMatches` batch = single compute.
- `searchFdcAction` 401 when no session.
- `computeRecipeMacros` throttled within 500ms window.

### Playwright

New file `tests/e2e/macros.spec.ts`:

- `@smoke recipe with matched ingredients shows per-serving macros` — seed via helper, open detail page, assert card values.
- `@regression NULL macros shows Compute CTA, click triggers compute` — seed recipe via raw insert bypassing compute, assert CTA, click, assert green state.
- `@regression unmatched ingredient triggers match modal` — create recipe with a made-up name, assert amber badge, open modal, pick a suggestion, assert recompute.
- `@regression manual override persists and wins over FDC` — open modal, enter custom macros, save, assert value matches override.
- `@regression edit ingredient amount → macros recompute` — edit 500 g chicken to 1000 g, assert kcal doubles.
- `@regression modal save batches → single compute` — network inspector asserts one compute call after 3 row-edits.
- `@regression modal close discards changes` — pick a match, close via Escape, reopen, assert previous state.
- `@mobile macros card layout on iPhone 12` — inline wrapping, no horizontal scroll.

Seed helper (`tests/e2e/helpers.ts`): add `seedRecipeWithMacros(overrides)` — builds a recipe whose ingredients match known fixture FDC rows so assertions are deterministic.

### Gate

Per `.test-gate` baseline, expect Jest +20–30 tests, Playwright +8 specs. Update baseline post-merge.

## Performance

- Seed migration: 8,000 rows in 500-row INSERT batches = ~16 statements, single transaction, ~3 s.
- `searchFdcAction`: pg_trgm GIN index keeps p50 < 20 ms at this row count.
- `computeRecipeMacros`: 5–15 ingredients × 1 row fetch each = 15 ms typical; worst-case cold-start 200–500 ms. Synchronous before redirect: acceptable within Vercel function timeout budgets.
- MacrosCard render: static JSON read from `recipes.macros` column, no extra query.

## Out-of-scope / future

- LLM compound decomposition (F3f) — tackle separately if chef hits compound ingredients frequently.
- Per-100g finished-weight view (needs `yield_grams`).
- Micronutrients — `nutrition_facts` table can grow columns later.
- Bulk re-match utility ("I mis-picked chicken in 20 recipes").
- Display in `/cook`, list cards, print view — deferred pending JTBD (OQ-1).

## Dependencies and ordering

Depends on F2 (`serving_size_label`) for full display fidelity. F1 is independent. Ship order: F1 and F2 in parallel, then F3. Reserved migration ranges: F1 `001*`, F2 `002*`, F3 `003*` (under `20260425_*`).

## Rollback

Drop `recipes.macros`, `recipes.macros_computed_at`. Drop three reference tables. pg_trgm extension stays (harmless). Recipes otherwise unaffected. No data loss from chef's editorial work (matches live in `recipes.ingredients` JSONB — if rolled back, extra keys are ignored by the old client).

---

## Open Questions (deferred to user decision; review round 1)

### Premise / strategic questions (product-lens)

- **OQ-1. What is F3's job-to-be-done?** The spec delivers 5 numbers per recipe, but never names who decides what with them. Candidates:
  - (a) **Diet tracking** — chef's personal diet. Usually self-tracking apps win here.
  - (b) **Menu costing** — a restaurant-grade use. Wrong feature: cost/yield, not kcal, matters. Rebuild around ingredient costs.
  - (c) **Nutrition label for print/share** — chef prints card for friends/servers. Then the **print view** matters most, and accuracy standards are higher (allergens may be more important than fiber).
  - (d) **Professional polish** — recipes feel complete with nutrition listed. Then MVP-level accuracy is enough; position macros subtly (not a primary card).
  - Each answer changes scope and priority. Until named, defer decisions on "display in other surfaces" (list card stripe, cooking mode, print).
- **OQ-2. Lazy matching vs forcing-function.** MVP is lazy — recipe saves without matches. Reality: "match later" = never for a phone-on-counter user. Most cards will show amber/CTA indefinitely. Alternatives:
  - (a) Block recipe save when > N ingredients are unresolvable (forces the matching moment).
  - (b) Opt-in flow: macros computed only for recipes chef explicitly marks "publish with nutrition" (curated, not universal).
  - (c) Keep lazy; accept partial coverage; defer "display everywhere" until matching rate ≥ threshold.
- **OQ-3. Identity drift.** MacrosCard on recipe detail might be fine; expanding to list cards + cook + print moves toward MyFitnessPal visual vocabulary (anti-reference #1). Current MVP narrowed to detail page only; re-expansion should wait for OQ-1 resolution.

### Scope questions (scope-guardian)

- **OQ-4. Ingredient autocomplete in recipe form — keep or drop?** Not in original ask; also soft-contradicts the "lazy matching" decision you chose. Argument for keeping: zero-friction path for power users; silently stores fdc_id. Argument for dropping: scope creep; the MatchModal already covers matching.
- **OQ-5. Display surfaces beyond detail page** (cook, list card stripe, print) — deferred pending OQ-1.

### Adversarial / technical questions

- **OQ-6. Override basis for count items.** Override UI is "per 100 g" uniformly. For "1 egg", chef enters 2× nutrition-label value (since 1 egg ≈ 50 g). Helper text added to MatchModal, but mental-math tax remains. Alternative: adaptive basis ("per egg (50 g)" when countable). Adds UI complexity. MVP keeps per-100g; revisit after first wave of chef-authored overrides.
- **OQ-7. Ingredient stable ID.** Current model uses array index + name-verification guard. More robust would be a uuid per ingredient. Adds schema work + migration. Deferred unless reordering concurrency becomes painful.
- **OQ-8. USDA annual refresh strategy.** Re-running the generator replaces the seed migration — a 2–3 MB diff in git log. Acceptable for annual cadence. If chef refreshes more often, consider moving seed to `supabase/seed.sql` (run on `supabase db reset`) + a maintenance script for prod — both out of the migration pipeline.
- **OQ-9. Render-loss modeling.** Current MVP accepts 10–30% fat-gram overstatement on fatty cuts. If chef complaints surface, add a per-ingredient `render_factor` (0.0–1.0) applied at compute.

### Design questions

- **OQ-10. Print view macros row** — coupled to OQ-1. If JTBD = (c) nutrition label, print is primary. If other JTBDs, print is deferred.
