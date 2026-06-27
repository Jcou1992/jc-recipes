'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, isAdmin } from '@/lib/admin-guard';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendInviteEmail } from '@/lib/email';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  email: string;
  isAdmin: boolean;
  createdAt: string;
  lastSignInAt: string | null;
  spaceName: string | null;
  recipeCount: number;
}

export interface AdminListResult {
  users: AdminUserRow[];
  stats: { totalUsers: number; totalRecipes: number; sharedRecipes: number };
}

export type AdminActionResult = { error: string } | { ok: true };

export type CreateUserResult =
  | { error: string }
  | { ok: true; tempPassword: string; emailSent: boolean; emailReason?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────

// Unambiguous alphabet (no 0/O/1/I/l) so a temp password read aloud or copied
// from an email is unlikely to be mistyped.
const PW_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
function generateTempPassword(len = 16): string {
  const bytes = new Uint8Array(len);
  globalThis.crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < len; i++) out += PW_ALPHABET[bytes[i] % PW_ALPHABET.length];
  return out;
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * List every user with recipe counts + space name. requireAdmin() redirects a
 * non-admin caller, so this never leaks the user table.
 */
export async function listUsers(): Promise<AdminListResult> {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: list, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw new Error(error.message);
  const users = list?.users ?? [];

  // Recipe counts per user (service role bypasses RLS). Small team → fetch ids
  // and tally in memory rather than maintaining a SQL view.
  const recipeCount = new Map<string, number>();
  let totalRecipes = 0;
  const { data: recipeRows } = await admin.from('recipes').select('user_id');
  for (const r of recipeRows ?? []) {
    totalRecipes++;
    recipeCount.set(r.user_id, (recipeCount.get(r.user_id) ?? 0) + 1);
  }

  // Shared count is guarded: the is_shared column ships in a sibling migration,
  // so tolerate it not being present yet.
  let sharedRecipes = 0;
  try {
    const { count } = await admin
      .from('recipes')
      .select('id', { count: 'exact', head: true })
      .eq('is_shared', true);
    sharedRecipes = count ?? 0;
  } catch {
    sharedRecipes = 0;
  }

  // Space names from user_preferences (admin client bypasses RLS).
  const spaceName = new Map<string, string | null>();
  const { data: prefRows } = await admin.from('user_preferences').select('user_id, space_name');
  for (const p of prefRows ?? []) spaceName.set(p.user_id, p.space_name ?? null);

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    email: u.email ?? '',
    isAdmin: isAdmin(u),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    spaceName: spaceName.get(u.id) ?? null,
    recipeCount: recipeCount.get(u.id) ?? 0,
  }));

  return {
    users: rows,
    stats: { totalUsers: rows.length, totalRecipes, sharedRecipes },
  };
}

async function countAdmins(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  return (list?.users ?? []).filter(isAdmin).length;
}

// ── Write ─────────────────────────────────────────────────────────────────────

/**
 * Create an account. The admin may supply a password or one is generated. The
 * temp password is ALWAYS returned so the dashboard can show/copy it even if
 * the invite email fails or email is not yet configured.
 */
export async function createUserAccount(input: {
  email: string;
  password?: string;
  makeAdmin?: boolean;
}): Promise<CreateUserResult> {
  await requireAdmin();

  const email = input.email.trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: 'Enter a valid email address.' };
  const password = input.password?.trim() || generateTempPassword();
  if (password.length < MIN_PASSWORD) {
    return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: input.makeAdmin ? { role: 'admin' } : {},
  });
  if (error) return { error: error.message };

  // Seed a profile row for the team directory (display name = local part).
  // Best-effort: the profiles table ships in a sibling migration.
  const newUser = data.user;
  try {
    await admin.from('profiles').insert({
      id: newUser.id,
      email,
      display_name: email.split('@')[0],
    });
  } catch {
    // ignore — profile is non-critical for account creation
  }

  const { sent, reason } = await sendInviteEmail({ to: email, tempPassword: password });

  revalidatePath('/admin');
  return { ok: true, tempPassword: password, emailSent: sent, emailReason: reason };
}

export async function resetUserPassword(
  userId: string,
  newPassword: string,
): Promise<AdminActionResult> {
  await requireAdmin();
  if (newPassword.trim().length < MIN_PASSWORD) {
    return { error: `Password must be at least ${MIN_PASSWORD} characters.` };
  }
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword.trim() });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function setUserAdmin(userId: string, makeAdmin: boolean): Promise<AdminActionResult> {
  const caller = await requireAdmin();
  const admin = createAdminClient();

  // Never strip the last admin — that would lock everyone out of /admin.
  if (!makeAdmin) {
    const { data: target } = await admin.auth.admin.getUserById(userId);
    if (target?.user && isAdmin(target.user)) {
      const admins = await countAdmins(admin);
      if (admins <= 1) return { error: 'Cannot remove the last admin.' };
    }
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    // Setting role to null removes the claim; Supabase merges app_metadata.
    app_metadata: { role: makeAdmin ? 'admin' : null },
  });
  if (error) return { error: error.message };

  revalidatePath('/admin');
  // If an admin just demoted themselves, the layout guard will redirect on the
  // next request — nothing to do here.
  void caller;
  return { ok: true };
}

export async function deleteUserAccount(userId: string): Promise<AdminActionResult> {
  const caller = await requireAdmin();
  if (userId === caller.id) return { error: 'You cannot delete your own account.' };

  const admin = createAdminClient();
  const { data: target } = await admin.auth.admin.getUserById(userId);
  if (target?.user && isAdmin(target.user)) {
    const admins = await countAdmins(admin);
    if (admins <= 1) return { error: 'Cannot delete the last admin.' };
  }

  // Recipes cascade via the FK migration; user_preferences/profiles cascade too.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath('/admin');
  return { ok: true };
}
