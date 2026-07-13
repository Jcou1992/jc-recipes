import { renderRecipeMarkdown } from './markdown';
import { compactError, newCaptureId, recipeFingerprint } from './utils';
import type { CaptureRecipe, CaptureRequest, CaptureOptions } from './schema';

// Ported from the package (backend/src/orchestrator.js) with types added.
// Invariants preserved: per-destination fingerprint dedup, duplicate policy,
// partial failures never repeat the destination that already succeeded.

export interface DestinationResult {
  status: 'created' | 'reused' | 'skipped' | 'failed';
  id: string | null;
  name: string | null;
  url: string | null;
  error: string | null;
}

export interface SekaiAdapter {
  findByFingerprint(name: string, fingerprint: string): Promise<DestinationResult | null>;
  resolveFinalName(name: string, policy: CaptureOptions['duplicatePolicy']): Promise<string>;
  create(args: { recipe: CaptureRecipe; fingerprint: string; finalName: string }): Promise<DestinationResult>;
}

export interface DriveAdapter {
  createMarkdown(args: {
    markdown: string;
    fingerprint: string;
    captureId: string;
    finalName: string;
  }): Promise<DestinationResult>;
}

const skipped = (): DestinationResult => ({ status: 'skipped', id: null, name: null, url: null, error: null });
const failed = (error: unknown): DestinationResult => ({
  status: 'failed',
  id: null,
  name: null,
  url: null,
  error: compactError(error),
});

function combinedStatus(
  sekai: DestinationResult,
  drive: DestinationResult,
  options: CaptureOptions,
): 'complete' | 'partial' | 'failed' {
  const requested: string[] = [];
  if (options.saveToSekai) requested.push(sekai.status);
  if (options.saveToDrive) requested.push(drive.status);
  const successes = requested.filter((status) => ['created', 'reused'].includes(status)).length;
  if (successes === requested.length) return 'complete';
  if (successes > 0) return 'partial';
  return 'failed';
}

export class RecipeOrchestrator {
  private sekai: SekaiAdapter;
  private drive: DriveAdapter;

  constructor(deps: { sekai: SekaiAdapter; drive: DriveAdapter }) {
    this.sekai = deps.sekai;
    this.drive = deps.drive;
  }

  async capture(payload: CaptureRequest) {
    const captureId = payload.captureId || newCaptureId();
    const results = [];

    for (const recipe of payload.recipes) {
      const fingerprint = recipeFingerprint(recipe);
      let finalName = recipe.name;
      let sekaiResult = skipped();
      let driveResult = skipped();
      const warnings: string[] = [];

      if (payload.options.saveToSekai) {
        try {
          const existing = await this.sekai.findByFingerprint(recipe.name, fingerprint);
          if (existing) {
            sekaiResult = existing;
            finalName = existing.name || recipe.name;
          } else {
            finalName = await this.sekai.resolveFinalName(recipe.name, payload.options.duplicatePolicy);
            if (finalName !== recipe.name) warnings.push(`SEKAI name versioned to: ${finalName}`);
            sekaiResult = await this.sekai.create({ recipe, fingerprint, finalName });
          }
        } catch (error) {
          sekaiResult = failed(error);
        }
      }

      if (payload.options.saveToDrive) {
        try {
          const markdown = renderRecipeMarkdown({
            recipe: { ...recipe, name: finalName },
            fingerprint,
            captureId,
            source: payload.source,
            sekaiResult,
            finalName,
          });
          driveResult = await this.drive.createMarkdown({ markdown, fingerprint, captureId, finalName });
        } catch (error) {
          driveResult = failed(error);
        }
      }

      results.push({
        requestedName: recipe.name,
        finalName,
        fingerprint,
        status: combinedStatus(sekaiResult, driveResult, payload.options),
        sekai: sekaiResult,
        drive: driveResult,
        warnings,
      });
    }

    const complete = results.filter((item) => item.status === 'complete').length;
    const failedCount = results.filter((item) => item.status === 'failed').length;
    const status =
      complete === results.length ? 'complete' : failedCount === results.length ? 'failed' : 'partial';

    return { ok: status === 'complete', status, captureId, results };
  }
}
