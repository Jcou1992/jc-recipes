'use client';

import { useRef } from 'react';
import FilterPopover from './FilterPopover';
import { useT } from '@/components/ui/LanguageContext';

const INLINE_LIMIT = 12;

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

  const overflowCount = Math.max(0, allTags.length - INLINE_LIMIT);
  const inlineTags = allTags.slice(0, INLINE_LIMIT);

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
      {/* Mobile: horizontal scroll. Desktop: wrap. */}
      <div className="relative">
        <div
          className="flex gap-2 overflow-x-auto md:flex-wrap md:overflow-x-visible py-1 [mask-image:linear-gradient(to_right,black_94%,transparent)] md:[mask-image:none] [-webkit-mask-image:linear-gradient(to_right,black_94%,transparent)] md:[-webkit-mask-image:none]"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
          } as React.CSSProperties}
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
