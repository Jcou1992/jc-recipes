// Pure markdown → recipe parser. No side effects.

export interface ParsedIngredient {
  amount: string;
  unit: string;
  name: string;
}

export interface ParsedStep {
  text: string;
  timer_seconds?: number;
}

export interface ParsedRecipe {
  title: string;
  description?: string;
  prep_time?: number;   // minutes
  cook_time?: number;   // minutes
  servings?: number;
  ingredients: ParsedIngredient[];
  steps: ParsedStep[];
  notes?: string;
  tags?: string[];
}

// ── Time parsing ────────────────────────────────────────────────────────────

export function parseTimeToMinutes(str: string): number | undefined {
  const s = str.trim().toLowerCase();
  let total = 0;
  let found = false;

  // "1 hour", "2 hours", "1h", "1hr", "1hrs", "1.5h"
  const hourRe = /(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?(?!\w)/g;
  let m: RegExpExecArray | null;
  while ((m = hourRe.exec(s)) !== null) {
    total += parseFloat(m[1]) * 60;
    found = true;
  }

  // "20 min", "20 minutes", "20min", "30 minute"
  const minRe = /(\d+(?:\.\d+)?)\s*min(?:utes?)?(?!\w)/g;
  while ((m = minRe.exec(s)) !== null) {
    total += parseFloat(m[1]);
    found = true;
  }

  return found ? Math.round(total) : undefined;
}

// ── Timer tag in steps ───────────────────────────────────────────────────────

export function parseStepTimer(text: string): ParsedStep {
  const timerRe = /\[timer:\s*([^\]]+)\]/i;
  const match = text.match(timerRe);
  if (!match) return { text: text.trim() };

  const minutes = parseTimeToMinutes(match[1].trim());
  return {
    text: text.replace(timerRe, '').trim(),
    ...(minutes !== undefined ? { timer_seconds: minutes * 60 } : {}),
  };
}

// ── Ingredient parsing ───────────────────────────────────────────────────────

// Known units — longest variants first to avoid prefix conflicts in alternation.
const UNITS: string[] = [
  'tablespoons', 'tablespoon',
  'teaspoons', 'teaspoon',
  'tbsp', 'tsp',
  'fluid ounces', 'fluid ounce', 'fl oz',
  'ounces', 'ounce', 'oz',
  'pounds', 'pound', 'lbs', 'lb',
  'kilograms', 'kilogram', 'kg',
  'grams', 'gram', 'g',
  'milligrams', 'milligram', 'mg',
  'milliliters', 'milliliter', 'ml',
  'liters', 'liter',
  'deciliters', 'deciliter', 'dl',
  'cups', 'cup',
  'pinches', 'pinch',
  'dashes', 'dash',
  'sprigs', 'sprig',
  'slices', 'slice',
  'pieces', 'piece',
  'cloves', 'clove',
  'cans', 'can',
  'bunches', 'bunch',
  'handfuls', 'handful',
];

// Number: integer, decimal (1.5), fraction (1/2), mixed (1 1/2)
const NUM_PAT = '(\\d+(?:[/.]\\d+)?(?:\\s+\\d+/\\d+)?)';
const UNITS_PAT = UNITS
  .map(u => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  .join('|');

// NUMBER + optional_space + UNIT + required_space + name
const WITH_UNIT_RE = new RegExp(`^${NUM_PAT}\\s*(${UNITS_PAT})\\.?\\s+(.+)$`, 'i');
// NUMBER + space + name (no unit)
const NO_UNIT_RE  = new RegExp(`^${NUM_PAT}\\s+(.+)$`);

export function parseIngredient(line: string): ParsedIngredient {
  const str = line.trim();

  const withUnit = str.match(WITH_UNIT_RE);
  if (withUnit) {
    return {
      amount: withUnit[1].trim(),
      unit:   withUnit[2].toLowerCase(),
      name:   withUnit[3].trim(),
    };
  }

  const noUnit = str.match(NO_UNIT_RE);
  if (noUnit) {
    return { amount: noUnit[1].trim(), unit: '', name: noUnit[2].trim() };
  }

  return { amount: '', unit: '', name: str };
}

// ── Main parser ──────────────────────────────────────────────────────────────

type Section = 'ingredients' | 'steps' | 'notes' | 'tags' | null;

export function parseRecipeMarkdown(markdown: string): ParsedRecipe {
  const result: ParsedRecipe = {
    title: '',
    ingredients: [],
    steps: [],
  };

  let section: Section = null;
  const notesLines: string[] = [];

  for (const line of markdown.split('\n')) {
    const t = line.trim();

    // H1 → title (first only)
    if (t.startsWith('# ') && !result.title) {
      result.title = t.slice(2).trim();
      section = null;
      continue;
    }

    // H2 → switch section
    if (t.startsWith('## ')) {
      const name = t.slice(3).trim().toLowerCase();
      if      (name === 'ingredients') section = 'ingredients';
      else if (name === 'steps')       section = 'steps';
      else if (name === 'notes')       section = 'notes';
      else if (name === 'tags')        section = 'tags';
      else                             section = null;
      continue;
    }

    // Blockquote → description (before any section, first only)
    if (t.startsWith('> ') && !result.description && section === null) {
      result.description = t.slice(2).trim();
      continue;
    }

    // Bold key-value pairs — only outside any named section
    if (section === null) {
      // Handles both **Key:** value (colon inside) and **Key**: value (colon outside)
      const kv = t.match(/^\*\*([^*:]+):?\*\*:?\s+(.+)$/);
      if (kv) {
        const key = kv[1].toLowerCase().trim();
        const val = kv[2].trim();
        if (key.includes('prep')) {
          const m = parseTimeToMinutes(val);
          if (m !== undefined) result.prep_time = m;
        } else if (key.includes('cook')) {
          const m = parseTimeToMinutes(val);
          if (m !== undefined) result.cook_time = m;
        } else if (key.includes('serving') || key.includes('portion')) {
          const n = parseInt(val, 10);
          if (!isNaN(n)) result.servings = n;
        }
        continue;
      }
    }

    // Section content
    if (section === 'ingredients') {
      const li = t.match(/^[-*]\s+(.+)$/);
      if (li) result.ingredients.push(parseIngredient(li[1]));
    } else if (section === 'steps') {
      const li = t.match(/^\d+[.)]\s+(.+)$/);
      if (li) result.steps.push(parseStepTimer(li[1]));
    } else if (section === 'notes') {
      if (t) notesLines.push(t);
    } else if (section === 'tags') {
      if (t) result.tags = t.split(',').map(tag => tag.trim()).filter(Boolean);
    }
  }

  if (notesLines.length > 0) result.notes = notesLines.join('\n');

  return result;
}
