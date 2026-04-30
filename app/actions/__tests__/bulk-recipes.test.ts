/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const createClientMock = jest.fn();
const fromMock = jest.fn();
const deleteMock = jest.fn();
const selectMock = jest.fn();
const updateMock = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw { __redirect: url };
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { bulkDeleteRecipes, sanitizeTags, validateTagPayload, bulkUpdateTags } = require('../bulk-recipes');

beforeEach(() => {
  createClientMock.mockReset();
  fromMock.mockReset();
  deleteMock.mockReset();
  selectMock.mockReset();
  updateMock.mockReset();

  deleteMock.mockReturnValue({
    in: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    }),
  });

  selectMock.mockResolvedValue({ data: [], error: null });
  updateMock.mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null }),
    }),
  });

  fromMock.mockImplementation((table: string) => ({
    delete: deleteMock,
    select: selectMock,
    update: updateMock,
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ...(table === 'recipes' ? {} : {}),
  }));

  createClientMock.mockResolvedValue({
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'u1' } } } }) },
    from: fromMock,
  });
});

describe('bulk recipe actions', () => {
  it('rejects oversized deletes and validates/normalizes tags', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `r-${i + 1}`);

    const deleteResult = await bulkDeleteRecipes(ids);

    expect(deleteResult.succeeded).toEqual([]);
    expect(deleteResult.failed).toHaveLength(101);
    expect(deleteResult.failed[0]).toEqual({ id: 'r-1', error: 'Max 100 recipes per operation' });

    expect(createClientMock).not.toHaveBeenCalled();
    expect(fromMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(sanitizeTags(['  Dinner ', 'DINNER', '', '  ', 'Quick'])).toEqual(['dinner', 'quick']);
    const longTag = 'x'.repeat(33);
    const result = validateTagPayload([longTag], [longTag]);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]).toMatchObject({ field: 'addTags', reason: 'tag_too_long', max: 32 });
    expect(result.errors[1]).toMatchObject({ field: 'removeTags', reason: 'tag_too_long', max: 32 });
    const invalid = await bulkUpdateTags(['r1'], ['x'.repeat(40)], []);
    expect(invalid.succeeded).toEqual([]);
    expect(invalid.failed[0]).toMatchObject({
      id: 'r1',
      code: 'TAG_VALIDATION',
      error: 'Invalid tags supplied',
      details: { field: 'addTags', reason: 'tag_too_long', max: 32 },
    });
  });
});
