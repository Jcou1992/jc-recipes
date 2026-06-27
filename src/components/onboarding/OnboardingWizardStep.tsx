'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserPreferences } from '@/app/actions/preferences';
import { getT, type Language } from '@/lib/i18n';
import type { PreferredUnits } from '@/types/preferences';

interface Props {
  initialPrefs: {
    preferred_theme: string | null;
    preferred_font_size: string | null;
    preferred_language: string | null;
    preferred_units: PreferredUnits | null;
  };
  onComplete: () => void;
}

type ThemeChoice = 'dark' | 'light' | 'auto';
type FontSizeChoice = 'sm' | 'md' | 'lg';

function Pill({
  active,
  onClick,
  children,
  name,
  value,
  'data-testid': testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  name: string;
  value: string;
  'data-testid'?: string;
}) {
  return (
    <label
      data-testid={testId}
      className="chip-press flex-shrink-0 flex items-center justify-center rounded-xl cursor-pointer transition-all px-4"
      style={{
        minHeight: 44,
        minWidth: 72,
        background: active ? 'var(--color-terracotta-contrast)' : 'transparent',
        color: active ? 'var(--color-bone)' : 'var(--text-2)',
        border: active
          ? '1px solid var(--color-terracotta)'
          : '1px solid color-mix(in oklch, var(--color-terracotta) 30%, transparent)',
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={active}
        onChange={onClick}
        className="sr-only"
      />
      <span className="font-label text-xs font-semibold tracking-widest uppercase">
        {children}
      </span>
    </label>
  );
}

export function OnboardingWizardStep({ initialPrefs, onComplete }: Props) {
  const router = useRouter();
  const initTheme: ThemeChoice =
    initialPrefs.preferred_theme === 'dark' || initialPrefs.preferred_theme === 'light'
      ? initialPrefs.preferred_theme
      : 'auto';
  const initSize: FontSizeChoice =
    initialPrefs.preferred_font_size === 'sm' ||
    initialPrefs.preferred_font_size === 'md' ||
    initialPrefs.preferred_font_size === 'lg'
      ? initialPrefs.preferred_font_size
      : 'md';

  const [theme, setTheme] = useState<ThemeChoice>(initTheme);
  const [fontSize, setFontSize] = useState<FontSizeChoice>(initSize);
  const [language, setLanguage] = useState<Language>(
    (initialPrefs.preferred_language as Language) ?? 'en',
  );
  const [units, setUnits] = useState<PreferredUnits>(initialPrefs.preferred_units ?? 'metric');
  const [error, setError] = useState<string | null>(null);
  const [srAnnounce, setSrAnnounce] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const t = getT(language);

  function applyTheme(v: ThemeChoice) {
    setTheme(v);
    if (v === 'auto') {
      document.documentElement.removeAttribute('data-theme');
      setSrAnnounce(t.onboardingThemeAuto);
    } else {
      document.documentElement.dataset.theme = v;
      setSrAnnounce(v === 'dark' ? t.onboardingThemeDark : t.onboardingThemeLight);
    }
  }
  function applyFontSize(v: FontSizeChoice) {
    setFontSize(v);
    document.documentElement.dataset.fontSize = v;
    setSrAnnounce(v.toUpperCase());
  }
  function applyLanguage(v: Language) {
    setLanguage(v);
    setSrAnnounce(v === 'en' ? 'English' : 'Español');
  }
  function applyUnits(v: PreferredUnits) {
    setUnits(v);
    setSrAnnounce(v === 'metric' ? t.onboardingUnitsMetric : t.onboardingUnitsImperial);
  }

  function onNext() {
    setError(null);
    startTransition(async () => {
      const result = await updateUserPreferences({
        preferred_theme: theme === 'auto' ? 'system' : theme,
        preferred_font_size: fontSize,
        preferred_language: language,
        preferred_units: units,
      });
      if (!result.ok) {
        setError(t.onboardingErrorSave);
        return;
      }
      router.refresh();
      onComplete();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wizard-title"
      data-testid="onboarding-wizard"
      className="dialog-panel mx-auto rounded-2xl p-6 md:p-8 shadow-2xl max-h-[calc(100svh-2rem)] overflow-y-auto"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <h2
        id="wizard-title"
        className="font-display text-2xl md:text-3xl font-semibold mb-1"
        style={{ color: 'var(--text-1)' }}
      >
        {t.onboardingWelcomeTitle}
      </h2>
      <p className="font-body text-sm mb-6" style={{ color: 'var(--text-3)' }}>
        {t.onboardingWelcomeBody}
      </p>

      <fieldset className="mb-5">
        <legend
          className="font-label text-xs tracking-widest uppercase mb-2"
          style={{ color: 'var(--text-3)' }}
        >
          {t.onboardingThemeLabel}
        </legend>
        <div className="flex gap-2 flex-wrap">
          <Pill
            active={theme === 'dark'}
            onClick={() => applyTheme('dark')}
            name="theme"
            value="dark"
            data-testid="wizard-theme-dark"
          >
            {t.onboardingThemeDark}
          </Pill>
          <Pill
            active={theme === 'light'}
            onClick={() => applyTheme('light')}
            name="theme"
            value="light"
            data-testid="wizard-theme-light"
          >
            {t.onboardingThemeLight}
          </Pill>
          <Pill
            active={theme === 'auto'}
            onClick={() => applyTheme('auto')}
            name="theme"
            value="auto"
            data-testid="wizard-theme-auto"
          >
            {t.onboardingThemeAuto}
          </Pill>
        </div>
      </fieldset>

      <fieldset className="mb-5">
        <legend
          className="font-label text-xs tracking-widest uppercase mb-2"
          style={{ color: 'var(--text-3)' }}
        >
          {t.onboardingLanguageLabel}
        </legend>
        <div className="flex gap-2 flex-wrap">
          <Pill
            active={language === 'en'}
            onClick={() => applyLanguage('en')}
            name="language"
            value="en"
            data-testid="wizard-language-en"
          >
            English
          </Pill>
          <Pill
            active={language === 'es'}
            onClick={() => applyLanguage('es')}
            name="language"
            value="es"
            data-testid="wizard-language-es"
          >
            Español
          </Pill>
        </div>
      </fieldset>

      <fieldset className="mb-5">
        <legend
          className="font-label text-xs tracking-widest uppercase mb-2"
          style={{ color: 'var(--text-3)' }}
        >
          {t.onboardingSizeLabel}
        </legend>
        <div className="flex gap-2 flex-wrap">
          {(['sm', 'md', 'lg'] as const).map((v) => (
            <Pill
              key={v}
              active={fontSize === v}
              onClick={() => applyFontSize(v)}
              name="fontSize"
              value={v}
              data-testid={`wizard-size-${v}`}
            >
              {v.toUpperCase()}
            </Pill>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-6">
        <legend
          className="font-label text-xs tracking-widest uppercase mb-2"
          style={{ color: 'var(--text-3)' }}
        >
          {t.onboardingUnitsLabel}
        </legend>
        <div className="flex gap-2 flex-wrap">
          <Pill
            active={units === 'metric'}
            onClick={() => applyUnits('metric')}
            name="units"
            value="metric"
            data-testid="wizard-units-metric"
          >
            {t.onboardingUnitsMetric}
          </Pill>
          <Pill
            active={units === 'imperial'}
            onClick={() => applyUnits('imperial')}
            name="units"
            value="imperial"
            data-testid="wizard-units-imperial"
          >
            {t.onboardingUnitsImperial}
          </Pill>
        </div>
        <p
          className="font-body text-xs mt-2"
          style={{ color: 'var(--text-3)' }}
        >
          {t.onboardingUnitsHelper}
        </p>
      </fieldset>

      {error && (
        <p
          className="font-body text-sm mb-3"
          style={{ color: 'var(--color-danger, #c54027)' }}
          data-testid="wizard-error"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={isPending}
        className="btn-primary w-full"
        data-testid="wizard-next-btn"
      >
        {isPending ? '…' : t.onboardingNextButton}
      </button>

      <div aria-live="polite" className="sr-only">
        {srAnnounce}
      </div>
    </div>
  );
}
