#!/usr/bin/env node
/**
 * Test journal for the stage-4 report.
 * Runs unit (with coverage), integration and E2E tests with JSON output → reports/data/*.json,
 * then renders LaTeX tables → reports/generated/{summary,unit,integration,e2e,coverage}.tex.
 * Descriptions come from the test plan in docs/stage4.md (rows "| UT-01 | … |").
 *
 *   node scripts/test-report.mjs            run everything and render
 *   node scripts/test-report.mjs --no-run   render from the existing JSON only
 */
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = join(root, 'reports/data');
const outDir = join(root, 'reports/generated');
mkdirSync(dataDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

// ---------- run ----------

function run(label, command, cwd) {
  console.log(`\n▶ ${label}`);
  return spawnSync(command, { cwd, shell: true, stdio: 'inherit' }).status === 0;
}

if (!process.argv.includes('--no-run')) {
  const api = join(root, 'apps/api');
  run(
    'unit + coverage',
    `pnpm exec vitest run --reporter=default --reporter=json --outputFile.json=${dataDir}/unit.json ` +
      `--coverage --coverage.reporter=text --coverage.reporter=json-summary ` +
      `--coverage.reportsDirectory=${dataDir}/coverage-unit`,
    api,
  );
  run(
    'integration',
    `pnpm exec vitest run --config vitest.config.int.ts --reporter=default --reporter=json ` +
      `--outputFile.json=${dataDir}/integration.json --coverage --coverage.reporter=json-summary ` +
      `--coverage.reportsDirectory=${dataDir}/coverage-int`,
    api,
  );
  run('e2e (Playwright)', 'pnpm exec playwright test --project=e2e', join(root, 'apps/web'));
}

// ---------- parse ----------

const readJson = (file) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);

/** ID → description from the test plan tables in docs/stage4.md. */
function readPlan() {
  const plan = new Map();
  const md = readFileSync(join(root, 'docs/stage4.md'), 'utf8');
  for (const line of md.split('\n')) {
    const match = line.match(/^\|\s*((?:UT|IT|E2E)-\d+)\s*\|(.+)\|\s*$/);
    if (!match) continue;
    const cells = match[2].split('|').map((c) => c.trim().replaceAll('`', ''));
    plan.set(
      match[1],
      match[1].startsWith('UT')
        ? { module: cells[0], what: cells[1], rule: cells[2] }
        : { what: cells[0] },
    );
  }
  return plan;
}

const idOf = (title) => title.match(/^((?:UT|IT|E2E)-\d+)/)?.[1] ?? '—';
const byId = (a, b) =>
  a.id.localeCompare(b.id, 'en', { numeric: true }) || a.title.localeCompare(b.title);

function fromVitest(json) {
  if (!json) return null;
  const rows = json.testResults.flatMap((file) =>
    file.assertionResults.map((t) => ({
      id: idOf(t.title),
      title: t.title,
      suite: t.ancestorTitles[0] ?? '',
      status: t.status,
      ms: Math.round(t.duration ?? 0),
    })),
  );
  const end = Math.max(...json.testResults.map((f) => f.endTime ?? json.startTime));
  return {
    rows: rows.sort(byId),
    passed: json.numPassedTests,
    total: json.numTotalTests,
    seconds: (end - json.startTime) / 1000,
    startTime: json.startTime,
  };
}

function fromPlaywright(json) {
  if (!json) return null;
  const rows = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      const last = spec.tests[0]?.results.at(-1);
      rows.push({
        id: idOf(spec.title),
        title: spec.title,
        suite: 'Playwright',
        status: last?.status === 'passed' ? 'passed' : (last?.status ?? 'skipped'),
        ms: Math.round(last?.duration ?? 0),
      });
    }
    (suite.suites ?? []).forEach(walk);
  };
  json.suites.forEach(walk);
  return {
    rows: rows.sort(byId),
    passed: rows.filter((r) => r.status === 'passed').length,
    total: rows.length,
    seconds: json.stats.duration / 1000,
    startTime: Date.parse(json.stats.startTime),
  };
}

// ---------- render ----------

const tex = (value) =>
  String(value)
    .replaceAll('\\', '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1')
    .replaceAll('~', '\\textasciitilde{}')
    .replaceAll('^', '\\textasciicircum{}');

const statusCell = (status) =>
  status === 'passed' ? '\\textcolor{teal}{пройдено}' : `\\textcolor{red}{${tex(status)}}`;

function longtable(columns, header, rows) {
  return [
    `\\begin{longtable}{@{}${columns}@{}}`,
    '\\toprule',
    `${header.join(' & ')}\\\\`,
    '\\midrule\\endhead',
    ...rows.map((cells) => `${cells.join(' & ')}\\\\`),
    '\\bottomrule',
    '\\end{longtable}',
    '',
  ].join('\n');
}

const plan = readPlan();
const unit = fromVitest(readJson(join(dataDir, 'unit.json')));
const integration = fromVitest(readJson(join(dataDir, 'integration.json')));
const e2e = fromPlaywright(readJson(join(dataDir, 'e2e.json')));
const coverage = readJson(join(dataDir, 'coverage-unit/coverage-summary.json'));

