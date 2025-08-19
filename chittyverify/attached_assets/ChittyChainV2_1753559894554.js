import { ChittyBlockV2 } from './ChittyBlockV2.js';
import crypto from 'crypto';
import { EventEmitter } from 'events';

/**
 * Enhanced ChittyChain with improved artifact minting and validation
 */
export class ChittyChainV2 extends EventEmitter {
  constructor() {
    super();
    this.chain = [];
    this.difficulty = 4;
    this.pendingArtifacts = [];
    this.miningReward = 1;
    this.validators = new Map();
    this.artifactIndex = new Map(); // Fast artifact lookup
    this.contradictionEngine = new ContradictionEngine();
    this.consensusRules = new ConsensusRules();
    
    // Initialize with genesis block
    this.chain.push(this.createGenesisBlock());
  }

  /**
   * Create the genesis block
   */
  createGenesisBlock() {
    const genesisData = {
      artifacts: [{
        id: 'GENESIS_001',
        contentHash: crypto.createHash('sha3-256').update('ChittyChain Genesis').digest('hex'),
        statement: 'ChittyChain Evidence Ledger initialized',
        weight: 1.0,
        timestamp: new Date('2024-01-01').toISOString(),
        type: 'SYSTEM',
        caseId: 'SYSTEM',
        tier: 'SYSTEM'
      }],
      blockType: 'GENESIS',
      chainVersion: '2.0.0'
    };
    
    const genesis = new ChittyBlockV2(0, new Date('2024-01-01').toISOString(), genesisData, '0');
    
    // For genesis block, we don't mine it, just set valid values
    genesis.nonce = 0;
    genesis.metadata.difficulty = 0;
    genesis.metadata.blockSize = JSON.stringify(genesisData).length;
    
    // Index the genesis artifact
    this.indexArtifact(genesisData.artifacts[0], 0);
    
    return genesis;
  }

  /**
   * Get the latest block in the chain
   */
  getLatestBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * Enhanced artifact minting with validation and corroboration
   */
  async mintArtifacts(artifacts, minterAddress) {
    // Validate all artifacts
    const validationResults = await Promise.all(
      artifacts.map(artifact => this.validateArtifact(artifact))
    );

    const toMint = [];
    const rejected = [];
    const needsCorroboration = [];

    validationResults.forEach((result, index) => {
      const artifact = artifacts[index];
      
      if (result.canMint) {
        toMint.push(this.prepareArtifactForMinting(artifact, minterAddress));
      } else if (result.requiresCorroboration) {
        needsCorroboration.push({
          artifact,
          reason: result.reason,
          requiredActions: result.requiredActions
        });
      } else {
        rejected.push({
          artifact,
          reason: result.reason
        });
      }
    });

    // Check for contradictions
    const contradictionResults = await this.checkContradictions(toMint);
    
    // Filter out contradicting artifacts
    const finalArtifacts = toMint.filter((artifact, index) => 
      !contradictionResults[index].hasContradiction
    );

    // Move contradicting artifacts to rejected
    toMint.forEach((artifact, index) => {
      if (contradictionResults[index].hasContradiction) {
        rejected.push({
          artifact,
          reason: 'Contradicts existing evidence',
          contradictions: contradictionResults[index].contradictions
        });
      }
    });

    if (finalArtifacts.length === 0) {
      return {
        success: false,
        minted: [],
        rejected,
        needsCorroboration,
        message: 'No artifacts eligible for minting'
      };
    }

    // Create and mine the block
    const blockData = {
      artifacts: finalArtifacts,
      minter: minterAddress,
      artifactCount: finalArtifacts.length,
      blockType: 'EVIDENCE',
      timestamp: new Date().toISOString()
    };

    const newBlock = new ChittyBlockV2(
      this.chain.length,
      Date.now(),
      blockData,
      this.getLatestBlock().hash
    );

    // Mine the block
    await newBlock.mineBlock(this.difficulty);
    
    // Validate the block before adding
    const blockValidation = newBlock.validate();
    if (!blockValidation.valid) {
      throw new Error(`Block validation failed: ${blockValidation.errors.join(', ')}`);
    }

    // Add to chain
    this.chain.push(newBlock);

    // Index all artifacts in the block
    finalArtifacts.forEach(artifact => {
      this.indexArtifact(artifact, newBlock.index);
    });

    // Emit events
    this.emit('blockMined', {
      blockIndex: newBlock.index,
      hash: newBlock.hash,
      artifactCount: finalArtifacts.length,
      miner: minterAddress
    });

    finalArtifacts.forEach(artifact => {
      this.emit('artifactMinted', {
        artifactId: artifact.id,
        blockIndex: newBlock.index,
        weight: artifact.weight
      });
    });

    return {
      success: true,
      block: {
        index: newBlock.index,
        hash: newBlock.hash,
        merkleRoot: newBlock.merkleRoot,
        timestamp: newBlock.timestamp
      },
      minted: finalArtifacts.map(a => ({
        id: a.id,
        contentHash: a.contentHash,
        weight: a.weight,
        merkleProof: newBlock.generateMerkleProof(a.id)
      })),
      rejected,
      needsCorroboration,
      explorerUrl: this.generateExplorerUrl(newBlock.hash)
    };
  }

