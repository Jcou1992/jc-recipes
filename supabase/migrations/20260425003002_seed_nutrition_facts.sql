-- PLACEHOLDER seed for nutrition_facts.
--
-- This file ships with a small hand-typed set of common ingredients so that
-- development and tests can function before the full USDA CC0 bulk dataset
-- (~8,000 rows) is loaded. The full dataset is produced by running:
--
--   node scripts/seed-usda.mjs
--
-- which downloads the USDA FoodData Central ZIP (~200 MB), verifies its
-- SHA-256 against scripts/.usda-csv.sha256, parses food.csv +
-- food_nutrient.csv, and overwrites this migration with batched INSERTs.
--
-- All rows below are per 100 g. FDC IDs are real and come from the
-- USDA FoodData Central public database (CC0 1.0).

insert into nutrition_facts (fdc_id, name, kcal, protein_g, fat_g, carbs_g, fiber_g, source) values
  (171477, 'Chicken, broilers or fryers, breast, meat only, raw',        114, 21.23, 2.62, 0,     0,   'foundation'),
  (169704, 'Rice, white, long-grain, regular, raw, enriched',            365, 7.13,  0.66, 79.95, 1.3, 'foundation'),
  (748967, 'Egg, whole, raw, fresh',                                     143, 12.56, 9.51, 0.72,  0,   'foundation'),
  (1104647,'Garlic, raw',                                                149, 6.36,  0.5,  33.06, 2.1, 'foundation'),
  (1104067,'Onions, raw',                                                 40, 1.1,   0.1,  9.34,  1.7, 'foundation'),
  (1103276,'Tomatoes, red, ripe, raw, year round average',                18, 0.88,  0.2,  3.89,  1.2, 'foundation'),
  (168944, 'Wheat flour, white, all-purpose, enriched, bleached',        364, 10.33, 0.98, 76.31, 2.7, 'foundation'),
  (169655, 'Sugars, granulated',                                         387, 0,     0,    99.98, 0,   'foundation'),
  (173468, 'Salt, table, iodized',                                         0, 0,     0,    0,     0,   'foundation'),
  (173410, 'Butter, stick, salted',                                      717, 0.85,  81.11,0.06,  0,   'foundation'),
  (171413, 'Oil, olive, extra virgin',                                   884, 0,     100,  0,     0,   'foundation'),
  (169967, 'Beef, ground, 80% lean meat / 20% fat, raw',                 254, 17.17, 20,   0,     0,   'foundation'),
  (175167, 'Potatoes, raw, skin',                                         58, 2.57,  0.1,  12.44, 2.5, 'foundation'),
  (173944, 'Carrots, raw',                                                41, 0.93,  0.24, 9.58,  2.8, 'foundation'),
  (170000, 'Milk, whole, 3.25% milkfat, with added vitamin D',            61, 3.15,  3.25, 4.8,   0,   'foundation'),
  (170288, 'Black pepper, ground',                                       251, 10.39, 3.26, 63.95, 25.3,'foundation'),
  (171287, 'Cheese, cheddar',                                            404, 22.87, 33.31,3.09,  0,   'foundation'),
  (170457, 'Bread, white, commercially prepared',                        266, 7.64,  3.29, 50.61, 2.4, 'foundation')
on conflict (fdc_id) do update set
  name = excluded.name,
  kcal = excluded.kcal,
  protein_g = excluded.protein_g,
  fat_g = excluded.fat_g,
  carbs_g = excluded.carbs_g,
  fiber_g = excluded.fiber_g,
  source = excluded.source;
