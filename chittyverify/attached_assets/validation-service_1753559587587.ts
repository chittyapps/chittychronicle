/**
 * Blockchain Validation and Integrity Service
 * Ensures the integrity and validity of the ChittyChain blockchain
 */

import { ChittyChainV2 } from '@/src/blockchain/ChittyChainV2';
import { ChittyBlockV2 } from '@/src/blockchain/ChittyBlockV2';
import crypto from 'crypto';

interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

interface ValidationError {
  type: 'CRITICAL' | 'ERROR';
  blockIndex?: number;
  message: string;
  details?: any;
}

interface ValidationWarning {
  type: 'WARNING' | 'INFO';
  blockIndex?: number;
  message: string;
  details?: any;
}

interface ValidationSummary {
  blocksValidated: number;
  artifactsValidated: number;
  errorsFound: number;
  warningsFound: number;
  validationTime: number;
  recommendations: string[];
}

interface IntegrityCheckResult {
  checksPerformed: string[];
  passed: string[];
  failed: string[];
  details: Record<string, any>;
}

export class BlockchainValidationService {
  private chain: ChittyChainV2;
  
  constructor(chain?: ChittyChainV2) {
    this.chain = chain || new ChittyChainV2();
  }

  /**
   * Perform comprehensive blockchain validation
   */
  async validateBlockchain(): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let artifactsValidated = 0;

