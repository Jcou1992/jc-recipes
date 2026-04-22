-- Transfer recipes from test@jc-recipes.local to jc@sakai.app.
-- ONE-OFF: run once after jc@ user exists. Non-idempotent after transfer completes.
-- Rollback: impossible without backup. Snapshot the recipes table first if paranoid.

do $$
declare
  test_user_id uuid;
  jc_user_id   uuid;
  transferred  int;
begin
  select id into test_user_id from auth.users where email = 'test@jc-recipes.local';
  select id into jc_user_id   from auth.users where email = 'jc@sakai.app';

  if test_user_id is null then raise notice 'test@jc-recipes.local not found — skipping'; return; end if;
  if jc_user_id is null then raise exception 'jc@sakai.app not found — run seed-users.mjs first'; end if;

  update recipes set user_id = jc_user_id where user_id = test_user_id;
  get diagnostics transferred = row_count;
  raise notice 'Transferred % recipes from test@ to jc@', transferred;
end $$;
