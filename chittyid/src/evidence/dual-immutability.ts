/**
 * ChittyID Dual Immutability System
 * Stage 1: Off-chain freeze (DB snapshot + hash)
 * Stage 2: On-chain mint (blockchain anchor)
 */

import { Pool } from 'pg';
import { createHash } from 'crypto';
import { ethers } from 'ethers';
import { ulid } from 'ulid';

export interface FreezeRequest {
  entityType: 'identity' | 'evidence' | 'claim';
  entityId: string;
  requestedBy: string;
  metadata?: Record<string, any>;
}

export interface FreezeResult {
  freezeId: string;
  entityId: string;
  freezeHash: string;
  freezeTimestamp: Date;
  witnessData: WitnessData;
  eligibleForMint: boolean;
  minMintDate: Date;
}

export interface WitnessData {
  dataHash: string;
  metadataHash: string;
  relationships: string[];
  verifications: string[];
  combinedHash: string;
}

export interface MintRequest {
  freezeId: string;
  requestedBy: string;
  gasPrice?: bigint;
  priority?: 'low' | 'medium' | 'high';
}

export interface MintResult {
  mintId: string;
  freezeId: string;
  transactionHash: string;
  blockNumber: number;
  blockTimestamp: Date;
  gasUsed: bigint;
  contractAddress: string;
}

export interface ImmutabilityStatus {
  entityId: string;
  entityType: string;
  currentStage: 'mutable' | 'frozen_offchain' | 'minting' | 'minted_onchain';
  freezeData?: {
    freezeId: string;
    freezeHash: string;
    freezeTimestamp: Date;
    eligibleForMintAt: Date;
  };
  mintData?: {
    mintId: string;
    transactionHash: string;
    blockNumber: number;
    blockTimestamp: Date;
  };
  canFreeze: boolean;
  canMint: boolean;
  freezeBlockers: string[];
  mintBlockers: string[];
}

// Configuration
const REQUIRED_OFFCHAIN_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MIN_TRUST_LEVEL_FOR_FREEZE = 2;
const MIN_TRUST_LEVEL_FOR_MINT = 3;

export class DualImmutabilitySystem {
  private provider: ethers.Provider;
  private signer: ethers.Wallet;
  private contractAddress: string;
  private contract: ethers.Contract;

