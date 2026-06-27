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
**Serving size label:** 1 bowl

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

// ── parseTimeToMinutes (table-driven) ─────────────────────────────────────────

describe('parseTimeToMinutes', () => {
  test.each<[string, number | undefined]>([
    ['20 min',                20],
    ['20 minutes',            20],
    ['20min',                 20],
    ['30min',                 30],
    ['5 minute',              5],
    ['1 hour',                60],
    ['1h',                    60],
    ['1hr',                   60],
    ['2 hours',               120],
    ['1.5h',                  90],
    ['1h 30min',              90],
    ['1 hour 30 minutes',     90],
    ['some text',             undefined],
    ['',                      undefined],
  ])('parseTimeToMinutes(%p) === %p', (input, expected) => {
    expect(parseTimeToMinutes(input)).toBe(expected);
  });
});

// ── parseIngredient (table-driven) ────────────────────────────────────────────

describe('parseIngredient', () => {
  test.each<[string, { amount: string; unit: string; name: string }]>([
    ['200g spaghetti',         { amount: '200',   unit: 'g',      name: 'spaghetti'      }],
    ['1 tbsp olive oil',       { amount: '1',     unit: 'tbsp',   name: 'olive oil'      }],
    ['3 garlic cloves',        { amount: '3',     unit: '',       name: 'garlic cloves'  }],
    ['1/2 cup parmesan',       { amount: '1/2',   unit: 'cup',    name: 'parmesan'       }],
    ['1 1/2 cups flour',       { amount: '1 1/2', unit: 'cups',   name: 'flour'          }],
    ['2 cloves garlic',        { amount: '2',     unit: 'cloves', name: 'garlic'         }],
    ['500ml milk',             { amount: '500',   unit: 'ml',     name: 'milk'           }],
    ['2 tsp salt',             { amount: '2',     unit: 'tsp',    name: 'salt'           }],
    ['1 pound chicken',        { amount: '1',     unit: 'pound',  name: 'chicken'        }],
    ['salt to taste',          { amount: '',      unit: '',       name: 'salt to taste'  }],
    ['butter',                 { amount: '',      unit: '',       name: 'butter'         }],
  ])('parseIngredient(%p)', (input, expected) => {
    expect(parseIngredient(input)).toEqual(expected);
  });
});

// ── parseStepTimer (table-driven) ─────────────────────────────────────────────

describe('parseStepTimer', () => {
  test.each<[string, string, number | undefined]>([
    // [input, expectedText, expectedTimerSeconds]
    ['Mix well and set aside.',                         'Mix well and set aside.',   undefined],
    ['Fry until golden. [timer: 5min]',                 'Fry until golden.',         300],
    ['Cook pasta. [timer: 10min]',                      'Cook pasta.',               600],
    ['Slow cook. [timer: 1h]',                          'Slow cook.',                3600],
    ['Braise. [timer: 1h 30min]',                       'Braise.',                   5400],
  ])('parseStepTimer(%p)', (input, expectedText, expectedSeconds) => {
    const { text, timer_seconds } = parseStepTimer(input);
    expect(text).toBe(expectedText);
    expect(timer_seconds).toBe(expectedSeconds);
  });

  test('timer tag stripped from middle of text', () => {
    expect(parseStepTimer('Simmer the sauce. [timer: 20min] Stir occasionally.').text).not.toContain('[timer:');
  });
});

// ── parseRecipeMarkdown — full recipe (parsed once, grouped asserts) ──────────

