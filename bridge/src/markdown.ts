import { dateStamp } from './utils';
import type { CaptureRecipe, CaptureSource } from './schema';
import type { DestinationResult } from './orchestrator';

// Ported unchanged from the package (backend/src/markdown.js). The rendered
// file lands in the Tanebi Inbox funnel and is later compiled into the
// second-brain wiki by the INGEST cycle — frontmatter keys are load-bearing.

function yamlString(value: unknown): string {
  return JSON.stringify(value ?? '');
}

function renderIngredient(item: CaptureRecipe['ingredients'][number]): string {
  if (item.amount === 0 && item.unit == null) return `- ${item.name}`;
  const unit = item.unit ? ` ${item.unit}` : '';
  return `- ${item.amount}${unit} ${item.name}`.replace(/\s+/g, ' ').trim();
}

function renderStep(step: CaptureRecipe['steps'][number]): string {
  const timer = step.timer_seconds == null ? '' : ` ⏱ ${step.timer_seconds} s`;
  return `${step.order}. ${step.content}${timer}`;
}

export function renderRecipeMarkdown(args: {
  recipe: CaptureRecipe;
  fingerprint: string;
  captureId: string;
  source: CaptureSource;
  sekaiResult: DestinationResult;
  finalName: string;
}): string {
  const { recipe, fingerprint, captureId, source, sekaiResult, finalName } = args;
  const tags = (recipe.tags || []).map((tag) => yamlString(tag)).join(', ');
  const lines: Array<string | null> = [
    '---',
    `title: ${yamlString(finalName)}`,
    `created: ${yamlString(new Date().toISOString())}`,
    `capture_id: ${yamlString(captureId)}`,
    `fingerprint: ${yamlString(fingerprint)}`,
    `source_type: ${yamlString(source.type)}`,
    `language: ${yamlString(source.language)}`,
    `tags: [${tags}]`,
    `sekai_status: ${yamlString(sekaiResult.status)}`,
    `sekai_url: ${yamlString(sekaiResult.url || '')}`,
    'project: "Tanebi"',
    'type: "recipe"',
    '---',
    '',
    `# ${finalName}`,
    '',
    recipe.description || 'Sin descripción proporcionada.',
    '',
    '## Rendimiento',
    '',
    `- Porciones: ${recipe.servings}`,
    recipe.serving_size_label ? `- Tamaño de porción: ${recipe.serving_size_label}` : null,
    '',
    '## Tiempos',
    '',
    `- Preparación: ${recipe.prep_time == null ? 'No especificado' : `${recipe.prep_time} min`}`,
    `- Cocción: ${recipe.cook_time == null ? 'No especificado' : `${recipe.cook_time} min`}`,
    '',
    '## Ingredientes',
    '',
    ...recipe.ingredients.map(renderIngredient),
    '',
    '## Procedimiento',
    '',
    ...recipe.steps.map(renderStep),
    '',
    '## Notas y señales importantes',
    '',
    recipe.notes || 'Sin notas adicionales.',
    '',
    '## Registro',
    '',
    `- Fecha local: ${dateStamp()}`,
    `- Fuente: ${source.type}`,
    `- Idioma: ${source.language}`,
    `- SEKAI: ${sekaiResult.url || sekaiResult.status}`,
    `- Capture ID: ${captureId}`,
    `- Fingerprint: ${fingerprint}`,
  ];

  const kept = lines.filter((line): line is string => line !== null);

  if (source.notes) {
    kept.push(`- Nota de fuente: ${source.notes}`);
  }
  if (source.originalText) {
    kept.push('', '## Texto fuente', '', source.originalText);
  }
  kept.push('');
  return kept.join('\n');
}
