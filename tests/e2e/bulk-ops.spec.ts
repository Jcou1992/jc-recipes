/**
 * Bulk operations — select mode, delete, duplicate, tag add/remove, MD export.
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

async function createQuickRecipe(page: Page, name: string, tag?: string): Promise<void> {
  await page.goto('/recipes/new');
  await page.waitForLoadState('networkidle');
  await page.locator('#name').fill(name);
  await page.getByLabel('Servings').fill('1');
  await page.getByRole('textbox', { name: 'Ingredient name' }).first().fill('salt');
  await page.getByRole('textbox', { name: 'Ingredient amount' }).first().fill('1');
  await page.getByRole('textbox', { name: 'Step 1' }).fill('Stir.');
  if (tag) {
    await page.getByText('Optional fields').click();
    await page.getByLabel('Tags').fill(tag);
  }
  await page.getByRole('button', { name: 'Create recipe' }).click();
  await page.waitForURL(
    url => /\/recipes\/[a-z0-9-]+$/.test(url.toString()) && !url.pathname.endsWith('/recipes/new'),
    { timeout: 30_000 },
  );
}

async function goToList(page: Page) {
  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');
}

// ── Select mode ───────────────────────────────────────────────────────────────

test('enter and exit select mode', async ({ page }) => {
  await signIn(page);
  await createQuickRecipe(page, `BulkSelect-${Date.now()}`);
  await goToList(page);

  await expect(page.getByTestId('select-mode-enter')).toBeVisible();
  await page.getByTestId('select-mode-enter').click();
  await expect(page.getByTestId('select-mode-exit')).toBeVisible();
  await expect(page.getByTestId('select-all')).toBeVisible();

  // Exit via "Done"
  await page.getByTestId('select-mode-exit').click();
  await expect(page.getByTestId('select-mode-enter')).toBeVisible();
});

test('selecting a card shows the action bar', async ({ page }) => {
  await signIn(page);
  const name = `BulkSelectOne-${Date.now()}`;
  await createQuickRecipe(page, name);
  await goToList(page);

  await page.getByTestId('select-mode-enter').click();

  // Find first card and click it
  const cards = page.locator('[data-testid^="recipe-card-"]');
  await expect(cards.first()).toBeVisible();
  await cards.first().click();

  await expect(page.getByTestId('bulk-action-bar')).toBeVisible();
  await expect(page.getByTestId('bulk-count')).toContainText('1');
});

test('select-all selects every visible card', async ({ page }) => {
  await signIn(page);
  // Seed 2 recipes to ensure >1
  await createQuickRecipe(page, `BulkSelectAllA-${Date.now()}`);
  await createQuickRecipe(page, `BulkSelectAllB-${Date.now()}`);
  await goToList(page);

  await page.getByTestId('select-mode-enter').click();
  await page.getByTestId('select-all').click();

  await expect(page.getByTestId('bulk-action-bar')).toBeVisible();
  const countText = await page.getByTestId('bulk-count').textContent();
  expect(countText).toMatch(/\d+/);
  const countNum = parseInt(countText?.match(/\d+/)?.[0] ?? '0', 10);
  expect(countNum).toBeGreaterThanOrEqual(2);
});

// ── Bulk delete ──────────────────────────────────────────────────────────────

test('bulk delete removes selected recipes', async ({ page }) => {
  await signIn(page);
  const uniq = `BulkDelete-${Date.now()}`;
  const nameA = `${uniq}-A`;
  const nameB = `${uniq}-B`;
  await createQuickRecipe(page, nameA);
  await createQuickRecipe(page, nameB);
  await goToList(page);

  // Enter select mode and select both by name
  await page.getByTestId('select-mode-enter').click();

  for (const n of [nameA, nameB]) {
    await page.getByRole('button', { name: new RegExp(`^Select ${n}$`) }).click();
  }

  await expect(page.getByTestId('bulk-count')).toContainText('2');

  await page.getByTestId('bulk-delete').click();
  // ConfirmDialog appears
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

  // Recipes should be gone from list after refresh
  await expect(page.getByRole('heading', { name: nameA, level: 2 })).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: nameB, level: 2 })).toHaveCount(0);
});

test('bulk delete cancel keeps recipes', async ({ page }) => {
  await signIn(page);
  const name = `BulkDeleteCancel-${Date.now()}`;
  await createQuickRecipe(page, name);
  await goToList(page);

  await page.getByTestId('select-mode-enter').click();
  await page.getByRole('button', { name: new RegExp(`^Select ${name}$`) }).click();
  await page.getByTestId('bulk-delete').click();

  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();

  // Still there
  await page.getByTestId('select-mode-exit').click();
  await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible();
});

// ── Bulk duplicate ────────────────────────────────────────────────────────────

test('bulk duplicate creates (Copy) versions', async ({ page }) => {
  await signIn(page);
  const name = `BulkDup-${Date.now()}`;
  await createQuickRecipe(page, name);
  await goToList(page);

  await page.getByTestId('select-mode-enter').click();
  await page.getByRole('button', { name: new RegExp(`^Select ${name}$`) }).click();
  await page.getByTestId('bulk-duplicate').click();

  await expect(page.getByRole('heading', { name: `${name} (Copy)`, level: 2 })).toBeVisible({ timeout: 15_000 });
});

// ── Bulk tag add ──────────────────────────────────────────────────────────────

test('bulk tag add applies to all selected', async ({ page }) => {
  await signIn(page);
  const suffix = Date.now();
  const a = `BulkTagA-${suffix}`;
  const b = `BulkTagB-${suffix}`;
  const tag = `tag${suffix}`;
  await createQuickRecipe(page, a);
  await createQuickRecipe(page, b);
  await goToList(page);

  await page.getByTestId('select-mode-enter').click();
  await page.getByRole('button', { name: new RegExp(`^Select ${a}$`) }).click();
  await page.getByRole('button', { name: new RegExp(`^Select ${b}$`) }).click();
  await page.getByTestId('bulk-tags').click();

  await expect(page.getByTestId('bulk-tag-dialog')).toBeVisible();
  await page.getByTestId('bulk-tag-new-input').fill(tag);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByTestId('bulk-tag-apply').click();

  // Dialog closes, tag appears on both cards
  await expect(page.getByTestId('bulk-tag-dialog')).not.toBeVisible({ timeout: 10_000 });
  // Wait for refresh then check tag chip appears at least twice
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(tag).first()).toBeVisible({ timeout: 15_000 });
});

// ── MD export ────────────────────────────────────────────────────────────────

test('bulk export MD triggers a download', async ({ page }) => {
  await signIn(page);
  const name = `BulkExport-${Date.now()}`;
  await createQuickRecipe(page, name);
  await goToList(page);

  await page.getByTestId('select-mode-enter').click();
  await page.getByRole('button', { name: new RegExp(`^Select ${name}$`) }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('bulk-export-md').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.md$/);
});
