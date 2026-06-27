# components/

React components, grouped by domain.

- `ui/` — generic, reusable UI (toggles, dialogs, toast, context providers).
- `ui/brut/` — the **brutalist design system** that ships as the default look (GridScaffold, Ticket, Wayfinder, TabularNumeral). Came out of the design contest; see `docs/design-history/`.
- `recipes/` — recipe-specific UI (RecipeCard, RecipeForm, CookMode, FilterPanel, ingredient/step rows).
- `motion/` — animation components (view transitions, celebrations, seasonal touches).
- `onboarding/` — first-run tour (Spotlight, TourTooltip, steps).
- `auth/`, `settings/` — login form, settings views.

Imports use the `@/components/...` alias. Components are client/server per Next.js App Router rules.