  constructor(
    private pool: Pool,
    providerUrl: string,
    privateKey: string,
    contractAddress: string
  ) {
    this.provider = new ethers.JsonRpcProvider(providerUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.contractAddress = contractAddress;
    
    // Initialize contract interface
    const abi = [
      'function mintEvidence(bytes32 freezeHash, string memory entityId, uint256 entityType) public returns (uint256)',
      'function getEvidence(bytes32 freezeHash) public view returns (uint256 blockNumber, uint256 timestamp, address minter)',
      'event EvidenceMinted(bytes32 indexed freezeHash, string entityId, uint256 entityType, uint256 tokenId)'
    ];
    
    this.contract = new ethers.Contract(contractAddress, abi, this.signer);
  }

  /**
   * Stage 1: Freeze entity off-chain
   */
  async freezeEntity(request: FreezeRequest): Promise<FreezeResult> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if entity exists and is mutable
      const status = await this.getImmutabilityStatus(request.entityId, request.entityType);
      
      if (!status.canFreeze) {
        throw new Error(`Cannot freeze: ${status.freezeBlockers.join(', ')}`);
      }
      
      // Gather all data for freeze
      const freezeData = await this.gatherFreezeData(
        client,
        request.entityId,
        request.entityType
      );
      
      // Generate witness data and hashes
      const witnessData = this.generateWitnessData(freezeData);
      const freezeHash = witnessData.combinedHash;
      
      // Create freeze record
      const freezeId = ulid();
      const freezeTimestamp = new Date();
      const minMintDate = new Date(freezeTimestamp.getTime() + REQUIRED_OFFCHAIN_DURATION_MS);
      
      await client.query(`
        INSERT INTO freeze_records (
          id, entity_type, entity_id, freeze_hash, 
          witness_data, freeze_timestamp, min_mint_date,
          requested_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        freezeId,
        request.entityType,
        request.entityId,
        freezeHash,
        JSON.stringify(witnessData),
        freezeTimestamp,
        minMintDate,
        request.requestedBy,
        JSON.stringify(request.metadata || {})
      ]);
      
      // Update entity freeze status
      await this.updateEntityFreezeStatus(
        client,
        request.entityId,
        request.entityType,
        'frozen_offchain',
        freezeHash
      );
      
      // Log freeze event
      await client.query(`
        INSERT INTO audit (
          actor_sub, action, target, target_type, meta
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        request.requestedBy,
        `${request.entityType}_frozen_offchain`,
        request.entityId,
        request.entityType,
        { freezeId, freezeHash, witnessData }
      ]);
      
      await client.query('COMMIT');
      
      return {
        freezeId,
        entityId: request.entityId,
        freezeHash,
        freezeTimestamp,
        witnessData,
        eligibleForMint: false, // Must wait 7 days
        minMintDate
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Stage 2: Mint frozen entity on-chain
   */
  async mintEntity(request: MintRequest): Promise<MintResult> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Get freeze record
      const freezeResult = await client.query(`
        SELECT * FROM freeze_records WHERE id = $1
      `, [request.freezeId]);
      
      if (freezeResult.rows.length === 0) {
        throw new Error('Freeze record not found');
      }
      
      const freeze = freezeResult.rows[0];
      
      // Check if eligible for mint
      const now = new Date();
      if (now < new Date(freeze.min_mint_date)) {
        const waitTime = new Date(freeze.min_mint_date).getTime() - now.getTime();
        const waitDays = Math.ceil(waitTime / (24 * 60 * 60 * 1000));
        throw new Error(`Must wait ${waitDays} more days before minting`);
      }
      
      // Check if already minted
      if (freeze.mint_id) {
        throw new Error('Already minted on-chain');
      }
      
      // Update status to minting
      await this.updateEntityFreezeStatus(
        client,
        freeze.entity_id,
        freeze.entity_type,
        'minting',
        freeze.freeze_hash
      );
      
      // Prepare blockchain transaction
      const entityTypeCode = this.getEntityTypeCode(freeze.entity_type);
      const freezeHashBytes = '0x' + freeze.freeze_hash;
      
      // Estimate gas
      const gasEstimate = await this.contract.mintEvidence.estimateGas(
        freezeHashBytes,
        freeze.entity_id,
        entityTypeCode
      );
      
      // Set gas price based on priority
      const gasPrice = request.gasPrice || await this.getGasPrice(request.priority);
      
      // Send transaction
      const tx = await this.contract.mintEvidence(
        freezeHashBytes,
        freeze.entity_id,
        entityTypeCode,
        {
          gasLimit: gasEstimate * 120n / 100n, // 20% buffer
          gasPrice
        }
      );
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (!receipt.status) {
        throw new Error('Transaction failed');
      }
      
      // Create mint record
      const mintId = ulid();
      const blockTimestamp = new Date(receipt.blockTimestamp * 1000);
      
      await client.query(`
        INSERT INTO mint_records (
          id, freeze_id, transaction_hash, block_number,
          block_timestamp, gas_used, contract_address,
          requested_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        mintId,
        request.freezeId,
        receipt.transactionHash,
        receipt.blockNumber,
        blockTimestamp,
        receipt.gasUsed.toString(),
        this.contractAddress,
        request.requestedBy
      ]);
      
      // Update freeze record with mint ID
      await client.query(`
        UPDATE freeze_records 
        SET mint_id = $1, minted_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `, [mintId, request.freezeId]);
      
      // Update entity status to minted
      await this.updateEntityMintStatus(
        client,
        freeze.entity_id,
        freeze.entity_type,
        receipt.transactionHash,
        receipt.blockNumber
      );
      
      // Log mint event
      await client.query(`
        INSERT INTO audit (
          actor_sub, action, target, target_type, meta
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        request.requestedBy,
        `${freeze.entity_type}_minted_onchain`,
        freeze.entity_id,
        freeze.entity_type,
        {
          mintId,
          freezeId: request.freezeId,
          transactionHash: receipt.transactionHash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString()
        }
      ]);
      
      await client.query('COMMIT');
      
      return {
        mintId,
        freezeId: request.freezeId,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        blockTimestamp,
        gasUsed: receipt.gasUsed,
        contractAddress: this.contractAddress
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      
      // If blockchain tx failed, update status back to frozen
      try {
        const freeze = await client.query(
          'SELECT entity_id, entity_type, freeze_hash FROM freeze_records WHERE id = $1',
          [request.freezeId]
        );
        
        if (freeze.rows.length > 0) {
          await this.updateEntityFreezeStatus(
            client,
            freeze.rows[0].entity_id,
            freeze.rows[0].entity_type,
            'frozen_offchain',
            freeze.rows[0].freeze_hash
          );
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get immutability status for an entity
   */
  async getImmutabilityStatus(
    entityId: string,
    entityType: string
  ): Promise<ImmutabilityStatus> {
    const result = await this.pool.query(`
      SELECT 
        e.*,
        f.id as freeze_id,
        f.freeze_hash,
        f.freeze_timestamp,
        f.min_mint_date,
        m.id as mint_id,
        m.transaction_hash,
        m.block_number,
        m.block_timestamp,
        CASE 
          WHEN e.freeze_status = 'minted_onchain' THEN 'minted_onchain'
          WHEN e.freeze_status = 'minting' THEN 'minting'
          WHEN e.freeze_status = 'frozen_offchain' THEN 'frozen_offchain'
          ELSE 'mutable'
        END as current_stage
      FROM ${this.getEntityTable(entityType)} e
      LEFT JOIN freeze_records f ON f.entity_id = e.id 
        AND f.entity_type = $2
      LEFT JOIN mint_records m ON m.freeze_id = f.id
      WHERE e.id = $1
    `, [entityId, entityType]);
    
    if (result.rows.length === 0) {
      throw new Error('Entity not found');
    }
    
    const row = result.rows[0];
    const freezeBlockers: string[] = [];
    const mintBlockers: string[] = [];
    
    // Check freeze eligibility
    let canFreeze = false;
    if (row.current_stage === 'mutable') {
      // Check trust level
      const trustLevel = await this.getEntityTrustLevel(entityId, entityType);
      if (trustLevel < MIN_TRUST_LEVEL_FOR_FREEZE) {
        freezeBlockers.push(`Trust level too low (${trustLevel} < ${MIN_TRUST_LEVEL_FOR_FREEZE})`);
      }
      
      // Check required badges/stamps
      const missingRequirements = await this.checkFreezeRequirements(entityId, entityType);
      freezeBlockers.push(...missingRequirements);
      
      canFreeze = freezeBlockers.length === 0;
    } else {
      freezeBlockers.push(`Already ${row.current_stage}`);
    }
    
    // Check mint eligibility
    let canMint = false;
    if (row.current_stage === 'frozen_offchain') {
      const now = new Date();
      const minMintDate = new Date(row.min_mint_date);
      
      if (now < minMintDate) {
        const waitDays = Math.ceil((minMintDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        mintBlockers.push(`Must wait ${waitDays} more days`);
      }
      
      // Check trust level for mint
      const trustLevel = await this.getEntityTrustLevel(entityId, entityType);
      if (trustLevel < MIN_TRUST_LEVEL_FOR_MINT) {
        mintBlockers.push(`Trust level too low for mint (${trustLevel} < ${MIN_TRUST_LEVEL_FOR_MINT})`);
      }
      
      canMint = mintBlockers.length === 0;
    } else if (row.current_stage !== 'minting') {
      mintBlockers.push(`Must be frozen off-chain first (current: ${row.current_stage})`);
    }
    
    const status: ImmutabilityStatus = {
      entityId,
      entityType,
      currentStage: row.current_stage,
      canFreeze,
      canMint,
      freezeBlockers,
      mintBlockers
    };
    
    if (row.freeze_id) {
      status.freezeData = {
        freezeId: row.freeze_id,
        freezeHash: row.freeze_hash,
        freezeTimestamp: row.freeze_timestamp,
        eligibleForMintAt: row.min_mint_date
      };
    }
    
    if (row.mint_id) {
      status.mintData = {
        mintId: row.mint_id,
        transactionHash: row.transaction_hash,
        blockNumber: row.block_number,
        blockTimestamp: row.block_timestamp
      };
    }
    
    return status;
  }

  /**
   * Verify on-chain evidence
   */
  async verifyOnChain(freezeHash: string): Promise<{
    exists: boolean;
    blockNumber?: number;
    timestamp?: Date;
    minter?: string;
  }> {
    try {
      const freezeHashBytes = '0x' + freezeHash;
      const [blockNumber, timestamp, minter] = await this.contract.getEvidence(freezeHashBytes);
      
      if (blockNumber === 0n) {
        return { exists: false };
      }
      
      return {
        exists: true,
        blockNumber: Number(blockNumber),
        timestamp: new Date(Number(timestamp) * 1000),
        minter
      };
    } catch (error) {
      return { exists: false };
    }
  }

  // Helper methods

  private async gatherFreezeData(
    client: any,
    entityId: string,
    entityType: string
  ): Promise<Record<string, any>> {
    const table = this.getEntityTable(entityType);
    
    // Get main entity data
    const entityResult = await client.query(
      `SELECT * FROM ${table} WHERE id = $1`,
      [entityId]
    );
    
    if (entityResult.rows.length === 0) {
      throw new Error('Entity not found');
    }
    
    const entity = entityResult.rows[0];
    
    // Get relationships
    const relationshipsResult = await client.query(`
      SELECT * FROM relationships 
      WHERE from_identity_id = $1 OR to_identity_id = $1
      ORDER BY established_at
    `, [entityId]);
    
    // Get verifications
    const verificationsResult = await client.query(`
      SELECT * FROM verification_methods
      WHERE identity_id = $1
      ORDER BY verified_at
    `, [entityId]);
    
    // Entity-specific data
    let additionalData = {};
    
    switch (entityType) {
      case 'evidence':
        // Get chain of custody
        const custodyResult = await client.query(
          'SELECT custody_chain FROM evidence WHERE id = $1',
          [entityId]
        );
        additionalData = { custody_chain: custodyResult.rows[0]?.custody_chain };
        break;
        
      case 'claim':
        // Get claim components
        const componentsResult = await client.query(
          'SELECT * FROM claim_components WHERE claim_id = $1',
          [entityId]
        );
        additionalData = { components: componentsResult.rows };
        break;
    }
    
    return {
      entity,
      relationships: relationshipsResult.rows,
      verifications: verificationsResult.rows,
      ...additionalData
    };
  }

  private generateWitnessData(data: Record<string, any>): WitnessData {
    // Hash main entity data
    const dataHash = createHash('sha256')
      .update(JSON.stringify(data.entity))
      .digest('hex');
    
    // Hash metadata separately
    const metadataHash = createHash('sha256')
      .update(JSON.stringify({
        timestamp: new Date().toISOString(),
        version: '1.0'
      }))
      .digest('hex');
    
    // Hash relationships
    const relationships = (data.relationships || []).map(r => 
      createHash('sha256')
        .update(JSON.stringify(r))
        .digest('hex')
    );
    
    // Hash verifications
    const verifications = (data.verifications || []).map(v =>
      createHash('sha256')
        .update(JSON.stringify(v))
        .digest('hex')
    );
    
    // Create combined hash
    const combinedData = {
      dataHash,
      metadataHash,
      relationships: relationships.sort(),
      verifications: verifications.sort()
    };
    
    const combinedHash = createHash('sha256')
      .update(JSON.stringify(combinedData))
      .digest('hex');
    
    return {
      dataHash,
      metadataHash,
      relationships,
      verifications,
      combinedHash
    };
  }

  private async updateEntityFreezeStatus(
    client: any,
    entityId: string,
    entityType: string,
    status: string,
    freezeHash: string
  ): Promise<void> {
    const table = this.getEntityTable(entityType);
    
    await client.query(`
      UPDATE ${table}
      SET freeze_status = $2,
          freeze_hash = $3,
          frozen_at = CASE WHEN $2 = 'frozen_offchain' THEN CURRENT_TIMESTAMP ELSE frozen_at END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [entityId, status, freezeHash]);
  }

  private async updateEntityMintStatus(
    client: any,
    entityId: string,
    entityType: string,
    txHash: string,
    blockNumber: number
  ): Promise<void> {
    const table = this.getEntityTable(entityType);
    
    await client.query(`
      UPDATE ${table}
      SET freeze_status = 'minted_onchain',
          chain_tx_hash = $2,
          chain_block_number = $3,
          chain_timestamp = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [entityId, txHash, blockNumber]);
  }

  private getEntityTable(entityType: string): string {
    const tables = {
      identity: 'identities',
      evidence: 'evidence',
      claim: 'claims'
    };
    
    return tables[entityType] || 'identities';
  }

  private getEntityTypeCode(entityType: string): number {
    const codes = {
      identity: 1,
      evidence: 2,
      claim: 3
    };
    
    return codes[entityType] || 0;
  }

  private async getEntityTrustLevel(entityId: string, entityType: string): Promise<number> {
    if (entityType === 'identity') {
      const result = await this.pool.query(
        "SELECT (metadata->>'trust_level')::int as trust_level FROM identities WHERE id = $1",
        [entityId]
      );
      return result.rows[0]?.trust_level || 1;
    }
    
    // For evidence and claims, use author's trust level
    const table = this.getEntityTable(entityType);
    const result = await this.pool.query(`
      SELECT (i.metadata->>'trust_level')::int as trust_level
      FROM ${table} e
      JOIN identities i ON e.${entityType === 'evidence' ? 'created_by' : 'author_identity_id'} = i.id
      WHERE e.id = $1
    `, [entityId]);
    
    return result.rows[0]?.trust_level || 1;
  }

  private async checkFreezeRequirements(
    entityId: string,
    entityType: string
  ): Promise<string[]> {
    const blockers: string[] = [];
    
    switch (entityType) {
      case 'identity':
        // Check for required verifications
        const verifications = await this.pool.query(
          'SELECT method_type FROM verification_methods WHERE identity_id = $1',
          [entityId]
        );
        
        const hasEmail = verifications.rows.some(v => v.method_type === 'email');
        if (!hasEmail) {
          blockers.push('Email verification required');
        }
        break;
        
      case 'evidence':
        // Check content hash exists
        const evidence = await this.pool.query(
          'SELECT content_hash, storage_uri FROM evidence WHERE id = $1',
          [entityId]
        );
        
        if (!evidence.rows[0]?.content_hash) {
          blockers.push('Content hash required');
        }
        if (!evidence.rows[0]?.storage_uri) {
          blockers.push('Storage URI required');
        }
        break;
        
      case 'claim':
        // Check validity status
        const claim = await this.pool.query(
          'SELECT validity_status, validity_score FROM claims WHERE id = $1',
          [entityId]
        );
        
        if (claim.rows[0]?.validity_status === 'pending') {
          blockers.push('Claim must be validated first');
        }
        if (parseFloat(claim.rows[0]?.validity_score || '0') < 0.5) {
          blockers.push('Validity score too low');
        }
        break;
    }
    
    return blockers;
  }

  private async getGasPrice(priority?: 'low' | 'medium' | 'high'): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    const basePrice = feeData.gasPrice || 20000000000n; // 20 gwei default
    
    const multipliers = {
      low: 80n,    // 0.8x
      medium: 100n, // 1x
      high: 150n    // 1.5x
    };
    
    const multiplier = multipliers[priority || 'medium'];
    return (basePrice * multiplier) / 100n;
  }
}

// Database tables for freeze/mint tracking
export const FREEZE_MINT_SCHEMA = `
-- Freeze records
CREATE TABLE IF NOT EXISTS freeze_records (
  id VARCHAR(26) PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  freeze_hash VARCHAR(64) NOT NULL,
  witness_data JSONB NOT NULL,
  freeze_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  min_mint_date TIMESTAMP WITH TIME ZONE NOT NULL,
  requested_by UUID NOT NULL REFERENCES identities(id),
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Mint reference
  mint_id VARCHAR(26),
  minted_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(entity_type, entity_id)
);

CREATE INDEX idx_freeze_records_entity ON freeze_records(entity_type, entity_id);
CREATE INDEX idx_freeze_records_eligible ON freeze_records(min_mint_date) 
  WHERE mint_id IS NULL;

-- Mint records
CREATE TABLE IF NOT EXISTS mint_records (
  id VARCHAR(26) PRIMARY KEY,
  freeze_id VARCHAR(26) NOT NULL REFERENCES freeze_records(id),
  transaction_hash VARCHAR(66) NOT NULL,
  block_number BIGINT NOT NULL,
  block_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  gas_used VARCHAR(50) NOT NULL, -- BigInt as string
  contract_address VARCHAR(42) NOT NULL,
  requested_by UUID NOT NULL REFERENCES identities(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mint_records_freeze ON mint_records(freeze_id);
CREATE INDEX idx_mint_records_tx ON mint_records(transaction_hash);
CREATE INDEX idx_mint_records_block ON mint_records(block_number);
`;