describe('parseRecipeMarkdown — full recipe', () => {
  const parsed = parseRecipeMarkdown(FULL_MD);

  test('metadata: title, description, times, servings', () => {
    expect(parsed.title).toBe('Pasta Carbonara');
    expect(parsed.description).toBe('A classic Italian pasta dish');
    expect(parsed.prep_time).toBe(20);
    expect(parsed.cook_time).toBe(30);
    expect(parsed.servings).toBe(4);
    expect(parsed.serving_size_label).toBe('1 bowl');
  });

  test('ingredients: 4 items parsed with amount/unit/name', () => {
    expect(parsed.ingredients).toHaveLength(4);
    expect(parsed.ingredients[0]).toEqual({ amount: '200', unit: 'g',    name: 'spaghetti'        });
    expect(parsed.ingredients[1]).toEqual({ amount: '1',   unit: 'tbsp', name: 'olive oil'        });
    expect(parsed.ingredients[2]).toEqual({ amount: '3',   unit: '',     name: 'garlic cloves'    });
    expect(parsed.ingredients[3]).toEqual({ amount: '1/2', unit: 'cup',  name: 'parmesan cheese'  });
  });

  test('steps, notes, tags', () => {
    expect(parsed.steps).toHaveLength(3);
    expect(parsed.steps[0].text).toBe('Boil water and cook pasta until al dente.');
    expect(parsed.steps[0].timer_seconds).toBeUndefined();
    expect(parsed.steps[1].text).toBe('Fry pancetta until crispy.');
    expect(parsed.steps[1].timer_seconds).toBe(300);
    expect(parsed.steps[2].text).toBe('Mix eggs and parmesan together.');
    expect(parsed.notes).toContain('Use fresh eggs for best results.');
    expect(parsed.notes).toContain('Can substitute bacon for pancetta.');
    expect(parsed.tags).toEqual(['italian', 'pasta', 'classic']);
  });
});

// ── parseRecipeMarkdown — missing optional fields ─────────────────────────────

describe('parseRecipeMarkdown — missing optional fields', () => {
  const MINIMAL = '# Simple Recipe\n\n## Ingredients\n- 2 eggs\n\n## Steps\n1. Crack the eggs.';
  const parsed = parseRecipeMarkdown(MINIMAL);

  test('only title, ingredients, and steps populated', () => {
    expect(parsed.title).toBe('Simple Recipe');
    expect(parsed.description).toBeUndefined();
    expect(parsed.prep_time).toBeUndefined();
    expect(parsed.cook_time).toBeUndefined();
    expect(parsed.servings).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
    expect(parsed.tags).toBeUndefined();
    expect(parsed.ingredients).toHaveLength(1);
    expect(parsed.steps).toHaveLength(1);
  });
});

// ── parseRecipeMarkdown — malformed / edge cases (each exercises a distinct parser path) ──

describe('parseRecipeMarkdown — malformed lines', () => {
  test('empty string returns empty result without throwing', () => {
    const parsed = parseRecipeMarkdown('');
    expect(parsed.title).toBe('');
    expect(parsed.ingredients).toHaveLength(0);
    expect(parsed.steps).toHaveLength(0);
  });

  test('only first H1 used as title', () => {
    expect(parseRecipeMarkdown('# First\n# Second\n').title).toBe('First');
  });

  test('non-list lines in ## Ingredients are ignored', () => {
    expect(parseRecipeMarkdown('# T\n## Ingredients\nrandom text\n- 1 egg').ingredients).toHaveLength(1);
  });

  test('non-ordered lines in ## Steps are ignored', () => {
    expect(parseRecipeMarkdown('# T\n## Steps\nrandom text\n1. First step').steps).toHaveLength(1);
  });

  test('malformed prep time leaves prep_time undefined', () => {
    expect(parseRecipeMarkdown('# T\n**Prep time:** not-a-number\n## Ingredients\n- 1 egg').prep_time).toBeUndefined();
  });

  test('blockquote after a section is not treated as description', () => {
    expect(parseRecipeMarkdown('# T\n## Ingredients\n- 1 egg\n> Late blockquote').description).toBeUndefined();
  });

  test('tags with extra whitespace are trimmed', () => {
    expect(parseRecipeMarkdown('# T\n## Tags\n  italian ,  pasta ,  classic  ').tags).toEqual(['italian', 'pasta', 'classic']);
  });

  test('multi-line notes are joined with newline', () => {
    expect(parseRecipeMarkdown('# T\n## Notes\nFirst note.\nSecond note.').notes).toBe('First note.\nSecond note.');
  });

  test('serving_size_label > 40 chars is rejected; <= 40 is accepted', () => {
    const ok = parseRecipeMarkdown('# T\n**Serving size label:** 1 large burger with toppings\n## Ingredients\n- 1 egg');
    expect(ok.serving_size_label).toBe('1 large burger with toppings');

    const tooLong = 'x'.repeat(41);
    const bad = parseRecipeMarkdown(`# T\n**Serving size label:** ${tooLong}\n## Ingredients\n- 1 egg`);
    expect(bad.serving_size_label).toBeUndefined();
  });
});
