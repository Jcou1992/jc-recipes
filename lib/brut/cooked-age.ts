/**
 * SEKAI · BRUTALIST-RAW-LUXE — cooked-age decay helper.
 *
 * Given a `cooked_at` ISO timestamp, returns the brut card's heat-row
 * descriptor:
 *
 *   - `null` (never cooked)        → { label: 'NEW',           pct: 0,   dormant: false }
 *   - 0 – 72 h ago                 → { label: 'LAST {Xh AGO}', pct: 0–100, dormant: false }
 *   - 72 h – 7 d ago               → { label: 'LAST {Xd AGO}', pct: 0,   dormant: false }
 *   - ≥ 7 d ago                    → { label: 'DORMANT {Xd}',  pct: 0,   dormant: true }
 *
 * `pct` is the value bound to the `--card-heat` CSS custom property; it
 * decays linearly from 100 (just-cooked) to 0 (>= 72 h). The CSS rule
 * `color-mix(in oklch, var(--bone-100) var(--card-heat), var(--bone-300))`
 * reads it to fade the row from bone-100 → bone-300 across that 72 h window.
 *
 * Defensive on clock skew: future timestamps clamp to "NEW" rather than
 * producing negative ages or NaN labels.
 *
 * Pure function, zero IO. Tested in `__tests__/cooked-age.test.ts`.
 */

export interface CookedAge {
  label: string;
  pct: number;
  dormant: boolean;
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const HEAT_WINDOW_HOURS = 72;
const DORMANT_DAYS = 7;

export function fmtCookedAge(cookedAt: string | null | undefined, now: number = Date.now()): CookedAge {
  if (cookedAt == null) {
    return { label: 'NEW', pct: 0, dormant: false };
  }

  const cookedMs = Date.parse(cookedAt);
  if (Number.isNaN(cookedMs)) {
    return { label: 'NEW', pct: 0, dormant: false };
  }

  const ageMs = now - cookedMs;
  // Defensive: future date (clock skew) → behave like never-cooked.
  if (ageMs < 0) {
    return { label: 'NEW', pct: 0, dormant: false };
  }

  const ageHours = ageMs / HOUR_MS;
  const ageDays = ageMs / DAY_MS;

  if (ageDays >= DORMANT_DAYS) {
    return {
      label: `DORMANT ${Math.floor(ageDays)}D`,
      pct: 0,
      dormant: true,
    };
  }

  if (ageHours >= HEAT_WINDOW_HOURS) {
    // Past the heat window but not yet dormant: show in days, no decay left.
    return {
      label: `LAST ${String(Math.floor(ageDays)).padStart(2, '0')}D AGO`,
      pct: 0,
      dormant: false,
    };
  }

  // Inside the 72 h heat window — linear decay 100 → 0.
  const pct = 100 - (ageHours / HEAT_WINDOW_HOURS) * 100;
  // Use "Xh" for under a day, "Xd" once we cross 24 h (still ≤ 72 h).
  const label =
    ageHours < 24
      ? `LAST ${String(Math.floor(ageHours)).padStart(2, '0')}H AGO`
      : `LAST ${String(Math.floor(ageDays)).padStart(2, '0')}D AGO`;

  return {
    label,
    pct,
    dormant: false,
  };
}
