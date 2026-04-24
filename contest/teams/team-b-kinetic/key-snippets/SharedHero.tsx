/**
 * components/motion/SharedHero.tsx
 *
 * The canonical wrapper for the three elements that participate in the
 * list → detail shared-element hand-off:
 *    - hero-${recipeId}     the recipe cover image / glyph cell
 *    - title-${recipeId}    the recipe title
 *    - tag-${recipeId}-0    the first tag chip (one tag animates, others fade)
 *
 * Usage pattern (list):
 *   <SharedHero kind="hero" recipeId={r.id}>
 *     <img src={cover} ... />
 *   </SharedHero>
 *
 * Usage pattern (detail):
 *   <SharedHero kind="hero" recipeId={r.id} className="detail-hero">
 *     <img src={cover} ... />
 *   </SharedHero>
 *
 * Framer-motion's LayoutGroup (set once in app/layout.tsx) handles the
 * reconciliation automatically. On route transition, identical layoutIds are
 * interpolated; mismatched ones cross-fade via AnimatePresence.
 *
 * IMPORTANT: this component MUST be mounted on both routes with the same
 * `recipeId` for the hand-off to fire. Otherwise it's a normal div.
 *
 * On `prefers-reduced-motion: reduce`, layout animation is disabled at the
 * LayoutGroup level and this component behaves as a plain element.
 */

'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { spring, duration } from '@/lib/motion/tokens';

type Kind = 'hero' | 'title' | 'tag-0';

interface Props {
  kind: Kind;
  recipeId: string;
  children: ReactNode;
  className?: string;
  /** Disable the hand-off for this instance (e.g. during bulk-select). */
  disabled?: boolean;
}

function layoutId(kind: Kind, id: string): string {
  return kind === 'tag-0' ? `tag-${id}-0` : `${kind}-${id}`;
}

export default function SharedHero({ kind, recipeId, children, className, disabled }: Props) {
  const reduced = useReducedMotion();
  const shouldAnimate = !reduced && !disabled;

  return (
    <motion.div
      layoutId={shouldAnimate ? layoutId(kind, recipeId) : undefined}
      className={className}
      transition={{
        layout: {
          // Hero-grade hand-off: 880ms with the shared-element curve.
          // For title and tag, snap is fine; they "glide into place" off the hero.
          duration: duration.hero / 1000,
          ease: kind === 'hero' ? [0.87, 0, 0.13, 1] : [0.22, 1, 0.36, 1],
          type: 'tween',
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Route-level wrapper. Mount once in app/layout.tsx:
 *
 *   <ChoreographedRoute>{children}</ChoreographedRoute>
 *
 * This is what enables LayoutGroup discovery across route boundaries. Next.js
 * app-router unmounts the old route and mounts the new one in the same
 * React tree, so as long as our LayoutGroup straddles the boundary, framer
 * will see the departing layoutIds disappear and the arriving ones appear —
 * and animate accordingly.
 */
export function ChoreographedRoute({ children }: { children: ReactNode }) {
  return (
    // LayoutGroup with id="sekai-shell" makes this a single reconciliation
    // domain. Without it, each route would be its own LayoutGroup and the
    // hand-off would collapse to a cross-fade.
    <LayoutGroup id="sekai-shell">
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </LayoutGroup>
  );
}

// Re-imports collected at bottom for clarity
import { LayoutGroup, AnimatePresence } from 'motion/react';
