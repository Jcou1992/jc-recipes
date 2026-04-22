/**
 * Setup project: logs in the test user once and persists storageState to
 * tests/e2e/.auth/user.json. All non-auth projects reuse it via `storageState`
 * in playwright.config.ts, so per-test sign-in is never needed.
 */
import { test as setup, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export const AUTH_FILE = path.join(__dirname, '.auth/user.json');

const EMAIL    = 'test@jc-recipes.local';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'changeme';

setup('authenticate test user', async ({ page }) => {
  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 15_000 });
  await page.context().storageState({ path: AUTH_FILE });
});
