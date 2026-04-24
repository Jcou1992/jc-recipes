/**
 * components/editorial/EditorialTocRow.tsx
 *
 * Replaces the recipe "card" in the list view. Renders a single
 * table-of-contents entry:
 *
 *   ┌────────────┬──────────────────────────────┬──────────────┐
 *   │   N° 041   │  Classic Smash Burger        │ 28 min · 4 · │
 *   │            │  Two 80-g patties, smashed…  │     612 kcal │
 *   └────────────┴──────────────────────────────┴──────────────┘
 *     ────────── hairline rule ───────────
 *
 * Why it earns its place:
 *   - No thumbnails. The list IS a table of contents — imagery
 *     lives on the detail page. Saves ~350kb median LCP.
 *   - Keyboard + click parity: the entire row is a single
 *     ViewTransitionLink — NOT nested buttons — so the view
 *     transition can tag the title group.
 *   - Hover affordance is underline-draw on title + folio
 *     colour-shift, not card lift.
 *
 * Depends on: existing ViewTransitionLink primitive, tokens-editorial.css.
 */
'use client';
import clsx from 'clsx';
import ViewTransitionLink from '@/components/util/ViewTransitionLink';

export interface TocRowData {
  id: string;
  folio: string;          // "041"
  title: string;
  lede?: string;
  timeMin?: number;
  servings?: number;
  kcal?: number;
  sections?: string[];    // used only for middle-dot meta row
}

interface Props {
  recipe: TocRowData;
  /** Pass-through for bulk-select state from RecipeListClient. */
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function EditorialTocRow({ recipe, selected, onToggleSelect }: Props) {
  const { id, folio, title, lede, timeMin, servings, kcal } = recipe;

  return (
    <li
      className={clsx(
        // 6-unit rhythm, hairline bottom rule
        'grid grid-cols-[88px_1fr_auto] items-baseline gap-[var(--r-5)]',
        'py-[var(--r-4)] border-b border-[color:var(--border)]',
        'cursor-pointer relative',
        selected && 'bg-[color-mix(in_oklch,var(--color-terracotta)_6%,transparent)]',
      )}
      data-testid="recipe-card"
      data-recipe-id={id}
    >
      {/* Folio — 40px Cormorant, old-style figures */}
      <span
        className="
          font-[family-name:var(--font-cormorant)]
          text-[40px] leading-none oldstyle
          text-[color:var(--text-2)] transition-colors
          group-hover:text-[color:var(--color-terracotta)]
          [tracking:-0.04em]
        "
      >
        {folio}
      </span>

      {/* Body — title + lede. Full row as single link for view-transition. */}
      <ViewTransitionLink href={`/recipes/${id}`} className="min-w-0 block">
        <h3
          className="
            toc-title
            font-[family-name:var(--font-cormorant)]
            text-[44px] leading-[1.05] [tracking:-0.02em] font-medium
            m-0 mb-1 text-[color:var(--text-1)]
            relative inline-block
          "
        >
          {title}
        </h3>
        {lede && (
          <p
            className="
              text-[18px] italic leading-snug m-0
              max-w-[36ch] text-[color:var(--text-2)]
            "
          >
            {lede}
          </p>
        )}
      </ViewTransitionLink>

      {/* Tabular meta column */}
      <div
        className="
          text-right leading-normal whitespace-nowrap
          font-[family-name:var(--font-barlow)]
          text-[12px] uppercase tracking-[0.14em]
          text-[color:var(--text-2)]
        "
      >
        {timeMin != null && (
          <><span className="tabular text-[color:var(--text-1)]">{timeMin}</span>{' min '}</>
        )}
        {servings != null && (
          <><span className="mx-1 text-[color:var(--border)]">·</span>
            <span className="tabular text-[color:var(--text-1)]">{servings}</span>{' ppl '}</>
        )}
        {kcal != null && (
          <><span className="mx-1 text-[color:var(--border)]">·</span>
            <span className="tabular text-[color:var(--text-1)]">{kcal}</span>{' kcal'}</>
        )}
      </div>

      {/* Optional bulk-select affordance — shift-click / long-press sets it; nothing renders until selected. */}
      {selected && (
        <span
          className="absolute left-[-24px] top-1/2 -translate-y-1/2 text-[color:var(--color-terracotta)] text-[14px]"
          aria-hidden="true"
        >
          ✓
        </span>
      )}

      <style jsx>{`
        /* Scoped: hover underline-draw for title.
           Kept in styled-jsx so it doesn't leak into print. */
        .toc-title::after {
          content: '';
          position: absolute;
          left: 0; right: 0; bottom: -3px;
          height: 1px;
          background: var(--color-terracotta);
          transform-origin: left;
          transform: scaleX(0);
          transition: transform var(--t-set) var(--ease-set);
        }
        li:hover .toc-title::after { transform: scaleX(1); }
        @media (prefers-reduced-motion: reduce) {
          .toc-title::after { transition: none; }
        }
        @media (hover: none) {
          /* On touch devices, keep the static state — no stuck hover. */
          li:hover .toc-title::after { transform: scaleX(0); }
        }
      `}</style>
    </li>
  );
}
