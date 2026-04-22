/**
 * Phase 2 — search, tag filter, serving-scaler DOM wiring, cooking mode.
 *
 * Scaler math is covered exhaustively by lib/utils/__tests__/scaling.test.ts.
 * This spec only verifies the DOM wiring: clicking the scaler mutates the
 * rendered ingredient amount. No numeric-correctness assertions live here.
 */
import { test, expect, type Page } from '@playwright/test';
import { seedRecipe, uniqueName } from './helpers';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedAndOpen(
  page: Page,
  prefix: string,
  opts: Parameters<typeof seedRecipe>[0] extends infer T
    ? (T extends { name: string } ? Omit<T, 'name'> : never)
    : never = {} as never,
): Promise<string> {
  const { id } = await seedRecipe({ name: uniqueName(prefix), ...opts });
  await page.goto(`/recipes/${id}`);
  return `/recipes/${id}`;
}

async function openFilterSheet(page: Page) {
  const isNarrow = ((await page.viewportSize())?.width ?? 1280) < 640;
  await page.getByTestId(isNarrow ? 'filter-mobile-btn' : 'filter-desktop-btn').click();
}

// ── Search ────────────────────────────────────────────────────────────────────

test('search filters the recipe list by name @smoke', async ({ page }) => {
  const name = uniqueName('SearchHit');
  await seedRecipe({ name });

  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  const input = page.getByTestId('recipe-search');
  await expect(input).toBeVisible();
  await input.fill(name);
  await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible({ timeout: 15_000 });
});

test('search: no-match shows filtered empty state; × button clears the input @regression', async ({ page }) => {
  // Seed so the list is non-empty when filters clear — filtered-empty-state is
  // also shown when the account truly has no recipes, which would make this
  // assertion flaky under parallel bulk-delete workers.
  await seedRecipe({ name: uniqueName('SearchSentinel') });

  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  const input = page.getByTestId('recipe-search');
  await input.fill('zzz-no-match-recipe-xyz');
  await expect(page.getByTestId('filtered-empty-state')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('clear-filters-btn')).toBeVisible();

  // × button clears input; local state is synchronous.
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(input).toHaveValue('');
  // And restores the list — empty-state unmounts once the debounce flushes.
  await expect(page.getByTestId('filtered-empty-state')).toBeHidden({ timeout: 10_000 });
});

test('search: Clear filters button resets the filter @regression', async ({ page }) => {
  await seedRecipe({ name: uniqueName('ClearFiltersSentinel') });

  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  const input = page.getByTestId('recipe-search');
  await input.fill('zzz-no-match-recipe-xyz');
  await expect(page.getByTestId('filtered-empty-state')).toBeVisible({ timeout: 15_000 });

  await page.getByTestId('clear-filters-btn').click();
  // clearFilters() replaces the URL and clears searchInput synchronously;
  // the filtered view unmounts once the server re-renders.
  await expect(page.getByTestId('filtered-empty-state')).toBeHidden({ timeout: 10_000 });
  await expect(input).toHaveValue('');
});

// ── Tag filter (combines tag + search) ────────────────────────────────────────

test('tag filter chips mark as pressed and combine with search @regression', async ({ page }) => {
  const tag  = `e2etag${Date.now()}`;
  const name = uniqueName('TagRecipe');
  await seedRecipe({ name, tags: [tag] });

  await page.goto('/recipes');
  await openFilterSheet(page);

  const isNarrow = ((await page.viewportSize())?.width ?? 1280) < 640;
  const surface = page.getByTestId(isNarrow ? 'filter-sheet' : 'filter-popover');
  const chip = surface.getByTestId(`tag-filter-${tag}`);
  await expect(chip).toBeVisible();
  await chip.click();
  await surface.getByRole('button', { name: 'Done' }).click();

  // .first() — desktop + mobile strips share testId.
  await expect(page.getByTestId(`tag-filter-${tag}`).first()).toHaveAttribute('aria-pressed', 'true');

  // Combined with search: tag-filtered list still finds our recipe by name.
  await page.getByTestId('recipe-search').fill(name);
  await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible({ timeout: 15_000 });
});

// ── Scaler DOM wiring (math unit-tested elsewhere) ───────────────────────────

test('serving scaler: increasing servings updates the rendered ingredient amount @regression', async ({ page }) => {
  await seedAndOpen(page, 'ScalerWiring', {
    servings: 2,
    ingredients: [{ amount: 100, unit: 'g', name: 'flour' }],
    steps: [{ content: 'Mix.' }],
  } as never);

  await expect(page.getByTestId('scaler-value')).toContainText('2');
  const before = (await page.getByTestId('ingredient-amount-0').textContent()) ?? '';
  await page.getByTestId('scaler-increase').click();
  await expect(page.getByTestId('scaler-value')).toContainText('3');
  await expect.poll(async () =>
    (await page.getByTestId('ingredient-amount-0').textContent()) ?? ''
  , { timeout: 5_000 }).not.toBe(before);
  await expect(page.getByTestId('scaler-scaled-badge')).toBeVisible();
});

