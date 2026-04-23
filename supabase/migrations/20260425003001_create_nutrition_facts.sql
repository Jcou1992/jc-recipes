create table nutrition_facts (
  fdc_id     integer primary key,
  name       text    not null,
  kcal       numeric not null,
  protein_g  numeric not null,
  fat_g      numeric not null,
  carbs_g    numeric not null,
  fiber_g    numeric not null,
  source     text    not null check (source in ('foundation','sr_legacy'))
);

create index nutrition_facts_name_trgm
  on nutrition_facts
  using gin (name gin_trgm_ops);

alter table nutrition_facts enable row level security;

create policy nutrition_facts_authenticated_read
  on nutrition_facts for select
  to authenticated
  using (true);

comment on table nutrition_facts is
  'USDA FoodData Central nutrient reference data (CC0). Per 100 g.';

create or replace function search_nutrition_facts(query text, max_results int)
returns table(fdc_id int, name text, similarity real)
language sql stable security definer as $$
  select nf.fdc_id, nf.name, similarity(nf.name, query) as similarity
  from nutrition_facts nf
  where nf.name % query
  order by similarity desc
  limit max_results;
$$;
