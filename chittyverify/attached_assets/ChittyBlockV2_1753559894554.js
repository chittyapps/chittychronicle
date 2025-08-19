import crypto from 'crypto';

/**
 * Enhanced ChittyBlock with improved validation and artifact tracking
 */
export class ChittyBlockV2 {
  constructor(index, timestamp, data, previousHash = '') {
    this.index = index;
    this.timestamp = timestamp;
    this.data = data;
    this.previousHash = previousHash;
    this.nonce = 0;
    this.version = 2;
    this.metadata = {
      miningDuration: 0,
      difficulty: 0,
      minerAddress: null,
      blockSize: 0
    };
    // Calculate merkle root before hash
    this.merkleRoot = this.calculateMerkleRoot();
    this.hash = this.calculateHash();
  }

  /**
   * Calculate block hash with enhanced security
   */
  calculateHash() {
    const dataToHash = 
      this.index +
      this.previousHash +
      this.timestamp +
      JSON.stringify(this.data) +
      this.nonce +
      (this.merkleRoot || '');

    return crypto
      .createHash('sha3-256')
      .update(dataToHash)
      .digest('hex');
  }

  /**
   * Calculate Merkle root for all artifacts in block
   */
  calculateMerkleRoot() {
    if (!this.data?.artifacts || this.data.artifacts.length === 0) {
      return crypto.createHash('sha3-256').update('empty').digest('hex');
    }

    // Create leaf nodes from artifacts
    const leaves = this.data.artifacts.map(artifact => {
      const leafData = {
        id: artifact.id,
        contentHash: artifact.contentHash,
        weight: artifact.weight,
        timestamp: artifact.timestamp,
        caseId: artifact.caseId
      };
      return crypto.createHash('sha3-256').update(JSON.stringify(leafData)).digest('hex');
    });

    return this.buildMerkleTree(leaves);
  }

  /**
   * Build Merkle tree recursively
   */
  buildMerkleTree(leaves) {
    if (leaves.length === 0) return null;
    if (leaves.length === 1) return leaves[0];

    const newLevel = [];
    
    // Process pairs of leaves
    for (let i = 0; i < leaves.length; i += 2) {
      const left = leaves[i];
      const right = leaves[i + 1] || left; // Duplicate last leaf if odd number
      
      const combined = crypto
        .createHash('sha3-256')
        .update(left + right)
        .digest('hex');
      
      newLevel.push(combined);
    }

    return this.buildMerkleTree(newLevel);
  }

  /**
   * Mine block with proof of work
   */
  async mineBlock(difficulty) {
    const startTime = Date.now();
    const target = '0'.repeat(difficulty);
    
    this.merkleRoot = this.calculateMerkleRoot();
    this.metadata.difficulty = difficulty;

    while (!this.hash || !this.hash.startsWith(target)) {
      this.nonce++;
      this.hash = this.calculateHash();
      
      // Add mining progress callback every 100000 iterations
      if (this.nonce % 100000 === 0) {
        console.log(`Mining... Nonce: ${this.nonce}`);
      }
    }

    this.metadata.miningDuration = Date.now() - startTime;
    this.metadata.blockSize = JSON.stringify(this.data).length;
    
    console.log(`Block mined in ${this.metadata.miningDuration}ms with nonce ${this.nonce}`);
    return this.hash;
  }

