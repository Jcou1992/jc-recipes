interface ServingsInput {
  servings: number;
  serving_size_label: string | null;
}

interface FormatOptions {
  truncate?: number;
}

export function formatServings(recipe: ServingsInput, opts: FormatOptions = {}): string {
  const base = `Serves ${recipe.servings}`;
  const label = recipe.serving_size_label?.trim();
  if (!label) return base;

  if (opts.truncate && label.length > opts.truncate) {
    return `${base} · ${label.slice(0, opts.truncate)}…`;
  }
  return `${base} · ${label}`;
}
