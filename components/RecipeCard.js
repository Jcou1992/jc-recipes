import Link from 'next/link';

const CATEGORY_COLORS = {
  'Desayuno':    'bg-yellow-100 text-yellow-800',
  'Almuerzo':    'bg-blue-100 text-blue-800',
  'Cena':        'bg-indigo-100 text-indigo-800',
  'Aperitivos':  'bg-purple-100 text-purple-800',
  'Postres':     'bg-pink-100 text-pink-800',
  'Bebidas':     'bg-cyan-100 text-cyan-800',
  'Ensaladas':   'bg-green-100 text-green-800',
  'Sopas':       'bg-amber-100 text-amber-800',
  'Pasta':       'bg-orange-100 text-orange-800',
  'Arroces':     'bg-lime-100 text-lime-800',
  'Carnes':      'bg-red-100 text-red-800',
  'Pescados':    'bg-teal-100 text-teal-800',
  'Vegetariano': 'bg-emerald-100 text-emerald-800',
};

export default function RecipeCard({ recipe }) {
  const colorClass = CATEGORY_COLORS[recipe.category] || 'bg-stone-100 text-stone-600';
  const totalTime = (recipe.prep_time || 0) + (recipe.cook_time || 0);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block bg-white rounded-xl border border-stone-200 hover:border-orange-300 hover:shadow-md transition-all p-5 group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-stone-800 text-lg leading-tight group-hover:text-orange-600 transition-colors">
          {recipe.title}
        </h3>
        <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${colorClass}`}>
          {recipe.category}
        </span>
      </div>

      {recipe.description && (
        <p className="text-stone-500 text-sm mb-4 line-clamp-2 leading-relaxed">
          {recipe.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 mt-auto pt-1">
        {recipe.servings > 0 && (
          <span>{recipe.servings} porciones</span>
        )}
        {totalTime > 0 && (
          <span>{totalTime} min</span>
        )}
        {recipe.ingredients?.length > 0 && (
          <span>{recipe.ingredients.length} ingredientes</span>
        )}
      </div>
    </Link>
  );
}
