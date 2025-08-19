import { type Evidence, type Case, type AnalysisResult } from "@shared/schema";
import { artifactMintingService } from './blockchain/artifact-minting';
import { trustLayer } from './blockchain/trust-layer';
import { validationService } from './blockchain/validation-service';

export interface EvidenceMetrics {
  totalCount: number;
  verifiedCount: number;
  pendingCount: number;
  mintedCount: number;
  failedCount: number;
  averageTrustScore: number;
  typeDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
}

export interface CaseStrengthAnalysis {
  overallStrength: number;
  strengthFactors: string[];
  weaknesses: string[];
  recommendations: string[];
  riskFactors: string[];
  confidence: number;
}

export interface EvidenceValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

export class EvidenceManager {
  /**
   * Calculate evidence metrics for a case
   */
  static calculateEvidenceMetrics(evidence: Evidence[]): EvidenceMetrics {
    const metrics: EvidenceMetrics = {
      totalCount: evidence.length,
      verifiedCount: 0,
      pendingCount: 0,
      mintedCount: 0,
      failedCount: 0,
      averageTrustScore: 0,
      typeDistribution: {},
      statusDistribution: {},
    };

    if (evidence.length === 0) return metrics;

    let totalTrustScore = 0;

    evidence.forEach((item) => {
      // Count by status
      switch (item.status) {
        case "verified":
          metrics.verifiedCount++;
          break;
        case "pending":
          metrics.pendingCount++;
          break;
        case "minted":
          metrics.mintedCount++;
          break;
        case "failed":
          metrics.failedCount++;
          break;
      }

      // Status distribution
      const itemStatus = item.status || 'unknown';
      metrics.statusDistribution[itemStatus] = 
        (metrics.statusDistribution[itemStatus] || 0) + 1;

      // Type distribution
      const itemType = item.type || 'unknown';
      metrics.typeDistribution[itemType] = 
        (metrics.typeDistribution[itemType] || 0) + 1;

      // Trust score sum
      totalTrustScore += item.trustScore || 0;
    });

    metrics.averageTrustScore = Math.round(totalTrustScore / evidence.length);

    return metrics;
  }

  /**
   * Analyze case strength based on evidence
   */
  static analyzeCaseStrength(evidence: Evidence[], caseData: Case): CaseStrengthAnalysis {
    const metrics = this.calculateEvidenceMetrics(evidence);
    
    let strength = 0;
    const strengthFactors: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];
    const riskFactors: string[] = [];

    // Base strength from verification rate
    const verificationRate = metrics.totalCount > 0 ? 
      (metrics.verifiedCount + metrics.mintedCount) / metrics.totalCount : 0;
    strength += verificationRate * 40;

    if (verificationRate > 0.8) {
      strengthFactors.push("High evidence verification rate");
    } else if (verificationRate < 0.5) {
      weaknesses.push("Low evidence verification rate");
      recommendations.push("Verify pending evidence to strengthen case");
    }

    // Trust score contribution
    if (metrics.averageTrustScore > 85) {
      strength += 20;
      strengthFactors.push("High average trust score");
    } else if (metrics.averageTrustScore > 70) {
      strength += 15;
      strengthFactors.push("Good average trust score");
    } else if (metrics.averageTrustScore < 60) {
      weaknesses.push("Low average trust score");
      recommendations.push("Improve evidence quality and verification");
    }

    // Evidence diversity
    const typeCount = Object.keys(metrics.typeDistribution).length;
    if (typeCount >= 4) {
      strength += 15;
      strengthFactors.push("Diverse evidence types");
    } else if (typeCount >= 2) {
      strength += 10;
      strengthFactors.push("Multiple evidence types");
    } else {
      weaknesses.push("Limited evidence diversity");
      recommendations.push("Collect different types of evidence");
    }

    // Volume assessment
    if (metrics.totalCount >= 10) {
      strength += 10;
      strengthFactors.push("Substantial evidence volume");
    } else if (metrics.totalCount >= 5) {
      strength += 5;
      strengthFactors.push("Adequate evidence volume");
    } else if (metrics.totalCount < 3) {
      weaknesses.push("Insufficient evidence volume");
      recommendations.push("Collect additional supporting evidence");
    }

    // Blockchain minting
    if (metrics.mintedCount > 0) {
      strength += 10;
      strengthFactors.push("Blockchain-verified evidence available");
    }

    // Risk factors
    if (metrics.failedCount > 0) {
      riskFactors.push(`${metrics.failedCount} evidence items failed verification`);
    }

    if (metrics.pendingCount > metrics.verifiedCount) {
      riskFactors.push("More pending than verified evidence");
    }

