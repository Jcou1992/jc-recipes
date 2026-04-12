'use client';

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

const cellClass =
  'border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white';

export default function IngredientRow({ value, onChange, onRemove }: Props) {
  const set = (field: keyof IngredientField, v: string) =>
    onChange({ ...value, [field]: v });

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        value={value.amount}
        onChange={e => set('amount', e.target.value)}
        placeholder="Amount"
        aria-label="Ingredient amount"
        className={`w-20 ${cellClass}`}
      />
      <input
        type="text"
        value={value.unit}
        onChange={e => set('unit', e.target.value)}
        placeholder="Unit"
        aria-label="Ingredient unit"
        className={`w-20 ${cellClass}`}
      />
      <input
        type="text"
        value={value.name}
        onChange={e => set('name', e.target.value)}
        placeholder="Ingredient name"
        aria-label="Ingredient name"
        className={`flex-1 ${cellClass}`}
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove ingredient"
          className="p-2 text-stone-400 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ×
        </button>
      )}
    </div>
  );
}
