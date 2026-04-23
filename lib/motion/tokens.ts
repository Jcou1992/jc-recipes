// Motion timing + easing constants for JS-driven animations.
// Mirror the CSS custom properties in app/globals.css so CSS transitions
// and TypeScript-driven motion stay consistent.

export const DURATION = {
  xs: 120,
  sm: 180,
  md: 260,
  lg: 320,
  xl: 400,
} as const;

export const EASE = {
  outQuart: 'cubic-bezier(0.25, 1, 0.5, 1)',
  outQuint: 'cubic-bezier(0.22, 1, 0.36, 1)',
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

export const STAGGER = {
  card: 80,
  stroke: 60,
} as const;

export const CARD_STAGGER_CAP = 12;

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}
