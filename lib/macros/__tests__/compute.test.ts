/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { Ingredient, MacroValues } from '@/types/recipe';

type RecipeRow = { id: string; servings: number; ingredients: Ingredient[] };
let currentRecipe: RecipeRow | null = null;
let nutritionFacts: Record<number, MacroValues> = {};
let autoMatchMap: Record<string, number | null> = {};
let resolveGramsImpl: (ing: Ingredient) => Promise<{ grams: number } | { unresolved: string }> = async (ing) => {
  const amt = Number(ing.amount);
  if (!Number.isFinite(amt)) return { unresolved: 'bad amount' };
  if (ing.unit === 'g') return { grams: amt };
  if (ing.unit === null) return { unresolved: `no count weight for "${ing.name}"` };
  return { grams: amt };
};

const updateSpy = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: (table: string) => {
      if (table === 'recipes') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: currentRecipe, error: null }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async () => {
              updateSpy(patch);
              return { error: null };
            },
          }),
        };
      }
      if (table === 'nutrition_facts') {
        return {
          select: () => ({
            eq: (_col: string, val: number) => ({
              maybeSingle: async () => ({ data: nutritionFacts[val] ?? null }),
            }),
          }),
        };
      }
      return {};
    },
  })),
}));

jest.mock('../unit-to-grams', () => ({
  resolveGrams: (ing: Ingredient) => resolveGramsImpl(ing),
}));

jest.mock('../match', () => ({
  autoMatch: async (name: string) => autoMatchMap[name] ?? null,
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { computeRecipeMacros } = require('../compute');

beforeEach(() => {
  currentRecipe = null;
  nutritionFacts = {};
  autoMatchMap = {};
  updateSpy.mockClear();
});

type Case = {
  label: string;
  recipe: RecipeRow;
  facts: Record<number, MacroValues>;
  autoMatches?: Record<string, number | null>;
  check: (result: { kcal: number; matched_count: number; total_count: number; unresolved_ingredients: unknown[] } | null) => void;
};

const CHICKEN: MacroValues = { kcal: 165, protein_g: 31, fat_g: 3.6, carbs_g: 0, fiber_g: 0 };
const RICE: MacroValues    = { kcal: 130, protein_g: 2.7, fat_g: 0.3, carbs_g: 28, fiber_g: 0.4 };
const CUSTOM_HIGH: MacroValues = { kcal: 999, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 };
const OVERRIDE: MacroValues = { kcal: 100, protein_g: 10, fat_g: 5, carbs_g: 2, fiber_g: 1 };

describe('computeRecipeMacros truth table', () => {
  it.each<Case>([
    {
      label: 'sums matched ingredients scaled by grams/100',
      recipe: {
        id: 'r1',
        servings: 4,
        ingredients: [
          { amount: 500, unit: 'g', name: 'chicken breast', fdc_id: 171477 },
          { amount: 200, unit: 'g', name: 'rice', fdc_id: 169704 },
        ],
      },
      facts: { 171477: CHICKEN, 169704: RICE },
      check: (r) => {
        expect(r!.kcal).toBeCloseTo((500 / 100) * 165 + (200 / 100) * 130, 1);
        expect(r!.matched_count).toBe(2);
        expect(r!.total_count).toBe(2);
        expect(r!.unresolved_ingredients).toHaveLength(0);
      },
    },
    {
      label: 'override wins over fdc_id',
      recipe: {
        id: 'r2',
        servings: 1,
        ingredients: [
          { amount: 100, unit: 'g', name: 'custom', fdc_id: 99999, macros_override: OVERRIDE },
        ],
      },
      facts: { 99999: CUSTOM_HIGH },
      check: (r) => {
        expect(r!.kcal).toBe(100);
        expect(r!.matched_count).toBe(1);
      },
    },
    {
      label: 'partial match: unmatched surfaces in unresolved[]',
      recipe: {
        id: 'r3',
        servings: 2,
        ingredients: [
          { amount: 500, unit: 'g', name: 'chicken', fdc_id: 171477 },
          { amount: 1, unit: null, name: 'mystery herb' },
        ],
      },
      facts: { 171477: CHICKEN },
      check: (r) => {
        expect(r!.matched_count).toBe(1);
        expect(r!.total_count).toBe(2);
        expect(r!.unresolved_ingredients).toHaveLength(1);
      },
    },
    {
      label: 'amount change recomputes grams (no stale cache)',
      recipe: {
        id: 'r4',
        servings: 1,
        ingredients: [{ amount: 1000, unit: 'g', name: 'chicken', fdc_id: 171477 }],
      },
      facts: { 171477: CHICKEN },
      check: (r) => {
        expect(r!.kcal).toBeCloseTo(1650, 1);
      },
    },
    {
      label: 'autoMatch hit stamps fdc_id into persisted ingredients',
      recipe: {
        id: 'r5',
        servings: 1,
        ingredients: [{ amount: 100, unit: 'g', name: 'chicken breast raw fresh' }],
      },
      facts: { 171477: CHICKEN },
      autoMatches: { 'chicken breast raw fresh': 171477 },
      check: (r) => {
        expect(r!.matched_count).toBe(1);
        expect(r!.kcal).toBeCloseTo(165, 1);
      },
    },
    {
      label: 'ingredient with no match, no fdc_id, no override → unresolved',
      recipe: {
        id: 'r6',
        servings: 1,
        ingredients: [{ amount: 50, unit: 'g', name: 'alien spice' }],
      },
      facts: {},
      autoMatches: { 'alien spice': null },
      check: (r) => {
        expect(r!.matched_count).toBe(0);
        expect(r!.unresolved_ingredients).toHaveLength(1);
      },
    },
  ])('computeRecipeMacros → $label', async ({ recipe, facts, autoMatches, check }) => {
    currentRecipe = recipe;
    nutritionFacts = facts;
    autoMatchMap = autoMatches ?? {};
    const result = await computeRecipeMacros(recipe.id);
    check(result);
  });
});
