import { shortHash, fmtRec, fmtIng, fmtStep, fmtTag } from '@/lib/brut/ref-codes';

describe('ref-codes', () => {
  test('shortHash + fmtRec — 4-char base36 uppercase, deterministic', () => {
    const uuid = 'a2c3e3c0-5d8c-4a81-8f2a-9c8e0c1f7b40';
    const hash = shortHash(uuid);
    expect(hash).toMatch(/^[0-9A-Z]{4}$/);
    expect(shortHash(uuid)).toBe(hash);               // deterministic
    expect(fmtRec(uuid)).toBe(`REC-${hash}`);
    // empty / short inputs still produce a 4-char code
    expect(shortHash('')).toMatch(/^[0-9A-Z]{4}$/);
    expect(shortHash('x')).toMatch(/^[0-9A-Z]{4}$/);
  });

  test('fmtIng — 1-indexed, zero-padded to 2', () => {
    expect(fmtIng(0)).toBe('ING-01');
    expect(fmtIng(6)).toBe('ING-07');
    expect(fmtIng(11)).toBe('ING-12');
    expect(fmtIng(98)).toBe('ING-99');
  });

  test('fmtStep — both sides zero-padded to 2 for tabular alignment', () => {
    expect(fmtStep(1, 7)).toBe('STP-01/07');
    expect(fmtStep(3, 7)).toBe('STP-03/07');
    expect(fmtStep(10, 12)).toBe('STP-10/12');
  });

  test('fmtTag — `#` sigil + uppercase, no trimming', () => {
    expect(fmtTag('dessert')).toBe('#DESSERT');
    expect(fmtTag('Pork')).toBe('#PORK');
    expect(fmtTag('Side Dish')).toBe('#SIDE DISH');
  });
});
