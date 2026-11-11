#!/usr/bin/env node
/**
 * docs/api/openapi.json → reports/generated/endpoints.tex (appendix "API endpoints")
 * and reports/data/api.json (counts for the report and slides).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'docs/api/openapi.json'), 'utf8'));

const tex = (value) =>
  String(value)
    .replaceAll('\\', '\\textbackslash{}')
    .replace(/([&%$#_{}])/g, '\\$1');

const operations = Object.entries(doc.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, op]) => ({
    method: method.toUpperCase(),
    path,
    summary: op.summary ?? '',
    tag: op.tags?.[0] ?? '',
    auth: (op.security ?? [])
      .flatMap((entry) => Object.keys(entry))
      .map((name) => (name.toLowerCase().includes('bearer') ? 'Bearer' : 'cookie'))
      .join(', '),
  })),
);

const tagOrder = doc.tags.map((t) => t.name);
operations.sort(
  (a, b) => tagOrder.indexOf(a.tag) - tagOrder.indexOf(b.tag) || a.path.localeCompare(b.path),
);

const rows = operations.map(
  (op) =>
    `\\texttt{${op.method}} & \\texttt{${tex(op.path).replaceAll('/', '/\\allowbreak{}')}} & ${tex(op.summary)} & ${op.auth || '—'}\\\\`,
);

mkdirSync(join(root, 'reports/generated'), { recursive: true });
writeFileSync(
  join(root, 'reports/generated/endpoints.tex'),
  [
    '\\begin{longtable}{@{}l L{6.4cm} L{5.4cm} c@{}}',
    '\\toprule',
    'Метод & Шлях & Опис & Доступ\\\\',
    '\\midrule\\endhead',
    ...rows,
    '\\bottomrule',
    '\\end{longtable}',
    '',
  ].join('\n'),
);

const byTag = Object.fromEntries(
  tagOrder.map((tag) => [tag, operations.filter((op) => op.tag === tag).length]),
);
mkdirSync(join(root, 'reports/data'), { recursive: true });
writeFileSync(
  join(root, 'reports/data/api.json'),
  `${JSON.stringify({ operations: operations.length, paths: Object.keys(doc.paths).length, tags: byTag }, null, 2)}\n`,
);
console.log(`✓ reports/generated/endpoints.tex — ${operations.length} operations`, byTag);
