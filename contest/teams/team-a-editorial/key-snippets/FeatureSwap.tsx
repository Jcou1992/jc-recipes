/**
 * components/editorial/FeatureSwap.tsx
 *
 * A numeric value that crossfades — a "feature-swap" — rather
 * than counting up or sliding. Used for:
 *   - Ingredient quantity (on unit toggle)
 *   - Ingredient quantity (on serving scale)
 *   - Scaler numeral
 *   - Macros numerals
 *
 * Why it earns its place:
 *   - No jitter. The numeral column reserves a minimum `ch`
 *     width, so the rest of the row never moves.
 *   - 160ms crossfade reads as "the compositor reset this line"
 *     — the typesetting metaphor the lane depends on.
 *   - Accessibility: aria-live="polite" announces changes without
 *     spamming SRs on every press (debounced via `lastVal`).
 *
 * Depends on: tokens-editorial.css `.feature-swap` class.
 */
'use client';
import { useEffect, useRef, useState, ReactNode } from 'react';
import clsx from 'clsx';

interface FeatureSwapProps {
  /**
   * The keyable value. When this changes, the content crossfades.
   * Pass a string or number, not a ReactNode — identity needs to
   * be comparable.
   */
  value: string | number;
  /**
   * Render the value. Separate from `value` so you can format
   * (e.g. smart-fraction + unit) without breaking change detection.
   */
  children: ReactNode;
  /**
   * Minimum reserved width in characters. Default 4ch, enough for
   * "1.25" or "250g". Set higher for macro numerals.
   */
  minCh?: number;
  /**
   * Tabular numerics. On for qty + macros, off for text tokens.
   */
  tabular?: boolean;
  className?: string;
  ariaLabel?: string;
}

export function FeatureSwap({
  value,
  children,
  minCh = 4,
  tabular = true,
  className,
  ariaLabel,
}: FeatureSwapProps) {
  const [swapping, setSwapping] = useState(false);
  const [rendered, setRendered] = useState<ReactNode>(children);
  const lastVal = useRef(value);

  useEffect(() => {
    if (value === lastVal.current) return;

    // Trigger crossfade: fade out, swap content, fade in.
    setSwapping(true);
    const fadeOut = window.setTimeout(() => {
      setRendered(children);
      setSwapping(false);
      lastVal.current = value;
    }, 160);

    return () => window.clearTimeout(fadeOut);
  }, [value, children]);

  return (
    <span
      className={clsx(
        'feature-swap inline-block',
        swapping && 'swapping',
        tabular && 'tabular',
        className,
      )}
      style={{ minWidth: `${minCh}ch` }}
      aria-label={ariaLabel}
      aria-live="polite"
      aria-atomic="true"
    >
      {rendered}
    </span>
  );
}

/**
 * RowGoldSweep — wraps a row that wants to announce it changed
 * via a left-to-right hairline gold sweep underneath. Use alongside
 * FeatureSwap on the ingredient row when a scale or unit change
 * occurred. The sweep is a one-shot decoration — re-mount to replay.
 *
 * Usage:
 *   <li className={clsx(row.changed && 'row-gold-sweep')}>
 *     <FeatureSwap value={qty}>...</FeatureSwap>
 *   </li>
 *
 * Parent clears `changed` after 600ms so the class is stable
 * between renders.
 */
