alter table recipes
  add column cooked_at    timestamptz null,
  add column cooked_count int         not null default 0;

create index recipes_cooked_at_idx
  on recipes (cooked_at desc)
  where cooked_at is not null;

comment on column recipes.cooked_at is
  'Timestamp the recipe was last marked cooked. Null = never cooked. Drives brut heat-decay rendering (R6).';

comment on column recipes.cooked_count is
  'Lifetime count of "I cooked this" stamps. Monotonically increases via recordCooked server action.';

-- Atomic stamp-and-increment. Returns void; RLS still applies because the
-- function is SECURITY INVOKER (default) and selects against `recipes` which
-- already has user_id-scoped policies.
create or replace function record_cooked(recipe_id uuid)
returns void
language sql
as $$
  update recipes
     set cooked_at    = now(),
         cooked_count = cooked_count + 1
   where id = recipe_id
     and user_id = auth.uid();
$$;

comment on function record_cooked(uuid) is
  'Atomic "I cooked this" stamp. Sets cooked_at=now() and increments cooked_count for a recipe owned by auth.uid(). Other-user recipes: 0 rows updated, no error.';
