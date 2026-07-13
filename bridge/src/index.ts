import { captureRequestSchema } from './schema';
import { RecipeOrchestrator } from './orchestrator';
import { SupabaseSekaiAdapter, type SekaiEnv } from './adapters/sekai';
import { AppsScriptDriveAdapter, type DriveEnv } from './adapters/drive';
import { compactError } from './utils';

/**
 * Tanebi Recipe Bridge — the single GPT Action endpoint.
 *   GET  /health              → liveness, no auth
 *   POST /v1/recipe-captures  → Bearer ACTION_API_KEY, contract in ../openapi.yaml
 */

export interface Env extends SekaiEnv, DriveEnv {
  ACTION_API_KEY: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  let mismatch = aBytes.length ^ bBytes.length;
  const max = Math.max(aBytes.length, bBytes.length, 1);
  for (let i = 0; i < max; i += 1) {
    mismatch |= (aBytes[i % Math.max(aBytes.length, 1)] ?? 0) ^ (bBytes[i % Math.max(bBytes.length, 1)] ?? 0);
  }
  return mismatch === 0;
}

function authorized(request: Request, env: Env): boolean {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  return token.length > 0 && timingSafeEqual(token, env.ACTION_API_KEY);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true, service: 'tanebi-recipe-bridge', time: new Date().toISOString() });
    }

    if (request.method === 'POST' && url.pathname === '/v1/recipe-captures') {
      if (!env.ACTION_API_KEY) return json({ ok: false, error: 'Server not configured.' }, 500);
      if (!authorized(request, env)) return json({ ok: false, error: 'Unauthorized.' }, 401);

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: 'Invalid JSON body.' }, 400);
      }

      const parsed = captureRequestSchema.safeParse(body);
      if (!parsed.success) {
        return json(
          {
            ok: false,
            error: 'Payload validation failed.',
            issues: parsed.error.issues.slice(0, 10).map((issue) => ({
              path: issue.path.join('.'),
              message: issue.message,
            })),
          },
          422,
        );
      }

      try {
        const orchestrator = new RecipeOrchestrator({
          sekai: new SupabaseSekaiAdapter(env),
          drive: new AppsScriptDriveAdapter(env),
        });
        const result = await orchestrator.capture(parsed.data);
        return json(result, result.status === 'failed' ? 502 : 200);
      } catch (error) {
        return json({ ok: false, status: 'failed', error: compactError(error) }, 500);
      }
    }

    return json({ ok: false, error: 'Not found.' }, 404);
  },
};
