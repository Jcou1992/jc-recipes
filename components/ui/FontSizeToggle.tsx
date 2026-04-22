'use client';
import { useEffect, useState } from 'react';
import { useT } from './LanguageContext';

type Size = 'sm' | 'md' | 'lg';

export default function FontSizeToggle() {
  const t = useT();
  const [size, setSize] = useState<Size>('md');

  useEffect(() => {
    const stored = localStorage.getItem('preferred-font-size') as Size | null;
    if (stored === 'sm' || stored === 'md' || stored === 'lg') {
      setSize(stored);
      document.documentElement.setAttribute('data-font-size', stored);
    }
  }, []);

  function cycle() {
    const next: Size = size === 'sm' ? 'md' : size === 'md' ? 'lg' : 'sm';
    setSize(next);
    document.documentElement.setAttribute('data-font-size', next);
    try {
      localStorage.setItem('preferred-font-size', next);
    } catch {}
  }

  const label = size === 'sm' ? t.fontSizeSm : size === 'md' ? t.fontSizeMd : t.fontSizeLg;

  return (
    <button
      onClick={cycle}
      className="font-label text-xs tracking-widest uppercase transition-colors min-h-[44px] px-2"
      style={{ color: 'var(--text-3)' }}
      aria-label={`${t.fontSizeLabel}: ${size}. Click to cycle.`}
      data-testid="font-size-toggle"
    >
      {label}
    </button>
  );
}
