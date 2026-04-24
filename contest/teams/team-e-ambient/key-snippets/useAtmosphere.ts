// ─────────────────────────────────────────────────────────────────────────────
// useAtmosphere — thin re-export of the context hook from TimeOfDayProvider,
// with two helpers useful in downstream components.
// ─────────────────────────────────────────────────────────────────────────────

import { useAtmosphere as useCtx, type SkinName } from './TimeOfDayProvider';

export { useAtmosphere } from './TimeOfDayProvider';
export type { SkinName, SkinOverride } from './TimeOfDayProvider';

/**
 * Compute "card heat" — a 0..1 factor that fades linearly from cook time
 * to 72 hours later. Drives `--card-heat-target` on recipe cards so the
 * glow naturally decays. Returns 0 if `cookedAt` is null/undefined or older
 * than 72h.
 */
export function cardHeat(cookedAt: string | Date | null | undefined, now: Date = new Date()): number {
  if (!cookedAt) return 0;
  const t0 = typeof cookedAt === 'string' ? new Date(cookedAt).getTime() : cookedAt.getTime();
  if (!Number.isFinite(t0)) return 0;
  const ageMs = now.getTime() - t0;
  const WINDOW_MS = 72 * 60 * 60 * 1000;
  if (ageMs <= 0) return 1;
  if (ageMs >= WINDOW_MS) return 0;
  return 1 - ageMs / WINDOW_MS;
}

/**
 * Utility: does the active skin lean warm (ember/amber/midday) or cool
 * (mist/indigo)? Some components (cover art, tint decisions) want to
 * know the current temperature polarity without reading raw tokens.
 */
export function skinTemperature(skin: SkinName): 'warm' | 'cool' | 'neutral' {
  switch (skin) {
    case 'service-ember':
    case 'afternoon-amber':
      return 'warm';
    case 'morning-mist':
    case 'late-indigo':
      return 'cool';
    case 'midday-bright':
    default:
      return 'neutral';
  }
}

/**
 * Convenience: returns the current skin and a derived polarity in one shot.
 * Used by components that adapt their own tinting (e.g., recipe detail
 * cover gradients that shift cooler or warmer with the hour).
 */
export function useAtmospherePolarity() {
  const atm = useCtx();
  return { ...atm, polarity: skinTemperature(atm.skin) };
}
