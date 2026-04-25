#!/usr/bin/env node
/**
 * Hot-token lint (R5).
 *
 * Brut grammar rule: at most ONE `--brut-hot` accent per route screen.
 * `--brut-hot` is the loud terracotta drumbeat. Overusing it dilutes it
 * into decoration. One sets the focus; two competes; three is noise.
 *
 * The token is named `--brut-hot` (not `--hot`) to disambiguate from any
 * future classic-mode terracotta naming. The script + npm task name remain
 * `lint:hot` for ergonomics; the matched token internally is `--brut-hot`.
 *
 * What this script checks
 * -----------------------
 * For every Next.js route page (`app/(app)/**\/page.tsx`,
 * `app/(auth)/**\/page.tsx`, plus `app/page.tsx`), count the number of
 * raw `--brut-hot` references in:
 *   1. The `page.tsx` file itself.
 *   2. Any `.tsx` / `.ts` / `.css` file co-located in the SAME directory
 *      (the route's leaf components — `PrintAutoTrigger.tsx`, etc.).
 *
 * If the combined count exceeds 1 → fail with a clear message.
 *
 * Allowlist
 * ---------
 * `styles/tokens-brutalist.css` defines the token and applies it to many
 * shared selectors. It is the SOURCE of `--brut-hot`, not a consumer.
 * Excluded from the scan entirely.
 *
 * Override
 * --------
 * Mirror the test-gate override pattern. If the commit message contains
 *   [lint:hot-override: <reason>]
 * the lint logs the reason and exits 0. Read either from --commit-msg=...
 * or from the GATE_COMMIT_MSG env var (shared with test-gate).
 *
 * Exit
 * ----
 *  0 = pass (or override). 1 = fail.
 */
import fs   from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// Files where `--brut-hot` may appear freely. The token-definition file
// owns the system-wide application of the accent; it is not a route surface.
const ALLOWLIST = new Set([
  'styles/tokens-brutalist.css',
]);

// Where route pages live. Glob-free walk; small tree.
const ROUTE_ROOTS = [
  'app',
];

// File extensions we scan for `--brut-hot`. JSX/TSX inline styles +
// className strings, plus any co-located CSS module / vanilla CSS.
const SCANNED_EXT = new Set(['.tsx', '.ts', '.css']);

// ── Walk helpers ──────────────────────────────────────────────────────────────

function walk(dir, acc = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return acc; }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function readSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return ''; }
}

function countHot(src) {
  // Match the raw token reference. Hyphens in `--brut-hot` need no escape
  // inside a character class, but the leading `--` is literal. We count
  // occurrences, not lines (one line can carry two refs).
  const m = src.match(/--brut-hot\b/g);
  return m ? m.length : 0;
}

// ── Route discovery ───────────────────────────────────────────────────────────

function findRoutePages() {
  const all = ROUTE_ROOTS.flatMap(r => walk(path.join(ROOT, r)));
  return all.filter(f => path.basename(f) === 'page.tsx');
}

/**
 * For a given route page, return all sibling files in the same directory
 * that we should attribute to this route. Excludes nested route trees
 * (subdirs that themselves contain a `page.tsx` belong to a child route).
 */
function siblingsFor(pagePath) {
  const dir = path.dirname(pagePath);
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return []; }
  const out = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    const ext = path.extname(e.name);
    if (!SCANNED_EXT.has(ext)) continue;
    if (e.name === 'page.tsx') continue;
    out.push(path.join(dir, e.name));
  }
  return out;
}

// ── Override handling ─────────────────────────────────────────────────────────

function getCommitMessage() {
  const arg = process.argv.find(a => a.startsWith('--commit-msg='));
  if (arg) return arg.slice('--commit-msg='.length);
  return process.env.GATE_COMMIT_MSG || '';
}

function overrideRequested(msg) {
  const m = msg.match(/\[lint:hot-override:\s*([^\]]+)\]/);
  return m ? m[1].trim() : null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const routePages = findRoutePages();
  if (routePages.length === 0) {
    console.log('[hot-lint] no route pages found — skipping.');
    return 0;
  }

  /** @type {{file:string, count:number, refs:{file:string,count:number}[]}[]} */
  const failures = [];

  for (const page of routePages) {
    const pageRel = rel(page);
    if (ALLOWLIST.has(pageRel)) continue;

    const refs = [];

    const pageCount = countHot(readSafe(page));
    if (pageCount > 0) refs.push({ file: pageRel, count: pageCount });

    for (const sib of siblingsFor(page)) {
      const sibRel = rel(sib);
      if (ALLOWLIST.has(sibRel)) continue;
      const c = countHot(readSafe(sib));
      if (c > 0) refs.push({ file: sibRel, count: c });
    }

    const total = refs.reduce((s, r) => s + r.count, 0);
    if (total > 1) failures.push({ file: pageRel, count: total, refs });
  }

  if (failures.length === 0) {
    console.log(`[hot-lint] PASS  scanned ${routePages.length} route(s); brut grammar holds.`);
    return 0;
  }

  // Failure path. Honor override if the commit message asks for it.
  const overrideReason = overrideRequested(getCommitMessage());
  for (const f of failures) {
    const detail = f.refs.length > 1
      ? ` (${f.refs.map(r => `${r.file}:${r.count}`).join(', ')})`
      : '';
    console.error(
      `[hot-lint] FAIL  ${f.file} contains ${f.count} --brut-hot references${detail}. ` +
      `Brut grammar allows ≤ 1 hot element per screen. ` +
      `Reduce, or move shared sites to tokens-brutalist.css.`
    );
  }

  if (overrideReason) {
    console.warn(`[hot-lint] OVERRIDE used: "${overrideReason}". Recorded in commit message.`);
    return 0;
  }

  console.error(
    `\n[hot-lint] To override for this commit, add to your commit message:\n` +
    `   [lint:hot-override: <one-line reason>]`
  );
  return 1;
}

process.exit(main());
