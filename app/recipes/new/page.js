import RecipeForm from '@/components/RecipeForm';
import Link from 'next/link';

export const metadata = {
  title: 'Nueva receta - Mis Recetas',
};

export default function NewRecipePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link href="/" className="inline-block text-stone-500 hover:text-stone-700 mb-6 text-sm">
        &larr; Volver
      </Link>
      <h1 className="text-2xl font-bold text-stone-800 mb-8">Nueva receta</h1>
      <RecipeForm />
    </div>
  );
}
