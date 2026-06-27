const PER_UNIT_UNITS = new Set<string>([
  'pieces', 'piece',
  'clove', 'cloves',
  'slice', 'slices',
  'tbsp', 'tsp',
  'tablespoon', 'tablespoons',
  'teaspoon', 'teaspoons',
  'cup', 'cups',
  'can', 'cans',
  'bottle', 'bottles',
  'packet', 'packets',
]);

export type MacrosBasis = 'per_100g' | 'per_unit';

export function inferBasisForUnit(unit: string | null): MacrosBasis {
  if (unit === null) return 'per_unit';
  const norm = unit.trim().toLowerCase();
  if (norm === '') return 'per_100g';
  return PER_UNIT_UNITS.has(norm) ? 'per_unit' : 'per_100g';
}

export function basisLabel(unit: string | null, basis: MacrosBasis): string {
  if (basis === 'per_100g') return 'Per 100 g';
  const norm = unit?.trim().toLowerCase() ?? null;
  if (norm === null || norm === '' || norm === 'pieces' || norm === 'piece') {
    return 'Per 1 piece';
  }
  const singular = norm.endsWith('s') ? norm.slice(0, -1) : norm;
  return `Per 1 ${singular}`;
}
