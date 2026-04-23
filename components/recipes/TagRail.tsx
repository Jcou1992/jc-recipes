'use client';

import { useEffect, useRef, useState } from 'react';
import FilterPopover from './FilterPopover';
import { useT } from '@/components/ui/LanguageContext';

// Desktop gets up to 12 inline tag chips; mobile narrower viewports clip to
// 4 so the rail never exceeds the width of the viewport. Anything beyond the
// limit moves to the "+N more" popover / bottom sheet.
const INLINE_LIMIT_DESKTOP = 12;
const INLINE_LIMIT_MOBILE  = 4;

interface Props {
  allTags: string[];
  activeTags: string[];
  onToggle: (tag: string) => void;
  /** Rendered inside a popover/sheet when overflow is open. Reuses FilterPanel. */
  overflowPanel: React.ReactNode;
  overflowOpen: boolean;
  onOverflowOpenChange: (open: boolean) => void;
  /** Mobile sheet render — same contract as the desktop popover but bottom-anchored. */
  renderMobileSheet: (panel: React.ReactNode) => React.ReactNode;
}

export default function TagRail({
  allTags,
  activeTags,
  onToggle,
  overflowPanel,
  overflowOpen,
  onOverflowOpenChange,
  renderMobileSheet,
}: Props) {
  const t = useT();
  const overflowBtnRef = useRef<HTMLButtonElement>(null);

  // Track viewport once on mount + on resize so inline tag count adapts.
  // Avoids SSR/CSR mismatch by starting at the desktop limit and narrowing
  // once the client can measure.
  const [inlineLimit, setInlineLimit] = useState<number>(INLINE_LIMIT_DESKTOP);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 767px)');
    const update = () => setInlineLimit(mql.matches ? INLINE_LIMIT_MOBILE : INLINE_LIMIT_DESKTOP);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  const overflowCount = Math.max(0, allTags.length - inlineLimit);
  const inlineTags = allTags.slice(0, inlineLimit);

  const zeroTags = allTags.length === 0;

  if (zeroTags) {
    return (
      <p
        className="font-label text-[11px] tracking-widest uppercase"
        style={{ color: 'var(--text-3)' }}
      >
        {t.tagsZeroHint}
      </p>
    );
  }

  return (
    <>
      {/* Always wrap — mobile clips to INLINE_LIMIT_MOBILE via state so the
          rail never overflows its container. No horizontal scroll. */}
      <div className="relative">
        <div
          className="flex flex-wrap gap-2 py-1"
          data-testid="tag-rail"
        >
          {inlineTags.map(tag => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggle(tag)}
                className="chip-press flex-shrink-0 font-label text-xs font-semibold tracking-widest uppercase px-3 rounded-full transition-all"
                style={{
                  minHeight: 44,
                  background: active ? 'var(--color-terracotta-contrast)' : 'transparent',
                  color: active ? 'var(--color-bone)' : 'var(--text-2)',
                  border: active
                    ? '1px solid var(--color-terracotta)'
                    : '1px solid color-mix(in oklch, var(--color-terracotta) 30%, transparent)',
                  boxShadow: active
                    ? '0 0 0 2px color-mix(in oklch, var(--color-terracotta) 20%, transparent)'
                    : 'none',
                }}
                aria-pressed={active}
                data-testid={`tag-filter-${tag}`}
              >
                {tag}
              </button>
            );
          })}

          {overflowCount > 0 && (
            <button
              ref={overflowBtnRef}
              type="button"
              onClick={() => onOverflowOpenChange(true)}
              className="flex-shrink-0 flex items-center gap-1.5 font-label text-xs tracking-widest uppercase px-3 rounded-full transition-all"
              style={{
                minHeight: 44,
                background: 'var(--bg-raised)',
                color: 'var(--text-3)',
                border: '1px solid var(--border)',
              }}
              aria-haspopup="dialog"
              aria-expanded={overflowOpen}
              data-testid="tag-rail-more"
            >
              {t.moreTagsBtn(overflowCount)}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Desktop popover — only mounted when overflowCount > 0 and open */}
        {overflowCount > 0 && (
          <div className="hidden md:block">
            <FilterPopover
              open={overflowOpen}
              onClose={() => onOverflowOpenChange(false)}
              anchorRef={overflowBtnRef}
            >
              {overflowPanel}
            </FilterPopover>
          </div>
        )}

        {/* Mobile sheet — consumer renders shell; we just pass the panel */}
        {overflowCount > 0 && overflowOpen && (
          <div className="md:hidden">{renderMobileSheet(overflowPanel)}</div>
        )}
      </div>
    </>
  );
}
