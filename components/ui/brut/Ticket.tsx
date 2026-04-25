'use client';

/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <Ticket> — the universal boxed container with a top-border "nameplate."
 *
 *   <Ticket code="REC-042 · FIG.03">…body…</Ticket>
 *   <Ticket code="BTN · COOK" hot as="article">…</Ticket>
 *
 * Always emits `.brut-ticket` + `data-code`. CSS in tokens-brutalist.css is
 * scoped under `:root[data-design="brut"]`, so in classic mode the attribute
 * sits inert on the DOM and the component renders like a plain wrapper. No
 * hook needed to check the root attr — CSS handles the conditional face.
 */

import type { ElementType, ReactNode, HTMLAttributes } from 'react';

type TicketProps = {
  code: string;
  hot?: boolean;
  as?: 'div' | 'article' | 'section';
  children: ReactNode;
  className?: string;
} & Omit<HTMLAttributes<HTMLElement>, 'children' | 'className'>;

export function Ticket({
  code,
  hot = false,
  as = 'div',
  children,
  className = '',
  ...rest
}: TicketProps) {
  const Tag = as as ElementType;
  return (
    <Tag
      data-code={code.toUpperCase()}
      data-hot={hot ? '1' : undefined}
      className={`brut-ticket ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}
