import type { Metadata } from 'next';
import { Noto_Serif_JP, Barlow_Condensed, Cormorant_Garamond } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import { getServerLanguage } from '@/lib/i18n-server';
import {
  PREF_COOKIE_THEME,
  PREF_COOKIE_FONT_SIZE,
  PREF_COOKIE_UNITS,
} from '@/lib/preference-cookies';

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
  title: 'SEKAI — recipe tool',
  description: 'Personal recipe space — precise, proud, functional.',
};

const VALID_THEME: ReadonlyArray<string> = ['light', 'dark'];
const VALID_FONT_SIZE: ReadonlyArray<string> = ['sm', 'md', 'lg'];
const VALID_UNITS: ReadonlyArray<string> = ['metric', 'imperial'];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read all three preference signals server-side so the first paint matches
  // the signed-in user's stored state. Strict allow-lists prevent a malformed
  // cookie from flowing into attributes.
  let lang = 'en';
  try {
    lang = await getServerLanguage();
  } catch {
    lang = 'en';
  }

  let theme: string | null = null;
  let fontSize: string | null = null;
  let units: string = 'metric';
  try {
    const cookieStore = await cookies();
    const themeRaw = cookieStore.get(PREF_COOKIE_THEME)?.value;
    if (themeRaw && VALID_THEME.includes(themeRaw)) theme = themeRaw;
    const fsRaw = cookieStore.get(PREF_COOKIE_FONT_SIZE)?.value;
    if (fsRaw && VALID_FONT_SIZE.includes(fsRaw)) fontSize = fsRaw;
    const unitsRaw = cookieStore.get(PREF_COOKIE_UNITS)?.value;
    if (unitsRaw && VALID_UNITS.includes(unitsRaw)) units = unitsRaw;
  } catch {
    // cookies() may throw in edge runtime during certain error paths; fall
    // back to unset attrs (system defaults).
  }

  const htmlProps: Record<string, string> = { 'data-units': units };
  if (theme) htmlProps['data-theme'] = theme;
  if (fontSize) htmlProps['data-font-size'] = fontSize;

  return (
    <html
      lang={lang}
      className={`${notoSerifJP.variable} ${barlowCondensed.variable} ${cormorantGaramond.variable}`}
      {...htmlProps}
    >
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
