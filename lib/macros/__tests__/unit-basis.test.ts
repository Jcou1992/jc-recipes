import { inferBasisForUnit, basisLabel } from '../unit-basis';

describe('inferBasisForUnit', () => {
  test.each([
    [null, 'per_unit'],
    ['pieces', 'per_unit'],
    ['piece', 'per_unit'],
    ['clove', 'per_unit'],
    ['cloves', 'per_unit'],
    ['slice', 'per_unit'],
    ['tbsp', 'per_unit'],
    ['tsp', 'per_unit'],
    ['tablespoon', 'per_unit'],
    ['cup', 'per_unit'],
    ['cups', 'per_unit'],
    ['can', 'per_unit'],
    ['bottle', 'per_unit'],
    ['packet', 'per_unit'],
    ['g', 'per_100g'],
    ['kg', 'per_100g'],
    ['oz', 'per_100g'],
    ['lb', 'per_100g'],
    ['ml', 'per_100g'],
    ['l', 'per_100g'],
    ['', 'per_100g'],
    ['unknown-unit', 'per_100g'],
  ])('unit %p → basis %p', (unit, basis) => {
    expect(inferBasisForUnit(unit)).toBe(basis);
  });

  test('case-insensitive, trims whitespace', () => {
    expect(inferBasisForUnit('  PIECES  ')).toBe('per_unit');
    expect(inferBasisForUnit('TBSP')).toBe('per_unit');
  });
});

describe('basisLabel', () => {
  test.each([
    [null, 'per_100g', 'Per 100 g'],
    ['g', 'per_100g', 'Per 100 g'],
    ['ml', 'per_100g', 'Per 100 g'],
    [null, 'per_unit', 'Per 1 piece'],
    ['pieces', 'per_unit', 'Per 1 piece'],
    ['piece', 'per_unit', 'Per 1 piece'],
    ['cloves', 'per_unit', 'Per 1 clove'],
    ['slices', 'per_unit', 'Per 1 slice'],
    ['tbsp', 'per_unit', 'Per 1 tbsp'],
    ['tablespoons', 'per_unit', 'Per 1 tablespoon'],
    ['cup', 'per_unit', 'Per 1 cup'],
    ['cups', 'per_unit', 'Per 1 cup'],
    ['cans', 'per_unit', 'Per 1 can'],
  ])('unit %p basis %p → %p', (unit, basis, expected) => {
    expect(basisLabel(unit, basis as 'per_100g' | 'per_unit')).toBe(expected);
  });
});
