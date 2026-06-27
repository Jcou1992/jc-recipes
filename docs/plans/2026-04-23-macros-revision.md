# Macros Revision Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three related revisions to the macros feature — salient partial-match display (Option B), per-row USDA re-search decoupled from recipe ingredient name, and adaptive per-unit manual-override basis — per `docs/superpowers/specs/2026-04-23-macros-completeness-resync-per-unit-design.md`.

**Architecture:** Extend the `Ingredient` JSONB shape with `fdc_name?: string` and `macros_override_basis?: 'per_100g' | 'per_unit'`. Add a small unit-classification helper. Widen `computeRecipeMacros` to pick a per-unit branch when basis so indicates. Revise `MacrosCard` to show partial numbers with a loud status line + inline chip CTA. Add amber `unmatched` pills on ingredient rows. Add a progressive-disclosure `Search again →` affordance per row in `MacrosMatchModal`. Replace the static per-100g copy in the manual entry form with a unit-derived basis label. Guard the recipe-edit flow so a unit change that crosses the basis boundary clears the stale override.

**Tech Stack:** Next.js 15 / React 19 server actions · Supabase Postgres (JSONB ingredients) · Jest + Testing Library · Playwright.

---

## File Structure

**New files:**
- `lib/macros/unit-basis.ts` — `PER_UNIT_UNITS` set, `inferBasisForUnit`, `basisLabel`
- `lib/macros/__tests__/unit-basis.test.ts` — unit tests for the two helpers
- `tests/e2e/macros-revision.spec.ts` — new e2e coverage for partial state + re-search + per-unit entry

**Modified files:**
- `types/recipe.ts` — extend `Ingredient` with `fdc_name?` and `macros_override_basis?`
- `lib/macros/compute.ts` — add per-unit contribution branch
- `lib/macros/__tests__/compute.test.ts` — tests for per-unit path + mixed recipes
- `app/actions/macros.ts` — extend `BatchEntry`, persist new fields, adjust validation
- `app/actions/__tests__/macros.test.ts` — tests for new persistence + validation
- `app/actions/recipes.ts` — `updateRecipe` unit-change guard
- `components/MacrosCard.tsx` — state 2 shows partial numbers + status line + chip CTA; state 3 provenance line + crossfade
- `components/MacrosMatchModal.tsx` — progressive search disclosure, `Current match` pill, dynamic basis label, extended save payload
- `components/recipes/IngredientRow.tsx` — amber `unmatched` pill, clickable to modal
- `components/recipes/RecipeDetailClient.tsx` — pass click-to-match callback to `IngredientRow` + scroll anchor coordination
- `components/ui/ToastContext.tsx` (or wherever project toast lives — confirm during Task 5) — no code change likely, just consumed in guard

---

## Task 1: Extend `Ingredient` and `BatchEntry` types

**Files:**
- Modify: `types/recipe.ts`
- Modify: `app/actions/macros.ts` (type only — implementation unchanged this task)

- [ ] **Step 1: Add new optional fields to `Ingredient`**

In `types/recipe.ts`, replace the existing `Ingredient` interface with:

```ts
export interface Ingredient {
  amount: number;
  unit: string | null;
  name: string;
  fdc_id?: number;
  fdc_name?: string;
  macros_override?: MacroValues;
  macros_override_basis?: 'per_100g' | 'per_unit';
}
```

- [ ] **Step 2: Extend `BatchEntry`**

In `app/actions/macros.ts`, replace the existing `BatchEntry` export with:

```ts
export interface BatchEntry {
  ingredientIndex: number;
  expectedName: string;
  fdcId?: number;
  fdcName?: string;
  override?: MacroValues | null;
  overrideBasis?: 'per_100g' | 'per_unit';
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS (consumers of both types are adding the new fields in later tasks; existing call sites tolerate optional-undefined).

- [ ] **Step 4: Commit**

```bash
git add types/recipe.ts app/actions/macros.ts
git commit -m "feat(types): add fdc_name and macros_override_basis to Ingredient + BatchEntry"
```

---

## Task 2: Create `lib/macros/unit-basis.ts` + tests (TDD)

**Files:**
- Create: `lib/macros/unit-basis.ts`
- Create: `lib/macros/__tests__/unit-basis.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `lib/macros/__tests__/unit-basis.test.ts`:

```ts
import { inferBasisForUnit, basisLabel } from '../unit-basis';

describe('inferBasisForUnit', () => {
  test.each([
    [null, 'per_unit'],
    ['pieces', 'per_unit'],
    ['piece', 'per_unit'],
    ['clove', 'per_unit'],
    ['cloves', 'per_unit'],
    ['slice', 'per_unit'],
    ['tbsp', 'per_unit'],
    ['tsp', 'per_unit'],
    ['tablespoon', 'per_unit'],
    ['cup', 'per_unit'],
    ['cups', 'per_unit'],
    ['can', 'per_unit'],
    ['bottle', 'per_unit'],
    ['packet', 'per_unit'],
    ['g', 'per_100g'],
    ['kg', 'per_100g'],
    ['oz', 'per_100g'],
    ['lb', 'per_100g'],
    ['ml', 'per_100g'],
    ['l', 'per_100g'],
    ['', 'per_100g'],
    ['unknown-unit', 'per_100g'],
  ])('unit %p → basis %p', (unit, basis) => {
    expect(inferBasisForUnit(unit)).toBe(basis);
  });

  test('case-insensitive, trims whitespace', () => {
    expect(inferBasisForUnit('  PIECES  ')).toBe('per_unit');
    expect(inferBasisForUnit('TBSP')).toBe('per_unit');
  });
});

describe('basisLabel', () => {
  test.each([
    [null, 'per_100g', 'Per 100 g'],
    ['g', 'per_100g', 'Per 100 g'],
    ['ml', 'per_100g', 'Per 100 g'],
    [null, 'per_unit', 'Per 1 piece'],
    ['pieces', 'per_unit', 'Per 1 piece'],
    ['piece', 'per_unit', 'Per 1 piece'],
    ['cloves', 'per_unit', 'Per 1 clove'],
    ['slices', 'per_unit', 'Per 1 slice'],
    ['tbsp', 'per_unit', 'Per 1 tbsp'],
    ['tablespoons', 'per_unit', 'Per 1 tablespoon'],
    ['cup', 'per_unit', 'Per 1 cup'],
    ['cups', 'per_unit', 'Per 1 cup'],
    ['cans', 'per_unit', 'Per 1 can'],
  ])('unit %p basis %p → %p', (unit, basis, expected) => {
    expect(basisLabel(unit, basis as 'per_100g' | 'per_unit')).toBe(expected);
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npm test -- lib/macros/__tests__/unit-basis.test.ts`
Expected: FAIL (`Cannot find module '../unit-basis'`).

