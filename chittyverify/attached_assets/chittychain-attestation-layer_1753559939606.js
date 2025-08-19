#!/usr/bin/env node

/**
 * ChittyChain Attestation Layer - User Attestations for Evidence
 * 
 * This layer allows users to create legally-binding attestations
 * for evidence, adding human verification to the trust system.
 */

import crypto from 'crypto';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ChittyChainAttestationLayer {
  constructor(config = {}) {
    this.config = {
      requireNotarization: false,
      requireWitnesses: false,
      minWitnesses: 2,
      attestationTypes: {
        SWORN_AFFIDAVIT: { weight: 0.9, requiresNotary: true },
        WITNESSED_STATEMENT: { weight: 0.8, requiresWitnesses: true },
        PERSONAL_ATTESTATION: { weight: 0.6, requiresNotary: false },
        EXPERT_ATTESTATION: { weight: 0.85, requiresCredentials: true },
        CORROBORATING_WITNESS: { weight: 0.7, requiresIdentity: true }
      },
      ...config
    };
    
    this.attestations = new Map();
    this.attestationIndex = new Map(); // artifact -> attestations
  }

  /**
   * Create an attestation for an artifact
   */
  async createAttestation(artifact, attestationData) {
    const attestation = {
      id: crypto.randomUUID(),
      artifactId: artifact.id,
      timestamp: new Date().toISOString(),
      type: attestationData.type || 'PERSONAL_ATTESTATION',
      
      // Attestor information
      attestor: {
        name: attestationData.attestorName,
        email: attestationData.attestorEmail,
        role: attestationData.attestorRole, // e.g., "Witness", "Expert", "Party"
        relationship: attestationData.relationship, // e.g., "Document Creator", "Eye Witness"
        credentials: attestationData.credentials || []
      },
      
      // Attestation content
      statement: attestationData.statement,
      swornDeclaration: attestationData.swornDeclaration || this.generateSwornDeclaration(attestationData),
      
      // Legal elements
      legal: {
        underPenaltyOfPerjury: attestationData.underPenaltyOfPerjury || false,
        notarized: false,
        witnesses: [],
        jurisdiction: attestationData.jurisdiction || 'United States',
        legalWarning: 'False attestations may result in criminal penalties including perjury charges.'
      },
      
      // Supporting evidence
      supporting: {
        documents: attestationData.supportingDocuments || [],
        references: attestationData.references || [],
        expertise: attestationData.expertise || null
      },
      
      // Verification
      verification: {
        identityVerified: false,
        method: null,
        timestamp: null
      },
      
      // Weight calculation
      weight: 0,
      trustModifier: 0
    };

    // Calculate attestation weight
    attestation.weight = this.calculateAttestationWeight(attestation);
    
    // Store attestation
    this.attestations.set(attestation.id, attestation);
    
    // Index by artifact
    if (!this.attestationIndex.has(artifact.id)) {
      this.attestationIndex.set(artifact.id, []);
    }
    this.attestationIndex.get(artifact.id).push(attestation);
    
    return attestation;
  }

  /**
   * Add witness to attestation
   */
  async addWitness(attestationId, witnessData) {
    const attestation = this.attestations.get(attestationId);
    if (!attestation) {
      throw new Error('Attestation not found');
    }

    const witness = {
      id: crypto.randomUUID(),
      name: witnessData.name,
      email: witnessData.email,
      relationship: witnessData.relationship,
      statement: witnessData.statement || `I witnessed the creation of this attestation`,
      timestamp: new Date().toISOString(),
      signature: null
    };

    attestation.legal.witnesses.push(witness);
    
    // Recalculate weight with witnesses
    attestation.weight = this.calculateAttestationWeight(attestation);
    
    return witness;
  }

  /**
   * Notarize attestation
   */
  async notarizeAttestation(attestationId, notaryData) {
    const attestation = this.attestations.get(attestationId);
    if (!attestation) {
      throw new Error('Attestation not found');
    }

    attestation.legal.notarized = true;
    attestation.legal.notary = {
      name: notaryData.name,
      commission: notaryData.commissionNumber,
      expiration: notaryData.commissionExpiration,
      state: notaryData.state,
      seal: notaryData.sealNumber,
      timestamp: new Date().toISOString()
    };

    // Notarization significantly increases weight
    attestation.weight = this.calculateAttestationWeight(attestation);
    
    return attestation;
  }

  /**
   * Verify attestor identity
   */
  async verifyAttestorIdentity(attestationId, verificationData) {
    const attestation = this.attestations.get(attestationId);
    if (!attestation) {
      throw new Error('Attestation not found');
    }

    attestation.verification = {
      identityVerified: true,
      method: verificationData.method, // e.g., "Government ID", "KYC", "In-Person"
      verifier: verificationData.verifier,
      timestamp: new Date().toISOString(),
      confidence: verificationData.confidence || 0.9
    };

    // Identity verification affects trust
    attestation.trustModifier = this.calculateTrustModifier(attestation);
    
    return attestation;
  }

  /**
   * Get all attestations for an artifact
   */
  getArtifactAttestations(artifactId) {
    return this.attestationIndex.get(artifactId) || [];
  }

  /**
   * Calculate combined attestation impact on artifact
   */
  calculateAttestationImpact(artifact) {
    const attestations = this.getArtifactAttestations(artifact.id);
    
    if (attestations.length === 0) {
      return {
        hasAttestations: false,
        attestationCount: 0,
        weightModifier: 0,
        trustBoost: 0,
        details: []
      };
    }

    // Calculate impact
    let weightModifier = 0;
    let trustBoost = 0;
    const details = [];

    attestations.forEach(attestation => {
      const impact = {
        id: attestation.id,
        type: attestation.type,
        weight: attestation.weight,
        verified: attestation.verification.identityVerified,
        notarized: attestation.legal.notarized,
        witnesses: attestation.legal.witnesses.length
      };

      // Weight modifier based on attestation quality
      if (attestation.legal.notarized) {
        weightModifier += 0.1; // 10% boost for notarized
      }
      if (attestation.legal.witnesses.length >= 2) {
        weightModifier += 0.05; // 5% boost for witnessed
      }
      if (attestation.verification.identityVerified) {
        weightModifier += 0.05; // 5% boost for verified identity
      }

      // Trust boost
      trustBoost += attestation.weight * attestation.trustModifier;
      
      details.push(impact);
    });

    // Cap weight modifier at 25%
    weightModifier = Math.min(weightModifier, 0.25);
    
    // Average trust boost
    trustBoost = trustBoost / attestations.length;

    return {
      hasAttestations: true,
      attestationCount: attestations.length,
      weightModifier,
      trustBoost,
      details,
      recommendation: this.generateAttestationRecommendation(attestations)
    };
  }

  /**
   * Generate sworn declaration text
   */
  generateSwornDeclaration(attestationData) {
    const date = new Date().toLocaleDateString();
    return `I, ${attestationData.attestorName}, do hereby swear and affirm under penalty of perjury under the laws of ${attestationData.jurisdiction || 'the United States'} that the following statement is true and correct to the best of my knowledge and belief:

${attestationData.statement}

I understand that willfully making a false statement is punishable by fine, imprisonment, or both.

Declared on ${date}`;
  }

  /**
   * Calculate attestation weight
   */
  calculateAttestationWeight(attestation) {
    const typeConfig = this.config.attestationTypes[attestation.type];
    let weight = typeConfig?.weight || 0.5;

    // Modifiers
    if (attestation.legal.underPenaltyOfPerjury) {
      weight += 0.1;
    }
    if (attestation.legal.notarized) {
      weight += 0.15;
    }
    if (attestation.legal.witnesses.length >= 2) {
      weight += 0.1;
    }
    if (attestation.verification.identityVerified) {
      weight += 0.1;
    }
    
    // Expert attestations get boost
    if (attestation.type === 'EXPERT_ATTESTATION' && attestation.attestor.credentials.length > 0) {
      weight += 0.1;
    }

    return Math.min(weight, 0.95); // Cap at 0.95
  }

  /**
   * Calculate trust modifier
   */
  calculateTrustModifier(attestation) {
    let modifier = 0;

    if (attestation.verification.identityVerified) {
      modifier += attestation.verification.confidence * 0.1;
    }
    
    if (attestation.legal.notarized) {
      modifier += 0.1;
    }
    
    // Multiple witnesses increase trust
    modifier += Math.min(attestation.legal.witnesses.length * 0.05, 0.15);
    
    return modifier;
  }

  /**
   * Generate recommendation based on attestations
   */
  generateAttestationRecommendation(attestations) {
    const recommendations = [];
    
    const notarizedCount = attestations.filter(a => a.legal.notarized).length;
    const verifiedCount = attestations.filter(a => a.verification.identityVerified).length;
    const witnessedCount = attestations.filter(a => a.legal.witnesses.length >= 2).length;

    if (notarizedCount === 0) {
      recommendations.push('Consider getting at least one attestation notarized for stronger legal standing');
    }
    
    if (verifiedCount < attestations.length / 2) {
      recommendations.push('Verify identity of more attestors to increase trust');
    }
    
    if (witnessedCount === 0) {
      recommendations.push('Add witnesses to attestations for corroboration');
    }
    
    if (attestations.length < 2) {
      recommendations.push('Multiple independent attestations strengthen evidence credibility');
    }

    return recommendations;
  }

  /**
   * Create attestation bundle for artifact
   */
  createAttestationBundle(artifactId) {
    const attestations = this.getArtifactAttestations(artifactId);
    
    return {
      artifactId,
      bundleId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      attestations: attestations.map(a => ({
        id: a.id,
        type: a.type,
        attestor: a.attestor.name,
        weight: a.weight,
        notarized: a.legal.notarized,
        witnessed: a.legal.witnesses.length > 0,
        verified: a.verification.identityVerified
      })),
      summary: {
        count: attestations.length,
        avgWeight: attestations.reduce((sum, a) => sum + a.weight, 0) / attestations.length,
        notarizedCount: attestations.filter(a => a.legal.notarized).length,
        verifiedCount: attestations.filter(a => a.verification.identityVerified).length
      },
      bundleHash: crypto.createHash('sha256')
        .update(JSON.stringify(attestations))
        .digest('hex')
    };
  }

  /**
   * Export attestation for legal use
   */
  exportLegalAttestation(attestationId) {
    const attestation = this.attestations.get(attestationId);
    if (!attestation) {
      throw new Error('Attestation not found');
    }

    return {
      title: 'LEGAL ATTESTATION',
      attestationId: attestation.id,
      created: attestation.timestamp,
      
      attestor: {
        name: attestation.attestor.name,
        role: attestation.attestor.role,
        relationship: attestation.attestor.relationship
      },
      
      declaration: attestation.swornDeclaration,
      
      legal: {
        notarized: attestation.legal.notarized,
        notary: attestation.legal.notary,
        witnesses: attestation.legal.witnesses.map(w => ({
          name: w.name,
          relationship: w.relationship,
          statement: w.statement
        })),
        jurisdiction: attestation.legal.jurisdiction
      },
      
      verification: attestation.verification.identityVerified ? {
        verified: true,
        method: attestation.verification.method,
        timestamp: attestation.verification.timestamp
      } : { verified: false },
      
      warning: 'This attestation was made under penalty of perjury. False statements may result in criminal prosecution.',
      
      cryptographicProof: {
        attestationHash: crypto.createHash('sha256')
          .update(JSON.stringify(attestation))
          .digest('hex'),
        timestamp: new Date().toISOString()
      }
    };
  }
}

// Export for use
export default ChittyChainAttestationLayer;