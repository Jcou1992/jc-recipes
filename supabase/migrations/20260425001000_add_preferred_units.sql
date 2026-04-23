alter table user_preferences
  add column preferred_units text null
  check (preferred_units is null or preferred_units in ('metric', 'imperial'));

comment on column user_preferences.preferred_units is
  'User''s preferred unit system; null = defaults to metric on render.';