- [ ] **Step 3: Implement `lib/macros/unit-basis.ts`**

Create `lib/macros/unit-basis.ts`:

```ts
const PER_UNIT_UNITS = new Set<string>([
  'pieces', 'piece',
  'clove', 'cloves',
  'slice', 'slices',
  'tbsp', 'tsp',
  'tablespoon', 'tablespoons',
  'teaspoon', 'teaspoons',
  'cup', 'cups',
  'can', 'cans',
  'bottle', 'bottles',
  'packet', 'packets',
]);

export type MacrosBasis = 'per_100g' | 'per_unit';

export function inferBasisForUnit(unit: string | null): MacrosBasis {
  if (unit === null) return 'per_unit';
  const norm = unit.trim().toLowerCase();
  if (norm === '') return 'per_100g';
  return PER_UNIT_UNITS.has(norm) ? 'per_unit' : 'per_100g';
}

export function basisLabel(unit: string | null, basis: MacrosBasis): string {
  if (basis === 'per_100g') return 'Per 100 g';
  const norm = unit?.trim().toLowerCase() ?? null;
  if (norm === null || norm === '' || norm === 'pieces' || norm === 'piece') {
    return 'Per 1 piece';
  }
  const singular = norm.endsWith('s') ? norm.slice(0, -1) : norm;
  return `Per 1 ${singular}`;
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm test -- lib/macros/__tests__/unit-basis.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add lib/macros/unit-basis.ts lib/macros/__tests__/unit-basis.test.ts
git commit -m "feat(macros): unit-basis helper — inferBasisForUnit + basisLabel"
```

---

## Task 3: Compute per-unit branch (TDD)

**Files:**
- Modify: `lib/macros/compute.ts`
- Modify: `lib/macros/__tests__/compute.test.ts`

- [ ] **Step 1: Add failing test for per-unit override**

In `lib/macros/__tests__/compute.test.ts`, append a new `describe` block (use existing imports; the test file mocks Supabase — follow the existing pattern in the file for fixture setup):

```ts
describe('per-unit manual overrides', () => {
  test('per_unit override multiplies by amount, not by grams/100', async () => {
    // Fixture: recipe with 2 pieces of tomato, per_unit override 22 kcal each
    const recipe = buildRecipeFixture({
      servings: 1,
      ingredients: [
        {
          name: 'Tomato',
          amount: 2,
          unit: 'pieces',
          macros_override: { kcal: 22, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.8, fiber_g: 1.5 },
          macros_override_basis: 'per_unit',
        },
      ],
    });

    const result = await computeRecipeMacros(recipe.id);

    expect(result).not.toBeNull();
    expect(result!.kcal).toBe(44);      // 2 × 22
    expect(result!.protein_g).toBe(2.2); // 2 × 1.1
    expect(result!.matched_count).toBe(1);
    expect(result!.total_count).toBe(1);
  });

  test('legacy override without basis falls back to per_100g', async () => {
    // Tomato 200g, override {kcal: 20} per 100g → total 40 kcal
    const recipe = buildRecipeFixture({
      servings: 1,
      ingredients: [
        {
          name: 'Tomato',
          amount: 200,
          unit: 'g',
          macros_override: { kcal: 20, protein_g: 1, fat_g: 0.2, carbs_g: 4, fiber_g: 1 },
          // macros_override_basis intentionally omitted
        },
      ],
    });

    const result = await computeRecipeMacros(recipe.id);

    expect(result!.kcal).toBe(40);
  });

  test('mixed per_100g, per_unit, and USDA match in one recipe', async () => {
    // Ground beef 600g USDA → 1524 kcal, tomato 2 pieces per_unit → 44 kcal
    const recipe = buildRecipeFixture({
      servings: 4,
      ingredients: [
        { name: 'Ground beef', amount: 600, unit: 'g', fdc_id: 1001 }, // USDA: 254 kcal/100g
        {
          name: 'Tomato',
          amount: 2,
          unit: 'pieces',
          macros_override: { kcal: 22, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.8, fiber_g: 1.5 },
          macros_override_basis: 'per_unit',
        },
      ],
    });

    const result = await computeRecipeMacros(recipe.id);

    expect(result!.kcal).toBe(1568); // 1524 + 44
    expect(result!.matched_count).toBe(2);
  });
});
```

> **Note:** `buildRecipeFixture` is the existing test helper pattern used elsewhere in `compute.test.ts`. If the file uses a different name, substitute it verbatim from that file. Do not introduce a new helper.

- [ ] **Step 2: Run — expect fail**

Run: `npm test -- lib/macros/__tests__/compute.test.ts`
Expected: FAIL on `per_unit` case (the current code divides by 100 unconditionally, so `kcal` will be `~0.044` instead of `44`).

- [ ] **Step 3: Update `lib/macros/compute.ts` contribution branch**

In `lib/macros/compute.ts`, replace the loop body (currently lines ~51-90) with:

```ts
for (let i = 0; i < ingredients.length; i++) {
  const ing = ingredients[i];

  // Per-unit override: skip the grams lookup entirely — the override is
  // already in the chef's chosen unit of the ingredient, so the contribution
  // is amount × override with no gram conversion.
  if (ing.macros_override && ing.macros_override_basis === 'per_unit') {
    const n = ing.amount;
    totals.kcal += ing.macros_override.kcal * n;
    totals.protein_g += ing.macros_override.protein_g * n;
    totals.fat_g += ing.macros_override.fat_g * n;
    totals.carbs_g += ing.macros_override.carbs_g * n;
    totals.fiber_g += ing.macros_override.fiber_g * n;
    matched++;
    continue;
  }

  const g = await resolveGrams(ing);
  if ('unresolved' in g) {
    unresolved.push({ index: i, name: ing.name, reason: g.unresolved });
    continue;
  }

  let per100: MacroValues | null = null;
  if (ing.macros_override) {
    // Legacy or explicit per_100g override.
    per100 = ing.macros_override;
  } else if (ing.fdc_id) {
    per100 = await fetchFactsById(supabase, ing.fdc_id);
  } else {
    const autoId = await autoMatch(ing.name);
    if (autoId !== null) {
      per100 = await fetchFactsById(supabase, autoId);
    }
  }

  if (!per100) {
    unresolved.push({ index: i, name: ing.name, reason: 'no match' });
    continue;
  }

  const scale = g.grams / 100;
  totals.kcal += per100.kcal * scale;
  totals.protein_g += per100.protein_g * scale;
  totals.fat_g += per100.fat_g * scale;
  totals.carbs_g += per100.carbs_g * scale;
  totals.fiber_g += per100.fiber_g * scale;
  matched++;
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- lib/macros/__tests__/compute.test.ts`
Expected: PASS (all three new cases plus existing suite).

