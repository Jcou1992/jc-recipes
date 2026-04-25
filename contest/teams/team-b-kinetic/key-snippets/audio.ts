/**
 * lib/motion/audio.ts
 *
 * Procedurally-generated UI tones via Web Audio. No sample files. One
 * AudioContext per session, created lazily on the first user gesture
 * (browsers refuse to let us create one before a gesture).
 *
 * Every tone is one OscillatorNode + one GainNode + an ADSR envelope.
 * The named SFX palette in design-spec §4.2 maps one-to-one to the exports
 * from this file.
 *
 * Accessibility: all tones respect a global `userPrefs.soundOff` gate. When
 * `prefers-reduced-motion: reduce` is set, sounds are *not* automatically
 * suppressed — sound is a separate channel — but we add a UX affordance in
 * Settings → Sound: On/Off/Haptic-only to make this explicit.
 */

let ctx: AudioContext | null = null;
let unlocked = false;
let soundOff = false;

/** Called from Settings toggle. */
export function setSoundOff(off: boolean) {
  soundOff = off;
}

export function ensureAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

/**
 * Unlock the AudioContext on the first user gesture. iOS Safari requires
 * this — an AudioContext created outside a gesture handler stays suspended
 * silently. Call from a pointerdown listener on a root element, once.
 */
export function unlockOnFirstGesture(): void {
  if (unlocked) return;
  const unlock = () => {
    const c = ensureAudio();
    if (c && c.state === 'suspended') c.resume().catch(() => {});
    unlocked = true;
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

type Wave = OscillatorType;

/**
 * Low-level: play a single tone with an ADSR envelope.
 * Envelope is simplified to (attack, decay+release) — suits UI where
 * sustain is irrelevant. All durations in ms; gain in 0..1.
 */
export function tone(
  freq: number,
  durationMs: number,
  wave: Wave = 'sine',
  peakGain = 0.18,
): void {
  if (soundOff) return;
  const c = ensureAudio();
  if (!c || c.state === 'suspended') return;
  const now = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(c.destination);
  g.gain.setValueAtTime(0, now);
  // 8ms attack — crisp start without a click (0ms attack produces a popping DC offset)
  g.gain.linearRampToValueAtTime(peakGain, now + 0.008);
  // Exponential decay to near-zero over the remaining duration
  g.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
  osc.start(now);
  osc.stop(now + durationMs / 1000 + 0.02);
}

/**
 * Named palette. Each entry matches design-spec §4.2.
 */
export const SFX = {
  /** Scaler detent, drag snap. 40Hz 12ms; reads as tactile, not musical. */
  tock:     () => tone(40,  12, 'sine',    0.16),
  /** Cook step begin, cascade first item. C#5 80ms. */
  start:    () => tone(554, 80, 'sine',    0.18),
  /** Cook step advance. G5 60ms. */
  advance:  () => tone(784, 60, 'sine',    0.16),
  /** Cook step back. D5 60ms (third lower than advance — semantic cue). */
  back:     () => tone(587, 60, 'sine',    0.14),
  /** Cook complete. C#5 → G5 dyad, triangle for warmer timbre. */
  complete: () => {
    tone(554, 180, 'triangle', 0.16);
    setTimeout(() => tone(784, 220, 'triangle', 0.16), 90);
  },
  /** First-save, saved-successfully. C#5 + G5 simultaneous. */
  confirm:  () => { tone(554, 140, 'sine', 0.14); tone(784, 160, 'sine', 0.14); },
  /** Validation / save failure. A3 sawtooth — dissonant, unmistakable. */
  fail:     () => tone(220, 140, 'sawtooth', 0.12),
};
