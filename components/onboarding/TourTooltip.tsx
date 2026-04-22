'use client';

import { forwardRef } from 'react';
import { useT } from '@/components/ui/LanguageContext';

interface Props {
  title: string;
  body: string;
  step: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  isLast: boolean;
  canGoBack: boolean;
  targetRect: DOMRect | null;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

const TOOLTIP_WIDTH = 320;
const TOOLTIP_OFFSET = 16;

type CSSPos = {
  left: string;
  top: string;
  transform?: string;
};

function computePosition(rect: DOMRect | null, desired: Props['position']): CSSPos {
  if (!rect) {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
  }
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;

  if (desired === 'bottom') {
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(16, Math.min(left, vw - TOOLTIP_WIDTH - 16));
    const top = rect.bottom + TOOLTIP_OFFSET;
    if (top + 200 > vh) return computePosition(rect, 'top');
    return { left: `${left}px`, top: `${top}px` };
  }
  if (desired === 'top') {
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(16, Math.min(left, vw - TOOLTIP_WIDTH - 16));
    const top = rect.top - 200 - TOOLTIP_OFFSET;
    if (top < 16) {
      const below = rect.bottom + TOOLTIP_OFFSET;
      if (below + 200 <= vh) return { left: `${left}px`, top: `${below}px` };
      return { left: `${left}px`, top: '16px' };
    }
    return { left: `${left}px`, top: `${top}px` };
  }
  return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)' };
}

const TourTooltip = forwardRef<HTMLDivElement, Props>(function TourTooltip(
  { title, body, step, total, onNext, onBack, onSkip, isLast, canGoBack, targetRect, position },
  ref,
) {
  const t = useT();
  const pos = computePosition(targetRect, position);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-tooltip-title"
      className="fixed z-50 rounded-xl p-5 animate-scale-in"
      style={{
        width: `${TOOLTIP_WIDTH}px`,
        left: pos.left,
        top: pos.top,
        transform: pos.transform,
        background: 'var(--bg-card)',
        border: '1px solid color-mix(in oklch, var(--color-terracotta) 40%, transparent)',
        boxShadow: 'var(--shadow-dialog)',
      }}
      data-testid="onboarding-tour"
    >
      <p
        className="font-label text-xs tracking-widest uppercase mb-2"
        style={{ color: 'var(--color-terracotta)' }}
      >
        {t.tourStepCounter(step, total)}
      </p>
      <h2
        id="tour-tooltip-title"
        className="font-display text-xl font-semibold leading-tight mb-2"
        style={{ color: 'var(--text-1)' }}
      >
        {title}
      </h2>
      <p className="font-body text-base mb-5" style={{ color: 'var(--text-2)' }}>
        {body}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSkip}
          className="font-label text-xs tracking-wider uppercase mr-auto"
          style={{ color: 'var(--text-3)' }}
          data-testid="onboarding-skip"
        >
          {t.tourSkip}
        </button>
        {canGoBack && (
          <button
            type="button"
            onClick={onBack}
            className="btn-ghost"
            data-testid="onboarding-back"
          >
            {t.tourBack}
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="btn-primary"
          data-testid="onboarding-next"
        >
          {isLast ? t.tourFinish : t.tourNext}
        </button>
      </div>
    </div>
  );
});

export default TourTooltip;
