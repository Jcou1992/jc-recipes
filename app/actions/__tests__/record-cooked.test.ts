/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type Session = { user: { id: string } } | null;

let currentSession: Session = null;
const rpcSpy = jest.fn(async (_fn: string, _args: Record<string, unknown>) => ({
  data: null,
  error: null,
}));

jest.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw { __redirect: url };
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { getSession: async () => ({ data: { session: currentSession } }) },
    rpc: (fn: string, args: Record<string, unknown>) => rpcSpy(fn, args),
    from: () => ({}),
  })),
}));

jest.mock('@/lib/macros/compute', () => ({
  computeRecipeMacros: async (_id: string) => null,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { recordCooked } = require('../recipes');

beforeEach(() => {
  currentSession = null;
  rpcSpy.mockClear();
});

describe('recordCooked', () => {
  it('happy path → calls record_cooked RPC with recipe_id arg', async () => {
    currentSession = { user: { id: 'u1' } };

    await recordCooked('rec-1');

    expect(rpcSpy).toHaveBeenCalledTimes(1);
    expect(rpcSpy).toHaveBeenCalledWith('record_cooked', { recipe_id: 'rec-1' });
  });

  it('missing auth → redirects to /login, never calls RPC', async () => {
    currentSession = null;

    await expect(recordCooked('rec-1')).rejects.toMatchObject({ __redirect: '/login' });
    expect(rpcSpy).not.toHaveBeenCalled();
  });

  it('other-user recipe (RLS miss) → returns void, no throw', async () => {
    currentSession = { user: { id: 'u1' } };
    // RLS-scoped UPDATE inside the function affects 0 rows; PostgREST returns no error.
    rpcSpy.mockResolvedValueOnce({ data: null, error: null });

    await expect(recordCooked('rec-owned-by-other')).resolves.toBeUndefined();
  });

  it('called twice → both invocations succeed and are independent', async () => {
    currentSession = { user: { id: 'u1' } };

    await recordCooked('rec-1');
    await recordCooked('rec-1');

    expect(rpcSpy).toHaveBeenCalledTimes(2);
    expect(rpcSpy.mock.calls[0]).toEqual(['record_cooked', { recipe_id: 'rec-1' }]);
    expect(rpcSpy.mock.calls[1]).toEqual(['record_cooked', { recipe_id: 'rec-1' }]);
  });
});
