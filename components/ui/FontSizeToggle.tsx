'use client';

import { useEffect, useState, useTransition } from 'react';
import { useT } from './LanguageContext';
import { updateUserPreferences } from '@/app/actions/preferences';
import { getCurrentEmail, writeFontSizeForEmail } from '@/lib/preferences-cache';

type Size = 'sm' | 'md' | 'lg';

function readInitialSize(): Size {
  if (typeof document === 'undefined') return 'md';
  const attr = document.documentElement.getAttribute('data-font-size');
  if (attr === 'sm' || attr === 'md' || attr === 'lg') return attr;
  return 'md';
}

export default function FontSizeToggle() {
  const t = useT();
  const [size, setSize] = useState<Size>('md');
  const [, startTransition] = useTransition();

  useEffect(() => {
    setSize(readInitialSize());
  }, []);

  function cycle() {
    const next: Size = size === 'sm' ? 'md' : size === 'md' ? 'lg' : 'sm';
    setSize(next);
    document.documentElement.setAttribute('data-font-size', next);
    const email = getCurrentEmail();
    if (email) writeFontSizeForEmail(email, next);
    startTransition(() => {
      void updateUserPreferences({ preferred_font_size: next });
    });
  }

  const label = size === 'sm' ? t.fontSizeSm : size === 'md' ? t.fontSizeMd : t.fontSizeLg;

  return (
    <button
      onClick={cycle}
      className="cycle-toggle font-label text-xs tracking-widest uppercase transition-colors min-h-[44px] px-2"
      style={{ color: 'var(--text-3)' }}
      aria-label={`${t.fontSizeLabel}: ${size}. Click to cycle.`}
      data-testid="font-size-toggle"
    >
      {label}
      <span className="cycle-toggle-chevron" aria-hidden="true">›</span>
    </button>
  );
}
