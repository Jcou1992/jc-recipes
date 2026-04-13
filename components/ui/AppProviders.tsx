'use client';

import type { ReactNode } from 'react';
import { ToastProvider } from './ToastContext';
import ToastContainer from './ToastContainer';

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      {children}
      <ToastContainer />
    </ToastProvider>
  );
}
