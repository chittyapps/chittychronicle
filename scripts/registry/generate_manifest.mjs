#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * Generate a registry-manifest.json stub for a service.
 * Usage:
 *   node scripts/registry/generate_manifest.mjs \
 *     --name ChittyRegistry \
 *     --namespace @chittyos/registry \
 *     --type worker \
 *     --homepage https://registry.chitty.cc \
 *     --ui registry.chitty.cc \
 *     --api api.registry.chitty.cc \
 *     --mcp /registry \
 *     --out reports/manifests/ChittyRegistry.json
 */

function arg(name, def = '') {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : def;
}

const name = arg('--name');
const namespace = arg('--namespace', '@chittyapps/service');
const type = arg('--type', 'service');
const homepage = arg('--homepage', '');
const ui = arg('--ui', '');
const apiHost = arg('--api', '');
const mcpPath = arg('--mcp', '');
const out = arg('--out', path.join('reports', 'manifests', `${name || 'service'}.json`));

if (!name) {
  console.error('Missing --name');
  process.exit(1);
}

const envSlug = name.replace(/^Chitty/i, '').toUpperCase();

const owner = process.env.CHITTY_OWNER || 'ChittyOS';
const oncall = process.env.CHITTY_ONCALL || 'oncall@chitty.cc';
const dataClass = process.env.CHITTY_DATA_CLASS || 'Application';

const manifest = {
  service: {
    name,
    version: '1.0.0',
    type,
    namespace,
    registry: 'registry.chitty.cc',
    endpoint: '/api/v1/services',
    metadata: {
      description: `${name} service manifest stub`,
      author: 'ChittyOS',
      license: 'Proprietary',
      homepage: homepage || undefined,
      repository: { type: 'git', url: 'https://github.com/chittyos' },
      keywords: ['chittyos', 'service'],
      owner,
      on_call: oncall,
      data_class: dataClass,
    },
    capabilities: {
      domains: ['service'],
      protocols: ['https'],
      transport: ['http'],
      tools: mcpPath ? 1 : 0,
    },
    endpoints: {
      health: '/api/health',
      ...(mcpPath ? { mcp: `/api/mcp/*` } : {}),
    },
    dependencies: {
      router: '${CHITTYROUTER_BASE_URL}',
      registry: '${CHITTYREGISTRY_BASE_URL}',
      id: '${CHITTYID_BASE_URL}',
      verify: '${CHITTYVERIFY_BASE_URL}',
      certify: '${CHITTYCERTIFY_BASE_URL}',
      ledger: '${CHITTYLEDGER_BASE_URL}',
      chain: '${CHITTYCHAIN_BASE_URL}',
      assets: '${CHITTYASSETS_BASE_URL}',
    },
    requirements: {
      node: '>=18.0.0',
      service_token: `
        ${'${'}CHITTY${envSlug}_SERVICE_TOKEN${'}'}`.trim(),
    },
    api: {
      register: {
        method: 'POST', endpoint: '/api/v1/services/register',
        payload: { service: name, version: '1.0.0', namespace },
      },
      status: { method: 'GET', endpoint: `/api/v1/services/${name}/status` },
      tools: { method: 'GET', endpoint: `/api/v1/services/${name}/tools` },
    },
    health: { endpoint: '/api/health', interval: 60000, timeout: 5000 },
    hosts: {
      ui: ui || undefined,
      api: apiHost || undefined,
      mcp: mcpPath || undefined,
    },
  },
};

const outDir = path.dirname(out);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(out, JSON.stringify(manifest, null, 2));
console.log(`✅ Wrote manifest stub: ${out}`);
