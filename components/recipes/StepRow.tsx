'use client';

export interface StepField {
  content: string;
  timerEnabled: boolean;
  timerInput: string;
}

interface Props {
  index: number;
  value: StepField;
  onChange: (value: StepField) => void;
  onRemove?: () => void;
}

const inputClass =
  'border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white';

export default function StepRow({ index, value, onChange, onRemove }: Props) {
  const set = (field: keyof StepField, v: string | boolean) =>
    onChange({ ...value, [field]: v });

  return (
    <div className="flex gap-2 items-start">
      <span className="mt-2.5 flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center justify-center">
        {index + 1}
      </span>

      <div className="flex-1 space-y-1.5">
        <textarea
          value={value.content}
          onChange={e => set('content', e.target.value)}
          placeholder={`Step ${index + 1}…`}
          rows={2}
          aria-label={`Step ${index + 1}`}
          className={`w-full resize-none ${inputClass}`}
        />
        <label className="flex items-center gap-2 text-sm text-stone-500 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={value.timerEnabled}
            onChange={e => set('timerEnabled', e.target.checked)}
            className="accent-orange-500"
          />
          Timer
          {value.timerEnabled && (
            <input
              type="text"
              value={value.timerInput}
              onChange={e => set('timerInput', e.target.value)}
              placeholder="e.g. 5 min, 1h 30min"
              aria-label="Timer duration"
              className={`ml-1 w-36 ${inputClass}`}
            />
          )}
        </label>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove step"
          className="mt-2 p-2 text-stone-400 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ×
        </button>
      )}
    </div>
  );
}
