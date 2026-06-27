# scripts/

Node tooling (`.mjs`). **Do not relocate** — these paths are hard-wired into `.githooks/`,
`.github/workflows/`, and `package.json`.

- `test-gate.mjs` — QA optimization gate; runs on every commit (blocking). `--bootstrap` regenerates `.test-gate/baseline.json`.
- `hot-token-lint.mjs` — brut design governance (`--hot` token density). `ALLOWLIST` + `ROUTE_ROOTS` reference `styles/` and `app/`.
- `seed-users.mjs` — seeds the three Supabase users (see `docs/runbook-seed-users.md`).
- `gen-icons.mjs` — generates PWA icons into `public/`.

Run via npm scripts: `test:gate`, `test:gate:bootstrap`, `lint:hot`, `seed:users`.
