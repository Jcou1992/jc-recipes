'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function RecipeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/recipes/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setRecipe(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!confirm('¿Seguro que quieres eliminar esta receta?')) return;
    setDeleting(true);
    await fetch(`/api/recipes/${params.id}`, { method: 'DELETE' });
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-400">
        Cargando...
      </div>
    );
  }

  if (!recipe || recipe.error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-stone-400">
        Receta no encontrada.{' '}
        <Link href="/" className="text-orange-500 hover:underline">
          Volver
        </Link>
      </div>
    );
  }

  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Volver */}
      <Link href="/" className="inline-block text-stone-500 hover:text-stone-700 mb-6 text-sm">
        &larr; Volver
      </Link>

      {/* Encabezado */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-stone-800 mb-3">{recipe.title}</h1>
        <span className="inline-block bg-orange-100 text-orange-800 text-sm px-3 py-1 rounded-full font-medium">
          {recipe.category}
        </span>
      </div>

      {/* Datos rápidos */}
      {(recipe.servings > 0 || recipe.prep_time > 0 || recipe.cook_time > 0) && (
        <div className="flex flex-wrap gap-6 mb-8 p-5 bg-white rounded-xl border border-stone-200">
          {recipe.servings > 0 && (
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Porciones</p>
              <p className="text-xl font-semibold text-stone-800">{recipe.servings}</p>
            </div>
          )}
          {recipe.prep_time > 0 && (
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Preparacion</p>
              <p className="text-xl font-semibold text-stone-800">{recipe.prep_time} min</p>
            </div>
          )}
          {recipe.cook_time > 0 && (
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Coccion</p>
              <p className="text-xl font-semibold text-stone-800">{recipe.cook_time} min</p>
            </div>
          )}
          {totalTime > 0 && recipe.prep_time > 0 && recipe.cook_time > 0 && (
            <div>
              <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Total</p>
              <p className="text-xl font-semibold text-stone-800">{totalTime} min</p>
            </div>
          )}
        </div>
      )}

      {/* Descripción */}
      {recipe.description && (
        <p className="text-stone-600 text-lg leading-relaxed mb-8">{recipe.description}</p>
      )}

      {/* Ingredientes */}
      {recipe.ingredients?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-stone-800 mb-4">Ingredientes</h2>
          <ul className="space-y-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex items-baseline gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0 mt-2" />
                <span className="text-stone-700">
                  {ing.amount && (
                    <span className="font-semibold text-stone-800">{ing.amount} </span>
                  )}
                  {ing.name}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Preparación */}
      {recipe.instructions?.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-stone-800 mb-4">Preparacion</h2>
          <ol className="space-y-5">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full text-sm font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-stone-700 leading-relaxed pt-1">{step}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Notas */}
      {recipe.notes && (
        <section className="mb-8 bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 uppercase tracking-wide mb-2">
            Notas
          </h2>
          <p className="text-amber-900 leading-relaxed">{recipe.notes}</p>
        </section>
      )}

      {/* Acciones */}
      <div className="flex gap-3 pt-6 border-t border-stone-200">
        <Link
          href={`/recipes/${recipe.id}/edit`}
          className="bg-stone-800 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-stone-700 transition-colors"
        >
          Editar
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="px-5 py-2.5 rounded-lg font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? 'Eliminando...' : 'Eliminar'}
        </button>
      </div>
    </div>
  );
}
