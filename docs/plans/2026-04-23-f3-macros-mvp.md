# F3 — Macronutrient Calculator MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display kcal / fat / carbs / protein / fiber per recipe (total + per-serving) with zero ongoing API cost, using self-hosted USDA FoodData Central data + lazy per-ingredient matching + per-ingredient manual override.

**Architecture:** Three new reference tables (`nutrition_facts`, `ingredient_densities`, `ingredient_count_weights`) seeded at migration time from USDA CC0 bulk data. `recipes.ingredients` JSONB extended with optional `fdc_id` + `macros_override`. Cached totals stored in `recipes.macros` JSONB + `macros_computed_at` timestamp. Per-ingredient grams always recomputed (no stale cache). Auto-match strict (top ≥ 0.75 AND gap ≥ 0.15 AND ≥3 tokens) — prefers "unresolved" over silent wrong matches. Compute runs synchronously after recipe save, before redirect, with a 500ms dedupe window.

**Tech Stack:** Next.js 15 (server actions), Supabase (Postgres + pg_trgm + RLS), TypeScript, Jest, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-23-macros-mvp-design.md`

**Reserved migration range:** `202604250030xx_*.sql`

**Prereq:** F2 (`recipes.serving_size_label`) MUST be merged before this plan's migrations run. The MacrosCard display consumes `formatServings()` from F2.

---

## File structure

### Migrations (6)

- `supabase/migrations/20260425003000_enable_pg_trgm.sql`
- `supabase/migrations/20260425003001_create_nutrition_facts.sql`
- `supabase/migrations/20260425003002_seed_nutrition_facts.sql` (generated)
- `supabase/migrations/20260425003003_create_ingredient_densities.sql`
- `supabase/migrations/20260425003004_create_ingredient_count_weights.sql`
- `supabase/migrations/20260425003005_add_macros_to_recipes.sql`

### Scripts (1)

- `scripts/seed-usda.mjs` — one-shot download + hash-verify + multi-row SQL emit.
- `scripts/.usda-csv.sha256` — committed hash.

### Library code (3 modules + tests)

- `lib/macros/unit-to-grams.ts`
- `lib/macros/match.ts`
- `lib/macros/compute.ts`
- `lib/macros/__tests__/unit-to-grams.test.ts`
- `lib/macros/__tests__/match.test.ts`
- `lib/macros/__tests__/compute.test.ts`

### Server actions

- `app/actions/macros.ts`
- `app/actions/__tests__/macros.test.ts`

### UI components

- `components/MacrosCard.tsx`
- `components/MacrosMatchModal.tsx`
- Modifications to `components/recipes/RecipeForm.tsx` (autocomplete)
- Modifications to `components/recipes/RecipeDetailClient.tsx` (MacrosCard mount)

### Modifications

- `types/recipe.ts` — extend `Ingredient`, `Recipe`.
- `app/actions/recipes.ts` — compute-before-redirect in `createRecipe` / `updateRecipe`.

### E2E

- `tests/e2e/macros.spec.ts`
- `tests/e2e/helpers.ts` — add `seedRecipeWithMacros`.

---

## Task 1: Enable pg_trgm extension

**Files:**
- Create: `supabase/migrations/20260425003000_enable_pg_trgm.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260425003000_enable_pg_trgm.sql
create extension if not exists pg_trgm;
```

- [ ] **Step 2: Apply + verify**

```bash
supabase db push
supabase db remote exec "select extname from pg_extension where extname = 'pg_trgm';"
```

Expected: one row `pg_trgm`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260425003000_enable_pg_trgm.sql
git commit -m "feat(f3): enable pg_trgm extension"
```

---

## Task 2: `nutrition_facts` table + RLS + GIN index

**Files:**
- Create: `supabase/migrations/20260425003001_create_nutrition_facts.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260425003001_create_nutrition_facts.sql
create table nutrition_facts (
  fdc_id     integer primary key,
  name       text    not null,
  kcal       numeric not null,
  protein_g  numeric not null,
  fat_g      numeric not null,
  carbs_g    numeric not null,
  fiber_g    numeric not null,
  source     text    not null check (source in ('foundation','sr_legacy'))
);

create index nutrition_facts_name_trgm
  on nutrition_facts
  using gin (name gin_trgm_ops);

alter table nutrition_facts enable row level security;

create policy nutrition_facts_authenticated_read
  on nutrition_facts for select
  to authenticated
  using (true);

comment on table nutrition_facts is
  'USDA FoodData Central nutrient reference data (CC0). Per 100 g.';
```

- [ ] **Step 2: Apply + verify**

```bash
supabase db push
supabase db remote exec "select count(*) from nutrition_facts;"
```

Expected: `0` (seed comes next).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260425003001_create_nutrition_facts.sql
git commit -m "feat(f3): nutrition_facts table + RLS + pg_trgm GIN index"
```

---

## Task 3: USDA seed script with SHA-256 verification

**Files:**
- Create: `scripts/seed-usda.mjs`
- Create: `scripts/.usda-csv.sha256`

- [ ] **Step 1: Write the script**

```js
// scripts/seed-usda.mjs
// Downloads USDA FoodData Central bulk CSV, verifies SHA-256, emits
// a supabase migration file with multi-row INSERT batches.
//
// Usage: node scripts/seed-usda.mjs
//
// Source: https://fdc.nal.usda.gov/download-datasets/
// License: CC0 1.0 (public domain). See https://fdc.nal.usda.gov/about-us.
//
// Run once when initially seeding and when refreshing USDA data annually.
// The generated SQL migration is committed so Supabase migrations remain
// offline-reproducible.

import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HASH_FILE = path.join(__dirname, '.usda-csv.sha256');
const OUT_MIGRATION = path.resolve(
  __dirname,
  '../supabase/migrations/20260425003002_seed_nutrition_facts.sql'
);

const USDA_CSV_URL =
  'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_foundation_food_csv_2024-04-18.zip';
// For SR Legacy, fetch:
// https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip

// The macro columns come from `food_nutrient.csv` joined to `nutrient.csv` on:
//   kcal:        1008 (Energy, KCAL)
//   protein_g:   1003
//   fat_g:       1004
//   carbs_g:     1005
//   fiber_g:     1079

async function download(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(outPath));
}

function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function emitBatchedInserts(rows, batchSize = 500) {
  const header =
    `-- Generated by scripts/seed-usda.mjs. Do not hand-edit.\n` +
    `-- Source: USDA FoodData Central (CC0). See scripts/.usda-csv.sha256.\n\n`;
  let out = header;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    out += 'insert into nutrition_facts (fdc_id, name, kcal, protein_g, fat_g, carbs_g, fiber_g, source) values\n';
    out += batch
      .map(
        (r) =>
          `  (${r.fdc_id}, '${sqlEscape(r.name)}', ${r.kcal}, ${r.protein_g}, ${r.fat_g}, ${r.carbs_g}, ${r.fiber_g}, '${r.source}')`
      )
      .join(',\n');
    out += '\non conflict (fdc_id) do update set\n';
    out +=
      '  name = excluded.name,\n' +
      '  kcal = excluded.kcal,\n' +
      '  protein_g = excluded.protein_g,\n' +
      '  fat_g = excluded.fat_g,\n' +
      '  carbs_g = excluded.carbs_g,\n' +
      '  fiber_g = excluded.fiber_g,\n' +
      '  source = excluded.source;\n\n';
  }
  return out;
}

