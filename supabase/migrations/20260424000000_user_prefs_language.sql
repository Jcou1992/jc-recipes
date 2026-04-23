-- Add preferred_language column to user_preferences.
-- Theme + font_size columns already exist from 20260423000000_create_user_preferences.sql.
-- RLS policies already cover all columns (policy grants row-level access by user_id).

alter table user_preferences
  add column if not exists preferred_language text;

-- Constrain values to 'en' | 'es' at the DB layer (defense in depth;
-- server action also validates).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_preferences_preferred_language_check'
  ) then
    alter table user_preferences
      add constraint user_preferences_preferred_language_check
      check (preferred_language is null or preferred_language in ('en', 'es'));
  end if;
end $$;
