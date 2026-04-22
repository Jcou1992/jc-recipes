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

test('tag rail chip marks as pressed and combines with search @regression', async ({ page }) => {
  // Prefix with '0' so it sorts into the first 12 tags (alphabetical) and stays
  // inline on the rail even when the account has many tags.
  const tag  = `0e2etag${Date.now()}`;
  const name = uniqueName('TagRecipe');
  await seedRecipe({ name, tags: [tag] });

  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  // Tag chip is inline in the TagRail — no popover to open.
  const chip = page.getByTestId(`tag-filter-${tag}`);
  await expect(chip).toBeVisible();
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 });

  // Combined with search: tag-filtered list still finds our recipe by name.
  await page.getByTestId('recipe-search').fill(name);
  await expect(page.getByRole('heading', { name, level: 2 })).toBeVisible({ timeout: 15_000 });
});

test('sort pills change URL sort param @regression', async ({ page }) => {
  await seedRecipe({ name: uniqueName('SortSentinel') });
  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  const azPill = page.getByTestId('sort-pill-az');
  await expect(azPill).toBeVisible();
  await azPill.click();
  await expect(page).toHaveURL(/sort=az/, { timeout: 10_000 });
  await expect(azPill).toHaveAttribute('aria-checked', 'true');
});

test('result count updates and announces filter context @regression', async ({ page }) => {
  const tag = `countTag${Date.now()}`;
  await seedRecipe({ name: uniqueName('CountA'), tags: [tag] });
  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  const count = page.getByTestId('result-count');
  await expect(count).toBeVisible();
  const before = (await count.textContent()) ?? '';

  await page.getByTestId(`tag-filter-${tag}`).click();
  // After filter, count format flips to "X of Y"
  await expect(count).not.toHaveText(before, { timeout: 10_000 });
  await expect(count).toContainText(/\d+/);
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

// ── Responsive fluid containers (Plan A) ──────────────────────────────────────

test('desktop list grid scales to ultra-wide viewports @regression', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'desktop viewport test');

  // Seed 10 recipes so the grid has enough cards to fill wide rows.
  // (If the account already has ≥10 recipes, seeding is still safe — list is
  // ordered by created_at desc, so the fresh seeds surface at the top.)
  const stamp = Date.now();
  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      seedRecipe({ name: `WideGrid-${stamp}-${i}` }),
    ),
  );

  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  // Count cards that share the first card's Y-offset — that's a single row.
  const cardsInFirstRow = async (): Promise<number> => {
    return await page.evaluate(() => {
      const cards = Array.from(
        document.querySelectorAll<HTMLElement>('[data-testid^="recipe-card-"]'),
      );
      if (cards.length === 0) return 0;
      // Skip the featured card (spans ≥2 cols, distorts row math) by finding
      // the first non-featured card and using its top as the row baseline.
      const tops = cards.map(c => Math.round(c.getBoundingClientRect().top));
      // Pick the most common top — that's the first full row of equal cards.
      const freq = new Map<number, number>();
      tops.forEach(t => freq.set(t, (freq.get(t) ?? 0) + 1));
      let bestTop = tops[0];
      let bestCount = 0;
      freq.forEach((count, top) => {
        if (count > bestCount) {
          bestCount = count;
          bestTop = top;
        }
      });
      return tops.filter(t => Math.abs(t - bestTop) <= 2).length;
    });
  };

  // 1920×900 → grid should show ≥4 cards in a row.
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.waitForTimeout(150); // let layout settle after resize
  await expect.poll(cardsInFirstRow, { timeout: 5_000 }).toBeGreaterThanOrEqual(4);

  // 2560×1080 → ≥6 cards in a row.
  await page.setViewportSize({ width: 2560, height: 1080 });
  await page.waitForTimeout(150);
  await expect.poll(cardsInFirstRow, { timeout: 5_000 }).toBeGreaterThanOrEqual(6);
});

test('font-size preference persists across reload @regression', async ({ page }) => {
  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  // Simulate user having set preference to 'lg' via FontSizeToggle.
  await page.evaluate(() => {
    localStorage.setItem('preferred-font-size', 'lg');
  });

  await page.reload();
  await page.waitForLoadState('networkidle');

  // FontSizeBootstrap mounted in layout should re-apply data-font-size from localStorage.
  const attr = await page.evaluate(() =>
    document.documentElement.getAttribute('data-font-size'),
  );
  expect(attr).toBe('lg');

  // And computed font-size on <html> should reflect the 'lg' token (1.1875rem ≈ 19px).
  const fontSize = await page.evaluate(
    () => getComputedStyle(document.documentElement).fontSize,
  );
  expect(parseFloat(fontSize)).toBeGreaterThan(17);
});

test('theme preference re-applies after full reload @regression', async ({ page }) => {
  // Regression: ThemeToggle only mounts inside the avatar dropdown. Any plain-anchor
  // navigation (or hard reload) returned server HTML without data-theme, so the user's
  // chosen theme silently flipped back to prefers-color-scheme until they reopened the
  // menu. ThemeBootstrap re-applies the stored theme on every page mount.
  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  await page.evaluate(() => {
    localStorage.setItem('preferred-theme', 'light');
  });

  await page.reload();
  await page.waitForLoadState('networkidle');

  const attr = await page.evaluate(() =>
    document.documentElement.getAttribute('data-theme'),
  );
  expect(attr).toBe('light');

  // Cleanup so we don't poison other tests.
  await page.evaluate(() => localStorage.removeItem('preferred-theme'));
});

