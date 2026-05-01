-- Add CHECK constraints mirroring lib/validate-recipe.ts. NOT VALID skips the
-- existing-row scan so deploy cannot abort on legacy data; the matching
-- VALIDATE CONSTRAINT step runs the audit out-of-band. Wrap each ADD in a
-- pg_constraint guard so the migration is re-runnable on shadow/local DBs.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'recipes_servings_positive') then
    alter table recipes add constraint recipes_servings_positive check (servings > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recipes_prep_time_nonneg') then
    alter table recipes add constraint recipes_prep_time_nonneg check (prep_time is null or prep_time >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recipes_cook_time_nonneg') then
    alter table recipes add constraint recipes_cook_time_nonneg check (cook_time is null or cook_time >= 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recipes_name_length') then
    alter table recipes add constraint recipes_name_length check (length(name) between 1 and 200) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recipes_ingredients_size') then
    alter table recipes add constraint recipes_ingredients_size check (jsonb_array_length(ingredients) <= 100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recipes_steps_size') then
    alter table recipes add constraint recipes_steps_size check (jsonb_array_length(steps) <= 100) not valid;
  end if;
end $$;

-- Validate against existing rows. Run after a manual audit confirms no
-- violating rows exist (see docs/runbook-seed-users.md or query
-- pg_constraint with convalidated = false to find pending validations).
-- Operators may comment these out and run them in a separate window if the
-- table is large enough that the validation scan needs scheduling.
alter table recipes validate constraint recipes_servings_positive;
alter table recipes validate constraint recipes_prep_time_nonneg;
alter table recipes validate constraint recipes_cook_time_nonneg;
alter table recipes validate constraint recipes_name_length;
alter table recipes validate constraint recipes_ingredients_size;
alter table recipes validate constraint recipes_steps_size;
