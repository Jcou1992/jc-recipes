'use client';

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useT } from '@/components/ui/LanguageContext';
import { haptic } from '@/lib/motion/haptic';
import { Wayfinder } from '@/components/ui/brut/Wayfinder';
import { fmtRec } from '@/lib/brut/ref-codes';
import { recordCooked } from '@/app/actions/recipes';
import type { Recipe, Step } from '@/types/recipe';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimerState {
  remaining: number; // seconds
  running: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function playBeeps(ctx: AudioContext) {
  const now = ctx.currentTime;
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 440;
    osc.type = 'sine';
    const t = now + i * 0.4;
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t);
    osc.stop(t + 0.3);
  }
}

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

const FRACTIONS: Array<[number, string]> = [
  [1 / 8, '⅛'], [1 / 4, '¼'], [1 / 3, '⅓'], [3 / 8, '⅜'],
  [1 / 2, '½'], [5 / 8, '⅝'], [2 / 3, '⅔'], [3 / 4, '¾'], [7 / 8, '⅞'],
];

function formatAmount(n: number): string {
  if (n <= 0) return '0';
  if (n > 10) return String(Math.round(n * 10) / 10);
  const whole = Math.floor(n);
  const frac = n - whole;
  if (frac < 0.05) return whole === 0 ? '0' : String(whole);
  for (const [val, sym] of FRACTIONS) {
    if (Math.abs(frac - val) < 0.05) return whole === 0 ? sym : `${whole}${sym}`;
  }
  return String(Math.round(n * 100) / 100);
}

const METRIC_TO_IMPERIAL: Record<string, { factor: number; toUnit: string }> = {
  g:  { factor: 1 / 28.3495, toUnit: 'oz'   },
  kg: { factor: 2.20462,     toUnit: 'lb'    },
  mg: { factor: 1 / 28349.5, toUnit: 'oz'    },
  ml: { factor: 1 / 29.5735, toUnit: 'fl oz' },
  l:  { factor: 4.22675,     toUnit: 'cups'  },
  dl: { factor: 3.38140,     toUnit: 'fl oz' },
};

const IMPERIAL_TO_METRIC: Record<string, { factor: number; toUnit: string }> = {
  oz:     { factor: 28.3495,        toUnit: 'g'  },
  lb:     { factor: 1 / 2.20462,    toUnit: 'kg' },
  'fl oz':{ factor: 29.5735,        toUnit: 'ml' },
  cup:    { factor: 236.588,        toUnit: 'ml' },
  cups:   { factor: 236.588,        toUnit: 'ml' },
};

