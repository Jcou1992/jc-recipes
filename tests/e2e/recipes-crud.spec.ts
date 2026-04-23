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

// ── F2: serving_size_label ────────────────────────────────────────────────────

test('create recipe with serving_size_label renders on detail @regression', async ({ page }) => {
  const name = uniqueName('SSLCreate');
  const { id } = await seedRecipe({ name, servings: 4, serving_size_label: '1 burger' });

  await page.goto(`/recipes/${id}`);
  await expect(page.getByTestId('scaler-value')).toContainText('1 burger');
  await expect(page.getByTestId('scaler-value')).toContainText('Serves 4');
});

test('edit recipe clearing label falls back to Serves N @regression', async ({ page }) => {
  const name = uniqueName('SSLClear');
  const { id } = await seedRecipe({ name, servings: 4, serving_size_label: '1 burger' });

  await page.goto(`/recipes/${id}/edit`);
  await page.waitForLoadState('networkidle');

  const labelInput = page.locator('#serving-size-label');
  await expect(labelInput).toHaveValue('1 burger');
  await labelInput.clear();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await page.waitForURL(
    url => /\/recipes\/[a-z0-9-]+$/.test(url.toString()) && !url.pathname.endsWith('/recipes/new'),
    { timeout: 30_000 },
  );

  await expect(page.getByTestId('scaler-value')).toHaveText(/Serves 4\s*$/);
});

test('label > 40 chars — input maxLength truncates + counter shows 40/40 @regression', async ({ page }) => {
  const { id } = await seedRecipe({ name: uniqueName('SSLCap') });
  await page.goto(`/recipes/${id}/edit`);
  await page.waitForLoadState('networkidle');

  const labelInput = page.locator('#serving-size-label');
  const fifty = 'x'.repeat(50);
  await labelInput.fill(fifty);

  await expect(labelInput).toHaveValue('x'.repeat(40));
  await expect(page.getByText('40/40')).toBeVisible();
});

test('markdown import parses serving_size_label @regression', async ({ page }) => {
  await page.goto('/recipes/new');
  await page.waitForLoadState('networkidle');
  await page.getByTestId('markdown-tab').click();

  const name = uniqueName('SSLImport');
  const md = [
    `# ${name}`,
    '',
    '**Servings:** 2',
    '**Serving size label:** 1 slice',
    '',
    '## Ingredients',
    '- 1 egg',
    '',
    '## Steps',
    '1. Do the thing.',
  ].join('\n');

  await page.getByTestId('markdown-input').fill(md);
  await page.getByTestId('import-button').click();

  await expect(page.getByTestId('manual-tab')).toBeVisible();
  await expect(page.locator('#serving-size-label')).toHaveValue('1 slice');
});
