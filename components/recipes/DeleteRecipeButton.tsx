'use client';

import { useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteRecipe } from '@/app/actions/recipes';
import { useToast } from '@/components/ui/ToastContext';

interface Props {
  id: string;
  name: string;
}

export default function DeleteRecipeButton({ id, name }: Props) {
  const { showToast } = useToast();
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
    // On success the server action calls redirect() — framework handles navigation
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-danger">
        Delete
      </button>
      <ConfirmDialog
        open={open}
        title="Delete recipe"
        description={`Delete "${name}"? This cannot be undone.`}
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
