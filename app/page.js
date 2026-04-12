'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import RecipeCard from '@/components/RecipeCard';

const CATEGORIES = [
  'Todas', 'Desayuno', 'Almuerzo', 'Cena', 'Aperitivos',
  'Postres', 'Bebidas', 'Ensaladas', 'Sopas',
  'Pasta', 'Arroces', 'Carnes', 'Pescados',
  'Vegetariano', 'Sin categoría',
];

export default function HomePage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todas');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category !== 'Todas') params.set('category', category);

    fetch(`/api/recipes?${params}`)
      .then(res => res.json())
      .then(data => {
        setRecipes(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, category]);

  const isFiltered = search || category !== 'Todas';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Buscador y filtro */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar recetas..."
          className="flex-1 border border-stone-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Contenido */}
      {loading ? (
        <div className="text-center py-16 text-stone-400">Cargando...</div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-stone-400 text-lg mb-6">
            {isFiltered ? 'No se encontraron recetas' : 'Aun no tienes recetas guardadas'}
          </p>
          {!isFiltered && (
            <Link
              href="/recipes/new"
              className="bg-orange-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors"
            >
              Crear primera receta
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="text-stone-400 text-sm mb-5">
            {recipes.length} {recipes.length === 1 ? 'receta' : 'recetas'}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
