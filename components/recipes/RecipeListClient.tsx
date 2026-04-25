'use client';

import { useMemo, useState, useRef, useEffect, useTransition, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import RecipeCard from './RecipeCard';
import BulkActionBar from './BulkActionBar';
import FilterPanel from './FilterPanel';
import SortPills, { type SortKey as SortKeyT } from './SortPills';
import TagRail from './TagRail';
import { Ticket } from '@/components/ui/brut/Ticket';
import { useT } from '@/components/ui/LanguageContext';
import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut';
import { normalise } from '@/lib/utils/normalise';
import type { Recipe } from '@/types/recipe';

type SortKey = 'newest' | 'az' | 'fastest' | 'most-ingredients';

interface Props {
  recipes: Recipe[];
  allTags: string[];
}

export default function RecipeListClient({ recipes, allTags }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const t = useT();

  const q = searchParams.get('q') ?? '';
  const activeTags = useMemo(() => {
    const tag = searchParams.get('tags');
    return tag ? tag.split(',').filter(Boolean) : [];
  }, [searchParams]);
  const sort = (searchParams.get('sort') ?? 'newest') as SortKey;

  const [searchInput, setSearchInput] = useState(q);
  const [tagSearch, setTagSearch] = useState('');
  const [showOverflow, setShowOverflow] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number | null>(null);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  // Brut design-mode detection — gates the [ MISE · EMPTY ] ticket on the
  // empty-state path (R3). Reads `data-design` on `<html>` at mount, matches
  // the pattern Wayfinder/CookMode use; SSR defaults to classic so hydration
  // stays pixel-identical until the effect runs.
  const [isBrut, setIsBrut] = useState(false);
  useEffect(() => {
    setIsBrut(document.documentElement.getAttribute('data-design') === 'brut');
  }, []);

  useEffect(() => { setSearchInput(q); }, [q]);

  useEffect(() => {
    const existing = new Set(recipes.map(r => r.id));
    setHiddenIds(prev => {
      const next = new Set<string>();
      for (const id of prev) if (existing.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
    setSelectedIds(prev => {
      const next = new Set<string>();
      for (const id of prev) if (existing.has(id)) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [recipes]);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (!val) params.delete(key);
      else params.set(key, val);
    }
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function handleSearchChange(value: string) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ q: value }), 150);
  }

  function toggleTag(tag: string) {
    const next = activeTags.includes(tag)
      ? activeTags.filter(t => t !== tag)
      : [...activeTags, tag];
    updateParams({ tags: next.join(',') || null });
  }

  function clearFilters() {
    setSearchInput('');
    setTagSearch('');
    startTransition(() => { router.replace(pathname, { scroll: false }); });
  }

  const filtered = useMemo(() => {
    let list = recipes.filter(r => !hiddenIds.has(r.id));

    if (q) {
      const nq = normalise(q);
      list = list.filter(r =>
        normalise(r.name).includes(nq) ||
        (r.description != null && normalise(r.description).includes(nq))
      );
    }

    if (activeTags.length > 0) {
      list = list.filter(r => activeTags.every(tag => r.tags?.includes(tag)));
    }

    switch (sort) {
      case 'az':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'fastest':
        list = [...list].sort((a, b) =>
          ((a.prep_time ?? 0) + (a.cook_time ?? 0)) - ((b.prep_time ?? 0) + (b.cook_time ?? 0))
        );
        break;
      case 'most-ingredients':
        list = [...list].sort((a, b) => b.ingredients.length - a.ingredients.length);
        break;
    }

    return list;
  }, [recipes, hiddenIds, q, activeTags, sort]);

  const hasFilters = !!(q || activeTags.length > 0 || sort !== 'newest');

  useKeyboardShortcut('/', () => {
    searchInputRef.current?.focus();
    searchInputRef.current?.select();
  });
  useKeyboardShortcut('f', () => {
    // Only meaningful when overflow exists
    if (allTags.length <= 12) return;
    setShowOverflow(v => !v);
  });
  useKeyboardShortcut(
    'Escape',
    () => {
      if (showOverflow) setShowOverflow(false);
      if (hasFilters) clearFilters();
    },
    { ignoreInInputs: false },
  );

  const enterSelectMode = useCallback(() => {
    setSelectMode(true);
    setLastSelectedIdx(null);
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setLastSelectedIdx(null);
  }, []);

  const toggleSelect = useCallback(
    (id: string, idx: number, shift: boolean) => {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (shift && lastSelectedIdx !== null && lastSelectedIdx !== idx) {
          const [from, to] = [Math.min(lastSelectedIdx, idx), Math.max(lastSelectedIdx, idx)];
          for (let i = from; i <= to; i++) {
            const r = filtered[i];
            if (r) next.add(r.id);
          }
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setLastSelectedIdx(idx);
    },
    [filtered, lastSelectedIdx],
  );

  const selectAllVisible = useCallback(() => {
    setSelectedIds(prev => {
      const visibleIds = filtered.map(r => r.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        for (const id of visibleIds) next.delete(id);
        return next;
      }
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }, [filtered]);

  const handleOptimisticHide = useCallback((ids: string[]) => {
    if (!Array.isArray(ids)) return;
    setHiddenIds(prev => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
  }, []);

  const handleOptimisticRestore = useCallback((ids: string[]) => {
    if (!Array.isArray(ids)) return;
    setHiddenIds(prev => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
  }, []);

  const selectedCount = selectedIds.size;
  const allSelected =
    filtered.length > 0 && filtered.every(r => selectedIds.has(r.id));

  const selectedRecipes = useMemo(
    () => recipes.filter(r => selectedIds.has(r.id)),
    [recipes, selectedIds],
  );

  // Handlers for the filter surface
  const handleSortChange = useCallback(
    (k: SortKeyT) => { updateParams({ sort: k }); },
    // updateParams is stable enough in this context (closure over router/params).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams, pathname],
  );
  const handleDone = useCallback(() => setShowOverflow(false), []);

  const overflowPanel = (
    <FilterPanel
      allTags={allTags}
      activeTags={activeTags}
      tagSearch={tagSearch}
      onToggleTag={toggleTag}
      onTagSearchChange={setTagSearch}
      onDone={handleDone}
    />
  );

  return (
    <div className={selectMode && selectedCount > 0 ? 'pb-24' : ''}>
      {/* Search bar + Select button */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <input
            ref={searchInputRef}
            type="search"
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="input-base w-full pl-10 pr-10"
            style={{ borderRadius: '9999px' }}
            aria-label={t.searchAriaLabel}
            data-testid="recipe-search"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: 'var(--text-3)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchInput && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t.clearSearchAriaLabel}
            >
              <svg className="w-4 h-4" style={{ color: 'var(--text-3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={selectMode ? exitSelectMode : enterSelectMode}
          className="flex-shrink-0 font-label text-xs tracking-wider uppercase px-4 rounded-full min-h-[44px] flex items-center gap-1.5 transition-all"
          style={selectMode
            ? { background: 'var(--color-terracotta-contrast)', color: 'var(--color-bone)', border: '1px solid var(--color-terracotta)' }
            : { background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }
          }
          data-testid={selectMode ? 'select-mode-exit' : 'select-mode-enter'}
        >
          {selectMode ? t.doneSelectBtn : t.selectBtn}
        </button>
      </div>

      <p className="hidden sm:block font-label text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--text-3)' }}>
        {t.shortcutHint}
      </p>

      {/* Select-all + hint row */}
      {selectMode && filtered.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={selectAllVisible}
            className="font-label text-xs tracking-wider uppercase min-h-[44px] flex items-center gap-2"
            style={{ color: 'var(--text-2)' }}
            data-testid="select-all"
          >
            <span
              className="inline-flex w-5 h-5 rounded-full items-center justify-center"
              style={{
                background: allSelected ? 'var(--color-terracotta)' : 'transparent',
                border: `2px solid ${allSelected ? 'var(--color-terracotta)' : 'var(--border)'}`,
              }}
              aria-hidden="true"
            >
              {allSelected && (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            {allSelected ? t.deselectAll : t.selectAll(filtered.length)}
          </button>
          <span className="font-label text-xs tracking-wide" style={{ color: 'var(--text-3)' }}>
            {selectedCount > 0 ? t.nSelectedHint(selectedCount) : t.tapToSelect}
          </span>
        </div>
      )}

      {/* Desktop: single Filter button + popover */}
      {/* Sort row: always visible when there's anything to sort (i.e. recipes exist). */}
      {recipes.length > 0 && !selectMode && (
        <div className="flex items-center justify-between gap-3 mb-3">
          <SortPills sort={sort} onChange={handleSortChange} />
          <p
            className="flex-shrink-0 font-label text-xs tracking-widest uppercase tabular-nums"
            style={{ color: 'var(--text-3)' }}
            role="status"
            aria-live="polite"
            data-testid="result-count"
          >
            {hasFilters
              ? t.resultCountOf(filtered.length, recipes.length - hiddenIds.size)
              : t.resultCount(filtered.length)}
            {activeTags.length > 0 && (
              <span className="sr-only"> {t.filteredBy(activeTags)}</span>
            )}
          </p>
        </div>
      )}

      {/* Tag row + CLEAR */}
      {recipes.length > 0 && !selectMode && (
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex-1 min-w-0">
            <TagRail
              allTags={allTags}
              activeTags={activeTags}
              onToggle={toggleTag}
              overflowPanel={overflowPanel}
              overflowOpen={showOverflow}
              onOverflowOpenChange={setShowOverflow}
              renderMobileSheet={(panel) => (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    style={{ background: 'oklch(0 0 0 / 0.5)' }}
                    onClick={() => setShowOverflow(false)}
                  />
                  <div
                    className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl"
                    style={{
                      background: 'var(--bg-card)',
                      boxShadow: 'var(--shadow-dialog)',
                      maxHeight: '85svh',
                      display: 'flex',
                      flexDirection: 'column',
                      paddingBottom: 'env(safe-area-inset-bottom, 0)',
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="All tags"
                    data-testid="filter-sheet"
                  >
                    <div className="overflow-y-auto px-6 pt-6 pb-8">{panel}</div>
                  </div>
                </>
              )}
            />
          </div>
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex-shrink-0 font-label text-xs tracking-widest uppercase transition-colors"
              style={{ color: 'var(--color-terracotta)', minHeight: 44, padding: '0 0.5rem' }}
              data-testid="clear-filters-btn-inline"
            >
              {t.clearFiltersBtn}
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        isBrut ? (
          <div className="py-12" data-testid="filtered-empty-state">
            <Ticket code="MISE · EMPTY" className="brut-empty-ticket">
              <div className="brut-empty-body">
                <p className="brut-empty-rule" aria-hidden="true">────────────────────</p>
                <p className="brut-empty-headline">
                  {hasFilters ? 'NO MATCHES.' : 'NO RECIPES YET.'}
                </p>
                {hasFilters ? (
                  <>
                    {(q || activeTags.length > 0) && (
                      <p className="brut-empty-meta">
                        {q && `QUERY: "${q.toUpperCase()}"`}
                        {q && activeTags.length > 0 && ' · '}
                        {activeTags.length > 0 && `TAGS: [${activeTags.join(', ').toUpperCase()}]`}
                      </p>
                    )}
                    <p className="brut-empty-cta">
                      <button
                        type="button"
                        onClick={clearFilters}
                        data-testid="clear-filters-btn"
                        className="brut-empty-action"
                      >
                        CLEAR FILTERS
                      </button>
                      <span aria-hidden="true"> · </span>
                      <span className="brut-empty-hint">OR REPHRASE QUERY.</span>
                    </p>
                  </>
                ) : (
                  <p className="brut-empty-cta">
                    <span className="brut-empty-hint">PRESS </span>
                    <kbd className="brut-empty-key">N</kbd>
                    <span className="brut-empty-hint"> OR TAP </span>
                    <Link href="/recipes/new" className="brut-empty-action">+ NEW RECIPE</Link>
                    <span className="brut-empty-hint">.</span>
                  </p>
                )}
              </div>
            </Ticket>
          </div>
        ) : (
          <div className="text-center py-20" data-testid="filtered-empty-state">
            <p className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-2)' }}>
              {t.nothingHere}
            </p>
            {hasFilters && (
              <>
                {(q || activeTags.length > 0) && (
                  <p className="font-label text-xs tracking-wide mb-2" style={{ color: 'var(--text-3)' }}>
                    {`No match for "${q}"${activeTags.length ? ` with tags [${activeTags.join(', ')}]` : ''}`}
                  </p>
                )}
                {(!q && activeTags.length === 0) && (
                  <p className="font-body text-base mb-4" style={{ color: 'var(--text-3)' }}>
                    {t.tryDifferentTags}
                  </p>
                )}
                <button onClick={clearFilters} className="btn-ghost" data-testid="clear-filters-btn">
                  {t.clearFiltersBtn}
                </button>
              </>
            )}
          </div>
        )
      ) : (
        <div
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-4 transition-opacity"
          style={{ opacity: isPending ? 0.6 : 1 }}
          aria-busy={isPending}
        >
          {filtered.map((recipe, index) => {
            const isMatch =
              !!q &&
              index < 8 &&
              (normalise(recipe.name).includes(normalise(q)) ||
                (recipe.description != null &&
                  normalise(recipe.description).includes(normalise(q))));
            return (
              <div
                key={recipe.id}
                className={`animate-fade-up${!selectMode && index === 0 ? ' col-span-full md:col-span-2' : ''}`}
                style={{ animationDelay: `${Math.min(index, 11) * 80}ms`, animationFillMode: 'both' }}
              >
                <RecipeCard
                  recipe={recipe}
                  featured={!selectMode && index === 0}
                  selectMode={selectMode}
                  selected={selectedIds.has(recipe.id)}
                  onToggle={shift => toggleSelect(recipe.id, index, shift)}
                  isSearchMatch={isMatch}
                />
              </div>
            );
          })}
        </div>
      )}

      {selectMode && selectedCount > 0 && (
        <BulkActionBar
          selectedIds={Array.from(selectedIds)}
          selectedRecipes={selectedRecipes}
          allTags={allTags}
          onDone={exitSelectMode}
          onOptimisticHide={handleOptimisticHide}
          onOptimisticRestore={handleOptimisticRestore}
        />
      )}

    </div>
  );
}
