# Graph Report - /Users/JC/Dev/jc-recipes  (2026-04-19)

## Corpus Check
- 51 files · ~24,315 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 143 nodes · 135 edges · 40 communities detected
- Extraction: 79% EXTRACTED · 21% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 12 edges
2. `goTo()` - 10 edges
3. `generateMetadata()` - 4 edges
4. `bulkDuplicateRecipes()` - 4 edges
5. `parseRecipeMarkdown()` - 4 edges
6. `updateRecipe()` - 3 edges
7. `overLimit()` - 3 edges
8. `bulkDeleteRecipes()` - 3 edges
9. `bulkUpdateTags()` - 3 edges
10. `login()` - 3 edges

## Surprising Connections (you probably didn't know these)
- `AppLayout()` --calls--> `createClient()`  [INFERRED]
  app/(app)/layout.tsx → lib/supabase/server.ts
- `CookPage()` --calls--> `createClient()`  [INFERRED]
  app/(app)/recipes/[id]/cook/page.tsx → lib/supabase/server.ts
- `createRecipe()` --calls--> `createClient()`  [INFERRED]
  app/actions/recipes.ts → lib/supabase/server.ts
- `deleteRecipe()` --calls--> `createClient()`  [INFERRED]
  app/actions/recipes.ts → lib/supabase/server.ts
- `bulkDeleteRecipes()` --calls--> `createClient()`  [INFERRED]
  app/actions/bulk-recipes.ts → lib/supabase/server.ts

## Hyperedges (group relationships)
- **All server actions share session-check + redirect auth pattern** — action_create_recipe, action_update_recipe, action_delete_recipe, action_bulk_delete, action_bulk_duplicate, action_bulk_tags [INFERRED 0.95]
- **Markdown import/export roundtrip (parse + export utilities)** — parse_markdown_util, export_recipes, markdown_import [INFERRED 0.80]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (10): createQuickRecipe(), goToList(), signIn(), goTo(), onTouchEnd(), signIn(), createTestRecipe(), signIn() (+2 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (11): login(), logout(), AppLayout(), CookPage(), generateMetadata(), handleUpdate(), get(), createRecipe() (+3 more)

### Community 2 - "Community 2"
Cohesion: 0.27
Nodes (6): bulkDeleteRecipes(), bulkDuplicateRecipes(), bulkUpdateTags(), overLimit(), handleDelete(), handleDuplicate()

### Community 3 - "Community 3"
Cohesion: 0.2
Nodes (0): 

### Community 4 - "Community 4"
Cohesion: 0.29
Nodes (3): toggleTag(), updateParams(), set()

### Community 5 - "Community 5"
Cohesion: 0.33
Nodes (2): formatAmount(), snapFraction()

### Community 6 - "Community 6"
Cohesion: 0.33
Nodes (2): handleClose(), reset()

### Community 7 - "Community 7"
Cohesion: 0.53
Nodes (5): handleExportMarkdown(), formatAmount(), recipesToMarkdown(), recipeToMarkdown(), triggerDownload()

### Community 8 - "Community 8"
Cohesion: 0.4
Nodes (2): DeleteRecipeButton(), useToast()

### Community 9 - "Community 9"
Cohesion: 0.8
Nodes (4): parseIngredient(), parseRecipeMarkdown(), parseStepTimer(), parseTimeToMinutes()

### Community 10 - "Community 10"
Cohesion: 0.5
Nodes (2): middleware(), updateSession()

### Community 11 - "Community 11"
Cohesion: 1.0
Nodes (3): esc(), inline(), markdownToHtml()

### Community 12 - "Community 12"
Cohesion: 1.0
Nodes (2): handleImport(), parsedToInitial()

### Community 13 - "Community 13"
Cohesion: 1.0
Nodes (0): 

### Community 14 - "Community 14"
Cohesion: 1.0
Nodes (0): 

### Community 15 - "Community 15"
Cohesion: 1.0
Nodes (0): 

### Community 16 - "Community 16"
Cohesion: 1.0
Nodes (0): 

### Community 17 - "Community 17"
Cohesion: 1.0
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 1.0
Nodes (0): 

### Community 19 - "Community 19"
Cohesion: 1.0
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Data model documentation (recipes table schema, RLS)

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): Phase 3 spec: recipe hero photos (Supabase Storage, Canvas compression)

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (1): Phase 2 spec: cooking companion design rationale

## Knowledge Gaps
- **3 isolated node(s):** `Data model documentation (recipes table schema, RLS)`, `Phase 3 spec: recipe hero photos (Supabase Storage, Canvas compression)`, `Phase 2 spec: cooking companion design rationale`
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 13`** (2 nodes): `layout.tsx`, `RootLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 14`** (2 nodes): `page.tsx`, `RootPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (2 nodes): `PrintAutoTrigger.tsx`, `PrintAutoTrigger()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 16`** (2 nodes): `page.tsx`, `formatAmount()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (2 nodes): `layout.tsx`, `AuthLayout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (2 nodes): `page.tsx`, `LoginPage()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (2 nodes): `AppProviders()`, `AppProviders.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 20`** (2 nodes): `IngredientRow.tsx`, `set()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (2 nodes): `useUnsavedChanges.ts`, `useUnsavedChanges()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `next.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `jest.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `playwright.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `postcss.config.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `recipe.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `global.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `auth.spec.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `global.setup.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `ConfirmDialog.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `ToastContainer.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `LoginForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `RecipeCard.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `parse-recipe-markdown.test.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `Data model documentation (recipes table schema, RLS)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `Phase 3 spec: recipe hero photos (Supabase Storage, Canvas compression)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (1 nodes): `Phase 2 spec: cooking companion design rationale`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient()` connect `Community 1` to `Community 2`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Are the 11 inferred relationships involving `createClient()` (e.g. with `AppLayout()` and `generateMetadata()`) actually correct?**
  _`createClient()` has 11 INFERRED edges - model-reasoned connections that need verification._
- **Are the 8 inferred relationships involving `goTo()` (e.g. with `signIn()` and `signIn()`) actually correct?**
  _`goTo()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Are the 2 inferred relationships involving `bulkDuplicateRecipes()` (e.g. with `createClient()` and `handleDuplicate()`) actually correct?**
  _`bulkDuplicateRecipes()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Data model documentation (recipes table schema, RLS)`, `Phase 3 spec: recipe hero photos (Supabase Storage, Canvas compression)`, `Phase 2 spec: cooking companion design rationale` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._