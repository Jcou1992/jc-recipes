# F2 — Serving Size Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a nullable free-text `serving_size_label` column on recipes so chef can label one portion in their own words ("1 burger", "250 g", "1 slice") without coupling to macro math.

**Architecture:** One nullable text column on `recipes`, one form field, one display helper used by detail page and markdown import. No math changes. Macros math (F3) consumes `servings` and raw-ingredient sums; the label is pure display.

**Tech Stack:** Next.js 15, Supabase (Postgres), TypeScript, Jest, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-23-serving-definition-design.md`

**Reserved migration range:** `202604250020xx_*.sql`

---

## File structure

- **Create:** `supabase/migrations/20260425002000_add_serving_size_label.sql`
- **Create:** `lib/utils/format-servings.ts`
- **Create:** `lib/utils/__tests__/format-servings.test.ts`
- **Modify:** `types/recipe.ts` — add `serving_size_label` to `Recipe` + `RecipePayload`.
- **Modify:** `components/recipes/RecipeForm.tsx` — add new row below Servings input (around line 338).
- **Modify:** `components/recipes/RecipeDetailClient.tsx` — use `formatServings()` in service bar (around line 118–124).
- **Modify:** `app/actions/recipes.ts` — accept `serving_size_label` in `createRecipe` / `updateRecipe`.
- **Modify:** `lib/utils/parse-recipe-markdown.ts` — parse `**Serving size label:** ...` bold key-value (matches existing pattern at lines 166–184).
- **Modify:** `lib/i18n.ts` — add 2 translation keys (label + helper text) to `en` + `es`.
- **Modify:** `tests/e2e/recipes-crud.spec.ts` — add 4 assertions (CRUD + truncation + validation + import round-trip).

---

## Task 1: Migration — add `serving_size_label` column

**Files:**
- Create: `supabase/migrations/20260425002000_add_serving_size_label.sql`

- [ ] **Step 1: Write migration**

```sql
-- supabase/migrations/20260425002000_add_serving_size_label.sql
alter table recipes
  add column serving_size_label text null
  check (serving_size_label is null or length(trim(serving_size_label)) > 0);

comment on column recipes.serving_size_label is
  'Optional chef-authored label for one serving: "1 burger", "250 g", "1 slice". Display-only; not consumed by macro math.';
```

- [ ] **Step 2: Apply locally and verify**

Run: `supabase db reset` (or `supabase db push` if remote).
Expected: migration applies, `\d recipes` lists the new column.

Verify:

```bash
supabase db remote exec "select column_name, is_nullable, data_type from information_schema.columns where table_name = 'recipes' and column_name = 'serving_size_label';"
```

Expected one row: `serving_size_label | YES | text`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260425002000_add_serving_size_label.sql
git commit -m "feat(f2): add recipes.serving_size_label column"
```

---

## Task 2: Extend TypeScript types

**Files:**
- Modify: `types/recipe.ts`

- [ ] **Step 1: Update `Recipe` + `RecipePayload`**

Replace the relevant interface blocks:

```ts
// types/recipe.ts (lines ~13–31 area)
export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  servings: number;
  serving_size_label: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  tags: string[];
  notes: string | null;
  photos: string[];
  created_at: string;
  updated_at: string;
}

export type RecipePayload = Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>;
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: build passes; no new TypeScript errors (existing code that references `Recipe` does not yet read `serving_size_label`, so omitting it at the consumer side is still compile-fine with `null` in DB defaulting missing reads).

If `npm run build` surfaces errors because callers construct `Recipe` literals without `serving_size_label`, fix each call site to include `serving_size_label: null`.

- [ ] **Step 3: Commit**

```bash
git add types/recipe.ts
git commit -m "feat(f2): add serving_size_label to Recipe + RecipePayload types"
```

---

## Task 3: `formatServings` helper + unit tests

**Files:**
- Create: `lib/utils/format-servings.ts`
- Create: `lib/utils/__tests__/format-servings.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// lib/utils/__tests__/format-servings.test.ts
import { describe, it, expect } from '@jest/globals';
import { formatServings } from '../format-servings';