if (unit) {
  writeFileSync(
    join(outDir, 'unit.tex'),
    longtable(
      'l L{4.8cm} L{3.7cm} c c r',
      ['ID', 'Що перевіряє', 'Модуль', 'Правило', 'Статус', 'мс'],
      unit.rows.map((r) => {
        const p = plan.get(r.id);
        return [
          r.id,
          tex(p?.what ?? r.title),
          tex(p?.module ?? r.suite),
          tex(p?.rule ?? '—'),
          statusCell(r.status),
          r.ms,
        ];
      }),
    ),
  );
}

for (const [name, result] of [
  ['integration', integration],
  ['e2e', e2e],
]) {
  if (!result) continue;
  writeFileSync(
    join(outDir, `${name}.tex`),
    longtable(
      'l L{10.6cm} c r',
      ['ID', 'Сценарій', 'Статус', 'мс'],
      result.rows.map((r) => [
        r.id,
        tex(plan.get(r.id)?.what ?? r.title),
        statusCell(r.status),
        r.ms,
      ]),
    ),
  );
}

const coverageInt = readJson(join(dataDir, 'coverage-int/coverage-summary.json'));

/** Lines covered / total per module (top-level folder of apps/api/src). */
function byModule(summary) {
  const modules = new Map();
  for (const [file, s] of Object.entries(summary ?? {})) {
    if (file === 'total') continue;
    const module = file.match(/\/src\/([^/]+)\//)?.[1] ?? 'app';
    const m = modules.get(module) ?? { covered: 0, total: 0 };
    m.covered += s.lines.covered;
    m.total += s.lines.total;
    modules.set(module, m);
  }
  return modules;
}

if (coverage) {
  const metrics = ['statements', 'branches', 'functions', 'lines'];
  const names = {
    statements: 'Інструкції',
    branches: 'Гілки',
    functions: 'Функції',
    lines: 'Рядки',
  };
  const pct = (m) => (m && m.total ? `${((m.covered / m.total) * 100).toFixed(0)}` : '—');
  const unitModules = byModule(coverage);
  const intModules = byModule(coverageInt);
  const allModules = [...new Set([...unitModules.keys(), ...intModules.keys()])].sort();
  const intTotal = (k) => (coverageInt ? coverageInt.total[k].pct.toFixed(1) : '—');
  writeFileSync(
    join(outDir, 'coverage.tex'),
    [
      '\\begin{tabular}[t]{@{}lrr@{}}',
      '\\toprule',
      'Метрика, \\% & Модульні & Інтеграційні\\\\',
      '\\midrule',
      ...metrics.map(
        (k) => `${names[k]} & ${coverage.total[k].pct.toFixed(1)} & ${intTotal(k)}\\\\`,
      ),
      '\\bottomrule',
      '\\end{tabular}',
      '',
      '\\medskip',
      '',
      '\\begin{tabular}[t]{@{}lrr@{}}',
      '\\toprule',
      'Модуль (рядки, \\%) & Модульні & Інтеграційні\\\\',
      '\\midrule',
      ...allModules.map(
        (module) =>
          `${tex(module)} & ${pct(unitModules.get(module))} & ${pct(intModules.get(module))}\\\\`,
      ),
      '\\bottomrule',
      '\\end{tabular}',
      '',
    ].join('\n'),
  );
}

let commit = '—';
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
} catch {
  /* not a git checkout */
}
const runAt = new Date(
  Math.max(...[unit, integration, e2e].filter(Boolean).map((r) => r.startTime)),
);
const runDate = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
}).format(runAt);

const suites = [
  ['Модульні (Vitest)', unit],
  ['Інтеграційні (Vitest + supertest)', integration],
  ['E2E (Playwright)', e2e],
].filter(([, r]) => r);

writeFileSync(
  join(outDir, 'summary.tex'),
  [
    '\\begin{tabular}{@{}lccr@{}}',
    '\\toprule',
    'Набір тестів & Пройдено & Усього & Час, с\\\\',
    '\\midrule',
    ...suites.map(
      ([name, r]) => `${name} & ${r.passed} & ${r.total} & ${r.seconds.toFixed(1)}\\\\`,
    ),
    '\\bottomrule',
    '\\end{tabular}',
    '',
    `\\smallskip\\par{\\small Прогін: ${tex(runDate)}, коміт \\texttt{${tex(commit)}}` +
      (coverage
        ? `, покриття рядків модульними тестами: ${coverage.total.lines.pct.toFixed(1)}\\,\\%`
        : '') +
      '.}',
    '',
  ].join('\n'),
);

const summary = {
  runAt: runAt.toISOString(),
  commit,
  unit: unit && { passed: unit.passed, total: unit.total, seconds: unit.seconds },
  integration: integration && {
    passed: integration.passed,
    total: integration.total,
    seconds: integration.seconds,
  },
  e2e: e2e && { passed: e2e.passed, total: e2e.total, seconds: e2e.seconds },
  coverage:
    coverage &&
    Object.fromEntries(
      ['statements', 'branches', 'functions', 'lines'].map((k) => [k, coverage.total[k].pct]),
    ),
  coverageIntegration:
    coverageInt &&
    Object.fromEntries(
      ['statements', 'branches', 'functions', 'lines'].map((k) => [k, coverageInt.total[k].pct]),
    ),
};
writeFileSync(join(dataDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);

console.log('\n✓ reports/generated/*.tex');
console.log(JSON.stringify(summary, null, 2));
const failed = suites.some(([, r]) => r.passed !== r.total);
process.exit(failed ? 1 : 0);
