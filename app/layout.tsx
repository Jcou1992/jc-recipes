import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'jc-recipes',
  description: 'Personal recipe manager',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-stone-50 min-h-screen">{children}</body>
    </html>
  );
}