  /**
   * Comprehensive block validation
   */
  validate() {
    const errors = [];
    const warnings = [];

    // Structure validation
    if (this.index === undefined || this.index < 0) {
      errors.push('Invalid block index');
    }

    if (!this.timestamp || this.timestamp <= 0) {
      errors.push('Invalid timestamp');
    }

    if (!this.hash) {
      errors.push('Missing block hash');
    }

    if (this.previousHash === undefined) {
      errors.push('Missing previous hash');
    }

    if (!this.data || typeof this.data !== 'object') {
      errors.push('Invalid block data');
    }

    // Hash validation
    if (this.hash && this.hash !== this.calculateHash()) {
      errors.push('Block hash mismatch - block has been tampered with');
    }

    // Merkle root validation
    const calculatedMerkleRoot = this.calculateMerkleRoot();
    if (this.merkleRoot !== calculatedMerkleRoot) {
      errors.push('Merkle root mismatch - artifacts have been tampered with');
    }

    // Data validation - support both artifacts and facts
    const items = this.data?.artifacts || this.data?.facts;
    if (items && Array.isArray(items)) {
      items.forEach((item, idx) => {
        if (!item.id) {
          errors.push(`Item ${idx} missing ID`);
        }
        if (!item.contentHash && !item.hash) {
          errors.push(`Item ${idx} missing content hash`);
        }
        if (item.weight === undefined || item.weight < 0 || item.weight > 1) {
          errors.push(`Item ${idx} has invalid weight`);
        }
        if (!item.timestamp && !item.mintedAt) {
          warnings.push(`Item ${idx} missing timestamp`);
        }
      });
    } else if (this.index > 0) {
      // Non-genesis blocks should have artifacts
      warnings.push('Block has no artifacts/facts');
    }

    // Timestamp validation
    const blockTime = new Date(this.timestamp).getTime();
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    
    if (blockTime > now) {
      errors.push('Block timestamp is in the future');
    }
    
    if (blockTime < oneHourAgo && this.index > 0) {
      warnings.push('Block timestamp is more than 1 hour old');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      summary: {
        totalArtifacts: this.data?.artifacts?.length || 0,
        blockSize: this.metadata.blockSize || 0,
        miningDuration: this.metadata.miningDuration || 0
      }
    };
  }

  /**
   * Get artifact by ID
   */
  getArtifact(artifactId) {
    if (!this.data?.artifacts) return null;
    return this.data.artifacts.find(a => a.id === artifactId);
  }

  /**
   * Generate proof of inclusion for an artifact
   */
  generateMerkleProof(artifactId) {
    const artifact = this.getArtifact(artifactId);
    if (!artifact) return null;

    const artifacts = this.data.artifacts;
    const artifactIndex = artifacts.findIndex(a => a.id === artifactId);
    
    // Generate the proof path
    const proof = [];
    let currentIndex = artifactIndex;
    let level = artifacts.map(a => 
      crypto.createHash('sha3-256').update(JSON.stringify({
        id: a.id,
        contentHash: a.contentHash,
        weight: a.weight,
        timestamp: a.timestamp,
        caseId: a.caseId
      })).digest('hex')
    );

    while (level.length > 1) {
      const newLevel = [];
      const proofElement = {};
      
      for (let i = 0; i < level.length; i += 2) {
        const left = level[i];
        const right = level[i + 1] || left;
        
        if (i === currentIndex || i + 1 === currentIndex) {
          proofElement.hash = i === currentIndex ? right : left;
          proofElement.position = i === currentIndex ? 'right' : 'left';
          proof.push({...proofElement});
          currentIndex = Math.floor(currentIndex / 2);
        }
        
        newLevel.push(
          crypto.createHash('sha3-256').update(left + right).digest('hex')
        );
      }
      
      level = newLevel;
    }

    return {
      artifactId,
      proof,
      merkleRoot: this.merkleRoot,
      blockHash: this.hash
    };
  }

  /**
   * Export block data for storage
   */
  toJSON() {
    return {
      index: this.index,
      timestamp: this.timestamp,
      version: this.version,
      hash: this.hash,
      previousHash: this.previousHash,
      merkleRoot: this.merkleRoot,
      nonce: this.nonce,
      data: this.data,
      metadata: this.metadata
    };
  }

  /**
   * Import block from JSON
   */
  static fromJSON(json) {
    const block = new ChittyBlockV2(
      json.index,
      json.timestamp,
      json.data,
      json.previousHash
    );
    
    block.hash = json.hash;
    block.merkleRoot = json.merkleRoot;
    block.nonce = json.nonce;
    block.version = json.version || 2;
    block.metadata = json.metadata || {};
    
    return block;
  }
}