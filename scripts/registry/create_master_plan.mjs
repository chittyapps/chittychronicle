#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const reportsDir = path.resolve(process.cwd(), 'reports');
const invPath = path.join(reportsDir, 'local-inventory.json');
const todoPath = path.join(reportsDir, 'REGISTRATION_TODO.md');
const coreDir = path.join(reportsDir, 'manifests');
const localDir = path.join(coreDir, 'local');
const outPath = path.join(reportsDir, 'MASTER_REGISTRATION_PLAN.md');

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return []; }
}

function indexManifests(dir) {
  const map = new Map();
  try {
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json')) continue;
      const base = f.replace(/\.json$/, '').toLowerCase();
      map.set(base, path.join(dir, f));
    }
  } catch {}
  return map;
}

function closeMatch(name, maps) {
  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  for (const m of maps) {
    for (const [k, p] of m.entries()) {
      const kk = k.replace(/[^a-z0-9]+/g, '');
      if (kk.includes(key) || key.includes(kk)) return p;
    }
  }
  return null;
}

function main() {
  const inv = readJSON(invPath);
  const coreMap = indexManifests(coreDir);
  const localMap = indexManifests(localDir);
  const lines = [
    '# Master Registration Plan',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'This plan lists local services/apps/tools missing manifests with suggested stub files to use for registration.',
    '',
  ];
  let i = 0;
  for (const item of inv) {
    if (!item?.actions?.create_registry_manifest) continue;
    if (++i > 50) break;
    const match = closeMatch(item.name || path.basename(item.path), [localMap, coreMap]);
    lines.push(`- ${item.path} • ${item.kind}`);
    lines.push(`  - stub: ${match ? match : '(create new with scripts/registry/generate_manifest.mjs)'}`);
    lines.push(`  - next: copy stub to repo as server/registry-manifest.json, expose /.well-known/service-manifest.json, register in Registry`);
  }
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`✅ Wrote ${outPath}`);
}

main();

