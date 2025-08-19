/**
 * ChittyChain Evidence Ledger - Contradiction Tracking Service
 * Intelligent conflict detection and resolution engine
 */

import {
  ContradictionTracking,
  ConflictType,
  ResolutionMethod,
  ConflictSeverity,
  AtomicFact,
  EvidenceTier
} from '../schemas/types';
import { generateConflictId } from '../schemas/formulas';

export class ContradictionService {
  /**
   * Detect contradictions between facts
   */
  async detectContradictions(facts: AtomicFact[]): Promise<ContradictionTracking[]> {
    const contradictions: ContradictionTracking[] = [];
    
    // Compare each fact against others
    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        const fact1 = facts[i];
        const fact2 = facts[j];
        
        const conflict = await this.analyzeFactsForConflict(fact1, fact2);
        if (conflict) {
          contradictions.push(conflict);
        }
      }
    }
    
    return contradictions;
  }

  /**
   * Analyze two facts for potential conflicts
   */
  private async analyzeFactsForConflict(
    fact1: AtomicFact,
    fact2: AtomicFact
  ): Promise<ContradictionTracking | null> {
    // Skip if facts are from same document (internal consistency assumed)
    if (fact1.parentDocument === fact2.parentDocument) {
      return null;
    }
    
    const conflicts = [
      this.checkDirectContradiction(fact1, fact2),
      this.checkTemporalImpossibility(fact1, fact2),
      this.checkLogicalInconsistency(fact1, fact2),
      this.checkPartialConflict(fact1, fact2)
    ].filter(Boolean);
    
    if (conflicts.length === 0) {
      return null;
    }
    
    // Use the most severe conflict type
    const conflictType = this.getMostSevereConflictType(conflicts);
    const severity = this.calculateConflictSeverity(fact1, fact2, conflictType);
    
    return {
      contradictionId: generateConflictId(),
      conflictingFacts: [fact1.factId, fact2.factId],
      conflictType,
      severity,
      impactOnCase: this.assessCaseImpact(fact1, fact2, conflictType),
      reviewerNotes: `Auto-detected conflict: ${conflictType}`,
      appealable: severity === ConflictSeverity.MAJOR || severity === ConflictSeverity.CRITICAL
    };
  }

  /**
   * Check for direct contradictions
   */
  private checkDirectContradiction(fact1: AtomicFact, fact2: AtomicFact): ConflictType | null {
    // Use AI to detect semantic contradictions
    const text1 = fact1.factText.toLowerCase();
    const text2 = fact2.factText.toLowerCase();
    
    // Simple keyword-based detection (in production, use NLP)
    const contradictoryPairs = [
      ['signed', 'unsigned'],
      ['present', 'absent'],
      ['agreed', 'disagreed'],
      ['paid', 'unpaid'],
      ['delivered', 'undelivered'],
      ['yes', 'no'],
      ['true', 'false'],
      ['guilty', 'innocent']
    ];
    
    for (const [word1, word2] of contradictoryPairs) {
      if ((text1.includes(word1) && text2.includes(word2)) ||
          (text1.includes(word2) && text2.includes(word1))) {
        return ConflictType.DIRECT_CONTRADICTION;
      }
    }
    
    return null;
  }

  /**
   * Check for temporal impossibilities
   */
  private checkTemporalImpossibility(fact1: AtomicFact, fact2: AtomicFact): ConflictType | null {
    if (fact1.factType !== 'DATE' && fact2.factType !== 'DATE') {
      return null;
    }
    
    const date1 = this.extractDateFromFact(fact1);
    const date2 = this.extractDateFromFact(fact2);
    
    if (!date1 || !date2) {
      return null;
    }
    
    // Check for impossible temporal relationships
    // e.g., "signed contract on Jan 1" vs "contract was drafted on Jan 15"
    const timeDiff = Math.abs(date1.getTime() - date2.getTime());
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    // If same person/entity doing sequential actions in wrong order
    if (this.areSequentialActions(fact1, fact2) && daysDiff > 0) {
      const chronologicalOrder = this.getChronologicalRequirement(fact1, fact2);
      if (chronologicalOrder && 
          ((chronologicalOrder === 'fact1_first' && date1 > date2) ||
           (chronologicalOrder === 'fact2_first' && date2 > date1))) {
        return ConflictType.TEMPORAL_IMPOSSIBILITY;
      }
    }
    
    return null;
  }

  /**
   * Check for logical inconsistencies
   */
  private checkLogicalInconsistency(fact1: AtomicFact, fact2: AtomicFact): ConflictType | null {
    // Check for logical impossibilities
    // e.g., "Person A was in New York" vs "Person A was in California" (same time)
    
    if (fact1.factType === 'LOCATION' && fact2.factType === 'LOCATION') {
      const person1 = this.extractPersonFromFact(fact1);
      const person2 = this.extractPersonFromFact(fact2);
      const time1 = this.extractTimeFromFact(fact1);
      const time2 = this.extractTimeFromFact(fact2);
      
      if (person1 && person2 && person1 === person2 && 
          time1 && time2 && Math.abs(time1.getTime() - time2.getTime()) < 3600000) { // 1 hour
        const location1 = this.extractLocationFromFact(fact1);
        const location2 = this.extractLocationFromFact(fact2);
        
        if (location1 && location2 && location1 !== location2) {
          return ConflictType.LOGICAL_INCONSISTENCY;
        }
      }
    }
    
    return null;
  }

  /**
   * Check for partial conflicts
   */
  private checkPartialConflict(fact1: AtomicFact, fact2: AtomicFact): ConflictType | null {
    // Check for facts that don't directly contradict but create inconsistencies
    // e.g., different amounts for same transaction
    
    if (fact1.factType === 'AMOUNT' && fact2.factType === 'AMOUNT') {
      const amount1 = this.extractAmountFromFact(fact1);
      const amount2 = this.extractAmountFromFact(fact2);
      const context1 = this.extractContextFromFact(fact1);
      const context2 = this.extractContextFromFact(fact2);
      
      if (amount1 && amount2 && context1 === context2 && amount1 !== amount2) {
        const variance = Math.abs(amount1 - amount2) / Math.max(amount1, amount2);
        if (variance > 0.05) { // 5% variance threshold
          return ConflictType.PARTIAL_CONFLICT;
        }
      }
    }
    
    return null;
  }

  /**
   * Resolve contradiction using hierarchy rules
   */
  async resolveContradiction(
    contradictionId: string,
    resolutionMethod: ResolutionMethod,
    resolverId: string,
    notes?: string
  ): Promise<{
    winningFactId: string;
    confidence: number;
    reasoning: string;
  }> {
    const contradiction = await this.getById(contradictionId);
    if (!contradiction) {
      throw new Error('Contradiction not found');
    }
    
    const facts = await this.getFactsByIds(contradiction.conflictingFacts);
    if (facts.length !== 2) {
      throw new Error('Invalid contradiction - must have exactly 2 facts');
    }
    
    const [fact1, fact2] = facts;
    let winningFact: AtomicFact;
    let confidence: number;
    let reasoning: string;
    
    switch (resolutionMethod) {
      case ResolutionMethod.HIERARCHY_RULE:
        const hierarchy = await this.getEvidenceHierarchy(fact1, fact2);
        winningFact = hierarchy.winner;
        confidence = hierarchy.confidence;
        reasoning = `Evidence hierarchy: ${hierarchy.reasoning}`;
        break;
        
      case ResolutionMethod.TEMPORAL_PRIORITY:
        const temporal = this.resolveByTemporalPriority(fact1, fact2);
        winningFact = temporal.winner;
        confidence = temporal.confidence;
        reasoning = `Temporal priority: ${temporal.reasoning}`;
        break;
        
      case ResolutionMethod.AUTHENTICATION_SUPERIORITY:
        const auth = await this.resolveByAuthentication(fact1, fact2);
        winningFact = auth.winner;
        confidence = auth.confidence;
        reasoning = `Authentication superiority: ${auth.reasoning}`;
        break;
        
      case ResolutionMethod.ADVERSE_ADMISSION:
        const adverse = this.resolveByAdverseAdmission(fact1, fact2);
        winningFact = adverse.winner;
        confidence = adverse.confidence;
        reasoning = `Adverse admission: ${adverse.reasoning}`;
        break;
        
      case ResolutionMethod.CONTEMPORANEOUS_RECORD:
        const contemp = this.resolveByContemporaneousRecord(fact1, fact2);
        winningFact = contemp.winner;
        confidence = contemp.confidence;
        reasoning = `Contemporaneous record: ${contemp.reasoning}`;
        break;
        
      default:
        throw new Error('Invalid resolution method');
    }
    
    // Update contradiction record
    contradiction.winningFact = winningFact.factId;
    contradiction.resolutionMethod = resolutionMethod;
    contradiction.resolutionDate = new Date();
    if (notes) {
      contradiction.reviewerNotes += `\nResolution: ${notes}`;
    }
    
    await this.saveContradiction(contradiction);
    
    return {
      winningFactId: winningFact.factId,
      confidence,
      reasoning
    };
  }

  /**
   * Get evidence hierarchy for resolution
   */
  private async getEvidenceHierarchy(fact1: AtomicFact, fact2: AtomicFact): Promise<{
    winner: AtomicFact;
    confidence: number;
    reasoning: string;
  }> {
    const evidence1 = await this.getEvidenceById(fact1.parentDocument);
    const evidence2 = await this.getEvidenceById(fact2.parentDocument);
    
    if (!evidence1 || !evidence2) {
      throw new Error('Parent evidence not found');
    }
    
    // Hierarchy: SELF_AUTHENTICATING > GOVERNMENT > FINANCIAL_INSTITUTION > etc.
    const tierRanking = {
      'SELF_AUTHENTICATING': 8,
      'GOVERNMENT': 7,
      'FINANCIAL_INSTITUTION': 6,
      'INDEPENDENT_THIRD_PARTY': 5,
      'BUSINESS_RECORDS': 4,
      'FIRST_PARTY_ADVERSE': 3,
      'FIRST_PARTY_FRIENDLY': 2,
      'UNCORROBORATED_PERSON': 1
    };
    
    const rank1 = tierRanking[evidence1.evidenceTier] || 0;
    const rank2 = tierRanking[evidence2.evidenceTier] || 0;
    
    if (rank1 > rank2) {
      return {
        winner: fact1,
        confidence: 0.9,
        reasoning: `${evidence1.evidenceTier} outranks ${evidence2.evidenceTier}`
      };
    } else if (rank2 > rank1) {
      return {
        winner: fact2,
        confidence: 0.9,
        reasoning: `${evidence2.evidenceTier} outranks ${evidence1.evidenceTier}`
      };
    } else {
      // Same tier - use weight
      return evidence1.evidenceWeight > evidence2.evidenceWeight
        ? {
            winner: fact1,
            confidence: 0.7,
            reasoning: `Higher evidence weight (${evidence1.evidenceWeight} vs ${evidence2.evidenceWeight})`
          }
        : {
            winner: fact2,
            confidence: 0.7,
            reasoning: `Higher evidence weight (${evidence2.evidenceWeight} vs ${evidence1.evidenceWeight})`
          };
    }
  }

  // Helper methods for conflict analysis
  private getMostSevereConflictType(conflicts: ConflictType[]): ConflictType {
    const severity = {
      [ConflictType.DIRECT_CONTRADICTION]: 4,
      [ConflictType.TEMPORAL_IMPOSSIBILITY]: 3,
      [ConflictType.LOGICAL_INCONSISTENCY]: 2,
      [ConflictType.PARTIAL_CONFLICT]: 1
    };
    
    return conflicts.sort((a, b) => severity[b] - severity[a])[0];
  }

  private calculateConflictSeverity(
    fact1: AtomicFact,
    fact2: AtomicFact,
    conflictType: ConflictType
  ): ConflictSeverity {
    const avgWeight = (fact1.weight + fact2.weight) / 2;
    const supportsCriticalTheory = 
      fact1.supportsCaseTheory.length > 0 || fact2.supportsCaseTheory.length > 0;
    
    if (conflictType === ConflictType.DIRECT_CONTRADICTION && avgWeight > 0.8) {
      return ConflictSeverity.CRITICAL;
    }
    if (supportsCriticalTheory && avgWeight > 0.6) {
      return ConflictSeverity.MAJOR;
    }
    if (avgWeight > 0.4) {
      return ConflictSeverity.MODERATE;
    }
    return ConflictSeverity.MINOR;
  }

  private assessCaseImpact(
    fact1: AtomicFact,
    fact2: AtomicFact,
    conflictType: ConflictType
  ): string {
    const theories1 = fact1.supportsCaseTheory;
    const theories2 = fact2.supportsCaseTheory;
    const sharedTheories = theories1.filter(t => theories2.includes(t));
    
    if (sharedTheories.length > 0) {
      return `Critical impact: Both facts support ${sharedTheories.join(', ')} - resolution required`;
    }
    
    return `Moderate impact: Facts support different theories - may affect case strategy`;
  }

  // Fact extraction helpers (simplified - in production use NLP)
  private extractDateFromFact(fact: AtomicFact): Date | null {
    const dateRegex = /(\d{1,2})\/(\d{1,2})\/(\d{4})|\b(\d{4}-\d{2}-\d{2})\b/;
    const match = fact.factText.match(dateRegex);
    return match ? new Date(match[0]) : null;
  }

  private extractPersonFromFact(fact: AtomicFact): string | null {
    // Simplified person extraction
    const personRegex = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/;
    const match = fact.factText.match(personRegex);
    return match ? match[0] : null;
  }

  private extractAmountFromFact(fact: AtomicFact): number | null {
    const amountRegex = /\$([\d,]+(?:\.\d{2})?)/;
    const match = fact.factText.match(amountRegex);
    return match ? parseFloat(match[1].replace(/,/g, '')) : null;
  }

  private extractLocationFromFact(fact: AtomicFact): string | null {
    // Simplified location extraction
    const locationRegex = /\bin ([A-Z][a-z]+(?: [A-Z][a-z]+)*)\b/;
    const match = fact.factText.match(locationRegex);
    return match ? match[1] : null;
  }

  private extractTimeFromFact(fact: AtomicFact): Date | null {
    return this.extractDateFromFact(fact);
  }

  private extractContextFromFact(fact: AtomicFact): string {
    // Extract context keywords for grouping related facts
    const context = fact.factText.toLowerCase();
    if (context.includes('payment') || context.includes('paid')) return 'payment';
    if (context.includes('contract') || context.includes('agreement')) return 'contract';
    if (context.includes('meeting') || context.includes('conference')) return 'meeting';
    return 'general';
  }

  // Resolution helpers
  private areSequentialActions(fact1: AtomicFact, fact2: AtomicFact): boolean {
    const sequentialPairs = [
      ['draft', 'sign'],
      ['negotiate', 'agree'],
      ['order', 'deliver'],
      ['invoice', 'pay']
    ];
    
    const text1 = fact1.factText.toLowerCase();
    const text2 = fact2.factText.toLowerCase();
    
    return sequentialPairs.some(([first, second]) =>
      (text1.includes(first) && text2.includes(second)) ||
      (text1.includes(second) && text2.includes(first))
    );
  }

  private getChronologicalRequirement(fact1: AtomicFact, fact2: AtomicFact): string | null {
    // Determine which fact should chronologically come first
    const text1 = fact1.factText.toLowerCase();
    const text2 = fact2.factText.toLowerCase();
    
    if (text1.includes('draft') && text2.includes('sign')) return 'fact1_first';
    if (text1.includes('sign') && text2.includes('draft')) return 'fact2_first';
    
    return null;
  }

  private resolveByTemporalPriority(fact1: AtomicFact, fact2: AtomicFact): {
    winner: AtomicFact;
    confidence: number;
    reasoning: string;
  } {
    // Earlier contemporary records typically win
    const hasContemp1 = fact1.credibilityFactors.includes('Contemporaneous');
    const hasContemp2 = fact2.credibilityFactors.includes('Contemporaneous');
    
    if (hasContemp1 && !hasContemp2) {
      return {
        winner: fact1,
        confidence: 0.85,
        reasoning: 'Contemporaneous record takes priority'
      };
    }
    if (hasContemp2 && !hasContemp1) {
      return {
        winner: fact2,
        confidence: 0.85,
        reasoning: 'Contemporaneous record takes priority'
      };
    }
    
    // Fallback to weight
    return fact1.weight > fact2.weight
      ? { winner: fact1, confidence: 0.6, reasoning: 'Higher fact weight' }
      : { winner: fact2, confidence: 0.6, reasoning: 'Higher fact weight' };
  }

  private async resolveByAuthentication(fact1: AtomicFact, fact2: AtomicFact): Promise<{
    winner: AtomicFact;
    confidence: number;
    reasoning: string;
  }> {
    const evidence1 = await this.getEvidenceById(fact1.parentDocument);
    const evidence2 = await this.getEvidenceById(fact2.parentDocument);
    
    const authRanking = {
      'Seal': 5,
      'Notarization': 4,
      'Digital Signature': 3,
      'Certification': 2,
      'Stamp': 1,
      'None': 0
    };
    
    const rank1 = authRanking[evidence1?.authenticationMethod || 'None'] || 0;
    const rank2 = authRanking[evidence2?.authenticationMethod || 'None'] || 0;
    
    return rank1 > rank2
      ? {
          winner: fact1,
          confidence: 0.9,
          reasoning: `Superior authentication method: ${evidence1?.authenticationMethod}`
        }
      : {
          winner: fact2,
          confidence: 0.9,
          reasoning: `Superior authentication method: ${evidence2?.authenticationMethod}`
        };
  }

  private resolveByAdverseAdmission(fact1: AtomicFact, fact2: AtomicFact): {
    winner: AtomicFact;
    confidence: number;
    reasoning: string;
  } {
    const hasAdverse1 = fact1.credibilityFactors.includes('Against Interest');
    const hasAdverse2 = fact2.credibilityFactors.includes('Against Interest');
    
    if (hasAdverse1 && !hasAdverse2) {
      return {
        winner: fact1,
        confidence: 0.95,
        reasoning: 'Statement against interest - highly reliable'
      };
    }
    if (hasAdverse2 && !hasAdverse1) {
      return {
        winner: fact2,
        confidence: 0.95,
        reasoning: 'Statement against interest - highly reliable'
      };
    }
    
    return fact1.weight > fact2.weight
      ? { winner: fact1, confidence: 0.5, reasoning: 'No adverse admission found - using weight' }
      : { winner: fact2, confidence: 0.5, reasoning: 'No adverse admission found - using weight' };
  }

  private resolveByContemporaneousRecord(fact1: AtomicFact, fact2: AtomicFact): {
    winner: AtomicFact;
    confidence: number;
    reasoning: string;
  } {
    const hasContemp1 = fact1.credibilityFactors.includes('Contemporaneous');
    const hasContemp2 = fact2.credibilityFactors.includes('Contemporaneous');
    
    if (hasContemp1 && !hasContemp2) {
      return {
        winner: fact1,
        confidence: 0.9,
        reasoning: 'Contemporaneous record - made at time of event'
      };
    }
    if (hasContemp2 && !hasContemp1) {
      return {
        winner: fact2,
        confidence: 0.9,
        reasoning: 'Contemporaneous record - made at time of event'
      };
    }
    
    return fact1.weight > fact2.weight
      ? { winner: fact1, confidence: 0.6, reasoning: 'Both contemporaneous - using weight' }
      : { winner: fact2, confidence: 0.6, reasoning: 'Both contemporaneous - using weight' };
  }

  // Database abstraction methods
  private async getById(contradictionId: string): Promise<ContradictionTracking | null> {
    throw new Error('Database method not implemented');
  }

  private async getFactsByIds(factIds: string[]): Promise<AtomicFact[]> {
    throw new Error('Database method not implemented');
  }

  private async getEvidenceById(evidenceId: string): Promise<any> {
    throw new Error('Database method not implemented');
  }

  private async saveContradiction(contradiction: ContradictionTracking): Promise<void> {
    throw new Error('Database method not implemented');
  }
}