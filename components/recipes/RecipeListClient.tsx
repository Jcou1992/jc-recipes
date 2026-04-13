'use client';

import { useMemo, useState, useRef, useEffect, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import RecipeCard from './RecipeCard';
import type { Recipe } from '@/types/recipe';

function normalise(s: string) {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

type SortKey = 'newest' | 'az' | 'fastest' | 'most-ingredients';

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest',
  az: 'A → Z',
  fastest: 'Fastest',
  'most-ingredients': 'Most ingredients',
};

interface Props {
  recipes: Recipe[];
  allTags: string[];
}

export default function RecipeListClient({ recipes, allTags }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const q = searchParams.get('q') ?? '';
  const activeTags = useMemo(() => {
    const t = searchParams.get('tags');
    return t ? t.split(',').filter(Boolean) : [];
  }, [searchParams]);
  const sort = (searchParams.get('sort') ?? 'newest') as SortKey;

  const [searchInput, setSearchInput] = useState(q);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSearchInput(q); }, [q]);

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
    startTransition(() => { router.replace(pathname, { scroll: false }); });
  }

  const filtered = useMemo(() => {
    let list = recipes;

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
  }, [recipes, q, activeTags, sort]);

  const hasFilters = !!(q || activeTags.length > 0 || sort !== 'newest');

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <input
          type="search"
          value={searchInput}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Buscar recetas…"
          className="input-base w-full pl-10 pr-10"
          aria-label="Search recipes"
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
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" style={{ color: 'var(--text-3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Tag strip + sort row */}
      {(allTags.length > 0 || sort !== 'newest') && (
        <div className="flex items-center gap-3 mb-6">
          {/* Tag strip */}
          {allTags.length > 0 && (
            <div
              className="flex gap-2 overflow-x-auto flex-1 pb-1"
              style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' } as React.CSSProperties}
            >
              {allTags.map(tag => {
                const active = activeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="flex-shrink-0 font-label text-xs tracking-wider uppercase px-3 rounded-full transition-all min-h-[44px] flex items-center"
                    style={active
                      ? { background: 'var(--color-terracotta)', color: '#fff', border: '1px solid var(--color-terracotta)' }
                      : { background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                    }
                    aria-pressed={active}
                    data-testid={`tag-filter-${tag}`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sort — desktop pill buttons */}
          <div className="hidden sm:flex flex-shrink-0 gap-1.5" data-testid="sort-select">
            {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
              <button
                key={k}
                onClick={() => updateParams({ sort: k })}
                className="font-label text-xs tracking-wider uppercase px-3 rounded-full min-h-[36px] transition-all"
                style={sort === k
                  ? { background: 'var(--color-terracotta)', color: '#fff', border: '1px solid var(--color-terracotta)' }
                  : { background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                }
                aria-pressed={sort === k}
              >
                {SORT_LABELS[k]}
              </button>
            ))}
          </div>

          {/* Sort — mobile button */}
          <button
            onClick={() => setShowSortSheet(true)}
            className="sm:hidden flex-shrink-0 font-label text-xs tracking-wider uppercase px-3 rounded-full min-h-[44px] flex items-center gap-1"
            style={{ background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }}
            aria-label="Sort options"
            data-testid="sort-mobile-btn"
          >
            {SORT_LABELS[sort]}
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {/* Sort bottom sheet (mobile) */}
      {showSortSheet && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setShowSortSheet(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl p-6"
            style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-dialog)' }}
            role="dialog"
            aria-label="Sort options"
          >
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--border)' }} />
            <p className="font-label text-xs tracking-widest uppercase mb-4" style={{ color: 'var(--text-3)' }}>
              Ordenar por
            </p>
            <div className="flex flex-col gap-2">
              {(Object.keys(SORT_LABELS) as SortKey[]).map(k => (
                <button
                  key={k}
                  onClick={() => { updateParams({ sort: k }); setShowSortSheet(false); }}
                  className="text-left font-body text-base px-4 py-3 rounded-xl min-h-[48px] transition-all"
                  style={sort === k
                    ? { background: 'rgba(212,112,63,0.1)', color: 'var(--color-terracotta)' }
                    : { color: 'var(--text-1)' }
                  }
                  data-testid={`sort-option-${k}`}
                >
                  {SORT_LABELS[k]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-20" data-testid="filtered-empty-state">
          <p className="font-display text-xl font-semibold mb-2" style={{ color: 'var(--text-2)' }}>
            No hay recetas que coincidan
          </p>
          {hasFilters && (
            <button onClick={clearFilters} className="btn-ghost mt-4" data-testid="clear-filters-btn">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((recipe, index) => (
            <div
              key={recipe.id}
              className={`animate-fade-up${index === 0 ? ' sm:col-span-2' : ''}`}
              style={{ animationDelay: `${Math.min(index, 6) * 60}ms`, animationFillMode: 'both' }}
            >
              <RecipeCard recipe={recipe} featured={index === 0} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
