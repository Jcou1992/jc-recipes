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

export default function IngredientRow({ value, onChange, onRemove }: Props) {
  const set = (field: keyof IngredientField, v: string) =>
    onChange({ ...value, [field]: v });

  return (
    <div className="flex gap-2 items-center">
      <input
        type="text"
        value={value.amount}
        onChange={e => set('amount', e.target.value)}
        placeholder="Cant."
        aria-label="Ingredient amount"
        className="input-base w-20"
      />
      <input
        type="text"
        value={value.unit}
        onChange={e => set('unit', e.target.value)}
        placeholder="Unidad"
        aria-label="Ingredient unit"
        className="input-base w-20"
      />
      <input
        type="text"
        value={value.name}
        onChange={e => set('name', e.target.value)}
        placeholder="Ingrediente"
        aria-label="Ingredient name"
        className="input-base flex-1"
      />
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove ingredient"
          className="btn-remove p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ×
        </button>
      )}
    </div>
  );
}
