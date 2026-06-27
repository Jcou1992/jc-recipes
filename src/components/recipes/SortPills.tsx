'use client';

import { useRef, type KeyboardEvent } from 'react';
import { useT } from '@/components/ui/LanguageContext';

export type SortKey = 'newest' | 'az' | 'fastest' | 'most-ingredients';

interface Props {
  sort: SortKey;
  onChange: (next: SortKey) => void;
}

const ORDER: SortKey[] = ['newest', 'az', 'fastest', 'most-ingredients'];

export default function SortPills({ sort, onChange }: Props) {
  const t = useT();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function label(k: SortKey): string {
    switch (k) {
      case 'newest': return t.sortNewest;
      case 'az': return t.sortAz;
      case 'fastest': return t.sortFastest;
      case 'most-ingredients': return t.sortMostIngredients;
    }
  }

  function hint(k: SortKey): string {
    switch (k) {
      case 'newest': return t.sortNewestHint;
      case 'az': return t.sortAzHint;
      case 'fastest': return t.sortFastestHint;
      case 'most-ingredients': return t.sortMostIngredientsHint;
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, idx: number) {
    // WAI-ARIA radio-group pattern: arrow keys MOVE focus only. Commit
    // happens on Space/Enter (or click). Committing on arrow fires
    // router.replace per keystroke which was a measurable perf hit.
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      refs.current[(idx + 1) % ORDER.length]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      refs.current[(idx - 1 + ORDER.length) % ORDER.length]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      refs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      refs.current[ORDER.length - 1]?.focus();
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(ORDER[idx]);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={t.sortByLabel}
      className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 py-1 min-w-0"
      data-testid="sort-pills"
    >
      {ORDER.map((k, idx) => {
        const active = sort === k;
        return (
          <button
            key={k}
            ref={el => { refs.current[idx] = el; }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(k)}
            onKeyDown={e => onKeyDown(e, idx)}
            className="chip-press flex flex-col items-start justify-center gap-0.5 px-3 rounded-xl transition-all min-w-0"
            style={{
              minHeight: 52,
              background: active ? 'var(--color-terracotta-contrast)' : 'transparent',
              color: active ? 'var(--color-bone)' : 'var(--text-2)',
              border: active
                ? '1px solid var(--color-terracotta)'
                : '1px solid color-mix(in oklch, var(--color-terracotta) 30%, transparent)',
              boxShadow: active
                ? '0 0 0 2px color-mix(in oklch, var(--color-terracotta) 20%, transparent)'
                : 'none',
            }}
            data-testid={`sort-pill-${k}`}
          >
            <span className="font-label text-xs font-semibold tracking-widest uppercase leading-none whitespace-nowrap">
              {label(k)}
            </span>
            <span
              className="font-label text-[10px] tracking-wide leading-tight truncate max-w-full"
              style={{
                color: active
                  ? 'color-mix(in oklch, var(--color-bone) 75%, transparent)'
                  : 'var(--text-3)',
              }}
            >
              {hint(k)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
