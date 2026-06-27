/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Ingredient, RecipePayload } from '@/types/recipe';

type RecipeRow = { id: string; user_id: string; ingredients: Ingredient[]; updated_at: string };
let currentRecipe: RecipeRow | null = null;
let currentSession: { user: { id: string } } | null = null;
let updateCount: number = 1;
const updateSpy = jest.fn();
const insertSpy = jest.fn();
const computeSpy = jest.fn(async (_id: string) => null);

jest.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw { __redirect: url };
  },
}));

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: currentSession?.user ?? null } }) },
    from: (table: string) => {
      if (table === 'recipes') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () =>
                  currentRecipe
                    ? { data: currentRecipe, error: null }
                    : { data: null, error: { message: 'not found' } },
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: () => ({
              eq: () => ({
                eq: async () => {
                  updateSpy(patch);
                  if (currentRecipe && 'ingredients' in patch) {
                    currentRecipe.ingredients = patch.ingredients as Ingredient[];
                  }
                  return { error: null, count: updateCount };
                },
              }),
            }),
          }),
          insert: (patch: Record<string, unknown>) => {
            insertSpy(patch);
            return {
              select: () => ({ single: async () => ({ data: { id: 'new' }, error: null }) }),
            };
          },
        };
      }
      return {};
    },
  })),
}));

jest.mock('@/lib/macros/compute', () => ({
  computeRecipeMacros: (id: string) => computeSpy(id),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRecipe, updateRecipe } = require('../recipes');

beforeEach(() => {
  currentRecipe = null;
  currentSession = null;
  updateCount = 1;
  updateSpy.mockClear();
  insertSpy.mockClear();
  computeSpy.mockClear();
});

function basePayload(
  ingredients: Ingredient[],
  overrides: Partial<RecipePayload> = {},
): RecipePayload {
  return {
    name: 'Test',
    ingredients,
    steps: [],
    servings: 1,
    serving_size_label: null,
    description: null,
    prep_time: null,
    cook_time: null,
    tags: null,
    notes: null,
    photos: null,
    ...overrides,
  };
}

type Scenario = {
  label: string;
  signedIn: boolean;
  initialIngredients: Ingredient[];
  newIngredients: Ingredient[];
  assert: (written: Ingredient[]) => void;
};

describe('updateRecipe — unit-change guard', () => {
  it.each<Scenario>([
    {
      label: 'unit change across basis boundary clears override',
      signedIn: true,
      initialIngredients: [
        {
          amount: 2,
          unit: 'pieces',
          name: 'Tomato',
          macros_override: { kcal: 22, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.8, fiber_g: 1.5 },
          macros_override_basis: 'per_unit',
        },
      ],
      // Simulates edit form sending back the stale override with a changed unit (pieces → g)
      newIngredients: [
        {
          amount: 200,
          unit: 'g',
          name: 'Tomato',
          macros_override: { kcal: 22, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.8, fiber_g: 1.5 },
          macros_override_basis: 'per_unit',
        },
      ],
      assert: (written: Ingredient[]) => {
        expect(written[0].macros_override).toBeUndefined();
        expect(written[0].macros_override_basis).toBeUndefined();
      },
    },
    {
      label: 'same-basis unit change preserves override',
      signedIn: true,
      initialIngredients: [
        {
          amount: 2,
          unit: 'pieces',
          name: 'Tomato',
          macros_override: { kcal: 22, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.8, fiber_g: 1.5 },
          macros_override_basis: 'per_unit',
        },
      ],
      newIngredients: [
        {
          amount: 3,
          unit: 'pieces', // amount changed, unit same
          name: 'Tomato',
          macros_override: { kcal: 22, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.8, fiber_g: 1.5 },
          macros_override_basis: 'per_unit',
        },
      ],
      assert: (written: Ingredient[]) => {
        expect(written[0].macros_override).toBeDefined();
        expect(written[0].macros_override_basis).toBe('per_unit');
      },
    },
    {
      label: 'USDA-match ingredient: unit change preserves fdc_id',
      signedIn: true,
      initialIngredients: [
        { amount: 600, unit: 'g', name: 'Beef', fdc_id: 1001, fdc_name: 'Beef, ground' },
      ],
      newIngredients: [
        { amount: 21, unit: 'oz', name: 'Beef', fdc_id: 1001, fdc_name: 'Beef, ground' },
      ],
      assert: (written: Ingredient[]) => {
        expect(written[0].fdc_id).toBe(1001);
        expect(written[0].fdc_name).toBe('Beef, ground');
      },
    },
  ])('unit-change guard → $label', async (s) => {
    currentSession = s.signedIn ? { user: { id: 'u1' } } : null;
    currentRecipe = { id: 'r1', user_id: 'u1', ingredients: s.initialIngredients, updated_at: 'fresh-ts' };
    try {
      await updateRecipe('r1', basePayload(s.newIngredients), 'fresh-ts');
    } catch (e) {
      // redirect() throws a sentinel; ignore it
      if (!(e && typeof e === 'object' && '__redirect' in e)) throw e;
    }
    const last = updateSpy.mock.calls.at(-1)?.[0] as { ingredients: Ingredient[] };
    expect(last).toBeDefined();
    s.assert(last.ingredients);
  });
});

describe('recipe write validation and concurrency', () => {
  it('rejects invalid creates before insert', async () => {
    currentSession = { user: { id: 'u1' } };

    const result = await createRecipe(basePayload([{ amount: 1, unit: null, name: 'Salt' }], { servings: 0 }));

    expect(result).toEqual({ error: 'Servings must be a whole number between 1 and 999.' });
    expect(insertSpy).not.toHaveBeenCalled();
  });

  it('returns a conflict when updated_at is stale', async () => {
    currentSession = { user: { id: 'u1' } };
    currentRecipe = {
      id: 'r1',
      user_id: 'u1',
      ingredients: [{ amount: 1, unit: null, name: 'Salt' }],
      updated_at: 'fresh-ts',
    };

    const result = await updateRecipe(
      'r1',
      basePayload([{ amount: 2, unit: null, name: 'Salt' }]),
      'stale-ts',
    );

    expect(result).toEqual({
      error: 'This recipe was changed in another tab. Refresh and try again.',
    });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('returns a conflict when the DB update affects zero rows (TOCTOU race)', async () => {
    currentSession = { user: { id: 'u1' } };
    currentRecipe = {
      id: 'r1',
      user_id: 'u1',
      ingredients: [{ amount: 1, unit: null, name: 'Salt' }],
      updated_at: 'fresh-ts',
    };
    updateCount = 0;

    const result = await updateRecipe(
      'r1',
      basePayload([{ amount: 2, unit: null, name: 'Salt' }]),
      'fresh-ts',
    );

    expect(result).toEqual({
      error: 'This recipe was changed in another tab. Refresh and try again.',
    });
    expect(updateSpy).toHaveBeenCalled();
  });

  it('returns a not-found error when the recipe is missing or RLS-hidden', async () => {
    currentSession = { user: { id: 'u1' } };
    currentRecipe = null;

    const result = await updateRecipe(
      'r1',
      basePayload([{ amount: 1, unit: null, name: 'Salt' }]),
      'fresh-ts',
    );

    expect(result).toEqual({ error: 'Recipe not found.' });
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
