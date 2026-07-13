import { describe, expect, test } from 'vitest';
import { captureRequestSchema, type CaptureRecipe } from '../src/schema';
import { recipeFingerprint, sanitizeFileName } from '../src/utils';
import { renderRecipeMarkdown } from '../src/markdown';
import { RecipeOrchestrator, type DestinationResult, type SekaiAdapter, type DriveAdapter } from '../src/orchestrator';

// Ported from the package's node:test suite (schema/utils/markdown/orchestrator)
// plus the partial-failure case the package left implicit.

const recipe: CaptureRecipe = {
  name: 'Salsa',
  servings: 4,
  ingredients: [{ amount: 1, unit: 'piece', name: 'chile' }],
  steps: [{ order: 1, content: 'Dora el chile.', timer_seconds: null }],
  description: null,
  prep_time: null,
  cook_time: null,
  serving_size_label: null,
  tags: [],
  notes: null,
};

const payload = {
  captureId: 'capture-1',
  source: { type: 'text' as const, language: 'es-MX', originalText: null, notes: null },
  recipes: [recipe],
  options: { saveToSekai: true, saveToDrive: true, duplicatePolicy: 'version' as const },
};

class SekaiMock implements SekaiAdapter {
  store = new Map<string, DestinationResult>();
  failNext = false;
  async findByFingerprint(_name: string, fp: string) {
    return this.store.get(fp) ?? null;
  }
  async resolveFinalName(name: string) {
    return name;
  }
  async create({ fingerprint, finalName }: { recipe: CaptureRecipe; fingerprint: string; finalName: string }) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('sekai down');
    }
    const created: DestinationResult = {
      status: 'created',
      id: fingerprint.slice(0, 8),
      name: finalName,
      url: `https://sekai.invalid/${fingerprint.slice(0, 8)}`,
      error: null,
    };
    this.store.set(fingerprint, { ...created, status: 'reused' });
    return created;
  }
}

class DriveMock implements DriveAdapter {
  store = new Map<string, DestinationResult>();
  failNext = false;
  async createMarkdown({ fingerprint, finalName }: { markdown: string; fingerprint: string; captureId: string; finalName: string }) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('drive down');
    }
    const existing = this.store.get(fingerprint);
    if (existing) return existing;
    const created: DestinationResult = {
      status: 'created',
      id: fingerprint.slice(0, 8),
      name: `${finalName}.md`,
      url: `https://drive.invalid/${fingerprint}`,
      error: null,
    };
    this.store.set(fingerprint, { ...created, status: 'reused' });
    return created;
  }
}

describe('schema', () => {
  test('applies defaults and normalizes step order', () => {
    const parsed = captureRequestSchema.parse({
      source: { type: 'dictation', language: 'es-MX' },
      recipes: [
        {
          name: 'Prueba',
          servings: 4,
          ingredients: [{ amount: 1, unit: 'piece', name: 'ingrediente' }],
          steps: [{ order: 8, content: 'Cocina el ingrediente.', timer_seconds: null }],
        },
      ],
    });
    expect(parsed.options.saveToSekai).toBe(true);
    expect(parsed.options.duplicatePolicy).toBe('version');
    expect(parsed.recipes[0].steps[0].order).toBe(1);
    expect(parsed.recipes[0].tags).toEqual([]);
  });

  test('rejects recipes without ingredients', () => {
    const invalid = {
      source: { type: 'dictation', language: 'es-MX' },
      recipes: [{ name: 'X', servings: 1, ingredients: [], steps: [{ order: 1, content: 'y', timer_seconds: null }] }],
    };
    expect(captureRequestSchema.safeParse(invalid).success).toBe(false);
  });
});

describe('utils', () => {
  test('fingerprint is stable', () => {
    expect(recipeFingerprint(recipe)).toBe(recipeFingerprint(structuredClone(recipe)));
  });
  test('fingerprint changes with culinary content', () => {
    const changed = structuredClone(recipe);
    changed.ingredients[0].amount = 2;
    expect(recipeFingerprint(changed)).not.toBe(recipeFingerprint(recipe));
  });
  test('sanitizes file names', () => {
    expect(sanitizeFileName('Salsa: roja/verde?')).toBe('Salsa- roja-verde-');
  });
});

describe('markdown', () => {
  test('renders recipe and source text', () => {
    const output = renderRecipeMarkdown({
      recipe: {
        ...recipe,
        ingredients: [{ amount: 0, unit: null, name: 'sal, al gusto' }],
        description: 'Una salsa.',
        tags: ['salsa'],
        notes: 'No inventar tiempo.',
      },
      fingerprint: 'abc',
      captureId: 'capture-1',
      source: { type: 'text', language: 'es-MX', originalText: 'Texto fuente', notes: null },
      sekaiResult: { status: 'created', id: '1', name: 'Salsa', url: 'https://sekai.invalid/1', error: null },
      finalName: 'Salsa',
    });
    expect(output).toMatch(/# Salsa/);
    expect(output).toMatch(/- sal, al gusto/);
    expect(output).toMatch(/Texto fuente/);
    expect(output).toMatch(/fingerprint: "abc"/);
  });
});

describe('orchestrator', () => {
  test('is idempotent across both destinations', async () => {
    const orchestrator = new RecipeOrchestrator({ sekai: new SekaiMock(), drive: new DriveMock() });
    const first = await orchestrator.capture(payload);
    const second = await orchestrator.capture(payload);
    expect(first.status).toBe('complete');
    expect(second.status).toBe('complete');
    expect(second.results[0].sekai.status).toBe('reused');
    expect(second.results[0].drive.status).toBe('reused');
  });

  test('partial failure does not repeat the destination that succeeded', async () => {
    const sekai = new SekaiMock();
    const drive = new DriveMock();
    const orchestrator = new RecipeOrchestrator({ sekai, drive });

    drive.failNext = true;
    const first = await orchestrator.capture(payload);
    expect(first.status).toBe('partial');
    expect(first.results[0].sekai.status).toBe('created');
    expect(first.results[0].drive.status).toBe('failed');

    const retry = await orchestrator.capture(payload);
    expect(retry.status).toBe('complete');
    expect(retry.results[0].sekai.status).toBe('reused'); // NOT created twice
    expect(retry.results[0].drive.status).toBe('created');
  });

  test('sekai failure still writes drive and reports partial', async () => {
    const sekai = new SekaiMock();
    const drive = new DriveMock();
    const orchestrator = new RecipeOrchestrator({ sekai, drive });

    sekai.failNext = true;
    const first = await orchestrator.capture(payload);
    expect(first.status).toBe('partial');
    expect(first.results[0].sekai.status).toBe('failed');
    expect(first.results[0].drive.status).toBe('created');
  });
});
