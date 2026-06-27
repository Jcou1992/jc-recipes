// Renders a single horizontal ink-brush SVG stroke that draws on mount,
// then stays static. Used as the empty-state delight on the recipes
// list — a calligraphic touch that reads as mise-en-place precision,
// not cartoon mascot.

interface Props {
  size?: number;
  className?: string;
}

export default function InkBrush({ size = 168, className }: Props) {
  const height = Math.round(size / 4);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 168 42"
      aria-hidden="true"
      className={`animate-ink-brush ${className ?? ''}`.trim()}
    >
      <path
        d="M8 26 C 36 10, 92 36, 160 18"
        fill="none"
        stroke="var(--color-terracotta)"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
