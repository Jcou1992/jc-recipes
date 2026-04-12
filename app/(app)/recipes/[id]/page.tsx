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
  return { title: data ? `${data.name} - jc-recipes` : 'Recipe' };
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
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/recipes" className="inline-block text-stone-500 hover:text-stone-700 mb-6 text-sm">
        ← Back to recipes
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-stone-800 leading-snug">{recipe.name}</h1>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`/recipes/${id}/edit`}
            className="px-3 py-1.5 text-sm border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors min-h-[44px] flex items-center"
          >
            Edit
          </Link>
          <DeleteRecipeButton id={id} name={recipe.name} />
        </div>
      </div>

      {/* Meta */}
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-stone-500 mb-4">
        <span>{recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}</span>
        {recipe.prep_time != null && <span>Prep: {formatTime(recipe.prep_time)}</span>}
        {recipe.cook_time != null && <span>Cook: {formatTime(recipe.cook_time)}</span>}
        {totalTime > 0 && recipe.prep_time != null && recipe.cook_time != null && (
          <span>Total: {formatTime(totalTime)}</span>
        )}
      </div>

      {recipe.description && (
        <p className="text-stone-600 mb-6">{recipe.description}</p>
      )}

      {/* Tags */}
      {recipe.tags && recipe.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-6">
          {recipe.tags.map(tag => (
            <span key={tag} className="bg-stone-100 text-stone-500 text-xs px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Ingredients */}
      {recipe.ingredients.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-700 mb-3">Ingredients</h2>
          <ul className="space-y-1.5">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="text-stone-800 font-medium min-w-20">
                  {formatAmount(ing.amount)}{ing.unit ? ` ${ing.unit}` : ''}
                </span>
                <span className="text-stone-600">{ing.name}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Steps */}
      {recipe.steps.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-stone-700 mb-3">Steps</h2>
          <ol className="space-y-4">
            {[...recipe.steps]
              .sort((a, b) => a.order - b.order)
              .map(step => (
                <li key={step.order} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center justify-center mt-0.5">
                    {step.order}
                  </span>
                  <div>
                    <p className="text-stone-700 text-sm">{step.content}</p>
                    {step.timer_seconds != null && (
                      <p className="text-xs text-orange-600 mt-1">
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
        <section>
          <h2 className="text-lg font-semibold text-stone-700 mb-2">Notes</h2>
          <p className="text-stone-600 text-sm whitespace-pre-line">{recipe.notes}</p>
        </section>
      )}
    </div>
  );
}
