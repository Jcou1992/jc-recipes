/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type FakeUser = { id: string; email?: string; app_metadata?: { role?: string } };

let callerId = 'admin-1';
let usersList: FakeUser[] = [];
let getUserByIdResult: FakeUser | null = null;

const createUserSpy = jest.fn();
const updateUserSpy = jest.fn();
const deleteUserSpy = jest.fn();

jest.mock('next/cache', () => ({ revalidatePath: () => {} }));

jest.mock('@/lib/admin-guard', () => ({
  requireAdmin: jest.fn(async () => ({ id: callerId, app_metadata: { role: 'admin' } })),
  isAdmin: (u: FakeUser | null | undefined) => u?.app_metadata?.role === 'admin',
}));

jest.mock('@/lib/email', () => ({
  sendInviteEmail: jest.fn(async () => ({ sent: false, reason: 'not configured' })),
}));

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        listUsers: async () => ({ data: { users: usersList }, error: null }),
        createUser: async (args: Record<string, unknown>) => {
          createUserSpy(args);
          return { data: { user: { id: 'new-user', email: args.email } }, error: null };
        },
        updateUserById: async (id: string, args: Record<string, unknown>) => {
          updateUserSpy(id, args);
          return { data: { user: { id } }, error: null };
        },
        getUserById: async (_id: string) => ({ data: { user: getUserByIdResult }, error: null }),
        deleteUser: async (id: string) => {
          deleteUserSpy(id);
          return { data: {}, error: null };
        },
      },
    },
    from: () => ({
      insert: async () => ({ error: null }),
    }),
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createUserAccount, setUserAdmin, deleteUserAccount } = require('../admin');

beforeEach(() => {
  callerId = 'admin-1';
  usersList = [];
  getUserByIdResult = null;
  createUserSpy.mockClear();
  updateUserSpy.mockClear();
  deleteUserSpy.mockClear();
});

describe('createUserAccount', () => {
  it('creates an email-confirmed member and returns a generated temp password', async () => {
    const result = await createUserAccount({ email: 'Chef@Example.com' });
    expect(result).toMatchObject({ ok: true, emailSent: false });
    expect(result.tempPassword).toHaveLength(16);
    expect(createUserSpy).toHaveBeenCalledTimes(1);
    const args = createUserSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(args.email).toBe('chef@example.com'); // normalized
    expect(args.email_confirm).toBe(true);
    expect(args.app_metadata).toEqual({}); // non-admin
  });

  it('stamps the admin role when makeAdmin is set', async () => {
    await createUserAccount({ email: 'boss@example.com', makeAdmin: true });
    const args = createUserSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(args.app_metadata).toEqual({ role: 'admin' });
  });

  it('rejects an invalid email without creating anything', async () => {
    const result = await createUserAccount({ email: 'not-an-email' });
    expect(result).toEqual({ error: 'Enter a valid email address.' });
    expect(createUserSpy).not.toHaveBeenCalled();
  });
});

describe('setUserAdmin — last-admin guard', () => {
  it('refuses to demote the last remaining admin', async () => {
    usersList = [{ id: 'admin-2', app_metadata: { role: 'admin' } }];
    getUserByIdResult = { id: 'admin-2', app_metadata: { role: 'admin' } };
    const result = await setUserAdmin('admin-2', false);
    expect(result).toEqual({ error: 'Cannot remove the last admin.' });
    expect(updateUserSpy).not.toHaveBeenCalled();
  });

  it('demotes when another admin remains', async () => {
    usersList = [
      { id: 'admin-2', app_metadata: { role: 'admin' } },
      { id: 'admin-3', app_metadata: { role: 'admin' } },
    ];
    getUserByIdResult = { id: 'admin-2', app_metadata: { role: 'admin' } };
    const result = await setUserAdmin('admin-2', false);
    expect(result).toEqual({ ok: true });
    expect(updateUserSpy).toHaveBeenCalledWith('admin-2', { app_metadata: { role: null } });
  });
});

describe('deleteUserAccount — guards', () => {
  it('refuses self-deletion', async () => {
    callerId = 'admin-1';
    const result = await deleteUserAccount('admin-1');
    expect(result).toEqual({ error: 'You cannot delete your own account.' });
    expect(deleteUserSpy).not.toHaveBeenCalled();
  });

  it('refuses to delete the last admin', async () => {
    usersList = [{ id: 'admin-2', app_metadata: { role: 'admin' } }];
    getUserByIdResult = { id: 'admin-2', app_metadata: { role: 'admin' } };
    const result = await deleteUserAccount('admin-2');
    expect(result).toEqual({ error: 'Cannot delete the last admin.' });
    expect(deleteUserSpy).not.toHaveBeenCalled();
  });

  it('deletes a regular member', async () => {
    getUserByIdResult = { id: 'member-9', app_metadata: {} };
    const result = await deleteUserAccount('member-9');
    expect(result).toEqual({ ok: true });
    expect(deleteUserSpy).toHaveBeenCalledWith('member-9');
  });
});