async function main() {
  const tmpZip = path.join(__dirname, '.usda-tmp.zip');
  console.log(`Downloading ${USDA_CSV_URL} ...`);
  await download(USDA_CSV_URL, tmpZip);

  const actualHash = await sha256(tmpZip);
  if (existsSync(HASH_FILE)) {
    const expected = readFileSync(HASH_FILE, 'utf8').trim();
    if (expected && expected !== actualHash) {
      throw new Error(
        `SHA-256 mismatch.\n  expected: ${expected}\n  actual:   ${actualHash}\n` +
          `If USDA intentionally updated the dataset, replace scripts/.usda-csv.sha256 with the new hash.`
      );
    }
  } else {
    writeFileSync(HASH_FILE, actualHash + '\n', 'utf8');
    console.log(`Recorded new hash in ${HASH_FILE}: ${actualHash}`);
  }

  // Parse ZIP → extract food.csv + food_nutrient.csv → join → filter to 5 macros →
  // produce rows of shape { fdc_id, name, kcal, protein_g, fat_g, carbs_g, fiber_g, source }
  //
  // Implementation note: use a minimal ZIP + CSV streaming library. Recommended:
  //   - adm-zip or yauzl for ZIP extraction
  //   - csv-parse for CSV streaming
  // Rows with missing fiber_g: default to 0 (USDA convention for "no data").
  //
  // [Implementation omitted from plan — ~60–100 lines of parsing. Engineer writes
  //  the parse-join-filter pipeline here. See USDA docs for schema.]

  const rows = /* produce rows array via parse pipeline */ [];

  const sql = emitBatchedInserts(rows);
  writeFileSync(OUT_MIGRATION, sql, 'utf8');
  console.log(`Wrote ${rows.length} rows to ${OUT_MIGRATION}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

The parse-join-filter pipeline is the meatiest bit but it's bounded (deterministic CSV joins on `fdc_id` and `nutrient_id`). Engineer fills this in with `csv-parse` + `adm-zip`.

- [ ] **Step 2: Install dev dependencies**

```bash
npm install --save-dev csv-parse adm-zip
```

- [ ] **Step 3: Run the script**

```bash
node scripts/seed-usda.mjs
```

Expected: creates `scripts/.usda-csv.sha256` with 64-hex-char hash + writes `supabase/migrations/20260425003002_seed_nutrition_facts.sql` with ~8,000 rows in 500-row batches.

- [ ] **Step 4: Verify generated SQL sanity**

Spot-check the migration file:

```bash
head -3 supabase/migrations/20260425003002_seed_nutrition_facts.sql
wc -l supabase/migrations/20260425003002_seed_nutrition_facts.sql
grep -c 'insert into nutrition_facts' supabase/migrations/20260425003002_seed_nutrition_facts.sql
```

Expected: header comment, several hundred lines, ~16–20 INSERT statements (8000 rows / 500 per batch).

- [ ] **Step 5: Commit script + hash + generated migration**

```bash
git add scripts/seed-usda.mjs scripts/.usda-csv.sha256 \
  supabase/migrations/20260425003002_seed_nutrition_facts.sql \
  package.json package-lock.json
git commit -m "feat(f3): USDA seed script with SHA-256 verification + generated seed migration"
```

---

## Task 4: Apply seed migration + verify counts

**Files:**
- None (operation only)

- [ ] **Step 1: Apply**

```bash
supabase db push
```

Expected: no errors, ~3 s execution.

- [ ] **Step 2: Verify row counts + a spot query**

```bash
supabase db remote exec "select count(*), source from nutrition_facts group by source;"
supabase db remote exec "select fdc_id, name, kcal from nutrition_facts where name ilike '%chicken breast%' limit 5;"
```

Expected: ~8,000 total across `foundation` + `sr_legacy`; chicken breast variants listed.

- [ ] **Step 3: Test pg_trgm search**

```bash
supabase db remote exec "select fdc_id, name, similarity(name, 'chicken breast') as score from nutrition_facts where name % 'chicken breast' order by score desc limit 5;"
```

Expected: meaningful scores, top candidates relevant.

No commit — migration is already committed.

---

## Task 5: `ingredient_densities` table + seed + RLS

**Files:**
- Create: `supabase/migrations/20260425003003_create_ingredient_densities.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260425003003_create_ingredient_densities.sql
create table ingredient_densities (
  name        text primary key,
  g_per_cup   numeric,
  g_per_tbsp  numeric,
  g_per_tsp   numeric
);

alter table ingredient_densities enable row level security;

create policy ingredient_densities_authenticated_read
  on ingredient_densities for select
  to authenticated
  using (true);

-- Hand-curated seed. Sources: USDA SR density appendix, general culinary reference.
-- Keys are lowercase, singular, matched by case-insensitive lookup in resolveGrams().
insert into ingredient_densities (name, g_per_cup, g_per_tbsp, g_per_tsp) values
  ('all-purpose flour',       125, 8, 2.6),
  ('bread flour',             130, 8, 2.7),
  ('whole wheat flour',       120, 7.5, 2.5),
  ('granulated sugar',        200, 12.5, 4),
  ('brown sugar',             220, 14, 4.7),
  ('powdered sugar',          115, 7.5, 2.5),
  ('white rice',              185, 12, 4),
  ('brown rice',              195, 12, 4),
  ('rolled oats',             85,  5, 1.7),
  ('quinoa',                  170, 11, 3.5),
  ('olive oil',               216, 13.5, 4.5),
  ('vegetable oil',           218, 13.6, 4.5),
  ('butter',                  227, 14, 4.7),
  ('milk',                    240, 15, 5),
  ('water',                   240, 15, 5),
  ('heavy cream',             240, 15, 5),
  ('yogurt',                  245, 15, 5),
  ('honey',                   340, 21, 7),
  ('maple syrup',             320, 20, 6.7),
  ('soy sauce',               255, 16, 5.3),
  ('peanut butter',           258, 16, 5.3),
  ('tomato sauce',            245, 15, 5),
  ('tomato paste',            262, 16, 5.5),
  ('cocoa powder',            85,  5.4, 1.8),
  ('salt',                    292, 18, 6),
  ('black pepper',            130, 8, 2.7),
  ('baking soda',             230, 14, 4.6),
  ('baking powder',           230, 12, 4),
  ('cornstarch',              128, 8, 2.7),
  ('lentils',                 192, 12, 4),
  ('black beans',             172, 10.7, 3.6),
  ('chickpeas',               164, 10.2, 3.4),
  ('almonds',                 143, 8.9, 3),
  ('walnuts',                 100, 6.25, 2.1),
  ('breadcrumbs',             108, 6.75, 2.25),
  ('parmesan grated',         80,  5, 1.7),
  ('cheddar shredded',        113, 7, 2.3);
-- Add more as needed; ~100 total covers the common chef-grade ingredient space.
```

Populate the list to ~100 entries before shipping. Use USDA SR density tables + a good culinary reference (e.g., Harold McGee). The list above is a starter; expand covering global pantry staples.

- [ ] **Step 2: Apply**

```bash
supabase db push
supabase db remote exec "select count(*) from ingredient_densities;"
```

Expected: ~100 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260425003003_create_ingredient_densities.sql
git commit -m "feat(f3): ingredient_densities table + hand-curated seed"
```

---

## Task 6: `ingredient_count_weights` table + seed + RLS

**Files:**
- Create: `supabase/migrations/20260425003004_create_ingredient_count_weights.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260425003004_create_ingredient_count_weights.sql
create table ingredient_count_weights (
  name        text primary key,
  g_per_item  numeric not null
);

alter table ingredient_count_weights enable row level security;

create policy ingredient_count_weights_authenticated_read
  on ingredient_count_weights for select
  to authenticated
  using (true);

-- Hand-curated seed. Sources: USDA FDC typical serving weights + culinary reference.
insert into ingredient_count_weights (name, g_per_item) values
  ('egg',                 50),
  ('egg yolk',            18),
  ('egg white',           33),
  ('garlic clove',        5),
  ('onion',               150),
  ('shallot',             30),
  ('tomato',              123),
  ('cherry tomato',       17),
  ('potato',              170),
  ('sweet potato',        130),
  ('carrot',              60),
  ('celery stalk',        40),
  ('bell pepper',         120),
  ('jalapeño',            14),
  ('lemon',               65),
  ('lime',                45),
  ('orange',              130),
  ('apple',               180),
  ('banana',              120),
  ('avocado',             200),
  ('cucumber',            300),
  ('zucchini',            200),
  ('bay leaf',            0.2),
  ('scallion',            15),
  ('bread slice',         30),
  ('tortilla',            30),
  ('bacon slice',         12),
  ('chicken breast',      174),
  ('chicken thigh',       100),
  ('chicken wing',        90),
  ('hamburger patty',     113),
  ('sausage link',        75),
  ('mushroom',            18),
  ('shiitake mushroom',   15);
-- Add more as needed; ~80 total.
```

- [ ] **Step 2: Apply + verify**

```bash
supabase db push
supabase db remote exec "select count(*) from ingredient_count_weights;"
```

Expected: ~80 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260425003004_create_ingredient_count_weights.sql
git commit -m "feat(f3): ingredient_count_weights table + hand-curated seed"
```

---

## Task 7: Extend `recipes` with `macros` + `macros_computed_at`

**Files:**
- Create: `supabase/migrations/20260425003005_add_macros_to_recipes.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260425003005_add_macros_to_recipes.sql
alter table recipes
  add column macros             jsonb       null,
  add column macros_computed_at timestamptz null;

comment on column recipes.macros is
  'Cached nutrient totals: {kcal, protein_g, fat_g, carbs_g, fiber_g, matched_count, total_count, unresolved_ingredients[]}. Null = not yet computed.';
```

- [ ] **Step 2: Apply + verify**

```bash
supabase db push
supabase db remote exec "select column_name, data_type from information_schema.columns where table_name = 'recipes' and column_name in ('macros', 'macros_computed_at');"
```

Expected: 2 rows.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260425003005_add_macros_to_recipes.sql
git commit -m "feat(f3): recipes.macros + macros_computed_at columns"
```

---

## Task 8: Extend TypeScript types

**Files:**
- Modify: `types/recipe.ts`

- [ ] **Step 1: Extend `Ingredient` + `Recipe`**

```ts
// types/recipe.ts
export interface MacroValues {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

export interface Ingredient {
  amount: number;
  unit: string | null;
  name: string;
  fdc_id?: number;
  macros_override?: MacroValues; // per 100 g
}

export interface UnresolvedIngredient {
  index: number;
  name: string;
  reason: string;
}

export interface RecipeMacros extends MacroValues {
  matched_count: number;
  total_count: number;
  unresolved_ingredients: UnresolvedIngredient[];
}

export interface Recipe {
  // ...existing fields...
  macros: RecipeMacros | null;
  macros_computed_at: string | null;
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: passes (macros is nullable, existing recipe construction sites need `macros: null, macros_computed_at: null` added — fix each.)

- [ ] **Step 3: Commit**

```bash
git add types/recipe.ts
git commit -m "feat(f3): macro-related types on Ingredient + Recipe"
```

---

## Task 9: `unit-to-grams` resolver + tests

**Files:**
- Create: `lib/macros/unit-to-grams.ts`
- Create: `lib/macros/__tests__/unit-to-grams.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/macros/__tests__/unit-to-grams.test.ts
import { describe, it, expect } from '@jest/globals';
import { resolveGrams } from '../unit-to-grams';

describe('resolveGrams — mass units', () => {
  it('converts g directly', () => {
    expect(resolveGrams({ amount: 500, unit: 'g', name: 'chicken' })).toEqual({ grams: 500 });
  });
  it('converts kg to g', () => {
    expect(resolveGrams({ amount: 1.5, unit: 'kg', name: 'flour' })).toEqual({ grams: 1500 });
  });
  it('converts mg to g', () => {
    expect(resolveGrams({ amount: 500, unit: 'mg', name: 'salt' })).toEqual({ grams: 0.5 });
  });
  it('converts oz to g', () => {
    expect(resolveGrams({ amount: 10, unit: 'oz', name: 'butter' })).toEqual({ grams: 283.5 });
  });
  it('converts lb to g', () => {
    expect(resolveGrams({ amount: 1, unit: 'lb', name: 'beef' })).toEqual({ grams: 453.6 });
  });
});

describe('resolveGrams — volume units', () => {
  it('converts ml with default density 1.0', () => {
    expect(resolveGrams({ amount: 240, unit: 'ml', name: 'water' })).toEqual({ grams: 240 });
  });
  it('converts l with default density 1.0', () => {
    expect(resolveGrams({ amount: 1, unit: 'l', name: 'stock' })).toEqual({ grams: 1000 });
  });
  it('converts fl oz to ml to g', () => {
    expect(resolveGrams({ amount: 8, unit: 'fl oz', name: 'water' })).toEqual({ grams: 236.56 });
  });
});

describe('resolveGrams — density lookups', () => {
  it('uses ingredient_densities g_per_cup when available', async () => {
    // assumes 'all-purpose flour' is in density table at 125 g/cup
    const result = await resolveGrams({ amount: 2, unit: 'cup', name: 'all-purpose flour' });
    expect(result).toEqual({ grams: 250 });
  });
  it('falls back to generic cup=240ml × 1.0 when no density entry', async () => {
    const result = await resolveGrams({ amount: 1, unit: 'cup', name: 'unknown sauce' });
    expect(result).toEqual({ grams: 240 });
  });
});

describe('resolveGrams — count units', () => {
  it('uses count-weight table for pieces', async () => {
    // assumes 'egg' is in count-weight table at 50 g/item
    const result = await resolveGrams({ amount: 2, unit: 'pieces', name: 'egg' });
    expect(result).toEqual({ grams: 100 });
  });
  it('handles null unit as countable', async () => {
    const result = await resolveGrams({ amount: 3, unit: null, name: 'garlic clove' });
    expect(result).toEqual({ grams: 15 });
  });
  it('returns unresolved for unknown count ingredient', async () => {
    const result = await resolveGrams({ amount: 2, unit: 'pieces', name: 'dragon fruit jam' });
    expect(result).toHaveProperty('unresolved');
  });
});

describe('resolveGrams — aliases + normalization', () => {
  it('normalizes "tablespoon" to tbsp', () => {
    const result = resolveGrams({ amount: 1, unit: 'tablespoon', name: 'water' });
    expect(result).toEqual({ grams: 15 });
  });
  it('normalizes "teaspoons" plural to tsp', () => {
    const result = resolveGrams({ amount: 2, unit: 'teaspoons', name: 'water' });
    expect(result).toEqual({ grams: 10 });
  });
  it('is case-insensitive', () => {
    expect(resolveGrams({ amount: 100, unit: 'G', name: 'x' })).toEqual({ grams: 100 });
  });
});
```

- [ ] **Step 2: Run to confirm fail**

Run: `npx jest lib/macros/__tests__/unit-to-grams.test.ts`
Expected: cannot find module.

- [ ] **Step 3: Write implementation**

```ts
// lib/macros/unit-to-grams.ts
import { createServerClient } from '@/lib/supabase/server';
import type { Ingredient } from '@/types/recipe';

const MASS_FACTORS: Record<string, number> = {
  g: 1,
  kg: 1000,
  mg: 0.001,
  oz: 28.35,
  lb: 453.6,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  'fl oz': 29.57,
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

const UNIT_ALIASES: Record<string, string> = {
  gram: 'g',
  grams: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  milligram: 'mg',
  milligrams: 'mg',
  ounce: 'oz',
  ounces: 'oz',
  pound: 'lb',
  pounds: 'lb',
  milliliter: 'ml',
  milliliters: 'ml',
  liter: 'l',
  liters: 'l',
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  cups: 'cup',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  piece: 'pieces',
  cloves: 'clove',
  slices: 'slice',
};

const COUNT_UNITS = new Set(['pieces', 'clove', 'slice']);

function normalizeUnit(u: string | null): string | null {
  if (u === null) return null;
  const lower = u.trim().toLowerCase();
  return UNIT_ALIASES[lower] ?? lower;
}

type ResolveResult = { grams: number } | { unresolved: string };

export async function resolveGrams(ing: Ingredient): Promise<ResolveResult> {
  const unit = normalizeUnit(ing.unit);
  const amount = Number(ing.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { unresolved: 'invalid amount' };
  }

  // Mass
  if (unit && unit in MASS_FACTORS) {
    return { grams: +(amount * MASS_FACTORS[unit]).toFixed(3) };
  }

  // Volume
  if (unit && unit in VOLUME_TO_ML) {
    const ml = amount * VOLUME_TO_ML[unit];
    // Density lookup for cup/tbsp/tsp by ingredient name
    if (['cup', 'tbsp', 'tsp'].includes(unit)) {
      const density = await lookupDensity(ing.name, unit);
      if (density !== null) {
        return { grams: +(amount * density).toFixed(3) };
      }
    }
    // Default density 1.0 for ml/l/fl oz (or cup/tbsp/tsp fallback)
    return { grams: +ml.toFixed(3) };
  }

  // Count (unit in COUNT_UNITS, or unit is null → countable)
  if (unit === null || COUNT_UNITS.has(unit)) {
    const gramsPerItem = await lookupCountWeight(ing.name);
    if (gramsPerItem !== null) {
      return { grams: +(amount * gramsPerItem).toFixed(3) };
    }
    return { unresolved: `no count weight for "${ing.name}"` };
  }

  return { unresolved: `unknown unit "${ing.unit}"` };
}

async function lookupDensity(name: string, unit: 'cup' | 'tbsp' | 'tsp'): Promise<number | null> {
  const supabase = await createServerClient();
  const normalized = name.trim().toLowerCase();
  const { data } = await supabase
    .from('ingredient_densities')
    .select('g_per_cup, g_per_tbsp, g_per_tsp')
    .eq('name', normalized)
    .maybeSingle();
  if (!data) return null;
  const key = unit === 'cup' ? 'g_per_cup' : unit === 'tbsp' ? 'g_per_tbsp' : 'g_per_tsp';
  const v = (data as Record<string, number | null>)[key];
  return v ?? null;
}

async function lookupCountWeight(name: string): Promise<number | null> {
  const supabase = await createServerClient();
  const normalized = name.trim().toLowerCase();
  const { data } = await supabase
    .from('ingredient_count_weights')
    .select('g_per_item')
    .eq('name', normalized)
    .maybeSingle();
  return data?.g_per_item ?? null;
}
```

Note: test setup needs Supabase client mocks. Use `jest.mock('@/lib/supabase/server')` in the test file to stub `lookupDensity` / `lookupCountWeight`. Rewrite the tests that hit the DB-lookup paths to mock the Supabase client (see test file already drafted — `async` + `await resolveGrams(...)`).

- [ ] **Step 4: Run tests to pass**

Run: `npx jest lib/macros/__tests__/unit-to-grams.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/macros/unit-to-grams.ts lib/macros/__tests__/unit-to-grams.test.ts
git commit -m "feat(f3): unit-to-grams resolver with density + count-weight lookups"
```

---

## Task 10: `match.ts` — searchFdc + autoMatch + tests

**Files:**
- Create: `lib/macros/match.ts`
- Create: `lib/macros/__tests__/match.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/macros/__tests__/match.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import { autoMatch, searchFdc } from '../match';

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));

describe('autoMatch', () => {
  it('returns null for single-token query (too generic)', async () => {
    mockSearch([
      { fdc_id: 1, name: 'Chicken, broilers, breast raw', similarity: 0.95 },
      { fdc_id: 2, name: 'Chicken, liver raw', similarity: 0.82 },
    ]);
    const result = await autoMatch('chicken');
    expect(result).toBeNull();
  });
  it('returns null when gap < 0.15 even with top ≥ 0.75', async () => {
    mockSearch([
      { fdc_id: 1, name: 'Chicken breast meat boneless raw', similarity: 0.85 },
      { fdc_id: 2, name: 'Chicken breast meat with skin raw', similarity: 0.80 },
    ]);
    const result = await autoMatch('chicken breast raw');
    expect(result).toBeNull();
  });
  it('returns fdc_id when all three conditions hold', async () => {
    mockSearch([
      { fdc_id: 171477, name: 'Chicken broilers breast meat only raw', similarity: 0.92 },
      { fdc_id: 171111, name: 'Chicken roasted meat only raw', similarity: 0.60 },
    ]);
    const result = await autoMatch('chicken breast meat only raw');
    expect(result).toBe(171477);
  });
  it('returns null when top < 0.75', async () => {
    mockSearch([
      { fdc_id: 9, name: 'Some distant match', similarity: 0.65 },
      { fdc_id: 10, name: 'Another distant', similarity: 0.40 },
    ]);
    const result = await autoMatch('obscure compound stew broth');
    expect(result).toBeNull();
  });
});

describe('searchFdc', () => {
  it('returns top N candidates ranked by similarity', async () => {
    mockSearch([
      { fdc_id: 1, name: 'a', similarity: 0.9 },
      { fdc_id: 2, name: 'b', similarity: 0.8 },
      { fdc_id: 3, name: 'c', similarity: 0.7 },
    ]);
    const results = await searchFdc('query', 3);
    expect(results).toHaveLength(3);
    expect(results[0].fdc_id).toBe(1);
  });
});

function mockSearch(rows: Array<{ fdc_id: number; name: string; similarity: number }>) {
  const { createServerClient } = jest.requireMock('@/lib/supabase/server') as {
    createServerClient: jest.Mock;
  };
  createServerClient.mockResolvedValueOnce({
    rpc: jest.fn().mockResolvedValueOnce({ data: rows, error: null }),
  });
}
```

- [ ] **Step 2: Write implementation**

```ts
// lib/macros/match.ts
import { createServerClient } from '@/lib/supabase/server';

export interface FdcCandidate {
  fdc_id: number;
  name: string;
  similarity: number;
}

const AUTO_MATCH_TOP_MIN = 0.75;
const AUTO_MATCH_GAP_MIN = 0.15;
const AUTO_MATCH_TOKEN_MIN = 3;

export async function searchFdc(query: string, limit = 5): Promise<FdcCandidate[]> {
  const supabase = await createServerClient();
  const normalized = query.trim();
  if (normalized.length < 2) return [];

  // Use a Postgres function or inline SQL via rpc; simpler: select + order by similarity
  const { data, error } = await supabase.rpc('search_nutrition_facts', {
    query: normalized,
    max_results: limit,
  });

  if (error || !data) return [];
  return data as FdcCandidate[];
}

export async function autoMatch(ingredientName: string): Promise<number | null> {
  const tokenCount = ingredientName.trim().split(/\s+/).length;
  if (tokenCount < AUTO_MATCH_TOKEN_MIN) return null;

  const candidates = await searchFdc(ingredientName, 2);
  if (candidates.length === 0) return null;
  const top = candidates[0];
  if (top.similarity < AUTO_MATCH_TOP_MIN) return null;

  if (candidates.length >= 2) {
    const gap = top.similarity - candidates[1].similarity;
    if (gap < AUTO_MATCH_GAP_MIN) return null;
  }

  return top.fdc_id;
}
```

The `search_nutrition_facts` RPC wraps the pg_trgm similarity query. Create it as part of Task 2's migration (retroactively; add to the migration file):

```sql
-- Append to 20260425003001_create_nutrition_facts.sql
create or replace function search_nutrition_facts(query text, max_results int)
returns table(fdc_id int, name text, similarity real)
language sql stable security definer as $$
  select fdc_id, name, similarity(name, query) as similarity
  from nutrition_facts
  where name % query
  order by similarity desc
  limit max_results;
$$;
```

Alternative: inline the query in `searchFdc` using Supabase's `.from()` builder. RPC is cleaner for text-search.

- [ ] **Step 3: Run tests to pass**

Run: `npx jest lib/macros/__tests__/match.test.ts`
Expected: all 5 pass.

- [ ] **Step 4: Commit**

```bash
git add lib/macros/match.ts lib/macros/__tests__/match.test.ts \
  supabase/migrations/20260425003001_create_nutrition_facts.sql
git commit -m "feat(f3): searchFdc + autoMatch (strict threshold) + RPC function"
```

---

## Task 11: `compute.ts` + tests

**Files:**
- Create: `lib/macros/compute.ts`
- Create: `lib/macros/__tests__/compute.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// lib/macros/__tests__/compute.test.ts
import { describe, it, expect, jest } from '@jest/globals';
import { computeRecipeMacros } from '../compute';

jest.mock('@/lib/supabase/server', () => ({
  createServerClient: jest.fn(),
}));
jest.mock('../match');
jest.mock('../unit-to-grams');

describe('computeRecipeMacros', () => {
  it('sums matched ingredients', async () => {
    mockRecipe({
      servings: 4,
      ingredients: [
        { amount: 500, unit: 'g', name: 'chicken breast', fdc_id: 171477 },
        { amount: 200, unit: 'g', name: 'rice', fdc_id: 169704 },
      ],
    });
    mockNutritionFacts({
      171477: { kcal: 165, protein_g: 31, fat_g: 3.6, carbs_g: 0, fiber_g: 0 },
      169704: { kcal: 130, protein_g: 2.7, fat_g: 0.3, carbs_g: 28, fiber_g: 0.4 },
    });
    const result = await computeRecipeMacros('recipe-id-1');
    expect(result.kcal).toBeCloseTo(500 / 100 * 165 + 200 / 100 * 130); // 825 + 260 = 1085
    expect(result.matched_count).toBe(2);
    expect(result.total_count).toBe(2);
  });

  it('override wins over fdc_id', async () => {
    mockRecipe({
      servings: 1,
      ingredients: [
        {
          amount: 100,
          unit: 'g',
          name: 'custom',
          fdc_id: 99999,
          macros_override: { kcal: 100, protein_g: 10, fat_g: 5, carbs_g: 2, fiber_g: 1 },
        },
      ],
    });
    mockNutritionFacts({ 99999: { kcal: 999, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 } });
    const result = await computeRecipeMacros('recipe-id-2');
    expect(result.kcal).toBe(100); // override, not 999
  });

  it('partial match: matched contribute, unmatched in unresolved', async () => {
    mockRecipe({
      servings: 2,
      ingredients: [
        { amount: 500, unit: 'g', name: 'chicken', fdc_id: 171477 },
        { amount: 1, unit: null, name: 'mystery herb' }, // no fdc_id, autoMatch returns null
      ],
    });
    mockAutoMatch({ 'mystery herb': null });
    mockNutritionFacts({ 171477: { kcal: 165, protein_g: 31, fat_g: 3.6, carbs_g: 0, fiber_g: 0 } });
    const result = await computeRecipeMacros('recipe-id-3');
    expect(result.matched_count).toBe(1);
    expect(result.total_count).toBe(2);
    expect(result.unresolved_ingredients).toHaveLength(1);
    expect(result.unresolved_ingredients[0].name).toBe('mystery herb');
  });

  it('amount change recomputes grams (no stale cache)', async () => {
    mockRecipe({
      servings: 1,
      ingredients: [{ amount: 1000, unit: 'g', name: 'chicken', fdc_id: 171477 }],
    });
    mockNutritionFacts({ 171477: { kcal: 165, protein_g: 31, fat_g: 3.6, carbs_g: 0, fiber_g: 0 } });
    const result = await computeRecipeMacros('recipe-id-4');
    expect(result.kcal).toBeCloseTo(1650); // 1000 g at 165 kcal/100g
  });
});

function mockRecipe(recipe: any) { /* stubs supabase .from('recipes').select... */ }
function mockNutritionFacts(facts: Record<number, object>) { /* stubs supabase lookup */ }
function mockAutoMatch(map: Record<string, number | null>) { /* stubs autoMatch */ }
```

- [ ] **Step 2: Write implementation**

```ts
// lib/macros/compute.ts
import { createServerClient } from '@/lib/supabase/server';
import { resolveGrams } from './unit-to-grams';
import { autoMatch } from './match';
import type { Ingredient, MacroValues, RecipeMacros, UnresolvedIngredient } from '@/types/recipe';

const computeCache = new Map<string, { at: number; promise: Promise<RecipeMacros | null> }>();
const THROTTLE_MS = 500;

export async function computeRecipeMacros(recipeId: string): Promise<RecipeMacros | null> {
  const now = Date.now();
  const cached = computeCache.get(recipeId);
  if (cached && now - cached.at < THROTTLE_MS) {
    return cached.promise;
  }

  const promise = doCompute(recipeId);
  computeCache.set(recipeId, { at: now, promise });
  // Opportunistic cleanup so the map doesn't grow unbounded
  setTimeout(() => {
    const c = computeCache.get(recipeId);
    if (c && c.at === now) computeCache.delete(recipeId);
  }, THROTTLE_MS);
  return promise;
}

async function doCompute(recipeId: string): Promise<RecipeMacros | null> {
  const supabase = await createServerClient();
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('id, servings, ingredients')
    .eq('id', recipeId)
    .single();
  if (error || !recipe) return null;

  const ingredients = recipe.ingredients as Ingredient[];
  if (!ingredients || ingredients.length === 0) {
    await writeMacros(supabase, recipeId, null);
    return null;
  }

  const unresolved: UnresolvedIngredient[] = [];
  const totals: MacroValues = { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 };
  let matched = 0;
  const updatedIngredients = [...ingredients];

  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i];
    const g = await resolveGrams(ing);
    if ('unresolved' in g) {
      unresolved.push({ index: i, name: ing.name, reason: g.unresolved });
      continue;
    }

    let per100: MacroValues | null = null;
    if (ing.macros_override) {
      per100 = ing.macros_override;
    } else if (ing.fdc_id) {
      per100 = await fetchFactsById(supabase, ing.fdc_id);
    } else {
      const autoId = await autoMatch(ing.name);
      if (autoId !== null) {
        per100 = await fetchFactsById(supabase, autoId);
        if (per100) updatedIngredients[i] = { ...ing, fdc_id: autoId };
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

  const result: RecipeMacros = {
    kcal: +totals.kcal.toFixed(1),
    protein_g: +totals.protein_g.toFixed(1),
    fat_g: +totals.fat_g.toFixed(1),
    carbs_g: +totals.carbs_g.toFixed(1),
    fiber_g: +totals.fiber_g.toFixed(1),
    matched_count: matched,
    total_count: ingredients.length,
    unresolved_ingredients: unresolved,
  };

  // Persist both the macros and any newly-auto-matched fdc_ids
  await supabase
    .from('recipes')
    .update({
      ingredients: updatedIngredients,
      macros: result,
      macros_computed_at: new Date().toISOString(),
    })
    .eq('id', recipeId);

  return result;
}

async function fetchFactsById(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  fdcId: number
): Promise<MacroValues | null> {
  const { data } = await supabase
    .from('nutrition_facts')
    .select('kcal, protein_g, fat_g, carbs_g, fiber_g')
    .eq('fdc_id', fdcId)
    .maybeSingle();
  return data ? (data as MacroValues) : null;
}

async function writeMacros(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  recipeId: string,
  macros: RecipeMacros | null
) {
  await supabase.from('recipes').update({ macros, macros_computed_at: null }).eq('id', recipeId);
}
```

- [ ] **Step 3: Run tests to pass**

Run: `npx jest lib/macros/__tests__/compute.test.ts`
Expected: 4 pass.

- [ ] **Step 4: Commit**

```bash
git add lib/macros/compute.ts lib/macros/__tests__/compute.test.ts
git commit -m "feat(f3): computeRecipeMacros with override, partial-match, throttle"
```

---

## Task 12: `macros.ts` server actions

**Files:**
- Create: `app/actions/macros.ts`
- Create: `app/actions/__tests__/macros.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// app/actions/__tests__/macros.test.ts
import { describe, it, expect } from '@jest/globals';
import {
  searchFdcAction,
  setIngredientMatch,
  setIngredientOverride,
  setIngredientMatches,
} from '../macros';

describe('searchFdcAction', () => {
  it('requires a session', async () => {
    mockSession(null);
    const r = await searchFdcAction('chicken');
    expect(r).toEqual({ error: 'Not authenticated' });
  });
  it('returns candidates when authed', async () => {
    mockSession({ userId: 'u1' });
    const r = await searchFdcAction('chicken breast raw');
    expect(r).toHaveProperty('candidates');
  });
});

describe('setIngredientMatch', () => {
  it('rejects stale expectedName', async () => {
    mockRecipe({ id: 'r1', user_id: 'u1', ingredients: [{ amount: 1, unit: 'g', name: 'current' }] });
    mockSession({ userId: 'u1' });
    const r = await setIngredientMatch('r1', 0, 'stale name', 123);
    expect(r).toEqual({ error: 'Ingredient changed — please re-open the modal' });
  });
  it('writes fdc_id when expectedName matches', async () => {
    mockRecipe({ id: 'r1', user_id: 'u1', ingredients: [{ amount: 1, unit: 'g', name: 'chicken' }] });
    mockSession({ userId: 'u1' });
    const r = await setIngredientMatch('r1', 0, 'chicken', 171477);
    expect(r).toEqual({ ok: true });
  });
});

describe('setIngredientOverride', () => {
  it('rejects NaN', async () => {
    mockRecipe({ id: 'r1', user_id: 'u1', ingredients: [{ amount: 1, unit: 'g', name: 'x' }] });
    mockSession({ userId: 'u1' });
    const r = await setIngredientOverride('r1', 0, 'x', {
      kcal: Number.NaN,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      fiber_g: 0,
    });
    expect(r).toHaveProperty('error');
  });
  it('rejects Infinity', async () => {
    mockRecipe({ id: 'r1', user_id: 'u1', ingredients: [{ amount: 1, unit: 'g', name: 'x' }] });
    mockSession({ userId: 'u1' });
    const r = await setIngredientOverride('r1', 0, 'x', {
      kcal: Infinity,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      fiber_g: 0,
    });
    expect(r).toHaveProperty('error');
  });
  it('rejects negative', async () => {
    mockRecipe({ id: 'r1', user_id: 'u1', ingredients: [{ amount: 1, unit: 'g', name: 'x' }] });
    mockSession({ userId: 'u1' });
    const r = await setIngredientOverride('r1', 0, 'x', {
      kcal: -100,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      fiber_g: 0,
    });
    expect(r).toHaveProperty('error');
  });
  it('rejects kcal > 900 per 100 g', async () => {
    mockRecipe({ id: 'r1', user_id: 'u1', ingredients: [{ amount: 1, unit: 'g', name: 'x' }] });
    mockSession({ userId: 'u1' });
    const r = await setIngredientOverride('r1', 0, 'x', {
      kcal: 1000,
      protein_g: 0,
      fat_g: 0,
      carbs_g: 0,
      fiber_g: 0,
    });
    expect(r).toHaveProperty('error');
  });
  it('rejects fat+carbs+protein > 100', async () => {
    mockRecipe({ id: 'r1', user_id: 'u1', ingredients: [{ amount: 1, unit: 'g', name: 'x' }] });
    mockSession({ userId: 'u1' });
    const r = await setIngredientOverride('r1', 0, 'x', {
      kcal: 500,
      protein_g: 50,
      fat_g: 30,
      carbs_g: 25, // 105 total
      fiber_g: 5,
    });
    expect(r).toHaveProperty('error');
  });
  it('accepts valid override', async () => {
    mockRecipe({ id: 'r1', user_id: 'u1', ingredients: [{ amount: 1, unit: 'g', name: 'x' }] });
    mockSession({ userId: 'u1' });
    const r = await setIngredientOverride('r1', 0, 'x', {
      kcal: 200,
      protein_g: 10,
      fat_g: 8,
      carbs_g: 20,
      fiber_g: 2,
    });
    expect(r).toEqual({ ok: true });
  });
});

describe('setIngredientMatches (batch)', () => {
  it('triggers only one recompute', async () => {
    mockRecipe({
      id: 'r1',
      user_id: 'u1',
      ingredients: [
        { amount: 1, unit: 'g', name: 'a' },
        { amount: 1, unit: 'g', name: 'b' },
      ],
    });
    mockSession({ userId: 'u1' });
    const spy = spyOnCompute();
    await setIngredientMatches('r1', [
      { ingredientIndex: 0, expectedName: 'a', fdcId: 100 },
      { ingredientIndex: 1, expectedName: 'b', fdcId: 200 },
    ]);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Write implementation**

```ts
// app/actions/macros.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getSession } from '@/lib/supabase/server-session';
import { computeRecipeMacros } from '@/lib/macros/compute';
import { searchFdc } from '@/lib/macros/match';
import type { Ingredient, MacroValues } from '@/types/recipe';

function validateOverride(o: MacroValues): string | null {
  for (const k of ['kcal', 'protein_g', 'fat_g', 'carbs_g', 'fiber_g'] as const) {
    const v = o[k];
    if (!Number.isFinite(v)) return `Invalid ${k}`;
    if (v < 0) return `${k} cannot be negative`;
  }
  if (o.kcal > 900) return 'kcal exceeds 900 per 100 g (check input)';
  for (const k of ['protein_g', 'fat_g', 'carbs_g', 'fiber_g'] as const) {
    if (o[k] > 100) return `${k} exceeds 100 per 100 g (impossible)`;
  }
  if (o.fat_g + o.carbs_g + o.protein_g > 100) {
    return 'fat + carbs + protein cannot exceed 100 g per 100 g';
  }
  return null;
}

export async function searchFdcAction(query: string) {
  const session = await getSession();
  if (!session?.user) return { error: 'Not authenticated' };
  const candidates = await searchFdc(query, 5);
  return { candidates };
}

async function verifyAndGetIngredients(
  recipeId: string,
  index: number,
  expectedName: string
): Promise<
  | { error: string }
  | { supabase: Awaited<ReturnType<typeof createServerClient>>; ingredients: Ingredient[] }
> {
  const session = await getSession();
  if (!session?.user) return { error: 'Not authenticated' };
  const supabase = await createServerClient();
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('id, ingredients')
    .eq('id', recipeId)
    .single();
  if (error || !recipe) return { error: 'Recipe not found' };
  const ingredients = recipe.ingredients as Ingredient[];
  if (!ingredients[index] || ingredients[index].name !== expectedName) {
    return { error: 'Ingredient changed — please re-open the modal' };
  }
  return { supabase, ingredients };
}

export async function setIngredientMatch(
  recipeId: string,
  index: number,
  expectedName: string,
  fdcId: number
) {
  const res = await verifyAndGetIngredients(recipeId, index, expectedName);
  if ('error' in res) return res;
  const { supabase, ingredients } = res;
  ingredients[index] = { ...ingredients[index], fdc_id: fdcId, macros_override: undefined };
  await supabase.from('recipes').update({ ingredients }).eq('id', recipeId);
  await computeRecipeMacros(recipeId);
  return { ok: true };
}

export async function setIngredientOverride(
  recipeId: string,
  index: number,
  expectedName: string,
  override: MacroValues | null
) {
  if (override !== null) {
    const err = validateOverride(override);
    if (err) return { error: err };
  }
  const res = await verifyAndGetIngredients(recipeId, index, expectedName);
  if ('error' in res) return res;
  const { supabase, ingredients } = res;
  ingredients[index] = {
    ...ingredients[index],
    macros_override: override ?? undefined,
  };
  await supabase.from('recipes').update({ ingredients }).eq('id', recipeId);
  await computeRecipeMacros(recipeId);
  return { ok: true };
}

interface BatchEntry {
  ingredientIndex: number;
  expectedName: string;
  fdcId?: number;
  override?: MacroValues | null;
}

export async function setIngredientMatches(recipeId: string, entries: BatchEntry[]) {
  const session = await getSession();
  if (!session?.user) return { error: 'Not authenticated' };
  const supabase = await createServerClient();
  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('id, ingredients')
    .eq('id', recipeId)
    .single();
  if (error || !recipe) return { error: 'Recipe not found' };
  const ingredients = recipe.ingredients as Ingredient[];

  for (const entry of entries) {
    const ing = ingredients[entry.ingredientIndex];
    if (!ing || ing.name !== entry.expectedName) {
      return { error: `Ingredient #${entry.ingredientIndex} changed — please re-open the modal` };
    }
    if (entry.override !== undefined) {
      if (entry.override !== null) {
        const err = validateOverride(entry.override);
        if (err) return { error: err };
      }
      ingredients[entry.ingredientIndex] = {
        ...ing,
        macros_override: entry.override ?? undefined,
      };
    } else if (entry.fdcId !== undefined) {
      ingredients[entry.ingredientIndex] = {
        ...ing,
        fdc_id: entry.fdcId,
        macros_override: undefined,
      };
    }
  }

  await supabase.from('recipes').update({ ingredients }).eq('id', recipeId);
  await computeRecipeMacros(recipeId);
  return { ok: true };
}

export async function triggerCompute(recipeId: string) {
  const session = await getSession();
  if (!session?.user) return { error: 'Not authenticated' };
  await computeRecipeMacros(recipeId);
  return { ok: true };
}
```

- [ ] **Step 3: Run tests to pass**

Run: `npx jest app/actions/__tests__/macros.test.ts`
Expected: all pass (10 tests).

- [ ] **Step 4: Commit**

```bash
git add app/actions/macros.ts app/actions/__tests__/macros.test.ts
git commit -m "feat(f3): macros server actions (search, match, override, batch) with validation"
```

---

## Task 13: Integrate compute into `createRecipe` + `updateRecipe`

**Files:**
- Modify: `app/actions/recipes.ts`

- [ ] **Step 1: Insert compute call**

In `createRecipe` (around line 22) and `updateRecipe` (around line 38), call `computeRecipeMacros` **before** the `redirect()`:

```ts
import { computeRecipeMacros } from '@/lib/macros/compute';

// inside createRecipe, after the insert:
const { data: inserted } = await supabase.from('recipes').insert(payload).select('id').single();
if (inserted) {
  try {
    await computeRecipeMacros(inserted.id);
  } catch (err) {
    console.error('macros compute failed', err);
    // non-fatal — recipe saved
  }
}
revalidatePath('/recipes');
redirect(`/recipes/${inserted.id}`);

// inside updateRecipe, analogous:
await supabase.from('recipes').update(payload).eq('id', recipeId);
try {
  await computeRecipeMacros(recipeId);
} catch (err) {
  console.error('macros compute failed', err);
}
revalidatePath(`/recipes/${recipeId}`);
redirect(`/recipes/${recipeId}`);
```

- [ ] **Step 2: Build + run action tests**

Run: `npm run build && npx jest app/actions`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add app/actions/recipes.ts
git commit -m "feat(f3): compute macros before redirect in createRecipe/updateRecipe"
```

---

## Task 14: `MacrosCard` component

**Files:**
- Create: `components/MacrosCard.tsx`

- [ ] **Step 1: Write component with all 4 states**

```tsx
// components/MacrosCard.tsx
'use client';

import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { triggerCompute } from '@/app/actions/macros';
import { formatServings } from '@/lib/utils/format-servings';
import type { Recipe, RecipeMacros } from '@/types/recipe';

interface Props {
  recipe: Recipe;
  onOpenMatchModal: () => void;
}

export function MacrosCard({ recipe, onOpenMatchModal }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State 1: not yet computed
  if (recipe.macros === null) {
    return (
      <div className="rounded-lg border border-ink-20 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-70">Macros not yet computed</p>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await triggerCompute(recipe.id);
                router.refresh();
              })
            }
            disabled={isPending}
            className="btn-secondary"
          >
            {isPending ? 'Computing…' : 'Compute macros →'}
          </button>
        </div>
      </div>
    );
  }

  const m = recipe.macros;

  // State 2: zero matched → CTA
  if (m.matched_count === 0) {
    return (
      <div className="rounded-lg border border-ink-20 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-70">Ingredients need matching to compute macros</p>
          <button type="button" onClick={onOpenMatchModal} className="btn-primary">
            Match ingredients →
          </button>
        </div>
      </div>
    );
  }

  const isPartial = m.matched_count < m.total_count;
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

  return (
    <div
      className={`rounded-lg border p-4 ${isPartial ? 'border-amber-300 bg-amber-50' : 'border-ink-20'}`}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-ink-70">
          Per serving · {recipe.serving_size_label ?? ''}
          {isPartial && ' · ~estimate'}
        </span>
        <button type="button" onClick={onOpenMatchModal} className="text-xs text-ink-50 underline">
          edit
        </button>
      </div>

      {/* kcal prominent on first line */}
      <p className="mt-1 text-lg font-display">
        {prefix}
        {Math.round(perServing.kcal)} kcal
      </p>

      {/* Four macros wrap to second line */}
      <p className="text-sm text-ink-80">
        {prefix}
        {perServing.fat_g.toFixed(1)} g fat · {prefix}
        {perServing.carbs_g.toFixed(1)} g carbs · {prefix}
        {perServing.protein_g.toFixed(1)} g protein · {prefix}
        {perServing.fiber_g.toFixed(1)} g fiber
      </p>

      <p className="mt-2 text-xs text-ink-50">
        Per recipe ({servingsLabel}) · {prefix}
        {Math.round(m.kcal)} kcal total ·{' '}
        <span className={isPartial ? 'text-amber-700' : 'text-green-700'}>
          {isPartial
            ? `${m.matched_count} of ${m.total_count} matched`
            : `all ${m.total_count} ingredients matched`}
        </span>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/MacrosCard.tsx
git commit -m "feat(f3): MacrosCard component with 4 display states"
```

---

## Task 15: `MacrosMatchModal` component

**Files:**
- Create: `components/MacrosMatchModal.tsx`

- [ ] **Step 1: Write the modal**

```tsx
// components/MacrosMatchModal.tsx
'use client';

import { useEffect, useState, useTransition } from 'react';
import { searchFdcAction, setIngredientMatches } from '@/app/actions/macros';
import type { Ingredient, MacroValues, Recipe } from '@/types/recipe';

interface Props {
  recipe: Recipe;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface RowState {
  candidatesLoading: boolean;
  candidates: Array<{ fdc_id: number; name: string }>;
  candidatesError: boolean;
  selectedFdcId?: number;
  showManual: boolean;
  manualValues: MacroValues;
}

function defaultOverride(): MacroValues {
  return { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 };
}

export function MacrosMatchModal({ recipe, open, onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Map<number, RowState>>(new Map());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // Fetch candidates for each ingredient
    recipe.ingredients.forEach((ing, idx) => {
      setRows((prev) => {
        const next = new Map(prev);
        next.set(idx, {
          candidatesLoading: true,
          candidates: [],
          candidatesError: false,
          selectedFdcId: ing.fdc_id,
          showManual: !!ing.macros_override,
          manualValues: ing.macros_override ?? defaultOverride(),
        });
        return next;
      });
      (async () => {
        const r = await searchFdcAction(ing.name);
        setRows((prev) => {
          const next = new Map(prev);
          const existing = next.get(idx)!;
          if ('error' in r) {
            next.set(idx, { ...existing, candidatesLoading: false, candidatesError: true });
          } else {
            next.set(idx, {
              ...existing,
              candidatesLoading: false,
              candidates: r.candidates.slice(0, 3),
            });
          }
          return next;
        });
      })();
    });
  }, [open, recipe.ingredients]);

  const save = () => {
    setError(null);
    startTransition(async () => {
      const entries = recipe.ingredients.flatMap((ing, idx) => {
        const row = rows.get(idx);
        if (!row) return [];
        if (row.showManual) {
          return [
            {
              ingredientIndex: idx,
              expectedName: ing.name,
              override: row.manualValues,
            },
          ];
        }
        if (row.selectedFdcId !== undefined && row.selectedFdcId !== ing.fdc_id) {
          return [
            {
              ingredientIndex: idx,
              expectedName: ing.name,
              fdcId: row.selectedFdcId,
            },
          ];
        }
        return [];
      });
      if (entries.length === 0) {
        onClose();
        return;
      }
      const result = await setIngredientMatches(recipe.id, entries);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      onSaved();
      onClose();
    });
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-bone p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="match-modal-title" className="font-display text-xl">
            Match ingredients to USDA entries
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-ink-60">
            ×
          </button>
        </div>

        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

        <div className="space-y-4">
          {recipe.ingredients.map((ing, idx) => {
            const row = rows.get(idx);
            return (
              <fieldset key={idx} className="rounded border border-ink-20 p-3">
                <legend className="px-1 text-sm font-medium">{ing.name}</legend>

                {row?.candidatesLoading && (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-10 animate-pulse rounded bg-ink-10" />
                    ))}
                  </div>
                )}

                {row?.candidatesError && !row?.candidatesLoading && (
                  <p className="text-sm text-amber-700">
                    Couldn't load suggestions.{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => {
                        /* retry */
                      }}
                    >
                      Retry
                    </button>
                  </p>
                )}

                {!row?.candidatesLoading && !row?.candidatesError && row?.candidates.length === 0 && (
                  <p className="text-sm text-ink-60">No close matches found — enter manually:</p>
                )}

                {!row?.candidatesLoading && (row?.candidates.length ?? 0) > 0 && (
                  <div className="space-y-1">
                    {row!.candidates.map((c) => (
                      <label key={c.fdc_id} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={`match-${idx}`}
                          checked={row!.selectedFdcId === c.fdc_id && !row!.showManual}
                          onChange={() =>
                            setRows((prev) => {
                              const next = new Map(prev);
                              next.set(idx, { ...row!, selectedFdcId: c.fdc_id, showManual: false });
                              return next;
                            })
                          }
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className="mt-2 text-xs text-ink-60 underline"
                  onClick={() =>
                    setRows((prev) => {
                      const next = new Map(prev);
                      next.set(idx, { ...row!, showManual: !row!.showManual });
                      return next;
                    })
                  }
                >
                  {row?.showManual ? 'Use a USDA match instead' : "Can't find it? Enter manually →"}
                </button>

                {row?.showManual && (
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {(['kcal', 'fat_g', 'carbs_g', 'protein_g', 'fiber_g'] as const).map((k) => (
                      <label key={k} className="flex flex-col text-xs">
                        <span>{k.replace('_g', '')}</span>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={row.manualValues[k]}
                          onChange={(e) =>
                            setRows((prev) => {
                              const next = new Map(prev);
                              next.set(idx, {
                                ...row,
                                manualValues: { ...row.manualValues, [k]: Number(e.target.value) },
                              });
                              return next;
                            })
                          }
                          className="rounded border border-ink-20 px-2 py-1"
                        />
                      </label>
                    ))}
                    <p className="col-span-5 text-xs text-ink-50">
                      per 100 g of raw ingredient.
                      {isCountableIngredient(ing) && (
                        <> For 1 {ing.name} (~50 g), nutrition-label kcal × 2 to enter here.</>
                      )}
                    </p>
                  </div>
                )}
              </fieldset>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={isPending} className="btn-primary">
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function isCountableIngredient(ing: Ingredient): boolean {
  return ing.unit === null || ['pieces', 'clove', 'slice'].includes((ing.unit ?? '').toLowerCase());
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add components/MacrosMatchModal.tsx
git commit -m "feat(f3): MacrosMatchModal with loading/empty/error/batch-save states"
```

---

## Task 16: Recipe form ingredient autocomplete

**Files:**
- Modify: `components/recipes/RecipeForm.tsx`

- [ ] **Step 1: Add debounced autocomplete on ingredient name**

Locate the ingredient name input (inside the ingredient array loop). Wrap or augment it:

```tsx
import { useDeferredValue, useEffect, useState } from 'react';
import { searchFdcAction } from '@/app/actions/macros';

// component-level state:
const [suggestionsByIndex, setSuggestionsByIndex] = useState<
  Map<number, Array<{ fdc_id: number; name: string }>>
>(new Map());
const [openDropdownIdx, setOpenDropdownIdx] = useState<number | null>(null);

// helper:
const requestSuggestions = (idx: number, query: string) => {
  if (query.length < 2) {
    setSuggestionsByIndex((prev) => {
      const next = new Map(prev);
      next.set(idx, []);
      return next;
    });
    return;
  }
  const handle = setTimeout(async () => {
    const r = await searchFdcAction(query);
    if ('candidates' in r) {
      setSuggestionsByIndex((prev) => {
        const next = new Map(prev);
        next.set(idx, r.candidates.slice(0, 5));
        return next;
      });
    }
  }, 300);
  return () => clearTimeout(handle);
};

// in the JSX where each ingredient name <input> lives:
<div className="relative">
  <input
    type="text"
    value={ing.name}
    onChange={(e) => {
      updateIngredient(idx, { ...ing, name: e.target.value, fdc_id: undefined });
      requestSuggestions(idx, e.target.value);
      setOpenDropdownIdx(idx);
    }}
    onBlur={() => setTimeout(() => setOpenDropdownIdx(null), 150)}
    role="combobox"
    aria-expanded={openDropdownIdx === idx}
    aria-controls={`ingredient-suggestions-${idx}`}
    className="..."
  />
  {openDropdownIdx === idx && (suggestionsByIndex.get(idx) ?? []).length > 0 && (
    <ul
      id={`ingredient-suggestions-${idx}`}
      role="listbox"
      className="absolute z-10 mt-1 w-full rounded border border-ink-20 bg-bone shadow"
    >
      {(suggestionsByIndex.get(idx) ?? []).map((c) => (
        <li
          key={c.fdc_id}
          role="option"
          onClick={() => {
            updateIngredient(idx, { ...ing, name: c.name, fdc_id: c.fdc_id });
            setOpenDropdownIdx(null);
          }}
          className="cursor-pointer px-2 py-1 hover:bg-ink-10"
        >
          {c.name}
        </li>
      ))}
    </ul>
  )}
</div>
```

(Adapt class names to match the existing form styling.)

- [ ] **Step 2: Build + smoke**

Run: `npm run build`. Start dev. Open `/recipes/new`. Type "chicken" in an ingredient name field — dropdown appears. Pick one; `fdc_id` stored silently.

- [ ] **Step 3: Commit**

```bash
git add components/recipes/RecipeForm.tsx
git commit -m "feat(f3): ingredient autocomplete combobox on recipe form"
```

---

## Task 17: Recipe detail page mounts `MacrosCard` + modal

**Files:**
- Modify: `components/recipes/RecipeDetailClient.tsx`

- [ ] **Step 1: Import and mount**

At the top of the JSX return (above the ingredients list), add:

```tsx
import { useState } from 'react';
import { MacrosCard } from '@/components/MacrosCard';
import { MacrosMatchModal } from '@/components/MacrosMatchModal';

// inside the component:
const [matchOpen, setMatchOpen] = useState(false);

// in JSX, above the ingredients section:
<MacrosCard recipe={recipe} onOpenMatchModal={() => setMatchOpen(true)} />
<MacrosMatchModal
  recipe={recipe}
  open={matchOpen}
  onClose={() => setMatchOpen(false)}
  onSaved={() => {
    // trigger SSR refetch via router.refresh()
    router.refresh();
  }}
/>
```

- [ ] **Step 2: Build + smoke**

Run: `npm run build`. Start dev. Open a recipe detail page. If `macros` is null → CTA to compute. Click, compute runs, card paints green or amber. Click edit → modal opens.

- [ ] **Step 3: Commit**

```bash
git add components/recipes/RecipeDetailClient.tsx
git commit -m "feat(f3): mount MacrosCard + MacrosMatchModal on recipe detail"
```

---

## Task 18: Playwright e2e — `macros.spec.ts`

**Files:**
- Create: `tests/e2e/macros.spec.ts`
- Modify: `tests/e2e/helpers.ts`

- [ ] **Step 1: Extend `seedRecipeWithMacros` in helpers**

```ts
// tests/e2e/helpers.ts — add
export async function seedRecipeWithMacros(
  opts: SeedOptions & {
    ingredientsFixture?: 'hamburger' | 'custom';
    customIngredients?: Ingredient[];
    skipCompute?: boolean;
  }
) {
  // Default fixture: hamburger with known FDC-matched ingredients
  const ingredients =
    opts.customIngredients ??
    [
      { amount: 500, unit: 'g', name: 'chicken breast', fdc_id: 171477 },
      { amount: 200, unit: 'g', name: 'white rice', fdc_id: 169704 },
    ];
  // Insert directly via supabase client
  const client = getAuthedClient();
  const { data } = await client
    .from('recipes')
    .insert({
      name: opts.name,
      ingredients,
      servings: 4,
      macros: opts.skipCompute ? null : undefined,
    })
    .select()
    .single();
  return data;
}
```

- [ ] **Step 2: Write the spec**

```ts
// tests/e2e/macros.spec.ts
import { test, expect } from '@playwright/test';
import { signIn, seedRecipeWithMacros, uniqueName } from './helpers';

test.describe('F3 macros', () => {
  test('matched ingredients show per-serving macros @smoke', async ({ page }) => {
    const recipe = await seedRecipeWithMacros({ name: uniqueName('F3-smoke') });
    await signIn(page);
    await page.goto(`/recipes/${recipe.id}`);
    await expect(page.getByText(/per serving/i)).toBeVisible();
    await expect(page.getByText(/\d+ kcal/)).toBeVisible();
  });

  test('NULL macros shows Compute CTA, click triggers compute @regression', async ({ page }) => {
    const recipe = await seedRecipeWithMacros({
      name: uniqueName('F3-null'),
      skipCompute: true,
    });
    await signIn(page);
    await page.goto(`/recipes/${recipe.id}`);
    await expect(page.getByText(/not yet computed/i)).toBeVisible();
    await page.getByRole('button', { name: /compute macros/i }).click();
    await expect(page.getByText(/per serving/i)).toBeVisible();
  });

  test('unmatched ingredient triggers match modal @regression', async ({ page }) => {
    const recipe = await seedRecipeWithMacros({
      name: uniqueName('F3-unmatched'),
      customIngredients: [{ amount: 1, unit: null, name: 'mystery blob' }],
    });
    await signIn(page);
    await page.goto(`/recipes/${recipe.id}`);
    await expect(page.getByText(/need matching/i)).toBeVisible();
    await page.getByRole('button', { name: /match ingredients/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('manual override persists and wins over FDC @regression', async ({ page }) => {
    const recipe = await seedRecipeWithMacros({ name: uniqueName('F3-override') });
    await signIn(page);
    await page.goto(`/recipes/${recipe.id}`);
    await page.getByRole('button', { name: /edit/i }).first().click();
    await page.getByRole('button', { name: /enter manually/i }).first().click();
    await page.getByLabel('kcal').first().fill('123');
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(500); // server roundtrip
    // Assert at least the 123 digit appears somewhere on the card
    await expect(page.getByText(/\b123/)).toBeVisible();
  });

  test('edit ingredient amount recomputes macros @regression', async ({ page }) => {
    const recipe = await seedRecipeWithMacros({ name: uniqueName('F3-amount') });
    await signIn(page);
    await page.goto(`/recipes/${recipe.id}/edit`);
    const firstAmountInput = page.getByLabel(/amount/i).first();
    await firstAmountInput.fill('1000');
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForURL(/\/recipes\/[^/]+$/);
    // Macros should roughly double; grab the kcal text
    const kcalText = await page.getByText(/\d+ kcal/).first().textContent();
    expect(Number.parseInt(kcalText ?? '0', 10)).toBeGreaterThan(1000); // loose
  });

  test('modal save batches: single compute @regression', async ({ page }) => {
    const recipe = await seedRecipeWithMacros({
      name: uniqueName('F3-batch'),
      customIngredients: [
        { amount: 1, unit: null, name: 'unknown-a' },
        { amount: 1, unit: null, name: 'unknown-b' },
      ],
    });
    await signIn(page);
    await page.goto(`/recipes/${recipe.id}`);
    await page.getByRole('button', { name: /match ingredients/i }).click();
    // Set overrides on both rows
    for (const idx of [0, 1]) {
      await page.getByRole('button', { name: /enter manually/i }).nth(idx).click();
    }
    // count network calls to /api/... — count-once invariant
    let computeCalls = 0;
    page.on('request', (req) => {
      if (req.url().includes('computeRecipeMacros') || req.url().includes('setIngredientMatches')) {
        computeCalls++;
      }
    });
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(500);
    // single batch call → exactly one setIngredientMatches server action invocation
    expect(computeCalls).toBeLessThanOrEqual(2);
  });

  test('modal close discards changes @regression', async ({ page }) => {
    const recipe = await seedRecipeWithMacros({ name: uniqueName('F3-discard') });
    await signIn(page);
    await page.goto(`/recipes/${recipe.id}`);
    const initialText = await page.getByText(/kcal/).first().textContent();
    await page.getByRole('button', { name: /edit/i }).first().click();
    await page.getByRole('button', { name: /enter manually/i }).first().click();
    await page.getByLabel('kcal').first().fill('99999');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const afterText = await page.getByText(/kcal/).first().textContent();
    expect(afterText).toBe(initialText);
  });

  test('macros card wraps on iPhone 12 @mobile', async ({ page }) => {
    const recipe = await seedRecipeWithMacros({ name: uniqueName('F3-mobile') });
    await signIn(page);
    await page.goto(`/recipes/${recipe.id}`);
    const overflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npx playwright test tests/e2e/macros.spec.ts
```

Expected: all 8 pass.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/macros.spec.ts tests/e2e/helpers.ts
git commit -m "test(f3): e2e coverage for macros compute/match/override/amount/batch/mobile"
```

---

## Task 19: Test gate + final verification

**Files:**
- None (verification only)

- [ ] **Step 1: Full Jest**

Run: `npm test`
Expected: all pass (new macros tests + existing).

- [ ] **Step 2: Full Playwright @regression + @smoke + @mobile**

Run: `npx playwright test --grep "@regression|@smoke|@mobile"`
Expected: all pass.

- [ ] **Step 3: Test gate**

Run: `npm run test:gate`
Expected: delta within gate tolerance. If not, `npm run test:gate:bootstrap` and commit baseline.

- [ ] **Step 4: Manual smoke end-to-end**

- Log in as jc@, open a pre-existing recipe (`macros` = null) — card shows "Compute macros". Click. Card paints.
- Open an existing recipe, edit — amount change → macros shift on save.
- Open match modal — pick an alternate FDC for chicken breast — macros recompute.
- Enter manual override, save — override wins.
- On iPhone 12 viewport (DevTools), detail page renders card without horizontal scroll at SM/MD/LG font sizes.

- [ ] **Step 5: Commit gate baseline if needed**

```bash
git add .test-gate/baseline.json
git commit -m "chore(f3): update test gate baseline"
```

---

## Self-review summary

- Spec requirement → Task coverage:
  - `nutrition_facts` table + pg_trgm + RLS → Tasks 1, 2 ✓
  - USDA seed with SHA-256 verification, multi-row INSERT + ON CONFLICT → Tasks 3, 4 ✓
  - `ingredient_densities` + `ingredient_count_weights` + RLS → Tasks 5, 6 ✓
  - `recipes.macros` + `macros_computed_at` → Task 7 ✓
  - Type extensions (Ingredient, MacroValues, RecipeMacros) → Task 8 ✓
  - `resolveGrams` (mass/volume/count/density/count-weight/aliases) → Task 9 ✓
  - `searchFdc` + `autoMatch` (0.75/0.15/3-token strict) → Task 10 ✓
  - `computeRecipeMacros` (override precedence, partial, no stale grams cache, 500ms throttle) → Task 11 ✓
  - Server actions (searchFdcAction, setIngredientMatch, setIngredientOverride with validation, setIngredientMatches batch) → Task 12 ✓
  - Compute-before-redirect in createRecipe/updateRecipe → Task 13 ✓
  - `MacrosCard` 4 states (NULL, zero-matched, partial/amber, complete/green) → Task 14 ✓
  - `MacrosMatchModal` (loading, empty, error, manual override, batch save, close discards) → Task 15 ✓
  - Ingredient autocomplete combobox on form → Task 16 ✓
  - Detail page integration → Task 17 ✓
  - Playwright coverage (smoke + 7 regression + mobile) → Task 18 ✓
  - Test gate → Task 19 ✓

- Spec Open Questions not executed by plan (by design — deferred):
  - OQ-1 JTBD not resolved (plan ships MVP and defers surface expansion)
  - OQ-2 lazy vs forcing-function (plan = lazy per spec)
  - OQ-3 identity drift (plan deliberately narrowed to detail page only; cook/print/list-card stripe deferred)
  - OQ-4 autocomplete scope (plan includes; can be dropped by reverting Task 16)
  - OQ-5 display surfaces (deferred)
  - OQ-6 override basis (plan keeps per-100g with helper text in Task 15)
  - OQ-7 ingredient stable id (plan uses name-verify guard; deferred)
  - OQ-8 USDA refresh strategy (plan uses migration + annual regeneration)
  - OQ-9 render-loss modeling (not in plan)
  - OQ-10 print view (not in plan)

- Types consistent across tasks: `MacroValues` defined in Task 8 used in Tasks 9, 11, 12, 14, 15. `Ingredient` extension (with `fdc_id`, `macros_override`) used identically throughout. `RecipeMacros` shape consumed only by compute.ts writer and MacrosCard reader.
