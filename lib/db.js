import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE  = path.join(DATA_DIR, 'recipes.json');

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function read() {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    return { nextId: 1, recipes: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch {
    return { nextId: 1, recipes: [] };
  }
}

function write(data) {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

export function getAllRecipes({ search = '', category = '' } = {}) {
  const { recipes } = read();
  let result = [...recipes].reverse(); // más recientes primero

  if (search) {
    const q = search.toLowerCase();
    result = result.filter(r =>
      r.title.toLowerCase().includes(q) ||
      (r.description || '').toLowerCase().includes(q)
    );
  }
  if (category && category !== 'Todas') {
    result = result.filter(r => r.category === category);
  }
  return result;
}

export function getRecipeById(id) {
  const { recipes } = read();
  return recipes.find(r => r.id === Number(id)) ?? null;
}

export function createRecipe(data) {
  const db = read();
  const recipe = {
    id: db.nextId++,
    ...data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  db.recipes.push(recipe);
  write(db);
  return recipe;
}

export function updateRecipe(id, data) {
  const db = read();
  const i = db.recipes.findIndex(r => r.id === Number(id));
  if (i === -1) return null;
  db.recipes[i] = {
    ...db.recipes[i],
    ...data,
    id: db.recipes[i].id,
    created_at: db.recipes[i].created_at,
    updated_at: new Date().toISOString(),
  };
  write(db);
  return db.recipes[i];
}

export function deleteRecipe(id) {
  const db = read();
  const i = db.recipes.findIndex(r => r.id === Number(id));
  if (i === -1) return false;
  db.recipes.splice(i, 1);
  write(db);
  return true;
}
