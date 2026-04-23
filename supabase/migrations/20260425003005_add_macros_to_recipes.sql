alter table recipes
  add column macros             jsonb       null,
  add column macros_computed_at timestamptz null;

comment on column recipes.macros is
  'Cached nutrient totals: {kcal, protein_g, fat_g, carbs_g, fiber_g, matched_count, total_count, unresolved_ingredients[]}. Null = not yet computed.';
