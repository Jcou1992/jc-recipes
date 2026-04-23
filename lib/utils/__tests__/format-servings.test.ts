import { describe, it, expect } from '@jest/globals';
import { formatServings } from '../format-servings';

describe('formatServings', () => {
  it('formats servings with optional label, singular/plural, and truncation', () => {
    const cases: Array<{
      input: { servings: number; serving_size_label: string | null };
      opts?: { truncate?: number };
      expected: string;
    }> = [
      { input: { servings: 4, serving_size_label: null }, expected: 'Serves 4' },
      { input: { servings: 4, serving_size_label: '1 burger' }, expected: 'Serves 4 · 1 burger' },
      { input: { servings: 1, serving_size_label: null }, expected: 'Serves 1' },
      {
        input: { servings: 2, serving_size_label: 'approximately one large dinner plate full' },
        opts: { truncate: 20 },
        expected: 'Serves 2 · approximately one la…',
      },
      {
        input: { servings: 2, serving_size_label: '1 burger' },
        opts: { truncate: 20 },
        expected: 'Serves 2 · 1 burger',
      },
    ];

    for (const { input, opts, expected } of cases) {
      expect(formatServings(input, opts)).toBe(expected);
    }
  });
});
