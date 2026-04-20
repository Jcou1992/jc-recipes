'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
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

export default function CookMode({ recipe, initialServings, unitSystem }: Props) {
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
  const touchStartX = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

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
        for (const [idx, t] of next) {
          if (t.running && t.remaining > 0) {
            next.set(idx, { ...t, remaining: t.remaining - 1 });
            changed = true;
            if (t.remaining - 1 === 0) {
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

  function goTo(i: number) {
    if (i < 0 || i >= totalSteps) return;
    setCompletedSteps(prev => new Set([...prev, currentIndex]));
    setCurrentIndex(i);
  }

  function toggleTimer(stepIdx: number) {
    if (!audioCtxRef.current && typeof window !== 'undefined') {
      try { audioCtxRef.current = new AudioContext(); } catch {}
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
      const original = sortedSteps[stepIdx].timer_seconds!;
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
  const activeTimers = [...timers.entries()].filter(([, t]) => t.remaining > 0 && (t.running || t.remaining < (sortedSteps[0].timer_seconds ?? 0)));
  const runningTimers = [...timers.entries()].filter(([, t]) => t.running || (t.remaining > 0 && t.remaining < (sortedSteps[timers.keys().next().value ?? 0]?.timer_seconds ?? Infinity)));

  // Displayed ingredients (scaled + converted)
  const displayedIngredients = recipe.ingredients.map(ing => {
    const scaled = ing.amount * multiplier;
    const { amount: converted, unit } = convertUnit(scaled, ing.unit, unitSystem);
    return { ...ing, displayAmount: formatAmount(converted), displayUnit: unit };
  });

  // Running timers pills (all timers that are running or at zero)
  const timerPills = [...timers.entries()].filter(([, t]) => t.running || (t.remaining === 0 && sortedSteps[0].timer_seconds != null));

  return (
    <div
      className="fixed inset-0 z-20 flex flex-col animate-scale-in"
      style={{ background: 'var(--bg)', color: 'var(--text-1)' }}
      data-testid="cook-mode"
    >
      {/* Active timer pills */}
      {[...timers.entries()].filter(([, t]) => t.running || t.remaining === 0).length > 0 && (
        <div className="absolute top-14 right-3 z-20 flex flex-col gap-1.5 pointer-events-none">
          {[...timers.entries()]
            .filter(([, t]) => t.running || t.remaining === 0)
            .map(([idx, t]) => (
              <button
                key={idx}
                onClick={() => t.remaining === 0 ? resetTimer(idx) : toggleTimer(idx)}
                className={`font-label text-xs tracking-wider px-3 py-1.5 rounded-full pointer-events-auto transition-all ${
                  t.remaining === 0 ? 'animate-pulse' : ''
                }`}
                style={{
                  background: t.remaining === 0 ? 'var(--color-terracotta)' : 'rgba(212,112,63,0.85)',
                  color: '#fff',
                  backdropFilter: 'blur(8px)',
                }}
                aria-label={`Timer for step ${idx + 1}`}
                data-testid={`timer-pill-${idx}`}
              >
                Paso {idx + 1} — {formatSeconds(t.remaining)}
              </button>
            ))}
        </div>
      )}

      {/* Desktop layout */}
      <div className="hidden sm:flex h-full">
        {/* Left: step panel (60%) */}
        <div className="flex-[3] flex flex-col h-full border-r" style={{ borderColor: 'var(--border)' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <Link
              href={`/recipes/${recipe.id}`}
              className="font-label text-xs tracking-widest uppercase transition-colors"
              style={{ color: 'var(--text-3)' }}
              data-testid="cook-exit-btn"
            >
              ← Salir
            </Link>
            <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-3)' }}>
              Paso {currentIndex + 1} de {totalSteps}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5" style={{ background: 'var(--border)' }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${((currentIndex + 1) / totalSteps) * 100}%`,
                background: 'var(--color-terracotta)',
              }}
            />
          </div>

          {/* Step content */}
          <div className="flex-1 flex flex-col justify-center px-10 py-8 overflow-y-auto">
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
                  className="font-label text-4xl font-bold tabular-nums"
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
                    Reiniciar
                  </button>
                ) : (
                  <button
                    onClick={() => toggleTimer(currentIndex)}
                    className="btn-primary"
                    data-testid="cook-timer-btn"
                  >
                    {currentTimer.running ? 'Pausar' : 'Iniciar'}
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
              ← Anterior
            </button>
            <button
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex === totalSteps - 1}
              className="font-label text-sm tracking-wider uppercase py-5 transition-colors disabled:opacity-30"
              style={{ color: 'var(--text-2)' }}
              data-testid="cook-next-btn"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {/* Right: ingredients (40%) */}
        <div className="flex-[2] flex flex-col h-full overflow-y-auto px-6 py-6">
          <h2 className="section-label mb-5" style={{ color: 'var(--text-3)' }}>
            Ingredientes
          </h2>
          <ul className="space-y-3">
            {displayedIngredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-3 cursor-pointer" onClick={() => {
                setCheckedIngredients(prev => {
                  const next = new Set(prev);
                  next.has(i) ? next.delete(i) : next.add(i);
                  return next;
                });
              }}>
                <div
                  className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all"
                  style={checkedIngredients.has(i)
                    ? { background: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)' }
                    : { background: 'transparent', borderColor: 'var(--border-input)' }
                  }
                >
                  {checkedIngredients.has(i) && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#fff">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className="font-body text-sm"
                  style={{
                    color: checkedIngredients.has(i) ? 'color-mix(in srgb, var(--text-1) 30%, transparent)' : 'var(--text-2)',
                    textDecoration: checkedIngredients.has(i) ? 'line-through' : 'none',
                  }}
                  data-testid={`cook-ingredient-${i}`}
                >
                  <span style={{ color: 'var(--color-terracotta)', marginRight: '0.5rem' }}>
                    {ing.displayAmount}{ing.displayUnit ? ` ${ing.displayUnit}` : ''}
                  </span>
                  {ing.name}
                </span>
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
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <Link
            href={`/recipes/${recipe.id}`}
            className="font-label text-xs tracking-widest uppercase min-h-[44px] flex items-center pr-4"
            style={{ color: 'var(--text-3)' }}
            data-testid="cook-exit-btn-mobile"
          >
            ← Salir
          </Link>
          <span className="font-label text-sm tracking-wide" style={{ color: 'var(--text-3)' }}>
            Paso {currentIndex + 1} de {totalSteps}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5" style={{ background: 'var(--border)' }}>
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
        <div className="flex-1 flex flex-col justify-center px-6 py-8 overflow-y-auto">
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
                className={`font-label text-3xl font-bold tabular-nums ${currentTimer.remaining === 0 ? 'animate-pulse' : ''}`}
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
                  Reiniciar
                </button>
              ) : (
                <button
                  onClick={() => toggleTimer(currentIndex)}
                  className="btn-primary"
                  data-testid="cook-timer-btn-mobile"
                >
                  {currentTimer.running ? 'Pausar' : 'Iniciar'}
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
            ← Anterior
          </button>
          <button
            onClick={() => goTo(currentIndex + 1)}
            disabled={currentIndex === totalSteps - 1}
            className="font-label text-sm tracking-wider uppercase flex items-center justify-center disabled:opacity-30"
            style={{ minHeight: '64px', color: 'var(--text-2)' }}
            data-testid="cook-next-btn-mobile"
          >
            Siguiente →
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
            <span>Ingredientes</span>
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
                    onClick={() => {
                      setCheckedIngredients(prev => {
                        const next = new Set(prev);
                        next.has(i) ? next.delete(i) : next.add(i);
                        return next;
                      });
                    }}
                  >
                    <div
                      className="flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center"
                      style={checkedIngredients.has(i)
                        ? { background: 'var(--color-terracotta)', borderColor: 'var(--color-terracotta)' }
                        : { background: 'transparent', borderColor: 'var(--border-input)' }
                      }
                    >
                      {checkedIngredients.has(i) && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="#fff">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span
                      className="font-body text-sm"
                      style={{
                        color: checkedIngredients.has(i) ? 'color-mix(in srgb, var(--text-1) 30%, transparent)' : 'var(--text-2)',
                        textDecoration: checkedIngredients.has(i) ? 'line-through' : 'none',
                      }}
                    >
                      <span style={{ color: 'var(--color-terracotta)', marginRight: '0.5rem' }}>
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
