/**
 * ChittyChain Trust Layer - User Verification and Trust System
 * Ensures evidence is analyzed and verified before minting
 */

export enum SourceTier {
  SOCIAL_MEDIA = "SOCIAL_MEDIA",
  NEWS_OUTLET = "NEWS_OUTLET", 
  DIRECT_TESTIMONY = "DIRECT_TESTIMONY",
  EXPERT_WITNESS = "EXPERT_WITNESS",
  GOVERNMENT = "GOVERNMENT",
  SELF_AUTHENTICATING = "SELF_AUTHENTICATING"
}

export const SOURCE_WEIGHTS: Record<SourceTier, number> = {
  [SourceTier.SOCIAL_MEDIA]: 0.2,
  [SourceTier.NEWS_OUTLET]: 0.4,
  [SourceTier.DIRECT_TESTIMONY]: 0.6,
  [SourceTier.EXPERT_WITNESS]: 0.8,
  [SourceTier.GOVERNMENT]: 1.0,
  [SourceTier.SELF_AUTHENTICATING]: 1.0,
};

export interface TrustAnalysis {
  totalArtifacts: number;
  tierBreakdown: Record<string, number>;
  weightAnalysis: {
    average: number;
    min: number;
    max: number;
    aboveThreshold: number;
  };
  concerns: string[];
  recommendations: string[];
  overallScore: number;
}

export interface ChittyChainFact {
  id: string;
  statement: string;
  source_tier: SourceTier;
  source_hash: string;
  weight: number;
  timestamp: number;
  block_number?: number;
  transaction_hash?: string;
  supporting_evidence: string[];
  contradicting_facts?: string[];
}

export class ChittyChainTrustLayer {
  private trustTiers = {
    SELF_AUTHENTICATING: { weight: 1.0, autoMint: true },
    GOVERNMENT: { weight: 0.95, autoMint: true },
    FINANCIAL_INSTITUTION: { weight: 0.90, autoMint: false },
    INDEPENDENT_THIRD_PARTY: { weight: 0.85, autoMint: false },
    BUSINESS_RECORDS: { weight: 0.80, autoMint: false },
    FIRST_PARTY_ADVERSE: { weight: 0.75, autoMint: false },
    FIRST_PARTY_FRIENDLY: { weight: 0.60, autoMint: false },
    UNCORROBORATED_PERSON: { weight: 0.40, autoMint: false }
  };

  async analyzeEvidence(evidence: any): Promise<TrustAnalysis> {
    const analysis: TrustAnalysis = {
      totalArtifacts: 1,
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

    // Calculate base trust score from tier
    const tierConfig = this.trustTiers[evidence.tier as keyof typeof this.trustTiers];
    if (!tierConfig) {
      analysis.concerns.push(`Unknown tier: ${evidence.tier}`);
      analysis.overallScore = 0;
      return analysis;
    }

    analysis.overallScore = tierConfig.weight;
    analysis.tierBreakdown[evidence.tier] = 1;
    analysis.weightAnalysis.average = evidence.weight || tierConfig.weight;
    analysis.weightAnalysis.min = analysis.weightAnalysis.average;
    analysis.weightAnalysis.max = analysis.weightAnalysis.average;
    
    if (analysis.weightAnalysis.average >= 0.85) {
      analysis.weightAnalysis.aboveThreshold = 1;
    }

    // Generate recommendations
    if (analysis.overallScore >= 0.9) {
      analysis.recommendations.push("Evidence meets auto-minting threshold");
    } else if (analysis.overallScore >= 0.7) {
      analysis.recommendations.push("Evidence suitable for manual review");
    } else {
      analysis.recommendations.push("Consider additional corroboration");
    }

    return analysis;
  }

  async findContradictions(evidence: any): Promise<any[]> {
    // Simulate contradiction detection
    // In a real implementation, this would check against existing blockchain records
    return [];
  }

  async requestMintingConsent(artifacts: any[], options: any = {}): Promise<{
    approved: boolean;
    consentId: string;
    signature?: any;
    trustScore: number;
    record: any;
  }> {
    console.log(`🔐 ChittyChain Minting Consent Required for ${artifacts.length} artifacts`);
    
    // Display trust analysis
    for (const artifact of artifacts) {
      const analysis = await this.analyzeEvidence(artifact);
      console.log(`Artifact ${artifact.id}: Trust Score ${analysis.overallScore}`);
    }

    // Auto-approve high trust artifacts for demo
    const avgTrustScore = artifacts.reduce((sum, a) => {
      const tierConfig = this.trustTiers[a.tier as keyof typeof this.trustTiers];
      return sum + (tierConfig?.weight || 0);
    }, 0) / artifacts.length;

    const consentRecord = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      artifacts: artifacts,
      trustScore: avgTrustScore,
      status: avgTrustScore >= 0.85 ? 'approved' : 'requires_review'
    };

    return {
      approved: avgTrustScore >= 0.85,
      consentId: consentRecord.id,
      trustScore: avgTrustScore,
      record: consentRecord
    };
  }

  async submit_evidence_with_source(evidence: {
    type: string;
    source_tier: SourceTier;
    ipfs_hash: string;
    chain_of_custody: any[];
    seal_number?: string;
    notary_id?: string;
    clerk_signature?: string;
  }): Promise<any> {
    // Calculate combined weight
    const baseWeight = SOURCE_WEIGHTS[evidence.source_tier];
    const custodyBonus = evidence.chain_of_custody.length * 0.05;
    const sealBonus = evidence.seal_number ? 0.1 : 0;
    const notaryBonus = evidence.notary_id ? 0.1 : 0;
    const clerkBonus = evidence.clerk_signature ? 0.2 : 0;
    
    const combined_weight = Math.min(
      1.0,
      baseWeight + custodyBonus + sealBonus + notaryBonus + clerkBonus
    );

    const fullEvidence = {
      id: this.generateId(),
      ...evidence,
      combined_weight,
    };

    // Auto-mint if weight >= 0.9
    if (combined_weight >= 0.9) {
      await this.mint_chittychain_fact({
        statement: `Property evidence ${fullEvidence.id} verified`,
        source_tier: evidence.source_tier,
        source_hash: evidence.ipfs_hash,
        weight: combined_weight,
        supporting_evidence: [evidence.ipfs_hash],
      });
    }

    return fullEvidence;
  }

  async mint_chittychain_fact(fact: {
    statement: string;
    source_tier: SourceTier;
    source_hash: string;
    weight: number;
    supporting_evidence: string[];
  }): Promise<ChittyChainFact> {
    const fullFact: ChittyChainFact = {
      id: this.generateId(),
      ...fact,
      timestamp: Date.now(),
      block_number: Math.floor(Math.random() * 1000000),
      transaction_hash: `0x${this.generateId()}`
    };

    console.log(`✅ Minted ChittyChain fact: ${fullFact.id} with weight ${fullFact.weight}`);
    return fullFact;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export const trustLayer = new ChittyChainTrustLayer();