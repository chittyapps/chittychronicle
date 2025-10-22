#!/usr/bin/env node
/**
 * Cloudflare Workers Inventory + Analysis
 * - Lists accounts (or uses provided account IDs)
 * - Fetches Workers scripts metadata and source content
 * - Gathers routes per zone and maps to scripts
 * - Produces JSON + Markdown summary reports
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... node scripts/cloudflare/workers_inventory.mjs [--accounts acc1,acc2] [--days 7]
 */

const fs = await import('fs');
const path = await import('path');

const CF_API = 'https://api.cloudflare.com/client/v4';
const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
if (!TOKEN) {
  console.error('CLOUDFLARE_API_TOKEN not set. Exiting.');
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { accounts: [], days: 7 };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--accounts' && args[i + 1]) {
      out.accounts = args[i + 1].split(',').map(s => s.trim());
      i++;
    } else if (a === '--days' && args[i + 1]) {
      out.days = parseInt(args[i + 1], 10) || 7;
      i++;
    }
  }
  return out;
}

async function cfGet(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CF GET ${url} failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function cfGetText(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`CF GET ${url} failed: ${res.status} ${text}`);
  }
  return res.text();
}

async function listAccounts() {
  const data = await cfGet(`${CF_API}/accounts`);
  return (data.result || []).map(a => ({ id: a.id, name: a.name }));
}

async function listZones(accountId) {
  const zones = [];
  let page = 1;
  while (true) {
    const data = await cfGet(`${CF_API}/zones?account.id=${accountId}&per_page=50&page=${page}`);
    zones.push(...(data.result || []));
    if (!data.result_info || page >= (data.result_info.total_pages || 1)) break;
    page++;
  }
  return zones.map(z => ({ id: z.id, name: z.name, status: z.status, plan: z.plan?.name || null }));
}

async function listRoutesByZone(zoneId) {
  const data = await cfGet(`${CF_API}/zones/${zoneId}/workers/routes`);
  return (data.result || []).map(r => ({ id: r.id, pattern: r.pattern, script: r.script }));
}

async function listWorkers(accountId) {
  const workers = [];
  let page = 1;
  while (true) {
    const data = await cfGet(`${CF_API}/accounts/${accountId}/workers/scripts?per_page=100&page=${page}`);
    workers.push(...(data.result || []));
    if (!data.result_info || page >= (data.result_info.total_pages || 1)) break;
    page++;
  }
  return workers;
}

async function getWorkerContent(accountId, scriptName) {
  try {
    return await cfGetText(`${CF_API}/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/content`);
  } catch {
    return null; // not all tokens can read content
  }
}

