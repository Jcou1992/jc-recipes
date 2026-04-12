/**
 * Markdown import — paste markdown, verify form populated, save, verify data.
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL    = 'test@jc-recipes.local';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'changeme';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 10_000 });
}

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

// ── Desktop ────────────────────────────────────────────────────────────────────

test('paste markdown → preview updates → import populates form → save succeeds', async ({ page }) => {
  await signIn(page);
  await page.goto('/recipes/new');

  // Switch to markdown tab
  await page.getByTestId('markdown-tab').click();
  await expect(page.getByTestId('markdown-input')).toBeVisible();

  // Paste markdown
  await page.getByTestId('markdown-input').fill(SAMPLE_MD);

  // Preview should show the title
  await expect(page.getByTestId('markdown-preview')).toContainText('Markdown Import Test');

  // Click Import
  await page.getByTestId('import-button').click();

  // Should switch to Manual tab with form populated
  await expect(page.locator('#name')).toBeVisible();
  await expect(page.locator('#name')).toHaveValue('Markdown Import Test');
  await expect(page.getByLabel('Servings')).toHaveValue('2');

  // Optional fields — open and verify
  await page.getByText('Optional fields').click();
  await expect(page.getByLabel('Description')).toHaveValue(
    'A recipe for the e2e test suite'
  );
  await expect(page.getByLabel('Prep time (min)')).toHaveValue('15');
  await expect(page.getByLabel('Cook time (min)')).toHaveValue('20');

  // Save
  await page.getByRole('button', { name: 'Create recipe' }).click();
  await expect(page).toHaveURL(/\/recipes\/[a-z0-9-]+$/, { timeout: 10_000 });

  // Verify on detail page
  await expect(page.getByRole('heading', { name: 'Markdown Import Test' })).toBeVisible();
  await expect(page.getByText('spaghetti')).toBeVisible();
  await expect(page.getByText('Cook pasta until al dente.')).toBeVisible();
  await expect(page.getByText('⏱')).toBeVisible();
  await expect(page.getByText('E2E test notes here.')).toBeVisible();
});

test('import button is disabled when textarea is empty', async ({ page }) => {
  await signIn(page);
  await page.goto('/recipes/new');
  await page.getByTestId('markdown-tab').click();
  await expect(page.getByTestId('import-button')).toBeDisabled();
});

// ── Mobile layout ──────────────────────────────────────────────────────────────

test('on mobile, textarea and preview stack vertically and import button is full-width', async ({ page }) => {
  await signIn(page);
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

  // On mobile (<1024px) textarea and preview stack vertically (flex-col)
  if (vw < 1024) {
    expect(taBox!.y).toBeLessThan(pvBox!.y);
  }
  // On mobile (<640px) import button is full-width (w-full sm:w-auto).
  // Account for outer px-4 (32px) + inner p-6 (48px) = ~80px total horizontal padding.
  if (vw < 640) {
    expect(btnBox!.width).toBeGreaterThan(vw * 0.75);
  }
});
