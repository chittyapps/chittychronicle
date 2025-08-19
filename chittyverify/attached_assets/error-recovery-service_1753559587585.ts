/**
 * Blockchain Error Handling and Recovery Service
 * Handles errors, recovery, and chain repair operations
 */

import { ChittyChainV2 } from '@/src/blockchain/ChittyChainV2';
import { ChittyBlockV2 } from '@/src/blockchain/ChittyBlockV2';
import { BlockchainValidationService } from './validation-service';
import fs from 'fs/promises';
import path from 'path';

interface RecoveryOptions {
  backupPath?: string;
  autoBackup?: boolean;
  maxBackups?: number;
  recoveryMode?: 'SAFE' | 'AGGRESSIVE' | 'REBUILD';
}

interface RecoveryResult {
  success: boolean;
  recovered: boolean;
  repaired: number;
  removed: number;
  message: string;
  details?: any;
}

interface BackupMetadata {
  version: string;
  timestamp: string;
  blockCount: number;
  artifactCount: number;
  checksum: string;
}

export class BlockchainRecoveryService {
  private chain: ChittyChainV2;
  private validationService: BlockchainValidationService;
  private backupPath: string;
  private maxBackups: number;
  
  constructor(chain: ChittyChainV2, options: RecoveryOptions = {}) {
    this.chain = chain;
    this.validationService = new BlockchainValidationService(chain);
    this.backupPath = options.backupPath || './blockchain-backups';
    this.maxBackups = options.maxBackups || 10;
  }

  /**
   * Handle blockchain errors with recovery attempts
   */
  async handleError(error: Error, context: string): Promise<RecoveryResult> {
    console.error(`Blockchain error in ${context}:`, error);
    
    try {
      // Classify error
      const errorType = this.classifyError(error);
      
      switch (errorType) {
        case 'CORRUPTION':
          return await this.handleCorruption();
          
        case 'MISSING_BLOCK':
          return await this.handleMissingBlock(error);
          
        case 'HASH_MISMATCH':
          return await this.handleHashMismatch(error);
          
        case 'INVALID_ARTIFACT':
          return await this.handleInvalidArtifact(error);
          
        case 'NETWORK_ERROR':
          return await this.handleNetworkError(error);
          
        case 'STORAGE_ERROR':
          return await this.handleStorageError(error);
          
        default:
          return await this.handleUnknownError(error);
      }
    } catch (recoveryError) {
      console.error('Recovery failed:', recoveryError);
      return {
        success: false,
        recovered: false,
        repaired: 0,
        removed: 0,
        message: 'Recovery failed: ' + recoveryError.message
      };
    }
  }

