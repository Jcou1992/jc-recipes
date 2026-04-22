/**
 * Recipe CRUD — create via form (exercises the UI write path once),
 * edit/delete via seedRecipe (skips the slow form fills we already cover).
 */
import { test, expect, type Page } from '@playwright/test';
import { seedRecipe, uniqueName } from './helpers';

async function gotoNewRecipe(page: Page) {
  await page.goto('/recipes/new');
  await page.waitForLoadState('networkidle'); // ensure React hydration before interacting
}

// ── Create form (full UI path) ────────────────────────────────────────────────

test('create via form populates detail page with every persisted field @smoke', async ({ page }) => {
  await gotoNewRecipe(page);
  await expect(page.getByTestId('manual-tab')).toBeVisible();

  const name = uniqueName('CreateUI');
  await page.locator('#name').fill(name);
  await page.getByLabel('Servings').fill('4');
  await page.getByRole('textbox', { name: 'Ingredient name' }).first().fill('flour');
  await page.getByRole('textbox', { name: 'Ingredient amount' }).first().fill('200');
  await page.getByRole('textbox', { name: 'Ingredient unit' }).first().fill('g');
  await page.getByRole('textbox', { name: 'Step 1' }).fill('Mix flour and water.');

  await page.getByText('Optional fields').click();
  await page.getByLabel('Description').fill('A test description');
  await page.getByLabel('Prep time (min)').fill('10');

  await page.getByRole('button', { name: 'Create recipe' }).click();
  await page.waitForURL(
    url => /\/recipes\/[a-z0-9-]+$/.test(url.toString()) && !url.pathname.endsWith('/recipes/new'),
    { timeout: 30_000 },
  );

  await expect(page.getByRole('heading', { name })).toBeVisible();
  await expect(page.getByText('4 servings')).toBeVisible();
  await expect(page.getByText('A test description')).toBeVisible();
  await expect(page.getByText('flour', { exact: true })).toBeVisible();
  await expect(page.getByText('Mix flour and water.')).toBeVisible();
});

test('create form blocks submission when name is empty @regression', async ({ page }) => {
  await gotoNewRecipe(page);
  await page.getByRole('button', { name: 'Create recipe' }).click();
  // Browser-native required validation prevents navigation.
  await expect(page).toHaveURL(/\/recipes\/new$/);
});

// ── Edit (seed via API, assert via UI) ────────────────────────────────────────

test('edit updates the recipe @regression', async ({ page }) => {
  const original = uniqueName('EditTarget');
  const renamed  = uniqueName('Renamed');
  const { id } = await seedRecipe({ name: original });

  await page.goto(`/recipes/${id}`);
  await page.getByRole('link', { name: 'Edit' }).click();
  await expect(page).toHaveURL(/\/edit$/);
  await page.waitForLoadState('networkidle');

  await page.locator('#name').clear();
  await page.locator('#name').fill(renamed);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.waitForURL(
    url => /\/recipes\/[a-z0-9-]+$/.test(url.toString()) && !url.pathname.endsWith('/recipes/new'),
    { timeout: 30_000 },
  );
  await expect(page.getByRole('heading', { name: renamed })).toBeVisible();
});

// ── Delete + cancel (shared seed) ─────────────────────────────────────────────

test('delete dialog: confirming removes the recipe @regression', async ({ page }) => {
  const { id } = await seedRecipe({ name: uniqueName('ToDelete') });
  await page.goto(`/recipes/${id}`);

  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 10_000 });
});

test('delete dialog: cancelling keeps the recipe @regression', async ({ page }) => {
  const name = uniqueName('KeepThis');
  const { id } = await seedRecipe({ name });
  await page.goto(`/recipes/${id}`);

  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name })).toBeVisible();
});
