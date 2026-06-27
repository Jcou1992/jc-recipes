import { haptic } from '../haptic';

type MockMatchMedia = (q: string) => MediaQueryList;

function setGlobals(opts: {
  vibrate?: ((pattern: number | number[]) => boolean) | null;
  reducedMotion?: boolean;
}): { vibrate: jest.Mock | null } {
  const vibrate = opts.vibrate === null ? null : (opts.vibrate ?? jest.fn(() => true));
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

  if (vibrate) {
    (globalThis as unknown as { navigator: { vibrate: typeof vibrate } }).navigator = {
      vibrate,
    };
  } else {
    (globalThis as unknown as { navigator: Record<string, unknown> }).navigator = {};
  }
  return { vibrate: vibrate as jest.Mock | null };
}

describe('haptic wrapper', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).window;
    delete (globalThis as Record<string, unknown>).navigator;
  });

  test.each([
    {
      name: 'calls navigator.vibrate with the given pattern',
      reducedMotion: false,
      hasVibrate: true,
      pattern: 10 as number | number[],
      expectCalledWith: 10 as number | number[] | null,
    },
    {
      name: 'no-ops when navigator.vibrate is absent',
      reducedMotion: false,
      hasVibrate: false,
      pattern: [10, 20, 10] as number | number[],
      expectCalledWith: null,
    },
    {
      name: 'no-ops under prefers-reduced-motion',
      reducedMotion: true,
      hasVibrate: true,
      pattern: 10 as number | number[],
      expectCalledWith: null,
    },
    {
      name: 'swallows exceptions thrown by the platform vibrate implementation',
      reducedMotion: false,
      hasVibrate: true,
      pattern: 10 as number | number[],
      expectCalledWith: 10 as number | number[] | null,
      throws: true,
    },
  ])('$name', ({ reducedMotion, hasVibrate, pattern, expectCalledWith, throws }) => {
    const impl = hasVibrate
      ? jest.fn(() => {
          if (throws) throw new Error('platform rejected');
          return true;
        })
      : null;
    setGlobals({ vibrate: impl, reducedMotion });

    expect(() => haptic(pattern)).not.toThrow();

    if (expectCalledWith === null) {
      if (impl) expect(impl).not.toHaveBeenCalled();
      return;
    }
    expect(impl).toHaveBeenCalledTimes(1);
    expect(impl).toHaveBeenCalledWith(expectCalledWith);
  });
});