describe('formatServings', () => {
  it('returns "Serves 4" when label is null', () => {
    expect(formatServings({ servings: 4, serving_size_label: null })).toBe('Serves 4');
  });

  it('returns "Serves 4 · 1 burger" when label is set', () => {
    expect(formatServings({ servings: 4, serving_size_label: '1 burger' })).toBe('Serves 4 · 1 burger');
  });

  it('handles singular', () => {
    expect(formatServings({ servings: 1, serving_size_label: null })).toBe('Serves 1');
  });

  it('truncates label at opts.truncate with ellipsis', () => {
    const long = 'approximately one large dinner plate full';
    expect(
      formatServings({ servings: 2, serving_size_label: long }, { truncate: 20 })
    ).toBe('Serves 2 · approximately one la…');
  });

  it('does not truncate when label is shorter than limit', () => {
    expect(
      formatServings({ servings: 2, serving_size_label: '1 burger' }, { truncate: 20 })
    ).toBe('Serves 2 · 1 burger');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest lib/utils/__tests__/format-servings.test.ts`
Expected: all 5 fail with `Cannot find module '../format-servings'`.

- [ ] **Step 3: Write implementation**

```ts
// lib/utils/format-servings.ts
interface ServingsInput {
  servings: number;
  serving_size_label: string | null;
}

interface FormatOptions {
  truncate?: number;
}

export function formatServings(recipe: ServingsInput, opts: FormatOptions = {}): string {
  const base = `Serves ${recipe.servings}`;
  const label = recipe.serving_size_label?.trim();
  if (!label) return base;

  if (opts.truncate && label.length > opts.truncate) {
    return `${base} · ${label.slice(0, opts.truncate)}…`;
  }
  return `${base} · ${label}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest lib/utils/__tests__/format-servings.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add lib/utils/format-servings.ts lib/utils/__tests__/format-servings.test.ts
git commit -m "feat(f2): formatServings helper + tests"
```

---

## Task 4: i18n keys for label + helper text

**Files:**
- Modify: `lib/i18n.ts`

- [ ] **Step 1: Add keys to `Translations` interface**

In the `Translations` interface block (lines ~5–262), inside the `recipeForm` / form-labels grouping (find where `servingsLabel` lives), add:

```ts
servingSizeLabel: string;        // "Serving size label (optional)"
servingSizeHelper: string;       // helper text with examples
```

- [ ] **Step 2: Add English strings**

In the `en` dictionary block (lines ~264–505), add under the matching group:

```ts
servingSizeLabel: 'Serving size label (optional)',
servingSizeHelper: 'example: "1 burger", "250 g", "1 slice", "150 ml"',
```

- [ ] **Step 3: Add Spanish strings**

In the `es` dictionary block (lines ~507–748):

```ts
servingSizeLabel: 'Etiqueta del tamaño de porción (opcional)',
servingSizeHelper: 'ejemplo: "1 hamburguesa", "250 g", "1 rebanada", "150 ml"',
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: passes — `Translations` interface + both dicts aligned.

- [ ] **Step 5: Commit**

```bash
git add lib/i18n.ts
git commit -m "feat(f2): i18n keys for serving size label"
```

---

## Task 5: Recipe form row — serving label input

**Files:**
- Modify: `components/recipes/RecipeForm.tsx`

- [ ] **Step 1: Add controlled state + input**

Locate the Servings input block (around line 320–338). Immediately below its closing element (after the `</label>` or wrapping `<div>` that houses Servings), add:

```tsx
<label className="flex flex-col gap-2 text-sm font-medium text-ink-70">
  <span className="flex items-center justify-between">
    <span>{t.servingSizeLabel}</span>
    <span
      className={`text-xs ${
        (formState.serving_size_label?.length ?? 0) > 30
          ? 'text-amber-600'
          : 'text-ink-50'
      }`}
    >
      {(formState.serving_size_label?.length ?? 0)}/40
    </span>
  </span>
  <input
    type="text"
    maxLength={40}
    value={formState.serving_size_label ?? ''}
    onChange={(e) =>
      setFormState((prev) => ({
        ...prev,
        serving_size_label: e.target.value,
      }))
    }
    className="rounded border border-ink-20 px-3 py-2"
    placeholder={t.servingSizeHelper}
  />
</label>
```

(Adapt classnames to match existing form field patterns in the file.)

- [ ] **Step 2: Extend form state**

Find the `useState` initializer for `formState` (or equivalent) near the top of the component. Add `serving_size_label: initialRecipe?.serving_size_label ?? null` to the initial object. Extend the form-state TypeScript type if one exists in the file.

- [ ] **Step 3: Extend form submit payload**

Find where the form payload is assembled for `createRecipe`/`updateRecipe`. Include:

```ts
serving_size_label: formState.serving_size_label?.trim() || null,
```

(Empty string coerces to null; trim strips whitespace-only.)

- [ ] **Step 4: Verify build + manual smoke**

Run: `npm run build`
Expected: passes.

Start dev: `npm run dev`. Open `/recipes/new`. See the new row below Servings. Type a label, counter updates, amber at 31+. Type past 40 → rejected by `maxLength`.

- [ ] **Step 5: Commit**

```bash
git add components/recipes/RecipeForm.tsx
git commit -m "feat(f2): recipe form serving_size_label input with counter"
```

---

## Task 6: Server actions accept `serving_size_label`

**Files:**
- Modify: `app/actions/recipes.ts`

- [ ] **Step 1: Extend `createRecipe`**

At lines ~9–23, the payload building. Ensure `serving_size_label` is read from the `payload` argument and passed through to the Supabase insert. If the action uses TypeScript pass-through (spreading the `RecipePayload`), nothing to do beyond confirming.

If the action explicitly lists columns, add `serving_size_label: payload.serving_size_label ?? null` to the insert.

Add server-side validation before insert:

```ts
if (payload.serving_size_label !== null && payload.serving_size_label !== undefined) {
  const trimmed = payload.serving_size_label.trim();
  if (trimmed.length === 0) {
    payload.serving_size_label = null;
  } else if (trimmed.length > 40) {
    return { error: 'Serving size label must be 40 characters or fewer' };
  } else {
    payload.serving_size_label = trimmed;
  }
}
```

- [ ] **Step 2: Repeat for `updateRecipe`**

Same validation block in `updateRecipe` at lines ~25–39.

- [ ] **Step 3: Run existing Jest suite**

Run: `npx jest app/actions`
Expected: all existing action tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/actions/recipes.ts
git commit -m "feat(f2): server actions accept and validate serving_size_label"
```

---

## Task 7: Recipe detail display uses `formatServings`

**Files:**
- Modify: `components/recipes/RecipeDetailClient.tsx`

- [ ] **Step 1: Replace inline `Serves N` rendering**

At lines ~118–124, find the `Serves {scaled}` span. Replace the text expression with:

```tsx
import { formatServings } from '@/lib/utils/format-servings';

// inside the JSX where "Serves N" is rendered:
{formatServings({
  servings: scaledServings, // whatever the current variable name is
  serving_size_label: recipe.serving_size_label,
})}
```

Keep the +/− buttons unchanged. The scaler still operates on `scaledServings`; the label is display-only and does not scale.

- [ ] **Step 2: Build + smoke test**

Run: `npm run build`
Start dev, open a recipe with no label → shows `Serves 4`. Edit recipe, add label `1 burger`, save, reload → shows `Serves 4 · 1 burger`.

- [ ] **Step 3: Commit**

```bash
git add components/recipes/RecipeDetailClient.tsx
git commit -m "feat(f2): recipe detail displays serving_size_label"
```

---

## Task 8: Markdown import — parse `**Serving size label:**` bold key-value

**Files:**
- Modify: `lib/utils/parse-recipe-markdown.ts`

- [ ] **Step 1: Add parser block**

Near lines 166–184 where prep/cook/servings bold key-value is handled, add a matching block:

```ts
const servingSizeLabelMatch = line.match(/^\*\*Serving size label:\*\*\s*(.+?)\s*$/i);
if (servingSizeLabelMatch) {
  const candidate = servingSizeLabelMatch[1].trim();
  if (candidate.length > 0 && candidate.length <= 40) {
    result.serving_size_label = candidate;
  }
  continue;
}
```

Ensure the result object's type allows `serving_size_label: string | null | undefined` (add to return-type interface if needed).

- [ ] **Step 2: Write unit test (if the parse module has a test file)**

If `lib/utils/__tests__/parse-recipe-markdown.test.ts` exists, add:

```ts
it('parses "Serving size label" bold key-value', () => {
  const md = `# My Recipe\n\n**Serving size label:** 1 burger\n\n## Ingredients\n- 1 egg`;
  const result = parseRecipeMarkdown(md);
  expect(result.serving_size_label).toBe('1 burger');
});

it('ignores label > 40 chars', () => {
  const md = `# My Recipe\n\n**Serving size label:** ${'x'.repeat(41)}\n\n## Ingredients\n- 1 egg`;
  const result = parseRecipeMarkdown(md);
  expect(result.serving_size_label).toBeUndefined();
});
```

Run: `npx jest lib/utils/__tests__/parse-recipe-markdown.test.ts`
Expected: new tests pass, existing ones unaffected.

- [ ] **Step 3: Commit**

```bash
git add lib/utils/parse-recipe-markdown.ts lib/utils/__tests__/parse-recipe-markdown.test.ts
git commit -m "feat(f2): markdown import parses serving_size_label"
```

---

## Task 9: Playwright e2e — 4 assertions in `recipes-crud.spec.ts`

**Files:**
- Modify: `tests/e2e/recipes-crud.spec.ts`

- [ ] **Step 1: Add create-with-label test**

Add within an existing `@regression` describe block (mirror adjacent test style):

```ts
test('create recipe with serving_size_label renders on detail @regression', async ({ page }) => {
  const name = uniqueName('F2-Burger');
  await signIn(page);
  await page.goto('/recipes/new');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Servings').fill('4');
  await page.getByLabel('Serving size label (optional)').fill('1 burger');
  // ingredients + steps filled via helpers or minimal path...
  await page.getByRole('button', { name: /save/i }).click();
  await page.waitForURL(/\/recipes\/[^/]+$/);
  await expect(page.getByText('Serves 4 · 1 burger')).toBeVisible();
});
```

- [ ] **Step 2: Add clear-label test**

```ts
test('edit recipe clearing label falls back to Serves N @regression', async ({ page }) => {
  const recipe = await seedRecipe({ name: uniqueName('F2-Clear'), serving_size_label: '1 burger' });
  await signIn(page);
  await page.goto(`/recipes/${recipe.id}/edit`);
  await page.getByLabel('Serving size label (optional)').fill('');
  await page.getByRole('button', { name: /save/i }).click();
  await page.waitForURL(/\/recipes\/[^/]+$/);
  await expect(page.getByText('Serves 4', { exact: true })).toBeVisible();
});
```

- [ ] **Step 3: Add 40-char validation test**

```ts
test('label > 40 chars shows inline error @regression', async ({ page }) => {
  await signIn(page);
  await page.goto('/recipes/new');
  const longLabel = 'x'.repeat(41);
  const input = page.getByLabel('Serving size label (optional)');
  await input.fill(longLabel);
  // maxLength truncates to 40 at input level; verify counter shows 40/40
  await expect(page.getByText('40/40')).toBeVisible();
  await expect(input).toHaveValue('x'.repeat(40));
});
```

- [ ] **Step 4: Add markdown import round-trip test**

```ts
test('markdown import parses serving_size_label @regression', async ({ page }) => {
  await signIn(page);
  await page.goto('/recipes/import');
  const md = `# Test Burger\n\n**Serving size label:** 1 burger\n**Servings:** 4\n\n## Ingredients\n- 1 bun\n\n## Steps\n1. Cook`;
  await page.getByRole('textbox', { name: /markdown/i }).fill(md);
  await page.getByRole('button', { name: /import/i }).click();
  await page.waitForURL(/\/recipes\/[^/]+$/);
  await expect(page.getByText('Serves 4 · 1 burger')).toBeVisible();
});
```

- [ ] **Step 5: Update `seedRecipe` helper to accept the new field**

Edit `tests/e2e/helpers.ts`. In the `SeedOptions` interface add `serving_size_label?: string | null;`. In the insert body, include it.

- [ ] **Step 6: Run e2e suite**

Run: `npx playwright test tests/e2e/recipes-crud.spec.ts`
Expected: all 4 new tests pass plus existing regressions.

- [ ] **Step 7: Commit**

```bash
git add tests/e2e/recipes-crud.spec.ts tests/e2e/helpers.ts
git commit -m "test(f2): e2e coverage for serving_size_label CRUD + import + validation"
```

---

## Task 10: Test gate + final verification

**Files:**
- None (verification only)

- [ ] **Step 1: Run full Jest suite**

Run: `npm test`
Expected: all tests pass, including new `formatServings` tests.

- [ ] **Step 2: Run full Playwright regression tag**

Run: `npx playwright test --grep @regression`
Expected: all pass.

- [ ] **Step 3: Run test gate**

Run: `npm run test:gate`
Expected: gate passes (new tests count is within allowed deltas; if gate complains about increase, run `npm run test:gate:bootstrap` and commit baseline update).

- [ ] **Step 4: Manual mobile smoke**

Run dev server, open `http://localhost:3000/recipes/new` in Chrome DevTools mobile emulator (iPhone 12, 390px). Verify:
- Serving size label row sits cleanly below Servings input
- Counter is readable
- Recipe detail renders `Serves 4 · 1 burger` without wrap issues at SM/MD/LG font sizes

- [ ] **Step 5: Commit baseline bump if gate required it**

```bash
git add .test-gate/baseline.json
git commit -m "chore(f2): update test gate baseline"
```

---

## Self-review summary

- Spec requirement → Task coverage:
  - Schema (1 nullable text column, CHECK constraint) → Task 1 ✓
  - TypeScript types → Task 2 ✓
  - Form UX with 40-char limit + counter → Task 5 ✓
  - Display via helper + truncation → Tasks 3, 7 ✓
  - Markdown import → Task 8 ✓
  - Jest + Playwright coverage → Tasks 3, 8, 9 ✓
  - i18n (en/es) → Task 4 ✓
  - Server validation (≤40, trim to null) → Task 6 ✓

- Spec Open Questions left untouched by plan (by design — deferred strategic decisions):
  - OQ-1 markdown front-matter keep-or-drop (plan includes; if chef later opts out, Task 8 + half of Task 9 revert cleanly)
  - OQ-2 format-servings abstraction (plan uses single consumer today; helper still justified as print/cook surfaces may adopt later)
  - OQ-3 scaled-display ambiguity (MVP accepts current behavior)
  - OQ-4 ship-independent-of-F3 (plan has no F3 dependency — ✓)

- Types consistent across tasks: `Recipe.serving_size_label: string | null` defined in Task 2, used identically in Tasks 3, 5, 6, 7, 8.
