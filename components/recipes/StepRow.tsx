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

export default function StepRow({ index, value, onChange, onRemove }: Props) {
  const set = (field: keyof StepField, v: string | boolean) =>
    onChange({ ...value, [field]: v });

  return (
    <div className="flex gap-3 items-start">
      <span
        className="font-label mt-2.5 flex-shrink-0 text-base font-bold leading-none"
        style={{ color: 'var(--color-terracotta)', minWidth: '1.25rem' }}
      >
        {index + 1}
      </span>

      <div className="flex-1 space-y-1.5">
        <textarea
          value={value.content}
          onChange={e => set('content', e.target.value)}
          placeholder={`Paso ${index + 1}…`}
          rows={2}
          aria-label={`Step ${index + 1}`}
          className="input-base w-full resize-none"
        />
        <label
          className="font-label flex items-center gap-2 text-xs tracking-widest uppercase cursor-pointer select-none"
          style={{ color: 'var(--text-3)' }}
        >
          <input
            type="checkbox"
            checked={value.timerEnabled}
            onChange={e => set('timerEnabled', e.target.checked)}
            className="accent-terracotta"
            style={{ accentColor: '#D4703F' }}
          />
          Timer
          {value.timerEnabled && (
            <input
              type="text"
              value={value.timerInput}
              onChange={e => set('timerInput', e.target.value)}
              placeholder="ej. 5 min, 1h 30min"
              aria-label="Timer duration"
              className="input-base ml-1 w-36"
              style={{ display: 'inline-block' }}
            />
          )}
        </label>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove step"
          className="btn-remove mt-2 p-2 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          ×
        </button>
      )}
    </div>
  );
}
