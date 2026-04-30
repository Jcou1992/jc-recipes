/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const createClientMock = jest.fn();
const fromMock = jest.fn();
const deleteMock = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw { __redirect: url };
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { bulkDeleteRecipes } = require('../bulk-recipes');

beforeEach(() => {
  createClientMock.mockReset();
  fromMock.mockReset();
  deleteMock.mockReset();

  deleteMock.mockReturnValue({
    in: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  });

  fromMock.mockReturnValue({
    delete: deleteMock,
  });

  createClientMock.mockResolvedValue({
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) },
    from: fromMock,
  });
});

describe('bulkDeleteRecipes', () => {
  it('rejects oversized payloads before auth/db work', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `r-${i + 1}`);

    const result = await bulkDeleteRecipes(ids);

    expect(result.succeeded).toEqual([]);
    expect(result.failed).toHaveLength(101);
    expect(result.failed[0]).toEqual({ id: 'r-1', error: 'Max 100 recipes per operation' });

    expect(createClientMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
