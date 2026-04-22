'use client';

import { useT } from '@/components/ui/LanguageContext';

type SortKey = 'newest' | 'az' | 'fastest' | 'most-ingredients';

interface Props {
  sort: SortKey;
  allTags: string[];
  activeTags: string[];
  tagSearch: string;
  hasFilters: boolean;
  onSortChange: (sort: SortKey) => void;
  onToggleTag: (tag: string) => void;
  onTagSearchChange: (s: string) => void;
  onDone: () => void;
  onClear: () => void;
}

function normalise(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export default function FilterPanel({
  sort,
  allTags,
  activeTags,
  tagSearch,
  hasFilters,
  onSortChange,
  onToggleTag,
  onTagSearchChange,
  onDone,
  onClear,
}: Props) {
  const t = useT();
  const sortLabels: Record<SortKey, string> = {
    newest: t.sortNewest,
    az: t.sortAz,
    fastest: t.sortFastest,
    'most-ingredients': t.sortMostIngredients,
  };
  const sortHints: Record<SortKey, string> = {
    newest: t.sortNewestHint,
    az: t.sortAzHint,
    fastest: t.sortFastestHint,
    'most-ingredients': t.sortMostIngredientsHint,
  };
  const filtered = allTags.filter(tag => normalise(tag).includes(normalise(tagSearch)));

  return (
    <div className="flex flex-col gap-6">
      {/* Sort */}
      <div>
        <p
          className="font-label text-xs tracking-widest uppercase mb-3"
          style={{ color: 'var(--text-3)' }}
        >
          {t.sortByLabel}
        </p>
        <div className="flex flex-col gap-1">
          {(Object.keys(sortLabels) as SortKey[]).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => onSortChange(k)}
              className="text-left font-body px-4 py-3 rounded-xl min-h-[48px] transition-all flex flex-col"
              style={
                sort === k
                  ? {
                      background: 'color-mix(in oklch, var(--color-terracotta) 10%, transparent)',
                      color: 'var(--color-terracotta)',
                    }
                  : { color: 'var(--text-1)' }
              }
              data-testid={`sort-option-${k}`}
            >
              <span className="text-base leading-tight">{sortLabels[k]}</span>
              <span
                className="font-label text-[11px] tracking-wide mt-0.5 uppercase"
                style={{ color: sort === k ? 'color-mix(in oklch, var(--color-terracotta) 70%, transparent)' : 'var(--text-3)' }}
              >
                {sortHints[k]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div>
          <p
            className="font-label text-xs tracking-widest uppercase mb-3"
            style={{ color: 'var(--text-3)' }}
          >
            {t.filterByTagLabel}
          </p>
          <div className="relative mb-3">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--text-3)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={tagSearch}
              onChange={e => onTagSearchChange(e.target.value)}
              placeholder={t.searchTagsPlaceholder}
              className="w-full pl-9 pr-10 py-2 rounded-full text-sm font-label tracking-wide"
              style={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border-input)',
                color: 'var(--text-1)',
                outline: 'none',
              }}
              aria-label={t.searchTagsAriaLabel}
              data-testid="tag-search"
            />
            {tagSearch && (
              <button
                type="button"
                onClick={() => onTagSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center"
                aria-label="Clear tag search"
                data-testid="tag-search-clear"
              >
                <svg
                  className="w-3.5 h-3.5"
                  style={{ color: 'var(--text-3)' }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {filtered.length === 0 ? (
              <p
                className="font-label text-xs tracking-wide py-2"
                style={{ color: 'var(--text-3)' }}
              >
                {t.noTagsFound}
              </p>
            ) : (
              filtered.map(tag => {
                const active = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onToggleTag(tag)}
                    className="font-label text-xs tracking-wider uppercase px-3 rounded-full min-h-[44px] flex items-center transition-all"
                    style={
                      active
                        ? {
                            background: 'var(--color-terracotta-contrast)',
                            color: 'var(--color-bone)',
                            border: '1px solid var(--color-terracotta)',
                          }
                        : {
                            background: 'var(--bg-raised)',
                            color: 'var(--text-2)',
                            border: '1px solid var(--border)',
                          }
                    }
                    aria-pressed={active}
                    data-testid={`tag-filter-${tag}`}
                  >
                    {tag}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onDone} className="btn-primary flex-1">
          {t.doneFilterBtn}
        </button>
        {hasFilters && (
          <button
            type="button"
            onClick={onClear}
            className="btn-ghost"
            data-testid="clear-filters-btn-sheet"
          >
            {t.clearFilterBtn}
          </button>
        )}
      </div>
    </div>
  );
}