// ── Cooking mode ──────────────────────────────────────────────────────────────

test('cooking mode: enter, navigate steps forward, exit back to detail @smoke', async ({ page }) => {
  await seedAndOpen(page, 'CookNav', {
    steps: [{ content: 'Prepare ingredients.' }, { content: 'Cook for 10 minutes.' }, { content: 'Serve hot.' }],
  } as never);

  const cookBtn = page.getByTestId('cook-mode-btn').or(page.getByTestId('cook-mode-btn-desktop')).filter({ visible: true }).first();
  await cookBtn.click();
  await expect(page).toHaveURL(/\/cook/, { timeout: 15_000 });
  await expect(page.getByTestId('cook-mode')).toBeVisible();

  const vp = page.viewportSize();
  const suf = vp && vp.width < 640 ? '-mobile' : '';

  const stepText = page.getByTestId(`cook-step-text${suf}`);
  await expect(stepText).toContainText('Prepare ingredients');

  const next = page.getByTestId(`cook-next-btn${suf}`);
  await next.click();
  await expect(stepText).toContainText('Cook for 10 minutes');
  await next.click();
  await expect(stepText).toContainText('Serve hot');

  await page.getByTestId(`cook-exit-btn${suf}`).click();
  await page.waitForURL(
    url => /\/recipes\/[a-z0-9-]+$/.test(url.toString()) && !url.pathname.endsWith('/recipes/new'),
    { timeout: 30_000 },
  );
  await expect(page).not.toHaveURL(/\/cook/);
});

test('cooking mode: wake lock is requested on entry @regression', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      Object.defineProperty(Navigator.prototype, 'wakeLock', {
        get() {
          return {
            request: async (type: string) => {
              (window as unknown as Record<string, unknown>)._wakeLockType = type;
              return { release: async () => {} };
            },
          };
        },
        configurable: true,
      });
    } catch {
      (navigator as unknown as Record<string, unknown>).wakeLock = {
        request: async (type: string) => {
          (window as unknown as Record<string, unknown>)._wakeLockType = type;
          return { release: async () => {} };
        },
      };
    }
  });

  await seedAndOpen(page, 'WakeLock', { steps: [{ content: 'Single step.' }] } as never);
  await page.getByTestId('cook-mode-btn').or(page.getByTestId('cook-mode-btn-desktop')).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(/\/cook/, { timeout: 15_000 });

  await page.waitForTimeout(500);
  const lockType = await page.evaluate(() => (window as unknown as Record<string, unknown>)._wakeLockType);
  expect(lockType).toBe('screen');
});

test('cooking mode: progress bar advances with step navigation @mobile', async ({ page }) => {
  // The progress bar is rendered inside a `sm:hidden` container — mobile-only.
  // Desktop cook mode uses a different layout with no progress bar. Tagging
  // @mobile routes this to the Mobile Safari project where the bar is present.
  await seedAndOpen(page, 'Progress', {
    steps: [{ content: 'A.' }, { content: 'B.' }, { content: 'C.' }, { content: 'D.' }],
  } as never);
  // force: true — Mobile Chrome has a stacking-context quirk when pages are tall (4+ steps).
  await page.getByTestId('cook-mode-btn').or(page.getByTestId('cook-mode-btn-desktop')).filter({ visible: true }).first().click({ force: true });

  const bar = page.getByTestId('cook-progress-bar');
  await expect(bar).toBeVisible();
  expect(await bar.getAttribute('style')).toContain('25%');

  const vp = page.viewportSize();
  const nextId = vp && vp.width < 640 ? 'cook-next-btn-mobile' : 'cook-next-btn';
  await page.getByTestId(nextId).click();
  expect(await bar.getAttribute('style')).toContain('50%');
});

test('cooking mode: ingredient sheet toggles on mobile viewports @mobile', async ({ page }) => {
  const vp = page.viewportSize();
  if (!vp || vp.width >= 768) return; // Desktop has always-visible sidebar.

  await seedAndOpen(page, 'Sheet', {
    ingredients: [{ amount: 1, unit: null, name: 'onion' }],
    steps: [{ content: 'Chop the onion.' }],
  } as never);
  await page.getByTestId('cook-mode-btn').or(page.getByTestId('cook-mode-btn-desktop')).filter({ visible: true }).first().click();

  const toggle = page.getByTestId('cook-ingredient-sheet-toggle');
  await expect(toggle).toBeVisible();
  await expect(page.getByTestId('cook-ingredient-sheet')).not.toBeVisible();
  await toggle.click();
  await expect(page.getByTestId('cook-ingredient-sheet')).toBeVisible();
});
