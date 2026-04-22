# Runbook: Seed users for SEKAI

Manual steps to land Wave 1 Plan D.

## Prerequisites
- Supabase project URL + anon key in `.env.local` (already present)
- **Service role key** — get from Supabase dashboard → Settings → API. Add to `.env.local`:

  ```env
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
  JC_USER_EMAIL=jc@sakai.app
  JC_USER_PASSWORD=<strong-password>
  DEMO_USER_EMAIL=demo@sakai.app
  DEMO_USER_PASSWORD=<demo-password>
  ```

  The service role key is a secret — never commit. `.env.local` is gitignored.

## Steps

1. **Run the seed script.** Idempotent — safe to re-run.

   ```bash
   node scripts/seed-users.mjs
   ```

   Expected output: `+ Created user` lines (first run) or `✓ User exists` (subsequent). Demo recipe inserted once.

2. **Run the ownership-transfer migration.** One-time. After this, test@ has no recipes; jc@ owns them all.

   Option A (Supabase CLI):
   ```bash
   supabase db push   # if using Supabase CLI, migration auto-applied
   ```

   Option B (dashboard):
   - Open Supabase dashboard → SQL Editor
   - Paste contents of `supabase/migrations/20260422180000_transfer_jc_recipes.sql`
   - Run

3. **Sign out + sign in.** Clear the test@ session in your browser. Sign in as `jc@sakai.app` with the password you set.

4. **Verify.** Open a new browser (or incognito), sign in as `demo@sakai.app`. You should see exactly one recipe: **Classic Smash Burger**. JC's recipes must NOT be visible — RLS should block them.

## Rollback

Seed script: delete users in Supabase dashboard → Authentication → Users.
Transfer migration: irreversible without a prior backup. Before running, snapshot:

```sql
create table recipes_backup_<date> as select * from recipes;
```
