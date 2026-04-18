'use client';

import { useEffect, useState, useTransition } from 'react';
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

  const count = selectedIds.length;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDone();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  async function handleDelete() {
    setConfirmOpen(false);
    const ids = [...selectedIds];
    onOptimisticHide(ids);
    const result = await bulkDeleteRecipes(ids);
    if (result.succeeded.length === 0) {
      onOptimisticRestore(ids);
      showToast(`Error deleting: ${result.failed[0]?.error ?? 'Unknown'}`, 'error');
      return;
    }
    if (result.failed.length > 0) {
      onOptimisticRestore(result.failed.map(f => f.id));
      showToast(`Deleted ${result.succeeded.length} of ${ids.length}`, 'info');
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
      showToast(`Error duplicating: ${result.failed[0]?.error ?? 'Unknown'}`, 'error');
      return;
    }
    if (result.failed.length > 0) {
      showToast(`Duplicated ${result.succeeded.length} of ${ids.length}`, 'info');
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
          <span
            className="font-label text-sm tracking-wide flex-shrink-0 pr-2"
            style={{ color: 'var(--text-1)' }}
            data-testid="bulk-count"
          >
            {count} {count === 1 ? 'selected' : 'selected'}
          </span>

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
            ? '¿Eliminar esta receta? Esta acción no se puede deshacer.'
            : `¿Eliminar ${count} recetas? Esta acción no se puede deshacer.`
        }
        confirmLabel={isPending ? 'Deleting…' : 'Delete'}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      />

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
