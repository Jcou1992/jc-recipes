import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { Recipe } from '@/types/recipe';
import PrintAutoTrigger from './PrintAutoTrigger';

export const metadata: Metadata = { title: 'Print - jc-recipes' };

interface PageProps {
  searchParams: Promise<{ ids?: string; servings?: string }>;
}

function formatAmount(amount: number): string {
  if (Number.isInteger(amount)) return String(amount);
  return String(Number(amount.toFixed(2)));
}

export default async function PrintPage({ searchParams }: PageProps) {
  const { ids, servings: servingsParam } = await searchParams;
  const idList = (ids ?? '').split(',').map(s => s.trim()).filter(Boolean);

  // Optional serving override (preserved from the recipe page's serving scaler).
  // Only applied when a single recipe is being printed — bulk exports keep canonical servings.
  const overrideServings = (() => {
    const n = Number(servingsParam);
    return Number.isFinite(n) && n > 0 ? n : null;
  })();

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
      <div
        className="max-w-3xl mx-auto px-6 py-8 text-sm"
        style={{ color: 'var(--color-terracotta)' }}
      >
        Error loading: {error.message}
      </div>
    );
  }

  const list = (recipes ?? []) as Recipe[];

  // Preserve caller-provided order
  const orderMap = new Map(idList.map((id, i) => [id, i]));
  list.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  const applyScale = overrideServings !== null && list.length === 1;

  return (
    <div className="print-bulk max-w-3xl mx-auto px-6 py-8">
      {/* Menu-spec print typography: tighter weights, looser tracking, rule under title. */}
      <style>{`
        @media print {
          .print-recipe { font-family: Georgia, 'Times New Roman', serif; }
          .print-title {
            font-weight: 500 !important;
            font-size: 26pt !important;
            letter-spacing: -0.01em !important;
            line-height: 1.1 !important;
            margin: 0 0 6pt 0 !important;
          }
          .print-rule {
            display: block !important;
            height: 0.5pt;
            background: #1a1a1a;
            opacity: 0.35;
            margin: 0 0 14pt 0;
          }
          .print-meta {
            font-size: 9pt !important;
            letter-spacing: 0.18em !important;
            text-transform: uppercase;
            color: #333 !important;
            margin-bottom: 18pt !important;
          }
          .print-description {
            font-style: italic;
            font-size: 11pt !important;
            color: #222 !important;
            margin-bottom: 10pt !important;
          }
          .print-h2 {
            font-weight: 600 !important;
            font-size: 11pt !important;
            letter-spacing: 0.22em !important;
            text-transform: uppercase !important;
            margin: 14pt 0 6pt 0 !important;
            border-bottom: 0.5pt solid #999;
            padding-bottom: 3pt;
          }
          .print-list li { margin-bottom: 3pt !important; }

          /* Brut mode: mono service-ticket print. Forward-compat defensive:
             also suppress any canvas in the print tree (Team C borrow). */
          :root[data-design="brut"] .print-recipe {
            font-family: 'Berkeley Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace !important;
          }
          :root[data-design="brut"] .print-title {
            text-transform: uppercase;
            letter-spacing: 0.02em !important;
            font-weight: 700 !important;
          }
          :root[data-design="brut"] .print-description {
            font-style: normal !important;
          }
          :root[data-design="brut"] .print-meta {
            letter-spacing: 0.14em !important;
          }
          :root[data-design="brut"] .print-h2 {
            letter-spacing: 0.18em !important;
            font-weight: 600 !important;
          }
          :root[data-design="brut"] canvas { display: none !important; }
        }
        @media screen {
          .print-rule { display: none; }
        }
      `}</style>
      <PrintAutoTrigger />
      {list.map((recipe, idx) => {
        const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
        const steps = [...recipe.steps].sort((a, b) => a.order - b.order);
        const displayServings = applyScale ? overrideServings! : recipe.servings;
        const scale = applyScale ? overrideServings! / recipe.servings : 1;
        return (
          <article
            key={recipe.id}
            className="print-recipe"
            style={{ pageBreakAfter: idx < list.length - 1 ? 'always' : 'auto' }}
          >
            <h1
              className="print-title font-display text-4xl font-semibold mb-2"
              style={{ color: 'var(--text-1)' }}
            >
              {recipe.name}
            </h1>
            <span className="print-rule" aria-hidden="true" />

            {recipe.description && (
              <p
                className="print-description font-body text-base mb-4"
                style={{ color: 'var(--text-2)' }}
              >
                {recipe.description}
              </p>
            )}

            <div
              className="print-meta font-label text-sm tracking-wide mb-6"
              style={{ color: 'var(--text-2)' }}
            >
              {displayServings} {displayServings !== 1 ? 'servings' : 'serving'}
              {totalTime > 0 && <> · {totalTime} min</>}
              {recipe.tags && recipe.tags.length > 0 && <> · {recipe.tags.join(', ')}</>}
            </div>

            <h2
              className="print-h2 font-display text-xl font-semibold mb-3"
              style={{ color: 'var(--text-1)' }}
            >
              Ingredients
            </h2>
            <ul
              className="print-list font-body text-base mb-6 pl-5 list-disc"
              style={{ color: 'var(--text-1)' }}
            >
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="mb-1">
                  {formatAmount(ing.amount * scale)}
                  {ing.unit ? ` ${ing.unit}` : ''} {ing.name}
                </li>
              ))}
            </ul>

            <h2
              className="print-h2 font-display text-xl font-semibold mb-3"
              style={{ color: 'var(--text-1)' }}
            >
              Steps
            </h2>
            <ol
              className="print-list font-body text-base pl-5 list-decimal"
              style={{ color: 'var(--text-1)' }}
            >
              {steps.map((step, i) => (
                <li key={i} className="mb-2">
                  {step.content}
                </li>
              ))}
            </ol>

            {recipe.notes && (
              <>
                <h2
                  className="print-h2 font-display text-xl font-semibold mt-6 mb-3"
                  style={{ color: 'var(--text-1)' }}
                >
                  Notes
                </h2>
                <p
                  className="font-body text-base whitespace-pre-wrap"
                  style={{ color: 'var(--text-1)' }}
                >
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
