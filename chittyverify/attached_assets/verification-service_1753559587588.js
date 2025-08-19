#!/usr/bin/env node

/**
 * ChittyChain Verification Service - Trust Layer Integration
 * 
 * This service provides comprehensive verification and validation
 * before artifacts are minted to the blockchain.
 */

import crypto from 'crypto';
import { ChittyChainConsentLayer } from './chittychain-consent-layer.js';

export class ChittyChainVerificationService {
  constructor(config = {}) {
    this.config = {
      verificationLevels: {
        basic: ['format', 'hash', 'tier'],
        standard: ['basic', 'weight', 'contradiction'],
        enhanced: ['standard', 'external', 'ai_analysis'],
        legal: ['enhanced', 'notarization', 'witness']
      },
      defaultLevel: 'standard',
      requireUserConsent: true,
      autoVerifyThreshold: 0.95,
      ...config
    };
    
    this.consentLayer = new ChittyChainConsentLayer(config.consent || {});
    this.verificationCache = new Map();
  }

  /**
   * Comprehensive artifact verification before minting
   */
  async verifyArtifactsForMinting(artifacts, options = {}) {
    const verificationLevel = options.level || this.config.defaultLevel;
    const verificationId = crypto.randomUUID();
    
    console.log(`\n🔍 Starting ${verificationLevel} verification for ${artifacts.length} artifacts...\n`);
    
    const verificationResult = {
      id: verificationId,
      timestamp: new Date().toISOString(),
      level: verificationLevel,
      artifacts: [],
      summary: {
        total: artifacts.length,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      requiresConsent: true,
      autoApproved: false
    };

    // Perform verification for each artifact
    for (const artifact of artifacts) {
      const artifactVerification = await this.verifyArtifact(artifact, verificationLevel);
      verificationResult.artifacts.push(artifactVerification);
      
      if (artifactVerification.status === 'passed') {
        verificationResult.summary.passed++;
      } else if (artifactVerification.status === 'failed') {
        verificationResult.summary.failed++;
      } else {
        verificationResult.summary.warnings++;
      }
    }

    // Check if auto-approval is possible
    const avgTrustScore = this.calculateAverageTrustScore(verificationResult.artifacts);
    if (avgTrustScore >= this.config.autoVerifyThreshold && verificationResult.summary.failed === 0) {
      verificationResult.autoApproved = true;
      verificationResult.requiresConsent = false;
      console.log(`✅ Auto-approved: Trust score ${avgTrustScore.toFixed(2)} exceeds threshold\n`);
    }

    // Get user consent if required
    if (this.config.requireUserConsent && verificationResult.requiresConsent) {
      const validArtifacts = artifacts.filter((_, index) => 
        verificationResult.artifacts[index].status !== 'failed'
      );
      
      if (validArtifacts.length === 0) {
        console.log('❌ No valid artifacts to mint\n');
        verificationResult.consentDenied = true;
        return verificationResult;
      }

      const consentResult = await this.consentLayer.requestMintingConsent(validArtifacts, {
        verificationId: verificationId,
        level: verificationLevel
      });
      
      verificationResult.consent = consentResult;
      
      if (!consentResult.approved) {
        verificationResult.consentDenied = true;
        return verificationResult;
      }
    }

    // Cache verification result
    this.verificationCache.set(verificationId, verificationResult);
    
    return verificationResult;
  }

  /**
   * Verify individual artifact
   */
  async verifyArtifact(artifact, level) {
    const verification = {
      artifactId: artifact.id,
      timestamp: new Date().toISOString(),
      checks: {},
      status: 'passed',
      trustScore: 0,
      issues: [],
      warnings: []
    };

    // Get checks for verification level
    const checks = this.getChecksForLevel(level);
    
    // Perform each check
    for (const check of checks) {
      const checkResult = await this.performCheck(check, artifact);
      verification.checks[check] = checkResult;
      
      if (!checkResult.passed) {
        if (checkResult.critical) {
          verification.status = 'failed';
          verification.issues.push(checkResult.message);
        } else {
          if (verification.status === 'passed') {
            verification.status = 'warning';
          }
          verification.warnings.push(checkResult.message);
        }
      }
    }

    // Calculate trust score
    verification.trustScore = this.calculateArtifactTrustScore(artifact, verification);

    return verification;
  }

  /**
   * Get checks for verification level
   */
  getChecksForLevel(level) {
    const allChecks = {
      format: true,
      hash: true,
      tier: true,
      weight: true,
      contradiction: true,
      external: true,
      ai_analysis: true,
      notarization: true,
      witness: true
    };

    const levelChecks = this.config.verificationLevels[level];
    const enabledChecks = [];

    levelChecks.forEach(checkGroup => {
      if (allChecks[checkGroup]) {
        enabledChecks.push(checkGroup);
      } else if (this.config.verificationLevels[checkGroup]) {
        // Recursive expansion of check groups
        enabledChecks.push(...this.getChecksForLevel(checkGroup));
      }
    });

    return [...new Set(enabledChecks)];
  }

  /**
   * Perform specific verification check
   */
  async performCheck(checkType, artifact) {
    switch (checkType) {
      case 'format':
        return this.checkFormat(artifact);
      
      case 'hash':
        return this.checkHash(artifact);
      
      case 'tier':
        return this.checkTier(artifact);
      
      case 'weight':
        return this.checkWeight(artifact);
      
      case 'contradiction':
        return this.checkContradiction(artifact);
      
      case 'external':
        return this.checkExternal(artifact);
      
      case 'ai_analysis':
        return this.checkAIAnalysis(artifact);
      
      case 'notarization':
        return this.checkNotarization(artifact);
      
      case 'witness':
        return this.checkWitness(artifact);
      
      default:
        return { passed: true, message: 'Unknown check type' };
    }
  }

  /**
   * Check artifact format
   */
  checkFormat(artifact) {
    const requiredFields = ['id', 'contentHash', 'statement', 'weight', 'tier', 'type'];
    const missingFields = requiredFields.filter(field => !artifact[field]);
    
    if (missingFields.length > 0) {
      return {
        passed: false,
        critical: true,
        message: `Missing required fields: ${missingFields.join(', ')}`
      };
    }
    
    // Validate hash format
    if (!/^[a-f0-9]{64}$/.test(artifact.contentHash)) {
      return {
        passed: false,
        critical: true,
        message: 'Invalid content hash format'
      };
    }
    
    return { passed: true };
  }

  /**
   * Check content hash validity
   */
  checkHash(artifact) {
    // In production, this would verify against actual content
    // For now, we check hash format and simulate verification
    
    if (artifact.contentHash.startsWith('0000')) {
      return {
        passed: false,
        critical: false,
        message: 'Suspicious hash pattern detected'
      };
    }
    
    return { passed: true };
  }

  /**
   * Check tier validity
   */
  checkTier(artifact) {
    const validTiers = [
      'SELF_AUTHENTICATING',
      'GOVERNMENT',
      'FINANCIAL_INSTITUTION',
      'INDEPENDENT_THIRD_PARTY',
      'BUSINESS_RECORDS',
      'FIRST_PARTY_ADVERSE',
      'FIRST_PARTY_FRIENDLY',
      'UNCORROBORATED_PERSON'
    ];
    
    if (!validTiers.includes(artifact.tier)) {
      return {
        passed: false,
        critical: true,
        message: `Invalid tier: ${artifact.tier}`
      };
    }
    
    // Check tier-weight consistency
    const expectedWeightRanges = {
      'SELF_AUTHENTICATING': [0.95, 1.0],
      'GOVERNMENT': [0.90, 0.99],
      'FINANCIAL_INSTITUTION': [0.85, 0.95],
      'INDEPENDENT_THIRD_PARTY': [0.80, 0.90],
      'BUSINESS_RECORDS': [0.75, 0.85],
      'FIRST_PARTY_ADVERSE': [0.70, 0.80],
      'FIRST_PARTY_FRIENDLY': [0.50, 0.70],
      'UNCORROBORATED_PERSON': [0.0, 0.50]
    };
    
    const range = expectedWeightRanges[artifact.tier];
    if (artifact.weight < range[0] || artifact.weight > range[1]) {
      return {
        passed: false,
        critical: false,
        message: `Weight ${artifact.weight} outside expected range for tier ${artifact.tier}`
      };
    }
    
    return { passed: true };
  }

  /**
   * Check weight validity
   */
  checkWeight(artifact) {
    if (artifact.weight < 0 || artifact.weight > 1) {
      return {
        passed: false,
        critical: true,
        message: `Invalid weight: ${artifact.weight}`
      };
    }
    
    if (artifact.weight < 0.3) {
      return {
        passed: true,
        critical: false,
        message: `Very low weight (${artifact.weight}) may affect legal validity`
      };
    }
    
    return { passed: true };
  }

  /**
   * Check for contradictions (placeholder)
   */
  async checkContradiction(artifact) {
    // In production, this would check against existing blockchain
    // and memory systems for contradictory evidence
    
    return { passed: true };
  }

  /**
   * Check external validation (placeholder)
   */
  async checkExternal(artifact) {
    // In production, this would validate against external sources
    // e.g., court systems, government databases
    
    if (artifact.tier === 'GOVERNMENT' && artifact.metadata?.externalId) {
      // Simulate external validation
      return { passed: true, message: 'External validation successful' };
    }
    
    return { passed: true };
  }

  /**
   * AI analysis check (placeholder)
   */
  async checkAIAnalysis(artifact) {
    // In production, this would use AI to analyze document authenticity,
    // detect forgeries, check consistency, etc.
    
    return { passed: true, confidence: 0.85 };
  }

  /**
   * Check notarization status
   */
  checkNotarization(artifact) {
    if (artifact.tier === 'SELF_AUTHENTICATING' && !artifact.metadata?.notarized) {
      return {
        passed: false,
        critical: false,
        message: 'Self-authenticating document lacks notarization'
      };
    }
    
    return { passed: true };
  }

  /**
   * Check witness requirements
   */
  checkWitness(artifact) {
    if (artifact.type === 'SWORN_STATEMENT' && !artifact.metadata?.witnesses) {
      return {
        passed: false,
        critical: false,
        message: 'Sworn statement lacks witness information'
      };
    }
    
    return { passed: true };
  }

  /**
   * Calculate artifact trust score
   */
  calculateArtifactTrustScore(artifact, verification) {
    let score = artifact.weight; // Base score is the artifact weight
    
    // Adjust based on verification results
    const totalChecks = Object.keys(verification.checks).length;
    const passedChecks = Object.values(verification.checks).filter(c => c.passed).length;
    const checkScore = passedChecks / totalChecks;
    
    // Weighted average: 70% weight, 30% verification
    score = (score * 0.7) + (checkScore * 0.3);
    
    // Penalties
    if (verification.issues.length > 0) {
      score *= 0.5; // Severe penalty for critical issues
    } else if (verification.warnings.length > 0) {
      score *= (1 - (verification.warnings.length * 0.05)); // 5% penalty per warning
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate average trust score
   */
  calculateAverageTrustScore(artifactVerifications) {
    if (artifactVerifications.length === 0) return 0;
    
    const totalScore = artifactVerifications.reduce((sum, v) => sum + v.trustScore, 0);
    return totalScore / artifactVerifications.length;
  }

  /**
   * Get verification report
   */
  generateVerificationReport(verificationResult) {
    const report = {
      id: verificationResult.id,
      timestamp: verificationResult.timestamp,
      level: verificationResult.level,
      summary: {
        ...verificationResult.summary,
        trustScore: this.calculateAverageTrustScore(verificationResult.artifacts),
        approved: !verificationResult.consentDenied
      },
      details: {
        artifacts: verificationResult.artifacts.map(a => ({
          id: a.artifactId,
          status: a.status,
          trustScore: a.trustScore,
          issues: a.issues,
          warnings: a.warnings
        }))
      }
    };
    
    if (verificationResult.consent) {
      report.consent = {
        id: verificationResult.consent.consentId,
        approved: verificationResult.consent.approved,
        signature: verificationResult.consent.signature?.hash
      };
    }
    
    return report;
  }
}

// Export for use
export default ChittyChainVerificationService;