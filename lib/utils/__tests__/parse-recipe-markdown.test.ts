import {
  parseRecipeMarkdown,
  parseIngredient,
  parseTimeToMinutes,
  parseStepTimer,
} from '../parse-recipe-markdown';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const FULL_MD = `
# Pasta Carbonara

> A classic Italian pasta dish

**Prep time:** 20 min
**Cook time:** 30 min
**Servings:** 4

## Ingredients
- 200g spaghetti
- 1 tbsp olive oil
- 3 garlic cloves
- 1/2 cup parmesan cheese

## Steps
1. Boil water and cook pasta until al dente.
2. Fry pancetta until crispy. [timer: 5min]
3. Mix eggs and parmesan together.

## Notes
Use fresh eggs for best results.
Can substitute bacon for pancetta.

## Tags
italian, pasta, classic
`.trim();

// ── parseTimeToMinutes ────────────────────────────────────────────────────────

describe('parseTimeToMinutes', () => {
  // Minutes
  test('"20 min"',     () => expect(parseTimeToMinutes('20 min')).toBe(20));
  test('"20 minutes"', () => expect(parseTimeToMinutes('20 minutes')).toBe(20));
  test('"20min"',      () => expect(parseTimeToMinutes('20min')).toBe(20));
  test('"30min"',      () => expect(parseTimeToMinutes('30min')).toBe(30));
  test('"5 minute"',   () => expect(parseTimeToMinutes('5 minute')).toBe(5));

  // Hours
  test('"1 hour"',     () => expect(parseTimeToMinutes('1 hour')).toBe(60));
  test('"1h"',         () => expect(parseTimeToMinutes('1h')).toBe(60));
  test('"1hr"',        () => expect(parseTimeToMinutes('1hr')).toBe(60));
  test('"2 hours"',    () => expect(parseTimeToMinutes('2 hours')).toBe(120));
  test('"1.5h"',       () => expect(parseTimeToMinutes('1.5h')).toBe(90));

  // Mixed
  test('"1h 30min"',   () => expect(parseTimeToMinutes('1h 30min')).toBe(90));
  test('"1 hour 30 minutes"', () => expect(parseTimeToMinutes('1 hour 30 minutes')).toBe(90));

  // Invalid
  test('unrecognized returns undefined', () => expect(parseTimeToMinutes('some text')).toBeUndefined());
  test('empty string returns undefined', () => expect(parseTimeToMinutes('')).toBeUndefined());
});

// ── parseIngredient ───────────────────────────────────────────────────────────

describe('parseIngredient', () => {
  test('"200g spaghetti" — attached unit', () =>
    expect(parseIngredient('200g spaghetti')).toEqual({ amount: '200', unit: 'g', name: 'spaghetti' }));

  test('"1 tbsp olive oil" — spaced unit', () =>
    expect(parseIngredient('1 tbsp olive oil')).toEqual({ amount: '1', unit: 'tbsp', name: 'olive oil' }));

  test('"3 garlic cloves" — no unit', () =>
    expect(parseIngredient('3 garlic cloves')).toEqual({ amount: '3', unit: '', name: 'garlic cloves' }));

  test('"1/2 cup parmesan" — fraction amount', () =>
    expect(parseIngredient('1/2 cup parmesan')).toEqual({ amount: '1/2', unit: 'cup', name: 'parmesan' }));

  test('"1 1/2 cups flour" — mixed fraction', () =>
    expect(parseIngredient('1 1/2 cups flour')).toEqual({ amount: '1 1/2', unit: 'cups', name: 'flour' }));

  test('"2 cloves garlic" — unit before name', () =>
    expect(parseIngredient('2 cloves garlic')).toEqual({ amount: '2', unit: 'cloves', name: 'garlic' }));

  test('"500ml milk" — attached ml unit', () =>
    expect(parseIngredient('500ml milk')).toEqual({ amount: '500', unit: 'ml', name: 'milk' }));

  test('"2 tsp salt" — tsp unit', () =>
    expect(parseIngredient('2 tsp salt')).toEqual({ amount: '2', unit: 'tsp', name: 'salt' }));

  test('"1 pound chicken" — pound unit', () =>
    expect(parseIngredient('1 pound chicken')).toEqual({ amount: '1', unit: 'pound', name: 'chicken' }));

  test('no number — whole string is name', () =>
    expect(parseIngredient('salt to taste')).toEqual({ amount: '', unit: '', name: 'salt to taste' }));

  test('single word ingredient', () =>
    expect(parseIngredient('butter')).toEqual({ amount: '', unit: '', name: 'butter' }));
});

// ── parseStepTimer ────────────────────────────────────────────────────────────

describe('parseStepTimer', () => {
  test('no timer tag → text preserved, no timer_seconds', () => {
    const result = parseStepTimer('Mix well and set aside.');
    expect(result.text).toBe('Mix well and set aside.');
    expect(result.timer_seconds).toBeUndefined();
  });

  test('[timer: 5min] → 300 seconds', () => {
    const result = parseStepTimer('Fry until golden. [timer: 5min]');
    expect(result.text).toBe('Fry until golden.');
    expect(result.timer_seconds).toBe(300);
  });

  test('[timer: 10min] → 600 seconds', () => {
    const result = parseStepTimer('Cook pasta. [timer: 10min]');
    expect(result.text).toBe('Cook pasta.');
    expect(result.timer_seconds).toBe(600);
  });

  test('[timer: 1h] → 3600 seconds', () => {
    const result = parseStepTimer('Slow cook. [timer: 1h]');
    expect(result.timer_seconds).toBe(3600);
  });

  test('[timer: 1h 30min] → 5400 seconds', () => {
    const result = parseStepTimer('Braise. [timer: 1h 30min]');
    expect(result.timer_seconds).toBe(5400);
  });

  test('timer tag stripped from text', () => {
    const result = parseStepTimer('Simmer the sauce. [timer: 20min] Stir occasionally.');
    expect(result.text).not.toContain('[timer:');
  });
});

