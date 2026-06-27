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

const upsertSpy = jest.fn(async (..._args: unknown[]) => ({ error: null }));
const updateEqSpy = jest.fn(async () => ({ error: null }));
const updateArgSpy = jest.fn();
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
      update: (patch: Record<string, unknown>) => {
        updateArgSpy(patch);
        return { eq: updateEqSpy };
      },
    }),
  })),
}));

// Import AFTER mocks are registered.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { updateUserPreferences, resetDemoPreferences, replayOnboarding } = require('../preferences');
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

describe('preferences server actions', () => {
  beforeEach(async () => {
    const api = await headers.cookies();
    api.__store.clear();
    api.set.mockClear();
    api.delete.mockClear();
    upsertSpy.mockClear();
    updateEqSpy.mockClear();
    updateArgSpy.mockClear();
    state.user = { id: 'user-1', email: 'jc@sakai.app' };
  });

  it('units validate + mirror; resetDemo demo-only; replayOnboarding any-user', async () => {
    const api = await headers.cookies();

    // updateUserPreferences — metric
    let result = await updateUserPreferences({ preferred_units: 'metric' });
    expect(result.ok).toBe(true);
    expect(upsertSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ user_id: 'user-1', preferred_units: 'metric' }),
      expect.anything(),
    );
    expect(api.__store.get('preferred-units')?.value).toBe('metric');

    // updateUserPreferences — imperial
    result = await updateUserPreferences({ preferred_units: 'imperial' });
    expect(result.ok).toBe(true);
    expect(api.__store.get('preferred-units')?.value).toBe('imperial');

    // updateUserPreferences — invalid guard
    const upsertsBefore = upsertSpy.mock.calls.length;
    result = await updateUserPreferences({
      preferred_units: 'furlongs' as unknown as 'metric',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Invalid units value');
    expect(upsertSpy.mock.calls.length).toBe(upsertsBefore);

    // resetDemoPreferences — non-demo caller forbidden
    state.user = { id: 'user-1', email: 'jc@sakai.app' };
    result = await resetDemoPreferences();
    expect(result.ok).toBe(false);
    expect(result.error).toBe('Forbidden');
    expect(updateArgSpy).not.toHaveBeenCalled();

    // resetDemoPreferences — demo caller nulls prefs + clears cookies
    state.user = { id: 'demo-1', email: 'demo@sakai.app' };
    api.__store.set('preferred-theme', { value: 'dark' });
    api.__store.set('preferred-language', { value: 'es' });
    result = await resetDemoPreferences();
    expect(result.ok).toBe(true);
    expect(updateArgSpy).toHaveBeenCalledWith({
      preferred_theme: null,
      preferred_font_size: null,
      preferred_language: null,
      preferred_units: null,
      tour_completed_at: null,
      tour_dismissed_until: null,
    });
    expect(api.__store.get('preferred-theme')?.value).toBeNull();
    expect(api.__store.get('preferred-language')?.value).toBeNull();

    // replayOnboarding — any authenticated caller nulls prefs + clears cookies.
    updateArgSpy.mockClear();
    state.user = { id: 'user-42', email: 'chef@sakai.app' };
    api.__store.set('preferred-font-size', { value: 'lg' });
    api.__store.set('preferred-language', { value: 'es' });

    result = await replayOnboarding();
    expect(result.ok).toBe(true);
    expect(updateArgSpy).toHaveBeenCalledWith({
      preferred_theme: null,
      preferred_font_size: null,
      preferred_language: null,
      preferred_units: null,
      tour_completed_at: null,
      tour_dismissed_until: null,
    });
    expect(api.__store.get('preferred-font-size')?.value).toBeNull();
    expect(api.__store.get('preferred-language')?.value).toBeNull();

    // replayOnboarding — unauthenticated caller: no writes.
    updateArgSpy.mockClear();
    state.user = null;
    result = await replayOnboarding();
    expect(result.ok).toBe(false);
    expect(updateArgSpy).not.toHaveBeenCalled();
  });
});

// Silence lint — mockedCookiesApi kept for initialization.
void mockedCookiesApi;
void getCookieStore;
