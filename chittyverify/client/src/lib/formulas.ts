/**
 * ChittyChain Evidence Ledger - Core Formulas
 * Implements the weight calculation, ID generation, and business logic
 */

import {
  EvidenceTier,
  CredibilityFactor,
  AtomicFact,
  Case,
  Jurisdiction,
  CaseType
} from '../../../shared/types';

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
  const averageWeight = facts.length > 0 ? totalWeight / facts.length : 0;
  
  // Strength calculation
  let strength = averageWeight;
  
  // Bonus for high-weight facts
  if (highWeightFacts.length >= 3) {
    strength += 0.1;
  }
  
  // Penalty for contradictions
  strength -= contradictions.length * 0.15;
  
  // Cap between 0 and 1
  strength = Math.max(0, Math.min(1, strength));
  
  let recommendation = '';
  if (strength >= 0.8) {
    recommendation = 'Strong case - proceed with confidence';
  } else if (strength >= 0.6) {
    recommendation = 'Moderate case - strengthen key facts';
  } else if (strength >= 0.4) {
    recommendation = 'Weak case - significant work needed';
  } else {
    recommendation = 'Very weak case - consider settlement';
  }
  
  return {
    overallStrength: strength,
    highWeightFactsCount: highWeightFacts.length,
    contradictionsCount: contradictions.length,
    recommendation
  };
}

// ===== FORMULA #7: TRUST SCORE CALCULATION =====
export function calculateTrustScore(
  baseScore: number,
  successfulMints: number,
  rejectedSubmissions: number,
  verificationHistory: boolean[]
): number {
  let score = baseScore;
  
  // Successful mints increase trust
  score += Math.min(successfulMints * 2, 20);
  
  // Rejected submissions decrease trust
  score -= rejectedSubmissions * 5;
  
  // Recent verification history (last 10 interactions)
  const recentVerifications = verificationHistory.slice(-10);
  const successRate = recentVerifications.filter(v => v).length / recentVerifications.length;
  
  if (successRate >= 0.9) {
    score += 5;
  } else if (successRate <= 0.5) {
    score -= 10;
  }
  
  // Cap between 0 and 100
  return Math.max(0, Math.min(100, score));
}