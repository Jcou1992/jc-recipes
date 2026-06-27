import Link from 'next/link';
import { cookies } from 'next/headers';
import { DESIGN_MODE_COOKIE } from '@/lib/brut/design-mode-cookie';

/**
 * Branded 404. Replaces Next.js's default unbranded white page.
 *
 * Cycle 2 P2: catches `notFound()` calls from `/recipes/[id]/page.tsx` and
 * any other unmatched route. Renders the SEKAI chrome and a clear way back
 * to the recipes list. The brut variant uses the ticket grammar; classic
 * uses the body face — both gated server-side off the design-mode cookie
 * so first paint matches.
 *
 * Note: the global Wayfinder and avatar menu still mount via the root
 * layout; this page only owns the inner content area.
 */
export default async function NotFound() {
  const cookieStore = await cookies();
  const isBrut = cookieStore.get(DESIGN_MODE_COOKIE)?.value === 'brut';

  if (isBrut) {
    return (
      <main className="max-w-[min(100%-2rem,800px)] mx-auto px-4 py-16">
        <div
          className="brut-ticket"
          data-code="ERR · 404 · NOT FOUND"
        >
          <p
            className="font-label text-xs tracking-widest uppercase mb-3"
            style={{ color: 'var(--text-3)' }}
          >
            [ HALT ] · ROUTE UNRESOLVED
          </p>
          <h1
            className="font-display text-2xl mb-4"
            style={{ color: 'var(--text-1)', fontFamily: 'var(--font-mono)' }}
          >
            Recipe not found.
          </h1>
          <p
            className="font-body text-sm mb-6"
            style={{ color: 'var(--text-2)' }}
          >
            The page you requested doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link
            href="/recipes"
            className="font-label text-xs tracking-widest uppercase"
            style={{ color: 'var(--color-terracotta)' }}
          >
            → BACK TO RECIPES
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[min(100%-2rem,800px)] mx-auto px-4 py-16">
      <h1
        className="font-display text-3xl md:text-4xl font-bold mb-4"
        style={{ color: 'var(--text-1)' }}
      >
        Recipe not found.
      </h1>
      <p
        className="font-body text-base mb-8"
        style={{ color: 'var(--text-2)' }}
      >
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Link href="/recipes" className="btn-ghost inline-block">
        ← Back to recipes
      </Link>
    </main>
  );
}
