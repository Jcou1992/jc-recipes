'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/ToastContext';
import { useT } from '@/components/ui/LanguageContext';
import { setRecipeShared } from '@/app/actions/recipes';

interface Props {
  recipeId: string;
  initialShared: boolean;
}

/**
 * Owner-only toggle that flips a recipe into / out of the shared team folder.
 * The server action is owner-scoped, so this is only ever rendered for the
 * recipe's owner (see the detail page guard).
 */
export default function ShareToggle({ recipeId, initialShared }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const t = useT();
  const [shared, setShared] = useState(initialShared);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !shared;
    setBusy(true);
    const result = await setRecipeShared(recipeId, next);
    setBusy(false);
    if (result && 'error' in result) {
      showToast(t.shareFailedToast, 'error');
      return;
    }
    setShared(next);
    showToast(next ? t.recipeSharedToast : t.recipeUnsharedToast, 'success');
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={shared}
      className={shared ? 'btn-primary' : 'btn-ghost'}
      data-testid="share-toggle"
    >
      {shared ? t.unshareFromTeamBtn : t.shareWithTeamBtn}
    </button>
  );
}
