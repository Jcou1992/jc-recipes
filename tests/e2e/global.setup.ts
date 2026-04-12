/**
 * Runs once before all test projects.
 * Logs in the test user and saves the browser storage state so that
 * recipes-crud and markdown-import tests can reuse the session without
 * re-authenticating on every test case.
 */
import { test as setup, expect } from '@playwright/test';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, '.auth/user.json');

const EMAIL    = 'test@jc-recipes.local';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'changeme';

setup('authenticate test user', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 15_000 });
  await page.context().storageState({ path: AUTH_FILE });
});
