'use client';

import { useLanguage } from './LanguageContext';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      onClick={() => {
        const next = language === 'en' ? 'es' : 'en';
        setLanguage(next);
        if (typeof document !== 'undefined') document.documentElement.lang = next;
      }}
      className="cycle-toggle font-label text-xs tracking-widest uppercase transition-colors min-h-[44px] px-2"
      style={{ color: 'var(--text-3)' }}
      aria-label={`Switch to ${language === 'en' ? 'Spanish' : 'English'}`}
    >
      {language === 'en' ? 'ES' : 'EN'}
      <span className="cycle-toggle-chevron" aria-hidden="true">›</span>
    </button>
  );
}
