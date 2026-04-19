import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { Recipe } from '@/types/recipe';
import PrintAutoTrigger from './PrintAutoTrigger';

export const metadata: Metadata = { title: 'Print - jc-recipes' };

interface PageProps {
  searchParams: Promise<{ ids?: string }>;
}

function formatAmount(amount: number): string {
  if (Number.isInteger(amount)) return String(amount);
  return String(Number(amount.toFixed(2)));
}

export default async function PrintPage({ searchParams }: PageProps) {
  const { ids } = await searchParams;
  const idList = (ids ?? '').split(',').map(s => s.trim()).filter(Boolean);

  if (idList.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p className="font-body text-base" style={{ color: 'var(--text-2)' }}>
          No recipes selected.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: recipes, error } = await supabase
    .from('recipes')
    .select('*')
    .in('id', idList)
    .order('name', { ascending: true });

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 text-sm" style={{ color: 'var(--color-terracotta)' }}>
        Error loading: {error.message}
      </div>
    );
  }

  const list = (recipes ?? []) as Recipe[];

  // Preserve caller-provided order
  const orderMap = new Map(idList.map((id, i) => [id, i]));
  list.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return (
    <div className="print-bulk max-w-3xl mx-auto px-6 py-8">
      <PrintAutoTrigger />
      {list.map((recipe, idx) => {
        const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
        const steps = [...recipe.steps].sort((a, b) => a.order - b.order);
        return (
          <article
            key={recipe.id}
            className="print-recipe"
            style={{ pageBreakAfter: idx < list.length - 1 ? 'always' : 'auto' }}
          >
            <h1 className="font-display text-4xl font-bold mb-2" style={{ color: 'var(--text-1)' }}>
              {recipe.name}
            </h1>
            {recipe.description && (
              <p className="font-body text-base mb-4" style={{ color: 'var(--text-2)' }}>
                {recipe.description}
              </p>
            )}

            <div className="font-label text-sm tracking-wide mb-6" style={{ color: 'var(--text-2)' }}>
              {recipe.servings} {recipe.servings !== 1 ? 'servings' : 'serving'}
              {totalTime > 0 && <> · {totalTime} min</>}
              {recipe.tags && recipe.tags.length > 0 && <> · {recipe.tags.join(', ')}</>}
            </div>

            <h2 className="font-display text-xl font-semibold mb-3" style={{ color: 'var(--text-1)' }}>
              Ingredients
            </h2>
            <ul className="font-body text-base mb-6 pl-5 list-disc" style={{ color: 'var(--text-1)' }}>
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="mb-1">
                  {formatAmount(ing.amount)}
                  {ing.unit ? ` ${ing.unit}` : ''} {ing.name}
                </li>
              ))}
            </ul>

            <h2 className="font-display text-xl font-semibold mb-3" style={{ color: 'var(--text-1)' }}>
              Steps
            </h2>
            <ol className="font-body text-base pl-5 list-decimal" style={{ color: 'var(--text-1)' }}>
              {steps.map((step, i) => (
                <li key={i} className="mb-2">
                  {step.content}
                </li>
              ))}
            </ol>

            {recipe.notes && (
              <>
                <h2 className="font-display text-xl font-semibold mt-6 mb-3" style={{ color: 'var(--text-1)' }}>
                  Notes
                </h2>
                <p className="font-body text-base whitespace-pre-wrap" style={{ color: 'var(--text-1)' }}>
                  {recipe.notes}
                </p>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
