import {
  formatAmount,
  convertUnit,
  processIngredients,
  type UnitSystem,
} from '../scaling';
import type { Ingredient } from '@/types/recipe';

// ── formatAmount ──────────────────────────────────────────────────────────────

describe('formatAmount', () => {
  test.each([
    // [input, expected, why]
    [0,      '0',    'zero'],
    [-1,     '0',    'negative clamps to 0'],
    [10.5,   '10.5', 'boundary: >10 → 1-decimal rounding'],
    [15,     '15',   '>10 integer'],
    [15.07,  '15.1', '>10 rounded to 1 decimal'],
    [1,      '1',    'whole integer'],
    [2,      '2',    'whole integer'],
    [0.5,    '½',    'fraction: half'],
    [0.25,   '¼',    'fraction: quarter'],
    [0.333,  '⅓',    'fraction: third snap'],
    [0.75,   '¾',    'fraction: three-quarters'],
    [0.125,  '⅛',    'fraction: eighth'],
    [1.5,    '1½',   'mixed: 1 and a half'],
    [2.25,   '2¼',   'mixed: 2 and a quarter'],
    [1.01,   '1',    'near-whole collapses to integer'],
    [0.03,   '0',    'tiny value collapses to 0'],
    [0.44,   '0.44', 'unsnappable fraction → decimal'],
  ])('formatAmount(%p) → %p (%s)', (input, expected) => {
    expect(formatAmount(input as number)).toBe(expected);
  });
});

// ── convertUnit ───────────────────────────────────────────────────────────────

describe('convertUnit', () => {
  test('null unit → passthrough', () => {
    expect(convertUnit(100, null, 'imperial')).toEqual({ amount: 100, unit: null });
    expect(convertUnit(100, null, 'metric')).toEqual({ amount: 100, unit: null });
  });

  test('unknown unit → passthrough', () => {
    expect(convertUnit(5, 'tbsp', 'imperial')).toEqual({ amount: 5, unit: 'tbsp' });
    expect(convertUnit(5, 'pinch', 'metric')).toEqual({ amount: 5, unit: 'pinch' });
  });

  test.each<[number, string, UnitSystem, string, number]>([
    // [amount, unit, targetSystem, expectedUnit, expectedAmountApprox]
    [100,    'g',      'imperial', 'oz',    3.527],
    [1000,   'g',      'imperial', 'oz',    35.274],
    [1,      'kg',     'imperial', 'lb',    2.205],
    [500,    'mg',     'imperial', 'oz',    0.0176],
    [250,    'ml',     'imperial', 'fl oz', 8.454],
    [1,      'l',      'imperial', 'cups',  4.227],
    [2,      'oz',     'metric',   'g',     56.699],
    [1,      'lb',     'metric',   'kg',    0.4535],
    [8,      'fl oz',  'metric',   'ml',    236.588],
    [1,      'cup',    'metric',   'ml',    236.588],
    [2,      'cups',   'metric',   'ml',    473.176],
  ])('convertUnit(%p, %p, %p) → %p unit, ~%p amount', (amount, unit, target, expectedUnit, expectedAmt) => {
    const result = convertUnit(amount, unit, target);
    expect(result.unit).toBe(expectedUnit);
    expect(result.amount).toBeCloseTo(expectedAmt, 2);
  });

  test('case-insensitive unit match', () => {
    expect(convertUnit(100, 'G', 'imperial').unit).toBe('oz');
    expect(convertUnit(100, '  G  ', 'imperial').unit).toBe('oz');
  });
});

// ── processIngredients ────────────────────────────────────────────────────────

describe('processIngredients', () => {
  const base: Ingredient[] = [
    { amount: 100, unit: 'g',  name: 'flour'  },
    { amount: 2,   unit: null, name: 'eggs'   },
    { amount: 250, unit: 'ml', name: 'milk'   },
  ];

  test('×1 metric → unchanged amounts, metric units', () => {
    const result = processIngredients(base, 1, 'metric');
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ amount: 100, unit: 'g',  name: 'flour', displayAmount: '100' });
    expect(result[1]).toMatchObject({ amount: 2,   unit: null, name: 'eggs' });
    expect(result[2]).toMatchObject({ amount: 250, unit: 'ml', name: 'milk' });
  });

  test('×2 metric → doubled amounts, metric units', () => {
    const result = processIngredients(base, 2, 'metric');
    expect(result[0].amount).toBe(200);
    expect(result[0].unit).toBe('g');
    expect(result[1].amount).toBe(4);
    expect(result[2].amount).toBe(500);
  });

  test('×0.5 metric → halved amounts', () => {
    const result = processIngredients(base, 0.5, 'metric');
    expect(result[0].amount).toBe(50);
    expect(result[1].amount).toBe(1);
    expect(result[2].amount).toBe(125);
  });

  test('×1 imperial → converts known metric units, keeps null', () => {
    const result = processIngredients(base, 1, 'imperial');
    expect(result[0].unit).toBe('oz');
    expect(result[0].amount).toBeCloseTo(3.527, 2);
    expect(result[1].unit).toBeNull();
    expect(result[1].amount).toBe(2);
    expect(result[2].unit).toBe('fl oz');
    expect(result[2].amount).toBeCloseTo(8.454, 2);
  });

  test('×3.7 imperial → scaling and conversion compose', () => {
    const result = processIngredients(base, 3.7, 'imperial');
    expect(result[0].unit).toBe('oz');
    expect(result[0].amount).toBeCloseTo(100 * 3.7 / 28.3495, 2);
  });

  test('displayAmount renders via formatAmount', () => {
    const single: Ingredient[] = [{ amount: 0.5, unit: null, name: 'tsp salt' }];
    expect(processIngredients(single, 1, 'metric')[0].displayAmount).toBe('½');
  });
});
