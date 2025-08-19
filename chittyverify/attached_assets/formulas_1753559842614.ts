/**
 * ChittyChain Evidence Ledger - Core Formulas
 * Implements the weight calculation, ID generation, and business logic
 */

import {
  EvidenceTier,
  CredibilityFactor,
  MasterEvidence,
  AtomicFact,
  Case,
  User,
  Jurisdiction,
  CaseType
} from './types';

// ===== FORMULA #1: EVIDENCE WEIGHT CALCULATION =====
export function calculateEvidenceWeight(
  evidenceTier: EvidenceTier,
  credibilityFactors: CredibilityFactor[] = [],
  authenticationBonus: number = 0
): number {
  // Base weight from evidence tier
  const baseWeight = getEvidenceTierWeight(evidenceTier);
  
  // Credibility factor bonus (0.05 per factor, max 0.2)
  const credibilityBonus = Math.min(credibilityFactors.length * 0.05, 0.2);
  
  // Authentication method bonus
  const totalWeight = baseWeight + credibilityBonus + authenticationBonus;
  
  // Cap at 1.0
  return Math.min(totalWeight, 1.0);
}

function getEvidenceTierWeight(tier: EvidenceTier): number {
  switch (tier) {
    case EvidenceTier.SELF_AUTHENTICATING:
      return 1.0;
    case EvidenceTier.GOVERNMENT:
      return 0.95;
    case EvidenceTier.FINANCIAL_INSTITUTION:
      return 0.9;
    case EvidenceTier.INDEPENDENT_THIRD_PARTY:
      return 0.85;
    case EvidenceTier.BUSINESS_RECORDS:
      return 0.75;
    case EvidenceTier.FIRST_PARTY_ADVERSE:
      return 0.7;
    case EvidenceTier.FIRST_PARTY_FRIENDLY:
      return 0.6;
    case EvidenceTier.UNCORROBORATED_PERSON:
      return 0.4;
    default:
      return 0.5;
  }
}

