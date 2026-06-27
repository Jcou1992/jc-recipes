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

---

# Admin accounts + shared team folder

## What this adds
- **Admin dashboard** at `/admin` (gated by `app_metadata.role === 'admin'`): create
  accounts, reset passwords, grant/revoke admin, delete users + per-user/recipe stats.
- **Invite email**: creating an account emails the new user their sign-in URL + temp
  password (best-effort) and also shows the temp password in the dashboard to copy.
- **Team folder** at `/team`: any user can flip a recipe to "Share with team" on its
  detail page; shared recipes are read-only for non-owners and labelled "shared by …".

## Apply migrations
```bash
supabase db push   # applies recipes ON DELETE CASCADE + is_shared + profiles
```
(or paste `20260626000000_*.sql` and `20260626000001_*.sql` into the SQL Editor in order.)

## Bootstrap the first admin
`scripts/seed-users.mjs` now stamps `jc@sakai.app` with `app_metadata.role='admin'`
(idempotent — it promotes an existing jc@ too) and backfills the `profiles` directory:
```bash
node scripts/seed-users.mjs
```
To promote any other account by hand:
```sql
-- run as service role / SQL editor is fine for app_metadata? No — use the admin API.
```
Prefer the dashboard "Make admin" button, or re-run the seed after adding the email to
the admin list. (app_metadata is not editable from the SQL editor; it lives in auth.)

## Email configuration (optional — account creation works without it)
The invite email uses the Cloudflare Email Sending binding (`EMAIL` in `wrangler.jsonc`).
Until configured, account creation still works — the dashboard shows the temp password to
share manually. To enable real sending:
1. Onboard the sending domain once: `wrangler email sending enable <yourdomain>`
2. Set env / Worker secrets:
   ```env
   EMAIL_FROM="SEKAI <welcome@yourdomain>"
   APP_URL=https://<your-app-url>
   ```
   (`wrangler secret put EMAIL_FROM` / `APP_URL` for production.)

Security note: the invite emails a **plaintext temporary password**. Acceptable for a small
invite-only circle that changes it immediately (Settings → Password). To harden, swap
`src/lib/email.ts` to send a one-time set-password link instead.
