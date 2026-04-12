# Phase 1 - Base

## Execution order (do not skip or reorder steps)

1. Scaffold Next.js 15 project with Tailwind CSS v4 inside the existing repo
2. Install dependencies: @supabase/ssr @supabase/supabase-js playwright
3. Add .env.local to .gitignore before any other operation
4. Ask user for Supabase env vars - create .env.local
5. Create lib/supabase/client.ts, server.ts, middleware.ts
6. Run migration from docs/data-model.md against Supabase project
7. Create test user test@jc-recipes.local in Supabase dashboard - ask user to confirm before proceeding
8. Auth: login page, logout action, persistent session, middleware route protection
9. Protected layout at app/(app)/layout.tsx - redirect to login if no session
10. Recipe list page at app/(app)/recipes/page.tsx with empty state
11. Recipe create form at app/(app)/recipes/new/page.tsx
    - Required fields visible by default: name, ingredients, steps, servings
    - Optional fields collapsible: description, prep_time, cook_time, tags, notes
    - Ingredient rows: add/remove dynamically
    - Step rows: add/remove dynamically, optional timer field per step
12. Recipe detail view at app/(app)/recipes/[id]/page.tsx
13. Recipe edit form at app/(app)/recipes/[id]/edit/page.tsx - same structure as create
14. Recipe delete with confirmation dialog at app/(app)/recipes/[id]/page.tsx
15. Markdown import option at app/(app)/recipes/new/page.tsx
    - Two tabs: Manual (default) and Import from Markdown
    - Textarea for markdown input with real-time preview
    - Parser at lib/utils/parse-recipe-markdown.ts
    - Parsed result populates the manual form for review before saving
    - Supported markdown format documented in lib/utils/parse-recipe-markdown.ts
16. Write Playwright tests for all of the above
    - Auth: login, logout, redirect when not authenticated
    - CRUD: create, read, update, delete, empty state
    - Markdown import: paste markdown, verify form populated, save, verify stored correctly
    - Every test covers: happy path, empty state, error state, mobile layout
17. Run full Playwright suite across Desktop Chrome, Mobile Safari, Mobile Chrome
18. Fix until 100% green - zero failures
19. Overwrite CLAUDE.md with Phase 1 complete status
20. Report to user and await commit authorization

## File structure after Phase 1

```
jc-recipes/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── layout.tsx
│   │   └── recipes/
│   │       ├── page.tsx
│   │       ├── new/page.tsx
│   │       └── [id]/
│   │           ├── page.tsx
│   │           └── edit/page.tsx
│   └── layout.tsx
├── components/
│   ├── recipes/
│   │   ├── RecipeForm.tsx
│   │   ├── RecipeCard.tsx
│   │   ├── IngredientRow.tsx
│   │   ├── StepRow.tsx
│   │   └── MarkdownImport.tsx
│   └── ui/
│       └── ConfirmDialog.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   └── utils/
│       └── parse-recipe-markdown.ts
├── tests/e2e/
│   ├── auth.spec.ts
│   ├── recipes-crud.spec.ts
│   └── markdown-import.spec.ts
├── supabase/migrations/
│   └── 001_recipes.sql
├── docs/
├── CLAUDE.md
└── .env.local (never committed)
```

## Markdown parser spec (parse-recipe-markdown.ts)

Pure function. Input: markdown string. Output: Partial<Recipe>.

Supported format:
```
# Recipe Name
> Description (optional)
**Prep time:** 20 min
**Cook time:** 30 min
**Servings:** 4
## Ingredients
- 200g ingredient name
- 1 tbsp ingredient name
- 3 garlic cloves
## Steps
1. Step description [timer: 5min]
2. Another step
## Notes
Free text
## Tags
tag1, tag2, tag3
```

Parsing rules:
- Title: first H1
- Description: first blockquote if present
- Prep/cook time: bold key-value, parse to integer minutes. Handle: "20 min", "20 minutes", "1 hour", "1h 30min"
- Servings: bold key-value, parse to integer
- Ingredients: unordered list under Ingredients heading. Parse { amount, unit, name }. Handle: "200g name", "1 tbsp name", "3 name", "1/2 cup name"
- Steps: ordered list under Steps heading. Parse [timer: Xmin] to timer_seconds. Remove tag from content.
- Notes: all text under Notes heading
- Tags: comma-separated text under Tags heading into text[]
- Missing optional fields return undefined - never throw for missing fields

Unit tests required (not Playwright - use Jest or Vitest):
- Full recipe parses correctly
- Missing optional fields do not throw
- Malformed lines are skipped gracefully
- All ingredient formats parse correctly
- All time formats parse correctly to integer minutes
