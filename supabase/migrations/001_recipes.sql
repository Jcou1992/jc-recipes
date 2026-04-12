-- recipes table
create table recipes (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users not null,
  name          text not null,
  ingredients   jsonb not null default '[]',
  steps         jsonb not null default '[]',
  servings      integer not null default 1,
  description   text,
  prep_time     integer,
  cook_time     integer,
  tags          text[],
  notes         text,
  photos        text[],
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS
alter table recipes enable row level security;

create policy "Users access own recipes"
  on recipes for all
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger recipes_updated_at
  before update on recipes
  for each row execute function update_updated_at();
