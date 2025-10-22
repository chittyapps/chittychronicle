#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * Batch register manifests with ChittyRegistry.
 * Env:
 *   CHITTYREGISTRY_BASE_URL
 *   CHITTYREGISTRY_TOKEN   (bearer token with permission to register services)
 * Args:
 *   --dir <path>  directory of manifests (default: reports/manifests)
 */

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const REG = process.env.CHITTYREGISTRY_BASE_URL || '';
const TOKEN = process.env.CHITTYREGISTRY_TOKEN || '';
if (!REG || !TOKEN) {
  console.error('CHITTYREGISTRY_BASE_URL and CHITTYREGISTRY_TOKEN are required');
  process.exit(1);
}
const dir = arg('--dir', path.resolve(process.cwd(), 'reports', 'manifests'));

function listJsonFiles(d) {
  try {
    return fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => path.join(d, f));
  } catch {
    return [];
  }
}

async function postManifest(man) {
  const url = new URL('/api/v1/services/register', REG).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(man),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${text}`);
  }
  return res.json().catch(() => ({}));
}

async function main() {
  const files = [
    ...listJsonFiles(dir),
    ...listJsonFiles(path.join(dir, 'local')),
  ];
  if (files.length === 0) {
    console.error('No manifest files found in', dir);
    process.exit(1);
  }
  const results = [];
  for (const f of files) {
    try {
      const obj = JSON.parse(fs.readFileSync(f, 'utf-8'));
      const out = await postManifest(obj);
      results.push({ file: f, ok: true, service: out?.service?.name || path.basename(f) });
      console.log(`✅ Registered ${path.basename(f)}`);
    } catch (e) {
      results.push({ file: f, ok: false, error: e?.message });
      console.error(`❌ Failed ${path.basename(f)}: ${e?.message}`);
    }
  }
  const reportsDir = path.resolve(process.cwd(), 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, 'BATCH_REGISTER_RESULTS.json'), JSON.stringify(results, null, 2));
}

main();

