/**
 * Auth tests — happy path, error state, redirect, mobile layout.
 * Test user: test@jc-recipes.local (created in Supabase dashboard before first run).
 * Password stored in TEST_USER_PASSWORD env var (never committed).
 */
import { test, expect } from '@playwright/test';

const EMAIL    = 'test@jc-recipes.local';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'changeme';

// ── Login ──────────────────────────────────────────────────────────────────────

test('login page renders', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'jc-recipes' })).toBeVisible();
  await expect(page.getByLabel('Email')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('login with wrong credentials shows error', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.locator('p.bg-red-50')).toBeVisible({ timeout: 8_000 });
});

test('login with correct credentials redirects to /recipes', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 10_000 });
});

test('authenticated user visiting /login is redirected to /recipes', async ({ page, context }) => {
  // Login first
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 10_000 });

  // Visiting login again should redirect
  await page.goto('/login');
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 5_000 });
});

// ── Logout ─────────────────────────────────────────────────────────────────────

test('sign-out redirects to /login and protects /recipes', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 10_000 });

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 8_000 });

  await page.goto('/recipes');
  await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
});

// ── Route protection ───────────────────────────────────────────────────────────

test('unauthenticated request to /recipes redirects to /login', async ({ page }) => {
  await page.goto('/recipes');
  await expect(page).toHaveURL(/\/login/, { timeout: 5_000 });
});

// ── Mobile layout ──────────────────────────────────────────────────────────────

test('login form is full-width and usable on mobile', async ({ page }) => {
  await page.goto('/login');
  const vw = page.viewportSize()!.width;
  const emailBox = await page.getByLabel('Email').boundingBox();
  // On mobile (<= 768px): form should fill most of the screen.
  // On desktop: form is centered with max-w-sm (~384px) — just verify it's substantial.
  const minWidth = vw <= 768 ? vw * 0.5 : 300;
  expect(emailBox!.width).toBeGreaterThan(minWidth);

  const btn = page.getByRole('button', { name: 'Sign in' });
  const btnBox = await btn.boundingBox();
  expect(btnBox!.height).toBeGreaterThanOrEqual(44);
});
