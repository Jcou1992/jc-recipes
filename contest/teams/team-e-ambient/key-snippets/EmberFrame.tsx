'use client';

import { type ReactNode } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// SEKAI 世界 — EmberFrame
//
// Wraps the active cook-mode step. When a timer is running, the frame's
// breath cadence accelerates from 4s → 1.6s and the ember glow intensifies.
// The outer `data-stage` attribute on cook mode's root toggles the full-page
// ember overlay (see CookMode.tsx edit + glass-card.css `.ember-frame`).
//
// Zero JS motion. CSS class change only. Respects reduced-motion via the
// `.ember-frame` rules in glass-card.css.
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  children: ReactNode;
  /** True while any timer in this step is counting down. */
  timerRunning?: boolean;
  /** True when the step is the currently-active one. */
  active?: boolean;
  className?: string;
}

export function EmberFrame({ children, timerRunning = false, active = true, className = '' }: Props) {
  if (!active) {
    // Non-active steps render their children plain. We never want the
    // breathing animation on background content.
    return <div className={className}>{children}</div>;
  }
  return (
    <div
      className={`ember-frame ${className}`}
      data-timer-running={timerRunning ? 'true' : 'false'}
    >
      {children}
    </div>
  );
}
