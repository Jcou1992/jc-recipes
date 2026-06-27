import {
  recipeToMarkdown,
  recipesToMarkdown,
  triggerDownload,
} from '../export-recipes';
import { parseRecipeMarkdown } from '../parse-recipe-markdown';
import type { Recipe } from '@/types/recipe';

// Non-roundtripping DB fields — placeholders, ignored by parseRecipeMarkdown.
const META = {
  id: 'r-1',
  user_id: 'u-1',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  photos: null,
  serving_size_label: null,
  macros: null,
  macros_computed_at: null,
} as const;

const FULL: Recipe = {
  ...META,
  name: 'Pasta Carbonara',
  description: 'A classic Italian pasta dish',
  servings: 4,
  prep_time: 20,
  cook_time: 30,
  ingredients: [
    { amount: 200, unit: 'g',    name: 'spaghetti'       },
    { amount: 1,   unit: 'tbsp', name: 'olive oil'       },
    { amount: 3,   unit: null,   name: 'garlic cloves'   },
  ],
  steps: [
    { order: 0, content: 'Boil water and cook pasta.', timer_seconds: null },
    { order: 1, content: 'Fry pancetta.',              timer_seconds: 300  },
    { order: 2, content: 'Mix eggs and parmesan.',     timer_seconds: null },
  ],
  notes: 'Use fresh eggs.',
  tags: ['italian', 'pasta'],
};

const MINIMAL: Recipe = {
  ...META,
  name: 'Boiled Egg',
  description: null,
  servings: 1,
  prep_time: null,
  cook_time: null,
  ingredients: [{ amount: 1, unit: null, name: 'egg' }],
  steps: [{ order: 0, content: 'Boil it.', timer_seconds: null }],
  notes: null,
  tags: null,
};

// ── recipeToMarkdown structure ────────────────────────────────────────────────

describe('recipeToMarkdown', () => {
  test('full recipe includes every section in expected order', () => {
    const md = recipeToMarkdown(FULL);
    expect(md).toMatch(/^# Pasta Carbonara/);
    const idx = (s: string) => md.indexOf(s);
    expect(idx('> A classic')).toBeLessThan(idx('**Prep time:**'));
    expect(idx('**Prep time:**')).toBeLessThan(idx('## Ingredients'));
    expect(idx('## Ingredients')).toBeLessThan(idx('## Steps'));
    expect(idx('## Steps')).toBeLessThan(idx('## Notes'));
    expect(idx('## Notes')).toBeLessThan(idx('## Tags'));
  });

  test('minimal recipe omits optional sections', () => {
    const md = recipeToMarkdown(MINIMAL);
    expect(md).toMatch(/^# Boiled Egg/);
    expect(md).not.toContain('> ');
    expect(md).not.toContain('**Prep time:**');
    expect(md).not.toContain('**Cook time:**');
    expect(md).not.toContain('## Notes');
    expect(md).not.toContain('## Tags');
  });

  test('integer amounts render without decimal, fractional amounts use 2dp', () => {
    const r: Recipe = {
      ...MINIMAL,
      name: 'Amounts',
      ingredients: [
        { amount: 2,    unit: null, name: 'whole'  },
        { amount: 1.5,  unit: 'g',  name: 'decimal' },
        { amount: 0.333, unit: null, name: 'third'  },
      ],
    };
    const md = recipeToMarkdown(r);
    expect(md).toContain('- 2 whole');
    expect(md).toContain('- 1.5 g decimal');
    expect(md).toContain('- 0.33 third');
  });

  test('step with timer renders [timer: Nmin] suffix', () => {
    const md = recipeToMarkdown(FULL);
    expect(md).toContain('2. Fry pancetta. [timer: 5min]');
    expect(md).toContain('1. Boil water and cook pasta.');
    expect(md).not.toMatch(/1\..*\[timer:/);
  });

  test('steps sorted by order field, not array position', () => {
    const r: Recipe = {
      ...MINIMAL,
      name: 'Ordered',
      steps: [
        { order: 2, content: 'Third.',  timer_seconds: null },
        { order: 0, content: 'First.',  timer_seconds: null },
        { order: 1, content: 'Second.', timer_seconds: null },
      ],
    };
    const md = recipeToMarkdown(r);
    expect(md.indexOf('First.')).toBeLessThan(md.indexOf('Second.'));
    expect(md.indexOf('Second.')).toBeLessThan(md.indexOf('Third.'));
  });
});

// ── Round-trip: recipeToMarkdown → parseRecipeMarkdown ───────────────────────

describe('recipeToMarkdown + parseRecipeMarkdown round-trip', () => {
  test('full recipe preserves all user-visible fields', () => {
    const parsed = parseRecipeMarkdown(recipeToMarkdown(FULL));
    expect(parsed.title).toBe('Pasta Carbonara');
    expect(parsed.description).toBe('A classic Italian pasta dish');
    expect(parsed.prep_time).toBe(20);
    expect(parsed.cook_time).toBe(30);
    expect(parsed.servings).toBe(4);
    expect(parsed.ingredients).toHaveLength(3);
    expect(parsed.steps).toHaveLength(3);
    expect(parsed.steps[1].timer_seconds).toBe(300);
    expect(parsed.notes).toContain('Use fresh eggs');
    expect(parsed.tags).toEqual(['italian', 'pasta']);
  });

  test('minimal recipe preserves title + ingredients + steps', () => {
    const parsed = parseRecipeMarkdown(recipeToMarkdown(MINIMAL));
    expect(parsed.title).toBe('Boiled Egg');
    expect(parsed.ingredients).toHaveLength(1);
    expect(parsed.steps).toHaveLength(1);
    expect(parsed.description).toBeUndefined();
    expect(parsed.prep_time).toBeUndefined();
    expect(parsed.cook_time).toBeUndefined();
  });
});

// ── recipesToMarkdown ─────────────────────────────────────────────────────────

describe('recipesToMarkdown', () => {
  test('empty list → empty string', () => {
    expect(recipesToMarkdown([])).toBe('');
  });

  test('single recipe → identical to recipeToMarkdown', () => {
    expect(recipesToMarkdown([MINIMAL])).toBe(recipeToMarkdown(MINIMAL));
  });

  test('multiple recipes → joined with --- separator', () => {
    const out = recipesToMarkdown([MINIMAL, FULL]);
    expect(out).toContain('\n\n---\n\n');
    expect(out.indexOf('# Boiled Egg')).toBeLessThan(out.indexOf('# Pasta Carbonara'));
  });
});

// ── triggerDownload ───────────────────────────────────────────────────────────

describe('triggerDownload', () => {
  test('no-op when window is undefined (SSR)', () => {
    // Jest node env → window undefined → function returns without throwing.
    expect(() => triggerDownload('x', 'x.md')).not.toThrow();
  });
});
