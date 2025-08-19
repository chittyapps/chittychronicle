import crypto from 'crypto';

/**
 * ChittyVerify - Immutable verification layer before blockchain minting
 * Creates cryptographic proof of evidence state without blockchain costs
 */

export interface ChittyVerifyResult {
  status: 'ChittyVerified' | 'Rejected';
  timestamp: Date;
  signature: string;
  evidenceHash: string;
  reasons?: string[];
}

export class ChittyVerifyService {
  private readonly CHITTY_VERIFY_KEY = process.env.CHITTY_VERIFY_SECRET || 'chitty-verify-dev-key';

  /**
   * Verify evidence and create immutable signature
   * This locks the evidence state without blockchain minting
   */
  async verifyEvidence(evidenceData: {
    id: string;
    contentHash: string;
    evidenceType: string;
    evidenceTier: string;
    sourceVerificationStatus: string;
    userTrustScore?: number;
  }): Promise<ChittyVerifyResult> {
    
    const timestamp = new Date();
    const verificationReasons: string[] = [];
    
    // ChittyVerify validation rules
    let shouldVerify = true;
    
    // Rule 1: Source must be verified first
    if (evidenceData.sourceVerificationStatus !== 'Verified') {
      shouldVerify = false;
      verificationReasons.push('Source verification required before ChittyVerify');
    }
    
    // Rule 2: Government tier auto-qualifies
    if (evidenceData.evidenceTier === 'GOVERNMENT') {
      verificationReasons.push('Government-tier evidence auto-approved');
    }
    
    // Rule 3: Financial institution with trust score check
    if (evidenceData.evidenceTier === 'FINANCIAL_INSTITUTION') {
      if (!evidenceData.userTrustScore || evidenceData.userTrustScore < 4.0) {
        shouldVerify = false;
        verificationReasons.push('Financial evidence requires 4.0+ trust score');
      } else {
        verificationReasons.push('Financial evidence approved with sufficient trust');
      }
    }
    
    // Rule 4: Content hash must exist
    if (!evidenceData.contentHash) {
      shouldVerify = false;
      verificationReasons.push('Content hash required for immutable verification');
    }
    
    // Create immutable signature
    const signatureData = {
      evidenceId: evidenceData.id,
      contentHash: evidenceData.contentHash,
      timestamp: timestamp.toISOString(),
      status: shouldVerify ? 'ChittyVerified' : 'Rejected',
      tier: evidenceData.evidenceTier
    };
    
    const signature = this.createSignature(signatureData);
    
    const result: ChittyVerifyResult = {
      status: shouldVerify ? 'ChittyVerified' : 'Rejected',
      timestamp,
      signature,
      evidenceHash: evidenceData.contentHash,
      reasons: verificationReasons
    };
    
    console.log(`ChittyVerify: Evidence ${evidenceData.id} ${result.status}`, {
      reasons: verificationReasons,
      signature: signature.slice(0, 16) + '...'
    });
    
    return result;
  }
  
  /**
   * Create cryptographic signature for immutable verification
   */
  private createSignature(data: any): string {
    const payload = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHmac('sha256', this.CHITTY_VERIFY_KEY)
      .update(payload)
      .digest('hex');
  }
  
  /**
   * Verify an existing ChittyVerify signature
   */
  verifySignature(data: any, signature: string): boolean {
    const expectedSignature = this.createSignature(data);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
  
  /**
   * Check if evidence is ready for blockchain minting
   */
  isReadyForMinting(evidence: {
    verifyStatus: string;
    verifySignature: string;
    mintingStatus: string;
  }): boolean {
    return evidence.verifyStatus === 'ChittyVerified' && 
           evidence.verifySignature && 
           evidence.mintingStatus === 'Pending';
  }
}

export const chittyVerify = new ChittyVerifyService();