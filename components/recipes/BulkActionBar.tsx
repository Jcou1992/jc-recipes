'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/ToastContext';
import { useT } from '@/components/ui/LanguageContext';
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
  const t = useT();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [showProgress, setShowProgress] = useState(false);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      showToast(t.bulkDeleteFailed(reason), 'error');
      return;
    }
    if (result.failed.length > 0) {
      const failedIds = result.failed.map(f => f.id);
      onOptimisticRestore(failedIds);
      setRetryIds(failedIds);
      showToast(t.bulkDeletePartial(result.succeeded.length, ids.length, result.failed.length), 'info');
    } else {
      showToast(t.bulkDeleted(result.succeeded.length), 'success');
    }
    onDone();
    startTransition(() => router.refresh());
  }

  async function handleDuplicate() {
    const ids = selectedIds;
    const result = await bulkDuplicateRecipes(ids);
    if (result.succeeded.length === 0) {
      const reason = result.failed[0]?.error ?? 'Check your connection and try again';
      showToast(t.bulkDuplicateFailed(reason), 'error');
      return;
    }
    if (result.failed.length > 0) {
      showToast(t.bulkDuplicatePartial(result.succeeded.length, ids.length, result.failed.length), 'info');
    } else {
      showToast(t.bulkDuplicated(result.succeeded.length), 'success');
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
    showToast(t.bulkExported(selectedRecipes.length), 'success');
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
          boxShadow: '0 -4px 20px oklch(0 0 0 / 0.08)',
          paddingBottom: 'env(safe-area-inset-bottom, 0)',
        }}
        role="toolbar"
        aria-label="Bulk actions"
        data-testid="bulk-action-bar"
      >
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto">
          {showProgress ? (
            <span
              className="font-label text-sm tracking-wide tabular-nums flex-shrink-0 pr-2 flex items-center gap-2"
              style={{ color: 'var(--text-1)' }}
              data-testid="bulk-count"
              aria-live="polite"
            >
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              {t.bulkDeleting}
            </span>
          ) : (
            <span
              className="font-label text-sm tracking-wide tabular-nums flex-shrink-0 pr-2"
              style={{ color: 'var(--text-1)' }}
              data-testid="bulk-count"
              aria-live="polite"
            >
              {t.bulkRecipeSelected(count)}
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
            {t.bulkDuplicate}
          </button>

          <button
            type="button"
            onClick={() => setTagOpen(true)}
            disabled={isPending || count === 0}
            className={btn}
            style={{ background: 'var(--bg-raised)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            data-testid="bulk-tags"
          >
            {t.bulkTags}
          </button>

          <button
            type="button"
            onClick={handleExportMarkdown}
            disabled={count === 0}
            className={btn}
            style={{ background: 'var(--bg-raised)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            data-testid="bulk-export-md"
          >
            {t.bulkExportMd}
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={count === 0}
            className={btn}
            style={{ background: 'var(--bg-raised)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
            data-testid="bulk-export-pdf"
          >
            {t.bulkExportPdf}
          </button>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isPending || count === 0}
            className={btn}
            style={{ background: 'var(--color-terracotta-contrast)', color: 'var(--color-bone)', border: '1px solid var(--color-terracotta)' }}
            data-testid="bulk-delete"
          >
            {t.bulkDelete}
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
              {t.bulkRetry(retryIds.length)}
            </button>
          )}

          <button
            type="button"
            onClick={onDone}
            className={btn}
            style={{ color: 'var(--text-2)', marginLeft: 'auto', flexShrink: 0 }}
            data-testid="bulk-cancel"
          >
            {t.cancelBtn}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t.bulkDeleteTitle(count)}
        description={t.bulkDeleteDescription(count)}
        confirmLabel={isPending ? t.bulkDeleting : t.bulkConfirmDelete}
        cancelLabel={t.confirmCancelBtn}
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
