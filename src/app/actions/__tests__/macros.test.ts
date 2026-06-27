/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Ingredient, MacroValues } from '@/types/recipe';

type Recipe = { id: string; user_id: string; ingredients: Ingredient[] };
let currentRecipe: Recipe | null = null;
let currentSession: { user: { id: string } } | null = null;
const updateSpy = jest.fn();
let updateResult: { error: { message: string } | null; count: number } = { error: null, count: 1 };
const computeSpy = jest.fn(async (_id: string) => null);
let computeFailure: Error | null = null;
const searchFdcSpy = jest.fn(async (_q: string, _n: number) => [
  { fdc_id: 100, name: 'stub match', similarity: 0.9 },
]);

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: currentSession?.user ?? null } }),
    },
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
          update: (patch: Record<string, unknown>) => {
            const filters: Record<string, unknown> = {};
            const chain = {
              eq: (column: string, value: unknown) => {
                filters[column] = value;
                if (Object.keys(filters).length >= 2) {
                  updateSpy(patch, filters);
                  if (updateResult.count > 0 && currentRecipe && 'ingredients' in patch) {
                    currentRecipe.ingredients = patch.ingredients as Ingredient[];
                  }
                  return Promise.resolve(updateResult);
                }
                return chain;
              },
            };
            return chain;
          },
        };
      }
      return {};
    },
  })),
}));

jest.mock('@/lib/macros/compute', () => ({
  computeRecipeMacros: async (id: string) => {
    if (computeFailure) throw computeFailure;
    return computeSpy(id);
  },
}));

