/**
 * lib/motion/springEngine.ts
 *
 * Critically-damped harmonic oscillator for UI. Used wherever we need velocity
 * preservation outside a framer-motion component (scaler dial, ingredient-dot
 * pulses, any imperative animation where a React hook is overkill).
 *
 * Not a replacement for framer-motion — complements it. Framer handles React
 * rendering + layout animation; this handles raw numeric integration when
 * all we need is "push this DOM node from A to B with physics."
 *
 * Math: explicit Euler integration of the ODE
 *   x'' = -(k/m)(x - xRest) - (c/m)x'
 * where k = stiffness, c = damping, m = mass. Fixed dt=1/60 for stability;
 * not Runge-Kutta because we don't need it (UI tolerances are generous and
 * dt is small). Rest detection: |Δx| < restDelta AND |v| < restVelocity for
 * one frame. No "oscillation count" heuristic — the damping ceiling (see
 * tokens.ts) ensures we never need one.
 */

import type { SpringName } from './tokens';
import { spring as springConfigs } from './tokens';

export interface SpringConfig {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface SpringOptions {
  /** Initial velocity (units/sec). Default 0. Pass a nonzero value to
   *  preserve velocity from a preceding gesture (drag release, fling). */
  velocity?: number;
  /** Invoked each frame with the current value. Animate your DOM here. */
  onFrame: (value: number) => void;
  /** Invoked exactly once when the spring settles at rest. */
  onRest?: () => void;
  /** Abort signal. When aborted, the spring stops without calling onRest. */
  signal?: AbortSignal;
  /** Value tolerance for rest detection (default 0.5 for px). */
  restDelta?: number;
  /** Velocity tolerance for rest detection (default 0.05). */
  restVelocity?: number;
}

/**
 * Animate a value from `from` to `to` using the given spring config.
 * Returns a cleanup function that aborts the animation.
 *
 * Example — spring an ingredient-dot pulse:
 *   animateSpring(1.35, 1, spring.stiff, {
 *     onFrame: (s) => { dot.style.transform = `scale(${s})`; },
 *   });
 *
 * Example — preserve velocity from a drag release:
 *   const v0 = lastPointerVx * 0.6;
 *   animateSpring(current, target, spring.snap, {
 *     velocity: v0,
 *     onFrame: setPosition,
 *     onRest: () => fireHaptic(HAPTIC.snap),
 *   });
 */
export function animateSpring(
  from: number,
  to: number,
  config: SpringConfig | SpringName,
  opts: SpringOptions,
): () => void {
  const cfg = typeof config === 'string' ? springConfigs[config] : config;
  const { stiffness, damping, mass } = cfg;
  const {
    velocity: v0 = 0,
    onFrame,
    onRest,
    signal,
    restDelta = 0.5,
    restVelocity = 0.05,
  } = opts;

  let x = from;
  let v = v0;
  const dt = 1 / 60;
  let stopped = false;
  let frameId = 0;

  const abort = () => {
    stopped = true;
    cancelAnimationFrame(frameId);
  };

  signal?.addEventListener('abort', abort, { once: true });

  const step = () => {
    if (stopped) return;
    const Fspring = -stiffness * (x - to);
    const Fdamp = -damping * v;
    const a = (Fspring + Fdamp) / mass;
    v += a * dt;
    x += v * dt;
    onFrame(x);
    if (Math.abs(to - x) < restDelta && Math.abs(v) < restVelocity) {
      onFrame(to);
      onRest?.();
      return;
    }
    frameId = requestAnimationFrame(step);
  };
  frameId = requestAnimationFrame(step);

  return abort;
}

/**
 * Spring-interpolate between multiple values over time (useful for sequences
 * where a single driver value drives multiple visual properties — e.g. the
 * scaler dial whose rotation, the face's counter-rotation, and the glow ring's
 * intensity all animate from the same source).
 *
 * Returns a `MotionValue`-like object with `.get()`, `.set()`, and
 * `.onChange(cb)` methods. When `.set(to)` is called, the underlying value
 * springs to `to`, preserving any prior in-flight velocity.
 */
export function createSpringValue(initial: number, config: SpringName | SpringConfig) {
  let current = initial;
  let velocity = 0;
  let abort: (() => void) | null = null;
  const listeners = new Set<(v: number) => void>();

  return {
    get: () => current,
    getVelocity: () => velocity,
    set: (next: number) => {
      abort?.();
      const prevVelocity = velocity;
      abort = animateSpring(current, next, config, {
        velocity: prevVelocity,
        onFrame: (v) => {
          // estimate instantaneous velocity for future releases
          velocity = (v - current) * 60; // units/sec
          current = v;
          for (const cb of listeners) cb(v);
        },
        onRest: () => {
          velocity = 0;
        },
      });
    },
    /** Hard-set without spring (useful for initial reset). */
    setImmediate: (next: number) => {
      abort?.();
      current = next;
      velocity = 0;
      for (const cb of listeners) cb(next);
    },
    onChange: (cb: (v: number) => void) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    stop: () => abort?.(),
  };
}
