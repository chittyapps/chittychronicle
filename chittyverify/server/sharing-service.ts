import { randomUUID } from "crypto";
import { storage } from "./storage";

export interface ShareRequest {
  evidenceId: string;
  recipientEmail: string;
  recipientChittyId?: string;
  accessLevel: "view" | "download" | "verify";
  expiresAt?: string;
  maxAccess?: number;
  requirePin: boolean;
  securityPin?: string;
  personalMessage?: string;
  sharedBy: string; // ChittyID
}

export interface ShareResponse {
  shareId: string;
  shareUrl: string;
  expiresAt?: string;
  accessLevel: string;
  securityPin?: string;
}

export class SharingService {
  // Generate unique share ID
  private generateShareId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomUUID().substring(0, 8);
    return `SH-${timestamp}-${random}`.toUpperCase();
  }

  // Create a new evidence share
  async createEvidenceShare(shareRequest: ShareRequest): Promise<ShareResponse> {
    const shareId = this.generateShareId();
    const baseUrl = process.env.BASE_URL || "https://chittyverfiy.replit.app";
    const shareUrl = `${baseUrl}/share/${shareId}`;

    // Create share record
    try {
      const shareData = {
        evidenceId: shareRequest.evidenceId,
        shareId,
        sharedBy: shareRequest.sharedBy,
        sharedWith: shareRequest.recipientEmail,
        accessLevel: shareRequest.accessLevel,
        expiresAt: shareRequest.expiresAt ? new Date(shareRequest.expiresAt) : null,
        maxAccess: shareRequest.maxAccess || null,
        isActive: true,
        securityPin: shareRequest.requirePin ? shareRequest.securityPin : null,
        metadata: {
          recipientChittyId: shareRequest.recipientChittyId,
          personalMessage: shareRequest.personalMessage,
          createdAt: new Date().toISOString(),
          userAgent: "ChittyVerify Platform"
        }
      };

      // In a real implementation, this would use the database
      // For now, we'll simulate the creation
      console.log('Creating evidence share:', shareData);

      // Create audit entry
      try {
        console.log('Creating audit entry for evidence share');
      } catch (auditError) {
        console.warn('Failed to create audit entry:', auditError);
      }

      return {
        shareId,
        shareUrl,
        expiresAt: shareRequest.expiresAt,
        accessLevel: shareRequest.accessLevel,
        securityPin: shareRequest.requirePin ? shareRequest.securityPin : undefined
      };
    } catch (error) {
      console.error('Error creating evidence share:', error);
      throw new Error('Failed to create evidence share');
    }
  }

  // Verify share access
  async verifyShareAccess(shareId: string, pin?: string): Promise<{
    valid: boolean;
    evidence?: any;
    share?: any;
    reason?: string;
  }> {
    try {
      // In a real implementation, this would check the database
      console.log(`Verifying access for share ${shareId}`);
      
      // Simulate share validation
      if (!shareId.startsWith('SH-')) {
        return { valid: false, reason: 'Invalid share ID format' };
      }

      // For demo purposes, return valid access
      return {
        valid: true,
        evidence: {
          id: "demo-evidence",
          title: "Shared Evidence Document",
          type: "legal_document"
        },
        share: {
          shareId,
          accessLevel: "view",
          sharedBy: "CH-2025-VER-0001-A"
        }
      };
    } catch (error) {
      console.error('Error verifying share access:', error);
      return { valid: false, reason: 'Internal error' };
    }
  }

  // Log share access
  async logShareAccess(shareId: string, action: string, success: boolean = true): Promise<void> {
    try {
      console.log(`Logging share access: ${shareId} - ${action} - ${success ? 'success' : 'failed'}`);
      // In a real implementation, this would log to the database
    } catch (error) {
      console.error('Error logging share access:', error);
    }
  }
}

export const sharingService = new SharingService();