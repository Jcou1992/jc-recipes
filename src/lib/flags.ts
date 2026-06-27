// Feature flags. Flip to re-enable a parked feature.
//
// macros: nutrition / USDA-matching feature (per-serving kcal + protein/fat/carbs,
//   FDC ingredient matching). Hidden 2026-06-20 pending a product pivot. All macros
//   code, types, migrations, DB columns, and unit tests remain intact — only the UI
//   surfaces and the on-save compute are gated.
//
//   Re-enable: set NEXT_PUBLIC_MACROS_ENABLED=1 in the environment (rebuild, since
//   NEXT_PUBLIC_* is inlined at build time). No code change required.
//
// Read identically on client and server (NEXT_PUBLIC_ prefix). Default unset → off.
export const FEATURES = {
  macros: process.env.NEXT_PUBLIC_MACROS_ENABLED === '1',
} as const;
