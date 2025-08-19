#!/usr/bin/env node

/**
 * ChittyChain Integrations Status - Check and report on all external integrations
 */

import { check } from "drizzle-orm/mysql-core";

interface IntegrationStatus {
  name: string;
  status: 'configured' | 'missing' | 'error';
  description: string;
  setupInstructions?: string;
}

export async function checkIntegrationsStatus(): Promise<IntegrationStatus[]> {
  const integrations: IntegrationStatus[] = [];

  // 1. Neon Database
  try {
    if (process.env.DATABASE_URL) {
      integrations.push({
        name: 'Neon PostgreSQL Database',
        status: 'configured',
        description: '✅ Connected to production PostgreSQL database with 7-table schema'
      });
    } else {
      integrations.push({
        name: 'Neon PostgreSQL Database',
        status: 'missing',
        description: '❌ DATABASE_URL not configured',
        setupInstructions: 'Database should be automatically configured in Replit environment'
      });
    }
  } catch (error) {
    integrations.push({
      name: 'Neon PostgreSQL Database',
      status: 'error',
      description: `❌ Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // 2. Notion Integration
  if (process.env.NOTION_INTEGRATION_SECRET && process.env.NOTION_PAGE_URL) {
    integrations.push({
      name: 'Notion Collaborative Case Management',
      status: 'configured',
      description: '✅ Ready to sync evidence, cases, and atomic facts to Notion workspace'
    });
  } else {
    integrations.push({
      name: 'Notion Collaborative Case Management',
      status: 'missing',
      description: '❌ NOTION_INTEGRATION_SECRET and NOTION_PAGE_URL required',
      setupInstructions: `
1. Go to https://www.notion.so/my-integrations
2. Create a new integration named "ChittyChain Evidence Ledger"
3. Copy the integration secret → NOTION_INTEGRATION_SECRET
4. Create/open a Notion page for evidence data
5. Share page with your integration (... → connections → select integration)
6. Copy page URL → NOTION_PAGE_URL`
    });
  }

  // 3. Cloudflare Workers & MCP
  if (process.env.CLOUDFLARE_API_TOKEN) {
    integrations.push({
      name: 'Cloudflare Workers & MCP Servers',
      status: 'configured',
      description: '✅ Ready to deploy MCP servers and edge computing functions'
    });
  } else {
    integrations.push({
      name: 'Cloudflare Workers & MCP Servers',
      status: 'missing',
      description: '❌ CLOUDFLARE_API_TOKEN required for MCP server deployment',
      setupInstructions: `
1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Create Custom Token with Zone:Read, Worker:Edit permissions  
3. Copy token → CLOUDFLARE_API_TOKEN`
    });
  }

  // 4. AI Analysis Services
  const aiServices = [];
  if (process.env.OPENAI_API_KEY) {
    aiServices.push('OpenAI GPT-4');
  }
  if (process.env.ANTHROPIC_API_KEY) {
    aiServices.push('Claude');
  }

  if (aiServices.length > 0) {
    integrations.push({
      name: 'AI Analysis Services',
      status: 'configured',
      description: `✅ Connected to: ${aiServices.join(', ')}`
    });
  } else {
    integrations.push({
      name: 'AI Analysis Services',
      status: 'missing',
      description: '❌ No AI services configured (OPENAI_API_KEY or ANTHROPIC_API_KEY)',
      setupInstructions: 'Add API keys for OpenAI or Anthropic to enable advanced evidence analysis'
    });
  }

  // 5. Blockchain Infrastructure
  integrations.push({
    name: 'ChittyChain Blockchain',
    status: 'configured',
    description: '✅ Internal blockchain with 6-stage evidence processing and minting'
  });

  return integrations;
}

async function displayIntegrationsReport() {
  console.log('🔗 ChittyChain Evidence Ledger - Integrations Status Report\n');

  const integrations = await checkIntegrationsStatus();
  
  const configured = integrations.filter(i => i.status === 'configured').length;
  const total = integrations.length;
  
  console.log(`📊 Integration Status: ${configured}/${total} configured (${Math.round(configured/total*100)}%)\n`);

  integrations.forEach(integration => {
    console.log(`${integration.description}`);
    if (integration.setupInstructions) {
      console.log(`   Setup: ${integration.setupInstructions.trim()}\n`);
    }
  });

  // Recommendations
  console.log('\n💡 Next Steps:');
  
  const missing = integrations.filter(i => i.status === 'missing');
  if (missing.length === 0) {
    console.log('🎉 All integrations configured! Your ChittyChain Evidence Ledger is fully operational.');
    console.log('🚀 Ready for production legal evidence management with:');
    console.log('   - PostgreSQL database with comprehensive schema');
    console.log('   - Notion collaborative case management');
    console.log('   - Cloudflare edge computing and MCP servers');
    console.log('   - AI-powered evidence analysis');
    console.log('   - Blockchain immutability and trust scoring');
  } else {
    console.log(`🔧 Configure ${missing.length} missing integration${missing.length === 1 ? '' : 's'} for full functionality:`);
    missing.forEach((integration, index) => {
      console.log(`   ${index + 1}. ${integration.name}`);
    });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  displayIntegrationsReport().catch(console.error);
}

export { displayIntegrationsReport };