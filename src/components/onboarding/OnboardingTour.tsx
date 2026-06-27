'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TOUR_STEPS, type SpotlightStep } from './TourSteps';
import Spotlight from './Spotlight';
import TourTooltip from './TourTooltip';
import { OnboardingWizardStep } from './OnboardingWizardStep';
import { useT } from '@/components/ui/LanguageContext';
import { markTourCompleted, dismissTour } from '@/app/actions/preferences';
import type { PreferredUnits } from '@/types/preferences';

interface InitialPrefs {
  preferred_theme: string | null;
  preferred_font_size: string | null;
  preferred_language: string | null;
  preferred_units: PreferredUnits | null;
}

interface OnboardingTourProps {
  onClose: () => void;
  initialPrefs: InitialPrefs;
}

export function OnboardingTour({ onClose, initialPrefs }: OnboardingTourProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const current = TOUR_STEPS[stepIdx];

  const advance = useCallback(async () => {
    if (stepIdx >= TOUR_STEPS.length - 1) {
      await markTourCompleted();
      onCloseRef.current();
      return;
    }
    setStepIdx((i) => i + 1);
  }, [stepIdx]);

  if (!current) return null;

  if (current.kind === 'wizard') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.6)' }}
        data-testid="onboarding-wizard-backdrop"
      >
        <OnboardingWizardStep
          initialPrefs={initialPrefs}
          onComplete={() => { void advance(); }}
        />
      </div>
    );
  }

  return (
    <SpotlightTour
      step={current}
      stepIdx={stepIdx}
      onNext={() => { void advance(); }}
      onBack={() => setStepIdx((i) => Math.max(0, i - 1))}
      onFinish={async () => {
        await markTourCompleted();
        onCloseRef.current();
      }}
      onSkip={async () => {
        await dismissTour(30);
        onCloseRef.current();
      }}
    />
  );
}

interface SpotlightTourProps {
  step: SpotlightStep;
  stepIdx: number;
  onNext: () => void;
  onBack: () => void;
  onFinish: () => void | Promise<void>;
  onSkip: () => void | Promise<void>;
}

function SpotlightTour({ step, stepIdx, onNext, onBack, onFinish, onSkip }: SpotlightTourProps) {
  const t = useT();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const isLast = stepIdx === TOUR_STEPS.length - 1;
  const canGoBack = stepIdx > 1; // Can't go back before the wizard.

  // Measure target — retry up to ~3s if not yet in DOM; skip step if not found.
  useEffect(() => {
    let cancelled = false;
    let attempts = 0;

    // Selectors may use a comma-separated OR (e.g. desktop-btn, mobile-btn).
    // querySelector returns the first DOM match regardless of visibility — on
    // the wrong viewport that element is display:none with a zero-sized rect,
    // which drags the spotlight to (0,0). Walk all candidates and pick the
    // first VISIBLE one (offsetParent present + non-zero rect).
    function findVisibleTarget(selector: string): HTMLElement | null {
      const candidates = document.querySelectorAll<HTMLElement>(selector);
      for (const el of candidates) {
        if (el.offsetParent === null) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return el;
      }
      return null;
    }

    function measure() {
      if (cancelled) return;
      const el = findVisibleTarget(step.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect);
        if (rect.top < 0 || rect.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            if (!cancelled) setTargetRect(el.getBoundingClientRect());
          }, 300);
        }
        return;
      }
      attempts += 1;
      if (attempts < 30) {
        setTimeout(measure, 100);
      } else if (!cancelled) {
        // Target not found — advance / finish.
        if (isLast) {
          void onFinish();
        } else {
          onNext();
        }
      }
    }
    measure();
    return () => {
      cancelled = true;
    };
  }, [step, isLast, onFinish, onNext]);

  // Re-measure on resize / scroll
  useEffect(() => {
    function remeasure() {
      const sel = step.targetSelector;
      // Same visibility filter as measure() — hidden viewport-siblings would
      // otherwise drag the spotlight to the corner.
      const candidates = document.querySelectorAll<HTMLElement>(sel);
      for (const el of candidates) {
        if (el.offsetParent === null) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          setTargetRect(r);
          return;
        }
      }
    }
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    return () => {
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
    };
  }, [step]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        void onSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        onNext();
      } else if (e.key === 'ArrowLeft' && canGoBack) {
        e.preventDefault();
        onBack();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext, onBack, onSkip, canGoBack]);

  const title = (t as unknown as Record<string, string>)[step.titleKey] ?? step.id;
  const body = (t as unknown as Record<string, string>)[step.bodyKey] ?? '';

  return (
    <>
      <Spotlight targetRect={targetRect} />
      <TourTooltip
        ref={tooltipRef}
        title={title}
        body={body}
        step={stepIdx}
        total={TOUR_STEPS.length - 1}
        onNext={onNext}
        onBack={onBack}
        onSkip={() => void onSkip()}
        isLast={isLast}
        canGoBack={canGoBack}
        targetRect={targetRect}
        position={step.position ?? 'bottom'}
      />
    </>
  );
}

/**
 * Gate: reads ?tour=1 from the URL, mounts <OnboardingTour /> if present,
 * strips the param on close so the tour doesn't re-trigger on reload.
 */
export default function OnboardingTourGate({ initialPrefs }: { initialPrefs: InitialPrefs }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = searchParams.get('tour') === '1';
  // Small hydration delay so list content can render before we try to measure targets.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!active) {
      setReady(false);
      return;
    }
    const handle = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(handle);
  }, [active]);

  const handleClose = useCallback(() => {
    // Strip ?tour=1 without a server round-trip.
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete('tour');
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, searchParams]);

  if (!active || !ready) return null;
  return <OnboardingTour onClose={handleClose} initialPrefs={initialPrefs} />;
}
