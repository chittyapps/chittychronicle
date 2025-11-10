#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from 'path';

const outDir = path.join('reports', 'manifests');

const defs = [
  { name: 'ChittyRegistry', namespace: '@chittyos/registry', type: 'worker', homepage: 'https://registry.chitty.cc', ui: 'registry.chitty.cc', api: 'api.registry.chitty.cc', mcp: '' },
  { name: 'ChittyRouter', namespace: '@chittyos/router', type: 'worker', homepage: 'https://router.chitty.cc', ui: 'router.chitty.cc', api: 'api.router.chitty.cc', mcp: '' },
  { name: 'ChittyAuth', namespace: '@chittyos/auth', type: 'worker', homepage: 'https://auth.chitty.cc', ui: 'auth.chitty.cc', api: 'api.auth.chitty.cc', mcp: '' },
  { name: 'ChittyID', namespace: '@chittyos/id', type: 'service', homepage: 'https://id.chitty.cc', ui: 'id.chitty.cc', api: 'api.id.chitty.cc', mcp: '' },
  { name: 'ChittyVerify', namespace: '@chittyos/verify', type: 'service', homepage: 'https://verify.chitty.cc', ui: 'verify.chitty.cc', api: 'api.verify.chitty.cc', mcp: '' },
  { name: 'ChittyCertify', namespace: '@chittyos/certify', type: 'service', homepage: 'https://certify.chitty.cc', ui: 'certify.chitty.cc', api: 'api.certify.chitty.cc', mcp: '' },
  { name: 'ChittyLedger', namespace: '@chittyos/ledger', type: 'service', homepage: 'https://ledger.chitty.cc', ui: 'ledger.chitty.cc', api: 'api.ledger.chitty.cc', mcp: '' },
  { name: 'ChittyChain', namespace: '@chittyos/chain', type: 'service', homepage: 'https://chain.chitty.cc', ui: 'chain.chitty.cc', api: 'api.chain.chitty.cc', mcp: '' },
  { name: 'ChittyAssets', namespace: '@chittyos/assets', type: 'service', homepage: 'https://assets.chitty.cc', ui: 'assets.chitty.cc', api: 'api.assets.chitty.cc', mcp: '' },
  { name: 'ChittyConnect', namespace: '@chittyos/connect', type: 'worker', homepage: 'https://connect.chitty.cc', ui: 'connect.chitty.cc', api: 'api.connect.chitty.cc', mcp: '/context' },
  { name: 'ChittyContextual', namespace: '@chittyapps/contextual', type: 'service', homepage: 'https://contextual.chitty.cc', ui: 'contextual.chitty.cc', api: 'api.contextual.chitty.cc', mcp: '/contextual' },
  { name: 'MCPChitty', namespace: '@chittyos/mcp-aggregator', type: 'mcp', homepage: 'https://mcp.chitty.cc', ui: 'mcp.chitty.cc', api: '', mcp: '/' },
  { name: 'ChittyCLI', namespace: '@chittyos/cli', type: 'client-tool', homepage: 'https://docs.chitty.cc/cli', ui: '', api: '', mcp: '' },
];

for (const d of defs) {
  const out = path.join(outDir, `${d.name}.json`);
  const args = [
    'scripts/registry/generate_manifest.mjs',
    '--name', d.name,
    '--namespace', d.namespace,
    '--type', d.type,
    '--homepage', d.homepage,
    ...(d.ui ? ['--ui', d.ui] : []),
    ...(d.api ? ['--api', d.api] : []),
    ...(d.mcp ? ['--mcp', d.mcp] : []),
    '--out', out,
  ];
  const r = spawnSync('node', args, { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status);
}
console.log(`✅ Core manifest stubs written to ${outDir}`);

