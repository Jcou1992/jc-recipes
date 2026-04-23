import { createClient } from '@/lib/supabase/server';
import type { Ingredient } from '@/types/recipe';

const MASS_FACTORS: Record<string, number> = {
  g: 1,
  kg: 1000,
  mg: 0.001,
  oz: 28.35,
  lb: 453.6,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  'fl oz': 29.57,
  cup: 240,
  tbsp: 15,
  tsp: 5,
};

const UNIT_ALIASES: Record<string, string> = {
  gram: 'g',
  grams: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  milligram: 'mg',
  milligrams: 'mg',
  ounce: 'oz',
  ounces: 'oz',
  pound: 'lb',
  pounds: 'lb',
  milliliter: 'ml',
  milliliters: 'ml',
  liter: 'l',
  liters: 'l',
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  cups: 'cup',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  piece: 'pieces',
  cloves: 'clove',
  slices: 'slice',
};

const COUNT_UNITS = new Set(['pieces', 'clove', 'slice']);

function normalizeUnit(u: string | null): string | null {
  if (u === null) return null;
  const lower = u.trim().toLowerCase();
  return UNIT_ALIASES[lower] ?? lower;
}

export type ResolveResult = { grams: number } | { unresolved: string };

export async function resolveGrams(ing: Ingredient): Promise<ResolveResult> {
  const unit = normalizeUnit(ing.unit);
  const amount = Number(ing.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return { unresolved: 'invalid amount' };
  }

  if (unit && unit in MASS_FACTORS) {
    return { grams: +(amount * MASS_FACTORS[unit]).toFixed(3) };
  }

  if (unit && unit in VOLUME_TO_ML) {
    if (unit === 'cup' || unit === 'tbsp' || unit === 'tsp') {
      const density = await lookupDensity(ing.name, unit);
      if (density !== null) {
        return { grams: +(amount * density).toFixed(3) };
      }
    }
    const ml = amount * VOLUME_TO_ML[unit];
    return { grams: +ml.toFixed(3) };
  }

  if (unit === null || COUNT_UNITS.has(unit)) {
    const gramsPerItem = await lookupCountWeight(ing.name);
    if (gramsPerItem !== null) {
      return { grams: +(amount * gramsPerItem).toFixed(3) };
    }
    return { unresolved: `no count weight for "${ing.name}"` };
  }

  return { unresolved: `unknown unit "${ing.unit}"` };
}

async function lookupDensity(
  name: string,
  unit: 'cup' | 'tbsp' | 'tsp'
): Promise<number | null> {
  const supabase = await createClient();
  const normalized = name.trim().toLowerCase();
  const { data } = await supabase
    .from('ingredient_densities')
    .select('g_per_cup, g_per_tbsp, g_per_tsp')
    .eq('name', normalized)
    .maybeSingle();
  if (!data) return null;
  const key = unit === 'cup' ? 'g_per_cup' : unit === 'tbsp' ? 'g_per_tbsp' : 'g_per_tsp';
  const v = (data as Record<string, number | null>)[key];
  return v ?? null;
}

async function lookupCountWeight(name: string): Promise<number | null> {
  const supabase = await createClient();
  const normalized = name.trim().toLowerCase();
  const { data } = await supabase
    .from('ingredient_count_weights')
    .select('g_per_item')
    .eq('name', normalized)
    .maybeSingle();
  return (data as { g_per_item: number } | null)?.g_per_item ?? null;
}
