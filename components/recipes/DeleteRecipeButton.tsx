'use client';

import { useState } from 'react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { deleteRecipe } from '@/app/actions/recipes';

interface Props {
  id: string;
  name: string;
}

export default function DeleteRecipeButton({ id, name }: Props) {
  const [open, setOpen]         = useState(false);
  const [pending, setPending]   = useState(false);
  const [error, setError]       = useState('');

  const handleConfirm = async () => {
    setPending(true);
    const result = await deleteRecipe(id);
    if (result?.error) {
      setError(result.error);
      setPending(false);
      setOpen(false);
    }
    // On success, server action redirects to /recipes
  };

  return (
    <>
      {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm border border-red-200 rounded-lg text-red-600 hover:bg-red-50 transition-colors min-h-[44px]"
      >
        Delete
      </button>
      <ConfirmDialog
        open={open}
        title="Delete recipe"
        description={`Are you sure you want to delete "${name}"? This cannot be undone.`}
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
