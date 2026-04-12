import { NextResponse } from 'next/server';
import { getRecipeById, updateRecipe, deleteRecipe } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const recipe = getRecipeById(params.id);
    if (!recipe) {
      return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
    }
    return NextResponse.json(recipe);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const { title, description, category, servings, prep_time, cook_time, ingredients, instructions, notes } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 });
    }

    const recipe = updateRecipe(params.id, {
      title:        title.trim(),
      description:  description  || '',
      category:     category     || 'Sin categoría',
      servings:     servings     || 4,
      prep_time:    prep_time    || 0,
      cook_time:    cook_time    || 0,
      ingredients:  ingredients  || [],
      instructions: instructions || [],
      notes:        notes        || '',
    });

    if (!recipe) {
      return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
    }
    return NextResponse.json(recipe);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const deleted = deleteRecipe(params.id);
    if (!deleted) {
      return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
