/**
 * F3 macros — detail-page integration smoke.
 *
 * Assumes migrations 20260425003000..005 are applied and nutrition_facts
 * contains (at minimum) the hand-typed seed from 003002 (chicken breast
 * fdc_id=171477, rice 169704, etc.).
 *
 * Parameterized: each case drives one matcher through the macros card
 * state machine (computed / null / zero-matched / modal open).
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

test('macros card integration @smoke', async ({ page }) => {
  for (const scenario of CASES) {
    const recipe = await seedRecipeWithMacros(scenario.seed);
    await page.goto(`/recipes/${recipe.id}`);
    await page.waitForLoadState('networkidle');
    await scenario.assert(page);
  }
});
