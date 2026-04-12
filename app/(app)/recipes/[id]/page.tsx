import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import DeleteRecipeButton from '@/components/recipes/DeleteRecipeButton';
import type { Recipe } from '@/types/recipe';

function formatTime(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatAmount(n: number): string {
  if (n === 0.5)  return '½';
  if (n === 0.25) return '¼';
  if (n === 0.75) return '¾';
  if (n === 1.5)  return '1½';
  return n % 1 === 0 ? String(n) : String(n);
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from('recipes').select('name').eq('id', id).single();
  return { title: data ? `${data.name} - jc-recipes` : 'Receta' };
}

export default async function RecipeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: recipe, error } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single<Recipe>();

  if (error || !recipe) notFound();

  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-up">
      <Link
        href="/recipes"
        className="font-label text-xs tracking-widest uppercase inline-block mb-8 transition-colors"
        style={{ color: 'var(--text-3)' }}
      >
        ← Volver
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h1 className="font-display text-4xl font-bold leading-tight" style={{ color: 'var(--text-1)' }}>
          {recipe.name}
        </h1>
        <div className="flex gap-2 flex-shrink-0 mt-1">
          <Link href={`/recipes/${id}/edit`} className="btn-ghost">
            Edit
          </Link>
          <DeleteRecipeButton id={id} name={recipe.name} />
        </div>
      </div>

      {/* Description */}
      {recipe.description && (
        <p className="font-body text-lg mb-5" style={{ color: 'var(--text-2)' }}>
          {recipe.description}
        </p>
      )}

      {/* Meta strip */}
      <div
        className="flex flex-wrap gap-x-6 gap-y-1 mb-6 pb-6"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
          {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}
        </span>
        {recipe.prep_time != null && (
          <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
            Prep: {formatTime(recipe.prep_time)}
          </span>
        )}
        {recipe.cook_time != null && (
          <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-2)' }}>
            Cocción: {formatTime(recipe.cook_time)}
          </span>
        )}
        {totalTime > 0 && recipe.prep_time != null && recipe.cook_time != null && (
          <span className="font-label text-sm tracking-wide font-semibold" style={{ color: 'var(--text-1)' }}>
            Total: {formatTime(totalTime)}
          </span>
        )}
      </div>

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-8">
          {recipe.tags.map(tag => (
            <span
              key={tag}
              className="font-label text-xs tracking-wider uppercase px-2.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(237,209,142,0.12)',
                color: 'var(--color-gold)',
                border: '1px solid rgba(237,209,142,0.2)',
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <section className="mb-10">
          <h2 className="section-label mb-4">Ingredientes</h2>
          <ul className="space-y-2.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex gap-3 items-baseline">
                <span
                  className="font-label text-base font-semibold tracking-wide min-w-[4rem] text-right"
                  style={{ color: 'var(--color-terracotta)' }}
                >
                  {formatAmount(ing.amount)}{ing.unit ? ` ${ing.unit}` : ''}
                </span>
                <span className="font-body text-base" style={{ color: 'var(--text-1)' }}>
                  {ing.name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <section className="mb-10">
          <h2 className="section-label mb-4">Preparación</h2>
          <ol className="space-y-5">
            {[...recipe.steps]
              .sort((a, b) => a.order - b.order)
              .map(step => (
                <li key={step.order} className="flex gap-4">
                  <span
                    className="font-label flex-shrink-0 text-lg font-bold leading-none mt-0.5"
                    style={{ color: 'var(--color-terracotta)', minWidth: '1.5rem' }}
                  >
                    {step.order}
                  </span>
                  <div>
                    <p className="font-body text-base leading-relaxed" style={{ color: 'var(--text-1)' }}>
                      {step.content}
                    </p>
                    {step.timer_seconds != null && (
                      <p
                        className="font-label text-xs tracking-wider uppercase mt-1.5"
                        style={{ color: 'var(--color-terracotta)' }}
                      >
                        ⏱ {formatTime(step.timer_seconds / 60)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
          </ol>
        </section>
      )}

      {/* Notes */}
      {recipe.notes && (
        <section
          className="rounded-xl p-5"
          style={{
            background: 'var(--bg-raised)',
            border: '1px solid var(--border)',
          }}
        >
          <h2 className="section-label mb-3">Notas</h2>
          <p className="font-body text-base whitespace-pre-line" style={{ color: 'var(--text-2)' }}>
            {recipe.notes}
          </p>
        </section>
      )}
    </div>
  );
}