// ===== FORMULA #2: ID GENERATION =====
export function generateArtifactId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ART-${timestamp}-${random}`.toUpperCase();
}

export function generateFactId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `FACT-${timestamp}-${random}`.toUpperCase();
}

export function generateConflictId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `CONFLICT-${timestamp}-${random}`.toUpperCase();
}

export function generateCaseId(
  jurisdiction: Jurisdiction,
  filingDate: Date,
  caseType: CaseType,
  caseNumber: string
): string {
  const year = filingDate.getFullYear();
  return `${jurisdiction}-${year}-${caseType}-${caseNumber}`;
}

export function generateRegistrationNumber(): string {
  const random = Math.floor(Math.random() * 99999999);
  return `REG${random.toString().padStart(8, '0')}`;
}

// ===== FORMULA #3: DEADLINES AND DATES =====
export function calculateResponseDeadline(
  filingDate: Date,
  daysToRespond: number = 28
): {
  deadline: Date;
  daysRemaining: number;
  isOverdue: boolean;
} {
  const deadline = new Date(filingDate);
  deadline.setDate(deadline.getDate() + daysToRespond);
  
  const now = new Date();
  const timeDiff = deadline.getTime() - now.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
  
  return {
    deadline,
    daysRemaining,
    isOverdue: daysRemaining < 0
  };
}

// ===== FORMULA #4: SUSPICIOUS ACTIVITY DETECTION =====
export function detectSuspiciousUploadBurst(
  userActions: Array<{ timestamp: Date; actionType: string }>,
  thresholdCount: number = 20,
  timeWindowHours: number = 1
): boolean {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - (timeWindowHours * 60 * 60 * 1000));
  
  const recentUploads = userActions.filter(
    action => 
      action.actionType === 'Upload' && 
      action.timestamp >= cutoffTime
  );
  
  return recentUploads.length > thresholdCount;
}

// ===== FORMULA #5: FACT WEIGHT CALCULATION =====
export function calculateFactWeight(
  parentEvidenceWeight: number,
  credibilityFactors: CredibilityFactor[],
  extractionConfidence: number = 1.0,
  corroborationBonus: number = 0
): number {
  // Start with parent evidence weight
  let weight = parentEvidenceWeight;
  
  // Apply extraction confidence (for AI-extracted facts)
  weight *= extractionConfidence;
  
  // Credibility factor bonus
  const credibilityBonus = credibilityFactors.length * 0.03; // Smaller bonus than evidence
  weight += credibilityBonus;
  
  // Corroboration bonus (when multiple sources confirm same fact)
  weight += corroborationBonus;
  
  return Math.min(weight, 1.0);
}

// ===== FORMULA #6: CASE STRENGTH ASSESSMENT =====
export function assessCaseStrength(facts: AtomicFact[]): {
  overallStrength: number;
  highWeightFactsCount: number;
  contradictionsCount: number;
  recommendation: string;
} {
  const highWeightFacts = facts.filter(f => f.weight >= 0.8);
  const contradictions = facts.filter(f => f.contradictsCaseTheory.length > 0);
  
  // Weighted average of all facts
  const totalWeight = facts.reduce((sum, fact) => sum + fact.weight, 0);
  const overallStrength = facts.length > 0 ? totalWeight / facts.length : 0;
  
  let recommendation: string;
  if (overallStrength >= 0.8 && contradictions.length === 0) {
    recommendation = "Strong case - proceed with confidence";
  } else if (overallStrength >= 0.6 && contradictions.length <= 2) {
    recommendation = "Moderate case - address contradictions";
  } else if (overallStrength >= 0.4) {
    recommendation = "Weak case - gather more evidence";
  } else {
    recommendation = "Very weak case - consider settlement";
  }
  
  return {
    overallStrength,
    highWeightFactsCount: highWeightFacts.length,
    contradictionsCount: contradictions.length,
    recommendation
  };
}

// ===== FORMULA #7: TRUST SCORE CALCULATION =====
export function calculateTrustScore(
  user: User,
  submittedEvidenceCount: number,
  verificationSuccessRate: number,
  timeAsUser: number, // days since registration
  violations: number = 0
): number {
  let score = 50; // Base score
  
  // Verified status bonus
  if (user.verifiedStatus) score += 20;
  
  // Attorney bonus
  if (user.barNumber) score += 15;
  
  // 2FA bonus
  if (user.twoFactorEnabled) score += 5;
  
  // Evidence submission bonus (capped)
  score += Math.min(submittedEvidenceCount * 2, 20);
  
  // Verification success rate bonus
  score += verificationSuccessRate * 30;
  
  // Time as user bonus (capped)
  score += Math.min(timeAsUser / 30, 10); // 1 point per month, max 10
  
  // Violations penalty
  score -= violations * 10;
  
  return Math.max(0, Math.min(100, score));
}

// ===== FORMULA #8: HASH VERIFICATION =====
export function generateContentHash(content: string | Buffer): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function verifyContentHash(content: string | Buffer, expectedHash: string): boolean {
  const actualHash = generateContentHash(content);
  return actualHash === expectedHash;
}

// ===== FORMULA #9: BLOCKCHAIN MINTING THRESHOLD =====
export function shouldAutoMint(
  evidenceWeight: number,
  verificationStatus: string,
  authenticationMethod: string
): boolean {
  // Auto-mint criteria:
  // 1. Weight >= 0.9
  // 2. Verified status
  // 3. Has authentication method
  return (
    evidenceWeight >= 0.9 &&
    verificationStatus === 'Verified' &&
    authenticationMethod !== 'None'
  );
}

// ===== FORMULA #10: ROLLUP CALCULATIONS =====
export function calculateCaseRollups(evidence: MasterEvidence[], facts: AtomicFact[]): {
  totalEvidenceItems: number;
  mintedFactsCount: number;
  averageEvidenceWeight: number;
  highestWeightEvidence: number;
  pendingVerificationCount: number;
} {
  const mintedFacts = facts.filter(f => f.chittyChainStatus === 'Minted');
  const pendingEvidence = evidence.filter(e => e.sourceVerificationStatus === 'Pending');
  
  const totalWeight = evidence.reduce((sum, e) => sum + e.evidenceWeight, 0);
  const averageWeight = evidence.length > 0 ? totalWeight / evidence.length : 0;
  const highestWeight = Math.max(...evidence.map(e => e.evidenceWeight), 0);
  
  return {
    totalEvidenceItems: evidence.length,
    mintedFactsCount: mintedFacts.length,
    averageEvidenceWeight: averageWeight,
    highestWeightEvidence: highestWeight,
    pendingVerificationCount: pendingEvidence.length
  };
}

// ===== UTILITY FUNCTIONS =====
export function formatArtifactId(id: string): string {
  return id.toUpperCase().replace(/[^A-Z0-9-]/g, '');
}

export function parseLocationInDocument(location: string): {
  page?: number;
  paragraph?: number;
  line?: number;
} {
  const pageMatch = location.match(/p\.?(\d+)/i);
  const paragraphMatch = location.match(/¶(\d+)/i);
  const lineMatch = location.match(/l\.?(\d+)/i);
  
  return {
    page: pageMatch ? parseInt(pageMatch[1]) : undefined,
    paragraph: paragraphMatch ? parseInt(paragraphMatch[1]) : undefined,
    line: lineMatch ? parseInt(lineMatch[1]) : undefined
  };
}

export function isValidContentHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

export function getWeightColor(weight: number): string {
  if (weight >= 0.9) return '#22c55e'; // Green
  if (weight >= 0.7) return '#eab308'; // Yellow
  if (weight >= 0.5) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

export function getUrgencyLevel(daysRemaining: number): 'low' | 'medium' | 'high' | 'critical' {
  if (daysRemaining < 0) return 'critical';
  if (daysRemaining <= 3) return 'high';
  if (daysRemaining <= 7) return 'medium';
  return 'low';
}