    // Quality recommendations
    if (metrics.averageTrustScore < 80) {
      recommendations.push("Focus on higher quality evidence sources");
    }

    if (metrics.mintedCount < metrics.verifiedCount * 0.5) {
      recommendations.push("Consider minting more evidence to blockchain");
    }

    const confidence = Math.min(
      (verificationRate * 0.4 + 
       (metrics.averageTrustScore / 100) * 0.3 + 
       (typeCount / 5) * 0.2 + 
       Math.min(metrics.totalCount / 10, 1) * 0.1), 
      1
    );

    return {
      overallStrength: Math.round(Math.min(strength, 100)),
      strengthFactors,
      weaknesses,
      recommendations,
      riskFactors,
      confidence: Math.round(confidence * 100) / 100,
    };
  }

  /**
   * Validate evidence before upload
   */
  static validateEvidence(evidenceData: Partial<Evidence>): EvidenceValidation {
    const validation: EvidenceValidation = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
    };

    // Required fields
    if (!evidenceData.title?.trim()) {
      validation.errors.push("Title is required");
      validation.isValid = false;
    }

    if (!evidenceData.artifactId?.trim()) {
      validation.errors.push("Artifact ID is required");
      validation.isValid = false;
    }

    if (!evidenceData.type) {
      validation.errors.push("Evidence type is required");
      validation.isValid = false;
    }

    if (!evidenceData.caseId) {
      validation.errors.push("Case assignment is required");
      validation.isValid = false;
    }

    // Artifact ID format validation
    if (evidenceData.artifactId) {
      const artifactIdPattern = /^[A-Z]{2,4}-\d{4}-\d{3,6}$/;
      if (!artifactIdPattern.test(evidenceData.artifactId)) {
        validation.warnings.push("Artifact ID format should be: TYPE-YEAR-NUMBER (e.g., DOC-2024-001)");
      }
    }

    // File validation
    if (evidenceData.fileSize) {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (evidenceData.fileSize > maxSize) {
        validation.errors.push("File size exceeds 50MB limit");
        validation.isValid = false;
      }
    }

    // MIME type validation
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'message/rfc822',
    ];

    if (evidenceData.mimeType && !allowedTypes.includes(evidenceData.mimeType)) {
      validation.warnings.push("File type may not be supported for automatic analysis");
    }

    // Suggestions
    if (!evidenceData.description?.trim()) {
      validation.suggestions.push("Add a description to help with case organization");
    }

    if (!evidenceData.subtype) {
      validation.suggestions.push("Specify a subtype for better categorization");
    }

    return validation;
  }

  /**
   * Generate evidence search tags
   */
  static generateSearchTags(evidence: Evidence): string[] {
    const tags: Set<string> = new Set();

    // Basic tags
    tags.add(evidence.type || 'unknown');
    if (evidence.subtype) tags.add(evidence.subtype);
    tags.add(evidence.status || 'unknown');

    // Extract words from title and description
    const text = `${evidence.title} ${evidence.description || ''}`.toLowerCase();
    const words = text.match(/\b\w{3,}\b/g) || [];
    words.forEach(word => tags.add(word));

    // Artifact ID components
    if (evidence.artifactId) {
      const parts = evidence.artifactId.split('-');
      parts.forEach(part => {
        if (part.length > 1) tags.add(part.toLowerCase());
      });
    }

    // Facts extraction
    if (evidence.facts) {
      Object.entries(evidence.facts).forEach(([key, value]) => {
        tags.add(key.toLowerCase());
        if (typeof value === 'string') {
          tags.add(value.toLowerCase());
        }
      });
    }

    // Date-based tags
    if (evidence.uploadedAt) {
      const date = new Date(evidence.uploadedAt);
      tags.add(date.getFullYear().toString());
      tags.add(date.toLocaleString('default', { month: 'long' }).toLowerCase());
    }

    return Array.from(tags).filter(tag => tag.length > 1);
  }

  /**
   * Calculate similarity between evidence items
   */
  static calculateSimilarity(evidence1: Evidence, evidence2: Evidence): number {
    let similarity = 0;
    let factors = 0;

    // Type similarity
    if (evidence1.type === evidence2.type) {
      similarity += 0.3;
      if (evidence1.subtype === evidence2.subtype) {
        similarity += 0.1;
      }
    }
    factors++;

    // Text similarity (simple word overlap)
    const text1 = `${evidence1.title} ${evidence1.description || ''}`.toLowerCase();
    const text2 = `${evidence2.title} ${evidence2.description || ''}`.toLowerCase();
    
    const words1 = new Set(text1.match(/\b\w{3,}\b/g) || []);
    const words2 = new Set(text2.match(/\b\w{3,}\b/g) || []);
    
    const intersection = new Set(Array.from(words1).filter(x => words2.has(x)));
    const union = new Set([...Array.from(words1), ...Array.from(words2)]);
    
    if (union.size > 0) {
      similarity += (intersection.size / union.size) * 0.4;
    }
    factors++;

    // Date proximity (within same month gets bonus)
    const date1 = evidence1.uploadedAt ? new Date(evidence1.uploadedAt) : new Date();
    const date2 = evidence2.uploadedAt ? new Date(evidence2.uploadedAt) : new Date();
    const daysDiff = Math.abs(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 30) {
      similarity += Math.max(0, (30 - daysDiff) / 30) * 0.2;
    }
    factors++;

    // Facts overlap
    if (evidence1.facts && evidence2.facts) {
      const facts1 = Object.keys(evidence1.facts);
      const facts2 = Object.keys(evidence2.facts);
      const commonFacts = facts1.filter(key => facts2.includes(key));
      
      if (facts1.length > 0 || facts2.length > 0) {
        similarity += (commonFacts.length / Math.max(facts1.length, facts2.length)) * 0.1;
      }
    }

    return Math.min(similarity, 1);
  }

  /**
   * Find related evidence
   */
  static findRelatedEvidence(evidence: Evidence, allEvidence: Evidence[], threshold: number = 0.3): Evidence[] {
    return allEvidence
      .filter(item => item.id !== evidence.id)
      .map(item => ({
        evidence: item,
        similarity: this.calculateSimilarity(evidence, item),
      }))
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .map(item => item.evidence);
  }

  /**
   * Generate evidence summary for AI analysis
   */
  static generateEvidenceSummary(evidence: Evidence[]): string {
    const metrics = this.calculateEvidenceMetrics(evidence);
    
    let summary = `Evidence Summary:\n`;
    summary += `- Total Evidence: ${metrics.totalCount} items\n`;
    summary += `- Verification Rate: ${Math.round((metrics.verifiedCount + metrics.mintedCount) / metrics.totalCount * 100)}%\n`;
    summary += `- Average Trust Score: ${metrics.averageTrustScore}\n`;
    summary += `- Evidence Types: ${Object.keys(metrics.typeDistribution).join(', ')}\n`;
    
    if (metrics.mintedCount > 0) {
      summary += `- Blockchain Verified: ${metrics.mintedCount} items\n`;
    }

    const keyEvidence = evidence
      .filter(item => (item.trustScore || 0) > 80)
      .sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0))
      .slice(0, 3);

    if (keyEvidence.length > 0) {
      summary += `\nKey Evidence:\n`;
      keyEvidence.forEach(item => {
        summary += `- ${item.title} (Trust: ${item.trustScore})\n`;
      });
    }

    return summary;
  }
}

