/**
 * ChittyChain Evidence Ledger - Master Evidence Service
 * Handles all evidence operations with blockchain integration
 */

import {
  MasterEvidence,
  EvidenceType,
  EvidenceTier,
  VerificationStatus,
  AuthenticationMethod,
  MintingStatus,
  RedactionLevel
} from '../schemas/types';
import {
  generateArtifactId,
  calculateEvidenceWeight,
  generateContentHash,
  shouldAutoMint
} from '../schemas/formulas';
import { ChainOfCustodyService } from './custody-service';
import { AuditTrailService } from './audit-service';
import { BlockchainService } from './blockchain-service';

export class EvidenceService {
  private custodyService: ChainOfCustodyService;
  private auditService: AuditTrailService;
  private blockchainService: BlockchainService;

  constructor() {
    this.custodyService = new ChainOfCustodyService();
    this.auditService = new AuditTrailService();
    this.blockchainService = new BlockchainService();
  }

  /**
   * Upload new evidence with automatic processing
   */
  async uploadEvidence(params: {
    caseId: string;
    userId: string;
    file: File | Buffer;
    filename: string;
    evidenceType: EvidenceType;
    evidenceTier: EvidenceTier;
    authenticationMethod: AuthenticationMethod;
    metadata?: Record<string, any>;
    ipAddress: string;
    sessionId: string;
  }): Promise<{
    evidence: MasterEvidence;
    autoMinted: boolean;
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    try {
      // Generate unique artifact ID
      const artifactId = generateArtifactId();
      
      // Calculate content hash
      const contentHash = generateContentHash(params.file);
      
      // Check for duplicate hash
      const existingEvidence = await this.findByContentHash(contentHash);
      if (existingEvidence) {
        warnings.push('Duplicate content detected - evidence already exists');
      }
      
      // Calculate evidence weight
      const authBonus = this.getAuthenticationBonus(params.authenticationMethod);
      const evidenceWeight = calculateEvidenceWeight(
        params.evidenceTier,
        [], // Credibility factors added later
        authBonus
      );
      
      // Create evidence record
      const evidence: MasterEvidence = {
        artifactId,
        caseBinding: params.caseId,
        userBinding: params.userId,
        evidenceType: params.evidenceType,
        evidenceTier: params.evidenceTier,
        evidenceWeight,
        contentHash,
        originalFilename: params.filename,
        uploadDate: new Date(),
        sourceVerificationStatus: VerificationStatus.PENDING,
        authenticationMethod: params.authenticationMethod,
        chainOfCustody: [],
        extractedFacts: [],
        supportingClaims: [],
        contradictingClaims: [],
        mintingStatus: MintingStatus.PENDING,
        auditNotes: '',
        fileSize: params.file instanceof Buffer ? params.file.length : params.file.size,
        mimeType: params.file instanceof File ? params.file.type : 'application/octet-stream',
        encryptionStatus: false,
        redactionLevel: RedactionLevel.NONE,
        ...params.metadata
      };
      
      // Store evidence in database
      await this.saveEvidence(evidence);
      
      // Create initial custody log entry
      await this.custodyService.logInitialCustody({
        evidenceId: artifactId,
        custodianId: params.userId,
        transferMethod: 'SECURE_DIGITAL',
        notes: 'Initial upload'
      });
      
      // Log audit trail
      await this.auditService.logAction({
        userId: params.userId,
        actionType: 'Upload',
        targetArtifactId: artifactId,
        ipAddress: params.ipAddress,
        sessionId: params.sessionId,
        success: true,
        details: `Uploaded ${params.filename} (${params.evidenceType})`
      });
      
      // Check for auto-minting
      let autoMinted = false;
      if (shouldAutoMint(evidenceWeight, 'Pending', params.authenticationMethod)) {
        try {
          await this.mintToBlockchain(artifactId, params.userId);
          autoMinted = true;
        } catch (error) {
          warnings.push('Auto-minting failed: ' + error.message);
        }
      }
      
      // Trigger fact extraction if document
      if (params.evidenceType === EvidenceType.DOCUMENT) {
        this.scheduleFactExtraction(artifactId);
      }
      
      return {
        evidence,
        autoMinted,
        warnings
      };
      
    } catch (error) {
      // Log failed attempt
      await this.auditService.logAction({
        userId: params.userId,
        actionType: 'Upload',
        ipAddress: params.ipAddress,
        sessionId: params.sessionId,
        success: false,
        details: `Upload failed: ${error.message}`
      });
      
      throw error;
    }
  }

