/**
 * ChittyChain Evidence Ledger - Atomic Facts Service
 * AI-powered fact extraction and management
 */

import {
  AtomicFact,
  FactType,
  ClassificationLevel,
  CredibilityFactor,
  ExtractionMethod,
  MintingStatus
} from '../schemas/types';
import {
  generateFactId,
  calculateFactWeight,
  parseLocationInDocument
} from '../schemas/formulas';
import { analyzeLegalCase } from '../../ai';

export class FactsService {
  /**
   * Extract facts from evidence using AI
   */
  async extractFactsFromEvidence(params: {
    evidenceId: string;
    content: string;
    extractionMethod: ExtractionMethod;
    userId: string;
  }): Promise<{
    facts: AtomicFact[];
    confidence: number;
    extractionTime: number;
  }> {
    const startTime = Date.now();
    
    let facts: AtomicFact[] = [];
    let overallConfidence = 0;
    
    switch (params.extractionMethod) {
      case ExtractionMethod.MANUAL:
        // Manual extraction - return empty array for user to fill
        facts = [];
        overallConfidence = 1.0;
        break;
        
      case ExtractionMethod.GPT4:
      case ExtractionMethod.CLAUDE:
        facts = await this.aiExtractFacts(params);
        overallConfidence = 0.85; // AI confidence baseline
        break;
        
      case ExtractionMethod.HYBRID:
        // AI extraction + manual review
        facts = await this.aiExtractFacts(params);
        overallConfidence = 0.75; // Lower confidence, requires review
        break;
    }
    
    const extractionTime = Date.now() - startTime;
    
    return {
      facts,
      confidence: overallConfidence,
      extractionTime
    };
  }

  /**
   * AI-powered fact extraction
   */
  private async aiExtractFacts(params: {
    evidenceId: string;
    content: string;
    extractionMethod: ExtractionMethod;
    userId: string;
  }): Promise<AtomicFact[]> {
    const prompt = this.buildExtractionPrompt(params.content);
    
    const aiResponse = await analyzeLegalCase({
      caseDetails: prompt,
      analysisType: "summary",
      provider: params.extractionMethod === ExtractionMethod.CLAUDE ? "anthropic" : "openai"
    });
    
    return this.parseAIResponse(aiResponse.analysis, params.evidenceId);
  }

  /**
   * Build structured prompt for fact extraction
   */
  private buildExtractionPrompt(content: string): string {
    return `
Extract atomic facts from the following legal document. For each fact, provide:
1. The exact text of the fact
2. The type of fact (DATE, AMOUNT, ADMISSION, IDENTITY, LOCATION, RELATIONSHIP, ACTION, STATUS)
3. The location in the document (page, paragraph, line if possible)
4. Classification level (FACT, SUPPORTED_CLAIM, ASSERTION, ALLEGATION)
5. Any credibility factors (Against Interest, Contemporaneous, Business Duty, Official Duty)

Document content:
${content}

Format your response as JSON with this structure:
{
  "facts": [
    {
      "text": "John Smith signed the contract on January 15, 2023",
      "type": "DATE",
      "location": "p.1 ¶2 l.5",
      "classification": "FACT",
      "credibilityFactors": ["Contemporaneous"]
    }
  ]
}
`;
  }

  /**
   * Parse AI response into AtomicFact objects
   */
  private parseAIResponse(aiResponse: string, evidenceId: string): AtomicFact[] {
    try {
      const parsed = JSON.parse(aiResponse);
      const facts: AtomicFact[] = [];
      
      for (const factData of parsed.facts || []) {
        const fact: AtomicFact = {
          factId: generateFactId(),
          parentDocument: evidenceId,
          factText: factData.text,
          factType: this.mapFactType(factData.type),
          locationInDocument: factData.location || '',
          classificationLevel: this.mapClassificationLevel(factData.classification),
          weight: 0.8, // Will be recalculated
          credibilityFactors: this.mapCredibilityFactors(factData.credibilityFactors || []),
          relatedFacts: [],
          supportsCaseTheory: [],
          contradictsCaseTheory: [],
          chittyChainStatus: MintingStatus.PENDING,
          extractionMethod: ExtractionMethod.GPT4, // or CLAUDE based on provider
          extractionConfidence: 0.8,
          extractionTimestamp: new Date()
        };
        
        facts.push(fact);
      }
      
      return facts;
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return [];
    }
  }