  /**
   * Prepare artifact for minting with enhanced metadata
   */
  prepareArtifactForMinting(artifact, minterAddress) {
    return {
      ...artifact,
      id: artifact.id || this.generateArtifactId(artifact),
      blockNumber: this.chain.length,
      mintedBy: minterAddress,
      mintedAt: new Date().toISOString(),
      version: 2,
      metadata: {
        ...artifact.metadata,
        originalHash: artifact.contentHash,
        mintingVersion: '2.0.0'
      }
    };
  }

  /**
   * Generate unique artifact ID
   */
  generateArtifactId(artifact) {
    const content = JSON.stringify({
      contentHash: artifact.contentHash,
      caseId: artifact.caseId,
      timestamp: Date.now(),
      random: crypto.randomBytes(8).toString('hex')
    });
    
    const hash = crypto.createHash('sha3-256').update(content).digest('hex');
    return `ART_${hash.substring(0, 12).toUpperCase()}_V2`;
  }

  /**
   * Enhanced artifact validation with tiered evidence system
   */
  async validateArtifact(artifact) {
    const result = {
      canMint: false,
      requiresCorroboration: false,
      reason: '',
      requiredActions: [],
      validationScore: 0
    };

    // Check required fields
    if (!artifact.contentHash || !artifact.weight || !artifact.tier) {
      result.reason = 'Missing required fields';
      return result;
    }

    // Check if already minted
    if (this.artifactIndex.has(artifact.contentHash)) {
      result.reason = 'Artifact already minted';
      return result;
    }

    // Apply consensus rules based on tier and weight
    const consensusResult = this.consensusRules.evaluate(artifact);
    
    if (consensusResult.autoMint) {
      result.canMint = true;
      result.reason = consensusResult.reason;
      result.validationScore = consensusResult.score;
    } else if (consensusResult.canMintWithCorroboration) {
      result.requiresCorroboration = true;
      result.reason = consensusResult.reason;
      result.requiredActions = consensusResult.requiredActions;
      result.validationScore = consensusResult.score;
    } else {
      result.reason = consensusResult.reason;
      result.validationScore = consensusResult.score;
    }

    return result;
  }

  /**
   * Check for contradictions with existing evidence
   */
  async checkContradictions(artifacts) {
    return Promise.all(
      artifacts.map(artifact => this.contradictionEngine.check(artifact, this.chain))
    );
  }

  /**
   * Index artifact for fast lookup
   */
  indexArtifact(artifact, blockIndex) {
    this.artifactIndex.set(artifact.contentHash, {
      artifactId: artifact.id,
      blockIndex,
      caseId: artifact.caseId,
      weight: artifact.weight,
      tier: artifact.tier
    });
  }

