import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function parseRecipe(r) {
  return {
    ...r,
    ingredients: JSON.parse(r.ingredients || '[]'),
    instructions: JSON.parse(r.instructions || '[]'),
  };
}

export async function GET(request, { params }) {
  try {
    const db = getDb();
    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(params.id);
    if (!recipe) {
      return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
    }
    return NextResponse.json(parseRecipe(recipe));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const db = getDb();
    const body = await request.json();
    const { title, description, category, servings, prep_time, cook_time, ingredients, instructions, notes } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 });
    }

    const existing = db.prepare('SELECT id FROM recipes WHERE id = ?').get(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
    }

    db.prepare(`
      UPDATE recipes SET
        title = ?, description = ?, category = ?, servings = ?,
        prep_time = ?, cook_time = ?, ingredients = ?, instructions = ?,
        notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      title.trim(),
      description || '',
      category || 'Sin categoría',
      servings || 4,
      prep_time || 0,
      cook_time || 0,
      JSON.stringify(ingredients || []),
      JSON.stringify(instructions || []),
      notes || '',
      params.id
    );

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(params.id);
    return NextResponse.json(parseRecipe(recipe));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM recipes WHERE id = ?').get(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Receta no encontrada' }, { status: 404 });
    }
    db.prepare('DELETE FROM recipes WHERE id = ?').run(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
