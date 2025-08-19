/**
 * Enhanced Artifact Minting Service
 * Handles the complete lifecycle of evidence minting with validation
 */

import { ChittyChainV2 } from '@/src/blockchain/ChittyChainV2';
import { BlockchainService } from '@/lib/evidence-ledger/api/blockchain-service';
import { NotionEvidenceClient } from '@/lib/evidence-ledger/api/notion-client';
import { FactsService } from '@/lib/evidence-ledger/api/facts-service';
import { ContradictionService } from '@/lib/evidence-ledger/api/contradiction-service';
import { 
  MintingStatus, 
  EvidenceTier, 
  AuthenticationMethod,
  SourceVerificationStatus 
} from '@/lib/evidence-ledger/schemas/types';
import crypto from 'crypto';

interface MintingRequest {
  evidenceId: string;
  userId: string;
  forceOverride?: boolean;
  metadata?: Record<string, any>;
}

interface MintingResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: string;
  artifactId?: string;
  mintedArtifacts?: MintedArtifact[];
  rejected?: RejectedArtifact[];
  needsCorroboration?: CorroborationRequired[];
  error?: string;
  details?: any;
}

interface MintedArtifact {
  id: string;
  contentHash: string;
  weight: number;
  blockIndex: number;
  merkleProof: any;
}

interface RejectedArtifact {
  artifactId: string;
  reason: string;
  contradictions?: any[];
}

interface CorroborationRequired {
  artifactId: string;
  currentWeight: number;
  requiredWeight: number;
  requiredSources: number;
  suggestions: string[];
}

export class ArtifactMintingService {
  private chittyChain: ChittyChainV2;
  private blockchainService: BlockchainService;
  private notionClient: NotionEvidenceClient;
  private factsService: FactsService;
  private contradictionService: ContradictionService;
  
  constructor() {
    this.chittyChain = new ChittyChainV2();
    this.blockchainService = new BlockchainService();
    this.notionClient = new NotionEvidenceClient();
    this.factsService = new FactsService();
    this.contradictionService = new ContradictionService();
  }

  /**
   * Main minting workflow
   */
  async mintEvidence(request: MintingRequest): Promise<MintingResult> {
    try {
      // 1. Validate request
      const validation = await this.validateRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          details: validation.details
        };
      }

      // 2. Fetch evidence and facts
      const evidence = await this.notionClient.getEvidence(request.evidenceId);
      if (!evidence) {
        return {
          success: false,
          error: 'Evidence not found'
        };
      }

      // 3. Check existing minting status
      if (evidence.mintingStatus === MintingStatus.MINTED && !request.forceOverride) {
        return {
          success: false,
          error: 'Evidence already minted',
          details: {
            blockNumber: evidence.blockNumber,
            artifactId: evidence.artifactId
          }
        };
      }

      // 4. Extract and prepare artifacts
      const artifacts = await this.prepareArtifacts(evidence, request.userId);
      
      // 5. Validate artifacts for minting
      const validationResults = await this.validateArtifacts(artifacts, request.forceOverride);
      
      // 6. Check for contradictions
      const contradictionResults = await this.checkContradictions(
        validationResults.eligible,
        evidence.caseBinding
      );

      // 7. Filter based on contradiction results
      const finalArtifacts = this.filterContradictingArtifacts(
        validationResults.eligible,
        contradictionResults
      );

      // 8. Mint to local blockchain
      const localMintResult = await this.mintToLocalBlockchain(
        finalArtifacts,
        request.userId
      );

      // 9. Mint to Ethereum (if configured)
      let ethereumResult = null;
      if (process.env.ENABLE_ETHEREUM_MINTING === 'true') {
        ethereumResult = await this.mintToEthereum(evidence, localMintResult);
      }

      // 10. Update Notion records
      await this.updateNotionRecords(
        evidence,
        localMintResult,
        ethereumResult,
        request.userId
      );

      // 11. Log audit trail
      await this.logMintingActivity(
        request,
        localMintResult,
        ethereumResult,
        validationResults,
        contradictionResults
      );

