'use server';

/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * Writes the `design-mode` cookie that gates the brutalist token layer on the
 * `<html>` element. Mirrors the cookie-write pattern in app/actions/preferences.ts:
 * lax SameSite (so auth-redirect flows preserve it), long-lived (1y), httpOnly
 * FALSE so the client-side DesignModeToggle can flip `data-design` on the root
 * optimistically before the next paint.
 *
 * Legal values: 'classic' | 'brut'. Anything else is ignored — the layout
 * defaults to 'classic' when the cookie is missing or malformed.
 *
 * Constants + type live in lib/brut/design-mode-cookie.ts because Next
 * forbids non-async exports from `'use server'` files.
 */

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  DESIGN_MODE_COOKIE,
  DESIGN_MODE_VALUES,
  type DesignMode,
} from '@/lib/brut/design-mode-cookie';

const DESIGN_MODE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year, mirrors PREF_COOKIE_MAX_AGE

function isDesignMode(v: unknown): v is DesignMode {
  return typeof v === 'string' && (DESIGN_MODE_VALUES as readonly string[]).includes(v);
}

export async function setDesignMode(mode: DesignMode): Promise<void> {
  if (!isDesignMode(mode)) return;
  const cookieStore = await cookies();
  cookieStore.set(DESIGN_MODE_COOKIE, mode, {
    maxAge: DESIGN_MODE_MAX_AGE,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false,
    path: '/',
  });
  revalidatePath('/', 'layout');
}
