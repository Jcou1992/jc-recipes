// Thin wrapper around navigator.vibrate().
// Silently no-ops when:
//   - running server-side,
//   - vibrate API is missing (desktop, some mobile browsers),
//   - the user has set prefers-reduced-motion: reduce.
// Haptic feedback is classified as motion for accessibility purposes.

export type HapticPattern = number | number[];

export function haptic(pattern: HapticPattern): void {
  if (typeof navigator === 'undefined') return;
  if (!('vibrate' in navigator)) return;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    return;
  }
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw on certain patterns — treat as no-op.
  }
}
