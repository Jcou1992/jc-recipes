# lib/

Shared, framework-light logic. Unit-tested in co-located `__tests__/`.

- `macros/` — nutrition + unit math (`unit-to-grams`, `unit-basis`, `compute`, `match`, `safe-compute`).
- `supabase/` — `server.ts` (`createClient()` — the app's god node) and `middleware.ts` (`updateSession`, cookie-presence routing).
- `utils/` — export (markdown/pdf), `parse-recipe-markdown`, `scaling`, `format-servings`, etc.
- `brut/` — brutalist helpers (`cooked-age`, `ref-codes`, shortcut discovery).
- `motion/` — `haptic`, `view-transition`, motion tokens.
- `hooks/` — `useFocusTrap`, `useKeyboardShortcut`, `useUnsavedChanges`.
- Root files — `i18n*`, `preference-cookies`, `validate-recipe`, `bulk-recipes-tags`, `flags`.

**Shared with `mcp/`:** `validate-recipe.ts` and `bulk-recipes-tags.ts` are imported by the MCP
Worker (`mcp/tsconfig.json` + `mcp/wrangler.jsonc`). Moving either requires updating those.
