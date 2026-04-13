'use client';

import { useEffect } from 'react';

const MESSAGE = 'Tienes cambios sin guardar. ¿Salir de todas formas?';

export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = MESSAGE;
      return MESSAGE;
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
}
