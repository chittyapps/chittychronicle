/**
 * Artifact Minting Service Integration
 * Handles evidence minting with validation and consent
 *
 * UPDATED: ChittyID Phase 2 Integration
 * - Uses mintId() for transaction hashes and block numbers
 * - Uses generateContentHash() for deterministic content hashing
 * - Zero Math.random() usage
 */

import { type Evidence } from "@shared/schema";
import { mintId, generateContentHash } from "../mint-id";

export interface MintingRequest {
  evidenceId: string;
  userId: string;
  forceOverride?: boolean;
  metadata?: Record<string, any>;
}

export interface MintingResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: string;
  artifactId?: string;
  mintedArtifacts?: MintedArtifact[];
  rejected?: RejectedArtifact[];
  needsCorroboration?: CorroborationRequired[];
  error?: string;
  details?: any;
}

export interface MintedArtifact {
  id: string;
  contentHash: string;
  weight: number;
  blockIndex: number;
  merkleProof: any;
}

export interface RejectedArtifact {
  artifactId: string;
  reason: string;
  contradictions?: any[];
}

export interface CorroborationRequired {
  artifactId: string;
  currentWeight: number;
  requiredWeight: number;
  requiredSources: number;
  suggestions: string[];
}

export class ArtifactMintingService {
  async mintEvidence(request: MintingRequest): Promise<MintingResult> {
    try {
      console.log(
        `🔗 Starting minting process for evidence ${request.evidenceId}`,
      );

      // Simulate the comprehensive minting workflow
      const artifacts = await this.prepareArtifacts(
        request.evidenceId,
        request.userId,
      );
      const validation = await this.validateArtifacts(artifacts);

      if (!validation.valid) {
        return {
          success: false,
          error: "Validation failed",
          rejected: validation.rejected,
          details: validation.details,
        };
      }

      // Check for contradictions
      const contradictionCheck = await this.checkContradictions(artifacts);
      if (contradictionCheck.found) {
        return {
          success: false,
          error: "Contradictions detected",
          rejected: contradictionCheck.contradictingArtifacts,
        };
      }

      // Request user consent
      const consentResult = await this.requestUserConsent(artifacts);
      if (!consentResult.approved) {
        return {
          success: false,
          error: "User consent denied",
        };
      }

      // Mint to blockchain
      const mintResult = await this.performMinting(artifacts, request.userId);

      console.log(
        `✅ Successfully minted ${mintResult.mintedArtifacts?.length || 0} artifacts`,
      );

      return {
        success: true,
        transactionHash: mintResult.transactionHash,
        blockNumber: mintResult.blockNumber,
        artifactId: mintResult.artifactId,
        mintedArtifacts: mintResult.mintedArtifacts,
      };
    } catch (error) {
      console.error("Minting failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async prepareArtifacts(evidenceId: string, userId: string) {
    // Generate deterministic content hash based on evidence data
    const contentHash = await generateContentHash(
      `${evidenceId}-${userId}-property_tax`,
    );

    // Simulate artifact preparation
    return [
      {
        id: evidenceId,
        type: "property_tax",
        tier: "GOVERNMENT",
        weight: 0.95,
        contentHash,
        statement: "Property tax assessment evidence",
        caseId: "case-1",
        userId,
      },
    ];
  }

  private async validateArtifacts(artifacts: any[]) {
    // Enhanced validation logic
    const valid = artifacts.every(
      (artifact) =>
        artifact.id &&
        artifact.contentHash &&
        artifact.weight >= 0 &&
        artifact.weight <= 1,
    );

    return {
      valid,
      rejected: valid
        ? []
        : artifacts.map((a) => ({
            artifactId: a.id,
            reason: "Validation failed",
          })),
      details: valid ? null : "Required fields missing",
    };
  }

  private async checkContradictions(artifacts: any[]) {
    // Simulate contradiction detection
    return {
      found: false,
      contradictingArtifacts: [],
    };
  }

  private async requestUserConsent(artifacts: any[]) {
    // In a real implementation, this would show a consent dialog
    console.log(`🔐 User consent required for ${artifacts.length} artifacts`);

    // Generate proper ChittyID for consent record
    const consentId = await mintId("CONSENT", "user-consent-record");

    // Auto-approve for demo purposes
    return {
      approved: true,
      consentId,
      trustScore: 0.92,
    };
  }

  private async performMinting(artifacts: any[], userId: string) {
    // Mint proper ChittyIDs for transaction hash and block anchor
    const txHashId = await mintId("TXHASH", `blockchain-tx-${userId}`);
    const blockAnchorId = await mintId("ANCHOR", "blockchain-block");

    // Format as blockchain transaction hash
    const transactionHash = `0x${txHashId}`;
    // Extract numeric portion for block number (deterministic fallback)
    const blockNumber = blockAnchorId.split("-").pop() || Date.now().toString();

    return {
      transactionHash,
      blockNumber,
      artifactId: artifacts[0]?.id,
      mintedArtifacts: artifacts.map((artifact) => ({
        id: artifact.id,
        contentHash: artifact.contentHash,
        weight: artifact.weight,
        blockIndex: parseInt(blockNumber),
        merkleProof: { proof: ["0x123", "0x456"] },
      })),
    };
  }

  // Removed: generateContentHash() and generateId()
  // Replaced with mintId() and generateContentHash() from ../mint-id
}

export const artifactMintingService = new ArtifactMintingService();
