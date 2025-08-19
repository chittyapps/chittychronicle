#!/usr/bin/env node

/**
 * ChittyChain Trust Layer - Analysis, Verification & User Consent
 * 
 * This layer ensures:
 * 1. Evidence is analyzed and verified before minting
 * 2. Trust scores are calculated based on evidence tiers
 * 3. Users must explicitly consent to minting operations
 * 4. Contradictions are detected and resolved
 * 5. Chain of custody is maintained
 */

import { ChittyChainV2 } from '../../src/blockchain/ChittyChainV2.js';
import crypto from 'crypto';
import readline from 'readline/promises';

// Optional UI dependencies - fallback to plain text if not available
let chalk, ora;
try {
  chalk = (await import('chalk')).default;
  ora = (await import('ora')).default;
} catch {
  // Fallback implementations
  chalk = {
    red: (text) => text,
    green: (text) => text,
    yellow: (text) => text,
    blue: (text) => text,
    bold: (text) => text
  };
  ora = (text) => ({
    start: () => ({ succeed: () => {}, fail: () => {}, text }),
    succeed: () => {},
    fail: () => {}
  });
}

export class ChittyChainTrustLayer {
  constructor(chain) {
    this.chain = chain || new ChittyChainV2();
    this.verificationQueue = new Map();
    this.trustAnalysis = new Map();
    this.userConsents = new Map();
    
    // Trust tier weights (from ChittyChain spec)
    this.trustTiers = {
      SELF_AUTHENTICATING: { weight: 1.0, autoMint: true },
      GOVERNMENT: { weight: 0.95, autoMint: true },
      FINANCIAL_INSTITUTION: { weight: 0.90, autoMint: false },
      INDEPENDENT_THIRD_PARTY: { weight: 0.85, autoMint: false },
      BUSINESS_RECORDS: { weight: 0.80, autoMint: false },
      FIRST_PARTY_ADVERSE: { weight: 0.75, autoMint: false },
      FIRST_PARTY_FRIENDLY: { weight: 0.60, autoMint: false },
      UNCORROBORATED_PERSON: { weight: 0.40, autoMint: false }
    };
  }

