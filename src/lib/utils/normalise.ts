/**
 * Lower-case, diacritic-stripped, unicode-normalised string.
 *
 * Used both by the recipe-list search filter (so `creme` matches "Crème
 * brûlée") and by markdown export filename slugging (so the file is
 * recognisable rather than collapsing to `cr-me-br-l-e.md`). Lifted out of
 * `RecipeListClient` in cycle 2 so a single implementation backs both.
 *
 * NFD splits a precomposed character into its base + combining diacritic;
 * the regex then drops every Unicode "diacritic" property mark, leaving
 * the base letter intact. The final lower-case is locale-default which is
 * fine for our use cases (filename slug + user-typed search).
 */
export function normalise(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Convert an arbitrary recipe name into a safe ASCII filesystem slug.
 *
 *   "Crème brûlée"            → "creme-brulee"
 *   "Tonkatsu sauce"          → "tonkatsu-sauce"
 *   "豚カツソース"            → ""           (all CJK stripped — caller falls
 *                                              back to a default elsewhere)
 *
 * Diacritics are stripped before the alphanumeric filter so European names
 * survive; CJK / emoji are dropped because Windows + macOS filesystems both
 * accept them but downstream tooling (dropbox sync, GitHub, etc.) doesn't.
 */
export function nameToSlug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}
