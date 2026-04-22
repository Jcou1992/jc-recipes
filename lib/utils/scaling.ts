/**
 * Pure serving-scaling and unit-conversion helpers.
 * Extracted from components/recipes/RecipeDetailClient.tsx so the logic
 * can be unit-tested directly without driving the DOM.
 */
import type { Ingredient } from '@/types/recipe';

// ── Fraction rendering ────────────────────────────────────────────────────────

export const FRACTIONS: Array<[number, string]> = [
  [1 / 8,  '⅛'],
  [1 / 4,  '¼'],
  [1 / 3,  '⅓'],
  [3 / 8,  '⅜'],
  [1 / 2,  '½'],
  [5 / 8,  '⅝'],
  [2 / 3,  '⅔'],
  [3 / 4,  '¾'],
  [7 / 8,  '⅞'],
];

export function snapFraction(n: number): string | null {
  const TOLERANCE = 0.05;
  for (const [val, sym] of FRACTIONS) {
    if (Math.abs(n - val) < TOLERANCE) return sym;
  }
  return null;
}

export function formatAmount(n: number): string {
  if (n <= 0) return '0';
  if (n > 10) return String(Math.round(n * 10) / 10);
  const whole = Math.floor(n);
  const frac  = n - whole;
  const fracStr = snapFraction(frac);
  if (frac < 0.05) return whole === 0 ? '0' : String(whole);
  if (fracStr) return whole === 0 ? fracStr : `${whole}${fracStr}`;
  return String(Math.round(n * 100) / 100);
}

// ── Unit conversion ───────────────────────────────────────────────────────────

export type UnitSystem = 'metric' | 'imperial';

export interface ConvertedIngredient {
  amount: number;
  unit: string | null;
  name: string;
  displayAmount: string;
}

export const METRIC_TO_IMPERIAL: Record<string, { factor: number; toUnit: string }> = {
  g:   { factor: 1 / 28.3495,  toUnit: 'oz'    },
  kg:  { factor: 2.20462,      toUnit: 'lb'     },
  mg:  { factor: 1 / 28349.5,  toUnit: 'oz'     },
  ml:  { factor: 1 / 29.5735,  toUnit: 'fl oz'  },
  l:   { factor: 4.22675,      toUnit: 'cups'   },
  dl:  { factor: 3.38140,      toUnit: 'fl oz'  },
};

export const IMPERIAL_TO_METRIC: Record<string, { factor: number; toUnit: string }> = {
  oz:      { factor: 28.3495,    toUnit: 'g'  },
  lb:      { factor: 1 / 2.20462, toUnit: 'kg' },
  'fl oz': { factor: 29.5735,    toUnit: 'ml' },
  cup:     { factor: 236.588,    toUnit: 'ml' },
  cups:    { factor: 236.588,    toUnit: 'ml' },
};

export function convertUnit(
  amount: number,
  unit: string | null,
  targetSystem: UnitSystem,
): { amount: number; unit: string | null } {
  if (!unit) return { amount, unit };
  const u = unit.trim().toLowerCase();
  if (targetSystem === 'imperial') {
    const conv = METRIC_TO_IMPERIAL[u];
    if (conv) return { amount: amount * conv.factor, unit: conv.toUnit };
  } else {
    const conv = IMPERIAL_TO_METRIC[u];
    if (conv) return { amount: amount * conv.factor, unit: conv.toUnit };
  }
  return { amount, unit };
}

export function processIngredients(
  ingredients: Ingredient[],
  multiplier: number,
  unitSystem: UnitSystem,
): ConvertedIngredient[] {
  return ingredients.map(ing => {
    const scaled = ing.amount * multiplier;
    const { amount: converted, unit } = convertUnit(scaled, ing.unit, unitSystem);
    return {
      amount: converted,
      unit,
      name: ing.name,
      displayAmount: formatAmount(converted),
    };
  });
}
