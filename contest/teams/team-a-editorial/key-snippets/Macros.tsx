/**
 * components/editorial/Macros.tsx
 *
 * A 4-column rule-lined ledger for energy / protein / carbs / fat.
 * Replaces the existing MacrosCard's boxed, gold-on-dark small
 * numerals which the audit flagged for contrast.
 *
 * Why it earns its place:
 *   - Rule-lined ledger is THE magazine pattern for "data without
 *     chart-junk."
 *   - FeatureSwap on every numeral → zero jitter when serving
 *     scale or ingredient swap changes the totals.
 *   - 32px display figures, italic unit suffix — legibility under
 *     kitchen pressure.
 *
 * Preserves the existing @property-driven macros-bar morph as a
 * hairline beneath the ledger, so the light/dark theme pass stays
 * compatible with existing motion tests.
 */
'use client';
import { FeatureSwap } from './FeatureSwap';

export interface MacrosLedgerProps {
  kcal: number;
  protein: number;    // grams
  carbs: number;      // grams
  fat: number;        // grams
  /**
   * Optional — when true, renders "approx." prefix. Used by
   * MacrosCard's partial-match state.
   */
  approx?: boolean;
}

export function MacrosLedger({
  kcal,
  protein,
  carbs,
  fat,
  approx = false,
}: MacrosLedgerProps) {
  // Proportions for the existing @property macros-bar.
  // Total counted only from P/C/F in grams × 4/4/9 kcal to match
  // existing bar logic in MacrosCard.
  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;
  const sum = Math.max(1, pKcal + cKcal + fKcal);
  const pPct = (pKcal / sum) * 100;
  const cPct = (cKcal / sum) * 100;

  return (
    <section
      className="
        mt-[var(--r-7)] pt-[var(--r-4)]
        border-t border-[color:var(--border)]
      "
      aria-label={`Macros${approx ? ' — approximate' : ''}, per serving`}
    >
      {approx && (
        <div className="kicker mb-[var(--r-2)]">approx. — per serving</div>
      )}
      {!approx && (
        <div className="kicker mb-[var(--r-2)]">Macros · Per Serving</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-[var(--r-6)] gap-y-[var(--r-3)]">
        <MacroCell label="Energy"   value={kcal}    unit="kcal" first />
        <MacroCell label="Protein"  value={protein} unit="g"    />
        <MacroCell label="Carbs"    value={carbs}   unit="g"    />
        <MacroCell label="Fat"      value={fat}     unit="g"    />
      </div>

      {/* Preserved @property-driven macros-bar: now a hairline,
          not a bar. Uses the same --macro-protein-pct / --macro-carb-pct
          vars as MacrosCard, so the existing unit-tested interpolation
          is untouched. */}
      <div
        className="macros-bar mt-[var(--r-3)]"
        style={{
          height: '1px',
          // @ts-expect-error — custom properties
          '--macro-protein-pct': `${pPct}%`,
          '--macro-carb-pct':    `${cPct}%`,
        }}
        role="img"
        aria-label={`Protein ${Math.round(pPct)}%, carbs ${Math.round(cPct)}%, fat ${Math.round(100 - pPct - cPct)}%`}
      />
    </section>
  );
}

function MacroCell({
  label,
  value,
  unit,
  first = false,
}: {
  label: string;
  value: number;
  unit: string;
  first?: boolean;
}) {
  return (
    <div
      className={
        first
          ? 'pl-0'
          : 'border-l border-[color:var(--border)] pl-[var(--r-3)]'
      }
    >
      <div
        className="
          font-[family-name:var(--font-barlow)]
          text-[11px] uppercase tracking-[0.22em]
          text-[color:var(--text-2)]
          mb-[2px]
        "
      >
        {label}
      </div>
      <div
        className="
          font-[family-name:var(--font-cormorant)]
          text-[32px] leading-[1.2] font-medium
          [tracking:-0.02em] tabular
          text-[color:var(--text-1)]
        "
      >
        <FeatureSwap value={value} minCh={3}>
          {value}
        </FeatureSwap>
        <span
          className="
            italic font-normal text-[18px] ml-[4px]
            text-[color:var(--text-2)]
          "
        >
          {unit}
        </span>
      </div>
    </div>
  );
}