      return {
        success: true,
        transactionHash: ethereumResult?.transactionHash || localMintResult.block.hash,
        blockNumber: ethereumResult?.blockNumber || String(localMintResult.block.index),
        artifactId: evidence.artifactId,
        mintedArtifacts: localMintResult.minted,
        rejected: [
          ...validationResults.rejected,
          ...contradictionResults.rejected
        ],
        needsCorroboration: validationResults.needsCorroboration,
        details: {
          localBlockchain: {
            blockHash: localMintResult.block.hash,
            blockIndex: localMintResult.block.index,
            merkleRoot: localMintResult.block.merkleRoot
          },
          ethereum: ethereumResult,
          stats: {
            totalArtifacts: artifacts.length,
            minted: localMintResult.minted.length,
            rejected: validationResults.rejected.length + contradictionResults.rejected.length,
            needsCorroboration: validationResults.needsCorroboration.length
          }
        }
      };

    } catch (error) {
      console.error('Minting error:', error);
      
      // Log failed attempt
      await this.logFailedMinting(request, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown minting error',
        details: error
      };
    }
  }

  /**
   * Validate minting request
   */
  private async validateRequest(request: MintingRequest): Promise<{
    valid: boolean;
    error?: string;
    details?: any;
  }> {
    if (!request.evidenceId) {
      return {
        valid: false,
        error: 'Missing evidence ID'
      };
    }

    if (!request.userId) {
      return {
        valid: false,
        error: 'Missing user ID'
      };
    }

    // Validate user permissions
    // In production, check if user has minting permissions
    
    return { valid: true };
  }

  /**
   * Prepare artifacts from evidence
   */
  private async prepareArtifacts(evidence: any, userId: string): Promise<any[]> {
    // Get atomic facts from evidence
    const facts = await this.factsService.getFactsForEvidence(evidence.artifactId);
    
    // Convert facts to artifacts
    const artifacts = facts.map(fact => ({
      id: this.generateArtifactId(fact),
      contentHash: this.calculateContentHash(fact),
      statement: fact.factText,
      weight: fact.confidenceScore,
      tier: evidence.evidenceTier,
      type: fact.factCategory,
      caseId: evidence.caseBinding,
      timestamp: fact.extractedAt || new Date().toISOString(),
      metadata: {
        factId: fact.factId,
        evidenceId: evidence.artifactId,
        extractedBy: fact.extractedBy || 'SYSTEM',
        verificationStatus: fact.verificationStatus,
        sourceDocument: evidence.originalFilename
      },
      authenticationMethod: evidence.authenticationMethod,
      verified: evidence.sourceVerificationStatus === SourceVerificationStatus.VERIFIED,
      corroborations: fact.corroboratingFacts?.length || 0
    }));

    // Add the main evidence as an artifact if it has sufficient weight
    if (evidence.evidenceWeight >= 0.9) {
      artifacts.unshift({
        id: evidence.artifactId,
        contentHash: evidence.contentHash,
        statement: `Evidence: ${evidence.originalFilename}`,
        weight: evidence.evidenceWeight,
        tier: evidence.evidenceTier,
        type: 'EVIDENCE',
        caseId: evidence.caseBinding,
        timestamp: evidence.uploadDate,
        metadata: {
          evidenceType: evidence.evidenceType,
          fileSize: evidence.fileSize,
          mimeType: evidence.mimeType
        },
        authenticationMethod: evidence.authenticationMethod,
        verified: evidence.sourceVerificationStatus === SourceVerificationStatus.VERIFIED,
        corroborations: 0
      });
    }

    return artifacts;
  }

  /**
   * Generate unique artifact ID
   */
  private generateArtifactId(fact: any): string {
    const content = JSON.stringify({
      factText: fact.factText,
      factId: fact.factId,
      timestamp: Date.now()
    });
    
    const hash = crypto.createHash('sha3-256').update(content).digest('hex');
    return `ART_${hash.substring(0, 12).toUpperCase()}`;
  }

  /**
   * Calculate content hash for artifact
   */
  private calculateContentHash(fact: any): string {
    const content = {
      factText: fact.factText,
      factCategory: fact.factCategory,
      confidenceScore: fact.confidenceScore,
      extractedAt: fact.extractedAt
    };
    
    return crypto.createHash('sha3-256').update(JSON.stringify(content)).digest('hex');
  }

  /**
   * Validate artifacts for minting eligibility
   */
  private async validateArtifacts(artifacts: any[], forceOverride: boolean): Promise<{
    eligible: any[];
    rejected: RejectedArtifact[];
    needsCorroboration: CorroborationRequired[];
  }> {
    const eligible = [];
    const rejected = [];
    const needsCorroboration = [];

    for (const artifact of artifacts) {
      const validation = await this.chittyChain.validateArtifact(artifact);
      
      if (validation.canMint || forceOverride) {
        eligible.push(artifact);
      } else if (validation.requiresCorroboration) {
        needsCorroboration.push({
          artifactId: artifact.id,
          currentWeight: artifact.weight,
          requiredWeight: this.getRequiredWeight(artifact.tier),
          requiredSources: validation.requiredActions.length,
          suggestions: validation.requiredActions
        });
      } else {
        rejected.push({
          artifactId: artifact.id,
          reason: validation.reason
        });
      }
    }

    return { eligible, rejected, needsCorroboration };
  }

  /**
   * Check for contradictions
   */
  private async checkContradictions(artifacts: any[], caseId: string): Promise<{
    valid: any[];
    rejected: RejectedArtifact[];
  }> {
    const valid = [];
    const rejected = [];

    for (const artifact of artifacts) {
      const contradictions = await this.contradictionService.checkContradictions({
        factText: artifact.statement,
        caseId: artifact.caseId,
        factCategory: artifact.type
      });

      if (contradictions.length === 0) {
        valid.push(artifact);
      } else {
        rejected.push({
          artifactId: artifact.id,
          reason: 'Contradicts existing evidence',
          contradictions
        });
      }
    }

    return { valid, rejected };
  }

  /**
   * Filter contradicting artifacts based on tier hierarchy
   */
  private filterContradictingArtifacts(artifacts: any[], contradictionResults: any): any[] {
    return contradictionResults.valid;
  }

  /**
   * Mint to local ChittyChain blockchain
   */
  private async mintToLocalBlockchain(artifacts: any[], userId: string): Promise<any> {
    return await this.chittyChain.mintArtifacts(artifacts, userId);
  }

  /**
   * Mint to Ethereum blockchain
   */
  private async mintToEthereum(evidence: any, localMintResult: any): Promise<any> {
    if (!localMintResult.success) return null;

    return await this.blockchainService.mintEvidence({
      artifactId: evidence.artifactId,
      contentHash: evidence.contentHash,
      caseId: evidence.caseBinding,
      evidenceWeight: evidence.evidenceWeight,
      timestamp: new Date(evidence.uploadDate),
      metadata: {
        localBlockHash: localMintResult.block.hash,
        localBlockIndex: localMintResult.block.index,
        artifactCount: localMintResult.minted.length
      }
    });
  }

  /**
   * Update Notion records after minting
   */
  private async updateNotionRecords(
    evidence: any,
    localMintResult: any,
    ethereumResult: any,
    userId: string
  ): Promise<void> {
    const updates = {
      mintingStatus: MintingStatus.MINTED,
      blockNumber: ethereumResult?.blockNumber || String(localMintResult.block.index),
      blockchainTransactionHash: ethereumResult?.transactionHash || localMintResult.block.hash,
      auditNotes: evidence.auditNotes + `\n[${new Date().toISOString()}] Minted by ${userId}
Local Block: ${localMintResult.block.index} (${localMintResult.block.hash})
${ethereumResult ? `Ethereum TX: ${ethereumResult.transactionHash}` : ''}
Artifacts Minted: ${localMintResult.minted.length}`
    };

    await this.notionClient.updateEvidence(evidence.artifactId, updates);

    // Update facts with minting info
    for (const mintedArtifact of localMintResult.minted) {
      const factId = mintedArtifact.metadata?.factId;
      if (factId) {
        await this.factsService.updateFactMintingStatus(factId, {
          minted: true,
          blockIndex: localMintResult.block.index,
          artifactId: mintedArtifact.id
        });
      }
    }
  }

  /**
   * Log minting activity
   */
  private async logMintingActivity(
    request: MintingRequest,
    localResult: any,
    ethereumResult: any,
    validationResults: any,
    contradictionResults: any
  ): Promise<void> {
    await this.notionClient.logAuditAction({
      actionId: Date.now(),
      timestamp: new Date(),
      user: request.userId,
      actionType: 'Mint',
      targetArtifact: request.evidenceId,
      ipAddress: 'system',
      sessionId: `mint-${Date.now()}`,
      successFailure: 'Success',
      details: JSON.stringify({
        localBlockchain: {
          blockIndex: localResult.block.index,
          blockHash: localResult.block.hash,
          artifactsMinted: localResult.minted.length
        },
        ethereum: ethereumResult,
        validation: {
          eligible: validationResults.eligible.length,
          rejected: validationResults.rejected.length,
          needsCorroboration: validationResults.needsCorroboration.length
        },
        contradictions: {
          checked: validationResults.eligible.length,
          rejected: contradictionResults.rejected.length
        },
        forceOverride: request.forceOverride || false
      })
    });
  }

  /**
   * Log failed minting attempt
   */
  private async logFailedMinting(request: MintingRequest, error: any): Promise<void> {
    try {
      await this.notionClient.logAuditAction({
        actionId: Date.now(),
        timestamp: new Date(),
        user: request.userId,
        actionType: 'Mint',
        targetArtifact: request.evidenceId,
        ipAddress: 'system',
        sessionId: `mint-${Date.now()}`,
        successFailure: 'Failure',
        details: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          request
        })
      });
    } catch (logError) {
      console.error('Failed to log minting failure:', logError);
    }
  }

  /**
   * Get required weight for tier
   */
  private getRequiredWeight(tier: EvidenceTier): number {
    switch (tier) {
      case EvidenceTier.GOVERNMENT:
        return 0.9;
      case EvidenceTier.FINANCIAL:
        return 0.95;
      case EvidenceTier.THIRD_PARTY:
        return 0.9;
      case EvidenceTier.PERSONAL:
        return 0.8;
      default:
        return 1.0;
    }
  }

  /**
   * Batch mint multiple evidences
   */
  async batchMintEvidence(evidenceIds: string[], userId: string): Promise<{
    successful: MintingResult[];
    failed: Array<{ evidenceId: string; error: string }>;
  }> {
    const successful: MintingResult[] = [];
    const failed: Array<{ evidenceId: string; error: string }> = [];

    // Process in chunks
    const chunkSize = 5;
    for (let i = 0; i < evidenceIds.length; i += chunkSize) {
      const chunk = evidenceIds.slice(i, i + chunkSize);
      
      const promises = chunk.map(async (evidenceId) => {
        try {
          const result = await this.mintEvidence({
            evidenceId,
            userId
          });
          
          if (result.success) {
            successful.push(result);
          } else {
            failed.push({
              evidenceId,
              error: result.error || 'Unknown error'
            });
          }
        } catch (error) {
          failed.push({
            evidenceId,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      await Promise.all(promises);
      
      // Small delay between chunks
      if (i + chunkSize < evidenceIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { successful, failed };
  }

  /**
   * Get minting eligibility for evidence
   */
  async getMintingEligibility(evidenceId: string): Promise<{
    eligible: boolean;
    reason: string;
    requirements?: string[];
    estimatedCost?: string;
  }> {
    try {
      const evidence = await this.notionClient.getEvidence(evidenceId);
      if (!evidence) {
        return {
          eligible: false,
          reason: 'Evidence not found'
        };
      }

      if (evidence.mintingStatus === MintingStatus.MINTED) {
        return {
          eligible: false,
          reason: 'Already minted',
          requirements: [`Block: ${evidence.blockNumber}`]
        };
      }

      const artifacts = await this.prepareArtifacts(evidence, 'SYSTEM');
      const validation = await this.validateArtifacts(artifacts, false);

      if (validation.eligible.length > 0) {
        return {
          eligible: true,
          reason: `${validation.eligible.length} artifacts ready for minting`,
          estimatedCost: '0.002 ETH'
        };
      }

      if (validation.needsCorroboration.length > 0) {
        return {
          eligible: false,
          reason: 'Requires corroboration',
          requirements: validation.needsCorroboration[0].suggestions
        };
      }

      return {
        eligible: false,
        reason: validation.rejected[0]?.reason || 'Does not meet minting criteria'
      };

    } catch (error) {
      return {
        eligible: false,
        reason: 'Error checking eligibility',
        requirements: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
}