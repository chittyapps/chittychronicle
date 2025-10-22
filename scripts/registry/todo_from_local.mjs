#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const reportsDir = path.resolve(process.cwd(), 'reports');
const inputPath = path.join(reportsDir, 'local-inventory.json');
const outPath = path.join(reportsDir, 'REGISTRATION_TODO.md');

function main() {
  if (!fs.existsSync(inputPath)) {
    console.error('No local-inventory.json found.');
    process.exit(0);
  }
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const items = Array.isArray(data) ? data : [];
  const missing = items.filter(x => x?.actions?.create_registry_manifest);
  const lines = [
    '# Registration TODO (from local inventory)',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Legend: service path • kind • actions',
    '',
  ];
  for (const item of missing.slice(0, 200)) {
    lines.push(`- ${item.path} • ${item.kind}`);
    lines.push(`  - manifest: ${item.hasRegistryManifest ? 'present' : 'missing'}`);
    if (item.recommended?.ui) lines.push(`  - ui: ${item.recommended.ui}`);
    if (item.recommended?.api) lines.push(`  - api: ${item.recommended.api}`);
    if (item.recommended?.mcp) lines.push(`  - mcp: ${item.recommended.mcp}`);
    lines.push(`  - next: create manifest, add .well-known/service-manifest.json, register in Registry`);
  }
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`✅ Wrote ${missing.length} TODO entries (capped) to ${outPath}`);
}

main();

