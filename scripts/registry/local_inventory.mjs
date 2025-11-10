#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * Local Registry Inventory (read-only)
 * Scans a subset of ~/.claude for chitty-related services/apps/tools and
 * proposes registration actions. Writes JSON+MD under reports/.
 *
 * This performs static analysis only; no network calls.
 */

const HOME = process.env.HOME || process.env.USERPROFILE || '';
let ROOT = path.join(HOME, '.claude');

// CLI args: --root <path> --max-depth <n>
let MAX_DEPTH = 2;
let LIMIT = 500;
for (let i = 0; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a === '--root' && process.argv[i + 1]) {
    ROOT = process.argv[i + 1];
  }
  if (a === '--max-depth' && process.argv[i + 1]) {
    const n = parseInt(process.argv[i + 1], 10);
    if (!Number.isNaN(n)) MAX_DEPTH = n;
  }
  if (a === '--limit' && process.argv[i + 1]) {
    const n = parseInt(process.argv[i + 1], 10);
    if (!Number.isNaN(n)) LIMIT = n;
  }
}

let START_DIRS = [];
if (fs.existsSync(path.join(ROOT, 'connectors')) || fs.existsSync(path.join(ROOT, 'projects')) || fs.existsSync(path.join(ROOT, 'tools'))) {
  START_DIRS = [
    path.join(ROOT, 'connectors'),
    path.join(ROOT, 'projects'),
    path.join(ROOT, 'tools'),
  ];
} else {
  START_DIRS = [ROOT];
}

function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

function exists(p) {
  try { fs.accessSync(p, fs.constants.R_OK); return true; } catch { return false; }
}

function detectKind(dir) {
  const hasWrangler = exists(path.join(dir, 'wrangler.toml')) || exists(path.join(dir, '.wrangler'));
  const hasServer = exists(path.join(dir, 'server')) || exists(path.join(dir, 'src', 'index.js')) || exists(path.join(dir, 'index.js'));
  const hasPackage = exists(path.join(dir, 'package.json'));
  const hasRegistryManifest = exists(path.join(dir, 'registry-manifest.json')) || exists(path.join(dir, 'server', 'registry-manifest.json'));
  const looksMcp = /(^|\/)mcp[^/]*$/i.test(dir) || exists(path.join(dir, 'mcp.manifest.json'));

  let kind = 'unknown';
  if (hasWrangler) kind = 'worker-service';
  else if (looksMcp) kind = 'mcp';
  else if (hasServer) kind = 'service-app';
  else if (hasPackage) kind = 'node-app';

  return { kind, hasWrangler, hasServer, hasPackage, hasRegistryManifest, looksMcp };
}

function slugFromName(name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/^chitty/, '');
  return base || name.toLowerCase();
}

function recommend(name, info) {
  const slug = slugFromName(name);
  const ui = `${slug}.chitty.cc`;
  const api = `api.${slug}.chitty.cc`;
  const mcpPath = `/${slug}`;
  const missingManifest = !info.hasRegistryManifest;
  return {
    recommended: {
      ui, api,
      mcp: info.looksMcp || info.kind === 'worker-service' ? mcpPath : null,
      env: {
        base_url: `CHITTY${slug.toUpperCase()}_BASE_URL`,
        public_url: `CHITTY${slug.toUpperCase()}_PUBLIC_URL`,
        service_token: `CHITTY${slug.toUpperCase()}_SERVICE_TOKEN`,
      },
    },
    actions: {
      create_registry_manifest: missingManifest,
      add_well_known: true,
      register_in_registry: true,
    },
  };
}

function crawl(dir, depth = 0, maxDepth = 3, out = []) {
  if (depth > maxDepth) return out;
  const entries = safeReaddir(dir);
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const full = path.join(dir, ent.name);
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    if (ent.name.startsWith('.')) {
      // include hidden chitty/claude dirs, skip others
      if (!/^\.chitty/i.test(ent.name) && ent.name !== '.claude') continue;
    }
    if (!/chitty|mcp|connect|contextual/i.test(ent.name)) {
      if (!/chittyos|chittyapps|connectors|tools/i.test(dir)) continue;
    }

    const base = ent.name.toLowerCase();
    // skip typical env/artefact dirs
    if (['venv', '__pycache__', 'bin', 'lib', '.venv', '.git', '.cache'].includes(base)) continue;

    const info = detectKind(full);
    const hasInteresting = info.hasRegistryManifest || info.hasWrangler || info.hasServer || info.hasPackage || info.looksMcp;
    if (hasInteresting) {
      out.push({ path: full, name: ent.name, ...info, ...recommend(ent.name, info) });
    }

    crawl(full, depth + 1, maxDepth, out);
  }
  return out;
}

function writeReports(data) {
  const reportsDir = path.resolve(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const jsonPath = path.join(reportsDir, 'local-inventory.json');
  const capped = Array.isArray(data) ? data.slice(0, LIMIT) : data;
  fs.writeFileSync(jsonPath, JSON.stringify(capped, null, 2));

  const lines = [
    '# Local Registry Inventory (read-only)',
    '',
    `Root: ${ROOT}`,
    `Generated: ${new Date().toISOString()}`,
    '',
  ];
  for (const item of capped) {
    lines.push(`- ${item.name} — ${item.kind} — ${item.path}`);
    lines.push(`  - registry manifest: ${item.hasRegistryManifest ? 'present' : 'missing'}`);
    if (item.recommended?.ui) lines.push(`  - ui: ${item.recommended.ui}`);
    if (item.recommended?.api) lines.push(`  - api: ${item.recommended.api}`);
    if (item.recommended?.mcp) lines.push(`  - mcp: ${item.recommended.mcp}`);
    lines.push(`  - actions: create_manifest=${item.actions.create_registry_manifest}, register=${item.actions.register_in_registry}`);
  }
  fs.writeFileSync(path.join(reportsDir, 'LOCAL_INVENTORY.md'), lines.join('\n'));
  console.log(`✅ Wrote ${data.length} entries to reports/local-inventory.json and reports/LOCAL_INVENTORY.md`);
}

function main() {
  if (!exists(ROOT)) {
    console.error('~/.claude not found; skipping');
    process.exit(0);
  }
  let results = [];
  for (const start of START_DIRS) {
    if (!exists(start)) continue;
    results = crawl(start, 0, MAX_DEPTH, results);
  }
  const seen = new Set();
  const dedup = [];
  for (const r of results) {
    if (seen.has(r.path)) continue;
    seen.add(r.path);
    dedup.push(r);
  }
  writeReports(dedup);
}

main();
