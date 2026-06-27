/**
 * Admin + team-folder gating.
 *
 * The stored auth (playwright.config setup project) is the QA user
 * test@jc-recipes.local — a NON-admin. These checks verify the admin surface is
 * gated for non-admins and the shared "team" view is reachable. They do not
 * depend on the new migrations being applied: the team page degrades to its
 * empty state if `is_shared` is absent.
 */
import { test, expect } from '@playwright/test';

test('non-admin is redirected away from /admin @smoke', async ({ page }) => {
  await page.goto('/admin');
  // requireAdmin() redirects a non-admin to /recipes.
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 15_000 });
});

test('avatar menu hides Admin for non-admins but shows Team @smoke', async ({ page }) => {
  await page.goto('/recipes');
  await page.getByTestId('avatar-menu-btn').click();
  await expect(page.getByTestId('avatar-menu-team-link')).toBeVisible();
  await expect(page.getByTestId('avatar-menu-admin-link')).toHaveCount(0);
});

test('team recipes view loads @smoke', async ({ page }) => {
  await page.goto('/team');
  await expect(page).toHaveURL(/\/team$/);
  await expect(
    page.getByTestId('team-empty-state').or(page.getByTestId('team-recipe-grid')),
  ).toBeVisible({ timeout: 15_000 });
});
