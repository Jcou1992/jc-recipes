# Graph Report - .  (2026-04-19)

## Corpus Check
- Corpus is ~24,256 words - fits in a single context window. You may not need a graph.

## Summary
- 199 nodes · 207 edges · 44 communities detected
- Extraction: 74% EXTRACTED · 26% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_E2E Test Flows|E2E Test Flows]]
- [[_COMMUNITY_App Routes|App Routes]]
- [[_COMMUNITY_Core UI Components|Core UI Components]]
- [[_COMMUNITY_Bulk Actions Module|Bulk Actions Module]]
- [[_COMMUNITY_Recipe CRUD Actions|Recipe CRUD Actions]]
- [[_COMMUNITY_Recipe Form|Recipe Form]]
- [[_COMMUNITY_Markdown Import|Markdown Import]]
- [[_COMMUNITY_Recipe List & Filtering|Recipe List & Filtering]]
- [[_COMMUNITY_Recipe Detail View|Recipe Detail View]]
- [[_COMMUNITY_Bulk Tag Dialog|Bulk Tag Dialog]]
- [[_COMMUNITY_Auth Flow|Auth Flow]]
- [[_COMMUNITY_Bulk Operations|Bulk Operations]]
- [[_COMMUNITY_Markdown Export|Markdown Export]]
- [[_COMMUNITY_Toast & Delete|Toast & Delete]]
- [[_COMMUNITY_Markdown Parser|Markdown Parser]]
- [[_COMMUNITY_Middleware Layer|Middleware Layer]]
- [[_COMMUNITY_Root Layout|Root Layout]]
- [[_COMMUNITY_Root Page|Root Page]]
- [[_COMMUNITY_Print Auto-Trigger|Print Auto-Trigger]]
- [[_COMMUNITY_Print Page|Print Page]]
- [[_COMMUNITY_Auth Layout|Auth Layout]]
- [[_COMMUNITY_Login Page|Login Page]]
- [[_COMMUNITY_App Providers|App Providers]]
- [[_COMMUNITY_Ingredient Row|Ingredient Row]]
- [[_COMMUNITY_Unsaved Changes Guard|Unsaved Changes Guard]]
- [[_COMMUNITY_Auth Middleware|Auth Middleware]]
- [[_COMMUNITY_Print View|Print View]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Jest Config|Jest Config]]
- [[_COMMUNITY_Next.js Types|Next.js Types]]
- [[_COMMUNITY_Playwright Config|Playwright Config]]
- [[_COMMUNITY_PostCSS Config|PostCSS Config]]
- [[_COMMUNITY_Recipe Types|Recipe Types]]
- [[_COMMUNITY_Global Types|Global Types]]
- [[_COMMUNITY_Recipe List Page|Recipe List Page]]
- [[_COMMUNITY_Auth E2E Tests|Auth E2E Tests]]
- [[_COMMUNITY_Test Global Setup|Test Global Setup]]
- [[_COMMUNITY_Confirm Dialog|Confirm Dialog]]
- [[_COMMUNITY_Toast Container|Toast Container]]
- [[_COMMUNITY_Login Form|Login Form]]
- [[_COMMUNITY_Recipe Card|Recipe Card]]
- [[_COMMUNITY_Parser Unit Tests|Parser Unit Tests]]
- [[_COMMUNITY_New Recipe Page|New Recipe Page]]
- [[_COMMUNITY_Cook Page|Cook Page]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 12 edges
2. `goTo()` - 10 edges
3. `Recipe interface` - 8 edges
4. `RecipeListClient (search, filter, sort, select mode)` - 7 edges
5. `RecipeDetailClient (scaler, unit conversion, cook mode link)` - 5 edges
6. `DeleteRecipeButton component` - 5 edges
7. `parseRecipeMarkdown utility` - 5 edges
8. `E2E recipes CRUD tests` - 5 edges
9. `generateMetadata()` - 4 edges
10. `bulkDuplicateRecipes()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Data model documentation (recipes table schema, RLS)` --references--> `Recipe interface`  [INFERRED]
  docs/data-model.md → types/recipe.ts
- `Phase 3 spec: recipe hero photos (Supabase Storage, Canvas compression)` --rationale_for--> `Recipe interface`  [INFERRED]
  docs/superpowers/specs/2026-04-13-phase3-photos-design.md → types/recipe.ts
- `Phase 2 spec: cooking companion design rationale` --rationale_for--> `RecipeListClient (search, filter, sort, select mode)`  [INFERRED]
  docs/superpowers/specs/2026-04-12-phase2-cooking-companion-design.md → components/recipes/RecipeListClient.tsx
- `Phase 2 spec: cooking companion design rationale` --rationale_for--> `CookMode client component (step timer, scaler, unit toggle)`  [INFERRED]
  docs/superpowers/specs/2026-04-12-phase2-cooking-companion-design.md → components/recipes/CookMode.tsx
- `Data model documentation (recipes table schema, RLS)` --rationale_for--> `Supabase server client factory (createClient with cookie store)`  [INFERRED]
  docs/data-model.md → lib/supabase/server.ts

## Hyperedges (group relationships)
- **All server actions share session-check + redirect auth pattern** — action_create_recipe, action_update_recipe, action_delete_recipe, action_bulk_delete, action_bulk_duplicate, action_bulk_tags [INFERRED 0.95]
- **Markdown import/export roundtrip (parse + export utilities)** — parse_markdown_util, export_recipes, markdown_import [INFERRED 0.80]

## Communities

### Community 0 - "E2E Test Flows"
Cohesion: 0.13
Nodes (10): createQuickRecipe(), goToList(), signIn(), goTo(), onTouchEnd(), signIn(), createTestRecipe(), signIn() (+2 more)

### Community 1 - "App Routes"
Cohesion: 0.14
Nodes (11): login(), logout(), AppLayout(), CookPage(), generateMetadata(), handleUpdate(), get(), createRecipe() (+3 more)

### Community 2 - "Core UI Components"
Cohesion: 0.19
Nodes (17): AppProviders wrapper (ToastProvider + ToastContainer), BulkActionBar component, ConfirmDialog UI component, CookMode client component (step timer, scaler, unit toggle), deleteRecipe server action, DeleteRecipeButton component, IngredientRow form component, Phase 2 spec: cooking companion design rationale (+9 more)

### Community 3 - "Bulk Actions Module"
Cohesion: 0.15
Nodes (12): bulkDeleteRecipes(), bulkDuplicateRecipes(), bulkUpdateTags(), overLimit(), handleDelete(), handleDuplicate(), recipeToMarkdown export utility, Unit tests for parseRecipeMarkdown (+4 more)

### Community 4 - "Recipe CRUD Actions"
Cohesion: 0.18
Nodes (13): createRecipe server action, updateRecipe server action, Data model documentation (recipes table schema, RLS), EditRecipePage server component, Phase 3 spec: recipe hero photos (Supabase Storage, Canvas compression), RecipeDetailPage server component, Ingredient interface, RecipePayload type (Omit auto-fields) (+5 more)

### Community 5 - "Recipe Form"
Cohesion: 0.2
Nodes (0): 

### Community 6 - "Markdown Import"
Cohesion: 0.31
Nodes (8): MarkdownImport component, esc(), inline(), markdownToHtml(), handleImport(), parsedToInitial(), parseRecipeMarkdown utility, E2E markdown import tests

### Community 7 - "Recipe List & Filtering"
Cohesion: 0.29
Nodes (3): toggleTag(), updateParams(), set()

### Community 8 - "Recipe Detail View"
Cohesion: 0.33
Nodes (2): formatAmount(), snapFraction()

### Community 9 - "Bulk Tag Dialog"
Cohesion: 0.33
Nodes (2): handleClose(), reset()

### Community 10 - "Auth Flow"
Cohesion: 0.43
Nodes (7): auth server actions (login, logout), Auth layout (Next.js route group), LoginForm client component, Login page (Next.js server component), Supabase server client (createClient), E2E auth tests, Playwright global setup (auth session bootstrap)

### Community 11 - "Bulk Operations"
Cohesion: 0.38
Nodes (7): bulkDeleteRecipes server action, bulkDuplicateRecipes server action, bulkUpdateTags server action, deleteRecipe server action, BulkActionBar component (delete/duplicate/tag selected recipes), BulkTagDialog component (add/remove tags on many recipes), BulkActionResult interface

### Community 12 - "Markdown Export"
Cohesion: 0.53
Nodes (5): handleExportMarkdown(), formatAmount(), recipesToMarkdown(), recipeToMarkdown(), triggerDownload()

### Community 13 - "Toast & Delete"
Cohesion: 0.4
Nodes (2): DeleteRecipeButton(), useToast()

### Community 14 - "Markdown Parser"
Cohesion: 0.8
Nodes (4): parseIngredient(), parseRecipeMarkdown(), parseStepTimer(), parseTimeToMinutes()

### Community 15 - "Middleware Layer"
Cohesion: 0.5
Nodes (2): middleware(), updateSession()

### Community 16 - "Root Layout"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Root Page"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Print Auto-Trigger"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Print Page"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Auth Layout"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Login Page"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "App Providers"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Ingredient Row"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Unsaved Changes Guard"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Auth Middleware"
Cohesion: 1.0
Nodes (2): Next.js middleware (auth routing via cookie-check), Supabase updateSession middleware helper

### Community 26 - "Print View"
Cohesion: 1.0
Nodes (2): PrintAutoTrigger client component, PrintPage server component

### Community 27 - "Next.js Config"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Jest Config"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Next.js Types"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Playwright Config"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "PostCSS Config"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Recipe Types"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Global Types"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Recipe List Page"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Auth E2E Tests"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Test Global Setup"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Confirm Dialog"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Toast Container"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Login Form"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Recipe Card"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Parser Unit Tests"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "New Recipe Page"
Cohesion: 1.0
Nodes (1): NewRecipePage server component

### Community 43 - "Cook Page"
Cohesion: 1.0
Nodes (1): CookPage server component

## Knowledge Gaps
- **18 isolated node(s):** `Ingredient interface`, `Step interface`, `Next.js middleware (auth routing via cookie-check)`, `Supabase updateSession middleware helper`, `RecipesPage server component (fetches all recipes)` (+13 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Root Layout`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Root Page`** (2 nodes): `page.tsx`, `RootPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Print Auto-Trigger`** (2 nodes): `PrintAutoTrigger.tsx`, `PrintAutoTrigger()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Print Page`** (2 nodes): `page.tsx`, `formatAmount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Layout`** (2 nodes): `layout.tsx`, `AuthLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Page`** (2 nodes): `page.tsx`, `LoginPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `App Providers`** (2 nodes): `AppProviders()`, `AppProviders.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Ingredient Row`** (2 nodes): `IngredientRow.tsx`, `set()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Unsaved Changes Guard`** (2 nodes): `useUnsavedChanges.ts`, `useUnsavedChanges()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth Middleware`** (2 nodes): `Next.js middleware (auth routing via cookie-check)`, `Supabase updateSession middleware helper`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Print View`** (2 nodes): `PrintAutoTrigger client component`, `PrintPage server component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Config`** (1 nodes): `next.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Jest Config`** (1 nodes): `jest.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Next.js Types`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Playwright Config`** (1 nodes): `playwright.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `PostCSS Config`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Recipe Types`** (1 nodes): `recipe.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Global Types`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Recipe List Page`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Auth E2E Tests`** (1 nodes): `auth.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Test Global Setup`** (1 nodes): `global.setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Confirm Dialog`** (1 nodes): `ConfirmDialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Toast Container`** (1 nodes): `ToastContainer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Login Form`** (1 nodes): `LoginForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Recipe Card`** (1 nodes): `RecipeCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Parser Unit Tests`** (1 nodes): `parse-recipe-markdown.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `New Recipe Page`** (1 nodes): `NewRecipePage server component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Cook Page`** (1 nodes): `CookPage server component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `App Routes` to `Bulk Actions Module`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `get()` connect `App Routes` to `E2E Test Flows`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `createClient()` (e.g. with `AppLayout()` and `generateMetadata()`) actually correct?**
  _`createClient()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `goTo()` (e.g. with `signIn()` and `signIn()`) actually correct?**
  _`goTo()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `Recipe interface` (e.g. with `Data model documentation (recipes table schema, RLS)` and `Phase 3 spec: recipe hero photos (Supabase Storage, Canvas compression)`) actually correct?**
  _`Recipe interface` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `RecipeListClient (search, filter, sort, select mode)` (e.g. with `E2E recipes CRUD tests` and `Phase 2 spec: cooking companion design rationale`) actually correct?**
  _`RecipeListClient (search, filter, sort, select mode)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `RecipeDetailClient (scaler, unit conversion, cook mode link)` (e.g. with `E2E recipes CRUD tests` and `DeleteRecipeButton component`) actually correct?**
  _`RecipeDetailClient (scaler, unit conversion, cook mode link)` has 2 INFERRED edges - model-reasoned connections that need verification._