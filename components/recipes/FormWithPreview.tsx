'use client';

import { useState } from 'react';
import RecipeForm from './RecipeForm';
import RecipeFormPreview from './RecipeFormPreview';
import type { PreviewData } from './RecipeForm';
import type { Recipe, RecipePayload } from '@/types/recipe';
import type { ActionResult } from '@/app/actions/recipes';

interface Props {
  initialData?: Partial<Recipe>;
  onSubmit: (payload: RecipePayload) => Promise<ActionResult>;
  submitLabel: string;
  // F3: deterministic Cancel destination. Edit → `/recipes/{id}`, New → `/recipes`.
  // Optional so existing callers fall back to legacy `router.back()` behavior in
  // RecipeForm if not supplied (no callers should rely on that path now).
  cancelHref?: string;
}

export default function FormWithPreview(props: Props) {
  const [preview, setPreview] = useState<PreviewData | null>(null);
  return (
    <div className="md:grid md:grid-cols-[3fr_2fr] md:gap-12 md:items-start">
      <div>
        <RecipeForm {...props} onPreviewChange={setPreview} />
      </div>
      <div className="hidden md:block">
        <RecipeFormPreview preview={preview} />
      </div>
    </div>
  );
}
