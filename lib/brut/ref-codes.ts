/**
 * SEKAI · BRUTALIST-RAW-LUXE reference-code helpers.
 *
 * Every entity in the system prints its code at the top-left of its cell:
 *   REC-A8F3   — a recipe, short-hashed from its UUID
 *   ING-07     — an ingredient row within a recipe (1-indexed, zero-padded)
 *   STP-03/07  — a step within a recipe (both sides padded for tabular alignment)
 *   #DESSERT   — a tag, sigil `#` prefix, uppercase
 *
 * These are pure functions with zero IO. Consumed by <RefCode>, <Ticket>,
 * ServiceTicket, and the wayfinder crumb builder. Deterministic hashing means
 * REC codes are stable across server renders and page reloads — critical for
 * shared URLs where JC says "pull up REC-A8F3."
 */

/**
 * Deterministic 4-char base36 hash of any UUID-like string. Collision rate is
 * acceptable for a personal + small-circle tool (4^36 = 1.7M distinct codes);
 * collisions degrade to visual-only overlap, never data integrity.
 */
export function shortHash(uuid: string): string {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) {
    h = (h * 31 + uuid.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
}

export function fmtRec(uuid: string): string {
  return `REC-${shortHash(uuid)}`;
}

/** 0-indexed in code, 1-indexed on screen. ING-01 is the first ingredient. */
export function fmtIng(index: number): string {
  return `ING-${String(index + 1).padStart(2, '0')}`;
}

/** Order is 1-indexed on screen; total pads to match for odometer alignment. */
export function fmtStep(order: number, total: number): string {
  return `STP-${String(order).padStart(2, '0')}/${String(total).padStart(2, '0')}`;
}

export function fmtTag(name: string): string {
  return `#${name.toUpperCase()}`;
}
