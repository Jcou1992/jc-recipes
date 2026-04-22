#!/usr/bin/env node
/**
 * Test optimization gate.
 *
 * Invoked by .githooks/pre-commit and .github/workflows/test-gate.yml.
 * Input: a list of changed test file paths (argv) OR the script will
 * compute the diff itself if argv is empty.
 *
 * Layers (fast-to-slow, each can FAIL the gate):
 *   1. Deterministic heuristics
 *        - Duplicate test title (Jaccard >= DUP_THRESHOLD vs any existing test)
 *        - Single-assertion test in a describe with >= 3 single-assertion siblings
 *        - Form-fill e2e setup when seedRecipe() helper exists
 *        - Missing tag on e2e test (must have one of @smoke/@regression/@mobile/@cross-browser)
 *        - Suite budget delta (vs .test-gate/baseline.json) — soft warn if baseline absent
 *   2. Claude analysis (only if `claude` on PATH and gate not already failed)
 *
 * Override: if the HEAD commit message (or --commit-msg arg) contains
 *   [test-gate-override: <reason>]
 * the gate emits a warning and records the override but exits 0.
 *
 * Always writes .test-gate/last-report.md.
 */
import fs      from 'node:fs';
import path    from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT            = process.cwd();
const GATE_DIR        = path.join(ROOT, '.test-gate');
const BASELINE_PATH   = path.join(GATE_DIR, 'baseline.json');
const REPORT_PATH     = path.join(GATE_DIR, 'last-report.md');
const OVERRIDE_LOG    = path.join(GATE_DIR, 'overrides.log');
const CONFIG_PATH     = path.join(GATE_DIR, 'config.json');

const DEFAULT_CONFIG = {
  dupJaccardThreshold:          0.85,
  dupJaccardWarnThreshold:      0.70,
  singleAssertSiblingThreshold: 3,
  maxNewTestsPerFile:           1,
  requiredE2eTags:              ['@smoke', '@regression', '@mobile', '@cross-browser'],
  claudeTimeoutMs:              30_000,
};

const CONFIG = {
  ...DEFAULT_CONFIG,
  ...(fs.existsSync(CONFIG_PATH) ? JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) : {}),
};

// ── Report state ──────────────────────────────────────────────────────────────

/** @type {{level:'block'|'warn'|'info', code:string, file:string, message:string}[]} */
const findings = [];
const metrics  = { added: 0, modified: 0, deleted: 0, addedTitles: [], removedTitles: [] };

function block(code, file, message) { findings.push({ level: 'block', code, file, message }); }
function warn (code, file, message) { findings.push({ level: 'warn',  code, file, message }); }
function info (code, file, message) { findings.push({ level: 'info',  code, file, message }); }

// ── Utilities ─────────────────────────────────────────────────────────────────

function git(...args) {
  try { return execFileSync('git', args, { encoding: 'utf8', cwd: ROOT }).trim(); }
  catch { return ''; }
}

function isTestFile(p) {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(p);
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8'); } catch { return null; }
}

