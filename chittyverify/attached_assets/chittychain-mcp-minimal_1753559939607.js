#!/usr/bin/env node

/**
 * ChittyChain MCP Server - Minimal Working Version
 * Provides basic blockchain operations via MCP without external dependencies
 */

import { ChittyChainV2 } from './src/blockchain/ChittyChainV2.js';
import http from 'http';
import { URL } from 'url';

// Point to cloud deployment
const CHITTYCHAIN_FRONTEND_URL = 'https://cdeea94c.chittychain.pages.dev';

class MinimalMCPServer {
  constructor() {
    this.blockchain = new ChittyChainV2();
    this.tools = {
      chittychain_status: this.getStatus.bind(this),
      chittychain_add_artifact: this.addArtifact.bind(this),
      chittychain_mine: this.mineArtifacts.bind(this),
      chittychain_validate: this.validateChain.bind(this),
      chittychain_query: this.queryArtifacts.bind(this),
      chittychain_export: this.exportChain.bind(this)
    };
  }

  async getStatus(params = {}) {
    const validation = this.blockchain.validateChain();
    const stats = this.blockchain.getChainStats();
    
    return {
      success: true,
      data: {
        chainLength: this.blockchain.chain.length,
        pendingArtifacts: this.blockchain.pendingArtifacts.length,
        totalArtifacts: stats.totalArtifacts,
        chainValid: validation.valid,
        latestBlockHash: this.blockchain.getLatestBlock().hash.substring(0, 16) + '...',
        difficulty: this.blockchain.difficulty,
        evidenceTiers: stats.evidenceTiers || {}
      }
    };
  }

  async addArtifact(params) {
    const { statement, type = 'document', tier = 'UNCORROBORATED_PERSON' } = params;
    
    if (!statement) {
      return { success: false, error: 'Statement is required' };
    }

    const artifact = {
      id: `MCP_${Date.now()}`,
      contentHash: require('crypto').createHash('sha3-256').update(statement).digest('hex'),
      statement: statement,
      weight: 0.5,
      type: type,
      tier: tier,
      timestamp: new Date().toISOString(),
      submittedBy: 'mcp@chittychain.local'
    };

    this.blockchain.pendingArtifacts.push(artifact);

    return {
      success: true,
      data: {
        artifactId: artifact.id,
        contentHash: artifact.contentHash.substring(0, 16) + '...',
        pendingCount: this.blockchain.pendingArtifacts.length
      }
    };
  }

  async mineArtifacts(params = {}) {
    const { miner = 'mcp@chittychain.local' } = params;

    if (this.blockchain.pendingArtifacts.length === 0) {
      return { success: false, error: 'No pending artifacts to mine' };
    }

    try {
      const result = await this.blockchain.mintArtifacts(this.blockchain.pendingArtifacts, miner);
      
      if (result.success) {
        this.blockchain.pendingArtifacts = [];
        return {
          success: true,
          data: {
            blockHash: result.block.hash,
            blockIndex: result.block.index,
            artifactsMinted: result.minted.length,
            artifactsRejected: result.rejected.length
          }
        };
      } else {
        return { success: false, error: result.message };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async validateChain(params = {}) {
    const result = this.blockchain.validateChain();
    
    return {
      success: true,
      data: {
        valid: result.valid,
        chainLength: result.chainLength,
        totalArtifacts: result.totalArtifacts,
        errors: result.errors,
        warnings: result.warnings
      }
    };
  }

  async queryArtifacts(params = {}) {
    try {
      const results = this.blockchain.queryArtifacts(params);
      
      return {
        success: true,
        data: {
          count: results.length,
          artifacts: results.map(artifact => ({
            id: artifact.id,
            type: artifact.type,
            tier: artifact.tier,
            weight: artifact.weight,
            statement: artifact.statement.substring(0, 100) + (artifact.statement.length > 100 ? '...' : ''),
            timestamp: artifact.timestamp
          }))
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async exportChain(params = {}) {
    try {
      const exportData = this.blockchain.exportChain();
      
      return {
        success: true,
        data: {
          exportTimestamp: new Date().toISOString(),
          chainLength: exportData.blocks.length,
          totalArtifacts: exportData.stats.totalArtifacts,
          blocks: exportData.blocks
        }
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleRequest(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathParts = url.pathname.split('/').filter(p => p);

      if (pathParts[0] === 'health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }));
        return;
      }

      if (pathParts[0] === 'tools') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          tools: Object.keys(this.tools),
          count: Object.keys(this.tools).length
        }));
        return;
      }

      if (pathParts[0] === 'tool' && pathParts[1]) {
        const toolName = pathParts[1];
        const tool = this.tools[toolName];

        if (!tool) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: `Tool ${toolName} not found` }));
          return;
        }

        let params = {};
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', async () => {
            try {
              params = JSON.parse(body);
            } catch (e) {
              // Ignore JSON parse errors, use empty params
            }

            const result = await tool(params);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          });
        } else {
          // GET request - use query params
          for (const [key, value] of url.searchParams) {
            params[key] = value;
          }

          const result = await tool(params);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        }
        return;
      }

      // Default response
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: 'ChittyChain MCP Server',
        version: '1.0.0',
        endpoints: {
          '/health': 'Health check',
          '/tools': 'List available tools',
          '/tool/{toolName}': 'Execute tool'
        },
        availableTools: Object.keys(this.tools)
      }));

    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  start(port = 3001) {
    const server = http.createServer((req, res) => this.handleRequest(req, res));
    
    server.listen(port, () => {
      console.log(`🚀 ChittyChain MCP Server running on http://localhost:${port}`);
      console.log(`📊 Health check: http://localhost:${port}/health`);
      console.log(`🛠️  Tools list: http://localhost:${port}/tools`);
      console.log(`⛓️  Blockchain status: http://localhost:${port}/tool/chittychain_status`);
      console.log('');
      console.log('Available tools:');
      Object.keys(this.tools).forEach(tool => {
        console.log(`  - ${tool}`);
      });
    });

    return server;
  }
}

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new MinimalMCPServer();
  server.start();
}

export { MinimalMCPServer };