  /**
   * Verify evidence source and authentication
   */
  async verifyEvidence(params: {
    artifactId: string;
    userId: string;
    verificationMethod: string;
    verificationNotes: string;
    ipAddress: string;
    sessionId: string;
  }): Promise<{
    success: boolean;
    newWeight: number;
    mintingTriggered: boolean;
  }> {
    const evidence = await this.getById(params.artifactId);
    if (!evidence) {
      throw new Error('Evidence not found');
    }
    
    try {
      // Update verification status
      evidence.sourceVerificationStatus = VerificationStatus.VERIFIED;
      evidence.auditNotes += `\nVerified by ${params.userId}: ${params.verificationNotes}`;
      
      // Recalculate weight with verification bonus
      const verificationBonus = 0.05;
      evidence.evidenceWeight = Math.min(
        evidence.evidenceWeight + verificationBonus,
        1.0
      );
      
      // Save updated evidence
      await this.saveEvidence(evidence);
      
      // Log verification
      await this.auditService.logAction({
        userId: params.userId,
        actionType: 'Verify',
        targetArtifactId: params.artifactId,
        ipAddress: params.ipAddress,
        sessionId: params.sessionId,
        success: true,
        details: `Verified evidence: ${params.verificationMethod}`
      });
      
      // Check for auto-minting after verification
      let mintingTriggered = false;
      if (shouldAutoMint(
        evidence.evidenceWeight,
        evidence.sourceVerificationStatus,
        evidence.authenticationMethod
      )) {
        await this.mintToBlockchain(params.artifactId, params.userId);
        mintingTriggered = true;
      }
      
      return {
        success: true,
        newWeight: evidence.evidenceWeight,
        mintingTriggered
      };
      
    } catch (error) {
      await this.auditService.logAction({
        userId: params.userId,
        actionType: 'Verify',
        targetArtifactId: params.artifactId,
        ipAddress: params.ipAddress,
        sessionId: params.sessionId,
        success: false,
        details: `Verification failed: ${error.message}`
      });
      
      throw error;
    }
  }

  /**
   * Mint evidence to blockchain
   */
  async mintToBlockchain(
    artifactId: string,
    userId: string
  ): Promise<{
    transactionHash: string;
    blockNumber: string;
  }> {
    const evidence = await this.getById(artifactId);
    if (!evidence) {
      throw new Error('Evidence not found');
    }
    
    if (evidence.mintingStatus === MintingStatus.MINTED) {
      throw new Error('Evidence already minted');
    }
    
    // Mint to blockchain
    const result = await this.blockchainService.mintEvidence({
      artifactId: evidence.artifactId,
      contentHash: evidence.contentHash,
      caseId: evidence.caseBinding,
      evidenceWeight: evidence.evidenceWeight,
      timestamp: evidence.uploadDate
    });
    
    // Update evidence with blockchain info
    evidence.mintingStatus = MintingStatus.MINTED;
    evidence.blockNumber = result.blockNumber;
    evidence.auditNotes += `\nMinted to blockchain: ${result.transactionHash}`;
    
    await this.saveEvidence(evidence);
    
    return result;
  }

  /**
   * Get evidence by ID with access logging
   */
  async getById(
    artifactId: string,
    userId?: string,
    ipAddress?: string,
    sessionId?: string
  ): Promise<MasterEvidence | null> {
    const evidence = await this.findById(artifactId);
    
    // Log access if user info provided
    if (evidence && userId) {
      await this.auditService.logAction({
        userId,
        actionType: 'Access',
        targetArtifactId: artifactId,
        ipAddress: ipAddress || 'unknown',
        sessionId: sessionId || 'unknown',
        success: true,
        details: 'Evidence accessed'
      });
    }
    
    return evidence;
  }

