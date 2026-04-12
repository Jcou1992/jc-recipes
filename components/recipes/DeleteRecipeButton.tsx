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
      {error && (
        <p
          className="font-label text-xs tracking-wide mb-2"
          style={{ color: 'var(--color-terracotta)' }}
        >
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-danger"
      >
        Delete
      </button>
      <ConfirmDialog
        open={open}
        title="Delete recipe"
        description={`¿Eliminar "${name}"? Esta acción no se puede deshacer.`}
        confirmLabel={pending ? 'Deleting…' : 'Delete'}
        onConfirm={handleConfirm}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
