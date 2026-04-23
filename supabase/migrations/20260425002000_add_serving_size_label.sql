alter table recipes
  add column serving_size_label text null
  check (serving_size_label is null or length(trim(serving_size_label)) > 0);

comment on column recipes.serving_size_label is
  'Optional chef-authored label for one serving: "1 burger", "250 g", "1 slice". Display-only; not consumed by macro math.';
