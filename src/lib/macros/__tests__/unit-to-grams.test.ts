/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const densityRows = new Map<string, { g_per_cup: number | null; g_per_tbsp: number | null; g_per_tsp: number | null }>();
const countRows = new Map<string, { g_per_item: number }>();

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, val: string) => ({
          maybeSingle: async () => {
            if (table === 'ingredient_densities') {
              return { data: densityRows.get(val) ?? null };
            }
            if (table === 'ingredient_count_weights') {
              return { data: countRows.get(val) ?? null };
            }
            return { data: null };
          },
        }),
      }),
    }),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { resolveGrams } = require('../unit-to-grams');

beforeEach(() => {
  densityRows.clear();
  countRows.clear();
  densityRows.set('all-purpose flour', { g_per_cup: 125, g_per_tbsp: 8, g_per_tsp: 2.6 });
  countRows.set('egg', { g_per_item: 50 });
  countRows.set('garlic clove', { g_per_item: 5 });
});

type Cell = { grams: number } | 'unresolved';

describe('resolveGrams truth table', () => {
  it.each([
    // mass
    ['g direct',                       { amount: 500, unit: 'g',  name: 'chicken' },              { grams: 500 }],
    ['kg → g',                         { amount: 1.5, unit: 'kg', name: 'flour' },                { grams: 1500 }],
    ['mg → g',                         { amount: 500, unit: 'mg', name: 'salt' },                 { grams: 0.5 }],
    ['oz → g',                         { amount: 10,  unit: 'oz', name: 'butter' },               { grams: 283.5 }],
    ['lb → g',                         { amount: 1,   unit: 'lb', name: 'beef' },                 { grams: 453.6 }],
    // volume default density 1.0
    ['ml default 1.0',                 { amount: 240, unit: 'ml',    name: 'stock' },             { grams: 240 }],
    ['l default 1.0',                  { amount: 1,   unit: 'l',     name: 'stock' },             { grams: 1000 }],
    ['fl oz at 29.57 ml/floz',         { amount: 8,   unit: 'fl oz', name: 'stock' },             { grams: 236.56 }],
    // density lookup with fallback
    ['cup flour via density table',    { amount: 2, unit: 'cup', name: 'all-purpose flour' },    { grams: 250 }],
    ['cup unknown → 240 ml fallback',  { amount: 1, unit: 'cup', name: 'unknown sauce' },        { grams: 240 }],
    // count
    ['pieces via count-weight',        { amount: 2, unit: 'pieces', name: 'egg' },                { grams: 100 }],
    ['null unit as countable',         { amount: 3, unit: null,     name: 'garlic clove' },      { grams: 15 }],
    // aliases + case
    ['tablespoon alias → tbsp',        { amount: 1,   unit: 'tablespoon', name: 'unknown' },      { grams: 15 }],
    ['teaspoons alias plural → tsp',   { amount: 2,   unit: 'teaspoons',  name: 'unknown' },      { grams: 10 }],
    ['case-insensitive unit G',        { amount: 100, unit: 'G',          name: 'x' },            { grams: 100 }],
    // unresolved paths
    ['unknown count ingredient',       { amount: 2, unit: 'pieces', name: 'dragon fruit jam' },  'unresolved' as Cell],
    ['NaN amount',                     { amount: Number.NaN, unit: 'g', name: 'x' },             'unresolved' as Cell],
    ['unknown unit bushel',            { amount: 1, unit: 'bushel', name: 'apple' },             'unresolved' as Cell],
  ] as const)('resolves %s', async (_label, input, expected) => {
    const result = await resolveGrams(input);
    if (expected === 'unresolved') {
      expect(result).toHaveProperty('unresolved');
    } else {
      expect(result).toEqual(expected);
    }
  });
});
