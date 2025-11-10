#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

const reportsDir = path.resolve(process.cwd(), 'reports');
const inputPath = path.join(reportsDir, 'local-inventory.json');
const outDir = path.join(reportsDir, 'manifests', 'local');

function titleCase(name) {
  return name
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

function nsSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'service';
}

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error('No local-inventory.json found at', inputPath);
    process.exit(0);
  }
  fs.mkdirSync(outDir, { recursive: true });
  // Clean stale stubs to avoid validating old, filtered names
  try {
    for (const f of fs.readdirSync(outDir)) {
      if (f.endsWith('.json')) fs.unlinkSync(path.join(outDir, f));
    }
  } catch {}
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const items = Array.isArray(data) ? data : [];
  const limit = parseInt(process.env.LIMIT || '20', 10);
  let count = 0;
  for (const item of items) {
    if (!item?.actions?.create_registry_manifest) continue;
    const nm = (item.name || '').toLowerCase();
    // Skip non-service env dirs and odd long path-derived names
    if (['venv','__pycache__','bin','lib','.venv','.git','.cache'].some(k => nm.includes(k))) continue;
    if (nm === 'src' || nm === 'server') continue;
    if ((item.path || '').includes('/projects/-Users-')) continue;
    if ((item.name || '').length > 40) continue;
    // Prefer items starting with chitty* or known namespaces; skip overly generic names
    if (!/^chitty/.test(nm) && !/mcp/.test(nm) && !/connect/.test(nm) && !/contextual/.test(nm)) continue;
    const baseName = titleCase(item.name.startsWith('chitty') ? item.name : `chitty ${item.name}`);
    const name = baseName.startsWith('Chitty') ? baseName : `Chitty${baseName}`;
    const namespace = `@chittyapps/${nsSlug(item.name)}`;
    const type = item.kind === 'mcp' ? 'mcp' : item.kind === 'worker-service' ? 'worker' : 'service';
    const homepage = item.recommended?.ui ? `https://${item.recommended.ui}` : '';
    const args = [
      'scripts/registry/generate_manifest.mjs',
      '--name', name,
      '--namespace', namespace,
      '--type', type,
      '--homepage', homepage,
      '--out', path.join(outDir, `${name}.json`),
    ];
    if (item.recommended?.ui) args.push('--ui', item.recommended.ui);
    if (item.recommended?.api) args.push('--api', item.recommended.api);
    if (item.recommended?.mcp) args.push('--mcp', item.recommended.mcp);
    const r = spawnSync('node', args, { stdio: 'inherit' });
    if (r.status !== 0) process.exit(r.status || 1);
    count++; if (count >= limit) break;
  }
  console.log(`✅ Wrote up to ${count} local manifest stubs to ${outDir}`);
}

main();
