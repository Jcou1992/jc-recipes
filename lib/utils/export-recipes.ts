import type { Recipe } from '@/types/recipe';

function formatAmount(amount: number): string {
  if (Number.isInteger(amount)) return String(amount);
  return String(Number(amount.toFixed(2)));
}

export function recipeToMarkdown(recipe: Recipe): string {
  const lines: string[] = [];

  lines.push(`# ${recipe.name}`);
  lines.push('');

  if (recipe.description) {
    lines.push(`> ${recipe.description}`);
    lines.push('');
  }

  if (recipe.prep_time != null) lines.push(`**Prep time:** ${recipe.prep_time} min`);
  if (recipe.cook_time != null) lines.push(`**Cook time:** ${recipe.cook_time} min`);
  lines.push(`**Servings:** ${recipe.servings}`);
  lines.push('');

  lines.push('## Ingredients');
  lines.push('');
  for (const ing of recipe.ingredients) {
    const amount = formatAmount(ing.amount);
    const unit = ing.unit ? ` ${ing.unit}` : '';
    lines.push(`- ${amount}${unit} ${ing.name}`.trim());
  }
  lines.push('');

  lines.push('## Steps');
  lines.push('');
  const steps = [...recipe.steps].sort((a, b) => a.order - b.order);
  steps.forEach((step, idx) => {
    if (step.timer_seconds != null) {
      const mins = Math.round(step.timer_seconds / 60);
      lines.push(`${idx + 1}. ${step.content} [timer: ${mins}min]`);
    } else {
      lines.push(`${idx + 1}. ${step.content}`);
    }
  });
  lines.push('');

  if (recipe.notes) {
    lines.push('## Notes');
    lines.push('');
    lines.push(recipe.notes);
    lines.push('');
  }

  if (recipe.tags && recipe.tags.length > 0) {
    lines.push('## Tags');
    lines.push('');
    lines.push(recipe.tags.join(', '));
    lines.push('');
  }

  return lines.join('\n');
}

export function recipesToMarkdown(recipes: Recipe[]): string {
  if (recipes.length === 0) return '';
  if (recipes.length === 1) return recipeToMarkdown(recipes[0]);
  return recipes.map(recipeToMarkdown).join('\n\n---\n\n');
}

export function triggerDownload(content: string, filename: string, mimeType = 'text/plain'): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
