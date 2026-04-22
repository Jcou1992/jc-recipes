import type { Metadata } from 'next';
import { Noto_Serif_JP, Barlow_Condensed, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import { getServerLanguage } from '@/lib/i18n-server';

const notoSerifJP = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-noto',
  display: 'swap',
});

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-cormorant',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'jc-recipes',
  description: 'Personal recipe manager',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let lang: string = 'en';
  try {
    lang = await getServerLanguage();
  } catch {
    lang = 'en';
  }
  return (
    <html
      lang={lang}
      className={`${notoSerifJP.variable} ${barlowCondensed.variable} ${cormorantGaramond.variable}`}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