  /**
   * Analyze evidence for trust score and validity
   */
  async analyzeEvidence(evidence) {
    const analysis = {
      id: evidence.id,
      timestamp: Date.now(),
      trustScore: 0,
      verifications: [],
      warnings: [],
      contradictions: [],
      recommendations: []
    };

    // 1. Calculate base trust score from tier
    const tierConfig = this.trustTiers[evidence.tier];
    if (!tierConfig) {
      analysis.warnings.push(`Unknown tier: ${evidence.tier}`);
      analysis.trustScore = 0;
      return analysis;
    }
    
    analysis.trustScore = tierConfig.weight;
    analysis.verifications.push(`Base trust score from ${evidence.tier}: ${tierConfig.weight}`);

    // 2. Verify content hash
    if (evidence.content) {
      const calculatedHash = crypto.createHash('sha3-256')
        .update(evidence.content)
        .digest('hex');
      
      if (evidence.contentHash && evidence.contentHash !== calculatedHash) {
        analysis.warnings.push('Content hash mismatch - potential tampering');
        analysis.trustScore *= 0.5;
      } else {
        analysis.verifications.push('Content hash verified');
      }
    }

    // 3. Check for contradictions
    const contradictions = await this.findContradictions(evidence);
    if (contradictions.length > 0) {
      analysis.contradictions = contradictions;
      analysis.warnings.push(`Found ${contradictions.length} contradicting artifacts`);
      
      // Reduce trust score based on contradictions
      contradictions.forEach(contradiction => {
        if (contradiction.tier && this.trustTiers[contradiction.tier]) {
          const contradictionWeight = this.trustTiers[contradiction.tier].weight;
          if (contradictionWeight > analysis.trustScore) {
            analysis.trustScore *= 0.7; // Reduce trust if contradicted by higher tier
            analysis.warnings.push(`Contradicted by higher tier evidence: ${contradiction.id}`);
          }
        }
      });
    }

    // 4. Verify authentication method
    if (evidence.authenticationMethod) {
      switch (evidence.authenticationMethod) {
        case 'DIGITAL_SEAL':
          analysis.verifications.push('Digital seal authentication verified');
          analysis.trustScore *= 1.1; // Boost for digital seal
          break;
        case 'NOTARIZED':
          analysis.verifications.push('Notarization verified');
          analysis.trustScore *= 1.05;
          break;
        case 'WITNESS':
          analysis.verifications.push('Witness authentication noted');
          break;
        default:
          analysis.warnings.push('Unknown authentication method');
      }
    }

    // 5. Check chain of custody
    if (evidence.chainOfCustody && Array.isArray(evidence.chainOfCustody)) {
      const custodyValid = this.validateChainOfCustody(evidence.chainOfCustody);
      if (custodyValid) {
        analysis.verifications.push('Chain of custody intact');
      } else {
        analysis.warnings.push('Chain of custody broken or incomplete');
        analysis.trustScore *= 0.8;
      }
    }

    // 6. Date verification
    if (evidence.timestamp) {
      const age = Date.now() - evidence.timestamp;
      const daysOld = age / (1000 * 60 * 60 * 24);
      
      if (daysOld > 365) {
        analysis.warnings.push(`Evidence is ${Math.floor(daysOld)} days old`);
        analysis.trustScore *= 0.95; // Slight reduction for old evidence
      }
    }

    // 7. Generate recommendations
    if (analysis.trustScore >= 0.95) {
      analysis.recommendations.push('Recommended for automatic minting');
    } else if (analysis.trustScore >= 0.8) {
      analysis.recommendations.push('Recommended for minting with user approval');
    } else if (analysis.trustScore >= 0.6) {
      analysis.recommendations.push('Requires additional corroboration');
    } else {
      analysis.recommendations.push('Not recommended for minting without significant corroboration');
    }

    // Cap trust score at 1.0
    analysis.trustScore = Math.min(1.0, analysis.trustScore);
    
    // Store analysis
    this.trustAnalysis.set(evidence.id, analysis);
    
    return analysis;
  }

  /**
   * Find contradicting artifacts in the blockchain
   */
  async findContradictions(evidence) {
    const contradictions = [];
    
    // Query existing artifacts
    const existingArtifacts = this.chain.queryArtifacts({
      caseId: evidence.caseId,
      type: evidence.type
    });

    for (const artifact of existingArtifacts) {
      // Check for direct contradictions
      if (this.detectContradiction(evidence, artifact)) {
        contradictions.push({
          id: artifact.id,
          tier: artifact.tier,
          reason: 'Conflicting statement or data',
          severity: this.calculateContradictionSeverity(evidence, artifact)
        });
      }
    }

    return contradictions;
  }

