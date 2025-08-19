#!/usr/bin/env node

/**
 * ChittyChain Standalone CLI - No external dependencies required
 * This version includes minimal inline implementations of required functionality
 */

import { ChittyChainV2 } from './src/blockchain/ChittyChainV2.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple command line parser (replaces commander)
class SimpleCommander {
  constructor() {
    this.commands = new Map();
    this.version = '1.0.0';
  }

  command(name, description, handler) {
    this.commands.set(name, { description, handler });
  }

  parse(argv) {
    const args = argv.slice(2);
    const commandName = args[0] || 'help';
    
    if (commandName === '--version' || commandName === '-v') {
      console.log(this.version);
      return;
    }
    
    const command = this.commands.get(commandName);
    if (command) {
      command.handler(args.slice(1));
    } else {
      this.showHelp();
    }
  }

  showHelp() {
    console.log('\nChittyChain CLI v' + this.version);
    console.log('\nCommands:');
    for (const [name, cmd] of this.commands) {
      console.log(`  ${name.padEnd(15)} ${cmd.description}`);
    }
    console.log('\nOptions:');
    console.log('  -v, --version   Show version');
    console.log('');
  }
}

// Simple chalk replacement for colors
const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// Simple spinner replacement
class SimpleSpinner {
  constructor(text) {
    this.text = text;
    this.interval = null;
    this.frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    this.current = 0;
  }

  start() {
    process.stdout.write(`${this.frames[0]} ${this.text}`);
    this.interval = setInterval(() => {
      process.stdout.write(`\r${this.frames[this.current]} ${this.text}`);
      this.current = (this.current + 1) % this.frames.length;
    }, 80);
    return this;
  }

  succeed(text) {
    if (this.interval) clearInterval(this.interval);
    process.stdout.write(`\r${colors.green('✔')} ${text || this.text}\n`);
  }

  fail(text) {
    if (this.interval) clearInterval(this.interval);
    process.stdout.write(`\r${colors.red('✖')} ${text || this.text}\n`);
  }
}

// Initialize
const program = new SimpleCommander();
const blockchain = new ChittyChainV2();