- [ ] **Step 5: Commit**

```bash
git add lib/macros/compute.ts lib/macros/__tests__/compute.test.ts
git commit -m "feat(macros): per-unit override branch in computeRecipeMacros"
```

---

## Task 4: Server action persistence for `fdc_name` + `overrideBasis` (TDD)

**Files:**
- Modify: `app/actions/macros.ts`
- Modify: `app/actions/__tests__/macros.test.ts`

- [ ] **Step 1: Write failing tests**

In `app/actions/__tests__/macros.test.ts`, append:

```ts
describe('setIngredientMatches — basis + fdc_name', () => {
  test('persists fdcName alongside fdcId when radio pick', async () => {
    const { recipe } = await seedRecipeFixture({
      ingredients: [{ name: 'Beef', amount: 600, unit: 'g' }],
    });

    const result = await setIngredientMatches(recipe.id, [
      {
        ingredientIndex: 0,
        expectedName: 'Beef',
        fdcId: 1001,
        fdcName: 'Beef, ground, 80% lean, raw',
      },
    ]);

    expect(result).toEqual({ ok: true });
    const updated = await readRecipe(recipe.id);
    expect(updated.ingredients[0].fdc_id).toBe(1001);
    expect(updated.ingredients[0].fdc_name).toBe('Beef, ground, 80% lean, raw');
  });

  test('rejects override without overrideBasis', async () => {
    const { recipe } = await seedRecipeFixture({
      ingredients: [{ name: 'Tomato', amount: 2, unit: 'pieces' }],
    });

    const result = await setIngredientMatches(recipe.id, [
      {
        ingredientIndex: 0,
        expectedName: 'Tomato',
        override: { kcal: 22, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.8, fiber_g: 1.5 },
        // overrideBasis intentionally missing
      },
    ]);

    expect(result).toEqual({ error: 'Override basis missing' });
  });

  test('per_unit override skips the fat+carbs+protein <= 100 check', async () => {
    // A per-unit entry can easily exceed 100g total (e.g. a 300g steak in "per 1 piece" mode).
    const { recipe } = await seedRecipeFixture({
      ingredients: [{ name: 'Steak', amount: 1, unit: 'piece' }],
    });

    const result = await setIngredientMatches(recipe.id, [
      {
        ingredientIndex: 0,
        expectedName: 'Steak',
        override: { kcal: 600, protein_g: 55, fat_g: 40, carbs_g: 10, fiber_g: 0 },
        overrideBasis: 'per_unit',
      },
    ]);

    expect(result).toEqual({ ok: true });
  });

  test('per_unit override rejects absurd kcal (>1500 per unit)', async () => {
    const { recipe } = await seedRecipeFixture({
      ingredients: [{ name: 'Whole cake', amount: 1, unit: 'piece' }],
    });

    const result = await setIngredientMatches(recipe.id, [
      {
        ingredientIndex: 0,
        expectedName: 'Whole cake',
        override: { kcal: 9999, protein_g: 10, fat_g: 10, carbs_g: 10, fiber_g: 0 },
        overrideBasis: 'per_unit',
      },
    ]);

    expect(result).toEqual({ error: 'kcal exceeds 1500 per unit (check input)' });
  });
});
```

> **Note:** `seedRecipeFixture` / `readRecipe` follow the patterns already established in this test file. Mirror them; do not introduce new helpers.

- [ ] **Step 2: Run — expect fail**

Run: `npm test -- app/actions/__tests__/macros.test.ts`
Expected: FAIL on all four new cases.

- [ ] **Step 3: Update `app/actions/macros.ts`**

Replace `validateOverride` with a basis-aware variant:

```ts
function validateOverride(o: MacroValues, basis: 'per_100g' | 'per_unit'): string | null {
  for (const k of ['kcal', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g'] as const) {
    const v = o[k];
    if (!Number.isFinite(v)) return `Invalid ${k}`;
    if (v < 0) return `${k} cannot be negative`;
  }
  if (basis === 'per_100g') {
    if (o.kcal > 900) return 'kcal exceeds 900 per 100 g (check input)';
    for (const k of ['protein_g', 'fat_g', 'carbs_g', 'fiber_g'] as const) {
      if (o[k] > 100) return `${k} exceeds 100 per 100 g (impossible)`;
    }
    if (o.fat_g + o.carbs_g + o.protein_g > 100) {
      return 'fat + carbs + protein cannot exceed 100 g per 100 g';
    }
  } else {
    if (o.kcal > 1500) return 'kcal exceeds 1500 per unit (check input)';
  }
  return null;
}
```

Update `setIngredientOverride`:

```ts
export async function setIngredientOverride(
  recipeId: string,
  index: number,
  expectedName: string,
  override: MacroValues | null,
  basis: 'per_100g' | 'per_unit' = 'per_100g',
) {
  if (override !== null) {
    const err = validateOverride(override, basis);
    if (err) return { error: err };
  }
  const res = await verifyAndGetIngredients(recipeId, index, expectedName);
  if ('error' in res) return res;
  const { supabase, ingredients } = res;
  ingredients[index] = {
    ...ingredients[index],
    macros_override: override ?? undefined,
    macros_override_basis: override ? basis : undefined,
  };
  await supabase.from('recipes').update({ ingredients }).eq('id', recipeId);
  await computeRecipeMacros(recipeId);
  return { ok: true };
}
```

Update `setIngredientMatch` to clear override-basis when switching to USDA and to persist `fdcName` (add a parameter):

```ts
export async function setIngredientMatch(
  recipeId: string,
  index: number,
  expectedName: string,
  fdcId: number,
  fdcName?: string,
) {
  const res = await verifyAndGetIngredients(recipeId, index, expectedName);
  if ('error' in res) return res;
  const { supabase, ingredients } = res;
  ingredients[index] = {
    ...ingredients[index],
    fdc_id: fdcId,
    fdc_name: fdcName,
    macros_override: undefined,
    macros_override_basis: undefined,
  };
  await supabase.from('recipes').update({ ingredients }).eq('id', recipeId);
  await computeRecipeMacros(recipeId);
  return { ok: true };
}
```

Update the `setIngredientMatches` loop:

