/**
 * SEKAI · BRUTALIST-RAW-LUXE
 * <PrintTicket> — the print-view renderer.
 *
 * The brutalist lane's claim is simple: the screen is an approximation of
 * a perfect printed ticket. So the print view is FIRST-CLASS, not an
 * afterthought. This file is the canonical layout for @media print AND for
 * the existing /recipes/print screen.
 *
 * It renders a single recipe as a print-perfect ticket: monospace, 12pt,
 * 4-cell stat row, ingredient table, numbered step list, mise-en-place
 * checkboxes, BOH ticket footer with a QR code linking back to the online
 * recipe.
 *
 * Used from: app/(app)/recipes/print/page.tsx.
 * Works offline, no external CSS, safe to embed in a print stylesheet.
 */

import type { Recipe } from '@/types/recipe';

type PrintTicketProps = {
  recipe: Recipe;
  /** Print multiplier — if user was scaled on the detail page, pass it through. */
  multiplier?: number;
  /** Unit system the user preferred at the time of export. */
  unitSystem?: 'metric' | 'imperial';
  /** Inline QR code (data URL). If absent, print the canonical URL as text. */
  qrDataUrl?: string;
  /** The app's deployed origin, for the print footer. */
  origin?: string;
};

export function PrintTicket({
  recipe,
  multiplier = 1,
  unitSystem = 'metric',
  qrDataUrl,
  origin = 'https://sekai.sakai.app',
}: PrintTicketProps) {
  const sortedSteps = [...recipe.steps].sort((a, b) => a.order - b.order);
  const totalMin = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);
  const now = new Date();
  const printedAt = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  return (
    <article className="pt">
      <style>{PRINT_CSS}</style>

      {/* Header — wayfinder-style */}
      <header className="pt-head">
        <div className="pt-code">SEKAI · REC-{recipe.id.slice(0, 4).toUpperCase()} · PRINT</div>
        <div className="pt-rule" />
        <h1 className="pt-title">{recipe.name}</h1>
        {recipe.description && <p className="pt-desc">{recipe.description}</p>}
        <div className="pt-meta">
          <span>PREP {fmtMin(recipe.prep_time)}</span>
          <span>COOK {fmtMin(recipe.cook_time)}</span>
          <span>TOTAL {fmtMin(totalMin)}</span>
          <span>SRV {String(Math.round(recipe.servings * multiplier)).padStart(2,'0')}</span>
          <span>MULT ×{multiplier.toFixed(2)}</span>
          <span>UNIT {unitSystem.toUpperCase()}</span>
        </div>
        <div className="pt-tags">
          {(recipe.tags ?? []).map(t => <span key={t} className="pt-tag">#{t.toUpperCase()}</span>)}
        </div>
      </header>

      {/* Ingredients table */}
      <section className="pt-section">
        <h2>[ INGREDIENTS · {String(recipe.ingredients.length).padStart(2,'0')} ]</h2>
        <table className="pt-ing">
          <thead><tr><th>CODE</th><th style={{textAlign:'right'}}>AMT</th><th>UNIT</th><th>NAME</th><th style={{width:'24px'}}>□</th></tr></thead>
          <tbody>
            {recipe.ingredients.map((ing, i) => (
              <tr key={i}>
                <td className="pt-ing-code">ING-{String(i+1).padStart(2,'0')}</td>
                <td className="pt-ing-amt">{fmtAmt((ing.amount ?? 0) * multiplier)}</td>
                <td className="pt-ing-unit">{(ing.unit ?? '').toUpperCase()}</td>
                <td className="pt-ing-name">{ing.name}</td>
                <td className="pt-ing-chk">□</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Steps */}
      <section className="pt-section pt-steps-section">
        <h2>[ STEPS · {String(sortedSteps.length).padStart(2,'0')} ]</h2>
        <ol className="pt-steps">
          {sortedSteps.map((step) => (
            <li key={step.order} className="pt-step">
              <span className="pt-step-idx">STP-{step.order}/{sortedSteps.length}</span>
              <div className="pt-step-body">
                {step.content}
                {step.timer_seconds != null && (
                  <div className="pt-step-timer">TIMER · {fmtSecs(step.timer_seconds)}</div>
                )}
              </div>
              <span className="pt-step-chk">□</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Notes */}
      {recipe.notes && (
        <section className="pt-section">
          <h2>[ NOTES ]</h2>
          <p className="pt-notes">{recipe.notes}</p>
        </section>
      )}

      {/* Footer — BOH ticket close */}
      <footer className="pt-footer">
        <div className="pt-footer-row">
          <span>SEKAI · REC-{recipe.id.slice(0, 4).toUpperCase()}</span>
          <span>PRINTED {printedAt}</span>
        </div>
        <div className="pt-footer-row pt-footer-url">
          {qrDataUrl
            ? <img src={qrDataUrl} alt="QR back to online recipe" width={64} height={64} />
            : <span>ONLINE · {origin}/recipes/{recipe.id}</span>}
          <span>— END OF TICKET —</span>
        </div>
      </footer>
    </article>
  );
}

function pad(n: number): string { return String(n).padStart(2, '0'); }

function fmtAmt(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 1)  return n.toFixed(2).replace(/\.?0+$/, '');
  if (n < 10) return n.toFixed(1).replace(/\.0$/, '');
  return String(Math.round(n));
}

function fmtMin(min: number | null | undefined): string {
  if (min == null || min <= 0) return '——:——';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${pad(h)}:${pad(m)}`;
}

function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${pad(m)}:${pad(sec)}`;
}

/* ── Print CSS ──────────────────────────────────────────────────────────── */

const PRINT_CSS = `
.pt {
  font-family: 'Berkeley Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace;
  font-size: 10pt;
  line-height: 1.5;
  color: #000;
  background: #fff;
  padding: 12mm 14mm;
  max-width: 190mm;
  margin: 0 auto;
  font-variant-numeric: tabular-nums;
}

.pt-head { border-bottom: 2px solid #000; padding-bottom: 6mm; margin-bottom: 6mm; }
.pt-code { font-size: 8pt; letter-spacing: 0.16em; text-transform: uppercase; color: #555; }
.pt-rule { height: 1px; background: #ccc; margin: 2mm 0 3mm; }
.pt-title { font-size: 20pt; letter-spacing: 0.01em; text-transform: uppercase; font-weight: 700; line-height: 1.15; margin: 0; }
.pt-desc { font-size: 10pt; color: #333; margin-top: 2mm; max-width: 140mm; }
.pt-meta { display: flex; flex-wrap: wrap; gap: 4mm 6mm; font-size: 8pt; letter-spacing: 0.14em; text-transform: uppercase; color: #555; margin-top: 4mm; }
.pt-meta span { white-space: nowrap; }
.pt-tags { display: flex; flex-wrap: wrap; gap: 2mm; margin-top: 3mm; }
.pt-tag { font-size: 7.5pt; letter-spacing: 0.12em; padding: 0.4mm 2mm; border: 0.3mm solid #bbb; }

.pt-section { margin-bottom: 6mm; break-inside: avoid; }
.pt-section h2 {
  font-size: 8pt; letter-spacing: 0.2em; text-transform: uppercase;
  color: #222; margin: 0 0 2.5mm;
  border-top: 1px solid #000; padding-top: 2mm;
}

.pt-ing { width: 100%; border-collapse: collapse; }
.pt-ing th, .pt-ing td {
  padding: 1.4mm 1.5mm; text-align: left;
  border-bottom: 0.3mm solid #ccc;
  font-size: 9.5pt;
}
.pt-ing th { font-size: 7.5pt; letter-spacing: 0.16em; color: #555; text-transform: uppercase; font-weight: 500; border-bottom: 0.6mm solid #000; }
.pt-ing-code { width: 18mm; color: #666; font-size: 8pt; letter-spacing: 0.1em; }
.pt-ing-amt  { width: 22mm; text-align: right; font-weight: 600; font-variant-numeric: tabular-nums; }
.pt-ing-unit { width: 14mm; color: #333; }
.pt-ing-name { }
.pt-ing-chk  { width: 8mm; text-align: center; color: #000; font-size: 13pt; }

.pt-steps { list-style: none; padding: 0; margin: 0; }
.pt-step {
  display: grid;
  grid-template-columns: 20mm 1fr 8mm;
  gap: 3mm;
  padding: 2.5mm 0;
  border-bottom: 0.3mm solid #ccc;
  break-inside: avoid;
}
.pt-step-idx { font-size: 8pt; letter-spacing: 0.16em; color: #555; text-transform: uppercase; padding-top: 0.5mm; }
.pt-step-body { font-size: 10pt; line-height: 1.55; }
.pt-step-timer { font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; color: #b4521f; margin-top: 1mm; }
.pt-step-chk  { text-align: center; font-size: 13pt; color: #000; }

.pt-notes { font-size: 9.5pt; line-height: 1.55; color: #222; white-space: pre-line; max-width: 140mm; }

.pt-footer {
  margin-top: 8mm; padding-top: 3mm;
  border-top: 0.6mm solid #000;
  font-size: 8pt; letter-spacing: 0.1em; text-transform: uppercase; color: #555;
}
.pt-footer-row { display: flex; justify-content: space-between; align-items: center; }
.pt-footer-url { margin-top: 3mm; }
.pt-footer-url img { border: 0.3mm solid #000; }

/* Multiple recipes per export: force page break between them. */
.pt + .pt { page-break-before: always; }

@page { size: A4; margin: 10mm; }

@media screen {
  /* Preview on-screen: center, simulate paper. */
  .pt {
    background: #fff;
    color: #000;
    margin: 16px auto;
    box-shadow: none;
    max-width: 210mm;
  }
}
`;