  /**
   * Query artifacts with advanced filtering
   */
  queryArtifacts(query) {
    const results = [];
    
    for (const block of this.chain) {
      if (!block.data?.artifacts) continue;
      
      const matchingArtifacts = block.data.artifacts.filter(artifact => {
        // Case ID filter
        if (query.caseId && artifact.caseId !== query.caseId) {
          return false;
        }
        
        // Weight filter
        if (query.minWeight !== undefined && artifact.weight < query.minWeight) {
          return false;
        }
        
        // Tier filter
        if (query.tier && artifact.tier !== query.tier) {
          return false;
        }
        
        // Type filter
        if (query.type && artifact.type !== query.type) {
          return false;
        }
        
        // Date range filter
        if (query.startDate || query.endDate) {
          const artifactDate = new Date(artifact.timestamp);
          if (query.startDate && artifactDate < new Date(query.startDate)) {
            return false;
          }
          if (query.endDate && artifactDate > new Date(query.endDate)) {
            return false;
          }
        }
        
        // Text search
        if (query.searchText) {
          const searchLower = query.searchText.toLowerCase();
          const statement = (artifact.statement || '').toLowerCase();
          const metadata = JSON.stringify(artifact.metadata || {}).toLowerCase();
          
          if (!statement.includes(searchLower) && !metadata.includes(searchLower)) {
            return false;
          }
        }
        
        return true;
      });
      
      if (matchingArtifacts.length > 0) {
        results.push({
          blockIndex: block.index,
          blockHash: block.hash,
          timestamp: block.timestamp,
          artifacts: matchingArtifacts.map(a => ({
            ...a,
            merkleProof: block.generateMerkleProof(a.id)
          }))
        });
      }
    }
    
    return {
      results,
      totalArtifacts: results.reduce((sum, r) => sum + r.artifacts.length, 0),
      blocksSearched: this.chain.length
    };
  }

  /**
   * Validate entire blockchain integrity
   */
  validateChain() {
    const errors = [];
    const warnings = [];
    
    // Validate genesis block
    const genesisValidation = this.chain[0].validate();
    if (!genesisValidation.valid) {
      errors.push(`Genesis block invalid: ${genesisValidation.errors.join(', ')}`);
    }
    
    // Validate each block and its connection to previous
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      
      // Validate block structure
      const blockValidation = currentBlock.validate();
      if (!blockValidation.valid) {
        errors.push(`Block ${i} invalid: ${blockValidation.errors.join(', ')}`);
      }
      
      if (blockValidation.warnings.length > 0) {
        warnings.push(`Block ${i}: ${blockValidation.warnings.join(', ')}`);
      }
      
      // Check hash continuity
      if (currentBlock.previousHash !== previousBlock.hash) {
        errors.push(`Block ${i} has broken chain: previous hash mismatch`);
      }
      
      // Check timestamp order
      if (new Date(currentBlock.timestamp) < new Date(previousBlock.timestamp)) {
        warnings.push(`Block ${i} has timestamp before previous block`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      chainLength: this.chain.length,
      totalArtifacts: this.artifactIndex.size
    };
  }

  /**
   * Get comprehensive chain statistics
   */
  getChainStats() {
    const stats = {
      totalBlocks: this.chain.length,
      totalArtifacts: 0,
      artifactsByTier: {},
      artifactsByCase: {},
      averageBlockSize: 0,
      averageMiningTime: 0,
      chainValid: true
    };
    
    let totalBlockSize = 0;
    let totalMiningTime = 0;
    let blocksWithMiningTime = 0;
    
    for (const block of this.chain) {
      if (block.data?.artifacts) {
        stats.totalArtifacts += block.data.artifacts.length;
        
        block.data.artifacts.forEach(artifact => {
          // Count by tier
          stats.artifactsByTier[artifact.tier] = 
            (stats.artifactsByTier[artifact.tier] || 0) + 1;
          
          // Count by case
          if (artifact.caseId) {
            stats.artifactsByCase[artifact.caseId] = 
              (stats.artifactsByCase[artifact.caseId] || 0) + 1;
          }
        });
      }
      
      if (block.metadata?.blockSize) {
        totalBlockSize += block.metadata.blockSize;
      }
      
      if (block.metadata?.miningDuration) {
        totalMiningTime += block.metadata.miningDuration;
        blocksWithMiningTime++;
      }
    }
    
    stats.averageBlockSize = totalBlockSize / this.chain.length;
    stats.averageMiningTime = blocksWithMiningTime > 0 
      ? totalMiningTime / blocksWithMiningTime 
      : 0;
    
    const validation = this.validateChain();
    stats.chainValid = validation.valid;
    
    return stats;
  }

  /**
   * Export chain to JSON for backup
   */
  exportChain() {
    return {
      version: '2.0.0',
      exported: new Date().toISOString(),
      chain: this.chain.map(block => block.toJSON()),
      stats: this.getChainStats()
    };
  }

  /**
   * Import chain from JSON backup
   */
  static importChain(jsonData) {
    const chain = new ChittyChainV2();
    chain.chain = [];
    
    jsonData.chain.forEach(blockData => {
      const block = ChittyBlockV2.fromJSON(blockData);
      chain.chain.push(block);
      
      // Re-index artifacts
      if (block.data?.artifacts) {
        block.data.artifacts.forEach(artifact => {
          chain.indexArtifact(artifact, block.index);
        });
      }
    });
    
    return chain;
  }

  /**
   * Generate blockchain explorer URL
   */
  generateExplorerUrl(blockHash) {
    return `https://chittychain.explorer.com/block/${blockHash}`;
  }
}

/**
 * Contradiction detection engine
 */
class ContradictionEngine {
  async check(artifact, chain) {
    const contradictions = [];
    
    for (const block of chain) {
      if (!block.data?.artifacts) continue;
      
      for (const existingArtifact of block.data.artifacts) {
        if (this.detectContradiction(artifact, existingArtifact)) {
          contradictions.push({
            blockIndex: block.index,
            artifactId: existingArtifact.id,
            type: this.getContradictionType(artifact, existingArtifact),
            severity: this.getContradictionSeverity(artifact, existingArtifact),
            description: this.describeContradiction(artifact, existingArtifact)
          });
        }
      }
    }
    
    return {
      hasContradiction: contradictions.length > 0,
      contradictions
    };
  }
  