```ts
for (const entry of entries) {
  const ing = ingredients[entry.ingredientIndex];
  if (!ing || ing.name !== entry.expectedName) {
    return {
      error: `Ingredient #${entry.ingredientIndex} changed — please re-open the modal`,
    };
  }
  if (entry.override !== undefined) {
    if (entry.override !== null && !entry.overrideBasis) {
      return { error: 'Override basis missing' };
    }
    if (entry.override !== null) {
      const err = validateOverride(entry.override, entry.overrideBasis!);
      if (err) return { error: err };
    }
    ingredients[entry.ingredientIndex] = {
      ...ing,
      macros_override: entry.override ?? undefined,
      macros_override_basis: entry.override ? entry.overrideBasis : undefined,
      // entering manual clears any USDA match + cached name
      fdc_id: undefined,
      fdc_name: undefined,
    };
  } else if (entry.fdcId !== undefined) {
    ingredients[entry.ingredientIndex] = {
      ...ing,
      fdc_id: entry.fdcId,
      fdc_name: entry.fdcName,
      macros_override: undefined,
      macros_override_basis: undefined,
    };
  }
}
```

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- app/actions/__tests__/macros.test.ts`
Expected: PASS (new + pre-existing cases).

- [ ] **Step 5: Commit**

```bash
git add app/actions/macros.ts app/actions/__tests__/macros.test.ts
git commit -m "feat(macros): persist fdc_name + override basis; basis-aware validation"
```

---

## Task 5: `updateRecipe` unit-change guard (TDD)

**Files:**
- Modify: `app/actions/recipes.ts`
- Modify: `app/actions/__tests__/recipes.test.ts` (create if absent)

- [ ] **Step 1: Write failing test**

In `app/actions/__tests__/recipes.test.ts`, add (create the file if missing — mirror the imports pattern from `macros.test.ts`):

```ts
import { updateRecipe } from '../recipes';
// ... standard test fixture imports

describe('updateRecipe — unit-change guard', () => {
  test('changing ingredient unit across basis boundary clears override', async () => {
    const { recipe } = await seedRecipeFixture({
      ingredients: [
        {
          name: 'Tomato',
          amount: 2,
          unit: 'pieces',
          macros_override: { kcal: 22, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.8, fiber_g: 1.5 },
          macros_override_basis: 'per_unit',
        },
      ],
    });

    await updateRecipe(recipe.id, {
      ...recipePayloadFrom(recipe),
      ingredients: [
        { name: 'Tomato', amount: 200, unit: 'g' },  // basis boundary crossed
      ],
    });

    const updated = await readRecipe(recipe.id);
    expect(updated.ingredients[0].macros_override).toBeUndefined();
    expect(updated.ingredients[0].macros_override_basis).toBeUndefined();
  });

  test('same-basis unit change preserves override', async () => {
    const { recipe } = await seedRecipeFixture({
      ingredients: [
        {
          name: 'Tomato',
          amount: 2,
          unit: 'pieces',
          macros_override: { kcal: 22, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.8, fiber_g: 1.5 },
          macros_override_basis: 'per_unit',
        },
      ],
    });

    await updateRecipe(recipe.id, {
      ...recipePayloadFrom(recipe),
      ingredients: [{ ...recipe.ingredients[0], amount: 3 }], // only amount changes
    });

    const updated = await readRecipe(recipe.id);
    expect(updated.ingredients[0].macros_override).toBeDefined();
  });

  test('non-override ingredient unit change preserves fdc_id (no clearing)', async () => {
    const { recipe } = await seedRecipeFixture({
      ingredients: [
        { name: 'Beef', amount: 600, unit: 'g', fdc_id: 1001, fdc_name: 'Beef, ground' },
      ],
    });

    await updateRecipe(recipe.id, {
      ...recipePayloadFrom(recipe),
      ingredients: [{ name: 'Beef', amount: 21, unit: 'oz' }], // both per_100g
    });

    const updated = await readRecipe(recipe.id);
    expect(updated.ingredients[0].fdc_id).toBe(1001);
  });
});
```

- [ ] **Step 2: Run — expect fail**

Run: `npm test -- app/actions/__tests__/recipes.test.ts`
Expected: FAIL on the boundary-cross case (override survives).

- [ ] **Step 3: Update `app/actions/recipes.ts`**

Add an import:

```ts
import { inferBasisForUnit } from '@/lib/macros/unit-basis';
```

Inside `updateRecipe`, after loading existing ingredients (you will need to fetch the recipe prior to the update — if `updateRecipe` currently overwrites blindly, add a single `SELECT ingredients WHERE id = id AND user_id = session.user.id` before the update; bail on not-found):

```ts
const { data: existing } = await supabase
  .from('recipes')
  .select('ingredients')
  .eq('id', id)
  .eq('user_id', session.user.id)
  .single();

if (existing) {
  const prev = (existing.ingredients ?? []) as Ingredient[];
  const next = normalized.ingredients as Ingredient[];

  for (let i = 0; i < next.length; i++) {
    const p = prev[i];
    const n = next[i];
    if (!p || !n) continue;
    // Only relevant when an override exists on the incoming row.
    if (!n.macros_override) continue;
    if (inferBasisForUnit(p.unit) !== inferBasisForUnit(n.unit)) {
      delete n.macros_override;
      delete n.macros_override_basis;
    }
  }
}
```

> **Note:** client-side toast for the "Macros cleared" message is surfaced in Task 11 via the existing `useToast()` on the edit form save handler, not in this server action.

- [ ] **Step 4: Run — expect pass**

Run: `npm test -- app/actions/__tests__/recipes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/actions/recipes.ts app/actions/__tests__/recipes.test.ts
git commit -m "feat(macros): clear override on recipe edit that crosses basis boundary"
```

---

## Task 6: `MacrosCard` partial state — numbers + status line + chip CTA

**Files:**
- Modify: `components/MacrosCard.tsx`

- [ ] **Step 1: Remove today's state 2 (zero-matched short-circuit)**

In `components/MacrosCard.tsx`, delete the `if (m.matched_count === 0)` branch entirely (lines ~55-76 in the current file). The new single partial branch subsumes it.

- [ ] **Step 2: Rewrite the partial/complete render**

Replace the `const isPartial = m.matched_count < m.total_count;` block and everything after it down to the closing `);` of the component with:

