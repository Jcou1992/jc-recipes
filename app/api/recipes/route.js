import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

function parseRecipe(r) {
  return {
    ...r,
    ingredients: JSON.parse(r.ingredients || '[]'),
    instructions: JSON.parse(r.instructions || '[]'),
  };
}

export async function GET(request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    let query = 'SELECT * FROM recipes';
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (category && category !== 'Todas') {
      conditions.push('category = ?');
      params.push(category);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const recipes = db.prepare(query).all(...params);
    return NextResponse.json(recipes.map(parseRecipe));
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const db = getDb();
    const body = await request.json();
    const { title, description, category, servings, prep_time, cook_time, ingredients, instructions, notes } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'El título es obligatorio' }, { status: 400 });
    }

    const result = db.prepare(`
      INSERT INTO recipes (title, description, category, servings, prep_time, cook_time, ingredients, instructions, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      description || '',
      category || 'Sin categoría',
      servings || 4,
      prep_time || 0,
      cook_time || 0,
      JSON.stringify(ingredients || []),
      JSON.stringify(instructions || []),
      notes || ''
    );

    const recipe = db.prepare('SELECT * FROM recipes WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(parseRecipe(recipe), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
