/**
 * SEKAI · BRUTALIST-RAW-LUXE font pipeline.
 *
 * IBM Plex Mono is the ship-safe monospace fallback for Berkeley Mono. When JC
 * licences Berkeley personally, those woff2 files land in public/fonts/ and
 * `--font-mono` stack (defined in styles/tokens-brutalist.css) lists Berkeley
 * first — Plex inherits its weight/metrics slot as the fallback. No Berkeley
 * in the initial rollout: shipping an unlicensed font to demo@ users is out
 * of the question.
 *
 * Noto Serif JP ships for a single use: the `世界` watermark on /login. We
 * don't need metric matching — it's only ever painted at 22vw, opacity 0.055,
 * behind the wordmark. `adjustFontFallback: false` skips the fallback-size
 * shim that would otherwise add a ~10kB metrics table for a glyph we paint
 * once per session.
 */
import { IBM_Plex_Mono, Noto_Serif_JP } from 'next/font/google';

export const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const notoJp = Noto_Serif_JP({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-noto',
  display: 'swap',
  adjustFontFallback: false,
});
