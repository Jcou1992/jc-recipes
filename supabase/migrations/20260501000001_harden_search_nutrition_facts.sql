create or replace function search_nutrition_facts(query text, max_results int)
returns table(fdc_id int, name text, similarity real)
language sql stable
security invoker
set search_path = public, pg_temp
as $$
  select nf.fdc_id, nf.name, similarity(nf.name, query) as similarity
  from nutrition_facts nf
  where length(trim(coalesce(query, ''))) >= 2
    and nf.name % query
  order by similarity desc
  limit least(greatest(coalesce(max_results, 5), 1), 25);
$$;
