'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastContext';
import {
  bulkDeleteRecipes,
  bulkDuplicateRecipes,
} from '@/app/actions/bulk-recipes';
import { recipesToMarkdown, triggerDownload } from '@/lib/utils/export-recipes';
import BulkTagDialog from './BulkTagDialog';
import type { Recipe } from '@/types/recipe';

interface Props {
  selectedIds: string[];
  selectedRecipes: Recipe[];
  allTags: string[];
  onDone: () => void;
  onOptimisticHide: (ids: string[]) => void;
  onOptimisticRestore: (ids: string[]) => void;
}

export default function BulkActionBar({
  selectedIds,
  selectedRecipes,
  allTags,
  onDone,
  onOptimisticHide,
  onOptimisticRestore,
}: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showProgress, setShowProgress] = useState(false);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** IDs that failed during the last bulk delete, kept so the user can retry. */
  const [retryIds, setRetryIds] = useState<string[]>([]);

  const count = selectedIds.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDone();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  async function handleDelete(idsToDelete?: string[]) {
    setConfirmOpen(false);
    setRetryIds([]);
    const ids = idsToDelete ?? [...selectedIds];
    onOptimisticHide(ids);
    progressTimerRef.current = setTimeout(() => setShowProgress(true), 1000);
    const result = await bulkDeleteRecipes(ids);
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    setShowProgress(false);
    if (result.succeeded.length === 0) {
      onOptimisticRestore(ids);
      const reason = result.failed[0]?.error ?? 'Check your connection and try again';
      setRetryIds(ids);
      showToast(`Failed to delete — ${reason}`, 'error');
      return;
    }
    if (result.failed.length > 0) {
      const failedIds = result.failed.map(f => f.id);
      onOptimisticRestore(failedIds);
      setRetryIds(failedIds);
      showToast(
        `Deleted ${result.succeeded.length} of ${ids.length} — ${result.failed.length} failed. Use Retry below.`,
        'info',
      );
    } else {
      showToast(`${result.succeeded.length} deleted`, 'success');
    }
    onDone();
    startTransition(() => router.refresh());
  }

  async function handleDuplicate() {
    const ids = selectedIds;
    const result = await bulkDuplicateRecipes(ids);
    if (result.succeeded.length === 0) {
      const reason = result.failed[0]?.error ?? 'Check your connection and try again';
      showToast(`Failed to duplicate — ${reason}`, 'error');
      return;
    }
    if (result.failed.length > 0) {
      showToast(`Duplicated ${result.succeeded.length} of ${ids.length} — ${result.failed.length} failed`, 'info');
    } else {
      showToast(`${result.succeeded.length} duplicated`, 'success');
    }
    onDone();
    startTransition(() => router.refresh());
  }

  function handleExportMarkdown() {
    if (selectedRecipes.length === 0) return;
    const md = recipesToMarkdown(selectedRecipes);
    const date = new Date().toISOString().slice(0, 10);
    const filename = selectedRecipes.length === 1
      ? `${selectedRecipes[0].name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`
      : `recipes-export-${date}.md`;
    triggerDownload(md, filename, 'text/markdown');
    showToast(`Exported ${selectedRecipes.length} recipe${selectedRecipes.length === 1 ? '' : 's'}`, 'success');
  }

  function handleExportPdf() {
    if (selectedIds.length === 0) return;
    const qs = new URLSearchParams({ ids: selectedIds.join(',') }).toString();
    window.open(`/recipes/print?${qs}`, '_blank');
  }

  const btn = 'font-label text-xs tracking-wider uppercase px-3 rounded-full min-h-[44px] flex items-center gap-1.5 transition-all flex-shrink-0 disabled:opacity-40';

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border)',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
        role="toolbar"
        aria-label="Bulk actions"
        data-testid="bulk-action-bar"
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto">
          {showProgress ? (
            <span
              className="font-label text-sm tracking-wide flex-shrink-0 pr-2 flex items-center gap-2"
              style={{ color: 'var(--text-1)' }}
              data-testid="bulk-count"
            >
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Deleting…
            </span>
          ) : (
            <span
              className="font-label text-sm tracking-wide flex-shrink-0 pr-2"
              style={{ color: 'var(--text-1)' }}
              data-testid="bulk-count"
            >
              {count} {count === 1 ? 'recipe selected' : 'recipes selected'}
            </span>
          )}

          <button
            type="button"
            onClick={handleDuplicate}
            disabled={isPending || count === 0}
            className={btn}
            style={{ background: 'var(--bg-raised)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            data-testid="bulk-duplicate"
          >
            Duplicate
          </button>

          <button
            type="button"
            onClick={() => setTagOpen(true)}
            disabled={isPending || count === 0}
            className={btn}
            style={{ background: 'var(--bg-raised)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            data-testid="bulk-tags"
          >
            Tags
          </button>

          <button
            type="button"
            onClick={handleExportMarkdown}
            disabled={count === 0}
            className={btn}
            style={{ background: 'var(--bg-raised)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            data-testid="bulk-export-md"
          >
            Export MD
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={count === 0}
            className={btn}
            style={{ background: 'var(--bg-raised)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            data-testid="bulk-export-pdf"
          >
            Export PDF
          </button>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending || count === 0}
            className={btn}
            style={{ background: 'var(--color-terracotta)', color: '#fff', border: '1px solid var(--color-terracotta)' }}
            data-testid="bulk-delete"
          >
            Delete
          </button>

          {retryIds.length > 0 && (
            <button
              type="button"
              onClick={() => handleDelete(retryIds)}
              disabled={isPending}
              className={btn}
              style={{
                background: 'var(--bg-raised)',
                color: 'var(--color-terracotta)',
                border: '1px solid var(--color-terracotta)',
              }}
              data-testid="bulk-retry"
            >
              Retry ({retryIds.length} failed)
            </button>
          )}

          <button
            type="button"
            onClick={onDone}
            className={btn}
            style={{ color: 'var(--text-2)', marginLeft: 'auto', flexShrink: 0 }}
            data-testid="bulk-cancel"
          >
            Cancel
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={count === 1 ? 'Delete recipe' : `Delete ${count} recipes`}
        description={
          count === 1
            ? 'Delete this recipe? This cannot be undone.'
            : `Delete these ${count} recipes? This cannot be undone.`
        }
        confirmLabel={isPending ? 'Deleting…' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      >
        {selectedRecipes.length > 0 && (
          <ul className="list-none m-0 p-0 space-y-1">
            {selectedRecipes.map(r => (
              <li
                key={r.id}
                className="font-body text-xs truncate"
                style={{ color: 'var(--text-2)' }}
              >
                {r.name}
              </li>
            ))}
          </ul>
        )}
      </ConfirmDialog>

      <BulkTagDialog
        open={tagOpen}
        selectedRecipes={selectedRecipes}
        allTags={allTags}
        onClose={() => setTagOpen(false)}
        onDone={() => {
          setTagOpen(false);
          onDone();
          startTransition(() => router.refresh());
        }}
      />
    </>
  );
}
