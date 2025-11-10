#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

/**
 * Register ChittyChronicle in ChittyRegistry.
 * Env:
 *   CHITTYREGISTRY_BASE_URL   e.g. https://registry.chitty.cc
 *   CHITTYCHRONICLE_SERVICE_TOKEN  bearer token for registration
 */

const REG = process.env.CHITTYREGISTRY_BASE_URL;
const TOKEN = process.env.CHITTYCHRONICLE_SERVICE_TOKEN;
if (!REG || !TOKEN) {
  console.error('CHITTYREGISTRY_BASE_URL and CHITTYCHRONICLE_SERVICE_TOKEN are required');
  process.exit(1);
}

const manifestPath = path.resolve(process.cwd(), 'server', 'registry-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('registry-manifest.json not found at server/registry-manifest.json');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

const url = new URL('/api/v1/services/register', REG).toString();

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
  },
  body: JSON.stringify(manifest),
});

if (!res.ok) {
  const text = await res.text();
  console.error('Registration failed:', res.status, text);
  process.exit(2);
}

const out = await res.json().catch(() => ({}));
console.log('✅ Registered:', out.service?.name || 'ChittyChronicle');

