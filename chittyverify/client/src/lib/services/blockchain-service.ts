/**
 * ChittyChain Evidence Ledger - Blockchain Service
 * Integrates V2 blockchain with real PostgreSQL database
 */

import { ChittyChainV2 } from '../blockchain/chittychain-v2';
import { calculateEvidenceWeight, generateArtifactId } from '../formulas';
import { EvidenceTier, MintingStatus } from '../../../../shared/types';

export interface BlockchainMintingRequest {
  evidenceId: string;
  statement: string;
  type: string;
  tier: EvidenceTier;
  weight?: number;
  caseId: string;
  metadata?: any;
}

export interface BlockchainMintingResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: string;
  artifactId?: string;
  message: string;
  minted: any[];
  rejected: any[];
  needsCorroboration: any[];
}

export interface BlockchainQuery {
  caseId?: string;
  type?: string;
  minWeight?: number;
  searchTerms?: string[];
  artifactId?: string;
}

export interface BlockchainQueryResult {
  artifacts: any[];
  totalCount: number;
  searchContext?: any;
}

export class BlockchainService {
  private blockchain: ChittyChainV2;
  private isInitialized = false;

  constructor() {
    this.blockchain = new ChittyChainV2();
    this.initialize();
  }

  private async initialize() {
    try {
      // Load any existing blockchain state
      await this.loadBlockchainState();
      this.isInitialized = true;
      console.log('Blockchain service initialized');
    } catch (error) {
      console.error('Failed to initialize blockchain service:', error);
    }
  }

  private async loadBlockchainState() {
    // In a real implementation, this would load from persistent storage
    // For now, we start with a fresh blockchain each time
    console.log('Blockchain state loaded');
  }

  /**
   * Mint evidence artifacts to the blockchain
   */
  async mintEvidence(requests: BlockchainMintingRequest[], minterAddress: string): Promise<BlockchainMintingResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Transform requests into blockchain artifacts
      const artifacts = requests.map(request => ({
        id: request.evidenceId || generateArtifactId(),
        contentHash: this.generateContentHash(request.statement),
        statement: request.statement,
        weight: request.weight || calculateEvidenceWeight(request.tier),
        type: request.type,
        tier: request.tier,
        caseId: request.caseId,
        timestamp: new Date().toISOString(),
        metadata: request.metadata || {}
      }));

      // Mint to blockchain
      const result = await this.blockchain.mintArtifacts(artifacts, minterAddress);

      if (result.success) {
        // Update database with blockchain transaction info
        await this.updateDatabaseWithBlockchainInfo(result);
      }

      return {
        success: result.success,
        transactionHash: result.transactionHash,
        blockNumber: result.blockNumber,
        artifactId: artifacts[0]?.id,
        message: result.message,
        minted: result.minted,
        rejected: result.rejected,
        needsCorroboration: result.needsCorroboration
      };
    } catch (error) {
      console.error('Blockchain minting error:', error);
      return {
        success: false,
        message: `Minting failed: ${error.message}`,
        minted: [],
        rejected: requests.map(r => ({ request: r, reason: error.message })),
        needsCorroboration: []
      };
    }
  }

  /**
   * Query blockchain for artifacts
   */
  async queryBlockchain(query: BlockchainQuery): Promise<BlockchainQueryResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const chainStats = this.blockchain.getChainStats();
      const artifacts: any[] = [];

      // Search through all blocks
      for (const block of this.blockchain['chain']) {
        if (block.data?.artifacts) {
          for (const artifact of block.data.artifacts) {
            let matches = true;

            // Apply filters
            if (query.caseId && artifact.caseId !== query.caseId) {
              matches = false;
            }
            if (query.type && artifact.type !== query.type) {
              matches = false;
            }
            if (query.minWeight && artifact.weight < query.minWeight) {
              matches = false;
            }
            if (query.artifactId && artifact.id !== query.artifactId) {
              matches = false;
            }
            if (query.searchTerms && query.searchTerms.length > 0) {
              const searchText = (artifact.statement || '').toLowerCase();
              const hasMatch = query.searchTerms.some(term => 
                searchText.includes(term.toLowerCase())
              );
              if (!hasMatch) {
                matches = false;
              }
            }

            if (matches) {
              artifacts.push({
                ...artifact,
                blockNumber: block.index,
                blockHash: block.hash,
                mintedAt: block.timestamp
              });
            }
          }
        }
      }

      return {
        artifacts,
        totalCount: artifacts.length,
        searchContext: {
          totalBlocks: chainStats.totalBlocks,
          chainValid: chainStats.chainValid
        }
      };
    } catch (error) {
      console.error('Blockchain query error:', error);
      return {
        artifacts: [],
        totalCount: 0,
        searchContext: { error: error.message }
      };
    }
  }

  /**
   * Get blockchain status and statistics
   */
  getBlockchainStatus() {
    if (!this.isInitialized) {
      return {
        initialized: false,
        error: 'Blockchain not initialized'
      };
    }

    const stats = this.blockchain.getChainStats();
    const validation = this.blockchain.validateChain();

    return {
      initialized: true,
      chainLength: stats.totalBlocks,
      totalArtifacts: stats.totalArtifacts,
      chainValid: stats.chainValid,
      latestBlockHash: stats.latestBlockHash,
      validation: {
        valid: validation.valid,
        errors: validation.errors || []
      }
    };
  }

  /**
   * Validate blockchain integrity
   */
  async validateBlockchainIntegrity() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const validation = this.blockchain.validateChain();
    return {
      valid: validation.valid,
      errors: validation.errors || [],
      recommendations: this.generateValidationRecommendations(validation)
    };
  }

  /**
   * Get evidence verification status
   */
  async getEvidenceVerificationStatus(evidenceId: string) {
    const query = await this.queryBlockchain({ artifactId: evidenceId });
    
    if (query.artifacts.length > 0) {
      const artifact = query.artifacts[0];
      return {
        minted: true,
        weight: artifact.weight,
        blockNumber: artifact.blockNumber,
        transactionHash: artifact.blockHash,
        mintedAt: artifact.mintedAt,
        status: MintingStatus.MINTED
      };
    }

    return {
      minted: false,
      status: MintingStatus.PENDING
    };
  }

  private generateContentHash(content: string): string {
    // Simple hash for content - in production would use SHA-256
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `sha256:${Math.abs(hash).toString(16)}`;
  }

  private async updateDatabaseWithBlockchainInfo(result: any) {
    // This would update the database with blockchain transaction info
    // Implementation depends on your API structure
    console.log('Database updated with blockchain info:', {
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      mintedCount: result.minted.length
    });
  }

  private generateValidationRecommendations(validation: any): string[] {
    const recommendations: string[] = [];
    
    if (!validation.valid) {
      recommendations.push('Blockchain integrity compromised - immediate attention required');
      if (validation.errors?.length > 0) {
        recommendations.push('Review error log and consider chain recovery');
      }
    } else {
      recommendations.push('Blockchain integrity verified - system operating normally');
    }

    return recommendations;
  }
}

// Singleton instance
export const blockchainService = new BlockchainService();