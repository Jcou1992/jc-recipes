'use client';

import { useState } from 'react';
import Link from 'next/link';
import FormWithPreview from '@/components/recipes/FormWithPreview';
import MarkdownImport from '@/components/recipes/MarkdownImport';
import { createRecipe } from '@/app/actions/recipes';
import { useToast } from '@/components/ui/ToastContext';
import { useT } from '@/components/ui/LanguageContext';
import type { Recipe } from '@/types/recipe';
import type { ParsedRecipe } from '@/lib/utils/parse-recipe-markdown';

function parsedToInitial(parsed: ParsedRecipe): Partial<Recipe> {
  return {
    name:        parsed.title,
    description: parsed.description ?? null,
    servings:    parsed.servings ?? 1,
    prep_time:   parsed.prep_time ?? null,
    cook_time:   parsed.cook_time ?? null,
    tags:        parsed.tags ?? null,
    notes:       parsed.notes ?? null,
    ingredients: parsed.ingredients.map(ing => ({
      amount: parseFloat(ing.amount) || 0,
      unit:   ing.unit || null,
      name:   ing.name,
    })),
    steps: parsed.steps.map((s, i) => ({
      order:         i + 1,
      content:       s.text,
      timer_seconds: s.timer_seconds ?? null,
    })),
  };
}

export default function NewRecipePage() {
  const { showToast } = useToast();
  const t = useT();
  const [tab, setTab]             = useState<'manual' | 'markdown'>('manual');
  const [formKey, setFormKey]     = useState(0);
  const [initialData, setInitial] = useState<Partial<Recipe> | undefined>(undefined);

  const handleImport = (parsed: ParsedRecipe) => {
    setInitial(parsedToInitial(parsed));
    setFormKey(k => k + 1);
    setTab('manual');
    showToast(t.recipeImportedToast, 'success');
  };

  const isMarkdown = tab === 'markdown';

  return (
    <div className={isMarkdown ? 'max-w-5xl mx-auto px-4 py-8' : 'max-w-[min(100%-2rem,1280px)] mx-auto px-4 py-8'}>
      <Link
        href="/recipes"
        className="font-label text-xs tracking-widest uppercase inline-block mb-6 transition-colors"
        style={{ color: 'var(--text-3)' }}
      >
        {t.backBtn}
      </Link>
      <h1
        className="font-display text-3xl font-bold mb-6"
        style={{ color: 'var(--text-1)' }}
      >
        {t.newRecipeTitle}
      </h1>

      <div
        className="flex gap-0"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <button
          type="button"
          data-testid="manual-tab"
          onClick={() => setTab('manual')}
          className="font-label text-xs tracking-widest uppercase px-4 py-2.5 transition-colors"
          style={{
            color: tab === 'manual' ? 'var(--color-terracotta)' : 'var(--text-3)',
            borderBottom: tab === 'manual' ? '2px solid var(--color-terracotta)' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          {t.manualTab}
        </button>
        <button
          type="button"
          data-testid="markdown-tab"
          onClick={() => setTab('markdown')}
          className="font-label text-xs tracking-widest uppercase px-4 py-2.5 transition-colors"
          style={{
            color: tab === 'markdown' ? 'var(--color-terracotta)' : 'var(--text-3)',
            borderBottom: tab === 'markdown' ? '2px solid var(--color-terracotta)' : '2px solid transparent',
            marginBottom: '-1px',
          }}
        >
          {t.importMarkdownTab}
        </button>
      </div>

      <div
        className="rounded-b-xl rounded-tr-xl p-6 mt-0"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderTop: 'none',
        }}
      >
        {tab === 'manual' && (
          <FormWithPreview
            key={formKey}
            initialData={initialData}
            onSubmit={createRecipe}
            submitLabel={t.createRecipeSubmitLabel}
          />
        )}
        {tab === 'markdown' && <MarkdownImport onImport={handleImport} />}
      </div>
    </div>
  );
}
