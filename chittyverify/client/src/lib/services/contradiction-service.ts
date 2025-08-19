/**
 * ChittyChain Evidence Ledger - Contradiction Tracking Service
 * Intelligent conflict detection and resolution engine
 */

export enum ConflictType {
  DIRECT_CONTRADICTION = "DIRECT_CONTRADICTION",
  TEMPORAL_IMPOSSIBILITY = "TEMPORAL_IMPOSSIBILITY", 
  LOGICAL_INCONSISTENCY = "LOGICAL_INCONSISTENCY",
  PARTIAL_CONFLICT = "PARTIAL_CONFLICT"
}

export enum ConflictSeverity {
  MINOR = "MINOR",
  MODERATE = "MODERATE", 
  MAJOR = "MAJOR",
  CRITICAL = "CRITICAL"
}

export interface ContradictionTracking {
  contradictionId: string;
  conflictingFacts: string[];
  conflictType: ConflictType;
  severity: ConflictSeverity;
  impactOnCase: string;
  reviewerNotes: string;
  appealable: boolean;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

export interface AtomicFact {
  factId: string;
  factText: string;
  factType: string;
  parentDocument: string;
}

export class ContradictionService {
  /**
   * Detect contradictions between facts
   */
  async detectContradictions(facts: AtomicFact[]): Promise<ContradictionTracking[]> {
    const contradictions: ContradictionTracking[] = [];
    
    console.log(`🔍 Analyzing ${facts.length} facts for contradictions...`);
    
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
    
    console.log(`Found ${contradictions.length} potential contradictions`);
    return contradictions;
  }

  /**
   * Analyze two facts for potential conflicts
   */
  private async analyzeFactsForConflict(
    fact1: AtomicFact,
    fact2: AtomicFact
  ): Promise<ContradictionTracking | null> {
    // Skip if facts are from same document
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
    
    const conflictType = conflicts[0]!;
    const severity = this.calculateConflictSeverity(fact1, fact2, conflictType);
    
    return {
      contradictionId: this.generateConflictId(),
      conflictingFacts: [fact1.factId, fact2.factId],
      conflictType,
      severity,
      impactOnCase: this.assessCaseImpact(fact1, fact2, conflictType),
      reviewerNotes: `Auto-detected conflict: ${conflictType}`,
      appealable: severity === ConflictSeverity.MAJOR || severity === ConflictSeverity.CRITICAL,
      detectedAt: new Date()
    };
  }

  /**
   * Check for direct contradictions
   */
  private checkDirectContradiction(fact1: AtomicFact, fact2: AtomicFact): ConflictType | null {
    const text1 = fact1.factText.toLowerCase();
    const text2 = fact2.factText.toLowerCase();
    
    // Simple keyword-based detection
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
    
    // Simplified temporal conflict detection
    // In production, would use proper date parsing and analysis
    const hasDateConflict = this.detectDateConflict(fact1.factText, fact2.factText);
    
    return hasDateConflict ? ConflictType.TEMPORAL_IMPOSSIBILITY : null;
  }

  /**
   * Check for logical inconsistencies
   */
  private checkLogicalInconsistency(fact1: AtomicFact, fact2: AtomicFact): ConflictType | null {
    // Placeholder for logical inconsistency detection
    // Would implement semantic analysis in production
    return null;
  }

  /**
   * Check for partial conflicts
   */
  private checkPartialConflict(fact1: AtomicFact, fact2: AtomicFact): ConflictType | null {
    // Placeholder for partial conflict detection
    return null;
  }

  private detectDateConflict(text1: string, text2: string): boolean {
    // Simplified date conflict detection
    // Would use proper date parsing in production
    return false;
  }

  private calculateConflictSeverity(
    fact1: AtomicFact, 
    fact2: AtomicFact, 
    conflictType: ConflictType
  ): ConflictSeverity {
    switch (conflictType) {
      case ConflictType.DIRECT_CONTRADICTION:
        return ConflictSeverity.CRITICAL;
      case ConflictType.TEMPORAL_IMPOSSIBILITY:
        return ConflictSeverity.MAJOR;
      case ConflictType.LOGICAL_INCONSISTENCY:
        return ConflictSeverity.MODERATE;
      default:
        return ConflictSeverity.MINOR;
    }
  }

  private assessCaseImpact(
    fact1: AtomicFact,
    fact2: AtomicFact,
    conflictType: ConflictType
  ): string {
    return `${conflictType} between facts may affect case credibility`;
  }

  private generateConflictId(): string {
    return `conflict-${Math.random().toString(36).substring(2, 15)}`;
  }
}

export const contradictionService = new ContradictionService();