```tsx
const isPartial = m.matched_count < m.total_count;
const remaining = m.total_count - m.matched_count;

const perServing = {
  kcal: m.kcal / recipe.servings,
  protein_g: m.protein_g / recipe.servings,
  fat_g: m.fat_g / recipe.servings,
  carbs_g: m.carbs_g / recipe.servings,
  fiber_g: m.fiber_g / recipe.servings,
};
const prefix = isPartial ? '~' : '';
const servingsLabel = formatServings({
  servings: recipe.servings,
  serving_size_label: recipe.serving_size_label,
});

const cardStyle: React.CSSProperties = isPartial
  ? {
      border: '1px solid color-mix(in oklch, var(--color-gold) 40%, transparent)',
      background: 'color-mix(in oklch, var(--color-gold) 8%, var(--bg-raised))',
    }
  : panelStyle;

return (
  <div
    role="group"
    aria-label={`Macros per serving${
      isPartial ? ` — estimate, ${m.matched_count} of ${m.total_count} ingredients matched` : ''
    }`}
    className="rounded-lg p-4 mb-6"
    style={cardStyle}
    data-testid={isPartial ? 'macros-card-partial' : 'macros-card-complete'}
  >
    <div className="flex items-baseline justify-between gap-3">
      <span
        className="font-label text-xs tracking-widest uppercase"
        style={{ color: 'var(--text-3)' }}
      >
        Per serving{recipe.serving_size_label ? ` · ${recipe.serving_size_label}` : ''}
      </span>
      {!isPartial && (
        <button
          type="button"
          onClick={onOpenMatchModal}
          className="font-label text-xs tracking-widest uppercase transition-colors"
          style={{ color: 'var(--color-terracotta)' }}
          data-testid="macros-edit-btn"
        >
          edit
        </button>
      )}
    </div>

    <p
      className="font-display mt-2 text-3xl leading-none"
      style={{ color: 'var(--text-1)' }}
      data-testid="macros-kcal"
    >
      {prefix}{Math.round(perServing.kcal)}{' '}
      <span className="text-base" style={{ color: 'var(--text-2)' }}>kcal</span>
    </p>

    <p
      className="mt-2 font-body text-sm flex flex-wrap gap-x-3 gap-y-1 tabular-nums"
      style={{ color: 'var(--text-2)' }}
    >
      <span>{prefix}{perServing.fat_g.toFixed(1)} g fat</span>
      <span aria-hidden="true">·</span>
      <span>{prefix}{perServing.carbs_g.toFixed(1)} g carbs</span>
      <span aria-hidden="true">·</span>
      <span>{prefix}{perServing.protein_g.toFixed(1)} g protein</span>
      <span aria-hidden="true">·</span>
      <span>{prefix}{perServing.fiber_g.toFixed(1)} g fiber</span>
    </p>

    {(() => {
      const total = perServing.protein_g + perServing.carbs_g + perServing.fat_g;
      if (total <= 0) return null;
      const p = (perServing.protein_g / total) * 100;
      const c = (perServing.carbs_g / total) * 100;
      return (
        <div
          className="macros-bar mt-3"
          style={{
            ['--macro-protein-pct' as string]: `${p.toFixed(2)}%`,
            ['--macro-carb-pct' as string]: `${c.toFixed(2)}%`,
          } as React.CSSProperties}
          aria-hidden="true"
          data-testid="macros-bar"
        />
      );
    })()}

    <p
      className="font-label mt-3 text-[11px] tracking-widest uppercase tabular-nums"
      style={{ color: 'var(--text-3)' }}
      data-testid="macros-totals-line"
    >
      {servingsLabel} · {prefix}{Math.round(m.kcal)} kcal total
    </p>

    {isPartial ? (
      <div
        className="mt-3 flex flex-col gap-2"
        data-testid="macros-partial-footer"
        aria-live="polite"
      >
        <p
          className="font-label text-[11px] tracking-widest uppercase"
          style={{ color: 'var(--color-gold)' }}
        >
          Estimate · {m.matched_count} of {m.total_count} ingredients matched
        </p>
        <button
          type="button"
          onClick={onOpenMatchModal}
          data-testid="macros-match-btn"
          className="self-start font-label text-[11px] tracking-widest uppercase rounded-full px-4 min-h-[44px] transition-colors"
          style={{
            color: 'var(--color-terracotta)',
            background: 'color-mix(in oklch, var(--color-terracotta) 12%, transparent)',
            border: '1px solid color-mix(in oklch, var(--color-terracotta) 42%, transparent)',
          }}
        >
          Match {remaining} remaining →
        </button>
      </div>
    ) : (
      <p
        className="font-label mt-2 text-[11px] tracking-widest uppercase"
        style={{ color: 'var(--text-3)' }}
        data-testid="macros-provenance"
      >
        USDA FoodData Central
      </p>
    )}
  </div>
);
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Visual smoke in dev**

Run: `npm run dev`, open a recipe where some ingredients are matched and some aren't. Verify:
- Per-serving numbers render with `~` prefix.
- Status line reads `Estimate · N of M ingredients matched`.
- Chip CTA reads `Match N remaining →` in terracotta.
- Full-match recipe shows `USDA FoodData Central` provenance line and small `edit` link top-right.

- [ ] **Step 5: Commit**

```bash
git add components/MacrosCard.tsx
git commit -m "feat(macros-card): partial state shows live numbers + salient status + chip CTA"
```

---

## Task 7: Complete-state crossfade motion

**Files:**
- Modify: `components/MacrosCard.tsx`

- [ ] **Step 1: Add a ref + key strategy for crossfade**

Extend the conditional block for `isPartial` vs complete: wrap both variants in a container that swaps its child with `key` = `isPartial ? 'partial' : 'complete'` and apply a short CSS transition.

Replace the ternary `isPartial ? (<div>…</div>) : (<p>…</p>)` with:

```tsx
<div className="relative mt-3" style={{ minHeight: '44px' }}>
  <div
    key={isPartial ? 'partial' : 'complete'}
    className="macros-card-footer-swap"
    data-testid={isPartial ? 'macros-partial-footer' : 'macros-provenance-wrap'}
  >
    {isPartial ? (
      <div className="flex flex-col gap-2" aria-live="polite">
        <p
          className="font-label text-[11px] tracking-widest uppercase"
          style={{ color: 'var(--color-gold)' }}
        >
          Estimate · {m.matched_count} of {m.total_count} ingredients matched
        </p>
        <button
          type="button"
          onClick={onOpenMatchModal}
          data-testid="macros-match-btn"
          className="self-start font-label text-[11px] tracking-widest uppercase rounded-full px-4 min-h-[44px] transition-colors"
          style={{
            color: 'var(--color-terracotta)',
            background: 'color-mix(in oklch, var(--color-terracotta) 12%, transparent)',
            border: '1px solid color-mix(in oklch, var(--color-terracotta) 42%, transparent)',
          }}
        >
          Match {remaining} remaining →
        </button>
      </div>
    ) : (
      <p
        className="font-label text-[11px] tracking-widest uppercase"
        style={{ color: 'var(--text-3)' }}
        data-testid="macros-provenance"
      >
        USDA FoodData Central
      </p>
    )}
  </div>
