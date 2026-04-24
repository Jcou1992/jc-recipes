/**
 * components/editorial/EditorialGrid.tsx
 *
 * The single layout primitive that every editorial surface
 * sits inside. Replaces ad-hoc `max-w-*` + `mx-auto` combos
 * scattered across list, detail, cook, print.
 *
 * Why it earns its place:
 * - One place to tune issue-frame margins; changes propagate.
 * - Consistent `set-in` mount animation per surface.
 * - Variant guarantees detail pages never collide with list pages.
 * - No inline raw-px — all sizing via --r-* and ch-based widths.
 *
 * Paired with: tokens-editorial.css (set-in keyframe, --r-* scale).
 */
'use client';
import { ReactNode, HTMLAttributes } from 'react';
import clsx from 'clsx';

type Variant = 'list' | 'detail' | 'cook' | 'form' | 'auth';

interface EditorialGridProps extends HTMLAttributes<HTMLDivElement> {
  variant: Variant;
  children: ReactNode;
  /** Disables the mount animation (for static routes or inside view-transitions) */
  noSetIn?: boolean;
}

const frameBySurface: Record<Variant, string> = {
  // 62rem table of contents — wide enough to breathe, narrow enough to read
  list:   'max-w-[62rem] mx-auto px-[var(--r-5)] pt-[var(--r-7)] pb-[var(--r-9)]',
  // 58rem single manuscript column spread
  detail: 'max-w-[58rem] mx-auto px-[var(--r-5)] pt-[var(--r-8)] pb-[var(--r-9)]',
  // Full width; the cook spread controls its own grid within
  cook:   'w-full px-[var(--r-5)]',
  // 44rem form column, matches manuscript spread but narrower
  form:   'max-w-[44rem] mx-auto px-[var(--r-5)] pt-[var(--r-7)] pb-[var(--r-9)]',
  // 32rem auth card — intentionally tight
  auth:   'max-w-[32rem] mx-auto px-[var(--r-5)] py-[var(--r-8)]',
};

export function EditorialGrid({
  variant,
  children,
  noSetIn = false,
  className,
  ...rest
}: EditorialGridProps) {
  return (
    <div
      className={clsx(
        frameBySurface[variant],
        !noSetIn && 'set-in',
        className,
      )}
      data-editorial-variant={variant}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * A two-column manuscript body: used on /recipes/[id] for
 * `Ingredients | Method` and on /cook for `folio | body | mise`.
 *
 * Consumers slot children via named slots. We don't use
 * grid-template-areas because it fights Tailwind's line-height
 * inheritance — plain column grid is cleaner.
 */
interface ManuscriptBodyProps {
  ingredients: ReactNode;
  method: ReactNode;
}

export function ManuscriptBody({ ingredients, method }: ManuscriptBodyProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--r-8)]">
      <section className="min-w-0">{ingredients}</section>
      <section className="min-w-0">{method}</section>
    </div>
  );
}

/**
 * Cook spread: folio | body | mise.
 * Collapses on narrow viewports; see tokens-editorial.css responsive block.
 */
interface CookSpreadProps {
  folio: ReactNode;
  body:  ReactNode;
  mise:  ReactNode;
}

export function CookSpread({ folio, body, mise }: CookSpreadProps) {
  return (
    <div
      className="
        grid gap-[var(--r-7)] py-[var(--r-7)] max-w-[72rem] w-full mx-auto
        grid-cols-1
        md:grid-cols-[160px_minmax(0,1fr)_260px]
        items-start
      "
    >
      <div className="folio tabular text-right md:text-right">{folio}</div>
      <div className="turn-in min-w-0">{body}</div>
      <aside className="border-l border-[color:var(--border)] pl-[var(--r-3)] md:pl-[var(--r-3)]">
        {mise}
      </aside>
    </div>
  );
}
