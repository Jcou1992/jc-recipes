'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { type Language, type Translations, LANGUAGE_COOKIE, DEFAULT_LANGUAGE, getT } from '@/lib/i18n';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readCookie(): Language {
  if (typeof document === 'undefined') return DEFAULT_LANGUAGE;
  const match = document.cookie.match(/(?:^|;\s*)preferred-language=([^;]+)/);
  if (match && (match[1] === 'en' || match[1] === 'es')) return match[1] as Language;
  return DEFAULT_LANGUAGE;
}

function writeCookie(lang: Language) {
  document.cookie = `${LANGUAGE_COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}`;
}

interface Props {
  children: ReactNode;
  initialLanguage?: Language;
}

export function LanguageProvider({ children, initialLanguage }: Props) {
  const [language, setLanguageState] = useState<Language>(initialLanguage ?? DEFAULT_LANGUAGE);
  const router = useRouter();

  useEffect(() => {
    const cookieLang = readCookie();
    if (cookieLang !== language) setLanguageState(cookieLang);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setLanguage(lang: Language) {
    setLanguageState(lang);
    writeCookie(lang);
    router.refresh();
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: getT(language) }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useT(): Translations {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useT must be used inside LanguageProvider');
  return ctx.t;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return { language: ctx.language, setLanguage: ctx.setLanguage };
}
