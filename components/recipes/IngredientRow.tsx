'use client';

import { useEffect, useRef, useState } from 'react';
import { useT } from '@/components/ui/LanguageContext';
import { searchFdcAction } from '@/app/actions/macros';

export interface IngredientField {
  amount: string;
  unit: string;
  name: string;
  fdc_id?: number;
}

interface Props {
  value: IngredientField;
  onChange: (value: IngredientField) => void;
  onRemove?: () => void;
}

const UNIT_DATALIST_ID = 'unit-options';

const UNITS = [
  'g', 'kg', 'mg', 'ml', 'l', 'dl',
  'cup', 'cups', 'tbsp', 'tsp',
  'oz', 'lb', 'fl oz',
  'pinch', 'dash', 'clove', 'slice', 'piece',
  'can', 'bunch', 'handful', 'sprig',
];

interface Suggestion {
  fdc_id: number;
  name: string;
}

export default function IngredientRow({ value, onChange, onRemove }: Props) {
  const t = useT();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = `ingredient-suggestions-${value.name.replace(/\s+/g, '-')}`;

  const set = (field: keyof IngredientField, v: string | number | undefined) =>
    onChange({ ...value, [field]: v });

  useEffect(() => {
    if (value.name.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = setTimeout(async () => {
      const result = await searchFdcAction(value.name.trim());
      if ('candidates' in result) {
        setSuggestions(result.candidates.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [value.name]);

  const pick = (s: Suggestion) => {
    onChange({ ...value, name: s.name, fdc_id: s.fdc_id });
    setOpen(false);
    setActiveIdx(-1);
  };

  return (
    <>
      <datalist id={UNIT_DATALIST_ID}>
        {UNITS.map(u => <option key={u} value={u} />)}
      </datalist>

      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={value.amount}
          onChange={e => set('amount', e.target.value)}
          placeholder={t.ingredientAmountPlaceholder}
          aria-label={t.ingredientAmountAriaLabel}
          className="input-base w-20"
        />
        <input
          type="text"
          value={value.unit}
          onChange={e => set('unit', e.target.value)}
          placeholder={t.ingredientUnitPlaceholder}
          aria-label={t.ingredientUnitAriaLabel}
          list={UNIT_DATALIST_ID}
          role="textbox"
          className="input-base w-24"
        />
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value.name}
            onChange={e => {
              onChange({ ...value, name: e.target.value, fdc_id: undefined });
              setOpen(true);
              setActiveIdx(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={e => {
              if (!open || suggestions.length === 0) return;
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIdx(i => Math.max(i - 1, 0));
              } else if (e.key === 'Enter' && activeIdx >= 0) {
                e.preventDefault();
                pick(suggestions[activeIdx]);
              } else if (e.key === 'Escape') {
                setOpen(false);
              }
            }}
            placeholder={t.ingredientDefault}
            aria-label={t.ingredientNameAriaLabel}
            role="combobox"
            aria-expanded={open && suggestions.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={activeIdx >= 0 ? `${listboxId}-${activeIdx}` : undefined}
            className="input-base w-full"
          />
          {open && suggestions.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              className="absolute z-20 left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg"
              style={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
              }}
            >
              {suggestions.map((s, i) => (
                <li
                  key={s.fdc_id}
                  id={`${listboxId}-${i}`}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseDown={e => {
                    e.preventDefault();
                    pick(s);
                  }}
                  onMouseEnter={() => setActiveIdx(i)}
                  className="font-body text-sm px-3 py-2 cursor-pointer"
                  style={{
                    color: 'var(--text-1)',
                    background:
                      i === activeIdx
                        ? 'color-mix(in oklch, var(--color-terracotta) 12%, transparent)'
                        : 'transparent',
                  }}
                >
                  {s.name}
                </li>
              ))}
            </ul>
          )}
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={t.removeIngredientAriaLabel}
            className="btn-remove p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            ×
          </button>
        )}
      </div>
    </>
  );
}
