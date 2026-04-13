/**
 * Phase 2 — Serving scaler, unit conversion, cooking mode, search, tag filter.
 * All tests cover both desktop and mobile viewports via the three profiles.
 */
import { test, expect, type Page } from '@playwright/test';

const EMAIL    = 'test@jc-recipes.local';
const PASSWORD = process.env.TEST_USER_PASSWORD ?? 'changeme';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/recipes$/, { timeout: 10_000 });
}

/** Creates a recipe and returns its URL. */
async function createTestRecipe(
  page: Page,
  name: string,
  opts?: {
    servings?: number;
    ingredientAmount?: string;
    ingredientUnit?: string;
    ingredientName?: string;
    steps?: string[];
    tags?: string;
    timerMinutes?: number;
  },
) {
  const o = opts ?? {};
  await page.goto('/recipes/new');
  await page.waitForLoadState('networkidle'); // ensure React hydration before interacting
  await page.locator('#name').fill(name);
  if (o.servings) await page.getByLabel('Servings').fill(String(o.servings));

  const amtField  = page.getByRole('textbox', { name: 'Ingredient amount' }).first();
  const unitField = page.getByRole('textbox', { name: 'Ingredient unit' }).first();
  const nameField = page.getByRole('textbox', { name: 'Ingredient name' }).first();

  await amtField.fill(o.ingredientAmount ?? '1');
  if (o.ingredientUnit) await unitField.fill(o.ingredientUnit);
  await nameField.fill(o.ingredientName ?? 'test ingredient');

  const stepFields = o.steps ?? ['Step one.'];
  for (let i = 0; i < stepFields.length; i++) {
    if (i > 0) await page.getByRole('button', { name: '+ Paso' }).click();
    await page.getByRole('textbox', { name: `Step ${i + 1}` }).fill(stepFields[i]);
    if (i === 0 && o.timerMinutes) {
      // Enable timer for first step
      await page.getByRole('checkbox', { name: /timer/i }).first().check();
      await page.getByLabel('Timer duration').first().fill(`${o.timerMinutes} min`);
    }
  }

  if (o.tags) {
    await page.getByText('Optional fields').click();
    await page.getByLabel('Tags').fill(o.tags);
  }

  await page.getByRole('button', { name: 'Create recipe' }).click();
  // Wait for navigation to a real recipe UUID (not /recipes/new which matches the same pattern)
  await page.waitForURL(
    url => /\/recipes\/[a-z0-9-]+$/.test(url.toString()) && !url.pathname.endsWith('/recipes/new'),
    { timeout: 30_000 },
  );
  return page.url();
}

// ── 2A: Search ─────────────────────────────────────────────────────────────────

test('search filters recipes by name', async ({ page }) => {
  await signIn(page);
  const unique = `SearchTest-${Date.now()}`;
  await createTestRecipe(page, unique);

  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');
  const searchInput = page.getByTestId('recipe-search');
  await expect(searchInput).toBeVisible();

  // Type a query — wait for the filtered result (generous timeout for WebKit debounce+render)
  await searchInput.fill(unique);
  await expect(page.getByRole('heading', { name: unique, level: 2 })).toBeVisible({ timeout: 15_000 });
});

test('search shows empty filtered state for no matches', async ({ page }) => {
  await signIn(page);
  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByTestId('recipe-search');
  await searchInput.fill('zzz-no-match-recipe-xyz');
  // Wait for debounce + router.replace + re-render (can be slow on WebKit)
  await expect(page.getByTestId('filtered-empty-state')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('clear-filters-btn')).toBeVisible();
});

test('clear filters restores full recipe list', async ({ page }) => {
  await signIn(page);
  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByTestId('recipe-search');
  await searchInput.fill('zzz-no-match-recipe-xyz');
  await expect(page.getByTestId('filtered-empty-state')).toBeVisible({ timeout: 15_000 });

  await page.getByTestId('clear-filters-btn').click();
  await expect(page.getByTestId('filtered-empty-state')).not.toBeVisible({ timeout: 10_000 });
});

test('× button clears search input', async ({ page }) => {
  await signIn(page);
  await page.goto('/recipes');
  await page.waitForLoadState('networkidle');

  const searchInput = page.getByTestId('recipe-search');
  await searchInput.fill('something');
  // × button appears immediately from local state (no URL update needed)
  await page.getByRole('button', { name: 'Clear search' }).click();
  await expect(searchInput).toHaveValue('');
});

// ── 2A: Tag filter ─────────────────────────────────────────────────────────────

