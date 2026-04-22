/**
 * Filter UX refactor — TDD red-first spec.
 *
 * Defines the contract for the upcoming filter surface:
 *   - Desktop: in-page popover anchored below the Filter button
 *     (outside-click / Esc / Done dismisses; sort is pill-based, not <select>)
 *   - Mobile:  bottom sheet shell (unchanged content, no drag handle)
 *   - Active-tag chips: click-to-remove, no X icon inside
 *   - Tag search input: X clear button when non-empty
 *
 * These tests will FAIL until the implementation agent lands:
 *   data-testid="filter-popover"       (desktop popover wrapper)
 *   data-testid="filter-sheet"         (mobile sheet wrapper)
 *   data-testid="tag-search-clear"     (tag-search X clear button)
 *   data-testid="sort-option-{key}"    as buttons (not <option>) inside popover/sheet
 *   Chip markup: click-anywhere-to-remove, no <svg> X child
 *   Mobile sheet: no top drag-handle pill (.w-10.h-1.rounded-full)
 */
import { test, expect } from '@playwright/test';
import { seedRecipe, deleteSeededRecipes, uniqueName } from './helpers';

test.describe.serial('filter UX', () => {
  const namePrefix = `FilterUX-${Date.now()}`;
  let vegTag = '';

  test.beforeAll(async () => {
    // Worker-unique tag so parallel runs don't collide on tag-filter state.
    vegTag = `vegfx${Date.now()}`;
    await Promise.all([
      seedRecipe({
        name: uniqueName(`${namePrefix}-Pasta`),
        tags: [vegTag, 'italian'],
        prep_time: 10,
        cook_time: 20,
        ingredients: [{ amount: 1, unit: null, name: 'tomato' }],
      }),
      seedRecipe({
        name: uniqueName(`${namePrefix}-Curry`),
        tags: ['indian', 'spicy'],
        prep_time: 15,
        cook_time: 45,
        ingredients: [{ amount: 1, unit: null, name: 'chicken' }],
      }),
      seedRecipe({
        name: uniqueName(`${namePrefix}-Soup`),
        tags: ['japanese', vegTag],
        prep_time: 5,
        cook_time: 10,
        ingredients: [{ amount: 1, unit: null, name: 'miso' }],
      }),
    ]);
  });

  test.afterAll(async () => {
    await deleteSeededRecipes(`${namePrefix}%`);
  });

  // ── Desktop popover ─────────────────────────────────────────────────────────

  test('desktop: filter button opens popover with sort + tag sections @smoke', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'desktop popover test');
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('filter-desktop-btn').click();

    // Popover wrapper visible (new testid supplied by implementation).
    const popover = page.getByTestId('filter-popover');
    await expect(popover).toBeVisible();

    // Sort section: pill buttons, not <select><option>. Scope inside popover
    // because the mobile sheet also mounts a FilterPanel with the same testids.
    await expect(popover.getByTestId('sort-option-newest')).toBeVisible();
    await expect(popover.getByTestId('sort-option-az')).toBeVisible();

    // Tag pill visible inside the popover.
    await expect(popover.getByTestId(`tag-filter-${vegTag}`)).toBeVisible();
  });

  test('desktop: clicking outside popover closes it @regression', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'desktop popover test');
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('filter-desktop-btn').click();
    await expect(page.getByTestId('filter-popover')).toBeVisible();

    // Click far from the popover.
    await page.mouse.click(10, 10);
    await expect(page.getByTestId('filter-popover')).not.toBeVisible();
  });

  test('desktop: Escape closes popover @regression', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'desktop popover test');
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('filter-desktop-btn').click();
    await expect(page.getByTestId('filter-popover')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByTestId('filter-popover')).not.toBeVisible();
  });

  test('desktop: Done button closes popover @regression', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'desktop popover test');
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('filter-desktop-btn').click();
    const popover = page.getByTestId('filter-popover');
    await expect(popover).toBeVisible();

    await popover.getByRole('button', { name: 'Done' }).click();
    await expect(popover).not.toBeVisible();
  });

  test('desktop: sort change in popover updates URL @regression', async ({ page, isMobile }) => {
    test.skip(!!isMobile, 'desktop popover test');
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('filter-desktop-btn').click();
    await page.getByTestId('filter-popover').getByTestId('sort-option-az').click();

    // URL reflects sort=az (startTransition → poll rather than waitForURL).
    await expect(page).toHaveURL(/sort=az/, { timeout: 10_000 });
  });

  // ── Active-tag chip removal (desktop + mobile share testid) ─────────────────

  test('active-tag chip: clicking chip removes tag, no X icon inside @regression', async ({ page, isMobile }) => {
    await page.goto(`/recipes?tags=${vegTag}`);
    await page.waitForLoadState('networkidle');

    // The active-tag strip chip is the one that's visible (mobile horizontal-scroll
    // or desktop wrap strip) — NOT the chip inside the collapsed FilterPanel.
    // Find the first visible chip for this tag.
    const chips = page.getByTestId(`tag-filter-${vegTag}`);
    const chip = chips.filter({ hasNot: page.locator('[aria-pressed="false"]') }).first();
    await expect(chip).toBeVisible();

    // Chip must NOT contain an <svg> X icon (user decision: remove the X).
    expect(await chip.locator('svg').count()).toBe(0);

    // Clicking the chip anywhere removes the tag.
    await chip.click();
    await expect(page).not.toHaveURL(new RegExp(`tags=${vegTag}`), { timeout: 10_000 });
    // Silence unused var warning when running on desktop projects.
    void isMobile;
  });

  // ── Mobile sheet: no drag handle ────────────────────────────────────────────

  test('mobile sheet has no drag handle @mobile', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only test');
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('filter-mobile-btn').click();
    const sheet = page.getByTestId('filter-sheet');
    await expect(sheet).toBeVisible();

    // Drag handle pill was rendered as .w-10.h-1.rounded-full — must be gone.
    const handle = sheet.locator('.w-10.h-1.rounded-full');
    expect(await handle.count()).toBe(0);
  });

  // ── Tag search X clear button (desktop + mobile) ────────────────────────────

  test('tag search X clear button appears when text present @regression', async ({ page, isMobile }) => {
    await page.goto('/recipes');
    await page.waitForLoadState('networkidle');

    const openBtn = isMobile ? 'filter-mobile-btn' : 'filter-desktop-btn';
    const surfaceTestId = isMobile ? 'filter-sheet' : 'filter-popover';
    await page.getByTestId(openBtn).click();

    const surface = page.getByTestId(surfaceTestId);
    await expect(surface).toBeVisible();

    const input = surface.getByTestId('tag-search');
    await expect(input).toBeVisible();
    await input.fill('veg');

    const clearBtn = surface.getByTestId('tag-search-clear');
    await expect(clearBtn).toBeVisible();

    await clearBtn.click();
    await expect(input).toHaveValue('');
    await expect(clearBtn).not.toBeVisible();
  });
});
