'use client';

import Link, { type LinkProps } from 'next/link';
import { useRouter } from 'next/navigation';
import { forwardRef, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react';
import { startViewTransition } from '@/lib/motion/view-transition';

type Props = Omit<LinkProps, 'href'> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    href: string;
    children: ReactNode;
  };

// Intercepts internal navigation and wraps the route change in
// document.startViewTransition so matched view-transition-name pairs can
// animate between pages. Preserves Link's prefetch behavior and correctly
// bypasses the transition for modified clicks (cmd/ctrl/shift/alt/middle-
// click) so users can still open in new tabs.
const ViewTransitionLink = forwardRef<HTMLAnchorElement, Props>(function ViewTransitionLink(
  { href, children, onClick, ...rest },
  ref,
) {
  const router = useRouter();

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    void startViewTransition(() => {
      router.push(href);
    });
  }

  return (
    <Link ref={ref} href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
});

export default ViewTransitionLink;
