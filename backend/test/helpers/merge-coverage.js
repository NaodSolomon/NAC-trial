const fs = require('node:fs');
const path = require('node:path');

const backendRoot = path.resolve(__dirname, '../..');
const sources = ['coverage-unit', 'coverage-e2e', 'coverage-integration'];

function loadIstanbul() {
  const base = path.join(backendRoot, 'node_modules/.pnpm');
  const entry = fs
    .readdirSync(base)
    .find((name) => name.startsWith('istanbul-lib-coverage@'));
  if (!entry) throw new Error('istanbul-lib-coverage is not installed');
  return require(path.join(base, entry, 'node_modules/istanbul-lib-coverage'));
}

const libCoverage = loadIstanbul();
const map = libCoverage.createCoverageMap({});

const missing = [];
for (const dir of sources) {
  const file = path.join(backendRoot, dir, 'coverage-final.json');
  if (!fs.existsSync(file)) {
    missing.push(dir);
    continue;
  }
  map.merge(JSON.parse(fs.readFileSync(file, 'utf8')));
}

if (missing.length) {
  process.stderr.write(
    `Missing coverage from: ${missing.join(', ')}.\n` +
      'Run `pnpm test:coverage:all` so every suite contributes.\n',
  );
  process.exit(1);
}

const summary = map.getCoverageSummary();
const outputDirectory = path.join(backendRoot, 'coverage-merged');
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(
  path.join(outputDirectory, 'coverage-summary.json'),
  `${JSON.stringify({ total: summary.toJSON() }, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(outputDirectory, 'coverage-final.json'),
  `${JSON.stringify(map.toJSON())}\n`,
);

const thresholds = { statements: 80, branches: 70, functions: 80, lines: 80 };
const totals = summary.toJSON();
const rows = Object.keys(thresholds).map((key) => ({
  metric: key,
  pct: totals[key].pct,
  covered: totals[key].covered,
  total: totals[key].total,
  required: thresholds[key],
}));

process.stdout.write('\nMerged backend coverage (unit + e2e + integration)\n');
for (const row of rows) {
  const status = row.pct >= row.required ? 'ok  ' : 'FAIL';
  process.stdout.write(
    `  ${status} ${row.metric.padEnd(11)} ${String(row.pct).padStart(6)}%  ` +
      `(${row.covered}/${row.total})  required ${row.required}%\n`,
  );
}

const failed = rows.filter((row) => row.pct < row.required);
if (failed.length) {
  process.stderr.write(
    `\nCoverage below threshold: ${failed.map((row) => row.metric).join(', ')}\n`,
  );
  process.exit(1);
}
process.stdout.write('\n');
