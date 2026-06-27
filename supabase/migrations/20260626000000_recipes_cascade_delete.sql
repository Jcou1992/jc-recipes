-- Recipes referenced auth.users with no ON DELETE behavior, so deleting a user
-- who owns recipes would fail the FK. Admin "delete user" needs the user's
-- recipes to cascade away. Re-create the FK with ON DELETE CASCADE.
-- (user_preferences already cascades; profiles cascades from its own migration.)

alter table recipes drop constraint if exists recipes_user_id_fkey;

alter table recipes
  add constraint recipes_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
