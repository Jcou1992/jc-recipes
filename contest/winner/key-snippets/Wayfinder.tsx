/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <Wayfinder> — the universal 32px-tall header printed at the top of every
 * route. Renders the pit-wall telemetry line that anchors the whole visual
 * identity:
 *
 *   SEKAI · REC-042 · COOK  │  STEP 3/7  │  T+04:21  │  USR·JC · DARK·MD
 *
 * Slots (left → right):
 *   1. `crumb`       — app + resource + mode (`SEKAI · REC-042 · COOK`)
 *   2. `modeLabel`   — mode-specific state (`STEP 3/7`, `[06] SHOWN`, `DRAFT`)
 *   3. `tint`        — one of 'neutral' | 'hot' — turns the state slot terracotta
 *   4. `time`        — live clock (optional; defaults to user-local HH:MM)
 *   5. `user`        — `USR·JC · DARK·MD` — user tag + theme + font-size
 *
 * Server-renderable. No client JS needed unless the clock is live, in which
 * case pass `liveClock` and the client boundary is wrapped internally.
 *
 * Hidden entirely under @media print.
 */

import { Suspense } from 'react';
import { cookies, headers } from 'next/headers';

type WayfinderProps = {
  crumb: string;
  modeLabel?: string;
  tint?: 'neutral' | 'hot';
  /** Override user-local clock string; default = render a small client clock. */
  timeOverride?: string;
  liveClock?: boolean;
};

export async function Wayfinder({
  crumb,
  modeLabel,
  tint = 'neutral',
  timeOverride,
  liveClock = true,
}: WayfinderProps) {
  const c = await cookies();
  const h = await headers();

  // User tag — in real impl, derive from supabase getSession().
  // For the snippet, decode a dev cookie or fall back to `USR·?`.
  const userHandle = (c.get('sekai-user')?.value ?? 'JC').toUpperCase();
  const theme = (c.get('preferred-theme')?.value ?? 'dark').toUpperCase();
  const fontSize = (c.get('preferred-font-size')?.value ?? 'md').toUpperCase();

  return (
    <nav
      aria-label="wayfinder"
      className="brut-wayfinder"
      data-tint={tint}
    >
      <span className="brut-way-crumb" dangerouslySetInnerHTML={{ __html: decorateCrumb(crumb) }} />
      {modeLabel ? (
        <span className="brut-way-state">{modeLabel}</span>
      ) : <span />}
      <span className="brut-way-sep" aria-hidden="true">·</span>
      <span className="brut-way-time">
        {timeOverride ?? (liveClock ? <LiveClock /> : '—')}
      </span>
      <span className="brut-way-user">USR·{userHandle} · {theme}·{fontSize}</span>
    </nav>
  );
}

/* Decorate the first crumb segment with <b>…</b> for weight emphasis. */
function decorateCrumb(s: string): string {
  const parts = s.split(' · ');
  if (parts.length === 0) return '';
  const [first, ...rest] = parts;
  const bolded = `<b>${escapeHtml(first)}</b>`;
  return [bolded, ...rest.map(escapeHtml)].join(' · ');
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' } as Record<string,string>
  )[c]);
}

/* ── Live clock (client boundary) ───────────────────────────────────────── */

'use client';
// NOTE: this directive applies to the file below when you extract it.
// In the real repo this would live in `components/ui/Wayfinder.Clock.tsx`.

import { useEffect, useState } from 'react';

export function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return <time dateTime={now.toISOString()}>{hh}:{mm}</time>;
}

/* ── Co-located CSS ─────────────────────────────────────────────────────── */

export const WayfinderCSS = `
.brut-wayfinder {
  position: sticky;
  top: 0;
  z-index: 50;
  display: grid;
  grid-template-columns: auto 1fr auto auto auto;
  gap: 16px;
  align-items: center;
  height: 32px;
  padding: 0 16px;
  background: var(--bg);
  border-bottom: 2px solid var(--rule-strong);
  font-family: var(--font-mono);
  font-size: 0.625rem;          /* 10px */
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-3);
  white-space: nowrap;
}
.brut-way-crumb { color: var(--text-2); overflow: hidden; text-overflow: ellipsis; }
.brut-way-crumb b { color: var(--text-1); font-weight: 600; }
.brut-way-state { color: var(--text-2); font-weight: 500; }
.brut-wayfinder[data-tint="hot"] .brut-way-state { color: var(--hot); }
.brut-way-sep { color: var(--text-4); padding: 0 4px; }
.brut-way-time { color: var(--text-2); font-variant-numeric: tabular-nums; }
.brut-way-user { color: var(--text-2); }

@media print { .brut-wayfinder { display: none !important; } }

/* Compress right slots on narrow viewports. */
@media (max-width: 479px) {
  .brut-wayfinder { grid-template-columns: 1fr auto auto; gap: 8px; }
  .brut-way-sep, .brut-way-state { display: none; }
}
`;
