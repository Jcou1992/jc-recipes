/**
 * components/motion/CookStepTransition.tsx
 *
 * Cook-mode step advance as a film cut with velocity-aware direction.
 *
 *  - Outgoing step accelerates off-axis (translate + opacity + filter: blur)
 *    over 200ms with --ease-in-expo. The blur creates the *impression* of
 *    motion blur without a shader or compositor hack.
 *  - Incoming step decelerates into position with --ease-out-expo over 240ms,
 *    overlapping the outgoing step's final 60ms. No cross-fade — the two
 *    always occupy different on-screen positions during transit.
 *  - Direction governed by gesture: a right-to-left swipe advances (outgoing
 *    exits left, incoming enters from right); left-to-right swipe goes back.
 *    A tap on the Next button defaults to advance, Back button to back.
 *  - Haptic `snap` fires at t=0 (pre-announcement — the hand feels the
 *    decision 30ms before the eye sees the result).
 *  - Audio `advance` (784Hz) or `back` (587Hz) fires at t=30ms.
 *
 * The component renders exactly one step at a time; it's the caller's job
 * to remount with a new key when the step index changes. AnimatePresence
 * handles the exit animation of the outgoing step while the incoming one
 * enters.
 */

'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';
import { SFX } from '@/lib/motion/audio';
import { HAPTIC } from '@/lib/motion/haptic';
import { duration, easeCss } from '@/lib/motion/tokens';

export type Direction = 'forward' | 'back';

interface Props {
  /** Unique key per step — drives AnimatePresence entry/exit. */
  stepKey: string | number;
  /** Gesture direction. Governs enter/exit offsets. */
  direction: Direction;
  /** The step content. */
  children: ReactNode;
}

const OFFSET = 48; // px

export default function CookStepTransition({ stepKey, direction, children }: Props) {
  const reduced = useReducedMotion();
  const firstMount = useRef(true);

  useEffect(() => {
    // Skip firing on initial mount (no transition on first render).
    if (firstMount.current) {
      firstMount.current = false;
      return;
    }
    // Pre-announce: haptic at t=0, sound at t=30ms (so the hand feels it
    // before the eye sees the next step arrive).
    HAPTIC.snap();
    const t = setTimeout(() => {
      if (direction === 'forward') SFX.advance();
      else SFX.back();
    }, 30);
    return () => clearTimeout(t);
  }, [stepKey, direction]);

  if (reduced) {
    return <div key={stepKey}>{children}</div>;
  }

  // Incoming side: forward → enters from +OFFSET (right); back → from -OFFSET
  // Outgoing side: forward → exits to -OFFSET (left); back → to +OFFSET
  const enterX = direction === 'forward' ?  OFFSET : -OFFSET;
  const exitX  = direction === 'forward' ? -OFFSET :  OFFSET;

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={stepKey}
        initial={{ x: enterX, opacity: 0, filter: 'blur(0px)' }}
        animate={{ x: 0, opacity: 1, filter: 'blur(0px)' }}
        exit={{ x: exitX, opacity: 0, filter: 'blur(3px)' }}
        transition={{
          x:       { duration: duration.step / 1000, ease: easeCss.outExpo },
          opacity: { duration: duration.step / 1000, ease: easeCss.outExpo },
          filter:  { duration: 200 / 1000, ease: easeCss.inExpo }, // blur only on exit
        }}
        style={{ position: 'absolute', inset: 0, willChange: 'transform, opacity, filter' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useCookGesture — pointer-based swipe detector for the cook-mode body
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react';
import { snap as SNAP } from '@/lib/motion/tokens';

export interface CookGestureResult {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp:   (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

export function useCookGesture(
  onAdvance: (direction: Direction) => void,
): CookGestureResult {
  const drag = useRef({ startX: 0, startT: 0, currentX: 0, active: false });

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    drag.current = {
      startX: e.clientX,
      startT: performance.now(),
      currentX: e.clientX,
      active: true,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active) return;
    drag.current.currentX = e.clientX;
  }, []);

  const onPointerUp = useCallback(() => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const dx = drag.current.currentX - drag.current.startX;
    const dt = performance.now() - drag.current.startT;
    const vx = Math.abs(dx) / dt; // px/ms
    if (Math.abs(dx) > SNAP.cookSwipePx || vx > SNAP.cookSwipeVx) {
      onAdvance(dx < 0 ? 'forward' : 'back');
    }
  }, [onAdvance]);

  const onPointerCancel = useCallback(() => {
    drag.current.active = false;
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel };
}
