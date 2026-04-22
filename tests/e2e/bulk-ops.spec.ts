/**
 * Bulk operations — select mode workflow, bulk delete, bulk duplicate,
 * bulk tag-add, bulk MD export. Seeded via API (seedRecipe) to keep the
 * slow form fills out of the hot path.
 *
 * Delete-dialog *cancel* semantics are already covered in recipes-crud.spec.ts,
 * so this file only covers bulk-specific behavior.
 */
import { test, expect, type Page } from '@playwright/test';
import { seedRecipe, uniqueName } from './helpers';

async function goToList(page: Page) {
  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');
}

// ── Select mode workflow (merged: enter/exit, select card, select-all) ───────

test('select mode: enter, select one, select all, exit @regression', async ({ page }) => {
  const a = uniqueName('BulkSelA');
  const b = uniqueName('BulkSelB');
  await seedRecipe({ name: a });
  await seedRecipe({ name: b });
  await goToList(page);

  // Enter select mode
  await expect(page.getByTestId('select-mode-enter')).toBeVisible();
  await page.getByTestId('select-mode-enter').click();
  await expect(page.getByTestId('select-mode-exit')).toBeVisible();
  await expect(page.getByTestId('select-all')).toBeVisible();

  // Select first card → action bar appears with count 1
  const cards = page.locator('[data-testid^="recipe-card-"]');
  await expect(cards.first()).toBeVisible();
  await cards.first().click();
  await expect(page.getByTestId('bulk-action-bar')).toBeVisible();
  await expect(page.getByTestId('bulk-count')).toContainText('1');

  // Select-all → count ≥ 2 (the two we seeded)
  await page.getByTestId('select-all').click();
  const countText = await page.getByTestId('bulk-count').textContent();
  const countNum  = parseInt(countText?.match(/\d+/)?.[0] ?? '0', 10);
  expect(countNum).toBeGreaterThanOrEqual(2);

  // Exit via Done
  await page.getByTestId('select-mode-exit').click();
  await expect(page.getByTestId('select-mode-enter')).toBeVisible();
});

// ── Bulk delete ───────────────────────────────────────────────────────────────

test('bulk delete: confirming removes selected recipes @regression', async ({ page }) => {
  const uniq  = uniqueName('BulkDel');
  const nameA = `${uniq}-A`;
  const nameB = `${uniq}-B`;
  await seedRecipe({ name: nameA });
  await seedRecipe({ name: nameB });
  await goToList(page);

  await page.getByTestId('select-mode-enter').click();
  for (const n of [nameA, nameB]) {
    await page.getByRole('button', { name: new RegExp(`^Select ${n}$`) }).click();
  }
  await expect(page.getByTestId('bulk-count')).toContainText('2');
  await page.getByTestId('bulk-delete').click();

  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByRole('heading', { name: nameA, level: 2 })).toHaveCount(0, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: nameB, level: 2 })).toHaveCount(0);
});

// ── Bulk duplicate ────────────────────────────────────────────────────────────

test('bulk duplicate creates "(Copy)" versions @regression', async ({ page }) => {
  const name = uniqueName('BulkDup');
  await seedRecipe({ name });
  await goToList(page);

  await page.getByTestId('select-mode-enter').click();
  await page.getByRole('button', { name: new RegExp(`^Select ${name}$`) }).click();
  await page.getByTestId('bulk-duplicate').click();

  await expect(page.getByRole('heading', { name: `${name} (Copy)`, level: 2 })).toBeVisible({ timeout: 15_000 });
});

// ── Bulk tag add ──────────────────────────────────────────────────────────────

test('bulk tag add applies a tag to all selected recipes @regression', async ({ page }) => {
  const suffix = Date.now();
  const a   = uniqueName(`BulkTagA-${suffix}`);
  const b   = uniqueName(`BulkTagB-${suffix}`);
  const tag = `tag${suffix}`;
  await seedRecipe({ name: a });
  await seedRecipe({ name: b });
  await goToList(page);

  await page.getByTestId('select-mode-enter').click();
  await page.getByRole('button', { name: new RegExp(`^Select ${a}$`) }).click();
  await page.getByRole('button', { name: new RegExp(`^Select ${b}$`) }).click();
  await page.getByTestId('bulk-tags').click();

  await expect(page.getByTestId('bulk-tag-dialog')).toBeVisible();
  await page.getByTestId('bulk-tag-new-input').fill(tag);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByTestId('bulk-tag-apply').click();

  await expect(page.getByTestId('bulk-tag-dialog')).not.toBeVisible({ timeout: 10_000 });
  await page.waitForLoadState('networkidle');
  await expect(page.getByText(tag).first()).toBeVisible({ timeout: 15_000 });
});

// ── Bulk MD export ────────────────────────────────────────────────────────────

test('bulk export MD triggers a download @regression', async ({ page }) => {
  const name = uniqueName('BulkExport');
  await seedRecipe({ name });
  await goToList(page);

  await page.getByTestId('select-mode-enter').click();
  await page.getByRole('button', { name: new RegExp(`^Select ${name}$`) }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByTestId('bulk-export-md').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.md$/);
});
