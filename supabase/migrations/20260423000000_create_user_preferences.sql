-- User preferences: per-user customization (space name, tour state, prefs).
create table if not exists user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  space_name text,
  tour_completed_at timestamptz,
  tour_dismissed_until timestamptz,
  preferred_font_size text,
  preferred_theme text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table user_preferences enable row level security;

drop policy if exists "select own prefs" on user_preferences;
drop policy if exists "insert own prefs" on user_preferences;
drop policy if exists "update own prefs" on user_preferences;

create policy "select own prefs" on user_preferences for select using (auth.uid() = user_id);
create policy "insert own prefs" on user_preferences for insert with check (auth.uid() = user_id);
create policy "update own prefs" on user_preferences for update using (auth.uid() = user_id);

-- Auto-update updated_at on row change.
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists user_preferences_updated_at on user_preferences;
create trigger user_preferences_updated_at
  before update on user_preferences
  for each row execute function set_updated_at();