function convertUnit(amount: number, unit: string | null, targetSystem: string) {
  if (!unit) return { amount, unit };
  const u = unit.trim().toLowerCase();
  if (targetSystem === 'imperial') {
    const c = METRIC_TO_IMPERIAL[u];
    if (c) return { amount: amount * c.factor, unit: c.toUnit };
  } else {
    const c = IMPERIAL_TO_METRIC[u];
    if (c) return { amount: amount * c.factor, unit: c.toUnit };
  }
  return { amount, unit };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  recipe: Recipe;
  initialServings: number;
  unitSystem: string;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export default function CookMode({ recipe, initialServings, unitSystem }: Props) {
  const t = useT();
  const sortedSteps: Step[] = [...recipe.steps].sort((a, b) => a.order - b.order);
  const totalSteps = sortedSteps.length;
  const multiplier = initialServings / recipe.servings;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [timers, setTimers] = useState<Map<number, TimerState>>(() => {
    const m = new Map<number, TimerState>();
    sortedSteps.forEach((step, i) => {
      if (step.timer_seconds != null) {
        m.set(i, { remaining: step.timer_seconds, running: false });
      }
    });
    return m;
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [rippleIdx, setRippleIdx] = useState<number | null>(null);
  const [rippleTick, setRippleTick] = useState(0);
  //TODO work more on Brut Mode
  // Brut mode detection — gates the per-route Wayfinder + hides the local
  // header strip via a stable `data-cook-local-header` attribute. Reads
  // `data-design` on `<html>` at mount; matches the pattern Wayfinder uses,
  // so a design-mode flip already triggers a router refresh that remounts us.
  const [isBrut, setIsBrut] = useState(false);
  // Live elapsed seconds for the brut Wayfinder telemetry slot. Ticks only
  // when brut is active to keep classic mode pixel- and re-render-identical.
  const [liveElapsed, setLiveElapsed] = useState(0);

  function triggerIngredientCheck(i: number) {
    setCheckedIngredients(prev => {
      const next = new Set(prev);
      const checking = !next.has(i);
      if (checking) {
        next.add(i);
        haptic(10);
        setRippleIdx(i);
        setRippleTick(t => t + 1);
      } else {
        next.delete(i);
      }
      return next;
    });
  }

  function onIngredientCheckKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    triggerIngredientCheck(i);
  }

  useEffect(() => {
    if (rippleIdx === null) return;
    const id = setTimeout(() => setRippleIdx(null), 360);
    return () => clearTimeout(id);
  }, [rippleIdx, rippleTick]);
  const touchStartX = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const cookStartRef = useRef<number>(Date.now());

  // Detect brut design mode (client-only — matches <Wayfinder> behavior)
  useEffect(() => {
    setIsBrut(document.documentElement.getAttribute('data-design') === 'brut');
  }, []);

  // Live elapsed clock for the brut Wayfinder. Only runs in brut mode and
  // pauses on the completion screen (where `elapsedSeconds` already snapshots
  // the final time).
  useEffect(() => {
    if (!isBrut || finished) return;
    const id = setInterval(() => {
      setLiveElapsed(Math.round((Date.now() - cookStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [isBrut, finished]);

  // Wake lock
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;
    (async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch {}
    })();
    return () => { wakeLock?.release().catch(() => {}); };
  }, []);

  // Timer tick
  useEffect(() => {
    const id = setInterval(() => {
      setTimers(prev => {
        const next = new Map(prev);
        let changed = false;
        for (const [idx, ts] of next) {
          if (ts.running && ts.remaining > 0) {
            next.set(idx, { ...ts, remaining: ts.remaining - 1 });
            changed = true;
            if (ts.remaining - 1 === 0) {
              try { navigator.vibrate?.([200, 100, 200]); } catch {}
              const ctx = audioCtxRef.current;
              if (ctx) playBeeps(ctx);
            }
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // AudioContext cleanup
  useEffect(() => {
    return () => {
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  function goTo(i: number) {
    if (i < 0) return;
    if (i >= totalSteps) {
      // Advancing past the last step — show completion screen
      setCompletedSteps(prev => new Set([...prev, currentIndex]));
      setElapsedSeconds(Math.round((Date.now() - cookStartRef.current) / 1000));
      setFinished(true);
      haptic([40, 40, 40]);
      // Fire-and-forget: stamp `cooked_at = NOW()` and bump `cooked_count`
      // for brut heat-decay rendering (R6.B). Never awaited — completion
      // UI must paint instantly even if the network is slow or offline.
      // RLS misses + network errors are swallowed by the catch.
      recordCooked(recipe.id).catch((e) => console.warn('recordCooked failed', e));
      return;
    }
    setCompletedSteps(prev => new Set([...prev, currentIndex]));
    setCurrentIndex(i);
    haptic(8);
  }

  function startAgain() {
    setFinished(false);
    setCurrentIndex(0);
    setCompletedSteps(new Set());
    setCheckedIngredients(new Set());
    // Reset all timers to original values
    setTimers(() => {
      const m = new Map<number, TimerState>();
      sortedSteps.forEach((step, i) => {
        if (step.timer_seconds != null) {
          m.set(i, { remaining: step.timer_seconds, running: false });
        }
      });
      return m;
    });
    cookStartRef.current = Date.now();
  }

  function toggleTimer(stepIdx: number) {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      try { audioCtxRef.current = new AudioContext(); } catch {}
    }
    // iOS: resume on every user gesture in case it auto-suspended
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    setTimers(prev => {
      const t = prev.get(stepIdx);
      if (!t || t.remaining === 0) return prev;
      const next = new Map(prev);
      next.set(stepIdx, { ...t, running: !t.running });
      return next;
    });
  }

  function resetTimer(stepIdx: number) {
    setTimers(prev => {
      const next = new Map(prev);
      const original = sortedSteps[stepIdx].timer_seconds ?? 0;
      next.set(stepIdx, { remaining: original, running: false });
      return next;
    });
  }

  // Swipe handlers
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 60) {
      if (dx < 0) goTo(currentIndex + 1);
      else goTo(currentIndex - 1);
    }
  }

  const currentStep = sortedSteps[currentIndex];
  const currentTimer = timers.get(currentIndex);

  // Displayed ingredients (scaled + converted)
  const displayedIngredients = recipe.ingredients.map(ing => {
    const scaled = ing.amount * multiplier;
    const { amount: converted, unit } = convertUnit(scaled, ing.unit, unitSystem);
    return { ...ing, displayAmount: formatAmount(converted), displayUnit: unit };
  });

  // Brut Wayfinder telemetry — mounted only when isBrut and the cook flow is
  // still active. On the completion screen (which is z-30 absolute and owns
  // its own ✕ exit) we suppress the bar so its z-50 sticky doesn't overlay
  // the completion chrome. Pre-formatted so the JSX stays terse and we never
  // call this work in classic mode.
  // Cycle 2 P1: the local EXIT button is CSS-hidden under brut (cook
  // local-header kill rule). Surface a tappable EXIT inside the kicker so
  // chefs with wet hands have a discoverable bail-out — the wayfinder crumb
  // alone wasn't read as a link in usability tests.
  const wayfinderProps = isBrut && !finished
    ? {
        crumb: `SEKAI · ${fmtRec(recipe.id)} · COOK`,
        modeLabel: `STEP ${currentIndex + 1}/${totalSteps}`,
        statusRight: `T+${formatSeconds(liveElapsed)}`,
        userLabel: '',
        hot: true,
        // Single-key kicker — cook navigates by space/arrows, but the user
        // still needs a visible way out. The exitHref prop renders a
        // tappable [ESC] ← EXIT link as the first item in the kicker row.
        kicker: ['ESC:EXIT'] as ReadonlyArray<string>,
        exitHref: `/recipes/${recipe.id}`,
      }
    : null;

  return (
    <div
      role="region"
      aria-label={`${recipe.name} — cooking mode`}
      className="fixed inset-0 z-20 flex flex-col animate-scale-in"
      style={{
        background: 'var(--bg)',
        color: 'var(--text-1)',
        paddingTop: 'env(safe-area-inset-top, 0)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)',
        paddingLeft: 'env(safe-area-inset-left, 0)',
        paddingRight: 'env(safe-area-inset-right, 0)',
      }}
      data-testid="cook-mode"
    >
      {/* Brut-only per-route Wayfinder. Replaces the global one (suppressed
          on /cook by RouteAwareWayfinder) with cook-specific telemetry:
          recipe code, current STEP n/N, T+elapsed (terracotta via `hot`).
          In classic mode wayfinderProps is null, so this whole node is gone
          and the layout is pixel-identical to before. */}
      {wayfinderProps && <Wayfinder {...wayfinderProps} />}

      {/* Completion screen */}
      {finished && (
        <div
          className="absolute inset-0 z-30 flex flex-col items-center justify-center px-8 animate-scale-in"
          style={{ background: 'var(--bg)' }}
          data-testid="cook-completion-screen"
        >
          {/* Close / exit button (top-right, same as existing pattern) */}
          <Link
            href={`/recipes/${recipe.id}`}
            className="absolute top-4 right-5 font-label text-xs tracking-widest uppercase transition-colors"
            style={{ color: 'var(--text-3)' }}
            aria-label={t.cookExitBtn}
          >
            ✕
          </Link>

          {/* Content block */}
          <div className="dialog-panel flex flex-col gap-10">
            {/* Completion message */}
            <div className="flex flex-col gap-3">
              <p
                className="font-body text-sm"
                style={{ color: 'var(--color-terracotta)' }}
              >
                {t.cookDoneBanner}
              </p>
              <h1
                className="recipe-title font-display relative overflow-hidden"
                style={{ fontSize: '2.5rem', fontWeight: 500, lineHeight: 1.2, color: 'var(--text-1)' }}
                data-testid="cook-completion-title"
              >
                {recipe.name}
                <span key="cook-complete-sweep" className="gold-sweep" aria-hidden="true" />
              </h1>
              <p
                className="font-label text-sm tracking-wide"
                style={{ color: 'var(--text-3)' }}
                data-testid="cook-completion-elapsed"
              >
                {t.cookInKitchen(elapsedSeconds > 0 ? formatElapsed(elapsedSeconds) : '< 1s')}
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: 'var(--border)' }} />

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              {/* Primary: return to recipe */}
              <Link
                href={`/recipes/${recipe.id}`}
                className="font-label text-sm tracking-widest uppercase text-center py-4 px-6 transition-colors"
                style={{
                  background: 'var(--color-terracotta-contrast)',
                  color: 'var(--color-bone)',
                  letterSpacing: '0.12em',
                }}
                data-testid="cook-completion-return"
              >
                {t.cookBackToRecipe}
              </Link>

              {/* Secondary: print */}
              <Link
                href={`/recipes/print?ids=${recipe.id}`}
                className="font-label text-sm tracking-widest uppercase py-4 px-6 text-center transition-colors border"
                style={{
                  background: 'transparent',
                  color: 'var(--text-2)',
                  borderColor: 'var(--border)',
                  letterSpacing: '0.12em',
                }}
                data-testid="cook-completion-print"
              >
                {t.cookPrintRecipe}
              </Link>

              {/* Tertiary: start again */}
              <button
                onClick={startAgain}
                className="font-label text-sm tracking-widest uppercase py-4 px-6 transition-colors border"
                style={{
                  background: 'transparent',
                  color: 'var(--text-2)',
                  borderColor: 'var(--border)',
                  letterSpacing: '0.12em',
                }}
                data-testid="cook-completion-restart"
              >
                {t.cookStartAgain}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active timer pills */}
      {[...timers.entries()].filter(([, ts]) => ts.running || ts.remaining === 0).length > 0 && (
        <div className="absolute top-14 right-3 z-20 flex flex-col gap-1.5">
          {[...timers.entries()]
            .filter(([, ts]) => ts.running || ts.remaining === 0)
            .map(([idx, ts]) => (
              <button
                key={idx}
                onClick={() => ts.remaining === 0 ? resetTimer(idx) : toggleTimer(idx)}
                className={`font-label text-xs tracking-wider px-3 py-1.5 rounded-full transition-all ${
                  ts.remaining === 0 ? 'animate-pulse' : ''
                }`}
                style={{
                  background: ts.remaining === 0 ? 'var(--color-terracotta-contrast)' : 'color-mix(in oklch, var(--color-terracotta-contrast) 85%, transparent)',
                  color: 'var(--color-bone)',
                  backdropFilter: 'blur(8px)',
                }}
                aria-label={ts.remaining === 0 ? `Reset timer for step ${idx + 1}` : `Timer for step ${idx + 1}`}
                data-testid={ts.remaining === 0 ? `cook-timer-reset-${idx}` : `timer-pill-${idx}`}
              >
                {ts.remaining === 0 ? t.cookTimerPillDone(idx + 1) : t.cookTimerPillRunning(idx + 1, formatSeconds(ts.remaining))}
              </button>
            ))}
        </div>
      )}

      {/* Desktop layout */}
      <div className="hidden sm:flex h-full">
        {/* Left: step panel (60%) */}
        <div className="flex-[3] flex flex-col h-full border-r" style={{ borderColor: 'var(--border)' }}>
          {/* Header — classic-mode local "EXIT · STEP n/N" strip. Hidden under
              brut where the Wayfinder above carries the same telemetry. */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b"
            style={{ borderColor: 'var(--border)' }}
            data-cook-local-header
          >
            <Link
              href={`/recipes/${recipe.id}`}
              className="font-label text-xs tracking-widest uppercase transition-colors min-h-[44px] flex items-center pr-4"
              style={{ color: 'var(--text-3)' }}
              data-testid="cook-exit-btn"
            >
              {t.cookExitBtn}
            </Link>
            <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-3)' }}>
              {t.cookStepOf(currentIndex + 1, totalSteps)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5" style={{ background: 'oklch(100% 0 0 / 0.12)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / totalSteps) * 100}%`,
                background: 'var(--color-terracotta)',
              }}
            />
          </div>

          {/* Step content */}
          <div
            key={`step-desktop-${currentIndex}`}
            className="animate-step-slide flex-1 flex flex-col justify-center px-10 py-8 overflow-y-auto"
          >
            <p
              className="font-body mb-8"
              style={{ fontSize: '2rem', fontWeight: 500, lineHeight: 1.5, color: 'var(--text-1)' }}
              data-testid="cook-step-text"
            >
              {currentStep.content}
            </p>

            {currentTimer && (
              <div className="flex items-center gap-4">
                <span
                  className={`font-label text-4xl font-bold tabular-nums ${currentTimer.running ? 'animate-ring-breath' : ''}`.trim()}
                  style={{ color: currentTimer.remaining === 0 ? 'var(--color-terracotta)' : 'var(--text-1)' }}
                  data-testid="cook-timer-display"
                >
                  {formatSeconds(currentTimer.remaining)}
                </span>
                {currentTimer.remaining === 0 ? (
                  <button
                    onClick={() => resetTimer(currentIndex)}
                    className="btn-primary"
                    data-testid={`cook-timer-reset-${currentIndex}`}
                  >
                    {t.cookResetTimer}
                  </button>
                ) : (
                  <button
                    onClick={() => toggleTimer(currentIndex)}
                    className="btn-primary"
                    data-testid="cook-timer-btn"
                  >
                    {currentTimer.running ? t.cookPauseTimer : t.cookStartTimer}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Prev / Next */}
          <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => goTo(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="font-label text-sm tracking-wider uppercase py-5 transition-colors border-r disabled:opacity-30"
              style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}
              data-testid="cook-prev-btn"
            >
              {t.cookPrevBtn}
            </button>
            <button
              onClick={() => goTo(currentIndex + 1)}
              className="font-label text-sm tracking-wider uppercase py-5 transition-colors"
              style={{ color: currentIndex === totalSteps - 1 ? 'var(--color-terracotta)' : 'var(--text-2)' }}
              data-testid="cook-next-btn"
            >
              {currentIndex === totalSteps - 1 ? t.cookFinishBtn : t.cookNextBtn}
            </button>
          </div>
        </div>

        {/* Right: ingredients (40%) */}
        <div className="flex-[2] flex flex-col h-full overflow-y-auto px-6 py-6">
          <h2 className="section-label mb-5" style={{ color: 'var(--text-3)' }}>
            {t.cookIngredients}
          </h2>
          <ul className="space-y-3">
            {displayedIngredients.map((ing, i) => (
              <li key={i}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checkedIngredients.has(i)}
                  className="flex min-h-[44px] w-full items-center gap-3 cursor-pointer text-left"
                  onClick={() => triggerIngredientCheck(i)}
                  onKeyDown={e => onIngredientCheckKeyDown(e, i)}
                  data-testid={`cook-ingredient-toggle-${i}`}
                >
                  <span
                    className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                    style={{
                      position: 'relative',
                      ...(checkedIngredients.has(i)
                        ? { background: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)' }
                        : { background: 'transparent', borderColor: 'var(--border-input)' }),
                    }}
                    aria-hidden="true"
                  >
                    {checkedIngredients.has(i) && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#fff">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {rippleIdx === i && (
                      <span key={`ripple-${i}-${rippleTick}`} className="ingredient-ripple" aria-hidden="true" />
                    )}
                  </span>
                  <span
                    className="ingredient-name font-body text-sm"
                    style={{
                      color: checkedIngredients.has(i) ? 'color-mix(in oklch, var(--text-1) 30%, transparent)' : 'var(--text-2)',
                      textDecoration: checkedIngredients.has(i) ? 'line-through' : 'none',
                    }}
                    data-testid={`cook-ingredient-${i}`}
                  >
                    <span className="tabular-nums" style={{ color: 'var(--color-terracotta)', marginRight: '0.5rem' }}>
                      {ing.displayAmount}{ing.displayUnit ? ` ${ing.displayUnit}` : ''}
                    </span>
                    {ing.name}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Mobile layout */}
      <div
        className="sm:hidden flex flex-col h-full"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Header — classic-mode local "EXIT · STEP n/N" strip. Hidden under
            brut where the Wayfinder above carries the same telemetry. */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border)' }}
          data-cook-local-header
        >
          <Link
            href={`/recipes/${recipe.id}`}
            className="font-label text-xs tracking-widest uppercase min-h-[44px] flex items-center pr-4"
            style={{ color: 'var(--text-3)' }}
            data-testid="cook-exit-btn-mobile"
          >
            {t.cookExitBtn}
          </Link>
          <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-3)' }}>
            {t.cookStepOf(currentIndex + 1, totalSteps)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5" style={{ background: 'oklch(100% 0 0 / 0.12)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / totalSteps) * 100}%`,
              background: 'var(--color-terracotta)',
            }}
            data-testid="cook-progress-bar"
          />
        </div>

        {/* Step content */}
        <div
          key={`step-mobile-${currentIndex}`}
          className="animate-step-slide relative flex-1 flex flex-col justify-center px-6 py-8 overflow-y-auto"
        >
          {/* Swipe affordance — decorative only */}
          <div
            className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"
            aria-hidden="true"
          >
            {currentIndex > 0 && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-3)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </div>
          <div
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-20"
            aria-hidden="true"
          >
            {currentIndex < totalSteps - 1 && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-3)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
          <p
            className="font-body mb-8"
            style={{ fontSize: '1.75rem', fontWeight: 500, lineHeight: 1.5, color: 'var(--text-1)' }}
            data-testid="cook-step-text-mobile"
          >
            {currentStep.content}
          </p>

          {currentTimer && (
            <div className="flex items-center gap-4">
              <span
                className={`font-label text-3xl font-bold tabular-nums ${
                  currentTimer.remaining === 0
                    ? 'animate-pulse'
                    : currentTimer.running
                      ? 'animate-ring-breath'
                      : ''
                }`}
                style={{ color: currentTimer.remaining === 0 ? 'var(--color-terracotta)' : 'var(--text-1)' }}
                data-testid="cook-timer-display-mobile"
              >
                {formatSeconds(currentTimer.remaining)}
              </span>
              {currentTimer.remaining === 0 ? (
                <button
                  onClick={() => resetTimer(currentIndex)}
                  className="btn-primary"
                  data-testid={`cook-timer-reset-${currentIndex}`}
                >
                  {t.cookResetTimer}
                </button>
              ) : (
                <button
                  onClick={() => toggleTimer(currentIndex)}
                  className="btn-primary"
                  data-testid="cook-timer-btn-mobile"
                >
                  {currentTimer.running ? t.cookPauseTimer : t.cookStartTimer}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Prev / Next */}
        <div className="grid grid-cols-2" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="font-label text-sm tracking-wider uppercase flex items-center justify-center border-r disabled:opacity-30"
            style={{
              minHeight: '64px',
              borderColor: 'var(--border)',
              color: 'var(--text-2)',
            }}
            data-testid="cook-prev-btn-mobile"
          >
            {t.cookPrevBtn}
          </button>
          <button
            onClick={() => goTo(currentIndex + 1)}
            className="font-label text-sm tracking-wider uppercase flex items-center justify-center"
            style={{
              minHeight: '64px',
              color: currentIndex === totalSteps - 1 ? 'var(--color-terracotta)' : 'var(--text-2)',
            }}
            data-testid="cook-next-btn-mobile"
          >
            {currentIndex === totalSteps - 1 ? t.cookFinishBtn : t.cookNextBtn}
          </button>
        </div>

        {/* Ingredient bottom sheet handle */}
        <div
          className="border-t"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setSheetOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 font-label text-xs tracking-widest uppercase"
            style={{ minHeight: '48px', color: 'var(--text-3)' }}
            aria-expanded={sheetOpen}
            data-testid="cook-ingredient-sheet-toggle"
          >
            <span>{t.cookIngredients}</span>
            <svg
              className={`w-4 h-4 transition-transform ${sheetOpen ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>

          {sheetOpen && (
            <div
              className="overflow-y-auto px-5 pb-6"
              style={{ maxHeight: '40vh' }}
              data-testid="cook-ingredient-sheet"
            >
              <ul className="space-y-3 pt-2">
                {displayedIngredients.map((ing, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 cursor-pointer min-h-[44px]"
                    onClick={() => triggerIngredientCheck(i)}
                  >
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center"
                      style={{
                        position: 'relative',
                        ...(checkedIngredients.has(i)
                          ? { background: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)' }
                          : { background: 'transparent', borderColor: 'var(--border-input)' }),
                      }}
                    >
                      {checkedIngredients.has(i) && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#fff">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      {rippleIdx === i && (
                        <span key={`ripple-mobile-${i}-${rippleTick}`} className="ingredient-ripple" aria-hidden="true" />
                      )}
                    </div>
                    <span
                      className="ingredient-name font-body text-sm"
                      style={{
                        color: checkedIngredients.has(i) ? 'color-mix(in oklch, var(--text-1) 30%, transparent)' : 'var(--text-2)',
                        textDecoration: checkedIngredients.has(i) ? 'line-through' : 'none',
                      }}
                    >
                      <span className="tabular-nums" style={{ color: 'var(--color-terracotta)', marginRight: '0.5rem' }}>
                        {ing.displayAmount}{ing.displayUnit ? ` ${ing.displayUnit}` : ''}
                      </span>
                      {ing.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
