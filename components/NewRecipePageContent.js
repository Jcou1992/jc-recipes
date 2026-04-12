'use client';
import { useState } from 'react';
import Link from 'next/link';
import RecipeForm from '@/components/RecipeForm';
import MarkdownImport from '@/components/MarkdownImport';

// Map ParsedRecipe → RecipeForm initialData shape.
// Combines parsed amount + unit into the form's single "amount" text field.
// Discards tags and timer_seconds (not in the existing data model).
function parsedToFormData(parsed) {
  return {
    title:       parsed.title       || '',
    description: parsed.description || '',
    category:    'Sin categoría',
    servings:    parsed.servings    ?? 4,
    prep_time:   parsed.prep_time   ?? 0,
    cook_time:   parsed.cook_time   ?? 0,
    ingredients: parsed.ingredients?.length
      ? parsed.ingredients.map(ing => ({
          amount: ing.unit ? `${ing.amount} ${ing.unit}`.trim() : ing.amount,
          name:   ing.name,
        }))
      : [{ amount: '', name: '' }],
    instructions: parsed.steps?.length
      ? parsed.steps.map(s => s.text)
      : [''],
    notes: parsed.notes || '',
  };
}

const TAB_CLASSES = {
  active:   'px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 border-stone-300 bg-white text-orange-600',
  inactive: 'px-4 py-2 text-sm font-medium rounded-t-lg border border-transparent text-stone-500 hover:text-stone-700',
};

export default function NewRecipePageContent() {
  const [activeTab,   setActiveTab]   = useState('manual');  // 'manual' | 'markdown'
  const [importData,  setImportData]  = useState(null);
  const [formKey,     setFormKey]     = useState(0);

  const handleImport = (parsed) => {
    setImportData(parsedToFormData(parsed));
    setFormKey(k => k + 1);   // force RecipeForm to re-mount with new initialData
    setActiveTab('manual');
  };

  return (
    <div className={activeTab === 'markdown' ? 'max-w-5xl mx-auto px-4 py-8' : 'max-w-3xl mx-auto px-4 py-8'}>
      <Link href="/" className="inline-block text-stone-500 hover:text-stone-700 mb-6 text-sm">
        &larr; Volver
      </Link>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Nueva receta</h1>

      {/* Tabs */}
      <div className="flex gap-1 mb-0 border-b border-stone-300">
        <button
          type="button"
          data-testid="manual-tab"
          onClick={() => setActiveTab('manual')}
          className={activeTab === 'manual' ? TAB_CLASSES.active : TAB_CLASSES.inactive}
        >
          Manual
        </button>
        <button
          type="button"
          data-testid="markdown-tab"
          onClick={() => setActiveTab('markdown')}
          className={activeTab === 'markdown' ? TAB_CLASSES.active : TAB_CLASSES.inactive}
        >
          Import from Markdown
        </button>
      </div>

      {/* Tab panels */}
      <div className="border border-t-0 border-stone-300 rounded-b-lg rounded-tr-lg p-6 bg-white">
        {activeTab === 'manual' && (
          <RecipeForm key={formKey} initialData={importData} />
        )}
        {activeTab === 'markdown' && (
          <MarkdownImport onImport={handleImport} />
        )}
      </div>
    </div>
  );
}
