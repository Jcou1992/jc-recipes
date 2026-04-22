/**
 * Markdown import — DOM wiring only.
 *
 * Parser correctness is covered exhaustively by the Jest unit suite
 * (lib/utils/__tests__/parse-recipe-markdown.test.ts). These tests verify
 * only that the UI paste → preview → import → form pipeline is hooked up,
 * and that the mobile layout stacks as designed.
 */
import { test, expect } from '@playwright/test';

const SAMPLE_MD = `# Markdown Import Test

> A recipe for the e2e test suite

**Prep time:** 15 min
**Cook time:** 20 min
**Servings:** 2

## Ingredients
- 100g spaghetti
- 2 eggs

## Steps
1. Cook pasta until al dente.
2. Mix eggs with cheese. [timer: 3min]

## Notes
E2E test notes here.

## Tags
test, pasta`.trim();

// ── DOM wiring: paste → preview → import populates form → save ───────────────

test('markdown tab: import button starts disabled, flows paste → preview → form → save @regression', async ({ page }) => {
  await page.goto('/recipes/new');
  await page.getByTestId('markdown-tab').click();

  const input      = page.getByTestId('markdown-input');
  const preview    = page.getByTestId('markdown-preview');
  const importBtn  = page.getByTestId('import-button');

  await expect(input).toBeVisible();
  await expect(importBtn).toBeDisabled();

  await input.fill(SAMPLE_MD);
  await expect(preview).toContainText('Markdown Import Test');
  await expect(importBtn).toBeEnabled();
  await importBtn.click();

  // Form populated via shared parser — just prove wiring, not parser semantics.
  await expect(page.locator('#name')).toHaveValue('Markdown Import Test');
  await expect(page.getByLabel('Servings')).toHaveValue('2');

  await page.getByRole('button', { name: 'Create recipe' }).click();
  await expect(page).toHaveURL(/\/recipes\/[a-z0-9-]+$/, { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Markdown Import Test' })).toBeVisible();
});

// ── Mobile layout ─────────────────────────────────────────────────────────────

test('markdown tab: textarea/preview stack vertically and import button is full-width on mobile @mobile', async ({ page }) => {
  await page.goto('/recipes/new');
  await page.getByTestId('markdown-tab').click();

  const textarea  = page.getByTestId('markdown-input');
  const preview   = page.getByTestId('markdown-preview');
  const importBtn = page.getByTestId('import-button');

  await expect(textarea).toBeVisible();
  await expect(preview).toBeVisible();

  const taBox  = await textarea.boundingBox();
  const pvBox  = await preview.boundingBox();
  const btnBox = await importBtn.boundingBox();
  const vw     = page.viewportSize()!.width;

  if (vw < 1024) expect(taBox!.y).toBeLessThan(pvBox!.y);
  if (vw < 640)  expect(btnBox!.width).toBeGreaterThan(vw * 0.75);
});
