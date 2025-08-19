/**
 * ChittyChain Evidence Ledger - Notion API Client
 * Seamless integration with Notion databases for evidence management
 */

import { Client } from "@notionhq/client";
import {
  MasterEvidence,
  AtomicFact,
  Case,
  User,
  ChainOfCustodyLog,
  ContradictionTracking,
  AuditTrail,
  EvidenceType,
  EvidenceTier,
  FactType,
  UserType,
  ActionType
} from '../schemas/types';

interface NotionDatabaseConfig {
  masterEvidence: string;
  atomicFacts: string;
  cases: string;
  users: string;
  chainOfCustody: string;
  contradictions: string;
  auditTrail: string;
}

export class NotionEvidenceClient {
  private notion: Client;
  private databases: NotionDatabaseConfig;

  constructor() {
    this.notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });
    
    // Database IDs from environment variables
    this.databases = {
      masterEvidence: process.env.NOTION_MASTER_EVIDENCE_DB_ID!,
      atomicFacts: process.env.NOTION_ATOMIC_FACTS_DB_ID!,
      cases: process.env.NOTION_CASES_DB_ID!,
      users: process.env.NOTION_USERS_DB_ID!,
      chainOfCustody: process.env.NOTION_CHAIN_OF_CUSTODY_DB_ID!,
      contradictions: process.env.NOTION_CONTRADICTIONS_DB_ID!,
      auditTrail: process.env.NOTION_AUDIT_TRAIL_DB_ID!
    };
  }

  // ===== MASTER EVIDENCE OPERATIONS =====
  
  async createEvidence(evidence: MasterEvidence): Promise<string> {
    try {
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databases.masterEvidence,
        },
        properties: {
          "Evidence ID": {
            title: [
              {
                text: {
                  content: evidence.originalFilename,
                },
              },
            ],
          },
          "Case Binding": {
            relation: evidence.caseBinding ? [{ id: evidence.caseBinding }] : [],
          },
          "User Binding": {
            relation: evidence.userBinding ? [{ id: evidence.userBinding }] : [],
          },
          "Evidence Type": {
            select: {
              name: evidence.evidenceType,
            },
          },
          "Evidence Tier": {
            select: {
              name: evidence.evidenceTier,
            },
          },
          "Content Hash": {
            rich_text: [
              {
                text: {
                  content: evidence.contentHash,
                },
              },
            ],
          },
          "Original Filename": {
            rich_text: [
              {
                text: {
                  content: evidence.originalFilename,
                },
              },
            ],
          },
          "Upload Date": {
            date: {
              start: evidence.uploadDate.toISOString().split('T')[0],
            },
          },
          "Source Verification Status": {
            select: {
              name: evidence.sourceVerificationStatus,
            },
          },
          "Authentication Method": {
            select: {
              name: evidence.authenticationMethod,
            },
          },
          "Supporting Claims": {
            multi_select: evidence.supportingClaims.map(claim => ({ name: claim })),
          },
          "Contradicting Claims": {
            multi_select: evidence.contradictingClaims.map(claim => ({ name: claim })),
          },
          "Minting Status": {
            select: {
              name: evidence.mintingStatus,
            },
          },
          "Block Number": {
            rich_text: evidence.blockNumber ? [
              {
                text: {
                  content: evidence.blockNumber,
                },
              },
            ] : [],
          },
          "Audit Notes": {
            rich_text: [
              {
                text: {
                  content: evidence.auditNotes,
                },
              },
            ],
          },
          "File Size": {
            number: evidence.fileSize || 0,
          },
          "IPFS Hash": {
            rich_text: evidence.ipfsHash ? [
              {
                text: {
                  content: evidence.ipfsHash,
                },
              },
            ] : [],
          },
          "Encryption Status": {
            checkbox: evidence.encryptionStatus || false,
          },
          "Redaction Level": {
            select: {
              name: evidence.redactionLevel || "None",
            },
          },
        },
      });

      return response.id;
    } catch (error) {
      console.error('Error creating evidence in Notion:', error);
      throw error;
    }
  }

  async updateEvidence(evidenceId: string, updates: Partial<MasterEvidence>): Promise<void> {
    try {
      const properties: any = {};

      if (updates.sourceVerificationStatus) {
        properties["Source Verification Status"] = {
          select: { name: updates.sourceVerificationStatus }
        };
      }

      if (updates.mintingStatus) {
        properties["Minting Status"] = {
          select: { name: updates.mintingStatus }
        };
      }

      if (updates.blockNumber) {
        properties["Block Number"] = {
          rich_text: [{ text: { content: updates.blockNumber } }]
        };
      }

      if (updates.auditNotes) {
        properties["Audit Notes"] = {
          rich_text: [{ text: { content: updates.auditNotes } }]
        };
      }

      await this.notion.pages.update({
        page_id: evidenceId,
        properties,
      });
    } catch (error) {
      console.error('Error updating evidence in Notion:', error);
      throw error;
    }
  }

  async getEvidence(evidenceId: string): Promise<MasterEvidence | null> {
    try {
      const response = await this.notion.pages.retrieve({
        page_id: evidenceId,
      });

      return this.mapNotionToEvidence(response);
    } catch (error) {
      console.error('Error getting evidence from Notion:', error);
      return null;
    }
  }

  async searchEvidence(filters: {
    caseId?: string;
    userId?: string;
    evidenceType?: EvidenceType;
    verificationStatus?: string;
    minWeight?: number;
  }): Promise<MasterEvidence[]> {
    try {
      const notionFilters: any = { and: [] };

      if (filters.caseId) {
        notionFilters.and.push({
          property: "Case Binding",
          relation: {
            contains: filters.caseId
          }
        });
      }

      if (filters.evidenceType) {
        notionFilters.and.push({
          property: "Evidence Type",
          select: {
            equals: filters.evidenceType
          }
        });
      }

      if (filters.verificationStatus) {
        notionFilters.and.push({
          property: "Source Verification Status",
          select: {
            equals: filters.verificationStatus
          }
        });
      }

      const response = await this.notion.databases.query({
        database_id: this.databases.masterEvidence,
        filter: notionFilters.and.length > 0 ? notionFilters : undefined,
        sorts: [
          {
            property: "Upload Date",
            direction: "descending"
          }
        ]
      });

      return response.results.map(page => this.mapNotionToEvidence(page)).filter(Boolean) as MasterEvidence[];
    } catch (error) {
      console.error('Error searching evidence in Notion:', error);
      return [];
    }
  }

  // ===== ATOMIC FACTS OPERATIONS =====

  async createFact(fact: AtomicFact): Promise<string> {
    try {
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databases.atomicFacts,
        },
        properties: {
          "Fact Statement": {
            title: [
              {
                text: {
                  content: fact.factText,
                },
              },
            ],
          },
          "Parent Document": {
            relation: fact.parentDocument ? [{ id: fact.parentDocument }] : [],
          },
          "Fact Type": {
            select: {
              name: fact.factType,
            },
          },
          "Location in Document": {
            rich_text: [
              {
                text: {
                  content: fact.locationInDocument,
                },
              },
            ],
          },
          "Classification Level": {
            select: {
              name: fact.classificationLevel,
            },
          },
          "Weight": {
            number: fact.weight,
          },
          "Against Interest": {
            checkbox: fact.credibilityFactors.includes('Against Interest'),
          },
          "Contemporaneous": {
            checkbox: fact.credibilityFactors.includes('Contemporaneous'),
          },
          "Business Duty": {
            checkbox: fact.credibilityFactors.includes('Business Duty'),
          },
          "Official Duty": {
            checkbox: fact.credibilityFactors.includes('Official Duty'),
          },
          "Supports Case Theory": {
            multi_select: fact.supportsCaseTheory.map(theory => ({ name: theory })),
          },
          "Contradicts Case Theory": {
            multi_select: fact.contradictsCaseTheory.map(theory => ({ name: theory })),
          },
          "ChittyChain Status": {
            select: {
              name: fact.chittyChainStatus,
            },
          },
          "Verification Date": fact.verificationDate ? {
            date: {
              start: fact.verificationDate.toISOString().split('T')[0],
            },
          } : {},
          "Verification Method": {
            rich_text: fact.verificationMethod ? [
              {
                text: {
                  content: fact.verificationMethod,
                },
              },
            ] : [],
          },
          "Extraction Method": {
            select: {
              name: fact.extractionMethod || 'Manual',
            },
          },
          "Extraction Confidence": {
            number: fact.extractionConfidence || 1.0,
          },
        },
      });

      return response.id;
    } catch (error) {
      console.error('Error creating fact in Notion:', error);
      throw error;
    }
  }

  async linkRelatedFacts(factId1: string, factId2: string): Promise<void> {
    try {
      // Get both facts to update their related facts
      const fact1Response = await this.notion.pages.retrieve({ page_id: factId1 });
      const fact2Response = await this.notion.pages.retrieve({ page_id: factId2 });

      // Update fact1 to include fact2 in related facts
      await this.notion.pages.update({
        page_id: factId1,
        properties: {
          "Related Facts": {
            relation: [{ id: factId2 }]
          }
        }
      });

      // Update fact2 to include fact1 in related facts  
      await this.notion.pages.update({
        page_id: factId2,
        properties: {
          "Related Facts": {
            relation: [{ id: factId1 }]
          }
        }
      });
    } catch (error) {
      console.error('Error linking facts in Notion:', error);
      throw error;
    }
  }

  // ===== CASES OPERATIONS =====

  async createCase(caseData: Case): Promise<string> {
    try {
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databases.cases,
        },
        properties: {
          "Case Name": {
            title: [
              {
                text: {
                  content: caseData.caseId, // Using caseId as the display name
                },
              },
            ],
          },
          "Jurisdiction": {
            select: {
              name: caseData.jurisdiction,
            },
          },
          "Case Number": {
            rich_text: [
              {
                text: {
                  content: caseData.caseNumber,
                },
              },
            ],
          },
          "Case Type": {
            select: {
              name: caseData.caseType,
            },
          },
          "Filing Date": {
            date: {
              start: caseData.filingDate.toISOString().split('T')[0],
            },
          },
          "Judge Assigned": {
            rich_text: caseData.judgeAssigned ? [
              {
                text: {
                  content: caseData.judgeAssigned,
                },
              },
            ] : [],
          },
          "Case Status": {
            select: {
              name: caseData.caseStatus,
            },
          },
          "Priority": {
            select: {
              name: caseData.priority || 'Medium',
            },
          },
        },
      });

      return response.id;
    } catch (error) {
      console.error('Error creating case in Notion:', error);
      throw error;
    }
  }

  // ===== USERS OPERATIONS =====

  async createUser(user: User): Promise<string> {
    try {
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databases.users,
        },
        properties: {
          "Full Name": {
            title: [
              {
                text: {
                  content: user.fullName,
                },
              },
            ],
          },
          "User Type": {
            select: {
              name: user.userType,
            },
          },
          "Bar Number": {
            rich_text: user.barNumber ? [
              {
                text: {
                  content: user.barNumber,
                },
              },
            ] : [],
          },
          "Email": {
            email: user.email,
          },
          "Phone": {
            phone_number: user.phone || '',
          },
          "Verified Status": {
            checkbox: user.verifiedStatus,
          },
          "Trust Score": {
            number: user.trustScore,
          },
          "2FA Enabled": {
            checkbox: user.twoFactorEnabled,
          },
          "Account Locked": {
            checkbox: user.accountLocked || false,
          },
        },
      });

      return response.id;
    } catch (error) {
      console.error('Error creating user in Notion:', error);
      throw error;
    }
  }

  // ===== CONTRADICTION TRACKING =====

  async createContradiction(contradiction: ContradictionTracking): Promise<string> {
    try {
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databases.contradictions,
        },
        properties: {
          "Contradiction Summary": {
            title: [
              {
                text: {
                  content: `${contradiction.conflictType} - ${contradiction.contradictionId}`,
                },
              },
            ],
          },
          "Conflicting Facts": {
            relation: contradiction.conflictingFacts.map(factId => ({ id: factId })),
          },
          "Conflict Type": {
            select: {
              name: contradiction.conflictType,
            },
          },
          "Severity": {
            select: {
              name: contradiction.severity || 'Moderate',
            },
          },
          "Impact on Case": {
            rich_text: [
              {
                text: {
                  content: contradiction.impactOnCase,
                },
              },
            ],
          },
          "Reviewer Notes": {
            rich_text: contradiction.reviewerNotes ? [
              {
                text: {
                  content: contradiction.reviewerNotes,
                },
              },
            ] : [],
          },
          "Appealable": {
            checkbox: contradiction.appealable || false,
          },
        },
      });

      return response.id;
    } catch (error) {
      console.error('Error creating contradiction in Notion:', error);
      throw error;
    }
  }

  // ===== AUDIT TRAIL =====

  async logAuditAction(audit: AuditTrail): Promise<string> {
    try {
      const response = await this.notion.pages.create({
        parent: {
          database_id: this.databases.auditTrail,
        },
        properties: {
          "Action Description": {
            title: [
              {
                text: {
                  content: `${audit.actionType} by ${audit.user}`,
                },
              },
            ],
          },
          "User": {
            relation: [{ id: audit.user }],
          },
          "Action Type": {
            select: {
              name: audit.actionType,
            },
          },
          "Target Artifact": audit.targetArtifact ? {
            relation: [{ id: audit.targetArtifact }],
          } : {},
          "IP Address": {
            rich_text: [
              {
                text: {
                  content: audit.ipAddress,
                },
              },
            ],
          },
          "Session ID": {
            rich_text: [
              {
                text: {
                  content: audit.sessionId,
                },
              },
            ],
          },
          "Success/Failure": {
            select: {
              name: audit.successFailure,
            },
          },
          "Duration (ms)": {
            number: audit.duration || 0,
          },
          "Details": {
            rich_text: [
              {
                text: {
                  content: audit.details,
                },
              },
            ],
          },
        },
      });

      return response.id;
    } catch (error) {
      console.error('Error logging audit action in Notion:', error);
      throw error;
    }
  }

  // ===== UTILITY METHODS =====

  private mapNotionToEvidence(notionPage: any): MasterEvidence | null {
    try {
      const props = notionPage.properties;
      
      return {
        artifactId: this.extractText(props["Artifact ID"]) || '',
        caseBinding: this.extractRelationId(props["Case Binding"]) || '',
        userBinding: this.extractRelationId(props["User Binding"]) || '',
        evidenceType: this.extractSelect(props["Evidence Type"]) as EvidenceType,
        evidenceTier: this.extractSelect(props["Evidence Tier"]) as EvidenceTier,
        evidenceWeight: this.extractNumber(props["Evidence Weight"]) || 0,
        contentHash: this.extractText(props["Content Hash"]) || '',
        originalFilename: this.extractText(props["Original Filename"]) || '',
        uploadDate: new Date(this.extractDate(props["Upload Date"]) || Date.now()),
        sourceVerificationStatus: this.extractSelect(props["Source Verification Status"]) as any,
        authenticationMethod: this.extractSelect(props["Authentication Method"]) as any,
        chainOfCustody: this.extractRelationIds(props["Chain of Custody"]) || [],
        extractedFacts: this.extractRelationIds(props["Extracted Facts"]) || [],
        supportingClaims: this.extractMultiSelect(props["Supporting Claims"]) || [],
        contradictingClaims: this.extractMultiSelect(props["Contradicting Claims"]) || [],
        mintingStatus: this.extractSelect(props["Minting Status"]) as any,
        blockNumber: this.extractText(props["Block Number"]),
        auditNotes: this.extractText(props["Audit Notes"]) || '',
        fileSize: this.extractNumber(props["File Size"]),
        ipfsHash: this.extractText(props["IPFS Hash"]),
        encryptionStatus: this.extractCheckbox(props["Encryption Status"]),
        redactionLevel: this.extractSelect(props["Redaction Level"]) as any
      };
    } catch (error) {
      console.error('Error mapping Notion page to evidence:', error);
      return null;
    }
  }

  private extractText(property: any): string | undefined {
    if (property?.type === 'rich_text' && property.rich_text?.[0]) {
      return property.rich_text[0].text.content;
    }
    if (property?.type === 'title' && property.title?.[0]) {
      return property.title[0].text.content;
    }
    return undefined;
  }

  private extractSelect(property: any): string | undefined {
    return property?.type === 'select' ? property.select?.name : undefined;
  }

  private extractMultiSelect(property: any): string[] | undefined {
    return property?.type === 'multi_select' 
      ? property.multi_select.map((item: any) => item.name)
      : undefined;
  }

  private extractNumber(property: any): number | undefined {
    return property?.type === 'number' ? property.number : undefined;
  }

  private extractDate(property: any): string | undefined {
    return property?.type === 'date' ? property.date?.start : undefined;
  }

  private extractCheckbox(property: any): boolean | undefined {
    return property?.type === 'checkbox' ? property.checkbox : undefined;
  }

  private extractRelationId(property: any): string | undefined {
    return property?.type === 'relation' && property.relation?.[0] 
      ? property.relation[0].id 
      : undefined;
  }

  private extractRelationIds(property: any): string[] | undefined {
    return property?.type === 'relation' 
      ? property.relation.map((rel: any) => rel.id)
      : undefined;
  }
}