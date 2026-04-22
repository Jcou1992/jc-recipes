import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';
import path from 'path';

config({ path: path.resolve(__dirname, '.env.local') });

const AUTH_FILE = 'tests/e2e/.auth/user.json';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : '50%',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    // Sign-in runs once; writes storageState that all other projects reuse.
    {
      name: 'setup',
      testMatch: /global\.setup\.ts$/,
    },

    // Auth spec owns the UI login flow — must NOT reuse storageState.
    {
      name: 'Auth (Desktop Chrome)',
      testMatch: /auth\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },

    // Mobile-viewport auth run — covers only @mobile-tagged auth tests
    // (login form layout at narrow widths).
    {
      name: 'Auth (Mobile Safari)',
      testMatch: /auth\.spec\.ts$/,
      grep: /@mobile/,
      use: { ...devices['iPhone 14'] },
    },

    // Desktop Chrome runs the full desktop suite — explicitly skips @mobile-only
    // and @cross-browser-only tests (those belong to dedicated mobile projects).
    {
      name: 'Desktop Chrome',
      testIgnore: /auth\.spec\.ts$/,
      grepInvert: /@mobile|@cross-browser/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },

    // Mobile Safari runs only tests tagged @mobile or @cross-browser.
    // WebKit is the only engine that catches Mobile-Safari-specific bugs.
    {
      name: 'Mobile Safari',
      testIgnore: /auth\.spec\.ts$/,
      grep: /@mobile|@cross-browser/,
      use: {
        ...devices['iPhone 14'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },

    // Mobile Chrome is Blink — same engine as Desktop Chrome. Opt-in only via
    // @cross-browser to catch mobile-Blink regressions without duplicating
    // identical engine coverage.
    {
      name: 'Mobile Chrome',
      testIgnore: /auth\.spec\.ts$/,
      grep: /@cross-browser/,
      use: {
        ...devices['Pixel 7'],
        storageState: AUTH_FILE,
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
