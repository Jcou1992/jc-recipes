import { fmtCookedAge, type CookedAge } from '@/lib/brut/cooked-age';

// Anchored "now" so we don't fight Date.now() drift in CI.
const NOW = Date.parse('2026-04-24T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const iso = (offsetMs: number) => new Date(NOW - offsetMs).toISOString();

describe('fmtCookedAge', () => {
  // Truth-table: covers all four label branches + clock-skew + malformed
  // parse paths. The 3-h case has a fractional pct that we assert with
  // toBeCloseTo, so it's split out below; everything else fits the table.
  test.each<{
    name: string;
    input: string | null | undefined;
    expected: CookedAge;
  }>([
    { name: 'null → NEW',                    input: null,                    expected: { label: 'NEW',           pct: 0, dormant: false } },
    { name: 'undefined → NEW',               input: undefined,               expected: { label: 'NEW',           pct: 0, dormant: false } },
    { name: '80 h ago → LAST 03D AGO',       input: iso(80 * HOUR),          expected: { label: 'LAST 03D AGO',  pct: 0, dormant: false } },
    { name: '12 d ago → DORMANT 12D',        input: iso(12 * DAY),           expected: { label: 'DORMANT 12D',   pct: 0, dormant: true  } },
    { name: 'future date → NEW (skew)',      input: iso(-5 * HOUR),          expected: { label: 'NEW',           pct: 0, dormant: false } },
    { name: 'malformed string → NEW',        input: 'not-a-date',            expected: { label: 'NEW',           pct: 0, dormant: false } },
  ])('cooked-age branch — $name', ({ input, expected }) => {
    expect(fmtCookedAge(input, NOW)).toEqual(expected);
  });

  test('3 h ago → LAST 03H AGO / ~95.83% / not dormant (in-window decay)', () => {
    const r = fmtCookedAge(iso(3 * HOUR), NOW);
    expect(r.label).toBe('LAST 03H AGO');
    expect(r.dormant).toBe(false);
    // 100 - (3/72)*100 = 95.833…
    expect(r.pct).toBeCloseTo(95.83, 1);
  });
});
