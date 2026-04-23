'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'sekai_first_recipe_celebrated';

interface Props {
  recipeId: string;
}

// Renders a gold underline beneath the recipe title on the very first recipe
// detail view per browser. Persisted in localStorage — once set, never fires
// again. No confetti, no sparkle, no modal: a single calligraphic stroke as
// a quiet acknowledgment.
export default function FirstSaveCelebration({ recipeId }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const already = localStorage.getItem(STORAGE_KEY);
    if (already) return;
    localStorage.setItem(STORAGE_KEY, recipeId);
    setShow(true);
    const id = setTimeout(() => setShow(false), 2500);
    return () => clearTimeout(id);
  }, [recipeId]);

  if (!show) return null;
  return <span className="first-save-underline" aria-hidden="true" />;
}
