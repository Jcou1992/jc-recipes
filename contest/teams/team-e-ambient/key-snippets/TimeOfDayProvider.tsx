'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SEKAI 世界 — TimeOfDayProvider
//
// Applies a time-of-day "skin" to <html data-skin="..."> and interpolates
// the four atmosphere tokens between the two bracketing anchors for a smooth
// tonal transit across the day. Semantic tokens (bg / text / border) snap
// to the *primary* skin (the nearer anchor) to avoid muddy in-betweens.
//
// Five anchors (hour, skin):
//   01:30 late-indigo
//   07:30 morning-mist
//   12:30 midday-bright
//   16:30 afternoon-amber
//   20:00 service-ember
//   (wrap to 01:30 next day)
//
// User override: localStorage('sekai.skin.override') ∈ {skinName} | 'auto'
// When pinned, we set data-skin and skip interpolation.
// ─────────────────────────────────────────────────────────────────────────────

export type SkinName =
  | 'morning-mist'
  | 'midday-bright'
  | 'afternoon-amber'
  | 'service-ember'
  | 'late-indigo';

export type SkinOverride = SkinName | 'auto';

const OVERRIDE_KEY = 'sekai.skin.override';
const RESOLVE_CADENCE_MS = 5 * 60 * 1000; // 5 minutes
const BLEND_TRANSITION_MS = 2000;

const ANCHORS: Array<{ hour: number; skin: SkinName }> = [
  { hour: 1.5,  skin: 'late-indigo'     },
  { hour: 7.5,  skin: 'morning-mist'    },
  { hour: 12.5, skin: 'midday-bright'   },
  { hour: 16.5, skin: 'afternoon-amber' },
  { hour: 20.0, skin: 'service-ember'   },
  { hour: 25.5, skin: 'late-indigo'     }, // wrap
];

const ATM_KEYS = [
  '--atmosphere-key',
  '--atmosphere-rim',
  '--atmosphere-fill',
  '--atmosphere-horizon',
] as const;

/** Resolve the primary skin + a blend weight t ∈ [0,1] toward the next anchor. */
export function resolveSkin(now: Date): {
  primary: SkinName;
  from: SkinName;
  to: SkinName;
  t: number;
} {
  const h = now.getHours() + now.getMinutes() / 60;
  const H = h < 1.5 ? h + 24 : h;
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    const L = ANCHORS[i];
    const R = ANCHORS[i + 1];
    if (H >= L.hour && H <= R.hour) {
      const t = (H - L.hour) / (R.hour - L.hour);
      return { from: L.skin, to: R.skin, t, primary: t < 0.5 ? L.skin : R.skin };
    }
  }
  return { from: 'late-indigo', to: 'late-indigo', t: 0, primary: 'late-indigo' };
}

// Cache the four atmosphere values per skin by reading from a hidden probe.
// We only do this once per skin on the client.
function readSkinAtmosphere(skin: SkinName): Record<string, string> {
  const probe = document.createElement('div');
  probe.setAttribute('data-skin', skin);
  probe.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;';
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const out: Record<string, string> = {};
  ATM_KEYS.forEach(k => { out[k] = cs.getPropertyValue(k).trim(); });
  document.body.removeChild(probe);
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface AtmosphereCtx {
  skin: SkinName;
  override: SkinOverride;
  setOverride: (o: SkinOverride) => void;
}
const Ctx = createContext<AtmosphereCtx | null>(null);

export function useAtmosphere(): AtmosphereCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAtmosphere must be used inside TimeOfDayProvider');
  return v;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function TimeOfDayProvider({ children }: { children: React.ReactNode }) {
  const [skin, setSkin]         = useState<SkinName>('service-ember');
  const [override, setOverride_] = useState<SkinOverride>('auto');

  const apply = useCallback((o: SkinOverride) => {
    const html = document.documentElement;
    html.style.setProperty('transition',
      `background-color ${BLEND_TRANSITION_MS}ms ease, color ${BLEND_TRANSITION_MS}ms ease`);

    if (o !== 'auto') {
      html.setAttribute('data-skin', o);
      // Clear inline atmosphere overrides so the pinned skin's vars win.
      ATM_KEYS.forEach(k => html.style.removeProperty(k));
      setSkin(o);
      return;
    }

    const { primary, from, to, t } = resolveSkin(new Date());
    html.setAttribute('data-skin', primary);
    // Interpolate atmosphere keys via color-mix between anchor values.
    const fromAtm = readSkinAtmosphere(from);
    const toAtm   = readSkinAtmosphere(to);
    ATM_KEYS.forEach(k => {
      const pct = Math.round(t * 100);
      html.style.setProperty(
        k,
        `color-mix(in oklch, ${fromAtm[k]} ${100 - pct}%, ${toAtm[k]})`
      );
    });
    setSkin(primary);
  }, []);

  // Mount: hydrate override, apply, schedule resolver
  useEffect(() => {
    const stored = (localStorage.getItem(OVERRIDE_KEY) ?? 'auto') as SkinOverride;
    setOverride_(stored);
    apply(stored);

    const intervalId = window.setInterval(() => {
      const current = (localStorage.getItem(OVERRIDE_KEY) ?? 'auto') as SkinOverride;
      if (current === 'auto') apply('auto');
    }, RESOLVE_CADENCE_MS);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        const current = (localStorage.getItem(OVERRIDE_KEY) ?? 'auto') as SkinOverride;
        if (current === 'auto') apply('auto');
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [apply]);

  const setOverride = useCallback((o: SkinOverride) => {
    localStorage.setItem(OVERRIDE_KEY, o);
    setOverride_(o);
    apply(o);
  }, [apply]);

  const value = useMemo(() => ({ skin, override, setOverride }),
                        [skin, override, setOverride]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
