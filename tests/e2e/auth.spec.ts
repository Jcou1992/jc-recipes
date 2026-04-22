/**
 * Auth tests — UI login, logout, route protection, mobile layout.
 *
 * This spec owns the login *form* interactions and runs in its own Playwright
 * project without shared storageState (see playwright.config.ts "Auth (Desktop Chrome)").
 * All other specs reuse storageState captured by global.setup.ts, so they
 * never re-sign-in and don't need to duplicate these assertions.
 */
import { test, expect } from '@playwright/test';
import { TEST_EMAIL, TEST_PASSWORD, signIn } from './helpers';

// ── Login ─────────────────────────────────────────────────────────────────────

test('login page renders and rejects wrong password @smoke', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'jc-recipes' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  const submit = page.getByRole('button', { name: 'Sign in' });
  await expect(submit).toBeVisible();

  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.getByLabel('Password').fill('wrongpassword');
  await submit.click();
  await expect(page.locator('p.bg-red-50')).toBeVisible({ timeout: 8_000 });
});

// ── Login success + logout round trip ─────────────────────────────────────────

test('successful login → /recipes, logout → /login, still-authed visit to /login redirects @regression', async ({ page }) => {
  await signIn(page);

  // Authed user hitting /login must be redirected back to /recipes.
  await page.goto('/login');
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 5_000 });

  // Logout must return to /login and protect /recipes afterwards.
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 8_000 });
  await page.goto('/recipes');
  await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
});

// ── Route protection ──────────────────────────────────────────────────────────

test('unauthenticated request to /recipes redirects to /login @smoke', async ({ page }) => {
  await page.goto('/recipes');
  await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
});

// ── Mobile layout ─────────────────────────────────────────────────────────────

test('login form is full-width and touch-friendly on mobile @mobile', async ({ page }) => {
  await page.goto('/login');
  const vw = page.viewportSize()!.width;
  const emailBox = await page.getByLabel('Email').boundingBox();
  const minWidth = vw <= 768 ? vw * 0.5 : 300;
  expect(emailBox!.width).toBeGreaterThan(minWidth);

  const btnBox = await page.getByRole('button', { name: 'Sign in' }).boundingBox();
  expect(btnBox!.height).toBeGreaterThanOrEqual(44);
});

// Note: TEST_PASSWORD ref keeps helper import side-effect-free under tsc strict.
void TEST_PASSWORD;
