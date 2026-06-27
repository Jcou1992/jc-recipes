# tests/

End-to-end tests (Playwright). Unit tests live co-located with source under `**/__tests__/`.

- `e2e/*.spec.ts` — user-flow tests (auth, recipe CRUD, bulk ops, macros, onboarding, markdown import).
- `e2e/helpers.ts` — exports `seedRecipe()` (Supabase JS API, ~200ms). Prefer this over filling `/recipes/new` by hand; the QA gate enforces it.
- `e2e/global.setup.ts` — writes auth `storageState` to `e2e/.auth/user.json`; non-auth projects reuse it.

**Do not move** — `playwright.config.ts` pins `testDir: './tests/e2e'` and the auth file path, and
`.test-gate/baseline.json` records spec paths. Config: 60s timeout, fully parallel, projects split
Desktop Chrome / Mobile Safari / Mobile Chrome by tag.
