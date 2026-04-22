'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import { bulkUpdateTags } from '@/app/actions/bulk-recipes';
import { useToast } from '@/components/ui/ToastContext';
import { useT } from '@/components/ui/LanguageContext';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import type { Recipe } from '@/types/recipe';

interface Props {
  open: boolean;
  selectedRecipes: Recipe[];
  allTags: string[];
  onClose: () => void;
  onDone: () => void;
}

export default function BulkTagDialog({
  open,
  selectedRecipes,
  allTags,
  onClose,
  onDone,
}: Props) {
  const { showToast } = useToast();
  const t = useT();
  const [addTags, setAddTags] = useState<string[]>([]);
  const [removeTags, setRemoveTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isPending, startTransition] = useTransition();

  const sharedTags = useMemo(() => {
    if (selectedRecipes.length === 0) return [];
    const first = selectedRecipes[0].tags ?? [];
    return first.filter(t => selectedRecipes.every(r => (r.tags ?? []).includes(t)));
  }, [selectedRecipes]);

  const query = newTagInput.trim().toLowerCase();

  const suggestable = useMemo(() => {
    const pool = allTags.filter(t => !addTags.includes(t));
    if (!query) return pool;
    return pool.filter(t => t.toLowerCase().includes(query));
  }, [allTags, addTags, query]);

  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open, onClose);

  if (!open) return null;

  function toggleAdd(tag: string) {
    setAddTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
    setRemoveTags(prev => prev.filter(t => t !== tag));
  }

  function toggleRemove(tag: string) {
    setRemoveTags(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]));
    setAddTags(prev => prev.filter(t => t !== tag));
  }

  function commitNewTag() {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;
    if (!addTags.includes(trimmed)) setAddTags(prev => [...prev, trimmed]);
    setNewTagInput('');
  }

  function reset() {
    setAddTags([]);
    setRemoveTags([]);
    setNewTagInput('');
  }

  async function handleApply() {
    const ids = selectedRecipes.map(r => r.id);
    startTransition(async () => {
      const result = await bulkUpdateTags(ids, addTags, removeTags);
      if (result.succeeded.length === 0) {
        const reason = result.failed[0]?.error ?? 'Check your connection and try again';
        showToast(`Couldn't update tags. ${reason}`, 'error');
        return;
      }
      if (result.failed.length > 0) {
        showToast(t.bulkTagUpdatePartial(result.succeeded.length, ids.length), 'info');
      } else {
        showToast(t.bulkTagUpdated(result.succeeded.length), 'success');
      }
      reset();
      onDone();
    });
  }

  function handleClose() {
    reset();
    onClose();
  }

  const hasChanges = addTags.length > 0 || removeTags.length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-tag-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0"
        style={{ background: 'oklch(0 0 0 / 0.65)' }}
        onClick={handleClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-scale-in"
        style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-dialog)' }}
        data-testid="bulk-tag-dialog"
      >
        <h2
          id="bulk-tag-title"
          className="font-display text-xl font-semibold mb-4"
          style={{ color: 'var(--text-1)' }}
        >
          {t.bulkTagDialogTitle(selectedRecipes.length)}
        </h2>

        {/* Add tags */}
        <div className="mb-5">
          <p className="font-label text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>
            {t.bulkTagAddSection}
          </p>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTagInput}
              onChange={e => setNewTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitNewTag();
                }
              }}
              placeholder={t.bulkTagNewPlaceholder}
              aria-label="Filter or add tag"
              className="input-base flex-1 text-sm"
              data-testid="bulk-tag-new-input"
            />
            <button
              type="button"
              onClick={commitNewTag}
              disabled={!newTagInput.trim()}
              className="btn-ghost text-sm disabled:opacity-40"
            >
              {t.bulkTagAddBtn}
            </button>
          </div>
          {suggestable.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {suggestable.map(tag => {
                const active = addTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleAdd(tag)}
                    className="font-label text-xs tracking-wider uppercase px-2.5 py-1 rounded-full transition-all"
                    style={active
                      ? { background: 'var(--color-gold)', color: 'var(--color-ink)', border: '1px solid var(--color-gold)' }
                      : { background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                    }
                    aria-pressed={active}
                    data-testid={`bulk-tag-add-${tag}`}
                  >
                    + {tag}
                  </button>
                );
              })}
            </div>
          ) : query ? (
            <p className="font-body text-xs italic" style={{ color: 'var(--text-3)' }}>
              No match. Press Enter to create &ldquo;{newTagInput.trim()}&rdquo;.
            </p>
          ) : null}
          {addTags.filter(tag => !allTags.includes(tag)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {addTags
                .filter(tag => !allTags.includes(tag))
                .map(tag => (
                  <span
                    key={tag}
                    className="font-label text-xs tracking-wider uppercase px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--color-gold)', color: 'var(--color-ink)', border: '1px solid var(--color-gold)' }}
                  >
                    + {tag}
                  </span>
                ))}
            </div>
          )}
        </div>

        {/* Remove tags */}
        {sharedTags.length > 0 && (
          <div className="mb-5">
            <p className="font-label text-xs tracking-widest uppercase mb-2" style={{ color: 'var(--text-3)' }}>
              {t.bulkTagRemoveSection}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sharedTags.map(tag => {
                const active = removeTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleRemove(tag)}
                    className="font-label text-xs tracking-wider uppercase px-2.5 py-1 rounded-full transition-all"
                    style={active
                      ? { background: 'var(--color-terracotta-contrast)', color: 'var(--color-bone)', border: '1px solid var(--color-terracotta)' }
                      : { background: 'var(--bg-raised)', color: 'var(--text-2)', border: '1px solid var(--border)' }
                    }
                    aria-pressed={active}
                    data-testid={`bulk-tag-remove-${tag}`}
                  >
                    − {tag}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-end mt-6">
          <button type="button" onClick={handleClose} className="btn-ghost">
            {t.bulkTagCancel}
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!hasChanges || isPending}
            className="btn-primary disabled:opacity-40"
            data-testid="bulk-tag-apply"
          >
            {isPending ? t.bulkTagUpdating : t.bulkTagApply}
          </button>
        </div>
      </div>
    </div>
  );
}