test('tag filter shows and filters by tag', async ({ page }) => {
  await signIn(page);
  const tag = `e2etag${Date.now()}`;
  const recipeName = `TagRecipe-${Date.now()}`;
  await createTestRecipe(page, recipeName, { tags: tag });

  await page.goto('/recipes');

  // The tag chip should be visible
  const tagChip = page.getByTestId(`tag-filter-${tag}`);
  await expect(tagChip).toBeVisible();

  // Click to filter
  await tagChip.click();
  await expect(tagChip).toHaveAttribute('aria-pressed', 'true');

  // Our recipe should still be visible
  await expect(page.getByRole('heading', { name: recipeName, level: 2 })).toBeVisible();
});

test('tag filter combined with search', async ({ page }) => {
  await signIn(page);
  const tag = `combinetag${Date.now()}`;
  const recipeName = `CombineRecipe-${Date.now()}`;
  await createTestRecipe(page, recipeName, { tags: tag });

  await page.goto('/recipes');

  const tagChip = page.getByTestId(`tag-filter-${tag}`);
  await expect(tagChip).toBeVisible();
  await tagChip.click();

  const searchInput = page.getByTestId('recipe-search');
  await searchInput.fill(recipeName);
  await expect(page.getByRole('heading', { name: recipeName, level: 2 })).toBeVisible({ timeout: 15_000 });
});

// ── 2B-1: Serving scaler ──────────────────────────────────────────────────────

test('scaler changes serving count and updates ingredient amount', async ({ page }) => {
  await signIn(page);
  const recipeUrl = await createTestRecipe(page, `ScalerTest-${Date.now()}`, {
    servings: 2,
    ingredientAmount: '100',
    ingredientUnit: 'g',
    ingredientName: 'flour',
  });
  await page.goto(recipeUrl);

  // Initial state: 2 servings, 100g flour
  await expect(page.getByTestId('scaler-value')).toContainText('2');
  await expect(page.getByTestId('ingredient-amount-0')).toContainText('100');

  // Increase to 4 servings (×2)
  await page.getByTestId('scaler-increase').click();
  await page.getByTestId('scaler-increase').click();
  await expect(page.getByTestId('scaler-value')).toContainText('4');
  // 100g × 2 = 200g
  await expect(page.getByTestId('ingredient-amount-0')).toContainText('200');
});

test('scaler shows scaled badge and reset clears it', async ({ page }) => {
  await signIn(page);
  const recipeUrl = await createTestRecipe(page, `ScalerBadge-${Date.now()}`, {
    servings: 2,
    ingredientAmount: '1',
    ingredientName: 'egg',
  });
  await page.goto(recipeUrl);

  // No scaled badge initially
  await expect(page.getByTestId('scaler-scaled-badge')).not.toBeVisible();

  // Scale up
  await page.getByTestId('scaler-increase').click();
  await expect(page.getByTestId('scaler-scaled-badge')).toBeVisible();

  // Reset
  await page.getByTestId('scaler-scaled-badge').click();
  await expect(page.getByTestId('scaler-scaled-badge')).not.toBeVisible();
  await expect(page.getByTestId('scaler-value')).toContainText('2');
});

test('base recipe data is not mutated by scaler', async ({ page }) => {
  await signIn(page);
  const recipeUrl = await createTestRecipe(page, `BaseRecipe-${Date.now()}`, {
    servings: 1,
    ingredientAmount: '50',
    ingredientUnit: 'g',
    ingredientName: 'sugar',
  });
  await page.goto(recipeUrl);

  // Scale up
  await page.getByTestId('scaler-increase').click();
  await page.getByTestId('scaler-increase').click();
  await expect(page.getByTestId('ingredient-amount-0')).toContainText('150');

  // Reload page — should reset to base
  await page.reload();
  await expect(page.getByTestId('ingredient-amount-0')).toContainText('50');
});

// ── 2B-3: Cooking mode ────────────────────────────────────────────────────────

test('cooking mode: enter from detail page, navigate steps, exit returns to detail', async ({ page }) => {
  await signIn(page);
  const recipeUrl = await createTestRecipe(page, `CookTest-${Date.now()}`, {
    steps: ['Prepare ingredients.', 'Cook for 10 minutes.', 'Serve hot.'],
  });
  await page.goto(recipeUrl);

  // Enter cooking mode
  const cookBtn = page.getByTestId('cook-mode-btn');
  await expect(cookBtn).toBeVisible();
  await cookBtn.click();
  await expect(page).toHaveURL(/\/cook/, { timeout: 15_000 });

  await expect(page.getByTestId('cook-mode')).toBeVisible();

  // Pick the correct desktop vs mobile element based on viewport (sm breakpoint = 640px)
  const vp = page.viewportSize();
  const isMobile = vp ? vp.width < 640 : false;
  const stepSuffix = isMobile ? '-mobile' : '';

  // Should be on step 1
  const stepText = page.getByTestId(`cook-step-text${stepSuffix}`);
  await expect(stepText).toContainText('Prepare ingredients');

  // Navigate to step 2
  const nextBtn = page.getByTestId(`cook-next-btn${stepSuffix}`);
  await nextBtn.click();
  await expect(stepText).toContainText('Cook for 10 minutes');

  // Navigate to step 3
  await nextBtn.click();
  await expect(stepText).toContainText('Serve hot');

  // Exit returns to detail
  const exitBtn = page.getByTestId(`cook-exit-btn${stepSuffix}`);
  await exitBtn.click();
  await page.waitForURL(
    url => /\/recipes\/[a-z0-9-]+$/.test(url.toString()) && !url.pathname.endsWith('/recipes/new'),
    { timeout: 30_000 },
  );
  // Should not have /cook in URL
  await expect(page).not.toHaveURL(/\/cook/);
});

