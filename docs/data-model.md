# jc-recipes - Data Model

## Supabase migration

```sql
-- recipes table
create table recipes (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users not null,
  name          text not null,
  ingredients   jsonb not null default '[]',
  steps         jsonb not null default '[]',
  servings      integer not null default 1,
  description   text,
  prep_time     integer,
  cook_time     integer,
  tags          text[],
  notes         text,
  photos        text[],
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS
alter table recipes enable row level security;

create policy "Users access own recipes"
  on recipes for all
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger recipes_updated_at
  before update on recipes
  for each row execute function update_updated_at();
```

## Field reference

| Field       | Type      | Required | Notes |
|-------------|-----------|----------|-------|
| id          | uuid      | auto     | generated |
| user_id     | uuid      | auto     | from auth session |
| name        | text      | yes      | recipe title |
| ingredients | jsonb     | yes      | array of { amount, unit, name } |
| steps       | jsonb     | yes      | array of { order, content, timer_seconds? } |
| servings    | integer   | yes      | base serving count for scaler |
| description | text      | no       | short description shown in list view |
| prep_time   | integer   | no       | minutes |
| cook_time   | integer   | no       | minutes |
| tags        | text[]    | no       | for filtering |
| notes       | text      | no       | variations, tips, sourcing notes |
| photos      | text[]    | no       | Supabase Storage URLs (Phase 3) |

## Ingredient object shape
```json
{ "amount": 190, "unit": "g", "name": "sake" }
{ "amount": 2, "unit": "tbsp", "name": "aka miso" }
{ "amount": 3, "unit": null, "name": "garlic cloves" }
```
unit is nullable for whole/countable items.

## Step object shape
```json
{ "order": 1, "content": "Step description here.", "timer_seconds": null }
{ "order": 2, "content": "Reduce until 30% of original volume.", "timer_seconds": 720 }
```

## Environment variables required
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
Create .env.local in root. Never commit this file. Add to .gitignore before first commit.

## Test user
email: test@jc-recipes.local
password: set before Phase 1 starts, never commit

## Architecture decisions

| # | Decision | Reason |
|---|----------|--------|
| 1 | App Router only | Modern Next.js standard, aligns with Sakai web learning |
| 2 | Supabase SSR only, no client-side keys | Security |
| 3 | RLS on all tables | User data isolation, multi-user ready |
| 4 | Mobile-first CSS | Primary use context is kitchen on phone |
| 5 | Optional fields collapsible in create form | Reduce friction, encourage quick capture |
| 6 | Scaler is display-only | Never mutate base recipe data |
| 7 | jsonb for ingredients and steps | Flexible schema without extra tables |
| 8 | Markdown import maps to manual form | User reviews before saving, no blind imports |