/** Extract top-level test()/it() titles from source text. Tolerant of tagged titles. */
function extractTestTitles(src) {
  const titles = [];
  // Direct form: `test('X'`, `it("X"`, `test.skip("X"` — first string arg is the title.
  const reDirect = /\b(?:test|it)(?:\.(?:skip|only|todo|fixme|concurrent))?\s*\(\s*(['"`])((?:\\.|(?!\1).)*?)\1/g;
  let m;
  while ((m = reDirect.exec(src)) !== null) titles.push(m[2]);

  // Chain form: `test.each(...)<optional generics>(` then first string arg is the title.
  // Walk manually because the `each` table may contain nested braces/strings.
  const reEachStart = /\b(?:test|it)\.each\s*(?:<[^>]+>)?\s*\(/g;
  while ((m = reEachStart.exec(src)) !== null) {
    let i = m.index + m[0].length;
    let depth = 1;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === '(' || c === '[' || c === '{') depth++;
      else if (c === ')' || c === ']' || c === '}') depth--;
      else if (c === '"' || c === "'" || c === '`') {
        const end = src.indexOf(c, i + 1);
        i = end === -1 ? src.length : end;
      }
      i++;
    }
    // Skip whitespace, expect `(`
    while (i < src.length && /\s/.test(src[i])) i++;
    if (src[i] !== '(') continue;
    i++;
    while (i < src.length && /\s/.test(src[i])) i++;
    const quote = src[i];
    if (quote !== '"' && quote !== "'" && quote !== '`') continue;
    const end = src.indexOf(quote, i + 1);
    if (end === -1) continue;
    titles.push(src.slice(i + 1, end));
  }
  return titles;
}

/** Jaccard similarity of bigram sets (cheap, tolerant to word-order swaps). */
function normalizeTitle(t) {
  return t
    .replace(/@\w[\w-]*/g, '')        // strip tags
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 1)
    .join(' ');
}

function bigrams(s) {
  const out = new Set();
  const norm = ' ' + normalizeTitle(s) + ' ';
  for (let i = 0; i < norm.length - 1; i++) out.add(norm.slice(i, i + 2));
  return out;
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  const inter = new Set([...a].filter(x => b.has(x))).size;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
}

/** Extract test() bodies paired with titles so we can inspect assert counts. */
function extractTestBlocks(src) {
  const blocks = [];
  const re = /\b(test|it)(?:\.\w+)?\s*\(\s*(['"`])((?:\\.|(?!\2).)*?)\2\s*,\s*(async\s*)?\([^)]*\)\s*=>\s*\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index + m[0].length;
    // Walk braces from the opening `{`
    let depth = 1, i = start;
    while (i < src.length && depth > 0) {
      const c = src[i];
      if (c === '{') depth++;
      else if (c === '}') depth--;
      else if (c === '"' || c === "'" || c === '`') {
        const end = src.indexOf(c, i + 1);
        i = end === -1 ? src.length : end;
      }
      i++;
    }
    blocks.push({ title: m[3], body: src.slice(start, i - 1) });
  }
  return blocks;
}

function countExpects(body) {
  return (body.match(/\bexpect\s*\(/g) || []).length;
}

// ── Load corpus of existing test titles ───────────────────────────────────────

function allTestFiles() {
  const out = git('ls-files').split('\n').filter(isTestFile);
  return out.filter(f => fs.existsSync(f));
}

function loadExistingTitles(excludeFiles = new Set()) {
  /** @type {{title:string, file:string}[]} */
  const acc = [];
  for (const f of allTestFiles()) {
    if (excludeFiles.has(f)) continue;
    const src = readFileSafe(f);
    if (!src) continue;
    for (const t of extractTestTitles(src)) acc.push({ title: t, file: f });
  }
  return acc;
}

// ── Heuristic layer ───────────────────────────────────────────────────────────

function checkDuplicates(changedFiles, newTitlesByFile) {
  const existingCorpus = loadExistingTitles(new Set(changedFiles));
  const existingBigrams = existingCorpus.map(e => ({ ...e, bi: bigrams(e.title) }));

  for (const [file, titles] of Object.entries(newTitlesByFile)) {
    for (const title of titles) {
      const tb = bigrams(title);
      let best = { score: 0, title: '', file: '' };
      for (const e of existingBigrams) {
        const s = jaccard(tb, e.bi);
        if (s > best.score) best = { score: s, title: e.title, file: e.file };
      }
      if (best.score >= CONFIG.dupJaccardThreshold) {
        block('DUPLICATE_TITLE', file,
          `New test "${title}" is near-duplicate (score ${best.score.toFixed(2)}) of "${best.title}" in ${best.file}. Merge or consolidate.`);
      } else if (best.score >= CONFIG.dupJaccardWarnThreshold) {
        warn('POSSIBLE_DUPLICATE', file,
          `New test "${title}" has similarity ${best.score.toFixed(2)} with "${best.title}" in ${best.file}. Consider consolidating.`);
      }
    }
  }
}

function checkSingleAssertionPattern(changedFiles) {
  for (const file of changedFiles) {
    const src = readFileSafe(file);
    if (!src) continue;
    const blocks = extractTestBlocks(src);
    if (blocks.length < CONFIG.singleAssertSiblingThreshold) continue;

    const singleAssertBlocks = blocks.filter(b => countExpects(b.body) === 1);
    // Flag only when MAJORITY of sibling tests are single-assert — that's the
    // pattern that screams "use test.each".
    if (singleAssertBlocks.length >= CONFIG.singleAssertSiblingThreshold &&
        singleAssertBlocks.length >= blocks.length / 2) {
      block('PARAMETERIZABLE', file,
        `${singleAssertBlocks.length} of ${blocks.length} tests in this file have a single expect(). Collapse to a test.each table.`);
    }
  }
}

function checkE2eFormFillSeeding(changedFiles) {
  const helperPath = path.join(ROOT, 'tests/e2e/helpers.ts');
  const helperSrc  = readFileSafe(helperPath);
  const hasSeed    = helperSrc && /export\s+(async\s+)?function\s+seedRecipe\b/.test(helperSrc);
  if (!hasSeed) return;

  for (const file of changedFiles) {
    if (!file.includes('tests/e2e/')) continue;
    if (file.endsWith('helpers.ts') || file.endsWith('global.setup.ts')) continue;
    const src = readFileSafe(file);
    if (!src) continue;

    const blocks = extractTestBlocks(src);
    for (const b of blocks) {
      const gotoNew    = /page\.goto\(['"`]\/recipes\/new/.test(b.body);
      const fillsName  = /#name['"`]\)\.fill/.test(b.body) || /\.locator\(['"`]#name['"`]\)/.test(b.body);
      const usesSeed   = /\bseedRecipe\s*\(/.test(b.body);
      // Exception: tests whose JOB is the create-via-form UI (signal via title).
      // Paste/preview/markdown flows must drive the form — that IS the behavior
      // under test, and cannot be seeded via API.
      const isCreateUiTest = /\bcreate\s+via\s+form\b/i.test(b.title) ||
                             /manual\s+tab/i.test(b.title) ||
                             /\b(paste|preview|markdown\s+tab|import\s+button)\b/i.test(b.title);
      if (gotoNew && fillsName && !usesSeed && !isCreateUiTest) {
        block('FORM_FILL_SEEDING', file,
          `Test "${b.title}" seeds data by driving the /recipes/new form. Use seedRecipe() — the API path is ~30× faster.`);
      }
    }
  }
}

function checkE2eTagging(changedFiles) {
  for (const file of changedFiles) {
    if (!file.includes('tests/e2e/')) continue;
    if (file.endsWith('global.setup.ts') || file.endsWith('helpers.ts')) continue;
    const src = readFileSafe(file);
    if (!src) continue;
    for (const title of extractTestTitles(src)) {
      const matched = CONFIG.requiredE2eTags.filter(t => title.includes(t));
      if (matched.length !== 1) {
        block('MISSING_OR_MULTIPLE_TAGS', file,
          `Test "${title}" must have exactly one of ${CONFIG.requiredE2eTags.join(', ')} — found ${matched.length}.`);
      }
    }
  }
}

function checkBudget(changedFiles, newTitlesByFile) {
  if (!fs.existsSync(BASELINE_PATH)) {
    info('NO_BASELINE', '(global)',
      `No .test-gate/baseline.json — budget check skipped. Run \`node scripts/test-gate.mjs --bootstrap\` to create one.`);
    return;
  }
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  for (const [file, titles] of Object.entries(newTitlesByFile)) {
    const current = extractTestTitles(readFileSafe(file) ?? '');
    const prevCount = baseline.fileCounts?.[file] ?? 0;
    const added = Math.max(0, current.length - prevCount);
    if (added > CONFIG.maxNewTestsPerFile) {
      block('BUDGET_EXCEEDED', file,
        `This file gained ${added} tests (baseline ${prevCount} → now ${current.length}). Cap is ${CONFIG.maxNewTestsPerFile}. Merge/parameterize first, then widen the baseline.`);
    }
    metrics.addedTitles.push(...titles);
  }
}

// ── Claude escalation (optional) ──────────────────────────────────────────────

function claudeAvailable() {
  const r = spawnSync('which', ['claude'], { encoding: 'utf8' });
  return r.status === 0 && r.stdout.trim().length > 0;
}

function runClaudeAnalysis(changedFiles, newTitlesByFile) {
  if (!claudeAvailable()) {
    info('CLAUDE_UNAVAILABLE', '(global)',
      `claude CLI not found on PATH. Heuristic-only gating in effect.`);
    return;
  }
  if (findings.some(f => f.level === 'block')) {
    info('CLAUDE_SKIPPED', '(global)', `Heuristic layer already blocking — skipped Claude escalation.`);
    return;
  }

  const prompt = [
    'You are a test-suite gatekeeper. Evaluate whether each listed new test earns its place in the suite.',
    'Reply ONLY with JSON matching this schema:',
    '{"verdicts":[{"file":"...","title":"...","duplicateOf":null|"...","canParameterizeWith":null|"...","coverageValue":"high"|"med"|"low","rationale":"..."}]}',
    '',
    'New tests:',
  ];
  for (const [file, titles] of Object.entries(newTitlesByFile)) {
    for (const t of titles) prompt.push(`- ${file}: ${t}`);
  }
  prompt.push('');
  prompt.push('Existing titles in the repo (abbreviated):');
  const corpus = loadExistingTitles(new Set(changedFiles)).slice(0, 200);
  for (const e of corpus) prompt.push(`- ${e.file}: ${e.title}`);

  const r = spawnSync('claude', ['-p', '--output-format', 'json'], {
    input: prompt.join('\n'),
    encoding: 'utf8',
    timeout: CONFIG.claudeTimeoutMs,
  });
  if (r.status !== 0 || !r.stdout) {
    info('CLAUDE_ERROR', '(global)',
      `Claude call failed or timed out (${r.status ?? 'timeout'}). Heuristic-only verdict stands.`);
    return;
  }
  let parsed;
  try { parsed = JSON.parse(r.stdout); }
  catch { info('CLAUDE_PARSE_ERROR', '(global)', `Could not parse Claude JSON output.`); return; }

  const body = parsed.result ?? parsed.content ?? parsed;
  let verdicts;
  try {
    const match = typeof body === 'string' ? body.match(/\{[\s\S]*\}/) : null;
    verdicts = (typeof body === 'object' ? body : JSON.parse(match ? match[0] : '{}')).verdicts ?? [];
  } catch { verdicts = []; }

  for (const v of verdicts) {
    if (v.duplicateOf) {
      block('CLAUDE_DUPLICATE', v.file,
        `Claude judges "${v.title}" as a duplicate of "${v.duplicateOf}". Rationale: ${v.rationale}`);
    } else if (v.coverageValue === 'low') {
      warn('CLAUDE_LOW_VALUE', v.file,
        `Claude judges "${v.title}" low-value. ${v.canParameterizeWith ? `Consider parameterizing with "${v.canParameterizeWith}". ` : ''}${v.rationale}`);
    }
  }
}

// ── Override handling ─────────────────────────────────────────────────────────

function getCommitMessage() {
  const arg = process.argv.find(a => a.startsWith('--commit-msg='));
  if (arg) return arg.slice('--commit-msg='.length);
  const envMsg = process.env.GATE_COMMIT_MSG;
  if (envMsg) return envMsg;
  // For pre-commit hook, the message hasn't been written yet — skip.
  return '';
}

function overrideRequested(msg) {
  const m = msg.match(/\[test-gate-override:\s*([^\]]+)\]/);
  return m ? m[1].trim() : null;
}

// ── Report ────────────────────────────────────────────────────────────────────

function writeReport(args) {
  fs.mkdirSync(GATE_DIR, { recursive: true });
  const lines = [];
  lines.push(`# Test Gate Report`);
  lines.push(``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## Inputs`);
  for (const f of args.changedFiles) lines.push(`- changed: \`${f}\``);
  lines.push(``);
  lines.push(`## Metrics`);
  lines.push(`- new test titles detected: ${metrics.addedTitles.length}`);
  lines.push(`- files analyzed: ${args.changedFiles.length}`);
  lines.push(``);
  lines.push(`## Findings`);
  if (findings.length === 0) {
    lines.push(`- _No findings._`);
  } else {
    for (const f of findings) {
      const badge = f.level === 'block' ? '🛑' : f.level === 'warn' ? '⚠️' : 'ℹ️';
      lines.push(`- ${badge} **[${f.code}]** \`${f.file}\` — ${f.message}`);
    }
  }
  lines.push(``);
  lines.push(`## Verdict: ${args.verdict}`);
  fs.writeFileSync(REPORT_PATH, lines.join('\n'));
}

function appendOverrideLog(reason, changedFiles) {
  fs.mkdirSync(GATE_DIR, { recursive: true });
  fs.appendFileSync(OVERRIDE_LOG,
    `${new Date().toISOString()}\treason=${JSON.stringify(reason)}\tfiles=${changedFiles.join(',')}\n`);
}

// ── Bootstrap mode ────────────────────────────────────────────────────────────

function bootstrapBaseline() {
  const fileCounts = {};
  for (const f of allTestFiles()) {
    const src = readFileSafe(f);
    if (!src) continue;
    fileCounts[f] = extractTestTitles(src).length;
  }
  const baseline = {
    generatedAt: new Date().toISOString(),
    fileCounts,
    totals: {
      jestFiles:       Object.keys(fileCounts).filter(f => f.includes('__tests__')).length,
      playwrightFiles: Object.keys(fileCounts).filter(f => f.includes('tests/e2e')).length,
    },
  };
  fs.mkdirSync(GATE_DIR, { recursive: true });
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(baseline, null, 2));
  console.log(`Wrote baseline to ${BASELINE_PATH}:\n${JSON.stringify(baseline, null, 2)}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

function collectChangedFiles() {
  const argFiles = process.argv.slice(2).filter(a => !a.startsWith('-') && isTestFile(a));
  if (argFiles.length > 0) return argFiles;
  // Fallback: staged changes
  const staged = git('diff', '--cached', '--name-only', '--diff-filter=AM').split('\n');
  return staged.filter(isTestFile);
}

function main() {
  if (process.argv.includes('--bootstrap')) { bootstrapBaseline(); return; }

  const changedFiles = collectChangedFiles();
  if (changedFiles.length === 0) {
    console.log('[test-gate] no test files changed — skipping.');
    return;
  }
  console.log(`[test-gate] analyzing ${changedFiles.length} test file(s)...`);

  const newTitlesByFile = {};
  for (const f of changedFiles) {
    const src = readFileSafe(f);
    newTitlesByFile[f] = src ? extractTestTitles(src) : [];
    metrics.addedTitles.push(...newTitlesByFile[f]);
  }

  try { checkDuplicates(changedFiles, newTitlesByFile); }           catch (e) { warn('HEURISTIC_ERROR', '(global)', `duplicate check: ${e.message}`); }
  try { checkSingleAssertionPattern(changedFiles); }                catch (e) { warn('HEURISTIC_ERROR', '(global)', `single-assert check: ${e.message}`); }
  try { checkE2eFormFillSeeding(changedFiles); }                    catch (e) { warn('HEURISTIC_ERROR', '(global)', `form-fill check: ${e.message}`); }
  try { checkE2eTagging(changedFiles); }                            catch (e) { warn('HEURISTIC_ERROR', '(global)', `tag check: ${e.message}`); }
  try { checkBudget(changedFiles, newTitlesByFile); }               catch (e) { warn('HEURISTIC_ERROR', '(global)', `budget check: ${e.message}`); }
  try { runClaudeAnalysis(changedFiles, newTitlesByFile); }         catch (e) { warn('CLAUDE_ERROR',    '(global)', `claude layer: ${e.message}`); }

  const blocking = findings.filter(f => f.level === 'block');
  const commitMsg = getCommitMessage();
  const overrideReason = overrideRequested(commitMsg);

  let verdict = blocking.length === 0 ? 'PASS' : 'BLOCK';
  if (blocking.length > 0 && overrideReason) {
    appendOverrideLog(overrideReason, changedFiles);
    verdict = `PASS (OVERRIDE: ${overrideReason})`;
    warn('OVERRIDE_USED', '(global)', `Gate bypassed via commit-message override: "${overrideReason}". Recorded to .test-gate/overrides.log.`);
  }

  writeReport({ changedFiles, verdict });

  // Console summary
  for (const f of findings) {
    const badge = f.level === 'block' ? '🛑 BLOCK' : f.level === 'warn' ? '⚠️  WARN ' : 'ℹ️  INFO ';
    console.log(`${badge}  [${f.code}] ${f.file} — ${f.message}`);
  }
  console.log(`\n[test-gate] verdict: ${verdict}  (full report: ${path.relative(ROOT, REPORT_PATH)})`);

  if (verdict.startsWith('BLOCK')) process.exit(1);
}

main();