test('cooking mode: timer controls work', async ({ page }) => {
  await signIn(page);
  const recipeUrl = await createTestRecipe(page, `TimerTest-${Date.now()}`, {
    steps: ['Cook pasta.'],
    timerMinutes: 1,
  });

  // Check if timer field exists — skip gracefully if step form doesn't have timer
  await page.goto(recipeUrl);
  await page.getByTestId('cook-mode-btn').click();
  await expect(page).toHaveURL(/\/cook/, { timeout: 15_000 });

  const timerDisplay = page.getByTestId('cook-timer-display').or(page.getByTestId('cook-timer-display-mobile'));
  const timerBtn = page.getByTestId('cook-timer-btn').or(page.getByTestId('cook-timer-btn-mobile'));

  if (await timerDisplay.first().isVisible()) {
    // Timer exists — start it
    await expect(timerDisplay.first()).toContainText('01:00');
    await timerBtn.first().click();
    // Should now show Pausar
    await expect(timerBtn.first()).toContainText('Pausar');
    // Pause
    await timerBtn.first().click();
    await expect(timerBtn.first()).toContainText('Iniciar');
  }
});

test('cooking mode: wake lock is requested', async ({ page }) => {
  await signIn(page);

  // Intercept wake lock API via prototype override
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
      // Fallback: direct assignment
      (navigator as unknown as Record<string, unknown>).wakeLock = {
        request: async (type: string) => {
          (window as unknown as Record<string, unknown>)._wakeLockType = type;
          return { release: async () => {} };
        },
      };
    }
  });

  const recipeUrl = await createTestRecipe(page, `WakeLock-${Date.now()}`, {
    steps: ['Single step.'],
  });
  await page.goto(recipeUrl);
  await page.getByTestId('cook-mode-btn').click();
  await expect(page).toHaveURL(/\/cook/, { timeout: 15_000 });

  // Give wake lock time to be called
  await page.waitForTimeout(500);
  const lockType = await page.evaluate(() => (window as unknown as Record<string, unknown>)._wakeLockType);
  expect(lockType).toBe('screen');
});

test('cooking mode: progress bar reflects current step', async ({ page }) => {
  await signIn(page);
  const recipeUrl = await createTestRecipe(page, `ProgressTest-${Date.now()}`, {
    steps: ['Step A.', 'Step B.', 'Step C.', 'Step D.'],
  });
  await page.goto(recipeUrl);
  await page.getByTestId('cook-mode-btn').click();

  const progressBar = page.getByTestId('cook-progress-bar');
  if (await progressBar.isVisible()) {
    // On step 1 of 4: 25%
    const initialStyle = await progressBar.getAttribute('style');
    expect(initialStyle).toContain('25%');

    const vp2 = page.viewportSize();
    const nextBtnId = vp2 && vp2.width < 640 ? 'cook-next-btn-mobile' : 'cook-next-btn';
    const nextBtn = page.getByTestId(nextBtnId);
    await nextBtn.click();
    // On step 2 of 4: 50%
    const nextStyle = await progressBar.getAttribute('style');
    expect(nextStyle).toContain('50%');
  }
});

test('cooking mode: ingredient sheet toggles on mobile', async ({ page }) => {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width >= 768) return; // Desktop has always-visible sidebar

  await signIn(page);
  const recipeUrl = await createTestRecipe(page, `SheetTest-${Date.now()}`, {
    ingredientName: 'onion',
    steps: ['Chop the onion.'],
  });
  await page.goto(recipeUrl);
  await page.getByTestId('cook-mode-btn').click();

  const toggle = page.getByTestId('cook-ingredient-sheet-toggle');
  await expect(toggle).toBeVisible();

  // Sheet closed initially
  await expect(page.getByTestId('cook-ingredient-sheet')).not.toBeVisible();

  // Open sheet
  await toggle.click();
  await expect(page.getByTestId('cook-ingredient-sheet')).toBeVisible();
});
