/**
 * ChittyChain V2 - Advanced Blockchain Implementation
 * Integrates with the comprehensive blockchain infrastructure
 */

export interface ChittyBlock {
  index: number;
  timestamp: string;
  previousHash: string;
  hash: string;
  data: any;
  nonce: number;
}

export interface MintingResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: string;
  message: string;
  minted: any[];
  rejected: any[];
  needsCorroboration: any[];
}

export interface ChainStats {
  totalBlocks: number;
  totalArtifacts: number;
  chainValid: boolean;
  latestBlockHash: string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class ChittyChainV2 {
  private chain: ChittyBlock[] = [];
  private difficulty = 2;

  constructor() {
    this.chain = [this.createGenesisBlock()];
  }

  private createGenesisBlock(): ChittyBlock {
    return {
      index: 0,
      timestamp: new Date().toISOString(),
      previousHash: '0',
      hash: this.calculateHash(0, new Date().toISOString(), '0', { message: 'Genesis Block' }, 0),
      data: { message: 'ChittyChain V2 Genesis Block - Evidence Ledger' },
      nonce: 0
    };
  }

  private calculateHash(index: number, timestamp: string, previousHash: string, data: any, nonce: number): string {
    const content = `${index}${timestamp}${previousHash}${JSON.stringify(data)}${nonce}`;
    // Simple hash function for demonstration
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private mineBlock(block: ChittyBlock): void {
    const target = '0'.repeat(this.difficulty);
    
    while (block.hash.substring(0, this.difficulty) !== target) {
      block.nonce++;
      block.hash = this.calculateHash(
        block.index,
        block.timestamp,
        block.previousHash,
        block.data,
        block.nonce
      );
    }
  }

  async mintArtifacts(artifacts: any[], minterAddress: string): Promise<MintingResult> {
    try {
      const lastBlock = this.chain[this.chain.length - 1];
      
      const newBlock: ChittyBlock = {
        index: lastBlock.index + 1,
        timestamp: new Date().toISOString(),
        previousHash: lastBlock.hash,
        hash: '',
        data: {
          artifacts,
          minter: minterAddress,
          type: 'EVIDENCE_MINTING'
        },
        nonce: 0
      };

      // Calculate initial hash
      newBlock.hash = this.calculateHash(
        newBlock.index,
        newBlock.timestamp,
        newBlock.previousHash,
        newBlock.data,
        newBlock.nonce
      );

      // Mine the block
      this.mineBlock(newBlock);

      // Add to chain
      this.chain.push(newBlock);

      return {
        success: true,
        transactionHash: newBlock.hash,
        blockNumber: newBlock.index.toString(),
        message: `Successfully minted ${artifacts.length} artifacts to block ${newBlock.index}`,
        minted: artifacts,
        rejected: [],
        needsCorroboration: []
      };
    } catch (error) {
      return {
        success: false,
        message: `Minting failed: ${error.message}`,
        minted: [],
        rejected: artifacts.map(artifact => ({ artifact, reason: error.message })),
        needsCorroboration: []
      };
    }
  }

  getChainStats(): ChainStats {
    let totalArtifacts = 0;
    
    for (const block of this.chain) {
      if (block.data?.artifacts) {
        totalArtifacts += block.data.artifacts.length;
      }
    }

    const validation = this.validateChain();

    return {
      totalBlocks: this.chain.length,
      totalArtifacts,
      chainValid: validation.valid,
      latestBlockHash: this.chain[this.chain.length - 1]?.hash || '0'
    };
  }

  validateChain(): ValidationResult {
    const errors: string[] = [];

    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];

      // Check if current block's hash is correct
      const calculatedHash = this.calculateHash(
        currentBlock.index,
        currentBlock.timestamp,
        currentBlock.previousHash,
        currentBlock.data,
        currentBlock.nonce
      );

      if (currentBlock.hash !== calculatedHash) {
        errors.push(`Block ${i} has invalid hash`);
      }

      // Check if previous hash matches
      if (currentBlock.previousHash !== previousBlock.hash) {
        errors.push(`Block ${i} has invalid previous hash`);
      }

      // Check if index is correct
      if (currentBlock.index !== previousBlock.index + 1) {
        errors.push(`Block ${i} has invalid index`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  getBlockByIndex(index: number): ChittyBlock | null {
    return this.chain[index] || null;
  }

  searchBlocks(filter: (block: ChittyBlock) => boolean): ChittyBlock[] {
    return this.chain.filter(filter);
  }

  exportChain(): ChittyBlock[] {
    return [...this.chain];
  }

  importChain(chain: ChittyBlock[]): boolean {
    // Validate imported chain
    const tempChain = this.chain;
    this.chain = chain;
    
    const validation = this.validateChain();
    
    if (!validation.valid) {
      this.chain = tempChain; // Restore original chain
      return false;
    }
    
    return true;
  }

  // Development and debugging methods
  getLastBlock(): ChittyBlock {
    return this.chain[this.chain.length - 1];
  }

  getChainLength(): number {
    return this.chain.length;
  }

  resetChain(): void {
    this.chain = [this.createGenesisBlock()];
  }
}