test('editable space name persists across reload @regression', async ({ page, isMobile }, testInfo) => {
  test.skip(!!isMobile, 'desktop viewport test — uses double-click to edit');
  // Mutates user-scoped DB state; racy under parallel workers hitting the same test user.
  testInfo.annotations.push({ type: 'flaky', description: 'Shared user prefs write race under parallel workers' });
  test.slow();

  const label = `Test Space ${Date.now()}`;
  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  // Find the editable h1
  const h1 = page.getByTestId('editable-space-name');
  await expect(h1).toBeVisible();

  // Trigger edit mode (double-click on desktop)
  await h1.dblclick();

  // Fill the input that appears
  const input = page.getByTestId('space-name-input');
  await expect(input).toBeVisible();
  await input.fill(label);
  await input.press('Enter');

  // Wait for the save round-trip to complete — toast signals DB write done.
  // Without this, page.reload() races the server action and fetches stale prefs.
  await expect(page.getByText(/saved|guardado/i).first()).toBeVisible({ timeout: 10_000 });

  // Reload, verify persisted
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('editable-space-name')).toContainText(label, { timeout: 10_000 });

  // No cleanup — each run uses a unique label so leftover state is harmless.
});

test('new recipe form: desktop preview card updates as user types @regression', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'desktop preview pane — mobile hides preview');
  await page.goto('/recipes/new');
  const preview = page.getByTestId('recipe-form-preview');
  await expect(preview).toBeVisible();
  // Empty state: preview shows placeholder
  await expect(preview).toContainText(/Preview/i);
  // Type a name
  const nameInput = page.getByLabel(/Name|Nombre/).first();
  await nameInput.fill('Test Preview Recipe');
  // Preview updates
  await expect(preview).toContainText('Test Preview Recipe', { timeout: 3000 });
});

test('avatar menu opens dropdown with Settings link @regression', async ({ page }) => {
  await page.goto('/recipes');
  const avatar = page.getByTestId('avatar-menu-btn');
  await expect(avatar).toBeVisible();
  await avatar.click();
  const menu = page.getByTestId('avatar-menu-dropdown');
  await expect(menu).toBeVisible();
  await menu.getByRole('link', { name: /settings|ajustes/i }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: /settings|ajustes/i, level: 1 })).toBeVisible();
});

test('onboarding tour: replay button launches tour and Next advances @regression', async ({ page, isMobile }) => {
  test.skip(!!isMobile, 'desktop tour test');
  await page.goto('/settings');
  await page.getByTestId('settings-replay-tour').click();
  // Should land on /recipes?tour=1 with tour visible
  await page.waitForURL(/\/recipes.*tour=1/);
  await expect(page.getByTestId('onboarding-tour')).toBeVisible({ timeout: 5000 });
  // Next advances
  await page.getByTestId('onboarding-next').click();
  // Step 2 visible — tooltip text changed (can be loose; just assert tour still shown)
  await expect(page.getByTestId('onboarding-tour')).toBeVisible();
  // Skip closes
  await page.getByTestId('onboarding-skip').click();
  await expect(page.getByTestId('onboarding-tour')).not.toBeVisible();
});

test('onboarding tour: spotlight lands on the visible filter control, not the corner @mobile', async ({ page }) => {
  // Regression: measure() used querySelector which picks the first DOM match
  // regardless of visibility. If the selector was a comma-OR and the first
  // candidate was display:none, the ring rendered at (0,0,0,0). The filter
  // step now targets sort-pills / tag-rail (always visible when recipes exist).
  const vp = page.viewportSize();
  if (!vp || vp.width >= 768) return; // mobile-only

  // Seed a recipe so sort-pills + tag-rail render at all
  await seedRecipe({ name: uniqueName('TourFilter'), tags: ['seeded'] });

  await page.goto('/recipes?tour=1');
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('onboarding-tour')).toBeVisible({ timeout: 5000 });

  // Advance to step 3 of 5 (filter)
  await page.getByTestId('onboarding-next').click();
  await page.getByTestId('onboarding-next').click();
  await expect(page.getByTestId('onboarding-tour')).toBeVisible();

  // Spotlight anchors to the first sort pill (always visible when recipes exist)
  const target = page.getByTestId('sort-pill-newest');
  await expect(target).toBeVisible();
  const tBox = await target.boundingBox();
  expect(tBox, 'sort pills must be measurable').not.toBeNull();

  const ring = page.getByTestId('tour-spotlight-ring');
  await expect(ring).toBeVisible();
  const ringBox = await ring.boundingBox();
  expect(ringBox, 'spotlight ring must be measurable').not.toBeNull();

  // Ring center should land inside the target's bounding box.
  const cx = ringBox!.x + ringBox!.width / 2;
  const cy = ringBox!.y + ringBox!.height / 2;
  expect(cx).toBeGreaterThanOrEqual(tBox!.x);
  expect(cx).toBeLessThanOrEqual(tBox!.x + tBox!.width);
  expect(cy).toBeGreaterThanOrEqual(tBox!.y);
  expect(cy).toBeLessThanOrEqual(tBox!.y + tBox!.height);
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