  /**
   * Create a new fact manually
   */
  async createFact(params: {
    evidenceId: string;
    factText: string;
    factType: FactType;
    locationInDocument: string;
    classificationLevel: ClassificationLevel;
    credibilityFactors: CredibilityFactor[];
    userId: string;
  }): Promise<AtomicFact> {
    const fact: AtomicFact = {
      factId: generateFactId(),
      parentDocument: params.evidenceId,
      factText: params.factText,
      factType: params.factType,
      locationInDocument: params.locationInDocument,
      classificationLevel: params.classificationLevel,
      weight: calculateFactWeight(
        0.8, // Default parent weight
        params.credibilityFactors,
        1.0, // Manual extraction has full confidence
        0
      ),
      credibilityFactors: params.credibilityFactors,
      relatedFacts: [],
      supportsCaseTheory: [],
      contradictsCaseTheory: [],
      chittyChainStatus: MintingStatus.PENDING,
      extractionMethod: ExtractionMethod.MANUAL,
      extractionConfidence: 1.0,
      extractionTimestamp: new Date(),
      verificationDate: new Date(),
      verificationMethod: 'Manual entry'
    };
    
    await this.saveFact(fact);
    return fact;
  }

  /**
   * Update fact with case theory connections
   */
  async updateFactCaseTheory(params: {
    factId: string;
    supportsCaseTheory: string[];
    contradictsCaseTheory: string[];
    userId: string;
  }): Promise<AtomicFact> {
    const fact = await this.getById(params.factId);
    if (!fact) {
      throw new Error('Fact not found');
    }
    
    fact.supportsCaseTheory = params.supportsCaseTheory;
    fact.contradictsCaseTheory = params.contradictsCaseTheory;
    
    // Recalculate weight based on case theory alignment
    const theoryBonus = params.supportsCaseTheory.length * 0.02;
    const theoryPenalty = params.contradictsCaseTheory.length * 0.05;
    fact.weight = Math.max(0, Math.min(1, fact.weight + theoryBonus - theoryPenalty));
    
    await this.saveFact(fact);
    return fact;
  }

  /**
   * Link related facts
   */
  async linkFacts(params: {
    factId1: string;
    factId2: string;
    relationshipType: 'supports' | 'contradicts' | 'clarifies' | 'temporal';
    userId: string;
  }): Promise<void> {
    const fact1 = await this.getById(params.factId1);
    const fact2 = await this.getById(params.factId2);
    
    if (!fact1 || !fact2) {
      throw new Error('One or both facts not found');
    }
    
    // Add bidirectional relationship
    if (!fact1.relatedFacts.includes(params.factId2)) {
      fact1.relatedFacts.push(params.factId2);
    }
    if (!fact2.relatedFacts.includes(params.factId1)) {
      fact2.relatedFacts.push(params.factId1);
    }
    
    await this.saveFact(fact1);
    await this.saveFact(fact2);
    
    // Check for contradictions
    if (params.relationshipType === 'contradicts') {
      await this.flagContradiction(params.factId1, params.factId2);
    }
  }

  /**
   * Verify fact accuracy
   */
  async verifyFact(params: {
    factId: string;
    verificationMethod: string;
    verifierNotes: string;
    userId: string;
  }): Promise<{
    success: boolean;
    newWeight: number;
  }> {
    const fact = await this.getById(params.factId);
    if (!fact) {
      throw new Error('Fact not found');
    }
    
    fact.verificationDate = new Date();
    fact.verificationMethod = params.verificationMethod;
    
    // Verification bonus
    const verificationBonus = 0.05;
    fact.weight = Math.min(1.0, fact.weight + verificationBonus);
    
    await this.saveFact(fact);
    
    return {
      success: true,
      newWeight: fact.weight
    };
  }