// ── parseRecipeMarkdown — full recipe ─────────────────────────────────────────

describe('parseRecipeMarkdown — full recipe', () => {
  const parsed = parseRecipeMarkdown(FULL_MD);

  test('title', () => expect(parsed.title).toBe('Pasta Carbonara'));
  test('description', () => expect(parsed.description).toBe('A classic Italian pasta dish'));
  test('prep_time = 20', () => expect(parsed.prep_time).toBe(20));
  test('cook_time = 30', () => expect(parsed.cook_time).toBe(30));
  test('servings = 4', () => expect(parsed.servings).toBe(4));

  test('4 ingredients', () => expect(parsed.ingredients).toHaveLength(4));
  test('ingredient 0 — 200g spaghetti', () =>
    expect(parsed.ingredients[0]).toEqual({ amount: '200', unit: 'g', name: 'spaghetti' }));
  test('ingredient 1 — 1 tbsp olive oil', () =>
    expect(parsed.ingredients[1]).toEqual({ amount: '1', unit: 'tbsp', name: 'olive oil' }));
  test('ingredient 2 — 3 garlic cloves (no unit)', () =>
    expect(parsed.ingredients[2]).toEqual({ amount: '3', unit: '', name: 'garlic cloves' }));
  test('ingredient 3 — 1/2 cup parmesan', () =>
    expect(parsed.ingredients[3]).toEqual({ amount: '1/2', unit: 'cup', name: 'parmesan cheese' }));

  test('3 steps', () => expect(parsed.steps).toHaveLength(3));
  test('step 0 — no timer', () => {
    expect(parsed.steps[0].text).toBe('Boil water and cook pasta until al dente.');
    expect(parsed.steps[0].timer_seconds).toBeUndefined();
  });
  test('step 1 — timer 5min = 300s', () => {
    expect(parsed.steps[1].text).toBe('Fry pancetta until crispy.');
    expect(parsed.steps[1].timer_seconds).toBe(300);
  });
  test('step 2 — no timer', () =>
    expect(parsed.steps[2].text).toBe('Mix eggs and parmesan together.'));

  test('notes contains first line', () =>
    expect(parsed.notes).toContain('Use fresh eggs for best results.'));
  test('notes contains second line', () =>
    expect(parsed.notes).toContain('Can substitute bacon for pancetta.'));

  test('tags = ["italian","pasta","classic"]', () =>
    expect(parsed.tags).toEqual(['italian', 'pasta', 'classic']));
});

// ── parseRecipeMarkdown — missing optional fields ─────────────────────────────

describe('parseRecipeMarkdown — missing optional fields', () => {
  const MINIMAL = '# Simple Recipe\n\n## Ingredients\n- 2 eggs\n\n## Steps\n1. Crack the eggs.';
  const parsed = parseRecipeMarkdown(MINIMAL);

  test('title present', () => expect(parsed.title).toBe('Simple Recipe'));
  test('description undefined', () => expect(parsed.description).toBeUndefined());
  test('prep_time undefined', () => expect(parsed.prep_time).toBeUndefined());
  test('cook_time undefined', () => expect(parsed.cook_time).toBeUndefined());
  test('servings undefined', () => expect(parsed.servings).toBeUndefined());
  test('notes undefined', () => expect(parsed.notes).toBeUndefined());
  test('tags undefined', () => expect(parsed.tags).toBeUndefined());
  test('1 ingredient', () => expect(parsed.ingredients).toHaveLength(1));
  test('1 step', () => expect(parsed.steps).toHaveLength(1));
});

// ── parseRecipeMarkdown — malformed / edge cases ──────────────────────────────

describe('parseRecipeMarkdown — malformed lines', () => {
  test('empty string returns empty result without throwing', () => {
    const parsed = parseRecipeMarkdown('');
    expect(parsed.title).toBe('');
    expect(parsed.ingredients).toHaveLength(0);
    expect(parsed.steps).toHaveLength(0);
  });

  test('only first H1 used as title', () => {
    const parsed = parseRecipeMarkdown('# First\n# Second\n');
    expect(parsed.title).toBe('First');
  });

  test('non-list lines in ## Ingredients are ignored', () => {
    const md = '# T\n## Ingredients\nrandom text\n- 1 egg';
    expect(parseRecipeMarkdown(md).ingredients).toHaveLength(1);
  });

  test('non-ordered lines in ## Steps are ignored', () => {
    const md = '# T\n## Steps\nrandom text\n1. First step';
    expect(parseRecipeMarkdown(md).steps).toHaveLength(1);
  });

  test('malformed prep time leaves prep_time undefined', () => {
    const md = '# T\n**Prep time:** not-a-number\n## Ingredients\n- 1 egg';
    expect(parseRecipeMarkdown(md).prep_time).toBeUndefined();
  });

  test('blockquote after a section is not treated as description', () => {
    const md = '# T\n## Ingredients\n- 1 egg\n> Late blockquote';
    expect(parseRecipeMarkdown(md).description).toBeUndefined();
  });

  test('tags with extra whitespace are trimmed', () => {
    const md = '# T\n## Tags\n  italian ,  pasta ,  classic  ';
    const parsed = parseRecipeMarkdown(md);
    expect(parsed.tags).toEqual(['italian', 'pasta', 'classic']);
  });

  test('multi-line notes are joined with newline', () => {
    const md = '# T\n## Notes\nFirst note.\nSecond note.';
    expect(parseRecipeMarkdown(md).notes).toBe('First note.\nSecond note.');
  });
});