  /**
   * Search evidence with filters
   */
  async searchEvidence(filters: {
    caseId?: string;
    userId?: string;
    evidenceType?: EvidenceType;
    evidenceTier?: EvidenceTier;
    minWeight?: number;
    maxWeight?: number;
    verificationStatus?: VerificationStatus;
    mintingStatus?: MintingStatus;
    uploadDateFrom?: Date;
    uploadDateTo?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{
    evidence: MasterEvidence[];
    total: number;
    hasMore: boolean;
  }> {
    // Implementation would query database with filters
    return this.findWithFilters(filters);
  }

  /**
   * Get evidence statistics for dashboard
   */
  async getEvidenceStats(caseId?: string): Promise<{
    totalCount: number;
    verifiedCount: number;
    mintedCount: number;
    pendingCount: number;
    averageWeight: number;
    typeBreakdown: Record<EvidenceType, number>;
    tierBreakdown: Record<EvidenceTier, number>;
  }> {
    const evidence = await this.findByCase(caseId);
    
    const stats = {
      totalCount: evidence.length,
      verifiedCount: evidence.filter(e => e.sourceVerificationStatus === VerificationStatus.VERIFIED).length,
      mintedCount: evidence.filter(e => e.mintingStatus === MintingStatus.MINTED).length,
      pendingCount: evidence.filter(e => e.sourceVerificationStatus === VerificationStatus.PENDING).length,
      averageWeight: evidence.length > 0 
        ? evidence.reduce((sum, e) => sum + e.evidenceWeight, 0) / evidence.length 
        : 0,
      typeBreakdown: {} as Record<EvidenceType, number>,
      tierBreakdown: {} as Record<EvidenceTier, number>
    };
    
    // Calculate breakdowns
    Object.values(EvidenceType).forEach(type => {
      stats.typeBreakdown[type] = evidence.filter(e => e.evidenceType === type).length;
    });
    
    Object.values(EvidenceTier).forEach(tier => {
      stats.tierBreakdown[tier] = evidence.filter(e => e.evidenceTier === tier).length;
    });
    
    return stats;
  }

  // Private helper methods
  private getAuthenticationBonus(method: AuthenticationMethod): number {
    switch (method) {
      case AuthenticationMethod.SEAL:
      case AuthenticationMethod.NOTARIZATION:
        return 0.1;
      case AuthenticationMethod.DIGITAL_SIGNATURE:
      case AuthenticationMethod.CERTIFICATION:
        return 0.08;
      case AuthenticationMethod.STAMP:
        return 0.05;
      case AuthenticationMethod.METADATA:
      case AuthenticationMethod.WITNESS:
        return 0.03;
      default:
        return 0;
    }
  }

  private async scheduleFactExtraction(artifactId: string): Promise<void> {
    // Schedule background job for AI fact extraction
    // Implementation would use job queue (Bull, Agenda, etc.)
    console.log(`Scheduling fact extraction for ${artifactId}`);
  }

  // Database abstraction methods (implement based on chosen DB)
  private async saveEvidence(evidence: MasterEvidence): Promise<void> {
    // Implementation depends on database choice
    throw new Error('Database method not implemented');
  }

  private async findById(artifactId: string): Promise<MasterEvidence | null> {
    // Implementation depends on database choice
    throw new Error('Database method not implemented');
  }

  private async findByContentHash(contentHash: string): Promise<MasterEvidence | null> {
    // Implementation depends on database choice
    throw new Error('Database method not implemented');
  }

  private async findByCase(caseId?: string): Promise<MasterEvidence[]> {
    // Implementation depends on database choice
    throw new Error('Database method not implemented');
  }

  private async findWithFilters(filters: any): Promise<{
    evidence: MasterEvidence[];
    total: number;
    hasMore: boolean;
  }> {
    // Implementation depends on database choice
    throw new Error('Database method not implemented');
  }
}