// Utility functions
async function loadChainData() {
  const dataPath = path.join(__dirname, 'data', 'blockchain.json');
  try {
    const data = await fs.readFile(dataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function saveChainData() {
  const dataPath = path.join(__dirname, 'data', 'blockchain.json');
  const dataDir = path.dirname(dataPath);
  
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(dataPath, JSON.stringify({
      chain: blockchain.chain,
      pendingArtifacts: blockchain.pendingArtifacts,
      lastUpdated: new Date().toISOString()
    }, null, 2));
  } catch (error) {
    console.error(colors.red('Failed to save blockchain data:'), error.message);
  }
}

// Commands
program.command('status', 'Display blockchain status', async () => {
  console.log(colors.bold('\n=== ChittyChain Status ===\n'));
  
  const validation = blockchain.validateChain();
  const stats = blockchain.getChainStats();
  
  console.log(`${colors.gray('Chain Length:')}    ${blockchain.chain.length} blocks`);
  console.log(`${colors.gray('Pending:')}         ${blockchain.pendingArtifacts.length} artifacts`);
  console.log(`${colors.gray('Total Artifacts:')} ${stats.totalArtifacts}`);
  console.log(`${colors.gray('Chain Valid:')}     ${validation.valid ? colors.green('✓ Yes') : colors.red('✗ No')}`);
  console.log(`${colors.gray('Latest Block:')}    ${blockchain.getLatestBlock().hash.substring(0, 16)}...`);
  console.log(`${colors.gray('Difficulty:')}      ${blockchain.difficulty}`);
  
  if (stats.evidenceTiers) {
    console.log(`\n${colors.bold('Evidence Distribution:')}`);
    Object.entries(stats.evidenceTiers).forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count}`);
    });
  }
});

program.command('mine', 'Mine pending artifacts', async (args) => {
  const minerEmail = args[0] || 'cli@chittychain.local';
  
  if (blockchain.pendingArtifacts.length === 0) {
    console.log(colors.yellow('No pending artifacts to mine'));
    return;
  }
  
  const spinner = new SimpleSpinner(`Mining ${blockchain.pendingArtifacts.length} artifacts...`);
  spinner.start();
  
  try {
    const startTime = Date.now();
    const result = await blockchain.mintArtifacts(blockchain.pendingArtifacts, minerEmail);
    const miningTime = Date.now() - startTime;
    
    if (result.success) {
      spinner.succeed(`Block mined in ${miningTime}ms`);
      
      console.log(`\n${colors.bold('New Block:')}`);
      console.log(`  ${colors.gray('Hash:')}  ${result.block.hash}`);
      console.log(`  ${colors.gray('Index:')} ${result.block.index}`);
      console.log(`  ${colors.gray('Artifacts:')} ${result.minted.length}`);
      
      if (result.rejected.length > 0) {
        console.log(`\n${colors.yellow('Rejected Artifacts:')}`);
        result.rejected.forEach(r => {
          console.log(`  - ${r.artifact.id}: ${r.reason}`);
        });
      }
      
      // Clear pending artifacts after successful mining
      blockchain.pendingArtifacts = [];
      await saveChainData();
    } else {
      spinner.fail(`Mining failed: ${result.message}`);
    }
  } catch (error) {
    spinner.fail(`Mining failed: ${error.message}`);
  }
});

program.command('validate', 'Validate blockchain integrity', async () => {
  const spinner = new SimpleSpinner('Validating blockchain...');
  spinner.start();
  
  const result = blockchain.validateChain();
  
  if (result.valid) {
    spinner.succeed('Blockchain is valid');
    
    console.log(`\n${colors.bold('Validation Results:')}`);
    console.log(`  ${colors.gray('Chain Length:')}     ${result.chainLength}`);
    console.log(`  ${colors.gray('Total Artifacts:')}  ${result.totalArtifacts}`);
    console.log(`  ${colors.gray('Warnings:')}         ${result.warnings.length}`);
    
    if (result.warnings.length > 0) {
      console.log(`\n${colors.yellow('Warnings:')}`);
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }
  } else {
    spinner.fail('Blockchain validation failed');
    
    console.log(`\n${colors.red('Errors:')}`);
    result.errors.forEach(e => console.log(`  - ${e}`));
  }
});

program.command('query', 'Query blockchain artifacts', async (args) => {
  const query = {};
  
  // Parse query arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    if (key && value) query[key] = value;
  }
  
  console.log(`\n${colors.bold('Querying blockchain...')}`);
  const results = blockchain.queryArtifacts(query);
  
  if (results.length === 0) {
    console.log(colors.yellow('No artifacts found matching query'));
    return;
  }
  
  console.log(`Found ${colors.green(results.length)} artifacts:\n`);
  
  results.forEach((artifact, index) => {
    console.log(`${colors.bold(`[${index + 1}]`)} ${artifact.id}`);
    console.log(`    ${colors.gray('Type:')} ${artifact.type}`);
    console.log(`    ${colors.gray('Tier:')} ${artifact.tier}`);
    console.log(`    ${colors.gray('Weight:')} ${artifact.weight}`);
    console.log(`    ${colors.gray('Statement:')} ${artifact.statement.substring(0, 50)}...`);
    console.log('');
  });
});

program.command('add-artifact', 'Add artifact to pending', async (args) => {
  if (args.length < 2) {
    console.log(colors.red('Usage: add-artifact <statement> <type>'));
    return;
  }
  
  const [statement, type] = args;
  
  const artifact = {
    id: `CLI_${Date.now()}`,
    contentHash: crypto.createHash('sha3-256').update(statement).digest('hex'),
    statement: statement,
    weight: 0.5,
    type: type || 'document',
    tier: 'UNCORROBORATED_PERSON',
    timestamp: new Date().toISOString(),
    submittedBy: 'cli@chittychain.local'
  };
  
  blockchain.pendingArtifacts.push(artifact);
  await saveChainData();
  
  console.log(colors.green('✓ Artifact added to pending'));
  console.log(`  ${colors.gray('ID:')} ${artifact.id}`);
  console.log(`  ${colors.gray('Hash:')} ${artifact.contentHash.substring(0, 16)}...`);
});

program.command('export', 'Export blockchain data', async (args) => {
  const format = args[0] || 'json';
  const outputFile = args[1] || `blockchain-export-${Date.now()}.${format}`;
  
  const spinner = new SimpleSpinner('Exporting blockchain...');
  spinner.start();
  
  try {
    const exportData = blockchain.exportChain();
    
    if (format === 'json') {
      await fs.writeFile(outputFile, JSON.stringify(exportData, null, 2));
    } else {
      // Simple CSV export
      const csv = ['Index,Hash,Timestamp,Artifacts,Miner'];
      exportData.blocks.forEach(block => {
        csv.push(`${block.index},${block.hash},${block.timestamp},${block.artifactCount},${block.miner}`);
      });
      await fs.writeFile(outputFile, csv.join('\n'));
    }
    
    spinner.succeed(`Exported to ${outputFile}`);
  } catch (error) {
    spinner.fail(`Export failed: ${error.message}`);
  }
});

program.command('pending', 'Show pending artifacts', async () => {
  if (blockchain.pendingArtifacts.length === 0) {
    console.log(colors.yellow('No pending artifacts'));
    return;
  }
  
  console.log(`\n${colors.bold('Pending Artifacts:')}`);
  blockchain.pendingArtifacts.forEach((artifact, index) => {
    console.log(`\n${colors.bold(`[${index + 1}]`)} ${artifact.id}`);
    console.log(`    ${colors.gray('Type:')} ${artifact.type}`);
    console.log(`    ${colors.gray('Tier:')} ${artifact.tier}`);
    console.log(`    ${colors.gray('Weight:')} ${artifact.weight}`);
    console.log(`    ${colors.gray('Statement:')} ${artifact.statement}`);
    console.log(`    ${colors.gray('Hash:')} ${artifact.contentHash.substring(0, 16)}...`);
  });
});

program.command('help', 'Show help', () => {
  program.showHelp();
});

// Load existing chain data on startup
(async () => {
  const chainData = await loadChainData();
  if (chainData && chainData.chain) {
    // Don't directly assign - the objects need to be proper instances
    blockchain.pendingArtifacts = chainData.pendingArtifacts || [];
    console.log(colors.gray(`Loaded ${blockchain.pendingArtifacts.length} pending artifacts`));
  }
  
  // Parse command line
  program.parse(process.argv);
})();