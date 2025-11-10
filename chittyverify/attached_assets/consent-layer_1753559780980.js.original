#!/usr/bin/env node

/**
 * ChittyChain Consent Layer - User Verification and Trust System
 * 
 * This layer ensures users explicitly consent to minting operations and
 * provides trust verification before immutable blockchain storage.
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ChittyChainConsentLayer {
  constructor(config = {}) {
    this.config = {
      requireSignature: true,
      requireMultiFactorApproval: false,
      minApprovers: 1,
      trustThreshold: 0.85,
      auditLogPath: path.join(__dirname, 'consent-audit.log'),
      ...config
    };
    
    this.pendingConsents = new Map();
    this.approvalHistory = new Map();
  }

  /**
   * Request user consent for minting artifacts
   */
  async requestMintingConsent(artifacts, options = {}) {
    console.log(chalk.bold.blue('\n🔐 ChittyChain Minting Consent Required\n'));
    
    // Display artifacts for review
    console.log(chalk.yellow('The following artifacts are ready for minting:\n'));
    
    const consentRequest = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      artifacts: artifacts,
      status: 'pending',
      options: options
    };
    
    // Display each artifact with details
    artifacts.forEach((artifact, index) => {
      console.log(chalk.bold(`${index + 1}. ${artifact.type} - ${artifact.id}`));
      console.log(`   Tier: ${this.getTierColor(artifact.tier)}(${artifact.tier})`);
      console.log(`   Weight: ${this.getWeightColor(artifact.weight)}(${artifact.weight})`);
      console.log(`   Statement: ${artifact.statement}`);
      if (artifact.caseId) console.log(`   Case: ${artifact.caseId}`);
      console.log();
    });

    // Trust analysis
    const trustAnalysis = await this.analyzeTrust(artifacts);
    this.displayTrustAnalysis(trustAnalysis);

    // Get user decision
    const decision = await this.getUserDecision(consentRequest);
    
    if (!decision.approved) {
      console.log(chalk.red('\n❌ Minting cancelled by user\n'));
      return {
        approved: false,
        consentId: consentRequest.id,
        reason: decision.reason
      };
    }

    // Handle signature requirement
    if (this.config.requireSignature) {
      const signature = await this.getDigitalSignature(consentRequest);
      if (!signature.valid) {
        console.log(chalk.red('\n❌ Invalid signature - minting cancelled\n'));
        return {
          approved: false,
          consentId: consentRequest.id,
          reason: 'Invalid signature'
        };
      }
      consentRequest.signature = signature;
    }

    // Multi-factor approval if required
    if (this.config.requireMultiFactorApproval) {
      const mfaResult = await this.performMultiFactorApproval(consentRequest);
      if (!mfaResult.approved) {
        console.log(chalk.red('\n❌ Multi-factor approval failed\n'));
        return {
          approved: false,
          consentId: consentRequest.id,
          reason: 'MFA failed'
        };
      }
      consentRequest.mfa = mfaResult;
    }

    // Store consent record
    consentRequest.status = 'approved';
    consentRequest.approvedAt = new Date().toISOString();
    await this.storeConsentRecord(consentRequest);

    console.log(chalk.green('\n✅ Minting approved and recorded\n'));
    
    return {
      approved: true,
      consentId: consentRequest.id,
      signature: consentRequest.signature,
      trustScore: trustAnalysis.overallScore,
      record: consentRequest
    };
  }

  /**
   * Analyze trust levels of artifacts
   */
  async analyzeTrust(artifacts) {
    const analysis = {
      totalArtifacts: artifacts.length,
      tierBreakdown: {},
      weightAnalysis: {
        average: 0,
        min: 1,
        max: 0,
        aboveThreshold: 0
      },
      concerns: [],
      recommendations: [],
      overallScore: 0
    };

    let totalWeight = 0;

    artifacts.forEach(artifact => {
      // Tier analysis
      analysis.tierBreakdown[artifact.tier] = (analysis.tierBreakdown[artifact.tier] || 0) + 1;
      
      // Weight analysis
      totalWeight += artifact.weight;
      analysis.weightAnalysis.min = Math.min(analysis.weightAnalysis.min, artifact.weight);
      analysis.weightAnalysis.max = Math.max(analysis.weightAnalysis.max, artifact.weight);
      
      if (artifact.weight >= this.config.trustThreshold) {
        analysis.weightAnalysis.aboveThreshold++;
      }

      // Flag concerns
      if (artifact.weight < 0.5) {
        analysis.concerns.push(`Low weight artifact: ${artifact.id} (${artifact.weight})`);
      }
      
      if (artifact.tier === 'UNCORROBORATED_PERSON' && artifact.weight > 0.7) {
        analysis.concerns.push(`Suspiciously high weight for uncorroborated evidence: ${artifact.id}`);
      }
    });

    analysis.weightAnalysis.average = totalWeight / artifacts.length;
    
    // Calculate overall trust score
    analysis.overallScore = this.calculateTrustScore(analysis);

    // Generate recommendations
    if (analysis.overallScore < 0.7) {
      analysis.recommendations.push('Consider obtaining additional corroborating evidence');
    }
    
    if (analysis.concerns.length > 0) {
      analysis.recommendations.push('Review flagged concerns before proceeding');
    }

    return analysis;
  }

  /**
   * Display trust analysis to user
   */
  displayTrustAnalysis(analysis) {
    console.log(chalk.bold.cyan('\n📊 Trust Analysis Report\n'));
    
    // Overall score with color
    const scoreColor = analysis.overallScore >= 0.8 ? chalk.green : 
                      analysis.overallScore >= 0.6 ? chalk.yellow : chalk.red;
    console.log(`Overall Trust Score: ${scoreColor(analysis.overallScore.toFixed(2))}\n`);

    // Tier breakdown
    console.log(chalk.bold('Evidence Tier Distribution:'));
    Object.entries(analysis.tierBreakdown).forEach(([tier, count]) => {
      console.log(`  ${tier}: ${count}`);
    });

    // Weight analysis
    console.log(chalk.bold('\nWeight Analysis:'));
    console.log(`  Average: ${analysis.weightAnalysis.average.toFixed(2)}`);
    console.log(`  Range: ${analysis.weightAnalysis.min.toFixed(2)} - ${analysis.weightAnalysis.max.toFixed(2)}`);
    console.log(`  Above threshold (${this.config.trustThreshold}): ${analysis.weightAnalysis.aboveThreshold}/${analysis.totalArtifacts}`);

    // Concerns
    if (analysis.concerns.length > 0) {
      console.log(chalk.bold.yellow('\n⚠️  Concerns:'));
      analysis.concerns.forEach(concern => {
        console.log(`  - ${concern}`);
      });
    }

    // Recommendations
    if (analysis.recommendations.length > 0) {
      console.log(chalk.bold.blue('\n💡 Recommendations:'));
      analysis.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }
  }

  /**
   * Get user decision on minting
   */
  async getUserDecision(consentRequest) {
    const questions = [
      {
        type: 'confirm',
        name: 'approved',
        message: 'Do you approve minting these artifacts to the blockchain?',
        default: false
      },
      {
        type: 'list',
        name: 'reason',
        message: 'Why are you declining?',
        choices: [
          'Need more verification',
          'Concerns about evidence quality',
          'Missing required documentation',
          'Legal review needed',
          'Other'
        ],
        when: (answers) => !answers.approved
      },
      {
        type: 'input',
        name: 'customReason',
        message: 'Please specify:',
        when: (answers) => answers.reason === 'Other'
      }
    ];

    const answers = await inquirer.prompt(questions);
    
    if (answers.customReason) {
      answers.reason = answers.customReason;
    }

    return answers;
  }

  /**
   * Get digital signature from user
   */
  async getDigitalSignature(consentRequest) {
    console.log(chalk.bold.yellow('\n🖊️  Digital Signature Required\n'));
    
    const questions = [
      {
        type: 'input',
        name: 'name',
        message: 'Full legal name:',
        validate: (input) => input.length >= 3 || 'Please enter your full name'
      },
      {
        type: 'input',
        name: 'email',
        message: 'Email address:',
        validate: (input) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input) || 'Please enter a valid email'
      },
      {
        type: 'password',
        name: 'pin',
        message: 'Enter PIN (4-6 digits):',
        mask: '*',
        validate: (input) => /^\d{4,6}$/.test(input) || 'PIN must be 4-6 digits'
      }
    ];

    const signature = await inquirer.prompt(questions);
    
    // Generate signature hash
    const signatureData = {
      ...signature,
      consentId: consentRequest.id,
      timestamp: new Date().toISOString(),
      artifactHashes: consentRequest.artifacts.map(a => a.contentHash)
    };
    
    const signatureHash = crypto.createHash('sha256')
      .update(JSON.stringify(signatureData))
      .digest('hex');
    
    return {
      valid: true,
      hash: signatureHash,
      signer: {
        name: signature.name,
        email: signature.email
      },
      timestamp: signatureData.timestamp
    };
  }

  /**
   * Perform multi-factor approval if required
   */
  async performMultiFactorApproval(consentRequest) {
    console.log(chalk.bold.yellow('\n🔐 Multi-Factor Approval Required\n'));
    
    const questions = [
      {
        type: 'list',
        name: 'method',
        message: 'Select verification method:',
        choices: [
          'SMS verification code',
          'Email verification code',
          'Authenticator app',
          'Hardware token'
        ]
      },
      {
        type: 'input',
        name: 'code',
        message: 'Enter verification code:',
        validate: (input) => /^\d{6}$/.test(input) || 'Code must be 6 digits'
      }
    ];

    const mfa = await inquirer.prompt(questions);
    
    // In production, this would verify against actual MFA service
    // For now, we'll simulate with a simple check
    const validCode = mfa.code === '123456'; // Demo only
    
    if (!validCode) {
      console.log(chalk.red('Invalid verification code'));
    }
    
    return {
      approved: validCode,
      method: mfa.method,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate overall trust score
   */
  calculateTrustScore(analysis) {
    let score = 0;
    
    // Weight-based scoring (50%)
    score += (analysis.weightAnalysis.average * 0.5);
    
    // Tier-based scoring (30%)
    const tierScores = {
      'SELF_AUTHENTICATING': 1.0,
      'GOVERNMENT': 0.95,
      'FINANCIAL_INSTITUTION': 0.90,
      'INDEPENDENT_THIRD_PARTY': 0.85,
      'BUSINESS_RECORDS': 0.80,
      'FIRST_PARTY_ADVERSE': 0.75,
      'FIRST_PARTY_FRIENDLY': 0.60,
      'UNCORROBORATED_PERSON': 0.40
    };
    
    let tierScore = 0;
    Object.entries(analysis.tierBreakdown).forEach(([tier, count]) => {
      tierScore += (tierScores[tier] || 0.5) * (count / analysis.totalArtifacts);
    });
    score += (tierScore * 0.3);
    
    // Concern penalty (20%)
    const concernPenalty = Math.min(analysis.concerns.length * 0.05, 0.2);
    score += (0.2 - concernPenalty);
    
    return Math.min(Math.max(score, 0), 1);
  }

  /**
   * Store consent record for audit
   */
  async storeConsentRecord(record) {
    const auditEntry = {
      ...record,
      stored: new Date().toISOString()
    };
    
    try {
      await fs.appendFile(
        this.config.auditLogPath,
        JSON.stringify(auditEntry) + '\n'
      );
    } catch (error) {
      console.error('Failed to store consent record:', error);
    }
    
    this.approvalHistory.set(record.id, auditEntry);
  }

  /**
   * Get tier color for display
   */
  getTierColor(tier) {
    const colors = {
      'SELF_AUTHENTICATING': chalk.bold.green,
      'GOVERNMENT': chalk.green,
      'FINANCIAL_INSTITUTION': chalk.green,
      'INDEPENDENT_THIRD_PARTY': chalk.cyan,
      'BUSINESS_RECORDS': chalk.cyan,
      'FIRST_PARTY_ADVERSE': chalk.yellow,
      'FIRST_PARTY_FRIENDLY': chalk.yellow,
      'UNCORROBORATED_PERSON': chalk.red
    };
    
    return (colors[tier] || chalk.white)(tier);
  }

  /**
   * Get weight color for display
   */
  getWeightColor(weight) {
    if (weight >= 0.8) return chalk.green;
    if (weight >= 0.6) return chalk.yellow;
    return chalk.red;
  }

  /**
   * Verify previous consent
   */
  async verifyConsent(consentId) {
    const record = this.approvalHistory.get(consentId);
    if (!record) {
      return { valid: false, reason: 'Consent record not found' };
    }
    
    return {
      valid: record.status === 'approved',
      record: record,
      signature: record.signature
    };
  }
}

// Export for use in CLI and MCP
export default ChittyChainConsentLayer;