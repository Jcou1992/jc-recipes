// components/spatial/SpatialBoundary.tsx
//
// Error boundary + tier gate. ALWAYS renders its `fallback` (the 2D/HTML
// variant) first, then mounts the spatial `children` over the top when
// tier ≥ 2. If any spatial component throws mid-render or crashes WebGL
// at runtime, we drop back to fallback silently.
//
// This is the single abstraction that makes the whole Spatial lane safe
// to ship: no spatial component can break the app.

'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  /** The 2D HTML variant. Must be fully functional on its own. */
  fallback: ReactNode;
  /** The spatial enhancement (Tier ≥ 2). */
  children: ReactNode;
  /** Optional callback on error (e.g. report to observability). */
  onError?: (err: Error) => void;
}

interface State {
  hasError: boolean;
}

export class SpatialBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(err: Error) {
    // Silent by design — spatial failures must NEVER surface to the user.
    // Optional hook for logging (Sentry / PostHog).
    if (typeof console !== 'undefined') {
      console.warn('[SEKAI/spatial] fell back to 2D:', err.message);
    }
    this.props.onError?.(err);
  }

  render() {
    // Always render the fallback.
    // Render the spatial layer ABOVE it unless we errored.
    return (
      <>
        {this.props.fallback}
        {!this.state.hasError && this.props.children}
      </>
    );
  }
}

export default SpatialBoundary;
