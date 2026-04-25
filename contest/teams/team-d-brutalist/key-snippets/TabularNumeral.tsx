/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <TabularNumeral> — a number rendered in tabular mono, zero-padded,
 * with no crossfade / tween. When the value changes it prints instantly,
 * like a receipt printer advancing one tick.
 *
 * Used for: the scaler digit, step indices, step counts, macros, timers,
 * cook-mode elapsed, any integer that appears on screen.
 *
 * Rationale: the whole app uses `font-variant-numeric: tabular-nums` via
 * tokens-brutalist.css, so width-jitter is already absent. This component
 * adds (1) consistent zero-padding, (2) a `pad` + `digits` API, (3) a
 * formatter hook for fractional amounts (scaler ingredient table).
 *
 * NO CROSSFADE, NO TWEEN. If a transition is needed, use a border-color
 * ping of 80ms linear on a parent — never on the digit itself.
 */

'use client';

import { memo } from 'react';

type TabularNumeralProps = {
  value: number;
  /** Zero-pad integer digits to this width. Default 1 (no pad). */
  pad?: number;
  /** Render a fractional amount with adaptive decimals (for ingredient amounts). */
  fraction?: boolean;
  /** Optional unit label printed inline at smaller size, e.g. "G", "ML". */
  unit?: string | null;
  /** Optional classname passthrough — the component is already mono + tabular. */
  className?: string;
  /** For screen-readers that read each digit individually — supply a plain number. */
  'aria-label'?: string;
};

function formatFraction(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n <= 0)              return '0';
  if (n < 1)               return n.toFixed(2).replace(/\.?0+$/, '');
  if (n < 10)              return n.toFixed(1).replace(/\.0$/, '');
  return String(Math.round(n));
}

function padLeft(n: number, width: number): string {
  if (!Number.isFinite(n)) return '—'.repeat(Math.max(1, width));
  const s = String(Math.max(0, Math.round(n)));
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

function TabularNumeralImpl({
  value,
  pad = 1,
  fraction = false,
  unit,
  className = '',
  'aria-label': ariaLabel,
}: TabularNumeralProps) {
  const text = fraction ? formatFraction(value) : padLeft(value, pad);
  return (
    <span
      className={`brut-num ${className}`.trim()}
      aria-label={ariaLabel ?? String(value)}
    >
      {text}
      {unit ? <span className="brut-num-unit"> {unit}</span> : null}
    </span>
  );
}

/** React.memo — the scaler dispatches hundreds of re-renders on press-hold. */
export const TabularNumeral = memo(TabularNumeralImpl);

/* ── Co-located CSS ─────────────────────────────────────────────────────── */

export const TabularNumeralCSS = `
.brut-num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum' 1, 'zero' 1;
  letter-spacing: 0.01em;
}
.brut-num-unit {
  color: var(--text-3);
  font-weight: 400;
  font-size: 0.85em;
  margin-left: 0.1em;
}
`;

/* ── Usage examples (for reviewers) ─────────────────────────────────────── */
/*
 * Scaler digit (big):
 *   <TabularNumeral value={servings} pad={2} className="text-[2.5rem] font-semibold" />
 *
 * Step index:
 *   <TabularNumeral value={step.order} pad={2} /> / <TabularNumeral value={total} pad={2} />
 *
 * Ingredient amount (scaled):
 *   <TabularNumeral value={ing.amount * multiplier} fraction unit={ing.unit} />
 *
 * Cook timer (MM:SS):
 *   {fmtSecs(remaining)}   // use a separate formatter; don't pass through here
 *
 * Result count:
 *   [ <TabularNumeral value={filtered.length} pad={2} /> / <TabularNumeral value={total} pad={2} /> RESULTS ]
 */
