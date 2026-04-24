/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <TabularNumeral> — renders a number (or pre-formatted string) in tabular
 * mono with zero-padding. No crossfade, no tween: when the value changes it
 * prints instantly, like a receipt printer advancing one tick.
 *
 *   <TabularNumeral value={3} pad={2} />        // "03"
 *   <TabularNumeral value="T+04:21" />           // pass-through string
 *
 * Server-safe (no hooks). Relies on `.brut-tab-num` styles defined in
 * tokens-brutalist.css — under classic mode the span is an unstyled passthrough.
 */

type TabularNumeralProps = {
  value: number | string;
  /** Zero-pad integer digits to this width. Ignored when `value` is a string. */
  pad?: number;
  className?: string;
};

function padLeft(n: number, width: number): string {
  if (!Number.isFinite(n)) return '—'.repeat(Math.max(1, width));
  const s = String(Math.max(0, Math.trunc(n)));
  return s.length >= width ? s : '0'.repeat(width - s.length) + s;
}

export function TabularNumeral({ value, pad, className = '' }: TabularNumeralProps) {
  const text =
    typeof value === 'number'
      ? (pad && pad > 0 ? padLeft(value, pad) : String(value))
      : value;
  return (
    <span className={`brut-tab-num ${className}`.trim()}>{text}</span>
  );
}
