import { sanitizeFileName, dateStamp } from '../utils';
import type { DestinationResult, DriveAdapter } from '../orchestrator';

/**
 * Drive adapter via the Tanebi Whisper Apps Script bridge (already deployed and
 * proven for the Tanebi Inbox folder) — no Google service account needed.
 *
 * Design note (documented deviation from the package): Tanebi Inbox is a FUNNEL —
 * the Mac watcher moves files into the second brain within minutes, where the
 * INGEST compiles them into the wiki. So the Drive copy is transit, its
 * webViewLink is short-lived by design, and durable idempotency lives in SEKAI's
 * fingerprint marker. Drive-side fingerprint dedup still protects against
 * immediate retries while the file is in the funnel.
 */

export interface DriveEnv {
  DRIVE_SCRIPT_URL: string;
  DRIVE_SCRIPT_SECRET: string;
}

export class AppsScriptDriveAdapter implements DriveAdapter {
  private env: DriveEnv;

  constructor(env: DriveEnv) {
    this.env = env;
  }

  async createMarkdown(args: {
    markdown: string;
    fingerprint: string;
    captureId: string;
    finalName: string;
  }): Promise<DestinationResult> {
    const fileName = `${dateStamp()} - Receta - ${sanitizeFileName(args.finalName)}.md`;
    const response = await fetch(this.env.DRIVE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow', // Apps Script answers via a 302 to googleusercontent
      body: JSON.stringify({
        secret: this.env.DRIVE_SCRIPT_SECRET,
        action: 'save_recipe_markdown',
        fingerprint: args.fingerprint,
        captureId: args.captureId,
        fileName,
        markdown: args.markdown,
      }),
    });

    const text = await response.text();
    let parsed: { ok?: boolean; fileId?: string; fileName?: string; url?: string; reused?: boolean; error?: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error(`Drive bridge returned non-JSON (${response.status}): ${text.slice(0, 200)}`);
    }
    if (!parsed.ok) throw new Error(`Drive bridge error: ${parsed.error ?? 'unknown'}`);

    return {
      status: parsed.reused ? 'reused' : 'created',
      id: parsed.fileId ?? null,
      name: parsed.fileName ?? fileName,
      url: parsed.url ?? null,
      error: null,
    };
  }
}
