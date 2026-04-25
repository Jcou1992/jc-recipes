/**
 * Tests cover the pure logic + localStorage round-trip surface of the
 * brut shortcut-discovery utilities. The React hook itself is integration-
 * tested by Playwright (kicker visibility before/after 3 keystrokes); this
 * file deliberately stays in node-test-env territory by exercising only the
 * pure helpers (`isTrackedKey`, `isCollapsed`, `readUseCount`,
 * `writeUseCount`).
 */

import {
  SHORTCUT_THRESHOLD,
  SHORTCUT_USES_KEY,
  isCollapsed,
  isTrackedKey,
  readUseCount,
  writeUseCount,
} from '@/lib/brut/use-shortcut-discovery';

type Store = Map<string, string>;

function installLocalStorage(store: Store): void {
  const ls = {
    getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
  (globalThis as unknown as { window: { localStorage: typeof ls } }).window = {
    localStorage: ls,
  };
}

describe('use-shortcut-discovery — pure helpers', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
  });

  test('isTrackedKey + isCollapsed: counter starts at 0, threshold gates collapse, dismiss forces collapse', () => {
    // Tracked keys cover the three documented shortcuts; case-insensitive
    // for `f` because keyboards/locks vary; everything else is ignored.
    expect(isTrackedKey('/')).toBe(true);
    expect(isTrackedKey('f')).toBe(true);
    expect(isTrackedKey('F')).toBe(true);
    expect(isTrackedKey('Escape')).toBe(true);
    expect(isTrackedKey('a')).toBe(false);
    expect(isTrackedKey('Enter')).toBe(false);

    // Counter at 0 → kicker visible.
    expect(isCollapsed(0, false)).toBe(false);
    expect(isCollapsed(SHORTCUT_THRESHOLD - 1, false)).toBe(false);
    // At threshold or above → collapsed.
    expect(SHORTCUT_THRESHOLD).toBe(3);
    expect(isCollapsed(SHORTCUT_THRESHOLD, false)).toBe(true);
    expect(isCollapsed(SHORTCUT_THRESHOLD + 7, false)).toBe(true);
    // Manual dismiss collapses regardless of count.
    expect(isCollapsed(0, true)).toBe(true);
  });

  test('readUseCount / writeUseCount: persist + round-trip + corrupted values fall back to 0', () => {
    const store: Store = new Map();
    installLocalStorage(store);

    expect(readUseCount()).toBe(0);
    writeUseCount(2);
    expect(store.get(SHORTCUT_USES_KEY)).toBe('2');
    expect(readUseCount()).toBe(2);

    // Corrupted / non-numeric / negative values degrade to 0 instead of NaN.
    store.set(SHORTCUT_USES_KEY, 'not-a-number');
    expect(readUseCount()).toBe(0);
    store.set(SHORTCUT_USES_KEY, '-5');
    expect(readUseCount()).toBe(0);
  });

  test('readUseCount / writeUseCount are SSR-safe: no `window` → 0 / no-op', () => {
    // Ensure no window present (afterEach already strips it).
    expect((globalThis as { window?: unknown }).window).toBeUndefined();
    expect(readUseCount()).toBe(0);
    expect(() => writeUseCount(99)).not.toThrow();
  });
});