  /**
   * Classify error type for appropriate recovery
   */
  private classifyError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('corrupt') || message.includes('invalid block')) {
      return 'CORRUPTION';
    }
    if (message.includes('missing block') || message.includes('not found')) {
      return 'MISSING_BLOCK';
    }
    if (message.includes('hash') && message.includes('mismatch')) {
      return 'HASH_MISMATCH';
    }
    if (message.includes('artifact') && message.includes('invalid')) {
      return 'INVALID_ARTIFACT';
    }
    if (message.includes('network') || message.includes('timeout')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('storage') || message.includes('disk')) {
      return 'STORAGE_ERROR';
    }
    
    return 'UNKNOWN';
  }

  /**
   * Handle blockchain corruption
   */
  private async handleCorruption(): Promise<RecoveryResult> {
    console.log('Handling blockchain corruption...');
    
    // 1. Try to identify corrupted blocks
    const validation = await this.validationService.validateBlockchain();
    const corruptedBlocks = validation.errors
      .filter(e => e.type === 'CRITICAL' && e.blockIndex !== undefined)
      .map(e => e.blockIndex);
    
    if (corruptedBlocks.length === 0) {
      return {
        success: true,
        recovered: false,
        repaired: 0,
        removed: 0,
        message: 'No corruption detected after validation'
      };
    }
    
    // 2. Try to repair corrupted blocks
    let repaired = 0;
    for (const blockIndex of corruptedBlocks) {
      if (await this.repairBlock(blockIndex)) {
        repaired++;
      }
    }
    
    if (repaired === corruptedBlocks.length) {
      return {
        success: true,
        recovered: true,
        repaired,
        removed: 0,
        message: `Successfully repaired ${repaired} corrupted blocks`
      };
    }
    
    // 3. If repair failed, try recovery from backup
    const backupResult = await this.recoverFromBackup();
    if (backupResult.success) {
      return backupResult;
    }
    
    // 4. Last resort: Remove corrupted blocks
    const removed = await this.removeCorruptedBlocks(corruptedBlocks);
    
    return {
      success: removed > 0,
      recovered: false,
      repaired,
      removed,
      message: `Removed ${removed} corrupted blocks, repaired ${repaired}`
    };
  }

  /**
   * Handle missing block error
   */
  private async handleMissingBlock(error: Error): Promise<RecoveryResult> {
    // Extract block index from error
    const match = error.message.match(/block (\d+)/i);
    const blockIndex = match ? parseInt(match[1]) : -1;
    
    if (blockIndex >= 0) {
      // Try to recover specific block from backup
      const recovered = await this.recoverBlock(blockIndex);
      if (recovered) {
        return {
          success: true,
          recovered: true,
          repaired: 0,
          removed: 0,
          message: `Recovered missing block ${blockIndex}`
        };
      }
    }
    
    // If specific recovery failed, try full recovery
    return await this.recoverFromBackup();
  }

  /**
   * Handle hash mismatch error
   */
  private async handleHashMismatch(error: Error): Promise<RecoveryResult> {
    console.log('Handling hash mismatch...');
    
    // Re-calculate all block hashes
    let fixed = 0;
    for (let i = 1; i < this.chain.chain.length; i++) {
      const block = this.chain.chain[i];
      const calculatedHash = block.calculateHash();
      
      if (block.hash !== calculatedHash) {
        // Recalculate and update
        block.hash = calculatedHash;
        fixed++;
      }
      
      // Fix previous hash references
      if (i < this.chain.chain.length - 1) {
        this.chain.chain[i + 1].previousHash = block.hash;
      }
    }
    
    return {
      success: true,
      recovered: false,
      repaired: fixed,
      removed: 0,
      message: `Fixed ${fixed} hash mismatches`
    };
  }

  /**
   * Handle invalid artifact error
   */
  private async handleInvalidArtifact(error: Error): Promise<RecoveryResult> {
    console.log('Handling invalid artifact...');
    
    let removed = 0;
    let repaired = 0;
    
    for (const block of this.chain.chain) {
      if (!block.data?.artifacts) continue;
      
      const validArtifacts = [];
      for (const artifact of block.data.artifacts) {
        // Try to repair artifact
        if (this.canRepairArtifact(artifact)) {
          const repaired = this.repairArtifact(artifact);
          validArtifacts.push(repaired);
          repaired++;
        } else if (this.isValidArtifact(artifact)) {
          validArtifacts.push(artifact);
        } else {
          removed++;
        }
      }
      
      block.data.artifacts = validArtifacts;
      // Recalculate merkle root after artifact changes
      block.merkleRoot = block.calculateMerkleRoot();
      block.hash = block.calculateHash();
    }
    
    return {
      success: true,
      recovered: false,
      repaired,
      removed,
      message: `Repaired ${repaired} artifacts, removed ${removed} invalid artifacts`
    };
  }

  /**
   * Handle network error
   */
  private async handleNetworkError(error: Error): Promise<RecoveryResult> {
    console.log('Handling network error...');
    
    // For network errors, we typically just retry
    return {
      success: false,
      recovered: false,
      repaired: 0,
      removed: 0,
      message: 'Network error - please check connection and retry'
    };
  }

  /**
   * Handle storage error
   */
  private async handleStorageError(error: Error): Promise<RecoveryResult> {
    console.log('Handling storage error...');
    
    // Try to save to alternative location
    try {
      const altPath = path.join(this.backupPath, 'emergency-backup.json');
      await this.createBackup(altPath);
      
      return {
        success: true,
        recovered: false,
        repaired: 0,
        removed: 0,
        message: `Emergency backup created at ${altPath}`
      };
    } catch (backupError) {
      return {
        success: false,
        recovered: false,
        repaired: 0,
        removed: 0,
        message: 'Storage error - unable to create backup'
      };
    }
  }

  /**
   * Handle unknown error
   */
  private async handleUnknownError(error: Error): Promise<RecoveryResult> {
    console.log('Handling unknown error...');
    
    // Run validation to identify issues
    const validation = await this.validationService.validateBlockchain();
    
    if (validation.valid) {
      return {
        success: true,
        recovered: false,
        repaired: 0,
        removed: 0,
        message: 'Blockchain validated successfully despite error'
      };
    }
    
    // Try general recovery
    return await this.recoverFromBackup();
  }

  /**
   * Repair a specific block
   */
  private async repairBlock(blockIndex: number): Promise<boolean> {
    if (blockIndex < 0 || blockIndex >= this.chain.chain.length) {
      return false;
    }
    
    const block = this.chain.chain[blockIndex];
    
    try {
      // Recalculate merkle root
      block.merkleRoot = block.calculateMerkleRoot();
      
      // Fix previous hash
      if (blockIndex > 0) {
        block.previousHash = this.chain.chain[blockIndex - 1].hash;
      }
      
      // Recalculate hash
      block.hash = block.calculateHash();
      
      // Fix next block's previous hash
      if (blockIndex < this.chain.chain.length - 1) {
        this.chain.chain[blockIndex + 1].previousHash = block.hash;
      }
      
      return true;
    } catch (error) {
      console.error(`Failed to repair block ${blockIndex}:`, error);
      return false;
    }
  }

  /**
   * Remove corrupted blocks
   */
  private async removeCorruptedBlocks(blockIndices: number[]): Promise<number> {
    // Sort in descending order to remove from end first
    const sorted = blockIndices.sort((a, b) => b - a);
    let removed = 0;
    
    for (const index of sorted) {
      if (index > 0 && index === this.chain.chain.length - 1) {
        // Safe to remove last block
        this.chain.chain.pop();
        removed++;
      }
    }
    
    return removed;
  }

  /**
   * Check if artifact can be repaired
   */
  private canRepairArtifact(artifact: any): boolean {
    // Missing required fields that can be reconstructed
    if (!artifact.id && artifact.contentHash) return true;
    if (artifact.weight === undefined && artifact.tier) return true;
    if (!artifact.timestamp) return true;
    
    return false;
  }

  /**
   * Repair artifact
   */
  private repairArtifact(artifact: any): any {
    const repaired = { ...artifact };
    
    // Generate ID if missing
    if (!repaired.id && repaired.contentHash) {
      repaired.id = `ART_${repaired.contentHash.substring(0, 12).toUpperCase()}_REPAIRED`;
    }
    
    // Set default weight based on tier
    if (repaired.weight === undefined) {
      const tierWeights = {
        'GOVERNMENT': 0.9,
        'FINANCIAL': 0.8,
        'THIRD_PARTY': 0.6,
        'PERSONAL': 0.4
      };
      repaired.weight = tierWeights[repaired.tier] || 0.5;
    }
    
    // Set timestamp if missing
    if (!repaired.timestamp) {
      repaired.timestamp = new Date().toISOString();
    }
    
    return repaired;
  }

  /**
   * Validate artifact
   */
  private isValidArtifact(artifact: any): boolean {
    return !!(
      artifact.id &&
      artifact.contentHash &&
      artifact.weight !== undefined &&
      artifact.weight >= 0 &&
      artifact.weight <= 1
    );
  }

  /**
   * Recover from backup
   */
  async recoverFromBackup(): Promise<RecoveryResult> {
    try {
      const backups = await this.listBackups();
      if (backups.length === 0) {
        return {
          success: false,
          recovered: false,
          repaired: 0,
          removed: 0,
          message: 'No backups available for recovery'
        };
      }
      
      // Try latest backup first
      for (const backup of backups) {
        try {
          const restored = await this.restoreBackup(backup.path);
          if (restored) {
            return {
              success: true,
              recovered: true,
              repaired: 0,
              removed: 0,
              message: `Recovered from backup: ${backup.metadata.timestamp}`,
              details: backup.metadata
            };
          }
        } catch (error) {
          console.error(`Failed to restore backup ${backup.path}:`, error);
        }
      }
      
      return {
        success: false,
        recovered: false,
        repaired: 0,
        removed: 0,
        message: 'All backup restoration attempts failed'
      };
      
    } catch (error) {
      return {
        success: false,
        recovered: false,
        repaired: 0,
        removed: 0,
        message: 'Backup recovery failed: ' + error.message
      };
    }
  }

  /**
   * Recover specific block from backup
   */
  private async recoverBlock(blockIndex: number): Promise<boolean> {
    try {
      const backups = await this.listBackups();
      
      for (const backup of backups) {
        const data = await fs.readFile(backup.path, 'utf-8');
        const backupData = JSON.parse(data);
        
        if (backupData.chain && backupData.chain[blockIndex]) {
          const block = ChittyBlockV2.fromJSON(backupData.chain[blockIndex]);
          this.chain.chain[blockIndex] = block;
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Block recovery failed:', error);
      return false;
    }
  }

  /**
   * Create backup
   */
  async createBackup(customPath?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `blockchain-backup-${timestamp}.json`;
    const backupFilePath = customPath || path.join(this.backupPath, filename);
    
    // Ensure backup directory exists
    await fs.mkdir(path.dirname(backupFilePath), { recursive: true });
    
    // Create backup data
    const backupData = {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      metadata: await this.generateBackupMetadata(),
      chain: this.chain.exportChain()
    };
    
    // Write backup
    await fs.writeFile(backupFilePath, JSON.stringify(backupData, null, 2));
    
    // Cleanup old backups
    await this.cleanupOldBackups();
    
    return backupFilePath;
  }

  /**
   * Generate backup metadata
   */
  private async generateBackupMetadata(): Promise<BackupMetadata> {
    const stats = this.chain.getChainStats();
    const chainData = JSON.stringify(this.chain.chain);
    
    return {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      blockCount: stats.totalBlocks,
      artifactCount: stats.totalArtifacts,
      checksum: require('crypto').createHash('sha256').update(chainData).digest('hex')
    };
  }

  /**
   * List available backups
   */
  private async listBackups(): Promise<Array<{
    path: string;
    metadata: BackupMetadata;
  }>> {
    try {
      const files = await fs.readdir(this.backupPath);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.json') && file.includes('backup')) {
          const filePath = path.join(this.backupPath, file);
          try {
            const data = await fs.readFile(filePath, 'utf-8');
            const parsed = JSON.parse(data);
            if (parsed.metadata) {
              backups.push({
                path: filePath,
                metadata: parsed.metadata
              });
            }
          } catch (error) {
            console.error(`Invalid backup file ${file}:`, error);
          }
        }
      }
      
      // Sort by timestamp (newest first)
      return backups.sort((a, b) => 
        new Date(b.metadata.timestamp).getTime() - 
        new Date(a.metadata.timestamp).getTime()
      );
      
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Restore from backup
   */
  private async restoreBackup(backupPath: string): Promise<boolean> {
    try {
      const data = await fs.readFile(backupPath, 'utf-8');
      const backupData = JSON.parse(data);
      
      // Validate backup
      if (!backupData.chain || !backupData.metadata) {
        throw new Error('Invalid backup format');
      }
      
      // Import chain
      this.chain = ChittyChainV2.importChain(backupData.chain);
      
      // Validate restored chain
      const validation = await this.validationService.validateBlockchain();
      
      return validation.valid;
    } catch (error) {
      console.error('Backup restoration failed:', error);
      return false;
    }
  }

  /**
   * Cleanup old backups
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups();
      
      if (backups.length > this.maxBackups) {
        // Remove oldest backups
        const toRemove = backups.slice(this.maxBackups);
        
        for (const backup of toRemove) {
          await fs.unlink(backup.path);
          console.log(`Removed old backup: ${backup.path}`);
        }
      }
    } catch (error) {
      console.error('Backup cleanup failed:', error);
    }
  }

  /**
   * Create recovery checkpoint
   */
  async createCheckpoint(label: string): Promise<string> {
    const filename = `checkpoint-${label}-${Date.now()}.json`;
    return await this.createBackup(path.join(this.backupPath, 'checkpoints', filename));
  }

  /**
   * Auto-recovery with multiple strategies
   */
  async autoRecover(): Promise<RecoveryResult> {
    console.log('Starting auto-recovery process...');
    
    // 1. Validate current state
    const validation = await this.validationService.validateBlockchain();
    
    if (validation.valid) {
      return {
        success: true,
        recovered: false,
        repaired: 0,
        removed: 0,
        message: 'Blockchain is valid, no recovery needed'
      };
    }
    
    // 2. Try safe recovery first
    let result = await this.safeRecovery(validation);
    if (result.success) return result;
    
    // 3. Try aggressive recovery
    result = await this.aggressiveRecovery(validation);
    if (result.success) return result;
    
    // 4. Last resort: rebuild from artifacts
    return await this.rebuildFromArtifacts();
  }

  /**
   * Safe recovery - minimal changes
   */
  private async safeRecovery(validation: any): Promise<RecoveryResult> {
    let repaired = 0;
    
    // Fix hash mismatches only
    for (const error of validation.errors) {
      if (error.message.includes('hash') && error.blockIndex !== undefined) {
        if (await this.repairBlock(error.blockIndex)) {
          repaired++;
        }
      }
    }
    
    return {
      success: repaired > 0,
      recovered: false,
      repaired,
      removed: 0,
      message: `Safe recovery: repaired ${repaired} blocks`
    };
  }

  /**
   * Aggressive recovery - remove problematic blocks
   */
  private async aggressiveRecovery(validation: any): Promise<RecoveryResult> {
    const problematicBlocks = validation.errors
      .filter(e => e.type === 'CRITICAL' && e.blockIndex !== undefined)
      .map(e => e.blockIndex);
    
    const removed = await this.removeCorruptedBlocks(problematicBlocks);
    
    return {
      success: removed > 0,
      recovered: false,
      repaired: 0,
      removed,
      message: `Aggressive recovery: removed ${removed} blocks`
    };
  }

  /**
   * Rebuild blockchain from artifacts
   */
  private async rebuildFromArtifacts(): Promise<RecoveryResult> {
    console.log('Rebuilding blockchain from artifacts...');
    
    // Extract all valid artifacts
    const artifacts = [];
    for (const block of this.chain.chain) {
      if (block.data?.artifacts) {
        artifacts.push(...block.data.artifacts.filter(a => this.isValidArtifact(a)));
      }
    }
    
    // Create new chain
    const newChain = new ChittyChainV2();
    
    // Re-mint artifacts in batches
    const batchSize = 10;
    for (let i = 0; i < artifacts.length; i += batchSize) {
      const batch = artifacts.slice(i, i + batchSize);
      await newChain.mintArtifacts(batch, 'RECOVERY_SYSTEM');
    }
    
    // Replace old chain
    this.chain = newChain;
    
    return {
      success: true,
      recovered: true,
      repaired: 0,
      removed: 0,
      message: `Rebuilt blockchain with ${artifacts.length} artifacts`,
      details: {
        originalBlocks: this.chain.chain.length,
        newBlocks: newChain.chain.length,
        artifactsRecovered: artifacts.length
      }
    };
  }
}