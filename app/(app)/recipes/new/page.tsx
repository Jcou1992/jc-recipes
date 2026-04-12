'use client';

import { useState } from 'react';
import Link from 'next/link';
import RecipeForm from '@/components/recipes/RecipeForm';
import MarkdownImport from '@/components/recipes/MarkdownImport';
import { createRecipe } from '@/app/actions/recipes';
import type { Recipe, RecipePayload } from '@/types/recipe';
import type { ParsedRecipe } from '@/lib/utils/parse-recipe-markdown';

// ── Markdown → form data mapping ─────────────────────────────────────────────

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

// ── Tab styles ────────────────────────────────────────────────────────────────

const TAB = {
  active:   'px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 border-stone-300 bg-white text-orange-600',
  inactive: 'px-4 py-2 text-sm font-medium rounded-t-lg text-stone-500 hover:text-stone-700 border border-transparent',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function NewRecipePage() {
  const [tab, setTab]             = useState<'manual' | 'markdown'>('manual');
  const [formKey, setFormKey]     = useState(0);
  const [initialData, setInitial] = useState<Partial<Recipe> | undefined>(undefined);

  const handleImport = (parsed: ParsedRecipe) => {
    setInitial(parsedToInitial(parsed));
    setFormKey(k => k + 1);
    setTab('manual');
  };

  return (
    <div className={tab === 'markdown' ? 'max-w-5xl mx-auto px-4 py-8' : 'max-w-3xl mx-auto px-4 py-8'}>
      <Link href="/recipes" className="inline-block text-stone-500 hover:text-stone-700 mb-6 text-sm">
        ← Back
      </Link>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">New recipe</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-300">
        <button
          type="button"
          data-testid="manual-tab"
          onClick={() => setTab('manual')}
          className={tab === 'manual' ? TAB.active : TAB.inactive}
        >
          Manual
        </button>
        <button
          type="button"
          data-testid="markdown-tab"
          onClick={() => setTab('markdown')}
          className={tab === 'markdown' ? TAB.active : TAB.inactive}
        >
          Import from Markdown
        </button>
      </div>

      <div className="border border-t-0 border-stone-300 rounded-b-lg rounded-tr-lg p-6 bg-white">
        {tab === 'manual' && (
          <RecipeForm
            key={formKey}
            initialData={initialData}
            onSubmit={createRecipe}
            submitLabel="Create recipe"
          />
        )}
        {tab === 'markdown' && <MarkdownImport onImport={handleImport} />}
      </div>
    </div>
  );
}
