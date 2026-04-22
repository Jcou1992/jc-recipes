'use client';

import { useState, useRef, useEffect } from 'react';
import { updateUserPreferences } from '@/app/actions/preferences';
import { useToast } from '@/components/ui/ToastContext';

interface Props {
  initial: string;
  fallback: string;
  ariaLabel: string;
  savedToast: string;
  failedToast: string;
}

const MAX_LEN = 30;

export default function EditableSpaceName({
  initial,
  fallback,
  ariaLabel,
  savedToast,
  failedToast,
}: Props) {
  const { showToast } = useToast();
  const [value, setValue] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  const savedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      savedRef.current = false;
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEdit() {
    setDraft(value === fallback ? '' : value);
    setEditing(true);
  }

  async function save() {
    if (savedRef.current) return;
    savedRef.current = true;
    const trimmed = draft.trim().slice(0, MAX_LEN);
    const next = trimmed || fallback;
    const previous = value;
    // Optimistic
    setValue(next);
    setEditing(false);
    const result = await updateUserPreferences({ space_name: trimmed || null });
    if (!result.ok) {
      setValue(previous);
      showToast(failedToast, 'error');
      return;
    }
    showToast(savedToast, 'success');
  }

  function cancel() {
    savedRef.current = true;
    setEditing(false);
    setDraft(value);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value.slice(0, MAX_LEN))}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            save();
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            cancel();
          }
        }}
        className="font-display text-3xl md:text-4xl font-bold bg-transparent border-b outline-none"
        style={{ color: 'var(--text-1)', borderColor: 'var(--color-terracotta)' }}
        aria-label={ariaLabel}
        maxLength={MAX_LEN}
        data-testid="space-name-input"
      />
    );
  }

  return (
    <h1
      className="font-display text-3xl md:text-4xl font-bold cursor-pointer"
      style={{ color: 'var(--text-1)' }}
      onDoubleClick={startEdit}
      onClick={() => {
        // Mobile: single tap opens editor. Desktop: double-click (dblclick).
        if (typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches) {
          startEdit();
        }
      }}
      title="Double-click to edit"
      aria-label={ariaLabel}
      data-testid="editable-space-name"
    >
      {value}
    </h1>
  );
}
