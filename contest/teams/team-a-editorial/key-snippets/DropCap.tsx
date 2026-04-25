/**
 * components/editorial/DropCap.tsx
 *
 * Renders a real 3-line dropped capital on the first letter of
 * a paragraph — terracotta, Cormorant 500, no fake inline sizing.
 *
 * Why it earns its place:
 *   - Dropped caps are THE editorial signature. Without a real
 *     dropcap, the page reads like a blog post.
 *   - Screen readers read the full word; the visual split is
 *     `aria-hidden` on the split letter.
 *   - Handles smart-quote openers ("-prefixed paragraphs) by
 *     skipping quotation marks and dropping the first *letter*.
 *
 * CSS lives in tokens-editorial.css (.dropcap selector).
 */
import { ReactNode } from 'react';
import clsx from 'clsx';

interface DropCapProps {
  children: string;
  /**
   * Override the drop colour. Defaults to terracotta via CSS.
   * Accepts any CSS value, including a token reference.
   */
  color?: string;
  /**
   * Semantic element. Steps use <p>, ingredients use <span>.
   */
  as?: 'p' | 'span' | 'div';
  className?: string;
}

/** Match the first readable letter after opening punctuation. */
function splitFirstLetter(text: string): [opener: string, first: string, rest: string] {
  // Skip common opening punctuation and whitespace.
  const re = /^(["«“‘'(\s]*)([A-Za-zÀ-ɏ])(.*)/s;
  const m = text.match(re);
  if (!m) return ['', text.charAt(0) || '', text.slice(1)];
  return [m[1], m[2], m[3]];
}

export function DropCap({ children, color, as = 'p', className }: DropCapProps) {
  const [opener, first, rest] = splitFirstLetter(children);
  const Tag = as;

  if (!first) {
    // Nothing to drop — render plainly.
    return <Tag className={className}>{children}</Tag>;
  }

  return (
    <Tag className={clsx('dropcap-host', className)}>
      {opener && <span>{opener}</span>}
      <span
        className="dropcap"
        aria-hidden="true"
        style={color ? { color } : undefined}
      >
        {first}
      </span>
      {/* Screen-reader gets the full word intact — the dropcap
          copy is visual only. */}
      <span className="sr-only">{first}</span>
      <span>{rest}</span>
    </Tag>
  );
}