jest.mock('@/lib/macros/match', () => ({
  searchFdc: (q: string, n: number) => searchFdcSpy(q, n),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const {
  searchFdcAction,
  setIngredientMatch,
  setIngredientOverride,
  setIngredientMatches,
  triggerCompute,
} = require('../macros');

beforeEach(() => {
  currentRecipe = null;
  currentSession = null;
  updateSpy.mockClear();
  updateResult = { error: null, count: 1 };
  computeSpy.mockClear();
  computeFailure = null;
  searchFdcSpy.mockClear();
});

const VALID: MacroValues = { kcal: 200, protein_g: 10, fat_g: 8, carbs_g: 20, fiber_g: 2 };
const baseRecipe: Recipe = {
  id: 'r1',
  user_id: 'u1',
  ingredients: [{ amount: 1, unit: 'g', name: 'chicken' }],
};

type Scenario = {
  label: string;
  signedIn: boolean;
  recipe: Recipe | null;
  act: () => Promise<unknown>;
  expect: (result: unknown) => void;
  postAssert?: () => void;
};

describe('macros server actions truth table', () => {
  it.each<Scenario>([
    // ── Auth gating ─────────────────────────────────────────────────────────
    {
      label: 'searchFdcAction without session → error',
      signedIn: false,
      recipe: null,
      act: () => searchFdcAction('chicken breast raw'),
      expect: (r) => expect(r).toEqual({ error: 'Not authenticated' }),
    },
    {
      label: 'searchFdcAction with session → candidates',
      signedIn: true,
      recipe: null,
      act: () => searchFdcAction('chicken breast raw'),
      expect: (r) => expect(r).toHaveProperty('candidates'),
    },
    {
      label: 'triggerCompute without session → error',
      signedIn: false,
      recipe: null,
      act: () => triggerCompute('r1'),
      expect: (r) => expect(r).toEqual({ error: 'Not authenticated' }),
    },
    {
      label: 'triggerCompute returns compute failures',
      signedIn: true,
      recipe: null,
      act: async () => {
        computeFailure = new Error('Macro service unavailable');
        return triggerCompute('r1');
      },
      expect: (r) => expect(r).toEqual({ error: 'Macro service unavailable' }),
    },

    // ── setIngredientMatch stale guard ─────────────────────────────────────
    {
      label: 'setIngredientMatch rejects stale expectedName',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'current' }] },
      act: () => setIngredientMatch('r1', 0, 'stale name', 123),
      expect: (r) => expect(r).toEqual({ error: 'Ingredient changed — please re-open the modal' }),
    },

    {
      label: 'setIngredientMatch returns clear error when update affects no rows after verified read',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'chicken' }] },
      act: async () => {
        updateResult = { error: null, count: 0 };
        return setIngredientMatch('r1', 0, 'chicken', 171477);
      },
      expect: (r) => expect(r).toEqual({ error: 'Recipe update was blocked or stale. Please refresh and try again.' }),
      postAssert: () => expect(computeSpy).not.toHaveBeenCalled(),
    },

    {
      label: 'setIngredientMatch surfaces update failures',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'chicken' }] },
      act: async () => {
        updateResult = { error: { message: 'db down' }, count: 0 };
        return setIngredientMatch('r1', 0, 'chicken', 171477);
      },
      expect: (r) => expect(r).toEqual({ error: 'Failed to update ingredient match: db down' }),
      postAssert: () => expect(computeSpy).not.toHaveBeenCalled(),
    },
    {
      label: 'setIngredientMatch surfaces compute failures',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'chicken' }] },
      act: async () => {
        computeFailure = new Error('Compute crashed');
        return setIngredientMatch('r1', 0, 'chicken', 171477);
      },
      expect: (r) => expect(r).toEqual({ error: 'Compute crashed' }),
    },

    {
      label: 'setIngredientMatch writes fdc_id on name match + triggers compute',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'chicken' }] },
      act: () => setIngredientMatch('r1', 0, 'chicken', 171477),
      expect: (r) => expect(r).toEqual({ ok: true }),
      postAssert: () => {
        expect(computeSpy).toHaveBeenCalledTimes(1);
        expect(updateSpy).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 'r1', user_id: 'u1' }));
      },
    },
    // ── setIngredientOverride validation ───────────────────────────────────
    {
      label: 'override rejects NaN',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'x' }] },
      act: () => setIngredientOverride('r1', 0, 'x', {
        kcal: Number.NaN, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0,
      }),
      expect: (r) => expect(r).toHaveProperty('error'),
    },
    {
      label: 'override rejects Infinity',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'x' }] },
      act: () => setIngredientOverride('r1', 0, 'x', {
        kcal: Infinity, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0,
      }),
      expect: (r) => expect(r).toHaveProperty('error'),
    },
    {
      label: 'override rejects negative',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'x' }] },
      act: () => setIngredientOverride('r1', 0, 'x', {
        kcal: -100, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0,
      }),
      expect: (r) => expect(r).toHaveProperty('error'),
    },
    {
      label: 'override rejects kcal > 900',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'x' }] },
      act: () => setIngredientOverride('r1', 0, 'x', {
        kcal: 1000, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0,
      }),
      expect: (r) => expect(r).toHaveProperty('error'),
    },
    {
      label: 'override rejects fat+carbs+protein > 100',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'x' }] },
      act: () => setIngredientOverride('r1', 0, 'x', {
        kcal: 500, protein_g: 50, fat_g: 30, carbs_g: 25, fiber_g: 5,
      }),
      expect: (r) => expect(r).toHaveProperty('error'),
    },
    {
      label: 'override accepts valid values',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'x' }] },
      act: () => setIngredientOverride('r1', 0, 'x', VALID),
      expect: (r) => expect(r).toEqual({ ok: true }),
    },
    // ── batch: single compute ──────────────────────────────────────────────
    {
      label: 'setIngredientMatches batch → exactly one compute call',
      signedIn: true,
      recipe: {
        ...baseRecipe,
        ingredients: [
          { amount: 1, unit: 'g', name: 'a' },
          { amount: 1, unit: 'g', name: 'b' },
        ],
      },
      act: () =>
        setIngredientMatches('r1', [
          { ingredientIndex: 0, expectedName: 'a', fdcId: 100 },
          { ingredientIndex: 1, expectedName: 'b', fdcId: 200 },
        ]),
      expect: (r) => expect(r).toEqual({ ok: true }),
      postAssert: () => expect(computeSpy).toHaveBeenCalledTimes(1),
    },
    // ── fdc_name + overrideBasis persistence ──────────────────────────────
    {
      label: 'setIngredientMatches persists fdcName alongside fdcId',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 600, unit: 'g', name: 'Beef' }] },
      act: () =>
        setIngredientMatches('r1', [
          {
            ingredientIndex: 0,
            expectedName: 'Beef',
            fdcId: 1001,
            fdcName: 'Beef, ground, 80% lean, raw',
          },
        ]),
      expect: (r) => expect(r).toEqual({ ok: true }),
      postAssert: () => {
        const last = updateSpy.mock.calls.at(-1)?.[0] as { ingredients: Ingredient[] };
        expect(last.ingredients[0].fdc_id).toBe(1001);
        expect(last.ingredients[0].fdc_name).toBe('Beef, ground, 80% lean, raw');
      },
    },
    {
      label: 'setIngredientMatches rejects override without overrideBasis',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 2, unit: 'pieces', name: 'Tomato' }] },
      act: () =>
        setIngredientMatches('r1', [
          {
            ingredientIndex: 0,
            expectedName: 'Tomato',
            override: { kcal: 22, protein_g: 1.1, fat_g: 0.2, carbs_g: 4.8, fiber_g: 1.5 },
            // overrideBasis intentionally missing
          },
        ]),
      expect: (r) => expect(r).toEqual({ error: 'Override basis missing' }),
    },
    {
      label: 'setIngredientMatches accepts per_unit override exceeding the per_100g macro-sum rule',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'piece', name: 'Steak' }] },
      act: () =>
        setIngredientMatches('r1', [
          {
            ingredientIndex: 0,
            expectedName: 'Steak',
            override: { kcal: 600, protein_g: 55, fat_g: 40, carbs_g: 10, fiber_g: 0 },
            overrideBasis: 'per_unit',
          },
        ]),
      expect: (r) => expect(r).toEqual({ ok: true }),
    },
    {
      label: 'setIngredientMatches rejects per_unit override with absurd kcal (>1500)',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'piece', name: 'Whole cake' }] },
      act: () =>
        setIngredientMatches('r1', [
          {
            ingredientIndex: 0,
            expectedName: 'Whole cake',
            override: { kcal: 9999, protein_g: 10, fat_g: 10, carbs_g: 10, fiber_g: 0 },
            overrideBasis: 'per_unit',
          },
        ]),
      expect: (r) => expect(r).toEqual({ error: 'kcal exceeds 1500 per unit (check input)' }),
    },
  ])('macros action → $label', async ({ signedIn, recipe, act, expect: check, postAssert }) => {
    currentSession = signedIn ? { user: { id: 'u1' } } : null;
    currentRecipe = recipe ? JSON.parse(JSON.stringify(recipe)) : null;
    const result = await act();
    check(result);
    if (postAssert) postAssert();
  });
});
