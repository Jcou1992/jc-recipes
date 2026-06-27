'use client';

import { useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteRecipe } from '@/app/actions/recipes';
import { useToast } from '@/components/ui/ToastContext';
import { useT } from '@/components/ui/LanguageContext';

interface Props {
  id: string;
  name: string;
}

export default function DeleteRecipeButton({ id, name }: Props) {
  const { showToast } = useToast();
  const t = useT();
  const [open, setOpen]       = useState(false);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    const result = await deleteRecipe(id);
    if (result?.error) {
      showToast(result.error, 'error');
      setPending(false);
      setOpen(false);
      return;
    }
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-danger">
        {t.deleteConfirmBtn}
      </button>
      <ConfirmDialog
        open={open}
        title={t.deleteRecipeTitle}
        description={t.deleteRecipeDescription(name)}
        confirmLabel={pending ? t.deletingBtn : t.deleteConfirmBtn}
        cancelLabel={t.confirmCancelBtn}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