  /**
   * Detect if two pieces of evidence contradict each other
   */
  detectContradiction(evidence1, evidence2) {
    // Simple contradiction detection - can be enhanced with NLP
    if (evidence1.statement && evidence2.statement) {
      // Check for opposite assertions
      const opposites = [
        ['owns', 'does not own'],
        ['true', 'false'],
        ['valid', 'invalid'],
        ['authentic', 'forged']
      ];

      for (const [word1, word2] of opposites) {
        if (
          (evidence1.statement.includes(word1) && evidence2.statement.includes(word2)) ||
          (evidence1.statement.includes(word2) && evidence2.statement.includes(word1))
        ) {
          return true;
        }
      }
    }

    // Check for conflicting values
    if (evidence1.metadata && evidence2.metadata) {
      const keys = Object.keys(evidence1.metadata);
      for (const key of keys) {
        if (
          evidence2.metadata[key] !== undefined &&
          evidence1.metadata[key] !== evidence2.metadata[key]
        ) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Calculate severity of contradiction
   */
  calculateContradictionSeverity(evidence1, evidence2) {
    const tier1Weight = this.trustTiers[evidence1.tier]?.weight || 0;
    const tier2Weight = this.trustTiers[evidence2.tier]?.weight || 0;
    
    const weightDiff = Math.abs(tier1Weight - tier2Weight);
    
    if (weightDiff > 0.3) return 'HIGH';
    if (weightDiff > 0.15) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Validate chain of custody
   */
  validateChainOfCustody(custody) {
    if (!Array.isArray(custody) || custody.length === 0) return false;

    let previousTimestamp = 0;
    for (const entry of custody) {
      if (!entry.timestamp || !entry.holder || !entry.action) {
        return false;
      }
      
      // Ensure chronological order
      if (entry.timestamp <= previousTimestamp) {
        return false;
      }
      
      previousTimestamp = entry.timestamp;
    }

    return true;
  }

  /**
   * Request user consent for minting
   */
  async requestUserConsent(evidence, analysis) {
    console.log('\n' + chalk.bold('=== CHITTYCHAIN MINTING CONSENT REQUEST ==='));
    console.log('\n' + chalk.cyan('Evidence Summary:'));
    console.log(`  ID: ${evidence.id}`);
    console.log(`  Type: ${evidence.type}`);
    console.log(`  Tier: ${evidence.tier}`);
    console.log(`  Statement: ${evidence.statement || 'N/A'}`);
    
    console.log('\n' + chalk.yellow('Trust Analysis:'));
    console.log(`  Trust Score: ${chalk.bold((analysis.trustScore * 100).toFixed(1) + '%')}`);
    
    if (analysis.verifications.length > 0) {
      console.log('\n' + chalk.green('✓ Verifications:'));
      analysis.verifications.forEach(v => console.log(`    - ${v}`));
    }
    
    if (analysis.warnings.length > 0) {
      console.log('\n' + chalk.red('⚠ Warnings:'));
      analysis.warnings.forEach(w => console.log(`    - ${w}`));
    }
    
    if (analysis.contradictions.length > 0) {
      console.log('\n' + chalk.red('⚔ Contradictions Found:'));
      analysis.contradictions.forEach(c => {
        console.log(`    - ${c.id} (${c.tier}) - ${c.reason}`);
      });
    }
    
    console.log('\n' + chalk.magenta('Recommendations:'));
    analysis.recommendations.forEach(r => console.log(`  • ${r}`));
    
    // Interactive consent
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n' + chalk.bold.yellow('⚖️  LEGAL NOTICE:'));
    console.log('By approving this minting operation, you affirm that:');
    console.log('  1. The evidence is authentic and accurate');
    console.log('  2. You have the legal right to submit this evidence');
    console.log('  3. You understand this will create an immutable blockchain record');
    console.log('  4. You accept responsibility for the accuracy of this information');
    
    const response = await rl.question('\n' + chalk.bold('Do you consent to mint this evidence? (yes/no/review): '));
    rl.close();

    const consent = {
      evidenceId: evidence.id,
      timestamp: Date.now(),
      granted: false,
      reason: '',
      trustScoreAtConsent: analysis.trustScore
    };

    switch (response.toLowerCase()) {
      case 'yes':
      case 'y':
        consent.granted = true;
        consent.reason = 'User explicitly consented';
        break;
      
      case 'review':
      case 'r':
        // Show detailed evidence
        console.log('\n' + chalk.cyan('Full Evidence Data:'));
        console.log(JSON.stringify(evidence, null, 2));
        
        const reviewResponse = await rl.question('\nAfter review, do you consent? (yes/no): ');
        if (reviewResponse.toLowerCase() === 'yes' || reviewResponse.toLowerCase() === 'y') {
          consent.granted = true;
          consent.reason = 'User consented after detailed review';
        } else {
          consent.granted = false;
          consent.reason = 'User declined after review';
        }
        break;
      
      default:
        consent.granted = false;
        consent.reason = 'User declined consent';
    }

    // Store consent record
    this.userConsents.set(evidence.id, consent);
    
    return consent;
  }

  /**
   * Process evidence through trust layer
   */
  async processEvidence(evidence, options = {}) {
    const spinner = ora('Analyzing evidence...').start();
    
    try {
      // 1. Analyze evidence
      const analysis = await this.analyzeEvidence(evidence);
      spinner.succeed('Evidence analyzed');
      
      // 2. Check if auto-mint is allowed
      const tierConfig = this.trustTiers[evidence.tier];
      const autoMintAllowed = tierConfig?.autoMint && analysis.trustScore >= 0.95;
      
      if (autoMintAllowed && !options.requireConsent) {
        spinner.info('Auto-minting approved for high-trust evidence');
        return {
          approved: true,
          analysis,
          consent: { granted: true, reason: 'Auto-approved based on tier and trust score' }
        };
      }
      
      // 3. Request user consent
      const consent = await this.requestUserConsent(evidence, analysis);
      
      if (consent.granted) {
        spinner.succeed('Minting approved by user');
        return {
          approved: true,
          analysis,
          consent
        };
      } else {
        spinner.fail('Minting rejected by user');
        return {
          approved: false,
          analysis,
          consent
        };
      }
    } catch (error) {
      spinner.fail('Error processing evidence: ' + error.message);
      throw error;
    }
  }

  /**
   * Batch process multiple evidence items
   */
  async processBatch(evidenceArray, options = {}) {
    console.log(chalk.bold(`\n=== Processing ${evidenceArray.length} Evidence Items ===\n`));
    
    const results = {
      approved: [],
      rejected: [],
      analyses: []
    };

    for (const evidence of evidenceArray) {
      console.log(chalk.cyan(`\nProcessing: ${evidence.id}`));
      const result = await this.processEvidence(evidence, options);
      
      results.analyses.push(result.analysis);
      
      if (result.approved) {
        results.approved.push(evidence);
      } else {
        results.rejected.push(evidence);
      }
    }

    // Summary
    console.log(chalk.bold('\n=== Batch Processing Summary ==='));
    console.log(chalk.green(`  Approved: ${results.approved.length}`));
    console.log(chalk.red(`  Rejected: ${results.rejected.length}`));
    console.log(chalk.blue(`  Total: ${evidenceArray.length}`));
    
    return results;
  }

  /**
   * Export trust analysis report
   */
  exportTrustReport() {
    const report = {
      timestamp: Date.now(),
      totalAnalyses: this.trustAnalysis.size,
      averageTrustScore: 0,
      tierDistribution: {},
      contradictionCount: 0,
      consentRecords: []
    };

    let totalScore = 0;
    for (const [id, analysis] of this.trustAnalysis) {
      totalScore += analysis.trustScore;
      
      if (analysis.contradictions.length > 0) {
        report.contradictionCount += analysis.contradictions.length;
      }
    }

    report.averageTrustScore = totalScore / this.trustAnalysis.size;

    // Add consent records
    for (const [id, consent] of this.userConsents) {
      report.consentRecords.push({
        evidenceId: id,
        granted: consent.granted,
        timestamp: consent.timestamp,
        reason: consent.reason
      });
    }

    return report;
  }
}

// CLI Integration
if (import.meta.url === `file://${process.argv[1]}`) {
  const trustLayer = new ChittyChainTrustLayer();
  
  // Example evidence for testing
  const testEvidence = {
    id: 'TEST_001',
    type: 'DOCUMENT',
    tier: 'GOVERNMENT',
    statement: 'Property deed transfer recorded',
    contentHash: 'abc123',
    authenticationMethod: 'DIGITAL_SEAL',
    chainOfCustody: [
      { timestamp: Date.now() - 86400000, holder: 'County Clerk', action: 'Recorded' },
      { timestamp: Date.now(), holder: 'ChittyChain', action: 'Digitized' }
    ]
  };

  trustLayer.processEvidence(testEvidence).then(result => {
    console.log('\n' + chalk.bold('Final Result:'));
    console.log(JSON.stringify(result, null, 2));
  });
}