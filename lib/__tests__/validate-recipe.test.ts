/**
 * @jest-environment node
 */
import { describe, expect, it } from '@jest/globals';
import { validateRecipePayload } from '@/lib/validate-recipe';
import type { RecipePayload } from '@/types/recipe';

function validPayload(overrides: Partial<RecipePayload> = {}): RecipePayload {
  return {
    name: 'Test Recipe',
    ingredients: [{ amount: 1, unit: 'cup', name: 'Flour' }],
    steps: [{ order: 1, content: 'Mix everything.', timer_seconds: null }],
    servings: 4,
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

describe('validateRecipePayload', () => {
  it('accepts a valid payload', () => {
    expect(validateRecipePayload(validPayload())).toBeNull();
  });

  it.each([
    ['null payload', null],
    ['blank name', { name: '   ' }],
    ['name over 200 chars', { name: 'x'.repeat(201) }],
    ['zero servings', { servings: 0 }],
    ['fractional servings', { servings: 1.5 }],
    ['servings over 999', { servings: 1000 }],
    ['negative prep time', { prep_time: -1 }],
    ['prep time over 1440', { prep_time: 1441 }],
    ['negative cook time', { cook_time: -1 }],
    ['cook time over 1440', { cook_time: 1441 }],
    ['description over 5000 chars', { description: 'x'.repeat(5001) }],
    ['notes over 5000 chars', { notes: 'x'.repeat(5001) }],
    ['serving_size_label over 40 chars', { serving_size_label: 'x'.repeat(41) }],
    ['more than 20 tags', { tags: Array.from({ length: 21 }, (_, i) => `tag-${i}`) }],
    ['tag over 32 chars', { tags: ['x'.repeat(33)] }],
    ['more than 10 photos', { photos: Array.from({ length: 11 }, (_, i) => `photo-${i}`) }],
    ['blank photo', { photos: [' '] }],
    ['more than 100 ingredients', { ingredients: Array.from({ length: 101 }, () => ({ amount: 1, unit: null, name: 'Salt' })) }],
    ['negative ingredient amount', { ingredients: [{ amount: -1, unit: null, name: 'Salt' }] }],
    ['ingredient amount over 1e6', { ingredients: [{ amount: 1_000_001, unit: null, name: 'Salt' }] }],
    ['ingredient unit over 32 chars', { ingredients: [{ amount: 1, unit: 'x'.repeat(33), name: 'Salt' }] }],
    ['blank ingredient name', { ingredients: [{ amount: 1, unit: null, name: ' ' }] }],
    ['ingredient name over 200 chars', { ingredients: [{ amount: 1, unit: null, name: 'x'.repeat(201) }] }],
    ['non-positive fdc id', { ingredients: [{ amount: 1, unit: null, name: 'Salt', fdc_id: 0 }] }],
    ['negative macro override', { ingredients: [{ amount: 1, unit: null, name: 'Salt', macros_override: { kcal: -1, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 } }] }],
    ['more than 100 steps', { steps: Array.from({ length: 101 }, (_, i) => ({ order: i + 1, content: 'Stir.', timer_seconds: null })) }],
    ['fractional step order', { steps: [{ order: 1.5, content: 'Stir.', timer_seconds: null }] }],
    ['blank step content', { steps: [{ order: 1, content: ' ', timer_seconds: null }] }],
    ['step content over 2000 chars', { steps: [{ order: 1, content: 'x'.repeat(2001), timer_seconds: null }] }],
    ['negative timer', { steps: [{ order: 1, content: 'Stir.', timer_seconds: -1 }] }],
    ['timer over 86400', { steps: [{ order: 1, content: 'Stir.', timer_seconds: 86401 }] }],
  ])('rejects %s', (_label, overrides) => {
    const payload = overrides === null
      ? null as unknown as RecipePayload
      : validPayload(overrides as Partial<RecipePayload>);
    expect(validateRecipePayload(payload)).toEqual({
      error: expect.any(String),
    });
  });

  it('accepts documented upper boundaries', () => {
    expect(validateRecipePayload(validPayload({
      name: 'x'.repeat(200),
      servings: 999,
      prep_time: 1440,
      cook_time: 1440,
      description: 'x'.repeat(5000),
      notes: 'x'.repeat(5000),
      tags: Array.from({ length: 20 }, (_, i) => `tag-${i}`),
      photos: Array.from({ length: 10 }, (_, i) => `photo-${i}`),
      ingredients: Array.from({ length: 100 }, () => ({
        amount: 1_000_000,
        unit: 'x'.repeat(32),
        name: 'x'.repeat(200),
        fdc_id: 1,
        macros_override: { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0 },
      })),
      steps: Array.from({ length: 100 }, (_, i) => ({
        order: i + 1,
        content: 'x'.repeat(2000),
        timer_seconds: 86400,
      })),
    }))).toBeNull();
  });
});