  /**
   * Search facts with filters
   */
  async searchFacts(filters: {
    evidenceId?: string;
    caseId?: string;
    factType?: FactType;
    classificationLevel?: ClassificationLevel;
    minWeight?: number;
    supportsCaseTheory?: string;
    textSearch?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    facts: AtomicFact[];
    total: number;
    hasMore: boolean;
  }> {
    return this.findWithFilters(filters);
  }

  /**
   * Get fact statistics
   */
  async getFactStats(caseId?: string): Promise<{
    totalCount: number;
    mintedCount: number;
    typeBreakdown: Record<FactType, number>;
    classificationBreakdown: Record<ClassificationLevel, number>;
    averageWeight: number;
    highWeightCount: number;
    contradictionCount: number;
  }> {
    const facts = await this.findByCase(caseId);
    
    const stats = {
      totalCount: facts.length,
      mintedCount: facts.filter(f => f.chittyChainStatus === MintingStatus.MINTED).length,
      typeBreakdown: {} as Record<FactType, number>,
      classificationBreakdown: {} as Record<ClassificationLevel, number>,
      averageWeight: facts.length > 0 
        ? facts.reduce((sum, f) => sum + f.weight, 0) / facts.length 
        : 0,
      highWeightCount: facts.filter(f => f.weight >= 0.8).length,
      contradictionCount: facts.filter(f => f.contradictsCaseTheory.length > 0).length
    };
    
    // Calculate breakdowns
    Object.values(FactType).forEach(type => {
      stats.typeBreakdown[type] = facts.filter(f => f.factType === type).length;
    });
    
    Object.values(ClassificationLevel).forEach(level => {
      stats.classificationBreakdown[level] = facts.filter(f => f.classificationLevel === level).length;
    });
    
    return stats;
  }

  // Helper methods for mapping AI response
  private mapFactType(type: string): FactType {
    const normalizedType = type.toUpperCase() as FactType;
    return Object.values(FactType).includes(normalizedType) 
      ? normalizedType 
      : FactType.ACTION;
  }

  private mapClassificationLevel(level: string): ClassificationLevel {
    const normalizedLevel = level.toUpperCase() as ClassificationLevel;
    return Object.values(ClassificationLevel).includes(normalizedLevel)
      ? normalizedLevel
      : ClassificationLevel.ASSERTION;
  }

  private mapCredibilityFactors(factors: string[]): CredibilityFactor[] {
    return factors
      .map(factor => {
        const normalized = factor.replace(/\s+/g, ' ').trim();
        return Object.values(CredibilityFactor).find(cf => 
          cf.toLowerCase() === normalized.toLowerCase()
        );
      })
      .filter(Boolean) as CredibilityFactor[];
  }

  private async flagContradiction(factId1: string, factId2: string): Promise<void> {
    // Implementation would integrate with ContradictionService
    console.log(`Flagging contradiction between ${factId1} and ${factId2}`);
  }

  // Database abstraction methods
  private async saveFact(fact: AtomicFact): Promise<void> {
    // Implementation depends on database choice
    throw new Error('Database method not implemented');
  }

  private async getById(factId: string): Promise<AtomicFact | null> {
    // Implementation depends on database choice
    throw new Error('Database method not implemented');
  }

  private async findByCase(caseId?: string): Promise<AtomicFact[]> {
    // Implementation depends on database choice
    throw new Error('Database method not implemented');
  }

  private async findWithFilters(filters: any): Promise<{
    facts: AtomicFact[];
    total: number;
    hasMore: boolean;
  }> {
    // Implementation depends on database choice
    throw new Error('Database method not implemented');
  }
}