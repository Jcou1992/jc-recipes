/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <ServiceTicket> — the recipe list card, rendered as a literal BOH service
 * ticket. No photo. No gradient. No shadow. A framed ticket with reference
 * codes, tag chips, a 4-cell stat row, and a "last cooked" footer.
 *
 * This is killer moment #1 (LIST-AS-SERVICE-TICKET) from design-spec §5.1.
 *
 * On hover: the top border flips from 1px --rule to 2px --hot. The whole
 * card's padding adjusts by 1px to absorb the border-width change so content
 * doesn't nudge.
 *
 * On click: the border animates to --medal for 80ms linear, then navigates.
 * That's the one visual event. (Kept cheap: border-color animations are
 * cheap and don't paint the inside of the box.)
 *
 * Sacred-feature contract: this component replaces RecipeCard. Preserve
 * these data-testid attributes:
 *   - data-testid="recipe-card" (the article wrapper)
 *   - data-testid={`recipe-card-link-${id}`} (the internal link)
 *   - data-testid={`recipe-select-checkbox-${id}`} (checkbox when selectMode)
 */

'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import type { Recipe } from '@/types/recipe';
import { shortHash } from '@/lib/brut/ref-codes';
import { TabularNumeral } from './TabularNumeral';

type ServiceTicketProps = {
  recipe: Recipe;
  featured?: boolean;             // first card in list, 2× width
  selectMode?: boolean;
  selected?: boolean;
  onToggle?: (shift: boolean) => void;
  isSearchMatch?: boolean;
};

export function ServiceTicket({
  recipe,
  featured = false,
  selectMode = false,
  selected = false,
  onToggle,
  isSearchMatch = false,
}: ServiceTicketProps) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const [pressed, setPressed] = useState(false);

  const code = `REC-${shortHash(recipe.id)} · FIG.03`;
  const ingCount = recipe.ingredients.length;
  const stpCount = recipe.steps.length;
  const srvCount = recipe.servings;
  const totalMin = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
  const totalFmt = fmtDuration(totalMin);
  const ago = fmtAgo(recipe.created_at);

  const inner = (
    <>
      <div className="st-meta-top">
        <div className="st-chips">
          {(recipe.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="st-chip">#{t.toUpperCase()}</span>
          ))}
        </div>
        <span>{ago} · VER-{String(recipe.version ?? 1).padStart(2, '0')}</span>
      </div>
      <h3 className={`st-title ${isSearchMatch ? 'st-title--match' : ''}`.trim()}>
        {recipe.name}
      </h3>
      {recipe.description && (
        <p className="st-desc">{recipe.description}</p>
      )}
      <div className="st-stats">
        <span><span className="st-lbl">ING</span><TabularNumeral value={ingCount} pad={2} className="st-num" /></span>
        <span><span className="st-lbl">STP</span><TabularNumeral value={stpCount} pad={2} className="st-num" /></span>
        <span><span className="st-lbl">SRV</span><TabularNumeral value={srvCount} pad={2} className="st-num" /></span>
        <span><span className="st-lbl">TOTAL</span><span className="st-num">{totalFmt}</span></span>
      </div>
      <div className="st-footer">
        <span>COOKED {String(recipe.cooked_count ?? 0).padStart(2, '0')} TIMES</span>
        <span>LAST {recipe.last_cooked_at ? fmtDate(recipe.last_cooked_at) : '———'}</span>
      </div>
    </>
  );

  if (selectMode) {
    return (
      <article
        data-testid="recipe-card"
        className={`st ${featured ? 'st--featured' : ''}`.trim()}
        data-code={code.toUpperCase()}
        data-selected={selected ? '1' : '0'}
        onClick={(e) => onToggle?.(e.shiftKey)}
      >
        <span className="st-checkbox" data-testid={`recipe-select-checkbox-${recipe.id}`} aria-checked={selected} role="checkbox">
          {selected ? '✓' : ''}
        </span>
        {inner}
      </article>
    );
  }

  return (
    <Link
      ref={ref}
      href={`/recipes/${recipe.id}`}
      data-testid={`recipe-card-link-${recipe.id}`}
      className={`st st-link ${featured ? 'st--featured' : ''} ${pressed ? 'st--pressed' : ''}`.trim()}
      data-code={code.toUpperCase()}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
    >
      {inner}
    </Link>
  );
}

