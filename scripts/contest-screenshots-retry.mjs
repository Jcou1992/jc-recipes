// Retry targeted routes that the main script missed or hit a dev-reload race.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3100';
const OUT  = path.resolve('contest/_analysis/current-state');
const EMAIL = 'test@jc-recipes.local';
const PASSWORD = process.env.TEST_USER_PASSWORD;
const RECIPE_ID = 'f1227c91-2ea3-462b-8a1f-465d6f078f2c';

const TARGETS = [
  { slug: 'recipes',     path: '/recipes',     theme: 'dark', viewport: { key: 'desktop', width: 1440, height: 900 } },
  { slug: 'recipes-new', path: '/recipes/new', theme: 'dark', viewport: { key: 'desktop', width: 1440, height: 900 } },
];

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/recipes$/, { timeout: 20_000 }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
}

async function setTheme(context, theme) {
  await context.addCookies([
    { name: 'preferred-theme', value: theme, domain: 'localhost', path: '/', sameSite: 'Lax' },
  ]);
}

for (const t of TARGETS) {
  console.log(`retry ${t.path} @ ${t.viewport.key}/${t.theme}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: t.viewport.width, height: t.viewport.height },
  });
  const page = await context.newPage();
  await login(page);
  await setTheme(context, t.theme);

  // Hard reload to force fresh render with the theme cookie in effect.
  await page.goto(`${BASE}/recipes`, { waitUntil: 'networkidle' });
  // Retry target up to 3 times to dodge dev-reload aborts.
  let ok = false, lastErr = null;
  for (let i = 0; i < 3 && !ok; i++) {
    try {
      await page.goto(`${BASE}${t.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(1500);
      const outDir = path.join(OUT, t.theme, t.viewport.key);
      fs.mkdirSync(outDir, { recursive: true });
      const file = path.join(outDir, `${t.slug}.png`);
      await page.screenshot({ path: file, fullPage: true });
      const sz = fs.statSync(file).size;
      console.log(`  ok attempt=${i+1} ${sz}B ${file}`);
      ok = true;
    } catch (e) {
      lastErr = e;
      console.log(`  fail attempt=${i+1}: ${e.message}`);
      await page.waitForTimeout(1500);
    }
  }
  if (!ok) console.error(`GIVE UP ${t.path}: ${lastErr?.message}`);
  await browser.close();
}
