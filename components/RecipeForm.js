'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  'Desayuno', 'Almuerzo', 'Cena', 'Aperitivos',
  'Postres', 'Bebidas', 'Ensaladas', 'Sopas',
  'Pasta', 'Arroces', 'Carnes', 'Pescados',
  'Vegetariano', 'Sin categoría',
];

const inputClass =
  'w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white';

export default function RecipeForm({ initialData, recipeId }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title:        initialData?.title        || '',
    description:  initialData?.description  || '',
    category:     initialData?.category     || 'Sin categoría',
    servings:     initialData?.servings     ?? 4,
    prep_time:    initialData?.prep_time    ?? 0,
    cook_time:    initialData?.cook_time    ?? 0,
    ingredients:  initialData?.ingredients?.length
                    ? initialData.ingredients
                    : [{ amount: '', name: '' }],
    instructions: initialData?.instructions?.length
                    ? initialData.instructions
                    : [''],
    notes:        initialData?.notes        || '',
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Ingredients
  const addIngredient = () => set('ingredients', [...form.ingredients, { amount: '', name: '' }]);
  const removeIngredient = (i) =>
    set('ingredients', form.ingredients.filter((_, idx) => idx !== i));
  const updateIngredient = (i, field, value) => {
    const updated = [...form.ingredients];
    updated[i] = { ...updated[i], [field]: value };
    set('ingredients', updated);
  };

  // Instructions
  const addInstruction = () => set('instructions', [...form.instructions, '']);
  const removeInstruction = (i) =>
    set('instructions', form.instructions.filter((_, idx) => idx !== i));
  const updateInstruction = (i, value) => {
    const updated = [...form.instructions];
    updated[i] = value;
    set('instructions', updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const payload = {
      ...form,
      ingredients: form.ingredients.filter(ing => ing.name.trim()),
      instructions: form.instructions.filter(step => step.trim()),
    };

    try {
      const url = recipeId ? `/api/recipes/${recipeId}` : '/api/recipes';
      const method = recipeId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || 'Error al guardar la receta');
        return;
      }

      router.push(`/recipes/${result.id}`);
      router.refresh();
    } catch {
      setError('Error de conexión. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Título <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          required
          placeholder="Nombre de la receta"
          className={inputClass}
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Descripción</label>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={3}
          placeholder="Breve descripción de la receta..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Categoría + Porciones + Tiempos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-stone-700 mb-1">Categoría</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className={inputClass}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Porciones</label>
          <input
            type="number"
            min="1"
            value={form.servings}
            onChange={e => set('servings', parseInt(e.target.value) || 1)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Prep. (min)</label>
          <input
            type="number"
            min="0"
            value={form.prep_time}
            onChange={e => set('prep_time', parseInt(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Cocción (min)</label>
          <input
            type="number"
            min="0"
            value={form.cook_time}
            onChange={e => set('cook_time', parseInt(e.target.value) || 0)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Ingredientes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-stone-700">Ingredientes</label>
          <button
            type="button"
            onClick={addIngredient}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            + Agregar
          </button>
        </div>
        <div className="space-y-2">
          {form.ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2">
              <input
                type="text"
                value={ing.amount}
                onChange={e => updateIngredient(i, 'amount', e.target.value)}
                placeholder="Cantidad"
                className="w-28 border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
              <input
                type="text"
                value={ing.name}
                onChange={e => updateIngredient(i, 'name', e.target.value)}
                placeholder="Ingrediente"
                className="flex-1 border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
              {form.ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="px-3 py-2 text-stone-400 hover:text-red-500 transition-colors font-medium"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Pasos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-stone-700">Preparación</label>
          <button
            type="button"
            onClick={addInstruction}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            + Agregar paso
          </button>
        </div>
        <div className="space-y-2">
          {form.instructions.map((step, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="mt-2.5 flex-shrink-0 w-6 h-6 bg-orange-100 text-orange-700 rounded-full text-xs font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <textarea
                value={step}
                onChange={e => updateInstruction(i, e.target.value)}
                placeholder={`Paso ${i + 1}...`}
                rows={2}
                className={`flex-1 border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white resize-none`}
              />
              {form.instructions.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeInstruction(i)}
                  className="mt-2 px-2 py-2 text-stone-400 hover:text-red-500 transition-colors font-medium"
                >
                  x
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Notas</label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          placeholder="Trucos, variaciones, sustituciones..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Guardando...' : recipeId ? 'Guardar cambios' : 'Crear receta'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-lg font-medium border border-stone-300 text-stone-600 hover:bg-stone-100 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
