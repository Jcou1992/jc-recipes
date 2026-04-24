/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <GridScaffold> — the load-bearing 16/8/6-column grid primitive.
 *
 * Mobile  (≤639px): 6 columns, 16px outer gutter, 8px column gutter
 * Tablet  (640–1023px): 8 columns, 24px outer gutter, 16px column gutter
 * Desktop (≥1024px): 16 columns, 32px outer gutter, 24px column gutter
 *
 * Children opt into widths via `data-col` (desktop spans; mobile/tablet adjust
 * automatically via container queries or a prop `colsBreakpoints`).
 *
 * Usage:
 *   <GridScaffold>
 *     <article data-col="8">…featured card…</article>
 *     <article data-col="4">…card…</article>
 *     <article data-col="4">…card…</article>
 *     …
 *   </GridScaffold>
 *
 * Why not Tailwind `grid-cols-16`? Because the gutter and outer padding
 * must recompute per breakpoint AND honour `--s-*` tokens. Isolating those
 * rules in one component keeps the column math provable.
 */

import type { HTMLAttributes, ReactNode } from 'react';

type GridScaffoldProps = {
  children: ReactNode;
  /** Max content width. Default `1600px`. */
  maxWidth?: number;
  /** Variant: `list` = full 16-col grid; `detail` = 16-col with 4/12 split helper; `cook` = 8-col centered. */
  variant?: 'list' | 'detail' | 'cook';
} & HTMLAttributes<HTMLDivElement>;

export function GridScaffold({
  children,
  maxWidth = 1600,
  variant = 'list',
  className = '',
  style,
  ...rest
}: GridScaffoldProps) {
  return (
    <div
      className={`brut-scaffold brut-scaffold--${variant} ${className}`.trim()}
      style={{ ['--brut-max-w' as string]: `${maxWidth}px`, ...style }}
      data-variant={variant}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Column-span helper — for children that need inline logic rather than
 * data-attributes. Thin wrapper that applies `grid-column: span N`. */
export function Col({
  span = 4,
  spanSm,
  spanMd,
  children,
  className = '',
  ...rest
}: {
  span?: number;        // desktop (16-col)
  spanSm?: number;      // mobile (6-col)
  spanMd?: number;      // tablet (8-col)
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`brut-col ${className}`.trim()}
      style={{
        ['--col-span' as string]: String(span),
        ['--col-span-sm' as string]: String(spanSm ?? Math.min(span, 6)),
        ['--col-span-md' as string]: String(spanMd ?? Math.min(span, 8)),
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* ── Co-located CSS ─────────────────────────────────────────────────────── */

export const GridScaffoldCSS = `
/* Desktop: 16 columns, 24px gap, 32px outer gutter. */
.brut-scaffold {
  display: grid;
  gap: 24px;
  max-width: var(--brut-max-w, 1600px);
  margin: 0 auto;
  padding: 24px 32px;
  grid-template-columns: repeat(16, minmax(0, 1fr));
}
.brut-scaffold--cook {
  grid-template-columns: repeat(8, minmax(0, 1fr));
  max-width: 768px;
  padding: 24px 16px;
}

/* Tablet */
@media (max-width: 1023px) {
  .brut-scaffold {
    gap: 16px;
    padding: 24px 24px;
    grid-template-columns: repeat(8, minmax(0, 1fr));
  }
}

/* Mobile */
@media (max-width: 639px) {
  .brut-scaffold {
    gap: 8px;
    padding: 16px;
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

/* Column span helper — the 16-col span number scales down at breakpoints. */
.brut-col {
  grid-column: span var(--col-span);
}
@media (max-width: 1023px) { .brut-col { grid-column: span var(--col-span-md); } }
@media (max-width:  639px) { .brut-col { grid-column: span var(--col-span-sm); } }

/* Detail variant gets an aside + main via explicit grid-template-areas on md+. */
@media (min-width: 1024px) {
  .brut-scaffold--detail {
    grid-template-columns: 5fr 11fr;
    gap: 40px;
  }
}
`;

/* ── Usage examples ─────────────────────────────────────────────────────── */
/*
 * List page:
 *   <GridScaffold variant="list">
 *     <Col span={8} spanMd={8} spanSm={6}><FeaturedCard /></Col>
 *     {rest.map(r => <Col key={r.id} span={4} spanMd={4} spanSm={6}><Card r={r} /></Col>)}
 *   </GridScaffold>
 *
 * Detail page:
 *   <GridScaffold variant="detail">
 *     <aside>…ingredients…</aside>
 *     <section>…steps + notes…</section>
 *   </GridScaffold>
 *
 * Cook page:
 *   <GridScaffold variant="cook" maxWidth={640}>
 *     <Col span={8}><CookHeader /></Col>
 *     <Col span={8}><CookBody /></Col>
 *     <Col span={8}><CookTimer /></Col>
 *   </GridScaffold>
 */
