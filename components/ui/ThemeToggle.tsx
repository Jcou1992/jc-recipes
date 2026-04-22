'use client';
import { useEffect, useState } from 'react';
type Theme = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('preferred-theme') as Theme | null;
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setTheme(stored);
      applyTheme(stored);
    }
  }, []);

  function applyTheme(t: Theme) {
    const el = document.documentElement;
    if (t === 'system') el.removeAttribute('data-theme');
    else el.setAttribute('data-theme', t);
  }

  function cycle() {
    const next: Theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
    setTheme(next);
    applyTheme(next);
    try { localStorage.setItem('preferred-theme', next); } catch {}
  }

  const label = theme === 'system' ? 'SYS' : theme === 'dark' ? 'DRK' : 'LGT';

  return (
    <button
      onClick={cycle}
      className="font-label text-xs tracking-widest uppercase transition-colors min-h-[44px] px-2"
      style={{ color: 'var(--text-3)' }}
      aria-label={`Theme: ${theme}. Click to cycle.`}
    >
      {label}
    </button>
  );
}
