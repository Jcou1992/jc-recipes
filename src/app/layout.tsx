import type { Metadata, Viewport } from 'next';
import { Barlow_Condensed, Cormorant_Garamond } from 'next/font/google';
import { cookies } from 'next/headers';
import './globals.css';
import '../styles/tokens-brutalist.css';
import { plexMono, notoJp } from './fonts';
import { getServerLanguage } from '@/lib/i18n-server';
import {
  PREF_COOKIE_THEME,
  PREF_COOKIE_FONT_SIZE,
  PREF_COOKIE_UNITS,
} from '@/lib/preference-cookies';
import { DESIGN_MODE_COOKIE, type DesignMode } from '@/lib/brut/design-mode-cookie';
import { RouteAwareWayfinder } from '@/components/ui/brut/RouteAwareWayfinder';
import KonamiEasterEgg from '@/components/motion/KonamiEasterEgg';

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
  metadataBase: new URL('https://sekai.jcou.workers.dev'),
  title: 'SEKAI — recipe tool',
  description: 'Personal recipe space — precise, proud, functional.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    shortcut: ['/favicon.ico'],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: { capable: true, title: 'SEKAI', statusBarStyle: 'black-translucent' },
};

// viewport-fit=cover opts into edge-to-edge on notched devices; combined with
// env(safe-area-inset-*) in fixed bars this prevents the nav and bulk bars
// from hiding under the notch / home indicator on iPhone 14 Pro Max etc.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#1a1a1d' },
    { media: '(prefers-color-scheme: light)', color: '#f3ecd9' },
  ],
};

const VALID_THEME: ReadonlyArray<string> = ['light', 'dark'];
const VALID_FONT_SIZE: ReadonlyArray<string> = ['sm', 'md', 'lg'];
const VALID_UNITS: ReadonlyArray<string> = ['metric', 'imperial'];
const VALID_DESIGN_MODE: ReadonlyArray<DesignMode> = ['classic', 'brut'];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read all preference signals server-side so the first paint matches the
  // signed-in user's stored state. Strict allow-lists prevent a malformed
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
  let designMode: DesignMode = 'classic';
  try {
    const cookieStore = await cookies();
    const themeRaw = cookieStore.get(PREF_COOKIE_THEME)?.value;
    if (themeRaw && VALID_THEME.includes(themeRaw)) theme = themeRaw;
    const fsRaw = cookieStore.get(PREF_COOKIE_FONT_SIZE)?.value;
    if (fsRaw && VALID_FONT_SIZE.includes(fsRaw)) fontSize = fsRaw;
    const unitsRaw = cookieStore.get(PREF_COOKIE_UNITS)?.value;
    if (unitsRaw && VALID_UNITS.includes(unitsRaw)) units = unitsRaw;
    const designRaw = cookieStore.get(DESIGN_MODE_COOKIE)?.value;
    if (designRaw && (VALID_DESIGN_MODE as ReadonlyArray<string>).includes(designRaw)) {
      designMode = designRaw as DesignMode;
    }
  } catch {
    // cookies() may throw in edge runtime during certain error paths; fall
    // back to unset attrs (system defaults).
  }

  const htmlProps: Record<string, string> = {
    'data-units': units,
    'data-design': designMode,
  };
  if (theme) htmlProps['data-theme'] = theme;
  if (fontSize) htmlProps['data-font-size'] = fontSize;

  return (
    <html
      lang={lang}
      className={`${plexMono.variable} ${notoJp.variable} ${barlowCondensed.variable} ${cormorantGaramond.variable}`}
      {...htmlProps}
    >
      <body className="min-h-screen">
        {/* Brut-only universal telemetry row. Mount-gated on the server cookie
            so classic users never download the Wayfinder JS chunk. Per-route
            pages may mount richer Wayfinder instances beneath with resource-
            specific data; on `/cook` the route owns its own Wayfinder so the
            global one is suppressed here to avoid stacking two 32 px header
            rows. */}
        {designMode === 'brut' && <RouteAwareWayfinder crumb="SEKAI" userLabel="" />}
        <KonamiEasterEgg />
        {children}
      </body>
    </html>
  );
}
