/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

jest.mock('next/headers', () => {
  const store = new Map<string, { value: string | null }>();
  const api = {
    set: jest.fn((name: string, value: string) => {
      store.set(name, { value });
    }),
    delete: jest.fn((name: string) => {
      store.set(name, { value: null });
    }),
    get: jest.fn((name: string) => {
      const entry = store.get(name);
      return entry && entry.value ? { value: entry.value } : undefined;
    }),
    __store: store,
  };
  return { cookies: jest.fn(async () => api) };
});

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const upsertSpy = jest.fn(async () => ({ error: null }));
const state: { user: { id: string; email: string } | null } = {
  user: { id: 'user-1', email: 'jc@sakai.app' },
};

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null }) }),
      }),
      upsert: upsertSpy,
    }),
  })),
}));

// Import AFTER mocks are registered.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { updateUserPreferences } = require('../preferences');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const headers = require('next/headers');

function getCookieStore(): Map<string, { value: string | null }> {
  // The mocked cookies() returns the API object with a __store handle.
  // We access it synchronously — the returned promise always resolves to
  // the same singleton.
  return headers.__mockStore as Map<string, { value: string | null }>;
}

// Seed a helper so cookies() resolves to the same map each test
const mockedCookiesApi = (async () => await headers.cookies())();

describe('updateUserPreferences — preferred_units', () => {
  beforeEach(async () => {
    const api = await headers.cookies();
    api.__store.clear();
    api.set.mockClear();
    api.delete.mockClear();
    upsertSpy.mockClear();
    state.user = { id: 'user-1', email: 'jc@sakai.app' };
  });

  it('accepts valid units + mirrors to cookie; rejects invalid values pre-DB', async () => {
    const api = await headers.cookies();

    // metric
    let result = await updateUserPreferences({ preferred_units: 'metric' });
    expect(result.ok).toBe(true);
    expect(upsertSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ user_id: 'user-1', preferred_units: 'metric' }),
      expect.anything(),
    );
    expect(api.__store.get('preferred-units')?.value).toBe('metric');

    // imperial
    result = await updateUserPreferences({ preferred_units: 'imperial' });
    expect(result.ok).toBe(true);
    expect(api.__store.get('preferred-units')?.value).toBe('imperial');

    // invalid — guard rejects pre-DB
    const upsertsBefore = upsertSpy.mock.calls.length;
    result = await updateUserPreferences({
      // @ts-expect-error — deliberate invalid value for runtime guard.
      preferred_units: 'furlongs',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Invalid units value');
    expect(upsertSpy.mock.calls.length).toBe(upsertsBefore);
  });
});

// Silence lint — mockedCookiesApi kept for initialization.
void mockedCookiesApi;
void getCookieStore;
