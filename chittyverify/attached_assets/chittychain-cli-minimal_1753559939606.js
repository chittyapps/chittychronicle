#!/usr/bin/env node

/**
 * ChittyChain CLI Minimal - Works without external dependencies
 */

import { ChittyChainV2 } from './src/blockchain/ChittyChainV2.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple CLI argument parser
const args = process.argv.slice(2);
const command = args[0] || 'help';

// Initialize blockchain
const blockchain = new ChittyChainV2();

// Command handlers
const commands = {
  status: async () => {
    console.log('\n=== ChittyChain Status ===');
    console.log(`Chain Length: ${blockchain.chain.length} blocks`);
    console.log(`Pending Artifacts: ${blockchain.pendingArtifacts.length}`);
    console.log(`Difficulty: ${blockchain.difficulty}`);
    console.log(`Latest Block: ${blockchain.getLatestBlock().hash.substring(0, 16)}...`);
    console.log(`Chain Valid: ${blockchain.validateChain() ? '✅ Yes' : '❌ No'}`);
  },

  mine: async () => {
    if (blockchain.pendingArtifacts.length === 0) {
      console.log('No pending artifacts to mine');
      return;
    }
    
    console.log(`Mining block with ${blockchain.pendingArtifacts.length} artifacts...`);
    const startTime = Date.now();
    
    const block = blockchain.mintArtifacts('minimal-cli@chittychain.local');
    
    const miningTime = Date.now() - startTime;
    console.log(`✅ Block mined in ${miningTime}ms`);
    console.log(`Block Hash: ${block.hash}`);
    console.log(`Nonce: ${block.nonce}`);
  },

  validate: async () => {
    console.log('Validating blockchain...');
    const result = blockchain.validateChain();
    
    if (result.valid) {
      console.log('✅ Blockchain is valid');
      console.log(`Chain Length: ${result.chainLength}`);
      console.log(`Total Artifacts: ${result.totalArtifacts}`);
      
      // Show block details
      blockchain.chain.forEach((block, index) => {
        console.log(`\nBlock #${index}:`);
        console.log(`  Hash: ${block.hash.substring(0, 32)}...`);
        console.log(`  Previous: ${block.previousHash.substring(0, 32)}...`);
        console.log(`  Artifacts: ${block.data.artifacts?.length || 0}`);
      });
    } else {
      console.log('❌ Blockchain validation failed');
      console.log(`Errors: ${result.errors.join(', ')}`);
    }
  },

  help: async () => {
    console.log('\nChittyChain CLI (Minimal Version)');
    console.log('\nCommands:');
    console.log('  status    - Show blockchain status');
    console.log('  mine      - Mine pending artifacts');
    console.log('  validate  - Validate blockchain integrity');
    console.log('  help      - Show this help message');
    console.log('\nNote: This is a minimal version without external dependencies.');
    console.log('Install dependencies for full functionality.');
  }
};

// Execute command
const handler = commands[command] || commands.help;
handler().catch(console.error);