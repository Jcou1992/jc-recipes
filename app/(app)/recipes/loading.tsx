import { cookies } from 'next/headers';
import { DESIGN_MODE_COOKIE } from '@/lib/brut/design-mode-cookie';

/**
 * Cycle 2 P2: Suspense fallback for `/recipes` initial load. Before this
 * file existed, the route showed nothing for ~500ms while the server
 * component awaited the Supabase round-trip — visibility-of-system-status
 * miss (Nielsen #1).
 *
 * Brut variant renders a `[ ⋯ FETCHING ]` ticket card; classic shows a
 * grey-pulse skeleton list of 4 placeholder cards. Cookie-gated server-side
 * so the flicker matches whatever mode the user is in.
 */
export default async function Loading() {
  const cookieStore = await cookies();
  const isBrut = cookieStore.get(DESIGN_MODE_COOKIE)?.value === 'brut';

  if (isBrut) {
    return (
      <main className="max-w-[min(100%-2rem,1280px)] mx-auto px-4 py-8">
        <div
          className="brut-ticket"
          data-code="LIST · ⋯ FETCHING"
          aria-busy="true"
          aria-live="polite"
        >
          <p
            className="font-label text-xs tracking-widest uppercase"
            style={{ color: 'var(--text-3)' }}
          >
            Loading recipes…
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-[min(100%-2rem,1280px)] mx-auto px-4 py-8">
      <div
        className="space-y-3"
        aria-busy="true"
        aria-live="polite"
        aria-label="Loading recipes"
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl h-32 animate-pulse"
            style={{
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
            }}
          />
        ))}
      </div>
    </main>
  );
}
