/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <Ticket> — the universal boxed container.
 *
 * Every surface in the app is a ticket. Every ticket has a label code printed
 * through its top border. `hot` mode fires the border terracotta — used for
 * the one currently-active element on a screen (exactly one per screen,
 * ideally).
 *
 * Usage:
 *   <Ticket code="FIG.03 · CARD · REC-042">…</Ticket>
 *   <Ticket as="article" code="REC-042 · FIG.03" hot>…</Ticket>
 */

import type { ElementType, HTMLAttributes, ReactNode } from 'react';

type TicketProps<T extends ElementType = 'div'> = {
  code: string;
  hot?: boolean;
  as?: T;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'children'>;

export function Ticket<T extends ElementType = 'div'>({
  code,
  hot = false,
  as,
  children,
  className = '',
  ...rest
}: TicketProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag
      data-code={code.toUpperCase()}
      data-hot={hot ? '1' : '0'}
      className={`brut-ticket ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* Co-located CSS (moved to tokens-brutalist.css or a dedicated
 * `components/ui/Ticket.module.css` in the real repo). Kept here for
 * snippet clarity. */

const CSS = `
.brut-ticket {
  position: relative;
  border: 1px solid var(--rule);
  background: var(--surface);
  padding: 24px 16px 16px;
  transition: border-color 80ms linear;
}
.brut-ticket::before {
  content: attr(data-code);
  position: absolute;
  top: -7px;
  left: 12px;
  padding: 0 4px;
  background: var(--bg);
  font-family: var(--font-mono);
  font-size: 0.625rem;           /* 10px */
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
  font-weight: 500;
  white-space: nowrap;
}
.brut-ticket[data-hot="1"] {
  border-color: var(--hot);
  border-width: 2px;
  padding: 23px 15px 15px;        /* compensate 1px so content doesn't jump */
}
.brut-ticket[data-hot="1"]::before {
  color: var(--hot);
}

/* Reduced-motion friendly: transitions already 80ms linear, nothing to gate. */
`;

export { CSS as TicketCSS };

/*
 * Sub-primitives that commonly appear inside a ticket.
 * These are intentionally dumb, CSS-class-only wrappers — keep the
 * component graph flat. Tickets compose from rows and meta.
 */

export function TicketRow({
  children,
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`brut-ticket-row ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export function TicketMeta({
  children,
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`brut-ticket-meta ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

const ROW_CSS = `
.brut-ticket-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--rule);
}
.brut-ticket-row:last-child { border-bottom: 0; }

.brut-ticket-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.625rem;            /* 10px */
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-4);
  padding-top: 8px;
  border-top: 1px solid var(--rule);
  margin-top: 8px;
}
`;

export { ROW_CSS as TicketRowCSS };
