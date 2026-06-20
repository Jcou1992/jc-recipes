/**
 * @jest-environment node
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const createClientMock = jest.fn();
const fromMock = jest.fn();
const deleteMock = jest.fn();
const selectMock = jest.fn();
const updateMock = jest.fn();
const insertMock = jest.fn();
const safeComputeMock = jest.fn(async (_id: string) => null);

jest.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw { __redirect: url };
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}));

jest.mock('@/lib/macros/safe-compute', () => ({
  safeCompute: (id: string) => safeComputeMock(id),
}));

// Macros is hidden behind a build-time flag (lib/flags.ts) and defaults off.
// Force it on here so the duplicate-recipe compute wiring stays under test —
// the parked feature must remain verified for an eventual pivot.
jest.mock('@/lib/flags', () => ({
  FEATURES: { macros: true },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { bulkDeleteRecipes, bulkDuplicateRecipes, bulkUpdateTags } = require('../bulk-recipes');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { sanitizeTags, validateTagPayload } = require('@/lib/bulk-recipes-tags');

beforeEach(() => {
  createClientMock.mockReset();
  fromMock.mockReset();
  deleteMock.mockReset();
  selectMock.mockReset();
  updateMock.mockReset();
  insertMock.mockReset();
  safeComputeMock.mockClear();

  deleteMock.mockReturnValue({
    in: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null } as never),
      }),
    }),
  });

  selectMock.mockResolvedValue({ data: [], error: null } as unknown as never);
  updateMock.mockReturnValue({
    eq: jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({ error: null } as unknown as never),
    }),
  });

  fromMock.mockImplementation((table: string) => ({
    delete: deleteMock,
    select: selectMock,
    update: updateMock,
    insert: insertMock,
    in: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    ...(table === 'recipes' ? {} : {}),
  }));

  createClientMock.mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } } } as never) },
    from: fromMock,
  } as unknown as never);
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

  it('duplicates recipes with a content whitelist and drops operational telemetry', async () => {
    const source = {
      id: 'r1',
      user_id: 'source-user',
      name: 'Soup',
      ingredients: [{ amount: 1, unit: null, name: 'Salt' }],
      steps: [{ order: 1, content: 'Stir.', timer_seconds: null }],
      servings: 2,
      serving_size_label: null,
      description: 'Warm',
      prep_time: 5,
      cook_time: 10,
      tags: ['dinner'],
      notes: null,
      photos: null,
      cooked_at: '2026-04-30T12:00:00Z',
      cooked_count: 5,
      macros: { kcal: 1, protein_g: 2, fat_g: 3, carbs_g: 4, fiber_g: 5, matched_count: 1, total_count: 1, unresolved_ingredients: [] },
      macros_computed_at: '2026-04-30T12:00:00Z',
      created_at: '2026-04-30T12:00:00Z',
      updated_at: '2026-04-30T12:00:00Z',
    };

    const query = {
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [source], error: null } as never),
    };
    const insertedRows = [{ id: 'copy-1' }];
    insertMock.mockReturnValue({
      select: jest.fn().mockResolvedValue({ data: insertedRows, error: null } as never),
    });
    fromMock.mockImplementation(() => ({
      select: jest.fn().mockReturnValue(query),
      insert: insertMock,
    }));

    const result = await bulkDuplicateRecipes(['r1']);

    expect(result).toEqual({ succeeded: ['copy-1'], failed: [] });
    const clones = insertMock.mock.calls[0][0] as Array<Record<string, unknown>>;
    expect(clones).toHaveLength(1);
    // user_id must be the authenticated user, not whatever was on the source row.
    // RLS ensures source.user_id matches the caller in production, but this
    // assertion guards against a regression that copies source ownership.
    expect(clones[0]).toMatchObject({
      user_id: 'u1',
      name: 'Soup (Copy)',
      ingredients: source.ingredients,
      steps: source.steps,
      servings: 2,
    });
    expect(clones[0]).not.toHaveProperty('id');
    expect(clones[0]).not.toHaveProperty('created_at');
    expect(clones[0]).not.toHaveProperty('updated_at');
    expect(clones[0]).not.toHaveProperty('cooked_at');
    expect(clones[0]).not.toHaveProperty('cooked_count');
    expect(clones[0]).not.toHaveProperty('macros');
    expect(clones[0]).not.toHaveProperty('macros_computed_at');
    expect(safeComputeMock).toHaveBeenCalledWith('copy-1');
  });

  it('fails all ids when the source fetch errors', async () => {
    const query = {
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } } as never),
    };
    fromMock.mockImplementation(() => ({
      select: jest.fn().mockReturnValue(query),
      insert: insertMock,
    }));

    const result = await bulkDuplicateRecipes(['r1', 'r2']);

    expect(result).toEqual({
      succeeded: [],
      failed: [
        { id: 'r1', error: 'boom' },
        { id: 'r2', error: 'boom' },
      ],
    });
    expect(insertMock).not.toHaveBeenCalled();
    expect(safeComputeMock).not.toHaveBeenCalled();
  });
});
