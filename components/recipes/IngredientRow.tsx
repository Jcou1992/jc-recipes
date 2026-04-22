'use client';

import { useT } from '@/components/ui/LanguageContext';

export interface IngredientField {
  amount: string;
  unit: string;
  name: string;
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

export default function IngredientRow({ value, onChange, onRemove }: Props) {
  const t = useT();
  const set = (field: keyof IngredientField, v: string) =>
    onChange({ ...value, [field]: v });

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
        <input
          type="text"
          value={value.name}
          onChange={e => set('name', e.target.value)}
          placeholder={t.ingredientDefault}
          aria-label={t.ingredientNameAriaLabel}
          className="input-base flex-1"
        />
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
