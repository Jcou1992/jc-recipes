/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * Cookie-name + type constants shared between the server action and the root
 * layout. Kept in a plain module (not `'use server'`) because Next rejects any
 * non-async export from an action file. Mirrors lib/preference-cookies.ts.
 */

export const DESIGN_MODE_COOKIE = 'design-mode';
export type DesignMode = 'classic' | 'brut';
export const DESIGN_MODE_VALUES: readonly DesignMode[] = ['classic', 'brut'] as const;
