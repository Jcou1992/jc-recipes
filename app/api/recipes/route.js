import { NextResponse } from 'next/server';
import { getAllRecipes, createRecipe } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search   = searchParams.get('search')   || '';
    const category = searchParams.get('category') || '';

    const recipes = getAllRecipes({ search, category });
    return NextResponse.json(recipes);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { title, description, category, servings, prep_time, cook_time, ingredients, instructions, notes } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 });
    }

    const recipe = createRecipe({
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

    return NextResponse.json(recipe, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
