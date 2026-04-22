'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from './ToastContext';
import ToastContainer from './ToastContainer';
import { LanguageProvider } from './LanguageContext';
import type { Language } from '@/lib/i18n';

interface Props {
  children: ReactNode;
  initialLanguage?: Language;
}

export default function AppProviders({ children, initialLanguage }: Props) {
  return (
    <LanguageProvider initialLanguage={initialLanguage}>
      <ToastProvider>
        {children}
        <ToastContainer />
      </ToastProvider>
    </LanguageProvider>
  );
}
