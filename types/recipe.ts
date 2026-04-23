export interface Ingredient {
  amount: number;
  unit: string | null;
  name: string;
}

export interface Step {
  order: number;
  content: string;
  timer_seconds: number | null;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  ingredients: Ingredient[];
  steps: Step[];
  servings: number;
  serving_size_label: string | null;
  description: string | null;
  prep_time: number | null;
  cook_time: number | null;
  tags: string[] | null;
  notes: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string;
}

// Shape sent to the DB on create / update (no auto-generated fields)
export type RecipePayload = Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

export interface BulkActionResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}
