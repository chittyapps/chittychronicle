#!/usr/bin/env node

/**
 * JavaScript version of ArtifactMintingService
 * Simplified implementation for immediate compatibility
 */

import crypto from 'crypto';

export class ArtifactMintingService {
  constructor(blockchain) {
    this.blockchain = blockchain;
    this.mintingQueue = [];
    this.mintingLog = [];
  }

  async mintArtifacts(artifacts, miner = 'system') {
    try {
      this.log('Starting artifact minting process', 'info');
      
      const validArtifacts = [];
      const rejectedArtifacts = [];
      
      // Validate artifacts before minting
      for (const artifact of artifacts) {
        const validation = await this.validateArtifactForMinting(artifact);
        if (validation.valid) {
          validArtifacts.push(artifact);
        } else {
          rejectedArtifacts.push({
            artifact: artifact,
            reason: validation.reason
          });
        }
      }
      
      if (validArtifacts.length === 0) {
        return {
          success: false,
          error: 'No valid artifacts to mint',
          rejected: rejectedArtifacts
        };
      }
      
      // Create new block with artifacts
      const newBlock = await this.createBlock(validArtifacts, miner);
      
      // Add block to chain
      this.blockchain.chain.push(newBlock);
      this.blockchain.lastBlockHash = newBlock.hash;
      
      // Clear pending artifacts that were minted
      this.blockchain.pendingArtifacts = this.blockchain.pendingArtifacts.filter(
        pending => !validArtifacts.some(minted => minted.id === pending.id)
      );
      
      this.log(`Successfully minted ${validArtifacts.length} artifacts in block ${newBlock.index}`, 'success');
      
      return {
        success: true,
        blockIndex: newBlock.index,
        blockHash: newBlock.hash,
        mintedCount: validArtifacts.length,
        rejected: rejectedArtifacts,
        timestamp: newBlock.timestamp
      };
    } catch (error) {
      this.log(`Minting failed: ${error.message}`, 'error');
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async validateArtifactForMinting(artifact) {
    // Check required fields
    if (!artifact.id) {
      return { valid: false, reason: 'Missing artifact ID' };
    }
    
    if (!artifact.contentHash) {
      return { valid: false, reason: 'Missing content hash' };
    }
    
    if (typeof artifact.weight !== 'number' || artifact.weight < 0 || artifact.weight > 1) {
      return { valid: false, reason: 'Invalid weight value' };
    }
    
    // Check for duplicates
    const existingArtifact = this.findExistingArtifact(artifact.id);
    if (existingArtifact) {
      return { valid: false, reason: 'Artifact already exists in blockchain' };
    }
    
    // Validate content hash if content is provided
    if (artifact.content) {
      const calculatedHash = crypto.createHash('sha256')
        .update(JSON.stringify(artifact.content))
        .digest('hex');
      
      if (calculatedHash !== artifact.contentHash) {
        return { valid: false, reason: 'Content hash mismatch' };
      }
    }
    
    return { valid: true };
  }

  async createBlock(artifacts, miner) {
    const previousBlock = this.blockchain.chain[this.blockchain.chain.length - 1];
    const blockIndex = this.blockchain.chain.length;
    
    // Prepare artifacts with metadata
    const processedArtifacts = artifacts.map(artifact => ({
      ...artifact,
      blockNumber: blockIndex,
      mintedAt: new Date().toISOString(),
      miner: miner
    }));
    
    // Calculate Merkle root
    const merkleRoot = this.calculateMerkleRoot(processedArtifacts);
    
    const block = {
      index: blockIndex,
      timestamp: new Date().toISOString(),
      artifacts: processedArtifacts,
      previousHash: previousBlock ? previousBlock.hash : '0',
      merkleRoot: merkleRoot,
      miner: miner,
      artifactCount: processedArtifacts.length
    };
    
    // Calculate block hash
    block.hash = this.calculateBlockHash(block);
    
    return block;
  }

  calculateMerkleRoot(artifacts) {
    if (artifacts.length === 0) {
      return crypto.createHash('sha256').update('').digest('hex');
    }
    
    if (artifacts.length === 1) {
      return crypto.createHash('sha256').update(artifacts[0].contentHash).digest('hex');
    }
    
    // Simple Merkle root calculation (concatenate and hash)
    const concatenated = artifacts.map(a => a.contentHash).join('');
    return crypto.createHash('sha256').update(concatenated).digest('hex');
  }

  calculateBlockHash(block) {
    const blockData = {
      index: block.index,
      timestamp: block.timestamp,
      artifacts: block.artifacts,
      previousHash: block.previousHash,
      merkleRoot: block.merkleRoot,
      miner: block.miner
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(blockData))
      .digest('hex');
  }

  findExistingArtifact(artifactId) {
    for (const block of this.blockchain.chain) {
      if (block.artifacts) {
        const found = block.artifacts.find(artifact => artifact.id === artifactId);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  async addToMintingQueue(artifact) {
    this.mintingQueue.push({
      artifact: artifact,
      queuedAt: new Date().toISOString()
    });
    
    this.log(`Added artifact ${artifact.id} to minting queue`, 'info');
  }

  async processMintingQueue(miner = 'system') {
    if (this.mintingQueue.length === 0) {
      return { success: true, message: 'No artifacts in queue' };
    }
    
    const artifacts = this.mintingQueue.map(item => item.artifact);
    const result = await this.mintArtifacts(artifacts, miner);
    
    if (result.success) {
      this.mintingQueue = [];
    }
    
    return result;
  }

  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      message: message
    };
    
    this.mintingLog.push(logEntry);
    console.log(`[MINTING ${level.toUpperCase()}] ${message}`);
  }

  getMintingLog() {
    return this.mintingLog;
  }

  getQueueStatus() {
    return {
      queueLength: this.mintingQueue.length,
      queuedArtifacts: this.mintingQueue.map(item => ({
        id: item.artifact.id,
        queuedAt: item.queuedAt
      }))
    };
  }
}

export default ArtifactMintingService;