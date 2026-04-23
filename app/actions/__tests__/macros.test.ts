/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Ingredient, MacroValues } from '@/types/recipe';

type Recipe = { id: string; user_id: string; ingredients: Ingredient[] };
let currentRecipe: Recipe | null = null;
let currentSession: { user: { id: string } } | null = null;
const updateSpy = jest.fn();
const computeSpy = jest.fn(async (_id: string) => null);
const searchFdcSpy = jest.fn(async (_q: string, _n: number) => [
  { fdc_id: 100, name: 'stub match', similarity: 0.9 },
]);

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    auth: {
      getSession: async () => ({ data: { session: currentSession } }),
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
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              updateSpy(patch);
              if (currentRecipe && 'ingredients' in patch) {
                currentRecipe.ingredients = patch.ingredients as Ingredient[];
              }
              return { error: null };
            },
          }),
        };
      }
      return {};
    },
  })),
}));

jest.mock('@/lib/macros/compute', () => ({
  computeRecipeMacros: (id: string) => computeSpy(id),
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
  computeSpy.mockClear();
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
    // ── setIngredientMatch stale guard ─────────────────────────────────────
    {
      label: 'setIngredientMatch rejects stale expectedName',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'current' }] },
      act: () => setIngredientMatch('r1', 0, 'stale name', 123),
      expect: (r) => expect(r).toEqual({ error: 'Ingredient changed — please re-open the modal' }),
    },
    {
      label: 'setIngredientMatch writes fdc_id on name match + triggers compute',
      signedIn: true,
      recipe: { ...baseRecipe, ingredients: [{ amount: 1, unit: 'g', name: 'chicken' }] },
      act: () => setIngredientMatch('r1', 0, 'chicken', 171477),
      expect: (r) => expect(r).toEqual({ ok: true }),
      postAssert: () => expect(computeSpy).toHaveBeenCalledTimes(1),
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
  ])('macros action → $label', async ({ signedIn, recipe, act, expect: check, postAssert }) => {
    currentSession = signedIn ? { user: { id: 'u1' } } : null;
    currentRecipe = recipe ? JSON.parse(JSON.stringify(recipe)) : null;
    const result = await act();
    check(result);
    if (postAssert) postAssert();
  });
});
