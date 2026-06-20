/**
 * F3 macros — detail-page integration.
 *
 * Assumes migrations 20260425003000..005 are applied and nutrition_facts
 * contains (at minimum) the hand-typed seed from 003002 (chicken breast
 * fdc_id=171477, rice 169704, onions 1104067, etc.).
 *
 * Split into:
 *   1. @smoke — static-display state machine (matched / null / zero-matched).
 *   2. @regression — real compute round-trips: triggerCompute from null,
 *      and match-modal save from partial. These exercise the actual
 *      compute path end-to-end (seed → click → compute → card transition).
 */
import { test, expect, type Page } from '@playwright/test';
import { seedRecipeWithMacros, uniqueName } from './helpers';

type Scenario = {
  label: string;
  seed: Parameters<typeof seedRecipeWithMacros>[0];
  assert: (page: Page) => Promise<void>;
};

const CASES: Scenario[] = [
  {
    label: 'matched → per-serving kcal renders',
    seed: { name: uniqueName('F3-smoke-matched') },
    assert: async (page) => {
      await expect(page.getByText(/per serving/i).first()).toBeVisible();
      await expect(page.getByTestId('macros-kcal')).toBeVisible();
    },
  },
  {
    label: 'null macros → Compute CTA visible',
    seed: { name: uniqueName('F3-smoke-null'), macros: null },
    assert: async (page) => {
      await expect(page.getByTestId('macros-card-empty')).toBeVisible();
      await expect(page.getByTestId('macros-compute-btn')).toBeVisible();
    },
  },
  {
    label: 'zero matched → Match CTA opens modal',
    seed: {
      name: uniqueName('F3-smoke-unmatched'),
      ingredients: [
        { amount: 1, unit: null, name: 'mystery blob' },
        { amount: 1, unit: null, name: 'phantom herb' },
      ],
      macros: {
        kcal: 0,
        protein_g: 0,
        fat_g: 0,
        carbs_g: 0,
        fiber_g: 0,
        matched_count: 0,
        total_count: 2,
        unresolved_ingredients: [
          { index: 0, name: 'mystery blob', reason: 'no match' },
          { index: 1, name: 'phantom herb', reason: 'no match' },
        ],
      },
    },
    assert: async (page) => {
      const matchBtn = page.getByTestId('macros-match-btn');
      await expect(matchBtn).toBeVisible();
      await matchBtn.click();
      await expect(page.getByRole('dialog')).toBeVisible();
    },
  },
];

// All tests in this file share the same authed Supabase session (via the
// setup project's storageState) and insert rows as the test user. Run
// serially so a flake in one case can't leave hanging dialogs/state that
// trip a peer running in parallel.
test.describe.configure({ mode: 'serial' });

// Macros UI is hidden behind a build-time flag (lib/flags.ts) pending a product
// pivot. These specs exercise that UI, so skip them unless the flag is on. The
// test() titles stay intact so the QA test-gate baseline counts are unchanged.
test.beforeEach(() => {
  test.skip(
    process.env.NEXT_PUBLIC_MACROS_ENABLED !== '1',
    'macros feature hidden behind NEXT_PUBLIC_MACROS_ENABLED flag',
  );
});

test('macros card integration @smoke', async ({ page }) => {
  for (const scenario of CASES) {
    const recipe = await seedRecipeWithMacros(scenario.seed);
    await page.goto(`/recipes/${recipe.id}`);
    await page.waitForLoadState('networkidle');
    await scenario.assert(page);
  }
});

test('Compute CTA on null macros runs compute → complete card @regression', async ({ page }) => {
  // Both ingredients have fdc_ids in the seed (003002) so compute resolves
  // everything → complete (green) card with non-zero per-serving kcal.
  const recipe = await seedRecipeWithMacros({
    name: uniqueName('F3-compute-roundtrip'),
    ingredients: [
      { amount: 500, unit: 'g', name: 'chicken breast', fdc_id: 171477 },
      { amount: 200, unit: 'g', name: 'white rice',     fdc_id: 169704 },
    ],
    macros: null,
  });

  await page.goto(`/recipes/${recipe.id}`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('macros-card-empty')).toBeVisible();
  await page.getByTestId('macros-compute-btn').click();

  // Card transitions null → complete once compute returns + router.refresh().
  await expect(page.getByTestId('macros-card-complete')).toBeVisible({ timeout: 15_000 });
  const kcal = page.getByTestId('macros-kcal');
  await expect(kcal).toBeVisible();
  await expect(kcal).not.toHaveText(/^0\s/);
});

test('match modal pick → save transitions partial → complete @regression', async ({ page }) => {
  // Partial seed: chicken matched (171477) + onions unresolved (no fdc_id).
  // Onions is in the seed as 1104067, so the modal will offer it as a
  // candidate; selecting it and saving triggers compute which should
  // resolve both and flip the card from partial (amber) to complete (green).
  const recipe = await seedRecipeWithMacros({
    name: uniqueName('F3-modal-save-roundtrip'),
    ingredients: [
      { amount: 500, unit: 'g', name: 'chicken breast', fdc_id: 171477 },
      { amount: 100, unit: 'g', name: 'onions' }, // unresolved → will match via modal
    ],
    macros: {
      kcal: 570,
      protein_g: 106.2,
      fat_g: 13.1,
      carbs_g: 0,
      fiber_g: 0,
      matched_count: 1,
      total_count: 2,
      unresolved_ingredients: [{ index: 1, name: 'onions', reason: 'no match' }],
    },
  });

  await page.goto(`/recipes/${recipe.id}`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByTestId('macros-card-partial')).toBeVisible();
  await page.getByTestId('macros-edit-btn').click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Candidates load async — wait for at least one radio in the onions row
  // (index 1), then pick the first one.
  const onionsRow = page.getByTestId('match-row-1');
  const firstRadio = onionsRow.locator('input[type="radio"]').first();
  await expect(firstRadio).toBeVisible({ timeout: 10_000 });
  await firstRadio.check();

  await page.getByTestId('macros-save-btn').click();
  await expect(dialog).toBeHidden({ timeout: 10_000 });
  await expect(page.getByTestId('macros-card-complete')).toBeVisible({ timeout: 15_000 });
});