</div>
```

- [ ] **Step 2: Add CSS to `app/globals.css`**

Append:

```css
.macros-card-footer-swap {
  animation: macros-card-footer-fade 200ms ease-out both;
}

@media (prefers-reduced-motion: reduce) {
  .macros-card-footer-swap {
    animation: none;
  }
}

@keyframes macros-card-footer-fade {
  from { opacity: 0; }
  to   { opacity: 1; }
}
```

- [ ] **Step 3: Verify in dev**

Trigger the transition by resolving the last unmatched ingredient in the match modal. Expect a short fade on the provenance line after the card re-renders.

- [ ] **Step 4: Commit**

```bash
git add components/MacrosCard.tsx app/globals.css
git commit -m "feat(macros-card): 200ms crossfade on partial → complete transition"
```

---

## Task 8: Amber `unmatched` pill on ingredient rows

**Files:**
- Modify: `components/recipes/IngredientRow.tsx`
- Modify: `components/recipes/RecipeDetailClient.tsx`

- [ ] **Step 1: Inspect current signatures**

Read `components/recipes/IngredientRow.tsx` and note (a) its props, (b) whether it receives the full `Ingredient` or pre-processed display strings. If it receives a display string only, extend the props to accept `unmatched?: boolean` and `onOpenMatch?: () => void`.

- [ ] **Step 2: Render the pill**

Inside `IngredientRow`, next to the ingredient name (after existing name span, before any trailing controls), add:

```tsx
{unmatched && (
  <button
    type="button"
    onClick={onOpenMatch}
    aria-label={`Ingredient ${name} unmatched — tap to resolve`}
    className="ml-2 font-label text-[10px] tracking-widest uppercase rounded-full px-2 py-0.5"
    style={{
      color: 'var(--color-gold)',
      background: 'color-mix(in oklch, var(--color-gold) 14%, transparent)',
      border: '1px solid color-mix(in oklch, var(--color-gold) 34%, transparent)',
    }}
    data-testid={`ingredient-unmatched-${index}`}
  >
    unmatched
  </button>
)}
```

Add the two new props (`unmatched`, `onOpenMatch`, `index`) to the prop interface. If the component is pure presentational, thread the values from the caller.

- [ ] **Step 3: Thread from `RecipeDetailClient`**

In `components/recipes/RecipeDetailClient.tsx`, for each rendered ingredient row, compute:

```ts
const unmatched = !ing.fdc_id && !ing.macros_override;
```

Pass `unmatched` and `onOpenMatch={() => setMatchOpen(true)}` (existing state setter). Pass the row `index` as well so the pill test-id is unique.

> **Optional enhancement (stretch):** if you want the pill to also scroll the modal to the right row, add a `setFocusIngredientIndex` state in `RecipeDetailClient`, forward to `MacrosMatchModal` as a prop, and `scrollIntoView` the row with `data-testid={`match-row-${idx}`}` on mount after open. This is a polish item — ship the clickable pill first; scroll-to-row can be a follow-up commit.

- [ ] **Step 4: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/recipes/IngredientRow.tsx components/recipes/RecipeDetailClient.tsx
git commit -m "feat(ingredients): amber 'unmatched' pill linking to match modal"
```

---

## Task 9: Modal — `Search again →` disclosure button + state

**Files:**
- Modify: `components/MacrosMatchModal.tsx`

- [ ] **Step 1: Extend `RowState`**

In `components/MacrosMatchModal.tsx`, extend the `RowState` interface:

```ts
interface RowState {
  candidatesLoading: boolean;
  candidates: Array<{ fdc_id: number; name: string }>;
  candidatesError: boolean;
  selectedFdcId?: number;
  fdcName?: string;           // NEW — persisted name for the selected USDA row
  showManual: boolean;
  manualValues: MacroValues;
  manualPristine: boolean;
  searchOpen: boolean;        // NEW
  searchQuery: string;        // NEW
  searchLoading: boolean;     // NEW
}
```

Extend `initialRow`:

```ts
function initialRow(ing: Ingredient): RowState {
  return {
    candidatesLoading: true,
    candidates: [],
    candidatesError: false,
    selectedFdcId: ing.fdc_id,
    fdcName: ing.fdc_name,
    showManual: !!ing.macros_override,
    manualValues: ing.macros_override ?? defaultOverride(),
    manualPristine: !ing.macros_override,
    searchOpen: false,
    searchQuery: ing.name,
    searchLoading: false,
  };
}
```

- [ ] **Step 2: Render `Search again →` button**

In the row's rendering — immediately after the candidate list block and before the existing manual-toggle button — add:

```tsx
{row && !row.candidatesLoading && !row.candidatesError && !row.showManual && (
  <button
    type="button"
    aria-expanded={row.searchOpen}
    aria-controls={`search-again-${idx}`}
    onClick={() =>
      setRows((prev) => {
        const next = new Map(prev);
        const r = next.get(idx);
        if (!r) return prev;
        next.set(idx, { ...r, searchOpen: !r.searchOpen });
        return next;
      })
    }
    className="mt-2 mr-3 inline-flex items-center gap-1 font-label text-[11px] tracking-widest uppercase transition-opacity hover:opacity-80"
    style={{ color: 'var(--color-terracotta)', minHeight: '32px' }}
    data-testid={`search-again-btn-${idx}`}
  >
    {row.searchOpen ? '↑ Close search' : 'Search again →'}
  </button>
)}
```

- [ ] **Step 3: Render disclosure region (placeholder for now — input wired in Task 10)**

Immediately after that button:

```tsx
{row?.searchOpen && (
  <div
    id={`search-again-${idx}`}
    className="mt-2 p-3 rounded-lg"
    style={{
      background: 'color-mix(in oklch, var(--border) 28%, transparent)',
      border: '1px solid var(--border)',
    }}
    data-testid={`search-again-panel-${idx}`}
  >
    <p
      className="font-label text-[10px] tracking-widest uppercase mb-2"
      style={{ color: 'var(--text-3)' }}
    >
      Search USDA differently
    </p>
    <input
      type="text"
      value={row.searchQuery}
      placeholder="Try a different name…"
      aria-label={`Search USDA differently for ${ing.name}`}
      className="input-base"
      data-testid={`search-again-input-${idx}`}
      onChange={(e) =>
        setRows((prev) => {
          const next = new Map(prev);
          const r = next.get(idx);
          if (!r) return prev;
          next.set(idx, { ...r, searchQuery: e.target.value });
          return next;
        })
      }
    />
  </div>
)}
```

