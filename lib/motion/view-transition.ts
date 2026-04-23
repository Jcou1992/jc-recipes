// Wraps document.startViewTransition() so callers can always await a Promise.
// When the API is missing (Firefox, older browsers) or the user prefers
// reduced motion, the callback runs inline and the returned Promise resolves.
// Callers get the same shape either way — no feature-detection boilerplate
// at the call site.

type VTDocument = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> };
};

export async function startViewTransition(
  cb: () => void | Promise<void>,
): Promise<void> {
  if (typeof document === 'undefined') {
    await cb();
    return;
  }
  const d = document as VTDocument;
  if (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ) {
    await cb();
    return;
  }
  if (!d.startViewTransition) {
    await cb();
    return;
  }
  const transition = d.startViewTransition(cb);
  await transition.finished.catch(() => {
    // View-transition failures must not crash navigation.
  });
}

export function supportsViewTransitions(): boolean {
  if (typeof document === 'undefined') return false;
  return typeof (document as VTDocument).startViewTransition === 'function';
}