  detectContradiction(artifact1, artifact2) {
    // Same case only
    if (artifact1.caseId !== artifact2.caseId) return false;
    
    // Don't compare artifacts with themselves
    if (artifact1.id === artifact2.id) return false;
    
    // Check explicit contradictions
    if (artifact1.contradicts?.includes(artifact2.id)) return true;
    if (artifact2.contradicts?.includes(artifact1.id)) return true;
    
    // Check temporal contradictions - only if same subject and event type
    if (artifact1.type === 'DATE' && artifact2.type === 'DATE' &&
        artifact1.subject === artifact2.subject && artifact1.eventType === artifact2.eventType) {
      return this.checkTemporalContradiction(artifact1, artifact2);
    }
    
    // Check boolean contradictions - only if same subject
    if (artifact1.type === 'BOOLEAN' && artifact2.type === 'BOOLEAN' &&
        artifact1.subject === artifact2.subject && artifact1.valueType === 'boolean' && artifact2.valueType === 'boolean') {
      return artifact1.value !== artifact2.value;
    }
    
    return false;
  }
  
  checkTemporalContradiction(artifact1, artifact2) {
    if (artifact1.eventType !== artifact2.eventType) return false;
    
    const date1 = new Date(artifact1.value);
    const date2 = new Date(artifact2.value);
    
    // Different dates for same event
    return Math.abs(date1 - date2) > 86400000; // More than 1 day difference
  }
  
  checkFactualContradiction(artifact1, artifact2) {
    // Opposite boolean values
    if (artifact1.valueType === 'boolean' && artifact2.valueType === 'boolean') {
      return artifact1.value !== artifact2.value;
    }
    
    // Mutually exclusive states
    if (artifact1.mutuallyExclusive && artifact2.mutuallyExclusive) {
      return artifact1.value !== artifact2.value;
    }
    
    return false;
  }
  
  getContradictionType(artifact1, artifact2) {
    if (artifact1.type === 'DATE' && artifact2.type === 'DATE') {
      return 'TEMPORAL';
    }
    if (artifact1.valueType === 'boolean') {
      return 'BOOLEAN';
    }
    return 'FACTUAL';
  }
  
