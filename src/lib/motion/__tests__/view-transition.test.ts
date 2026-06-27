import { startViewTransition, supportsViewTransitions } from '../view-transition';

type MockMatchMedia = (q: string) => MediaQueryList;
type StartFn = (cb: () => void | Promise<void>) => { finished: Promise<void> };

function setGlobals(opts: {
  startFn?: StartFn | null;
  reducedMotion?: boolean;
}): { startFn: jest.Mock | null } {
  const mm: MockMatchMedia = () =>
    ({
      matches: opts.reducedMotion ?? false,
      media: '',
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }) as unknown as MediaQueryList;

  (globalThis as unknown as { window: { matchMedia: MockMatchMedia } }).window = {
    matchMedia: mm,
  };

  const doc: Record<string, unknown> = {};
  if (opts.startFn) doc.startViewTransition = opts.startFn;
  (globalThis as unknown as { document: typeof doc }).document = doc;

  return { startFn: (opts.startFn as jest.Mock | undefined) ?? null };
}

describe('view-transition helper', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).document;
  });

  test.each([
    {
      name: 'invokes callback inline when API absent',
      hasApi: false,
      reducedMotion: false,
      expectApiCalled: false,
    },
    {
      name: 'uses document.startViewTransition when present',
      hasApi: true,
      reducedMotion: false,
      expectApiCalled: true,
    },
    {
      name: 'bypasses API under prefers-reduced-motion',
      hasApi: true,
      reducedMotion: true,
      expectApiCalled: false,
    },
  ])('$name', async ({ hasApi, reducedMotion, expectApiCalled }) => {
    const start = hasApi
      ? jest.fn((fn: () => void | Promise<void>) => {
          void fn();
          return { finished: Promise.resolve() };
        })
      : null;
    setGlobals({ startFn: start, reducedMotion });

    const cb = jest.fn(() => Promise.resolve());
    await startViewTransition(cb);

    if (expectApiCalled) {
      expect(start).toHaveBeenCalledTimes(1);
    } else {
      expect(cb).toHaveBeenCalledTimes(1);
      if (start) expect(start).not.toHaveBeenCalled();
    }
  });

  test('swallows rejection from transition.finished without crashing', async () => {
    const start = jest.fn(() => ({ finished: Promise.reject(new Error('boom')) }));
    setGlobals({ startFn: start, reducedMotion: false });
    await expect(startViewTransition(() => {})).resolves.toBeUndefined();
    expect(start).toHaveBeenCalledTimes(1);
  });

  test('supportsViewTransitions reflects document API presence', () => {
    setGlobals({ startFn: null });
    expect(supportsViewTransitions()).toBe(false);
    setGlobals({ startFn: jest.fn() });
    expect(supportsViewTransitions()).toBe(true);
  });
});