// Export utility functions
export const EvidenceUtils = {
  getEvidenceTypeIcon: (type: string): string => {
    const icons = {
      document: 'fa-file-alt',
      property_tax: 'fa-home',
      communication: 'fa-envelope',
      financial: 'fa-chart-line',
      legal: 'fa-gavel',
      image: 'fa-image',
    };
    return icons[type as keyof typeof icons] || 'fa-file';
  },

  getEvidenceTypeColor: (type: string): string => {
    const colors = {
      document: 'bg-evidence-document',
      property_tax: 'bg-evidence-financial',
      communication: 'bg-evidence-communication',
      financial: 'bg-evidence-financial',
      legal: 'bg-evidence-legal',
      image: 'bg-evidence-image',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-500';
  },

  getStatusColor: (status: string): string => {
    const colors = {
      verified: 'bg-status-verified/10 text-status-verified',
      pending: 'bg-status-pending/10 text-status-pending',
      minted: 'bg-status-minted/10 text-status-minted',
      failed: 'bg-status-failed/10 text-status-failed',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-600';
  },

  formatFileSize: (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  },

  formatDate: (dateString: string | Date): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  },

  generateArtifactId: (type: string, year?: number): string => {
    const typeMap = {
      document: 'DOC',
      property_tax: 'PTX',
      communication: 'COM',
      financial: 'FIN',
      legal: 'LEG',
      image: 'IMG',
    };
    
    const prefix = typeMap[type as keyof typeof typeMap] || 'EVD';
    const currentYear = year || new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    
    return `${prefix}-${currentYear}-${timestamp}`;
  },

  validateArtifactId: (artifactId: string): boolean => {
    const pattern = /^[A-Z]{2,4}-\d{4}-\d{3,6}$/;
    return pattern.test(artifactId);
  },
};
