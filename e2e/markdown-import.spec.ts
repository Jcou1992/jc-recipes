import { test, expect, devices } from '@playwright/test';

const SAMPLE_MD = `# E2E Test Carbonara

> A recipe created by the e2e test suite

**Prep time:** 15 min
**Cook time:** 20 min
**Servings:** 2

## Ingredients
- 100g spaghetti
- 2 eggs

## Steps
1. Cook pasta until al dente.
2. Mix eggs with parmesan. [timer: 3min]

## Notes
E2E test notes here.

## Tags
test, e2e`.trim();

// ── Desktop flow ──────────────────────────────────────────────────────────────

test('paste markdown → form populated correctly → save → recipe saved', async ({ page }) => {
  await page.goto('/recipes/new');

  // Switch to markdown tab
  await page.getByTestId('markdown-tab').click();
  await expect(page.getByTestId('markdown-input')).toBeVisible();

  // Paste markdown
  await page.getByTestId('markdown-input').fill(SAMPLE_MD);

  // Preview should update in real time
  await expect(page.getByTestId('markdown-preview')).toContainText('E2E Test Carbonara');

  // Click Import
  await page.getByTestId('import-button').click();

  // Should switch back to manual tab and form should be populated
  await expect(page.getByTestId('manual-tab')).toBeVisible();
  await expect(page.getByPlaceholder('Nombre de la receta')).toBeVisible();

  // Verify form fields
  await expect(page.getByPlaceholder('Nombre de la receta')).toHaveValue('E2E Test Carbonara');
  await expect(page.getByPlaceholder('Breve descripción de la receta...')).toHaveValue(
    'A recipe created by the e2e test suite'
  );

  // Prep/cook times (number inputs by label)
  await expect(page.getByLabel('Prep. (min)')).toHaveValue('15');
  await expect(page.getByLabel('Cocción (min)')).toHaveValue('20');

  // Servings
  await expect(page.getByLabel('Porciones')).toHaveValue('2');

  // Save the recipe
  await page.getByRole('button', { name: 'Crear receta' }).click();

  // Should redirect to the recipe detail page
  await expect(page).toHaveURL(/\/recipes\/\d+/, { timeout: 10_000 });

  // Recipe title is shown on the detail page
  await expect(page.getByRole('heading', { name: 'E2E Test Carbonara' })).toBeVisible();
});

// ── Mobile layout ─────────────────────────────────────────────────────────────

test.describe('mobile layout', () => {
  test.use({ ...devices['Pixel 5'] });

  test('textarea and preview stack vertically, import button is full-width', async ({ page }) => {
    await page.goto('/recipes/new');
    await page.getByTestId('markdown-tab').click();

    const textarea   = page.getByTestId('markdown-input');
    const preview    = page.getByTestId('markdown-preview');
    const importBtn  = page.getByTestId('import-button');

    await expect(textarea).toBeVisible();
    await expect(preview).toBeVisible();
    await expect(importBtn).toBeVisible();

    // Textarea should be above the preview (textarea top < preview top)
    const taBox  = await textarea.boundingBox();
    const pvBox  = await preview.boundingBox();
    expect(taBox!.y).toBeLessThan(pvBox!.y);

    // Import button is full-width on mobile (w-full is applied when viewport < sm)
    const btnBox  = await importBtn.boundingBox();
    const vw      = page.viewportSize()!.width;
    // Allow ≤32px total horizontal padding (16px each side)
    expect(btnBox!.width).toBeGreaterThan(vw - 64);
  });
});