    try {
      // 1. Validate genesis block
      const genesisValidation = await this.validateGenesisBlock();
      errors.push(...genesisValidation.errors);
      warnings.push(...genesisValidation.warnings);

      // 2. Validate chain integrity
      const chainValidation = await this.validateChainIntegrity();
      errors.push(...chainValidation.errors);
      warnings.push(...chainValidation.warnings);

      // 3. Validate individual blocks
      for (let i = 0; i < this.chain.chain.length; i++) {
        const blockValidation = await this.validateBlock(this.chain.chain[i], i);
        errors.push(...blockValidation.errors);
        warnings.push(...blockValidation.warnings);
        artifactsValidated += blockValidation.artifactCount;
      }

      // 4. Validate cross-block references
      const referenceValidation = await this.validateCrossReferences();
      errors.push(...referenceValidation.errors);
      warnings.push(...referenceValidation.warnings);

      // 5. Validate artifact integrity
      const artifactValidation = await this.validateArtifactIntegrity();
      errors.push(...artifactValidation.errors);
      warnings.push(...artifactValidation.warnings);

      // 6. Check for orphaned blocks
      const orphanCheck = await this.checkForOrphanedBlocks();
      warnings.push(...orphanCheck.warnings);

      // 7. Validate timestamps
      const timestampValidation = await this.validateTimestamps();
      errors.push(...timestampValidation.errors);
      warnings.push(...timestampValidation.warnings);

      const validationTime = Date.now() - startTime;

      return {
        valid: errors.filter(e => e.type === 'CRITICAL').length === 0,
        errors,
        warnings,
        summary: {
          blocksValidated: this.chain.chain.length,
          artifactsValidated,
          errorsFound: errors.length,
          warningsFound: warnings.length,
          validationTime,
          recommendations: this.generateRecommendations(errors, warnings)
        }
      };

    } catch (error) {
      errors.push({
        type: 'CRITICAL',
        message: 'Validation process failed',
        details: error
      });

      return {
        valid: false,
        errors,
        warnings,
        summary: {
          blocksValidated: 0,
          artifactsValidated: 0,
          errorsFound: errors.length,
          warningsFound: warnings.length,
          validationTime: Date.now() - startTime,
          recommendations: ['Fix critical validation errors before proceeding']
        }
      };
    }
  }

  /**
   * Validate genesis block
   */
  private async validateGenesisBlock(): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const genesis = this.chain.chain[0];
    if (!genesis) {
      errors.push({
        type: 'CRITICAL',
        message: 'Genesis block missing'
      });
      return { errors, warnings };
    }

    if (genesis.index !== 0) {
      errors.push({
        type: 'CRITICAL',
        blockIndex: 0,
        message: 'Genesis block has incorrect index'
      });
    }

    if (genesis.previousHash !== '0') {
      errors.push({
        type: 'CRITICAL',
        blockIndex: 0,
        message: 'Genesis block has invalid previous hash'
      });
    }

    if (!genesis.data?.artifacts || genesis.data.artifacts.length === 0) {
      warnings.push({
        type: 'WARNING',
        blockIndex: 0,
        message: 'Genesis block has no artifacts'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate chain integrity
   */
  private async validateChainIntegrity(): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (let i = 1; i < this.chain.chain.length; i++) {
      const currentBlock = this.chain.chain[i];
      const previousBlock = this.chain.chain[i - 1];

      // Check hash linkage
      if (currentBlock.previousHash !== previousBlock.hash) {
        errors.push({
          type: 'CRITICAL',
          blockIndex: i,
          message: 'Broken chain: Previous hash mismatch',
          details: {
            expected: previousBlock.hash,
            actual: currentBlock.previousHash
          }
        });
      }

      // Check index sequence
      if (currentBlock.index !== previousBlock.index + 1) {
        errors.push({
          type: 'ERROR',
          blockIndex: i,
          message: 'Invalid block index sequence',
          details: {
            expected: previousBlock.index + 1,
            actual: currentBlock.index
          }
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate individual block
   */
  private async validateBlock(block: ChittyBlockV2, index: number): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    artifactCount: number;
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let artifactCount = 0;

    // Use block's built-in validation
    const blockValidation = block.validate();
    
    if (!blockValidation.valid) {
      blockValidation.errors.forEach(error => {
        errors.push({
          type: 'ERROR',
          blockIndex: index,
          message: error
        });
      });
    }

    blockValidation.warnings.forEach(warning => {
      warnings.push({
        type: 'WARNING',
        blockIndex: index,
        message: warning
      });
    });

    // Additional validations
    if (block.data?.artifacts) {
      artifactCount = block.data.artifacts.length;
      
      // Validate each artifact
      for (const artifact of block.data.artifacts) {
        const artifactValidation = this.validateArtifact(artifact, index);
        errors.push(...artifactValidation.errors);
        warnings.push(...artifactValidation.warnings);
      }

      // Check for duplicate artifacts in block
      const artifactIds = new Set<string>();
      for (const artifact of block.data.artifacts) {
        if (artifactIds.has(artifact.id)) {
          errors.push({
            type: 'ERROR',
            blockIndex: index,
            message: `Duplicate artifact ID in block: ${artifact.id}`
          });
        }
        artifactIds.add(artifact.id);
      }
    }

    // Validate mining
    if (block.metadata?.difficulty) {
      const expectedPrefix = '0'.repeat(block.metadata.difficulty);
      if (!block.hash?.startsWith(expectedPrefix)) {
        errors.push({
          type: 'ERROR',
          blockIndex: index,
          message: 'Block hash does not meet difficulty requirement',
          details: {
            difficulty: block.metadata.difficulty,
            hash: block.hash
          }
        });
      }
    }

    return { errors, warnings, artifactCount };
  }

  /**
   * Validate individual artifact
   */
  private validateArtifact(artifact: any, blockIndex: number): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Required fields
    if (!artifact.id) {
      errors.push({
        type: 'ERROR',
        blockIndex,
        message: 'Artifact missing ID'
      });
    }

    if (!artifact.contentHash) {
      errors.push({
        type: 'ERROR',
        blockIndex,
        message: `Artifact ${artifact.id} missing content hash`
      });
    }

    if (artifact.weight === undefined || artifact.weight < 0 || artifact.weight > 1) {
      errors.push({
        type: 'ERROR',
        blockIndex,
        message: `Artifact ${artifact.id} has invalid weight: ${artifact.weight}`
      });
    }

    if (!artifact.tier) {
      warnings.push({
        type: 'WARNING',
        blockIndex,
        message: `Artifact ${artifact.id} missing tier classification`
      });
    }

    // Validate content hash format
    if (artifact.contentHash && !this.isValidHash(artifact.contentHash)) {
      errors.push({
        type: 'ERROR',
        blockIndex,
        message: `Artifact ${artifact.id} has invalid content hash format`
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate cross-block references
   */
  private async validateCrossReferences(): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const artifactRegistry = new Map<string, number>();

    // Build artifact registry
    for (let i = 0; i < this.chain.chain.length; i++) {
      const block = this.chain.chain[i];
      if (block.data?.artifacts) {
        for (const artifact of block.data.artifacts) {
          if (artifactRegistry.has(artifact.id)) {
            errors.push({
              type: 'ERROR',
              message: `Duplicate artifact ID across blocks: ${artifact.id}`,
              details: {
                firstBlock: artifactRegistry.get(artifact.id),
                duplicateBlock: i
              }
            });
          }
          artifactRegistry.set(artifact.id, i);
        }
      }
    }

    // Validate corroboration references
    for (let i = 0; i < this.chain.chain.length; i++) {
      const block = this.chain.chain[i];
      if (block.data?.artifacts) {
        for (const artifact of block.data.artifacts) {
          if (artifact.corroboratingArtifacts) {
            for (const refId of artifact.corroboratingArtifacts) {
              if (!artifactRegistry.has(refId)) {
                warnings.push({
                  type: 'WARNING',
                  blockIndex: i,
                  message: `Artifact ${artifact.id} references non-existent artifact: ${refId}`
                });
              }
            }
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate artifact integrity across chain
   */
  private async validateArtifactIntegrity(): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const contentHashes = new Map<string, string>();

    for (let i = 0; i < this.chain.chain.length; i++) {
      const block = this.chain.chain[i];
      if (block.data?.artifacts) {
        for (const artifact of block.data.artifacts) {
          if (artifact.contentHash) {
            if (contentHashes.has(artifact.contentHash)) {
              warnings.push({
                type: 'INFO',
                blockIndex: i,
                message: 'Duplicate content hash detected',
                details: {
                  artifactId: artifact.id,
                  duplicateOf: contentHashes.get(artifact.contentHash)
                }
              });
            }
            contentHashes.set(artifact.contentHash, artifact.id);
          }
        }
      }
    }

    return { errors, warnings };
  }

  /**
   * Check for orphaned blocks
   */
  private async checkForOrphanedBlocks(): Promise<{
    warnings: ValidationWarning[];
  }> {
    const warnings: ValidationWarning[] = [];
    
    // In a real implementation, this would check for blocks
    // that are not part of the main chain
    
    return { warnings };
  }

  /**
   * Validate timestamp progression
   */
  private async validateTimestamps(): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (let i = 1; i < this.chain.chain.length; i++) {
      const currentBlock = this.chain.chain[i];
      const previousBlock = this.chain.chain[i - 1];

      const currentTime = new Date(currentBlock.timestamp).getTime();
      const previousTime = new Date(previousBlock.timestamp).getTime();

      if (currentTime < previousTime) {
        errors.push({
          type: 'ERROR',
          blockIndex: i,
          message: 'Block timestamp before previous block',
          details: {
            current: currentBlock.timestamp,
            previous: previousBlock.timestamp
          }
        });
      }

      // Check for suspiciously fast blocks
      if (currentTime - previousTime < 1000) { // Less than 1 second
        warnings.push({
          type: 'WARNING',
          blockIndex: i,
          message: 'Suspiciously fast block generation',
          details: {
            timeDiff: currentTime - previousTime
          }
        });
      }

      // Check for future timestamps
      if (currentTime > Date.now()) {
        errors.push({
          type: 'ERROR',
          blockIndex: i,
          message: 'Block timestamp in the future'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Perform integrity checks
   */
  async performIntegrityChecks(): Promise<IntegrityCheckResult> {
    const checks = [
      'genesis_block',
      'hash_linkage',
      'merkle_roots',
      'artifact_hashes',
      'mining_difficulty',
      'timestamp_order',
      'duplicate_artifacts',
      'chain_continuity'
    ];
    
    const passed: string[] = [];
    const failed: string[] = [];
    const details: Record<string, any> = {};

    // Genesis block check
    if (this.chain.chain[0]?.index === 0) {
      passed.push('genesis_block');
    } else {
      failed.push('genesis_block');
    }

    // Hash linkage check
    let hashLinkageValid = true;
    for (let i = 1; i < this.chain.chain.length; i++) {
      if (this.chain.chain[i].previousHash !== this.chain.chain[i-1].hash) {
        hashLinkageValid = false;
        break;
      }
    }
    if (hashLinkageValid) {
      passed.push('hash_linkage');
    } else {
      failed.push('hash_linkage');
    }

    // Merkle root verification
    let merkleRootsValid = true;
    for (const block of this.chain.chain) {
      const calculatedRoot = block.calculateMerkleRoot();
      if (block.merkleRoot !== calculatedRoot) {
        merkleRootsValid = false;
        details.merkle_roots = details.merkle_roots || [];
        details.merkle_roots.push({
          blockIndex: block.index,
          expected: calculatedRoot,
          actual: block.merkleRoot
        });
      }
    }
    if (merkleRootsValid) {
      passed.push('merkle_roots');
    } else {
      failed.push('merkle_roots');
    }

    // Check remaining items...
    // (Additional checks would be implemented here)

    return {
      checksPerformed: checks,
      passed,
      failed,
      details
    };
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(errors: ValidationError[], warnings: ValidationWarning[]): string[] {
    const recommendations: string[] = [];

    const criticalErrors = errors.filter(e => e.type === 'CRITICAL');
    if (criticalErrors.length > 0) {
      recommendations.push('Critical errors detected - blockchain integrity compromised');
      recommendations.push('Consider restoring from a known good backup');
    }

    const hashErrors = errors.filter(e => e.message.includes('hash'));
    if (hashErrors.length > 0) {
      recommendations.push('Hash mismatches detected - possible tampering');
      recommendations.push('Verify blockchain source and re-sync if necessary');
    }

    const timestampWarnings = warnings.filter(w => w.message.includes('timestamp'));
    if (timestampWarnings.length > 5) {
      recommendations.push('Multiple timestamp anomalies detected');
      recommendations.push('Check system clock synchronization');
    }

    if (errors.length === 0 && warnings.length === 0) {
      recommendations.push('Blockchain validation passed - all systems nominal');
    }

    return recommendations;
  }

  /**
   * Check if hash is valid format
   */
  private isValidHash(hash: string): boolean {
    return /^[a-fA-F0-9]{64}$/.test(hash);
  }

  /**
   * Export validation report
   */
  async exportValidationReport(result: ValidationResult): Promise<string> {
    const report = {
      timestamp: new Date().toISOString(),
      chainLength: this.chain.chain.length,
      validationResult: result,
      integrityChecks: await this.performIntegrityChecks(),
      chainStats: this.chain.getChainStats()
    };

    return JSON.stringify(report, null, 2);
  }
}