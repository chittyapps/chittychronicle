#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const base = path.resolve(process.cwd(), 'reports', 'manifests');
const dirs = [base, path.join(base, 'local')];
const out = path.resolve(process.cwd(), 'reports', 'MANIFEST_VALIDATION.json');

function list(d) {
  try { return fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => path.join(d, f)); } catch { return []; }
}

function validate(obj) {
  const errs = [];
  if (!obj?.service) errs.push('missing service');
  else {
    const s = obj.service;
    if (!s.name) errs.push('service.name required');
    if (!s.metadata?.owner) errs.push('metadata.owner recommended');
    if (!s.endpoints?.health) errs.push('endpoints.health required');
    if (!s.requirements?.service_token) errs.push('requirements.service_token recommended');
  }
  return errs;
}

function main() {
  const files = dirs.flatMap(d => list(d));
  const results = [];
  for (const f of files) {
    try {
      const obj = JSON.parse(fs.readFileSync(f, 'utf-8'));
      const errs = validate(obj);
      results.push({ file: f, ok: errs.length === 0, errors: errs });
    } catch (e) {
      results.push({ file: f, ok: false, errors: ['invalid json'] });
    }
  }
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  const summary = results.reduce((acc, r) => (r.ok ? acc : acc + 1), 0);
  console.log(`Validated ${results.length} manifests; ${summary} with issues. See ${out}`);
}

main();

