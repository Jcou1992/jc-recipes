export interface MacroValues {
  kcal: number;
  protein_g: number;
  fat_g: number;
  carbs_g: number;
  fiber_g: number;
}

export interface Ingredient {
  amount: number;
  unit: string | null;
  name: string;
  fdc_id?: number;
  fdc_name?: string;
  macros_override?: MacroValues;
  macros_override_basis?: 'per_100g' | 'per_unit';
}

export interface UnresolvedIngredient {
  index: number;
  name: string;
  reason: string;
}

export interface RecipeMacros extends MacroValues {
  matched_count: number;
  total_count: number;
  unresolved_ingredients: UnresolvedIngredient[];
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
  macros: RecipeMacros | null;
  macros_computed_at: string | null;
  cooked_at?: string | null;
  cooked_count?: number;
  created_at: string;
  updated_at: string;
}

// Shape sent to the DB on create / update (no auto-generated fields)
export type RecipePayload = Omit<
  Recipe,
  | 'id'
  | 'user_id'
  | 'created_at'
  | 'updated_at'
  | 'macros'
  | 'macros_computed_at'
  | 'cooked_at'
  | 'cooked_count'
>;

export interface BulkActionResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}
