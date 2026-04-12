'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import RecipeForm from '@/components/RecipeForm';

export default function EditRecipePage() {
  const params = useParams();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/recipes/${params.id}`)
      .then(res => res.json())
      .then(data => {
        setRecipe(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href={`/recipes/${params.id}`}
        className="inline-block text-stone-500 hover:text-stone-700 mb-6 text-sm"
      >
        &larr; Volver a la receta
      </Link>
      <h1 className="text-2xl font-bold text-stone-800 mb-8">Editar receta</h1>
      <RecipeForm initialData={recipe} recipeId={params.id} />
    </div>
  );
}
