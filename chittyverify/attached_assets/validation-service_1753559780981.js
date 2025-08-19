#!/usr/bin/env node

/**
 * JavaScript version of BlockchainValidationService
 * Simplified implementation for immediate compatibility
 */

import crypto from 'crypto';

export class BlockchainValidationService {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.validationErrors = [];
    this.validationWarnings = [];
  }

  async validateChain() {
    this.validationErrors = [];
    this.validationWarnings = [];

    try {
      // Basic chain validation
      const blocks = this.blockchain.chain;
      
      for (let i = 1; i < blocks.length; i++) {
        const currentBlock = blocks[i];
        const previousBlock = blocks[i - 1];
        
        // Validate block hash
        if (currentBlock.previousHash !== previousBlock.hash) {
          this.validationErrors.push(`Block ${i} has invalid previousHash`);
        }
        
        // Validate block hash integrity
        const calculatedHash = this.calculateBlockHash(currentBlock);
        if (calculatedHash !== currentBlock.hash) {
          this.validationErrors.push(`Block ${i} has invalid hash`);
        }
        
        // Validate artifacts
        if (currentBlock.artifacts) {
          for (const artifact of currentBlock.artifacts) {
            await this.validateArtifact(artifact);
          }
        }
      }

      return {
        valid: this.validationErrors.length === 0,
        errors: this.validationErrors,
        warnings: this.validationWarnings
      };
    } catch (error) {
      this.validationErrors.push(`Validation failed: ${error.message}`);
      return {
        valid: false,
        errors: this.validationErrors,
        warnings: this.validationWarnings
      };
    }
  }

  async validateArtifact(artifact) {
    // Basic artifact validation
    if (!artifact.id) {
      this.validationErrors.push('Artifact missing required ID');
    }
    
    if (!artifact.contentHash) {
      this.validationErrors.push(`Artifact ${artifact.id} missing content hash`);
    }
    
    if (typeof artifact.weight !== 'number' || artifact.weight < 0 || artifact.weight > 1) {
      this.validationErrors.push(`Artifact ${artifact.id} has invalid weight`);
    }
    
    // Validate content hash if content is available
    if (artifact.content && artifact.contentHash) {
      const calculatedHash = crypto.createHash('sha256')
        .update(JSON.stringify(artifact.content))
        .digest('hex');
      
      if (calculatedHash !== artifact.contentHash) {
        this.validationErrors.push(`Artifact ${artifact.id} content hash mismatch`);
      }
    }
  }

  calculateBlockHash(block) {
    const blockData = {
      index: block.index,
      timestamp: block.timestamp,
      artifacts: block.artifacts,
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(blockData))
      .digest('hex');
  }

  async exportValidationReport() {
    return {
      timestamp: new Date().toISOString(),
      chainValid: this.validationErrors.length === 0,
      totalBlocks: this.blockchain.chain.length,
      errors: this.validationErrors,
      warnings: this.validationWarnings,
      summary: {
        errorCount: this.validationErrors.length,
        warningCount: this.validationWarnings.length
      }
    };
  }
}

export default BlockchainValidationService;