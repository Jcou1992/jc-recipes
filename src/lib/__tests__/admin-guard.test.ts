/**
 * @jest-environment node
 */
import { describe, it, expect, jest } from '@jest/globals';

let mockUser: { id: string; app_metadata?: { role?: string } } | null = null;

jest.mock('next/navigation', () => ({
  redirect: (url: string) => { throw { __redirect: url }; },
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { isAdmin, requireAdmin } = require('@/lib/admin-guard');

describe('isAdmin', () => {
  it.each([
    [{ app_metadata: { role: 'admin' } }, true],
    [{ app_metadata: { role: 'member' } }, false],
    [{ app_metadata: {} }, false],
    [null, false],
    [undefined, false],
  ])('isAdmin(%j) === %s', (user, expected) => {
    expect(isAdmin(user as never)).toBe(expected);
  });
});

describe('requireAdmin', () => {
  it.each([
    { name: 'unauthenticated → /login', user: null, redirect: '/login' },
    { name: 'non-admin → /recipes', user: { id: 'u1', app_metadata: { role: 'member' } }, redirect: '/recipes' },
  ])('redirects: $name', async ({ user, redirect }) => {
    mockUser = user;
    await expect(requireAdmin()).rejects.toMatchObject({ __redirect: redirect });
  });

  it('returns the user for an admin', async () => {
    mockUser = { id: 'u1', app_metadata: { role: 'admin' } };
    await expect(requireAdmin()).resolves.toMatchObject({ id: 'u1' });
  });
});
