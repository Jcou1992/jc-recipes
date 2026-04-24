// Throwaway screenshot script: captures every route in dark + light themes,
// at desktop (1440x900) and mobile (390x844) viewports, with design-mode=brut
// cookie applied so the Brutalist-Raw-Luxe winner renders.
// Output goes under contest/winner/after-screenshots/{theme}/{viewport}/{slug}.png
//
// Usage: node scripts/contest-screenshots-brut.mjs
//   Expects a dev server already running on :3101 and TEST_USER_PASSWORD in env.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'http://localhost:3101';
const OUT  = path.resolve('contest/winner/after-screenshots');
const EMAIL = 'test@jc-recipes.local';
const PASSWORD = process.env.TEST_USER_PASSWORD;
const RECIPE_ID = process.env.RECIPE_ID || 'f1227c91-2ea3-462b-8a1f-465d6f078f2c';

if (!PASSWORD) {
  console.error('Set TEST_USER_PASSWORD in env.');
  process.exit(1);
}

const VIEWPORTS = [
  { key: 'desktop', width: 1440, height: 900 },
  { key: 'mobile',  width: 390,  height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
];

const ROUTES = [
  { slug: 'login',           path: '/login',                          auth: false },
  { slug: 'recipes',         path: '/recipes',                        auth: true  },
  { slug: 'recipes-new',     path: '/recipes/new',                    auth: true  },
  { slug: 'recipe-detail',   path: `/recipes/${RECIPE_ID}`,           auth: true  },
  { slug: 'recipe-edit',     path: `/recipes/${RECIPE_ID}/edit`,      auth: true  },
  { slug: 'recipe-cook',     path: `/recipes/${RECIPE_ID}/cook`,      auth: true  },
  { slug: 'recipes-print',   path: '/recipes/print',                  auth: true  },
  { slug: 'settings',        path: '/settings',                       auth: true  },
];

function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await Promise.all([
    page.waitForURL(/\/recipes$/, { timeout: 20_000 }),
    page.getByRole('button', { name: 'Sign in' }).click(),
  ]);
}

async function setCookies(context, theme) {
  // Cookie-based theme + design-mode persistence.
  // Theme cookie: see app/layout.tsx + lib/preference-cookies.ts
  // Design-mode cookie: see lib/brut/design-mode-cookie.ts + app/actions/design-mode.ts
  await context.addCookies([
    {
      name: 'preferred-theme',
      value: theme,
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
    },
    {
      name: 'design-mode',
      value: 'brut',
      domain: 'localhost',
      path: '/',
      sameSite: 'Lax',
    },
  ]);
}

const results = [];
const errors  = [];

for (const vp of VIEWPORTS) {
  for (const theme of ['dark', 'light']) {
    console.log(`\n=== ${vp.key} / ${theme} (brut) ===`);
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.deviceScaleFactor ?? 1,
      isMobile: vp.isMobile ?? false,
      hasTouch: vp.hasTouch ?? false,
    });

    const page = await context.newPage();

    // Sign in once per context so authenticated routes share session.
    // NOTE: the server's `login` action calls mirrorPrefsToCookies() which
    // overwrites any pre-set `preferred-theme` cookie with the DB value.
    // So we must apply theme + design-mode cookies AFTER login completes.
    try {
      await login(page);
    } catch (e) {
      errors.push({ viewport: vp.key, theme, route: '(login flow)', error: String(e).slice(0, 200) });
      console.error('login failed:', e);
      await browser.close();
      continue;
    }

    await setCookies(context, theme);

    for (const r of ROUTES) {
      const outDir = path.join(OUT, theme, vp.key);
      mkdirp(outDir);
      const file = path.join(outDir, `${r.slug}.png`);

      let p = page;
      let anonContext = null;
      try {
        if (!r.auth) {
          // Unauthenticated screenshot: brand-new cookie-less context so the
          // real authed session is untouched. (Clearing cookies on the main
          // context would log us out for the remaining routes.)
          anonContext = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: vp.deviceScaleFactor ?? 1,
            isMobile: vp.isMobile ?? false,
            hasTouch: vp.hasTouch ?? false,
          });
          await setCookies(anonContext, theme);
          p = await anonContext.newPage();
        }

        await p.goto(`${BASE}${r.path}`, { waitUntil: 'networkidle', timeout: 30_000 });
        // Small settle delay for animations (noren, shader, etc).
        await p.waitForTimeout(900);
        await p.screenshot({ path: file, fullPage: true });
        const sz = fs.statSync(file).size;
        results.push({ viewport: vp.key, theme, route: r.path, file, bytes: sz });
        console.log(`  ok  ${r.path.padEnd(40)} ${sz.toString().padStart(7)}B  ${file}`);
      } catch (e) {
        errors.push({ viewport: vp.key, theme, route: r.path, error: String(e).slice(0, 200) });
        console.error(`  ERR ${r.path}: ${e.message}`);
      } finally {
        if (anonContext) await anonContext.close();
      }
    }

    await browser.close();
  }
}

console.log('\n=== SUMMARY ===');
console.log(`captured: ${results.length}`);
console.log(`errors:   ${errors.length}`);
mkdirp(OUT);
fs.writeFileSync(
  path.join(OUT, '_manifest.json'),
  JSON.stringify({ designMode: 'brut', recipeId: RECIPE_ID, results, errors }, null, 2),
);
console.log(`manifest: ${path.join(OUT, '_manifest.json')}`);
