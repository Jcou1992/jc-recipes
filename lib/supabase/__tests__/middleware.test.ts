import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}));

const createServerClientMock = createServerClient as jest.MockedFunction<typeof createServerClient>;

function makeRequest(path: string, cookieHeader?: string) {
  const headers = cookieHeader ? { cookie: cookieHeader } : undefined;
  return new NextRequest(new URL(`https://example.com${path}`), { headers });
}

describe('updateSession', () => {
  beforeEach(() => {
    createServerClientMock.mockReset();
  });

  it.each([
    {
      name: 'no cookie',
      request: makeRequest('/recipes'),
      prepare: () => undefined,
      expectedStatus: 307,
      expectedLocation: 'https://example.com/login',
      expectSetCookieContains: undefined,
      expectSupabaseCalls: 0,
    },
    {
      name: 'stale cookie',
      request: makeRequest('/recipes', 'sb-auth-token=stale'),
      prepare: () => {
        createServerClientMock.mockImplementation((_url, _key, options) => {
          const cookieOptions = options as unknown as {
            cookies?: {
              setAll?: (cookies: Array<{ name: string; value: string; options: { maxAge: number; path: string } }>) => void;
            };
          };
          cookieOptions.cookies?.setAll?.([
            { name: 'sb-auth-token', value: '', options: { maxAge: 0, path: '/' } },
          ]);

          return {
            auth: {
              getUser: jest.fn().mockResolvedValue({ data: { user: null } }),
            },
          } as never;
        });
      },
      expectedStatus: 307,
      expectedLocation: 'https://example.com/login',
      expectSetCookieContains: 'Max-Age=0',
      expectSupabaseCalls: 1,
    },
    {
      name: 'valid cookie',
      request: makeRequest('/recipes', 'sb-auth-token=valid'),
      prepare: () => {
        createServerClientMock.mockReturnValue({
          auth: {
            getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-1' } } }),
          },
        } as never);
      },
      expectedStatus: 200,
      expectedLocation: null,
      expectSetCookieContains: undefined,
      expectSupabaseCalls: 1,
    },
  ])('covers protected route auth behavior for $name', async scenario => {
    scenario.prepare();

    const response = await updateSession(scenario.request);

    expect(createServerClientMock).toHaveBeenCalledTimes(scenario.expectSupabaseCalls);
    expect(response.status).toBe(scenario.expectedStatus);
    expect(response.headers.get('location')).toBe(scenario.expectedLocation);

    if (scenario.expectSetCookieContains) {
      expect(response.headers.get('set-cookie')).toContain(scenario.expectSetCookieContains);
    }
  });
});
