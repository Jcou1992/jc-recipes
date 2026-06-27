-- Shared "team folder": any authenticated user can READ recipes flagged shared.
-- Writes stay owner-only (the existing "Users access own recipes" FOR ALL policy
-- still governs INSERT/UPDATE/DELETE). Postgres ORs permissive policies, so the
-- effective SELECT rule becomes: owner OR is_shared.

alter table recipes add column if not exists is_shared boolean not null default false;

-- Partial index: the team view filters on is_shared = true only.
create index if not exists recipes_is_shared_idx on recipes (is_shared) where is_shared;

drop policy if exists "read shared recipes" on recipes;
create policy "read shared recipes"
  on recipes for select
  to authenticated
  using (is_shared = true);

-- profiles: a minimal public directory so the team view can show "shared by
-- {name}" without exposing other users' private user_preferences. No public
-- profiles/users table existed before. Names/emails are visible to the whole
-- (closed, invite-only) team by design.
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  created_at   timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "profiles readable by authenticated" on profiles;
create policy "profiles readable by authenticated"
  on profiles for select to authenticated using (true);

drop policy if exists "update own profile" on profiles;
create policy "update own profile"
  on profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- Self-insert lets a user create their own profile row the first time they set
-- a space name (preferences upsert). Bulk inserts at account creation + seed
-- backfill use the service-role key, which bypasses RLS.
drop policy if exists "insert own profile" on profiles;
create policy "insert own profile"
  on profiles for insert to authenticated
  with check (auth.uid() = id);
