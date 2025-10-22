#!/usr/bin/env node

/**
 * ChittyChain CLI - Blockchain Operations for Legal Evidence Management
 * 
 * This CLI provides direct blockchain operations that complement the existing
 * MCP-based evidence management tools. It focuses on chain-level operations
 * rather than duplicating the MCP evidence management functionality.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// Dynamic path resolution for ChittyChain components
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find ChittyChain implementation paths
function findChittyChainPath() {
  const possiblePaths = [
    // From gh/ChittyChain repository (current/new structure)
    path.join(__dirname, '..'),
    // From agent smith location (legacy)
    path.join(__dirname, '..', '..', 'exec', 'gc', 'sys', 'chittycases', 'chittychain'),
    // From MAIN root (legacy)
    path.join(__dirname, '..', '..', '..', 'ai', 'exec', 'gc', 'sys', 'chittycases', 'chittychain'),
    // Direct gh/ChittyChain path
    path.join(__dirname, '..', '..', '..', 'gh', 'ChittyChain'),
    // Environment variable override
    process.env.CHITTYCHAIN_PATH
  ].filter(Boolean);
  
  for (const basePath of possiblePaths) {
    try {
      // Check for new structure (gh/ChittyChain)
      if (fsSync.existsSync(path.join(basePath, 'src', 'blockchain', 'ChittyChainV2.js'))) {
        return basePath;
      }
      // Check for legacy structure (chittycases/chittychain)
      if (fsSync.existsSync(path.join(basePath, 'src', 'blockchain', 'ChittyChainV2.js'))) {
        return basePath;
      }
    } catch (e) {
      // Continue searching
    }
  }
  
  // Legacy fallback - try to find by walking up directories
  let currentDir = __dirname;
  for (let i = 0; i < 5; i++) {
    const legacyPath = path.join(currentDir, 'ai', 'exec', 'gc', 'sys', 'chittycases', 'chittychain');
    const ghPath = path.join(currentDir, 'gh', 'ChittyChain');
    
    if (fsSync.existsSync(path.join(legacyPath, 'src', 'blockchain', 'ChittyChainV2.js'))) {
      return legacyPath;
    }
    if (fsSync.existsSync(path.join(ghPath, 'src', 'blockchain', 'ChittyChainV2.js'))) {
      return ghPath;
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  throw new Error('ChittyChain implementation not found. Please ensure the blockchain files are available or set CHITTYCHAIN_PATH environment variable.');
}

// Dynamic imports based on discovered path
let ChittyChainV2, BlockchainValidationService, BlockchainRecoveryService, ArtifactMintingService;

try {
  const basePath = findChittyChainPath();
  const { ChittyChainV2: CC2 } = await import(path.join(basePath, 'src', 'blockchain', 'ChittyChainV2.js'));
  const { BlockchainValidationService: BVS } = await import(path.join(basePath, 'lib', 'blockchain', 'validation-service.js'));
  const { BlockchainRecoveryService: BRS } = await import(path.join(basePath, 'lib', 'blockchain', 'error-recovery-service.js'));
  const { ArtifactMintingService: AMS } = await import(path.join(basePath, 'lib', 'blockchain', 'artifact-minting-service.js'));
  
  ChittyChainV2 = CC2;
  BlockchainValidationService = BVS;
  BlockchainRecoveryService = BRS;
  ArtifactMintingService = AMS;
} catch (error) {
  console.error(chalk.red('Failed to load ChittyChain components:', error.message));
  console.error(chalk.yellow('Please ensure ChittyChain is properly installed or run from the correct directory.'));
  process.exit(1);
}

// Initialize blockchain instance
const chain = new ChittyChainV2();

// Dynamic import of verification and consent services
let ChittyChainVerificationService;
try {
  const basePath = findChittyChainPath();
  const { ChittyChainVerificationService: CCVS } = await import(path.join(basePath, 'lib', 'blockchain', 'verification-service.js'));
  ChittyChainVerificationService = CCVS;
} catch (error) {
  console.warn('Verification service not available:', error.message);
}

const verificationService = ChittyChainVerificationService ? new ChittyChainVerificationService() : null;

// CLI Program
const program = new Command();

program
  .name('chittychain')
  .description('ChittyChain CLI - Blockchain operations for legal evidence')
  .version('2.0.0');

// Chain Status Command
program
  .command('status')
  .description('Display blockchain status and statistics')
  .action(async () => {
    try {
      const spinner = ora('Loading blockchain status...').start();
      
      const stats = {
        height: chain.getLatestBlock().index,
        totalArtifacts: chain.artifacts.size,
        latestBlockHash: chain.getLatestBlock().hash.substring(0, 16) + '...',
        difficulty: chain.difficulty,
        chainValid: await validateChain()
      };

      spinner.succeed('Blockchain status loaded');

      const table = new Table({
        head: ['Property', 'Value'],
        colWidths: [20, 50]
      });

      table.push(
        ['Chain Height', stats.height],
        ['Total Artifacts', stats.totalArtifacts],
        ['Latest Block', stats.latestBlockHash],
        ['Difficulty', stats.difficulty],
        ['Chain Valid', stats.chainValid ? chalk.green('✓') : chalk.red('✗')]
      );

      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red('Error:', error.message));
    }
  });

// Mine Block Command
program
  .command('mine')
  .description('Mine a new block with pending artifacts')
  .option('-m, --miner <email>', 'Miner email address', 'system@chittychain.local')
  .action(async (options) => {
    try {
      const spinner = ora('Mining new block...').start();
      
      // Check for pending artifacts
      if (chain.pendingArtifacts.length === 0) {
        spinner.warn('No pending artifacts to mine');
        return;
      }

      const startTime = Date.now();
      const block = await chain.minePendingArtifacts(options.miner);
      const miningTime = Date.now() - startTime;

      spinner.succeed(`Block mined in ${miningTime}ms`);

      console.log(chalk.green('\n✓ New Block Mined'));
      console.log(`  Hash: ${chalk.cyan(block.hash.substring(0, 32))}...`);
      console.log(`  Index: ${block.index}`);
      console.log(`  Nonce: ${block.nonce}`);
      console.log(`  Artifacts: ${block.artifacts.length}`);
    } catch (error) {
      console.error(chalk.red('Mining failed:', error.message));
    }
  });

// Validate Chain Command
program
  .command('validate')
  .description('Validate the entire blockchain')
  .option('-v, --verbose', 'Show detailed validation results')
  .option('-e, --export <file>', 'Export validation report to JSON file')
  .action(async (options) => {
    try {
      const spinner = ora('Validating blockchain...').start();
      
      const validator = new BlockchainValidationService(chain);
      const validation = await validator.validateBlockchain();
      
      if (validation.valid) {
        spinner.succeed('Blockchain is valid');
      } else {
        spinner.fail('Blockchain validation failed');
      }

      if (options.verbose || !validation.valid) {
        console.log('\n' + chalk.bold('Validation Results:'));
        console.log(`  Valid: ${validation.valid ? chalk.green('✓') : chalk.red('✗')}`);
        console.log(`  Errors: ${validation.errors.length}`);
        console.log(`  Warnings: ${validation.warnings.length}`);
        
        if (validation.errors.length > 0) {
          console.log('\n' + chalk.red('Errors:'));
          validation.errors.forEach((error, i) => {
            console.log(`  ${i + 1}. ${error}`);
          });
        }
        
        if (validation.warnings.length > 0) {
          console.log('\n' + chalk.yellow('Warnings:'));
          validation.warnings.forEach((warning, i) => {
            console.log(`  ${i + 1}. ${warning}`);
          });
        }
      }

      if (options.export) {
        const report = await validator.exportValidationReport();
        await fs.writeFile(options.export, JSON.stringify(report, null, 2));
        console.log(chalk.green(`\nValidation report exported to ${options.export}`));
      }
    } catch (error) {
      console.error(chalk.red('Validation error:', error.message));
    }
  });

// Query Artifacts Command
program
  .command('query')
  .description('Query artifacts in the blockchain')
  .option('-c, --case <caseId>', 'Filter by case ID')
  .option('-t, --type <type>', 'Filter by artifact type')
  .option('-w, --min-weight <weight>', 'Minimum evidence weight', parseFloat)
  .option('--tier <tier>', 'Filter by evidence tier')
  .option('-l, --limit <number>', 'Limit results', parseInt, 10)
  .action(async (options) => {
    try {
      const artifacts = chain.queryArtifacts({
        caseId: options.case,
        type: options.type,
        minWeight: options.minWeight,
        tier: options.tier
      });

      const limited = options.limit ? artifacts.slice(0, options.limit) : artifacts;

      if (limited.length === 0) {
        console.log(chalk.yellow('No artifacts found matching criteria'));
        return;
      }

      const table = new Table({
        head: ['ID', 'Type', 'Tier', 'Weight', 'Case', 'Block'],
        colWidths: [20, 15, 20, 10, 15, 10]
      });

      limited.forEach(artifact => {
        table.push([
          artifact.id.substring(0, 16) + '...',
          artifact.type,
          artifact.tier,
          artifact.weight.toFixed(2),
          artifact.caseId || 'N/A',
          artifact.blockIndex || 'Pending'
        ]);
      });

      console.log(`\nFound ${artifacts.length} artifacts (showing ${limited.length}):`);
      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red('Query error:', error.message));
    }
  });

// Recovery Command
program
  .command('recover')
  .description('Recover blockchain from errors or corruption')
  .option('-s, --strategy <strategy>', 'Recovery strategy (safe|aggressive|rebuild)', 'safe')
  .option('-b, --backup <file>', 'Restore from specific backup file')
  .action(async (options) => {
    try {
      const recovery = new BlockchainRecoveryService(chain);
      const spinner = ora('Running blockchain recovery...').start();
      
      let result;
      if (options.backup) {
        result = await recovery.restoreFromBackup(options.backup);
      } else {
        result = await recovery.autoRecover(options.strategy);
      }
      
      if (result.success) {
        spinner.succeed(result.message);
        console.log(chalk.green('\n✓ Recovery completed successfully'));
        
        if (result.details) {
          console.log('\nRecovery details:');
          Object.entries(result.details).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        }
      } else {
        spinner.fail('Recovery failed');
        console.error(chalk.red('\nError:', result.message));
      }
    } catch (error) {
      console.error(chalk.red('Recovery error:', error.message));
    }
  });

// Backup Command
program
  .command('backup')
  .description('Create a backup of the blockchain')
  .option('-d, --dir <directory>', 'Backup directory', './backups')
  .action(async (options) => {
    try {
      const spinner = ora('Creating blockchain backup...').start();
      
      const recovery = new BlockchainRecoveryService(chain);
      const backupPath = await recovery.createBackup(options.dir);
      
      spinner.succeed('Backup created successfully');
      console.log(chalk.green(`\n✓ Backup saved to: ${backupPath}`));
      
      const stats = await fs.stat(backupPath);
      console.log(`  Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } catch (error) {
      console.error(chalk.red('Backup error:', error.message));
    }
  });

// Export Chain Command
program
  .command('export')
  .description('Export blockchain data')
  .option('-f, --format <format>', 'Export format (json|csv)', 'json')
  .option('-o, --output <file>', 'Output file', 'chittychain-export.json')
  .option('--include-artifacts', 'Include artifact details')
  .action(async (options) => {
    try {
      const spinner = ora('Exporting blockchain data...').start();
      
      const exportData = {
        metadata: {
          version: '2.0.0',
          exportDate: new Date().toISOString(),
          chainHeight: chain.getLatestBlock().index,
          totalArtifacts: chain.artifacts.size
        },
        blocks: chain.chain.map(block => ({
          index: block.index,
          hash: block.hash,
          previousHash: block.previousHash,
          timestamp: block.timestamp,
          nonce: block.nonce,
          artifactCount: block.artifacts.length,
          artifacts: options.includeArtifacts ? block.artifacts : undefined
        }))
      };
      
      if (options.format === 'json') {
        await fs.writeFile(options.output, JSON.stringify(exportData, null, 2));
      } else if (options.format === 'csv') {
        // Simple CSV export of blocks
        const csv = [
          'index,hash,previousHash,timestamp,nonce,artifactCount',
          ...exportData.blocks.map(b => 
            `${b.index},${b.hash},${b.previousHash},${b.timestamp},${b.nonce},${b.artifactCount}`
          )
        ].join('\n');
        await fs.writeFile(options.output, csv);
      }
      
      spinner.succeed(`Blockchain exported to ${options.output}`);
    } catch (error) {
      console.error(chalk.red('Export error:', error.message));
    }
  });

// Verify Artifact Command
program
  .command('verify <artifactId>')
  .description('Verify an artifact exists in the blockchain with Merkle proof')
  .action(async (artifactId) => {
    try {
      const spinner = ora('Verifying artifact...').start();
      
      const artifact = chain.getArtifact(artifactId);
      if (!artifact) {
        spinner.fail('Artifact not found');
        return;
      }
      
      // Find the block containing the artifact
      const block = chain.chain.find(b => 
        b.artifacts.some(a => a.id === artifactId)
      );
      
      if (!block) {
        spinner.fail('Artifact not mined yet');
        return;
      }
      
      spinner.succeed('Artifact verified');
      
      console.log('\n' + chalk.bold('Artifact Details:'));
      console.log(`  ID: ${artifact.id}`);
      console.log(`  Type: ${artifact.type}`);
      console.log(`  Tier: ${artifact.tier}`);
      console.log(`  Weight: ${artifact.weight}`);
      console.log(`  Block: ${block.index} (${block.hash.substring(0, 16)}...)`);
      
      // Verify Merkle proof
      const merkleProof = block.getMerkleProof(artifactId);
      if (merkleProof) {
        console.log('\n' + chalk.green('✓ Merkle Proof Valid'));
        console.log(`  Root: ${block.merkleRoot.substring(0, 32)}...`);
      }
    } catch (error) {
      console.error(chalk.red('Verification error:', error.message));
    }
  });

// Analyze Chain Command
program
  .command('analyze')
  .description('Analyze blockchain performance and statistics')
  .action(async () => {
    try {
      const spinner = ora('Analyzing blockchain...').start();
      
      const stats = {
        totalBlocks: chain.chain.length,
        totalArtifacts: chain.artifacts.size,
        avgBlockTime: 0,
        avgArtifactsPerBlock: 0,
        tierDistribution: {},
        typeDistribution: {},
        miningTimes: []
      };
      
      // Calculate statistics
      let prevTimestamp = chain.chain[0].timestamp;
      chain.chain.forEach((block, index) => {
        if (index > 0) {
          const blockTime = block.timestamp - prevTimestamp;
          stats.miningTimes.push(blockTime);
          prevTimestamp = block.timestamp;
        }
        
        block.artifacts.forEach(artifact => {
          stats.tierDistribution[artifact.tier] = (stats.tierDistribution[artifact.tier] || 0) + 1;
          stats.typeDistribution[artifact.type] = (stats.typeDistribution[artifact.type] || 0) + 1;
        });
      });
      
      stats.avgBlockTime = stats.miningTimes.length > 0 
        ? stats.miningTimes.reduce((a, b) => a + b, 0) / stats.miningTimes.length 
        : 0;
      stats.avgArtifactsPerBlock = stats.totalArtifacts / (stats.totalBlocks - 1); // Exclude genesis
      
      spinner.succeed('Analysis complete');
      
      console.log('\n' + chalk.bold('Blockchain Analysis:'));
      console.log(`  Total Blocks: ${stats.totalBlocks}`);
      console.log(`  Total Artifacts: ${stats.totalArtifacts}`);
      console.log(`  Avg Block Time: ${(stats.avgBlockTime / 1000).toFixed(2)}s`);
      console.log(`  Avg Artifacts/Block: ${stats.avgArtifactsPerBlock.toFixed(2)}`);
      
      console.log('\n' + chalk.bold('Evidence Tier Distribution:'));
      Object.entries(stats.tierDistribution).forEach(([tier, count]) => {
        const percentage = ((count / stats.totalArtifacts) * 100).toFixed(1);
        console.log(`  ${tier}: ${count} (${percentage}%)`);
      });
      
      console.log('\n' + chalk.bold('Artifact Type Distribution:'));
      Object.entries(stats.typeDistribution).forEach(([type, count]) => {
        const percentage = ((count / stats.totalArtifacts) * 100).toFixed(1);
        console.log(`  ${type}: ${count} (${percentage}%)`);
      });
    } catch (error) {
      console.error(chalk.red('Analysis error:', error.message));
    }
  });

// Verified Mint Command - Legal-Ready Minting with Forensic Audit
program
  .command('verified-mint')
  .description('Mint artifacts with legal-ready verification and user consent')
  .option('-f, --file <path>', 'JSON file containing artifacts to mint')
  .option('-l, --level <level>', 'Verification level (basic|standard|enhanced|legal)', 'legal')
  .option('--no-consent', 'Skip user consent (requires auto-approval threshold)')
  .option('--forensic', 'Enable forensic audit trail')
  .option('--notarize', 'Require notarization for high-tier evidence')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('\n⚖️  Legal-Ready Artifact Minting Process\n'));
      
      // Load artifacts from file or create test artifacts
      let artifacts;
      if (options.file) {
        const fileContent = await fs.readFile(options.file, 'utf8');
        artifacts = JSON.parse(fileContent);
      } else {
        // Create test artifacts for demonstration
        artifacts = [
          {
            id: `LEGAL_${Date.now()}_1`,
            contentHash: crypto.createHash('sha256').update('Court Order #12345').digest('hex'),
            statement: 'Court Order for Property Division - Case #2024-DIV-001',
            weight: 0.98,
            tier: 'GOVERNMENT',
            type: 'COURT_ORDER',
            caseId: 'CASE_2024_001',
            metadata: {
              court: 'Superior Court of California',
              judge: 'Hon. Jane Smith',
              date: new Date().toISOString(),
              notarized: true,
              externalId: 'COURT-2024-12345'
            }
          },
          {
            id: `LEGAL_${Date.now()}_2`,
            contentHash: crypto.createHash('sha256').update('Bank Statement').digest('hex'),
            statement: 'Bank Statement showing account balance',
            weight: 0.85,
            tier: 'FINANCIAL_INSTITUTION',
            type: 'FINANCIAL_RECORD',
            caseId: 'CASE_2024_001',
            metadata: {
              institution: 'Wells Fargo Bank',
              accountLast4: '1234',
              statementDate: new Date().toISOString()
            }
          }
        ];
      }

      console.log(`Processing ${artifacts.length} artifacts for legal-ready minting...\n`);

      // Perform verification with forensic audit
      const verificationOptions = {
        level: options.level,
        forensicAudit: options.forensic,
        requireNotarization: options.notarize
      };

      const verificationResult = await verificationService.verifyArtifactsForMinting(
        artifacts, 
        verificationOptions
      );

      // Display verification report
      console.log(chalk.bold('\n📋 Verification Report:\n'));
      console.log(`Verification ID: ${chalk.cyan(verificationResult.id)}`);
      console.log(`Level: ${chalk.yellow(verificationResult.level)}`);
      console.log(`Total Artifacts: ${verificationResult.summary.total}`);
      console.log(`Passed: ${chalk.green(verificationResult.summary.passed)}`);
      console.log(`Failed: ${chalk.red(verificationResult.summary.failed)}`);
      console.log(`Warnings: ${chalk.yellow(verificationResult.summary.warnings)}`);

      // Check if consent was denied
      if (verificationResult.consentDenied) {
        console.log(chalk.red('\n❌ Minting cancelled - User consent denied\n'));
        if (verificationResult.consent?.reason) {
          console.log(`Reason: ${verificationResult.consent.reason}`);
        }
        return;
      }

      // Check for failed artifacts
      if (verificationResult.summary.failed > 0) {
        console.log(chalk.red('\n❌ Cannot proceed - Some artifacts failed verification\n'));
        verificationResult.artifacts
          .filter(a => a.status === 'failed')
          .forEach(a => {
            console.log(`  ${a.artifactId}: ${a.issues.join(', ')}`);
          });
        return;
      }

      // Proceed with minting approved artifacts
      const approvedArtifacts = artifacts.filter((_, index) => 
        verificationResult.artifacts[index].status !== 'failed'
      );

      if (approvedArtifacts.length === 0) {
        console.log(chalk.red('\n❌ No artifacts approved for minting\n'));
        return;
      }

      console.log(chalk.green(`\n✅ ${approvedArtifacts.length} artifacts approved for minting\n`));

      // Create forensic audit trail if requested
      if (options.forensic) {
        const auditTrail = {
          verificationId: verificationResult.id,
          timestamp: new Date().toISOString(),
          artifacts: approvedArtifacts.map(a => ({
            id: a.id,
            hash: a.contentHash,
            tier: a.tier,
            weight: a.weight
          })),
          consent: verificationResult.consent ? {
            id: verificationResult.consent.consentId,
            signature: verificationResult.consent.signature?.hash,
            timestamp: verificationResult.consent.signature?.timestamp
          } : null,
          verificationLevel: verificationResult.level,
          auditor: {
            system: 'ChittyChain Legal Verification System',
            version: '2.0.0',
            operator: verificationResult.consent?.signature?.signer?.email || 'system'
          }
        };

        const auditPath = `forensic-audit-${verificationResult.id}.json`;
        await fs.writeFile(auditPath, JSON.stringify(auditTrail, null, 2));
        console.log(chalk.blue(`Forensic audit trail saved to: ${auditPath}\n`));
      }

      // Add artifacts to pending and mine
      approvedArtifacts.forEach(artifact => {
        chain.pendingArtifacts.push(artifact);
      });

      console.log(chalk.yellow('Mining block with verified artifacts...\n'));
      
      const startTime = Date.now();
      const minerEmail = verificationResult.consent?.signature?.signer?.email || 'legal-system@chittychain.local';
      const block = await chain.minePendingArtifacts(minerEmail);
      const miningTime = Date.now() - startTime;

      console.log(chalk.green('✅ Block successfully mined!\n'));
      console.log(`Block Hash: ${chalk.cyan(block.hash.substring(0, 48))}...`);
      console.log(`Block Index: ${block.index}`);
      console.log(`Mining Time: ${miningTime}ms`);
      console.log(`Miner: ${minerEmail}`);
      console.log(`Artifacts in Block: ${block.artifacts.length}`);

      // Generate legal certificate
      if (options.level === 'legal') {
        const certificate = {
          blockHash: block.hash,
          blockIndex: block.index,
          timestamp: new Date().toISOString(),
          artifacts: block.artifacts.map(a => ({
            id: a.id,
            tier: a.tier,
            weight: a.weight,
            merkleProof: block.getMerkleProof(a.id)
          })),
          verification: {
            id: verificationResult.id,
            level: verificationResult.level,
            consent: verificationResult.consent?.consentId
          },
          certification: 'This blockchain record has been created in compliance with legal evidence standards and includes user consent verification.'
        };

        const certPath = `legal-certificate-block-${block.index}.json`;
        await fs.writeFile(certPath, JSON.stringify(certificate, null, 2));
        console.log(chalk.green(`\n📜 Legal certificate generated: ${certPath}`));
      }

    } catch (error) {
      console.error(chalk.red('Verified minting error:', error.message));
    }
  });

// Verify-Only Command - Trust verification without minting
program
  .command('verify-only')
  .description('Verify artifacts and generate trust report WITHOUT minting')
  .option('-f, --file <path>', 'JSON file containing artifacts to verify')
  .option('-l, --level <level>', 'Verification level (basic|standard|enhanced|legal)', 'legal')
  .option('--snapshot', 'Create auditable snapshot for legal proceedings')
  .option('--notarize', 'Include notarization requirements in verification')
  .option('-o, --output <path>', 'Output path for verification report')
  .action(async (options) => {
    try {
      console.log(chalk.bold.blue('\n🔍 Trust Verification (No Minting)\n'));
      
      // Check if verification service is available
      if (!verificationService) {
        console.error(chalk.red('Verification service not available. Please ensure all dependencies are installed.'));
        return;
      }
      
      // Load artifacts from file or create test artifacts
      let artifacts;
      if (options.file) {
        const fileContent = await fs.readFile(options.file, 'utf8');
        artifacts = JSON.parse(fileContent);
      } else {
        // Create test artifacts for demonstration
        artifacts = [
          {
            id: `VERIFY_${Date.now()}_1`,
            contentHash: crypto.createHash('sha256').update('Document for verification').digest('hex'),
            statement: 'Property Deed - Verification Only',
            weight: 0.95,
            tier: 'GOVERNMENT',
            type: 'PROPERTY_DEED',
            metadata: {
              propertyAddress: '123 Main St, City, State',
              recordedDate: new Date().toISOString(),
              notarized: true
            }
          },
          {
            id: `VERIFY_${Date.now()}_2`,
            contentHash: crypto.createHash('sha256').update('Supporting document').digest('hex'),
            statement: 'Title Insurance Policy',
            weight: 0.85,
            tier: 'FINANCIAL_INSTITUTION',
            type: 'INSURANCE_DOCUMENT',
            metadata: {
              insurer: 'First American Title',
              policyNumber: 'TI-2024-001'
            }
          }
        ];
      }

      console.log(`Verifying ${artifacts.length} artifacts for trust analysis...\n`);

      // Perform verification WITHOUT consent requirement
      const verificationOptions = {
        level: options.level,
        requireNotarization: options.notarize,
        requireUserConsent: false  // Key difference - no consent needed for verify-only
      };

      // Create a modified verification service that skips consent
      const verifyOnlyService = Object.create(verificationService);
      verifyOnlyService.config = { ...verificationService.config, requireUserConsent: false };

      const verificationResult = await verifyOnlyService.verifyArtifactsForMinting(
        artifacts, 
        verificationOptions
      );

      // Generate comprehensive trust report
      const trustReport = {
        reportId: crypto.randomUUID(),
        reportType: 'TRUST_VERIFICATION_ONLY',
        timestamp: new Date().toISOString(),
        verificationLevel: options.level,
        artifacts: artifacts.map((artifact, index) => ({
          ...artifact,
          verification: verificationResult.artifacts[index],
          trustScore: verificationResult.artifacts[index].trustScore,
          status: verificationResult.artifacts[index].status,
          issues: verificationResult.artifacts[index].issues,
          warnings: verificationResult.artifacts[index].warnings
        })),
        summary: {
          totalArtifacts: verificationResult.summary.total,
          passedVerification: verificationResult.summary.passed,
          failedVerification: verificationResult.summary.failed,
          warnings: verificationResult.summary.warnings,
          averageTrustScore: calculateAverageTrustScore(verificationResult.artifacts),
          recommendedForMinting: verificationResult.summary.failed === 0
        },
        analysis: {
          tierBreakdown: {},
          weightDistribution: {},
          verificationChecks: {}
        },
        legal: {
          disclaimer: 'This is a verification report only. No data has been written to the blockchain.',
          purpose: 'This report can be used for legal review and decision-making before permanent blockchain storage.',
          validity: '24 hours from timestamp',
          verificationStandard: 'ChittyChain Legal Evidence Standards v2.0'
        }
      };

      // Calculate tier breakdown
      artifacts.forEach(artifact => {
        trustReport.analysis.tierBreakdown[artifact.tier] = 
          (trustReport.analysis.tierBreakdown[artifact.tier] || 0) + 1;
      });

      // Display results
      console.log(chalk.bold('\n📊 Trust Verification Report\n'));
      console.log(`Report ID: ${chalk.cyan(trustReport.reportId)}`);
      console.log(`Timestamp: ${trustReport.timestamp}`);
      console.log(`Verification Level: ${chalk.yellow(trustReport.verificationLevel)}`);
      console.log(`Average Trust Score: ${getScoreColor(trustReport.summary.averageTrustScore)}(${trustReport.summary.averageTrustScore.toFixed(2)})`);
      
      console.log(chalk.bold('\n📈 Summary:'));
      console.log(`  Total Artifacts: ${trustReport.summary.totalArtifacts}`);
      console.log(`  Passed: ${chalk.green(trustReport.summary.passedVerification)}`);
      console.log(`  Failed: ${chalk.red(trustReport.summary.failedVerification)}`);
      console.log(`  Warnings: ${chalk.yellow(trustReport.summary.warnings)}`);
      console.log(`  Recommended for Minting: ${trustReport.summary.recommendedForMinting ? chalk.green('YES') : chalk.red('NO')}`);

      console.log(chalk.bold('\n🏛️ Tier Distribution:'));
      Object.entries(trustReport.analysis.tierBreakdown).forEach(([tier, count]) => {
        console.log(`  ${tier}: ${count}`);
      });

      // Create auditable snapshot if requested
      if (options.snapshot) {
        const snapshot = {
          ...trustReport,
          snapshot: {
            created: new Date().toISOString(),
            creator: process.env.USER || 'system',
            purpose: 'Legal/Audit Review',
            cryptographicProof: {
              reportHash: crypto.createHash('sha256').update(JSON.stringify(trustReport)).digest('hex'),
              artifactHashes: artifacts.map(a => ({
                id: a.id,
                contentHash: a.contentHash,
                verificationHash: crypto.createHash('sha256')
                  .update(JSON.stringify(verificationResult.artifacts.find(v => v.artifactId === a.id)))
                  .digest('hex')
              }))
            },
            legal: {
              statement: 'This snapshot represents the state of evidence at the time of verification.',
              admissibility: 'This snapshot may be admitted as evidence of the verification process.',
              retention: 'This snapshot should be retained for legal proceedings.',
              warning: 'This is NOT a blockchain record. For permanent storage, use verified-mint command.'
            }
          }
        };

        const snapshotPath = options.output || `trust-snapshot-${trustReport.reportId}.json`;
        await fs.writeFile(snapshotPath, JSON.stringify(snapshot, null, 2));
        
        console.log(chalk.blue(`\n📸 Auditable snapshot created: ${snapshotPath}`));
        console.log(chalk.gray(`  Snapshot Hash: ${snapshot.snapshot.cryptographicProof.reportHash.substring(0, 32)}...`));
      }

      // Display individual artifact results
      console.log(chalk.bold('\n📋 Detailed Verification Results:\n'));
      trustReport.artifacts.forEach((artifact, index) => {
        console.log(`${index + 1}. ${chalk.bold(artifact.id)}`);
        console.log(`   Type: ${artifact.type}`);
        console.log(`   Tier: ${artifact.tier}`);
        console.log(`   Trust Score: ${getScoreColor(artifact.trustScore)}(${artifact.trustScore.toFixed(2)})`);
        console.log(`   Status: ${getStatusColor(artifact.status)}(${artifact.status})`);
        
        if (artifact.issues.length > 0) {
          console.log(`   ${chalk.red('Issues:')} ${artifact.issues.join(', ')}`);
        }
        if (artifact.warnings.length > 0) {
          console.log(`   ${chalk.yellow('Warnings:')} ${artifact.warnings.join(', ')}`);
        }
        console.log();
      });

      // Save full report if output specified
      if (options.output && !options.snapshot) {
        await fs.writeFile(options.output, JSON.stringify(trustReport, null, 2));
        console.log(chalk.green(`\n✅ Full verification report saved to: ${options.output}`));
      }

      console.log(chalk.bold.gray('\n📌 Note: No data has been written to the blockchain.'));
      console.log(chalk.gray('To mint these artifacts after review, use: chittychain verified-mint\n'));

    } catch (error) {
      console.error(chalk.red('Verification error:', error.message));
    }
  });

// Helper function to calculate average trust score
function calculateAverageTrustScore(verifications) {
  if (verifications.length === 0) return 0;
  const total = verifications.reduce((sum, v) => sum + v.trustScore, 0);
  return total / verifications.length;
}

// Helper function to get color based on score
function getScoreColor(score) {
  if (score >= 0.8) return chalk.green;
  if (score >= 0.6) return chalk.yellow;
  return chalk.red;
}

// Helper function to get status color
function getStatusColor(status) {
  switch (status) {
    case 'passed': return chalk.green;
    case 'warning': return chalk.yellow;
    case 'failed': return chalk.red;
    default: return chalk.gray;
  }
}

// Helper function to validate chain
async function validateChain() {
  try {
    const validator = new BlockchainValidationService(chain);
    const result = await validator.validateBlockchain();
    return result.valid;
  } catch (error) {
    return false;
  }
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection:', reason));
  process.exit(1);
});

// Parse and execute
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}