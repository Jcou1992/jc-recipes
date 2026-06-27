# supabase/

Database schema as ordered SQL migrations (`migrations/*.sql`): recipes, user preferences,
nutrition facts, ingredient tables, RLS policies, search indexes.

Security model: **Row Level Security (RLS)** enforces per-user data access — the app's middleware
and server actions authenticate, but RLS is the actual guard. See `docs/data-model.md`.

Apply with `supabase db push`. The three seed users are documented in `docs/runbook-seed-users.md`.