function analyzeCode(source) {
  if (!source) return { endpoints: [], tags: [], notes: [] };
  const endpoints = [];
  const patterns = [
    /app\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g,
    /router\.(get|post|put|patch|delete)\(['"`]([^'"`]+)['"`]/g,
    /url\.pathname\s*===\s*['"`]([^'"`]+)['"`]/g,
    /c\.req\.method\s*===\s*['"`](GET|POST|PUT|PATCH|DELETE)['"`]/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(source)) !== null) {
      if (m[2]) endpoints.push(`${m[1].toUpperCase()} ${m[2]}`);
      else if (m[1]) endpoints.push(`${m[1].toUpperCase()}`);
    }
  }
  const tags = [];
  if (/mcp/i.test(source)) tags.push('mcp');
  if (/hono|itty-router|worktop|express|koa/i.test(source)) tags.push('router');
  if (/verify|certify|ledger|chain/i.test(source)) tags.push('trust');
  if (/kv/i.test(source)) tags.push('kv');
  if (/queue/i.test(source)) tags.push('queue');
  return { endpoints: Array.from(new Set(endpoints)).slice(0, 50), tags, notes: [] };
}

function classifyPurpose(name, tags, endpoints) {
  const n = name.toLowerCase();
  if (tags.includes('mcp') || /mcp/.test(n)) return 'MCP service';
  if (/router|gateway/.test(n)) return 'Gateway/Router';
  if (/verify|certify/.test(n)) return 'Verification/Certification';
  if (/ledger|finance|books/.test(n)) return 'Ledger/Finance';
  if (/chain/.test(n)) return 'Chain/Anchoring';
  if (/chronicle|timeline|event/.test(n)) return 'Events/Chronicle';
  if (/chat|beacon|notify|email/.test(n)) return 'Comms/Notifications';
  return endpoints.length > 0 ? 'API Worker' : 'Utility/Background';
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function writeJSON(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function writeText(p, text) {
  fs.writeFileSync(p, text);
}

async function main() {
  const opts = parseArgs();
  const outDir = path.join(process.cwd(), 'reports', 'cloudflare-workers');
  ensureDir(outDir);

  let accounts = [];
  if (opts.accounts.length > 0) {
    accounts = opts.accounts.map(id => ({ id, name: id }));
  } else {
    accounts = await listAccounts();
  }

  const globalReport = [];

  for (const account of accounts) {
    const accDir = path.join(outDir, account.id);
    ensureDir(accDir);
    console.log(`\n🔎 Account: ${account.name} (${account.id})`);

    const [workers, zones] = await Promise.all([
      listWorkers(account.id),
      listZones(account.id),
    ]);

    const routesByScript = new Map();
    for (const z of zones) {
      try {
        const routes = await listRoutesByZone(z.id);
        for (const r of routes) {
          if (!routesByScript.has(r.script)) routesByScript.set(r.script, []);
          routesByScript.get(r.script).push({ zone: z.name, pattern: r.pattern });
        }
      } catch {}
    }

    const scriptsSummary = [];

    for (const w of workers) {
      const name = w.id || w.name || w.script || 'unknown';
      const content = await getWorkerContent(account.id, name);
      const analysis = analyzeCode(content);
      const purpose = classifyPurpose(name, analysis.tags, analysis.endpoints);
      const routes = routesByScript.get(name) || [];

      const meta = {
        account: account.id,
        name,
        title: w.title || null,
        created_on: w.created_on,
        modified_on: w.modified_on,
        usage_model: w.usage_model || null,
        compatibility_date: w.compatibility_date || null,
        tags: analysis.tags,
        purpose,
        endpoints: analysis.endpoints,
        routes,
      };
      scriptsSummary.push(meta);

      // Persist content and meta per script
      const scriptDir = path.join(accDir, name.replace(/[^a-zA-Z0-9-_]/g, '_'));
      ensureDir(scriptDir);
      if (content) writeText(path.join(scriptDir, 'source.js'), content.substring(0, 500000));
      writeJSON(path.join(scriptDir, 'meta.json'), meta);
    }

    // Sort and write account summary
    scriptsSummary.sort((a, b) => (a.name > b.name ? 1 : -1));
    writeJSON(path.join(accDir, 'workers_summary.json'), scriptsSummary);
    writeJSON(path.join(accDir, 'zones_summary.json'), zones);

    globalReport.push({ account: account.id, name: account.name, zones, workers: scriptsSummary });
  }

  // Global markdown report
  const lines = ['# Cloudflare Workers Report', '', `Generated: ${new Date().toISOString()}`, ''];
  for (const acc of globalReport) {
    lines.push(`## Account ${acc.name} (${acc.account})`);
    if (acc.zones?.length) {
      lines.push('### Zones');
      for (const z of acc.zones) {
        lines.push(`- ${z.name} — ${z.status || 'unknown'} — ${z.plan || 'plan: n/a'}`);
      }
      lines.push('');
    }
    for (const w of acc.workers) {
      lines.push(`- ${w.name} — ${w.purpose}`);
      if (w.routes.length) {
        const r = w.routes.map(x => `${x.zone}:${x.pattern}`).slice(0, 5).join('; ');
        lines.push(`  - routes: ${r}`);
      }
      if (w.endpoints.length) {
        lines.push(`  - endpoints: ${w.endpoints.slice(0, 5).join(', ')}`);
      }
    }
    lines.push('');
  }
  ensureDir(path.join(process.cwd(), 'reports'));
  writeText(path.join(process.cwd(), 'reports', 'CLOUDFLARE_WORKERS_REPORT.md'), lines.join('\n'));
  writeJSON(path.join(process.cwd(), 'reports', 'CLOUDFLARE_WORKERS_REPORT.json'), globalReport);

  console.log(`\n✅ Report written to reports/CLOUDFLARE_WORKERS_REPORT.md`);
}

main().catch(err => {
  console.error('❌ Inventory failed:', err.message);
  process.exit(1);
});
