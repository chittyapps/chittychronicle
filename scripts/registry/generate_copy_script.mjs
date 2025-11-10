#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const reportsDir = path.resolve(process.cwd(), 'reports');
const planPath = path.join(reportsDir, 'MASTER_REGISTRATION_PLAN.md');
const outPath = path.join(reportsDir, 'registry_copy.sh');

function parsePlan(p) {
  const txt = fs.readFileSync(p, 'utf-8');
  const lines = txt.split(/\r?\n/);
  const entries = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith('- ')) {
      // New entry
      const m = /^-\s+([^•]+)•\s+(.+)$/.exec(line);
      if (m) {
        if (current) entries.push(current);
        current = { path: m[1].trim(), kind: m[2].trim(), stub: null };
      }
    } else if (line.includes('  - stub:')) {
      const stub = line.split('  - stub:')[1].trim();
      if (current) current.stub = stub === '(create new with scripts/registry/generate_manifest.mjs)' ? null : stub;
    }
  }
  if (current) entries.push(current);
  return entries;
}

function main() {
  if (!fs.existsSync(planPath)) {
    console.error('No master plan found. Run: npm run registry:plan');
    process.exit(1);
  }
  const entries = parsePlan(planPath);
  const lines = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
    '',
    'echo "This script copies manifest stubs into target repos without modifying code. Review before running."',
    '',
  ];
  for (const e of entries) {
    if (!e.stub || !e.path) continue;
    const p = e.path;
    // Skip non-service paths (env/artefact/src)
    if (/\/venv\//.test(p) || /__pycache__/.test(p) || /\/bin\//.test(p) || /\/lib\//.test(p)) continue;
    if (/\/src\//.test(p)) continue;
    if (/\/projects\/-Users-/.test(p)) continue;
    const target = path.join(e.path, 'server', 'registry-manifest.json');
    lines.push(`echo "\n==> ${e.path}"`);
    lines.push(`mkdir -p ${JSON.stringify(path.dirname(target))}`);
    lines.push(`cp ${JSON.stringify(e.stub)} ${JSON.stringify(target)}`);
  }
  fs.writeFileSync(outPath, lines.join('\n'));
  fs.chmodSync(outPath, 0o755);
  console.log(`✅ Wrote ${outPath}`);
}

main();