  getContradictionSeverity(artifact1, artifact2) {
    // Higher tier evidence has precedence
    const tierOrder = ['GOVERNMENT', 'FINANCIAL', 'THIRD_PARTY', 'PERSONAL'];
    const tier1Index = tierOrder.indexOf(artifact1.tier);
    const tier2Index = tierOrder.indexOf(artifact2.tier);
    
    if (tier1Index < tier2Index) return 'LOW'; // New evidence is lower tier
    if (tier1Index > tier2Index) return 'HIGH'; // New evidence contradicts higher tier
    
    // Same tier - check weights
    if (artifact1.weight > artifact2.weight + 0.2) return 'MEDIUM';
    if (artifact1.weight < artifact2.weight - 0.2) return 'HIGH';
    
    return 'MEDIUM';
  }
  
  describeContradiction(newArtifact, existingArtifact) {
    const type = this.getContradictionType(newArtifact, existingArtifact);
    
    return `${type} CONTRADICTION: "${newArtifact.statement}" conflicts with existing evidence "${existingArtifact.statement}" (Block ${existingArtifact.blockNumber})`;
  }
}

/**
 * Consensus rules for artifact validation
 */
class ConsensusRules {
  evaluate(artifact) {
    const result = {
      autoMint: false,
      canMintWithCorroboration: false,
      reason: '',
      requiredActions: [],
      score: 0
    };
    
    // Tier-based rules
    switch (artifact.tier) {
      case 'GOVERNMENT':
        if (artifact.weight >= 0.9) {
          result.autoMint = true;
          result.reason = 'Government document with high weight';
          result.score = 100;
        } else if (artifact.weight >= 0.7) {
          result.canMintWithCorroboration = true;
          result.reason = 'Government document requires verification';
          result.requiredActions = ['Verify document authenticity'];
          result.score = 80;
        }
        break;
        
      case 'FINANCIAL':
        if (artifact.weight >= 0.95) {
          result.autoMint = true;
          result.reason = 'Financial record with very high weight';
          result.score = 95;
        } else if (artifact.weight >= 0.8) {
          result.canMintWithCorroboration = true;
          result.reason = 'Financial record requires corroboration';
          result.requiredActions = ['Need 1 corroborating source'];
          result.score = 75;
        }
        break;
        
      case 'THIRD_PARTY':
        if (artifact.weight >= 0.9 && artifact.verified) {
          result.autoMint = true;
          result.reason = 'Verified third-party evidence';
          result.score = 85;
        } else if (artifact.weight >= 0.6) {
          result.canMintWithCorroboration = true;
          result.reason = 'Third-party evidence needs corroboration';
          result.requiredActions = ['Need 1 corroborating source'];
          result.score = 60;
        }
        break;
        
      case 'PERSONAL':
        if (artifact.weight >= 0.8 && artifact.corroborations >= 2) {
          result.canMintWithCorroboration = true;
          result.reason = 'Personal evidence with sufficient corroboration';
          result.requiredActions = ['Review corroborating evidence'];
          result.score = 50;
        } else {
          result.reason = 'Personal evidence requires multiple corroborations';
          result.requiredActions = ['Need 3+ independent corroborations'];
          result.score = 30;
        }
        break;
        
      case 'UNCORROBORATED_PERSON':
        if (artifact.weight >= 0.3) {
          result.autoMint = true;
          result.reason = 'Uncorroborated personal evidence accepted for testing';
          result.score = 25;
        } else {
          result.reason = 'Uncorroborated evidence weight too low';
          result.score = 10;
        }
        break;
        
      default:
        result.reason = 'Unknown evidence tier';
        result.score = 0;
    }
    
    // Special rules for authenticated documents
    if (artifact.authenticationMethod === 'DIGITAL_SEAL' && artifact.weight >= 0.85) {
      result.autoMint = true;
      result.reason = 'Digitally sealed document';
      result.score = Math.max(result.score, 90);
    }
    
    return result;
  }
}

// Export all classes for use by other modules
export { ContradictionEngine, ConsensusRules };