/* ── Formatters ─────────────────────────────────────────────────────────── */

function fmtDuration(min: number): string {
  if (min <= 0) return '——:——';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function fmtAgo(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1)  return 'JUST NOW';
  if (h < 24) return `${String(h).padStart(2, '0')}h AGO`;
  const days = Math.floor(h / 24);
  if (days < 7)  return `${String(days).padStart(2, '0')}d AGO`;
  if (days < 30) return `${String(Math.floor(days / 7)).padStart(2, '0')}w AGO`;
  return fmtDate(iso);
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/* ── Co-located CSS ─────────────────────────────────────────────────────── */

export const ServiceTicketCSS = `
.st {
  grid-column: span 4;
  display: flex;
  flex-direction: column;
  min-height: 192px;
  position: relative;
  border: 1px solid var(--rule);
  background: var(--surface);
  padding: 24px 16px 16px;
  color: var(--text-1);
  text-decoration: none;
  transition: border-color 80ms linear, border-width 0ms;
  cursor: pointer;
}
.st::before {
  content: attr(data-code);
  position: absolute;
  top: -7px; left: 12px;
  padding: 0 4px;
  background: var(--bg);
  font-family: var(--font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text-3);
}
.st--featured { grid-column: span 8; min-height: 192px; }
@media (max-width: 1023px) {
  .st { grid-column: span 4; }
  .st--featured { grid-column: span 8; }
}
@media (max-width: 639px) {
  .st, .st--featured { grid-column: span 6; }
}

/* Hover — the ticket fires. */
@media (hover: hover) and (pointer: fine) {
  .st:hover {
    border-color: var(--hot);
    border-width: 2px;
    padding: 23px 15px 15px;   /* absorb the 1px */
  }
  .st:hover::before { color: var(--hot); }
}

.st--pressed {
  border-color: var(--medal) !important;
  border-width: 2px !important;
  padding: 23px 15px 15px !important;
}
.st--pressed::before { color: var(--medal) !important; }

/* Selection mode — invert the card. */
.st[data-selected="1"] {
  border-color: var(--text-1);
  border-width: 2px;
  padding: 23px 15px 15px;
  background: var(--surface-raised);
}

.st-checkbox {
  position: absolute;
  top: 12px; right: 12px;
  width: 20px; height: 20px;
  border: 1px solid var(--rule-strong);
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 0.75rem;
  color: var(--text-1);
  background: var(--bg);
}
.st[data-selected="1"] .st-checkbox {
  background: var(--text-1); color: var(--bg); border-color: var(--text-1);
}

.st-meta-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 16px;
}
.st-chips { display: flex; gap: 8px; flex-wrap: wrap; }
.st-chip {
  padding: 2px 8px;
  border: 1px solid var(--rule);
  color: var(--text-3);
}

.st-title {
  font-family: var(--font-mono);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  line-height: 1.2;
  color: var(--text-1);
  margin-bottom: 8px;
  text-transform: uppercase;
}
.st-title--match { box-shadow: inset 0 -2px 0 var(--medal); padding-bottom: 2px; }

.st-desc {
  font-size: 0.75rem;
  line-height: 1.55;
  color: var(--text-2);
  margin-bottom: 16px;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.st-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  border-top: 1px solid var(--rule);
  padding-top: 8px;
}
.st-stats > span { display: flex; flex-direction: column; gap: 2px; }
.st-stats .st-lbl { color: var(--text-3); }
.st-stats .st-num {
  color: var(--text-1);
  font-size: 0.875rem;
  letter-spacing: 0;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.st-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 0.625rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-4);
}

@media (prefers-reduced-motion: reduce) {
  .st { transition: none; }
}
`;
