'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TOUR_STEPS } from './TourSteps';
import Spotlight from './Spotlight';
import TourTooltip from './TourTooltip';
import { useT } from '@/components/ui/LanguageContext';
import { markTourCompleted, dismissTour } from '@/app/actions/preferences';

interface OnboardingTourProps {
  onClose: () => void;
}

export function OnboardingTour({ onClose }: OnboardingTourProps) {
  const t = useT();
  const [stepIdx, setStepIdx] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const current = TOUR_STEPS[stepIdx];
  const isLast = stepIdx === TOUR_STEPS.length - 1;
  const canGoBack = stepIdx > 0;

  const next = useCallback(async () => {
    if (stepIdx >= TOUR_STEPS.length - 1) {
      await markTourCompleted();
      onCloseRef.current();
      return;
    }
    setStepIdx(i => i + 1);
  }, [stepIdx]);

  const back = useCallback(() => {
    if (stepIdx > 0) setStepIdx(i => i - 1);
  }, [stepIdx]);

  const skip = useCallback(async () => {
    await dismissTour(30);
    onCloseRef.current();
  }, []);

  // Measure target — retry up to ~3s if not yet in DOM; skip step if not found.
  useEffect(() => {
    if (!current) return;
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
      const el = findVisibleTarget(current.targetSelector);
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
        // Target not found — skip to next step (or finish).
        if (stepIdx >= TOUR_STEPS.length - 1) {
          void markTourCompleted().then(() => onCloseRef.current());
        } else {
          setStepIdx(i => i + 1);
        }
      }
    }
    measure();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx]);

  // Re-measure on resize / scroll
  useEffect(() => {
    function remeasure() {
      const sel = TOUR_STEPS[stepIdx]?.targetSelector;
      if (!sel) return;
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
  }, [stepIdx]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        void skip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        void next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        back();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, back, skip]);

  if (!current) return null;

  const title = (t as unknown as Record<string, string>)[current.titleKey] ?? current.id;
  const body = (t as unknown as Record<string, string>)[current.bodyKey] ?? '';

  return (
    <>
      <Spotlight targetRect={targetRect} />
      <TourTooltip
        ref={tooltipRef}
        title={title}
        body={body}
        step={stepIdx + 1}
        total={TOUR_STEPS.length}
        onNext={() => void next()}
        onBack={back}
        onSkip={() => void skip()}
        isLast={isLast}
        canGoBack={canGoBack}
        targetRect={targetRect}
        position={current.position ?? 'bottom'}
      />
    </>
  );
}

/**
 * Gate: reads ?tour=1 from the URL, mounts <OnboardingTour /> if present,
 * strips the param on close so the tour doesn't re-trigger on reload.
 */
export default function OnboardingTourGate() {
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
  return <OnboardingTour onClose={handleClose} />;
}
