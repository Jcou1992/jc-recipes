/**
 * @jest-environment node
 */
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

type Row = { fdc_id: number; name: string; similarity: number };
let mockRows: Row[] = [];

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(async () => ({
    rpc: jest.fn(async (_name: string, _args: unknown) => ({
      data: mockRows,
      error: null,
    })),
  })),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { autoMatch, searchFdc } = require('../match');

beforeEach(() => {
  mockRows = [];
});

type Case = {
  label: string;
  fn: 'auto' | 'search';
  query: string;
  rows: Row[];
  limit?: number;
  /** For autoMatch: the expected fdc_id or null. For search: the expected length. */
  expected: number | null;
};

describe('match behaviour truth table', () => {
  it.each<Case>([
    // autoMatch — rejection paths
    {
      label: 'autoMatch: single-token query rejected (needs ≥3 tokens)',
      fn: 'auto',
      query: 'chicken',
      rows: [
        { fdc_id: 1, name: 'Chicken, broilers, breast raw', similarity: 0.95 },
        { fdc_id: 2, name: 'Chicken, liver raw', similarity: 0.82 },
      ],
      expected: null,
    },
    {
      label: 'autoMatch: gap < 0.15 rejected even when top ≥ 0.75',
      fn: 'auto',
      query: 'chicken breast raw',
      rows: [
        { fdc_id: 1, name: 'Chicken breast meat boneless raw', similarity: 0.85 },
        { fdc_id: 2, name: 'Chicken breast meat with skin raw', similarity: 0.8 },
      ],
      expected: null,
    },
    {
      label: 'autoMatch: top < 0.75 rejected',
      fn: 'auto',
      query: 'obscure compound stew broth',
      rows: [
        { fdc_id: 9, name: 'Some distant match', similarity: 0.65 },
        { fdc_id: 10, name: 'Another distant', similarity: 0.4 },
      ],
      expected: null,
    },
    {
      label: 'autoMatch: empty candidate list rejected',
      fn: 'auto',
      query: 'three unknown words',
      rows: [],
      expected: null,
    },
    {
      label: 'autoMatch: single-candidate rejected (need ≥2 for gap rule)',
      fn: 'auto',
      query: 'three known words',
      rows: [
        { fdc_id: 42, name: 'Some lone match', similarity: 0.95 },
      ],
      expected: null,
    },
    // autoMatch — accept path
    {
      label: 'autoMatch: all three conditions hold → returns top fdc_id',
      fn: 'auto',
      query: 'chicken breast meat only raw',
      rows: [
        { fdc_id: 171477, name: 'Chicken broilers breast meat only raw', similarity: 0.92 },
        { fdc_id: 171111, name: 'Chicken roasted meat only raw', similarity: 0.6 },
      ],
      expected: 171477,
    },
    // searchFdc
    {
      label: 'searchFdc: returns ranked candidates',
      fn: 'search',
      query: 'anything',
      rows: [
        { fdc_id: 1, name: 'a', similarity: 0.9 },
        { fdc_id: 2, name: 'b', similarity: 0.8 },
        { fdc_id: 3, name: 'c', similarity: 0.7 },
      ],
      limit: 5,
      expected: 3,
    },
    {
      label: 'searchFdc: short query (<2 chars) returns empty',
      fn: 'search',
      query: 'a',
      rows: [{ fdc_id: 1, name: 'a', similarity: 0.9 }],
      limit: 5,
      expected: 0,
    },
  ])('$label', async ({ fn, query, rows, limit, expected }) => {
    mockRows = rows;
    if (fn === 'auto') {
      const result = await autoMatch(query);
      expect(result).toBe(expected);
    } else {
      const result = await searchFdc(query, limit ?? 5);
      expect(result).toHaveLength(expected as number);
    }
  });
});