- [ ] **Step 4: Typecheck + visual smoke**

Run: `npm run typecheck` — PASS.
Run: `npm run dev`, open modal, click `Search again →` on any row, verify disclosure opens, input is pre-filled with ingredient name.

- [ ] **Step 5: Commit**

```bash
git add components/MacrosMatchModal.tsx
git commit -m "feat(match-modal): Search again disclosure scaffolding"
```

---

## Task 10: Modal — debounced live re-query

**Files:**
- Modify: `components/MacrosMatchModal.tsx`

- [ ] **Step 1: Debounce + fetch hook**

Inside `MacrosMatchModal`, after the existing `useEffect` that loads initial candidates, add:

```ts
useEffect(() => {
  const timers: Array<ReturnType<typeof setTimeout>> = [];
  rows.forEach((row, idx) => {
    if (!row.searchOpen) return;
    if (row.searchQuery === (recipe.ingredients[idx]?.name ?? '')) return; // unchanged
    const timer = setTimeout(async () => {
      setRows((prev) => {
        const next = new Map(prev);
        const r = next.get(idx);
        if (!r) return prev;
        next.set(idx, { ...r, searchLoading: true });
        return next;
      });
      const q = row.searchQuery.trim();
      if (q.length === 0) {
        setRows((prev) => {
          const next = new Map(prev);
          const r = next.get(idx);
          if (!r) return prev;
          next.set(idx, { ...r, searchLoading: false, candidates: [] });
          return next;
        });
        return;
      }
      const result = await searchFdcAction(q);
      setRows((prev) => {
        const next = new Map(prev);
        const r = next.get(idx);
        if (!r) return prev;
        if ('error' in result) {
          next.set(idx, { ...r, searchLoading: false, candidatesError: true });
        } else {
          next.set(idx, {
            ...r,
            searchLoading: false,
            candidatesError: false,
            candidates: result.candidates.slice(0, 3),
          });
        }
        return next;
      });
    }, 250);
    timers.push(timer);
  });
  return () => timers.forEach(clearTimeout);
}, [rows, recipe.ingredients]);
```

> **Note:** this effect depends on `rows`, so every row-state mutation re-evaluates it. The early `return` when `searchQuery === ing.name` prevents a re-query loop for unchanged rows.

- [ ] **Step 2: Render loading skeleton when `searchLoading`**

Inside the candidate-list render, add a condition:

```tsx
{row.searchLoading && (
  <div className="space-y-2 mt-2" aria-busy="true" data-testid={`search-again-loading-${idx}`}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="h-9 rounded-md animate-pulse"
        style={{ background: 'color-mix(in oklch, var(--border) 120%, transparent)' }}
      />
    ))}
  </div>
)}
```

- [ ] **Step 3: Collapse disclosure on candidate pick**

In the existing radio `onChange` handler, also set `searchOpen: false`:

```tsx
onChange={() =>
  setRows((prev) => {
    const next = new Map(prev);
    const r = next.get(idx);
    if (!r) return prev;
    next.set(idx, { ...r, selectedFdcId: c.fdc_id, fdcName: c.name, showManual: false, searchOpen: false });
    return next;
  })
}
```

(Also captures `fdcName` — wired in Task 11.)

- [ ] **Step 4: Visual smoke**

Open modal on a recipe with a Spanish ingredient ("tomate"). Confirm re-query fires 250ms after typing stops, candidates update.

- [ ] **Step 5: Commit**

```bash
git add components/MacrosMatchModal.tsx
git commit -m "feat(match-modal): debounced live USDA re-search in disclosure"
```

---

## Task 11: Modal — `Current match` pill + basis label + save payload

**Files:**
- Modify: `components/MacrosMatchModal.tsx`

- [ ] **Step 1: Import basis helper**

```ts
import { inferBasisForUnit, basisLabel } from '@/lib/macros/unit-basis';
```

- [ ] **Step 2: Render `Current match` pill when off-list**

Immediately above the candidate list (inside the `row && !row.candidatesLoading && !row.candidatesError && !row.showManual && row.candidates.length > 0` block, at the top of its inner `<div>`):

```tsx
{row.fdcName &&
  row.selectedFdcId !== undefined &&
  !row.candidates.some((c) => c.fdc_id === row.selectedFdcId) && (
    <div
      data-testid={`current-match-pill-${idx}`}
      className="font-label text-[11px] tracking-widest uppercase rounded-full px-3 py-1.5 inline-flex items-center gap-2"
      style={{
        color: 'var(--color-terracotta)',
        background: 'color-mix(in oklch, var(--color-terracotta) 12%, transparent)',
        border: '1px solid color-mix(in oklch, var(--color-terracotta) 42%, transparent)',
      }}
    >
      <span>Current match:</span>
      <span style={{ textTransform: 'none' }}>{row.fdcName}</span>
    </div>
  )}
```

- [ ] **Step 3: Replace the static "per 100 g" copy with the dynamic label**

Remove the existing `isCountableIngredient(ing) && (<p>...</p>)` block (the "Values per 100 g… divide by piece weight" footnote under the manual form). Above the 5 macro inputs grid, insert:

```tsx
{(() => {
  const basis = inferBasisForUnit(ing.unit);
  return (
    <p
      className="font-label text-[10px] tracking-widest uppercase mb-2"
      style={{ color: 'var(--text-3)' }}
      data-testid={`basis-label-${idx}`}
    >
      {basisLabel(ing.unit, basis)}
    </p>
  );
})()}
```

Also replace the global modal-bottom footnote copy:

```tsx
<p
  className="mt-4 font-body text-xs"
  style={{ color: 'var(--text-3)' }}
>
  Weight and volume ingredients stored per 100 g. Countable items stored per unit. Scaling stays accurate either way.
</p>
```

- [ ] **Step 4: Extend the `save()` payload**

Inside `save()`, where `BatchEntry` rows are pushed:

```ts
if (row.showManual) {
  entries.push({
    ingredientIndex: idx,
    expectedName: ing.name,
    override: row.manualValues,
    overrideBasis: inferBasisForUnit(ing.unit),
  });
  return;
}
if (row.selectedFdcId !== undefined && row.selectedFdcId !== ing.fdc_id) {
  entries.push({
    ingredientIndex: idx,
    expectedName: ing.name,
    fdcId: row.selectedFdcId,
    fdcName: row.fdcName,
  });
}
```

