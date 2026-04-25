/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <GridScaffold> — a thin CSS-grid wrapper. Picks the column count and gap
 * from tokens (`--s-3` tight / `--s-4` default / `--s-6` wide) so every route
 * shares the same underlying rhythm.
 *
 *   <GridScaffold cols={12} gap="default">…</GridScaffold>
 *   <GridScaffold cols={16} gap="wide">…</GridScaffold>
 *
 * Server-safe (no hooks). Renders `.brut-grid` with a `--brut-cols` custom
 * property so the grid-template-columns rule can reference it. Styles are
 * scoped under `:root[data-design="brut"]`; in classic mode the wrapper is
 * a plain block with no grid behaviour (classic pages don't rely on this).
 */

import type { HTMLAttributes, ReactNode } from 'react';

type Cols = 6 | 8 | 12 | 16;
type Gap = 'tight' | 'default' | 'wide';

type GridScaffoldProps = {
  cols: Cols;
  gap?: Gap;
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'>;

export function GridScaffold({
  cols,
  gap = 'default',
  children,
  className = '',
  style,
  ...rest
}: GridScaffoldProps) {
  return (
    <div
      className={`brut-grid ${className}`.trim()}
      data-gap={gap}
      style={{ ['--brut-cols' as string]: String(cols), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}
