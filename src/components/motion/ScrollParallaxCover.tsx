'use client';

import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

// Wraps a block in a CSS scroll-driven parallax translate. Uses
// animation-timeline: scroll(), which is natively supported in
// Chrome/Edge/Safari (Firefox behind a flag). On unsupported browsers
// the content renders statically — there is no JavaScript scroll
// listener, so there is no fallback cost.
export default function ScrollParallaxCover({ children, className }: Props) {
  return (
    <div className={`scroll-parallax ${className ?? ''}`.trim()}>
      {children}
    </div>
  );
}
