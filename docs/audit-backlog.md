# Phase 1 - Requirements Backlog

Generated from docs/phase-1.md using MoSCoW prioritization.

---

## MUST — Core functionality, blocks other features

- [x] Next.js 15 + Tailwind v4 scaffold
- [x] @supabase/ssr + @supabase/supabase-js installed
- [x] .env.local in .gitignore
- [ ] Supabase env vars in .env.local ← **BLOCKED: awaiting credentials from user**
- [x] lib/supabase/server.ts, middleware.ts
- [x] supabase/migrations/001_recipes.sql (created, pending execution)
- [ ] Migration run against Supabase project ← **BLOCKED: awaiting credentials**
- [ ] Test user test@jc-recipes.local created ← **BLOCKED: awaiting credentials**
- [x] Login page at /login
- [x] Logout server action
- [x] Middleware: session refresh + route protection
- [x] Protected layout at app/(app)/layout.tsx
- [x] Recipe list page at /recipes with empty state
- [x] Recipe create form at /recipes/new
  - [x] Required fields visible: name, ingredients, steps, servings
  - [x] Optional fields collapsible: description, prep_time, cook_time, tags, notes
  - [x] Ingredient rows: add/remove dynamically
  - [x] Step rows: add/remove dynamically, optional timer field
- [x] Recipe detail view at /recipes/[id]
- [x] Recipe edit form at /recipes/[id]/edit
- [x] Recipe delete with confirmation dialog
- [x] Markdown import tab at /recipes/new
  - [x] Two tabs: Manual (default) + Import from Markdown
  - [x] Textarea with real-time preview
  - [x] Parser at lib/utils/parse-recipe-markdown.ts
  - [x] Parsed result populates manual form
- [x] Playwright tests written for auth, CRUD, markdown import
- [ ] Playwright tests GREEN on all three profiles ← **BLOCKED: awaiting credentials**

## SHOULD — Improves experience meaningfully

- [ ] Recipe search / filter by tag on list page
- [ ] Ingredient scaling (display-only, Phase 2)
- [ ] Cooking mode (Phase 2)

## COULD — Polish, nice to have

- [ ] Photo upload (Phase 3)
- [ ] Recipe duplication
- [ ] Export as markdown

## WON'T (this phase)

- [ ] Multi-user collaboration
- [ ] Social sharing
- [ ] Nutritional info