- [ ] **Step 5: Typecheck + visual smoke**

Run: `npm run typecheck` — PASS.
Open modal, confirm:
- Row with per-unit ingredient (e.g. pieces/tbsp) shows `PER 1 PIECE` / `PER 1 TBSP` above manual form.
- Row with gram ingredient shows `PER 100 G`.
- Saving a match persists `fdc_name` (check the DB row or re-open modal — off-list pill now appears if candidates differ).

- [ ] **Step 6: Commit**

```bash
git add components/MacrosMatchModal.tsx
git commit -m "feat(match-modal): current-match pill + per-unit basis label + extended save payload"
```

---

## Task 12: E2E coverage (Playwright)

**Files:**
- Create: `tests/e2e/macros-revision.spec.ts`

- [ ] **Step 1: Write the spec**

Create `tests/e2e/macros-revision.spec.ts` using the project's standard pattern (import `test` from the shared fixture, use `seedRecipe()` — do NOT fill the new-recipe form by hand; the gate enforces this):

```ts
import { test, expect } from '@playwright/test';
import { seedRecipe } from './helpers';

test.describe('@regression macros revision', () => {
  test('partial state shows numbers + status + chip', async ({ page }) => {
    const id = await seedRecipe({
      name: 'Partial Macros Smoke',
      servings: 2,
      ingredients: [
        { name: 'Ground beef 80/20', amount: 600, unit: 'g', fdc_id: 2000001 },
        { name: 'Tomato', amount: 2, unit: 'pieces' }, // unmatched
      ],
    });
    await page.goto(`/recipes/${id}`);
    // Trigger compute so macros.null → partial.
    await page.getByTestId('macros-compute-btn').click().catch(() => {});
    await expect(page.getByTestId('macros-card-partial')).toBeVisible();
    await expect(page.getByTestId('macros-kcal')).toContainText('kcal');
    await expect(page.getByTestId('macros-partial-footer')).toContainText(/Estimate · 1 of 2/i);
    await expect(page.getByTestId('macros-match-btn')).toContainText(/Match 1 remaining/i);
  });

  test('unmatched pill on ingredient row opens modal', async ({ page }) => {
    const id = await seedRecipe({
      name: 'Unmatched Pill Smoke',
      servings: 1,
      ingredients: [{ name: 'Tomate', amount: 2, unit: 'pieces' }],
    });
    await page.goto(`/recipes/${id}`);
    const pill = page.getByTestId('ingredient-unmatched-0');
    await expect(pill).toBeVisible();
    await pill.click();
    await expect(page.getByTestId('macros-match-modal')).toBeVisible();
  });

  test('Search again disclosure re-queries USDA with different term', async ({ page }) => {
    const id = await seedRecipe({
      name: 'Re-search Smoke',
      servings: 1,
      ingredients: [{ name: 'tomate', amount: 2, unit: 'pieces' }],
    });
    await page.goto(`/recipes/${id}`);
    await page.getByTestId('macros-compute-btn').click().catch(() => {});
    await page.getByTestId('macros-match-btn').click();
    await page.getByTestId('search-again-btn-0').click();
    const input = page.getByTestId('search-again-input-0');
    await input.fill('tomato');
    // Wait for debounce + re-query; results should include "Tomatoes" somewhere.
    await expect(page.locator('[data-testid=match-row-0]')).toContainText(/tomato/i, { timeout: 3000 });
  });

  test('per-unit basis label reflects ingredient unit', async ({ page }) => {
    const id = await seedRecipe({
      name: 'Per-unit Smoke',
      servings: 1,
      ingredients: [
        { name: 'Tomato', amount: 2, unit: 'pieces' },
        { name: 'Flour', amount: 200, unit: 'g' },
      ],
    });
    await page.goto(`/recipes/${id}`);
    await page.getByTestId('macros-compute-btn').click().catch(() => {});
    await page.getByTestId('macros-match-btn').click();
    // Open manual entry on each row and check label.
    await page.locator('[data-testid=match-row-0]').getByRole('button', { name: /Enter manually/i }).click();
    await expect(page.getByTestId('basis-label-0')).toContainText('PER 1 PIECE');
    await page.locator('[data-testid=match-row-1]').getByRole('button', { name: /Enter manually/i }).click();
    await expect(page.getByTestId('basis-label-1')).toContainText('PER 100 G');
  });
});
```

- [ ] **Step 2: Run — expect pass (after earlier implementation tasks all shipped)**

Run: `npm run test:e2e -- tests/e2e/macros-revision.spec.ts`
Expected: all four scenarios PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/macros-revision.spec.ts
git commit -m "test(e2e): macros revision — partial state, unmatched pill, re-search, per-unit label"
```

---

## Task 13: Rebaseline test gate + graphify refresh

**Files:**
- Modify: `.test-gate/baseline.json` (auto-regenerated)
- Modify: `graphify-out/` (via `graphify update`)

- [ ] **Step 1: Rebaseline**

Run: `npm run test:gate:bootstrap`
Expected: baseline reflects the new unit-basis + e2e test files.

- [ ] **Step 2: Refresh graphify**

Run: `graphify update .`
Expected: graph reflects new lib files, no API cost.

- [ ] **Step 3: Commit**

```bash
git add .test-gate/baseline.json graphify-out
git commit -m "chore: rebaseline test-gate + refresh graphify post macros revision"
```

---

## Self-Review Checklist (Plan author — run before handoff)

- **Spec coverage**
  - [x] Option B partial-match UI → Tasks 6, 7
  - [x] Amber unmatched pills → Task 8
  - [x] Modal `Search again →` progressive disclosure → Tasks 9, 10
  - [x] `Current match` pill for off-list saved matches → Task 11
  - [x] Per-unit manual entry + basis label → Task 11
  - [x] Schema additions (`fdc_name`, `macros_override_basis`) → Task 1
  - [x] Compute per-unit branch → Task 3
  - [x] Server-action basis validation + persistence → Task 4
  - [x] Unit-change guard → Task 5
  - [x] E2E → Task 12

- **Placeholders** — none. All code steps contain the actual diff to paste.

- **Type consistency** — `MacrosBasis = 'per_100g' | 'per_unit'` defined in `lib/macros/unit-basis.ts` and referenced via string literals everywhere (Task 1 `BatchEntry`, Task 4 `validateOverride`, Task 5 `inferBasisForUnit` call, Task 11 save payload). Function names `inferBasisForUnit` / `basisLabel` consistent across Tasks 2, 5, 11.
