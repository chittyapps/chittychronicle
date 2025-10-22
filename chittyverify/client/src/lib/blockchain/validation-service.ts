/**
 * Blockchain Validation and Integrity Service
 * Ensures the integrity and validity of evidence before minting
 *
 * UPDATED: ChittyID Phase 2 Integration
 * - Uses generateContentHash() for deterministic content hashing
 * - Zero Math.random() usage
 */

import { generateContentHash } from "../mint-id";

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type: "CRITICAL" | "ERROR";
  message: string;
  details?: any;
}

export interface ValidationWarning {
  type: "WARNING" | "INFO";
  message: string;
  details?: any;
}

export interface ValidationSummary {
  artifactsValidated: number;
  errorsFound: number;
  warningsFound: number;
  validationTime: number;
  recommendations: string[];
}

export class BlockchainValidationService {
  async validateEvidence(evidence: any): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // 1. Validate required fields
      if (!evidence.id) {
        errors.push({
          type: "CRITICAL",
          message: "Evidence missing required ID",
        });
      }

      if (!evidence.contentHash) {
        errors.push({
          type: "ERROR",
          message: "Evidence missing content hash",
        });
      }

      // 2. Validate weight
      if (
        typeof evidence.weight !== "number" ||
        evidence.weight < 0 ||
        evidence.weight > 1
      ) {
        errors.push({
          type: "ERROR",
          message: "Evidence has invalid weight value",
        });
      }

      // 3. Validate tier
      const validTiers = [
        "GOVERNMENT",
        "FINANCIAL_INSTITUTION",
        "BUSINESS_RECORDS",
        "THIRD_PARTY",
      ];
      if (!validTiers.includes(evidence.tier)) {
        warnings.push({
          type: "WARNING",
          message: `Unknown evidence tier: ${evidence.tier}`,
        });
      }

      // 4. Validate content hash format
      if (evidence.contentHash && !this.isValidHash(evidence.contentHash)) {
        errors.push({
          type: "ERROR",
          message: "Invalid content hash format",
        });
      }

      // 5. Check for potential duplicates
      if (evidence.title && evidence.title.length < 5) {
        warnings.push({
          type: "WARNING",
          message: "Evidence title is very short",
        });
      }

      // 6. Validate file size
      if (evidence.fileSize && evidence.fileSize > 50 * 1024 * 1024) {
        // 50MB
        warnings.push({
          type: "WARNING",
          message: "Large file size may affect processing speed",
        });
      }

      const validationTime = Date.now() - startTime;

      return {
        valid: errors.filter((e) => e.type === "CRITICAL").length === 0,
        errors,
        warnings,
        summary: {
          artifactsValidated: 1,
          errorsFound: errors.length,
          warningsFound: warnings.length,
          validationTime,
          recommendations: this.generateRecommendations(errors, warnings),
        },
      };
    } catch (error) {
      errors.push({
        type: "CRITICAL",
        message: "Validation process failed",
        details: error,
      });

      return {
        valid: false,
        errors,
        warnings,
        summary: {
          artifactsValidated: 0,
          errorsFound: errors.length,
          warningsFound: warnings.length,
          validationTime: Date.now() - startTime,
          recommendations: ["Fix critical validation errors before proceeding"],
        },
      };
    }
  }

  async validateArtifactForMinting(artifact: any): Promise<{
    valid: boolean;
    reason?: string;
  }> {
    // Check required fields
    if (!artifact.id) {
      return { valid: false, reason: "Missing artifact ID" };
    }

    if (!artifact.contentHash) {
      return { valid: false, reason: "Missing content hash" };
    }

    if (
      typeof artifact.weight !== "number" ||
      artifact.weight < 0 ||
      artifact.weight > 1
    ) {
      return { valid: false, reason: "Invalid weight value" };
    }

    // Check for duplicates (simulate)
    const existingArtifact = await this.findExistingArtifact(artifact.id);
    if (existingArtifact) {
      return { valid: false, reason: "Artifact already exists in blockchain" };
    }

    // Validate content hash if content is provided
    if (artifact.content) {
      const calculatedHash = await this.calculateContentHash(artifact.content);
      if (calculatedHash !== artifact.contentHash) {
        return { valid: false, reason: "Content hash mismatch" };
      }
    }

    return { valid: true };
  }

  private isValidHash(hash: string): boolean {
    // Check for common hash formats (SHA-256, SHA3-256, etc.)
    const hashPatterns = [
      /^[a-fA-F0-9]{64}$/, // SHA-256
      /^sha3-[a-fA-F0-9]{64}$/, // SHA3-256 with prefix
      /^0x[a-fA-F0-9]{64}$/, // Hex with 0x prefix
    ];

    return hashPatterns.some((pattern) => pattern.test(hash));
  }

  private async findExistingArtifact(id: string): Promise<any | null> {
    // Simulate blockchain lookup
    // In a real implementation, this would query the blockchain
    return null;
  }

  private async calculateContentHash(content: any): Promise<string> {
    // Use deterministic content hashing from mint-id utility
    const contentString =
      typeof content === "string" ? content : JSON.stringify(content);
    return await generateContentHash(contentString);
  }

  private generateRecommendations(
    errors: ValidationError[],
    warnings: ValidationWarning[],
  ): string[] {
    const recommendations: string[] = [];

    if (errors.length > 0) {
      recommendations.push(
        "Resolve all errors before attempting to mint evidence",
      );
    }

    if (warnings.length > 2) {
      recommendations.push(
        "Consider reviewing evidence quality before minting",
      );
    }

    if (errors.length === 0 && warnings.length === 0) {
      recommendations.push("Evidence is ready for minting");
    }

    return recommendations;
  }

  async exportValidationReport(results: ValidationResult[]): Promise<{
    timestamp: string;
    totalValidated: number;
    passedValidation: number;
    failedValidation: number;
    summary: any;
  }> {
    const totalValidated = results.length;
    const passedValidation = results.filter((r) => r.valid).length;
    const failedValidation = totalValidated - passedValidation;

    return {
      timestamp: new Date().toISOString(),
      totalValidated,
      passedValidation,
      failedValidation,
      summary: {
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
        totalWarnings: results.reduce((sum, r) => sum + r.warnings.length, 0),
        averageValidationTime:
          results.reduce((sum, r) => sum + r.summary.validationTime, 0) /
          totalValidated,
      },
    };
  }
}

export const validationService = new BlockchainValidationService();
