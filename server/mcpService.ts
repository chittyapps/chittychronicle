import type { InsertMcpIntegration, McpIntegration } from "@shared/schema";
import { storage } from "./storage";
import { emitContextEvent } from "./contextEmitter";

export interface McpTimelineData {
  entries: Array<{
    date: string;
    description: string;
    type: 'task' | 'event';
    confidence: 'high' | 'medium' | 'low';
    sources?: string[];
  }>;
  metadata: {
    platform: string;
    extractedAt: string;
    totalEntries: number;
  };
}

export interface McpApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export class McpIntegrationService {
  
  // Generate MCP configuration for different AI platforms
  generateMcpConfig(platform: 'claude' | 'chatgpt' | 'custom', baseUrl: string): any {
    const baseConfig = {
      name: "chitty-chronicle",
      version: "1.0.0",
      description: "ChittyChronicle Legal Timeline Management Integration",
      capabilities: {
        timeline_management: true,
        document_ingestion: true,
        case_analysis: true,
        deadline_tracking: true,
        contradiction_detection: true
      },
      endpoints: {
        base_url: baseUrl,
        timeline_entries: "/api/mcp/timeline",
        case_management: "/api/mcp/cases",
        ingestion: "/api/mcp/ingest",
        analysis: "/api/mcp/analyze"
      }
    };
    
    switch (platform) {
      case 'claude':
        return {
          ...baseConfig,
          claude_specific: {
            tool_definitions: [
              {
                name: "create_timeline_entry",
                description: "Create a new timeline entry for a legal case",
                parameters: {
                  type: "object",
                  properties: {
                    caseId: { type: "string", description: "Case identifier" },
                    date: { type: "string", description: "Entry date (YYYY-MM-DD)" },
                    description: { type: "string", description: "Entry description" },
                    type: { type: "string", enum: ["task", "event"] },
                    subtype: { type: "string", description: "Event or task subtype" }
                  },
                  required: ["caseId", "date", "description", "type"]
                }
              },
              {
                name: "analyze_case_timeline",
                description: "Analyze a case timeline for contradictions and insights",
                parameters: {
                  type: "object",
                  properties: {
                    caseId: { type: "string", description: "Case identifier" }
                  },
                  required: ["caseId"]
                }
              },
              {
                name: "ingest_documents",
                description: "Automatically ingest and analyze legal documents",
                parameters: {
                  type: "object",
                  properties: {
                    caseId: { type: "string", description: "Case identifier" },
                    documents: { 
                      type: "array", 
                      items: { 
                        type: "object",
                        properties: {
                          content: { type: "string" },
                          fileName: { type: "string" }
                        }
                      }
                    }
                  },
                  required: ["caseId", "documents"]
                }
              }
            ]
          }
        };
        
      case 'chatgpt':
        return {
          ...baseConfig,
          openapi: "3.0.0",
          info: {
            title: "ChittyChronicle API",
            version: "1.0.0",
            description: "Legal timeline management and document analysis"
          },
          servers: [{ url: baseUrl }],
          paths: {
            "/api/mcp/timeline": {
              post: {
                operationId: "createTimelineEntry",
                summary: "Create timeline entry",
                requestBody: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          caseId: { type: "string" },
                          date: { type: "string" },
                          description: { type: "string" },
                          type: { type: "string", enum: ["task", "event"] }
                        }
                      }
                    }
                  }
                }
              }
            },
            "/api/mcp/analyze": {
              post: {
                operationId: "analyzeCase",
                summary: "Analyze case timeline",
                requestBody: {
                  content: {
                    "application/json": {
                      schema: {
                        type: "object",
                        properties: {
                          caseId: { type: "string" }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        };
        
      default:
        return baseConfig;
    }
  }
  
  // Create MCP integration
  async createIntegration(integrationData: InsertMcpIntegration): Promise<McpIntegration> {
    return await storage.createMcpIntegration(integrationData);
  }
  
  // Get active integrations
  async getActiveIntegrations(userId: string): Promise<McpIntegration[]> {
    return await storage.getMcpIntegrations(userId);
  }
  
  // Process MCP request from external AI system
  async processMcpRequest(
    integrationId: string,
    action: string,
    payload: any,
    userId: string
  ): Promise<McpApiResponse> {
    try {
      const integration = await storage.getMcpIntegration(integrationId);
      if (!integration || integration.isActive !== 'true') {
        return {
          success: false,
          error: "Integration not found or inactive",
          statusCode: 404
        };
      }
      
      switch (action) {
        case 'create_timeline_entry':
          return await this.handleCreateTimelineEntry(payload, userId);

        case 'analyze_case':
          return await this.handleAnalyzeCase(payload, userId);

        case 'ingest_documents':
          return await this.handleIngestDocuments(payload, userId);

        case 'get_timeline':
          return await this.handleGetTimeline(payload, userId);

        // New actions aligned with manifest
        case 'verify_event':
          return await this.handleVerifyEvent(payload);

        case 'certify_event':
          return await this.handleCertifyEvent(payload);

        case 'mint_event':
          return await this.handleMintEvent(payload);

        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
            statusCode: 400
          };
      }
      
    } catch (error) {
      return {
        success: false,
        error: `Server error: ${error}`,
        statusCode: 500
      };
    }
  }

  private async handleVerifyEvent(payload: any): Promise<McpApiResponse> {
    try {
      const { caseId, entryId } = payload;
      if (!caseId || !entryId) {
        return { success: false, error: 'caseId and entryId are required', statusCode: 400 };
      }

      const entry = await storage.getTimelineEntry(entryId, caseId);
      if (!entry) {
        return { success: false, error: 'Entry not found', statusCode: 404 };
      }

      const { chittyTrust } = await import('./chittyTrust');
      const trustScore = await chittyTrust.calculateTrustScore(entry);

      await emitContextEvent('timeline.entry.verified', {
        subject_id: entry.chittyId || entry.id,
        related_ids: [caseId],
        payload: {
          entryId,
          caseId,
          trustScore,
        },
      });

      return {
        success: true,
        data: {
          entryId,
          caseId,
          trustScore,
        },
      };
    } catch (error) {
      return { success: false, error: `Failed to verify event: ${error}`, statusCode: 500 };
    }
  }

  private async handleCertifyEvent(payload: any): Promise<McpApiResponse> {
    try {
      const { caseId, entryId } = payload;
      if (!caseId || !entryId) {
        return { success: false, error: 'caseId and entryId are required', statusCode: 400 };
      }

      // For now, certification requires external service configuration.
      const certifyBase = process.env.CHITTYCERTIFY_BASE_URL || process.env.CHITTY_CERTIFY_URL;
      if (!certifyBase) {
        return {
          success: false,
          error: 'Certification service not configured (CHITTYCERTIFY_BASE_URL)',
          statusCode: 501,
        };
      }

      // Minimal local acknowledgment; external call intentionally not performed here to avoid side effects.
      return {
        success: true,
        data: {
          entryId,
          caseId,
          certification: {
            requested: true,
            service: certifyBase,
          },
        },
      };
    } catch (error) {
      return { success: false, error: `Failed to certify event: ${error}`, statusCode: 500 };
    }
  }

  private async handleMintEvent(payload: any): Promise<McpApiResponse> {
    try {
      const { caseId, entryId } = payload;
      if (!caseId || !entryId) {
        return { success: false, error: 'caseId and entryId are required', statusCode: 400 };
      }

      const entry = await storage.getTimelineEntry(entryId, caseId);
      if (!entry) {
        return { success: false, error: 'Entry not found', statusCode: 404 };
      }

      const { chittyTrust } = await import('./chittyTrust');
      const trustScore = await chittyTrust.calculateTrustScore(entry);
      const attestation = await chittyTrust.createAttestation(entry, trustScore);

      // Emit context (best-effort)
      await emitContextEvent('timeline.entry.minted', {
        subject_id: entry.chittyId || entry.id,
        related_ids: [caseId],
        payload: {
          entryId,
          caseId,
          attestation: {
            hash: attestation.attestationHash,
            txId: attestation.blockchainTxId,
            score: trustScore.score,
            confidence: trustScore.confidence,
          },
        }
      });

      return {
        success: true,
        data: {
          entryId,
          caseId,
          attestation,
        },
      };
    } catch (error) {
      return { success: false, error: `Failed to mint event: ${error}`, statusCode: 500 };
    }
  }
  
  private async handleCreateTimelineEntry(payload: any, userId: string): Promise<McpApiResponse> {
    try {
      const { caseId, date, description, type, subtype, confidence = 'medium' } = payload;
      
      const entryData = {
        caseId,
        entryType: type,
        eventSubtype: type === 'event' ? subtype : undefined,
        taskSubtype: type === 'task' ? subtype : undefined,
        date,
        description,
        confidenceLevel: confidence,
        eventStatus: type === 'event' ? ('occurred' as const) : undefined,
        taskStatus: type === 'task' ? ('pending' as const) : undefined,
        createdBy: userId,
        modifiedBy: userId,
        metadata: {
          createdVia: 'mcp_integration',
          automated: true
        }
      };
      
      const entry = await storage.createTimelineEntry(entryData);
      
      return {
        success: true,
        data: {
          entryId: entry.id,
          chittyId: entry.chittyId,
          message: "Timeline entry created successfully"
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create timeline entry: ${error}`,
        statusCode: 400
      };
    }
  }
  
  private async handleAnalyzeCase(payload: any, userId: string): Promise<McpApiResponse> {
    try {
      const { caseId } = payload;
      
      // Get timeline entries
      const timelineResult = await storage.getTimelineEntries(caseId, {});
      
      // Get contradictions
      const contradictions = await storage.getContradictions(caseId);
      
      // Get upcoming deadlines
      const deadlines = await storage.getUpcomingDeadlines(caseId, 30);
      
      // Basic analysis
      const analysis = {
        totalEntries: timelineResult.totalCount,
        entriesByType: {
          tasks: timelineResult.entries.filter(e => e.entryType === 'task').length,
          events: timelineResult.entries.filter(e => e.entryType === 'event').length
        },
        confidenceLevels: {
          high: timelineResult.entries.filter(e => e.confidenceLevel === 'high').length,
          medium: timelineResult.entries.filter(e => e.confidenceLevel === 'medium').length,
          low: timelineResult.entries.filter(e => e.confidenceLevel === 'low').length
        },
        contradictions: contradictions.length,
        upcomingDeadlines: deadlines.length,
        dateRange: {
          earliest: timelineResult.entries.reduce((min, entry) => 
            entry.date < min ? entry.date : min, timelineResult.entries[0]?.date || ''),
          latest: timelineResult.entries.reduce((max, entry) => 
            entry.date > max ? entry.date : max, timelineResult.entries[0]?.date || '')
        }
      };
      
      return {
        success: true,
        data: {
          analysis,
          contradictions,
          deadlines,
          recommendations: this.generateRecommendations(analysis, contradictions, deadlines)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze case: ${error}`,
        statusCode: 400
      };
    }
  }
  
  private async handleIngestDocuments(payload: any, userId: string): Promise<McpApiResponse> {
    try {
      const { caseId, documents } = payload;
      
      // Create ingestion job
      const jobData = {
        caseId,
        source: 'mcp_extension' as const,
        sourceIdentifier: 'AI Platform Integration',
        status: 'processing' as const,
        createdBy: userId,
        metadata: {
          platform: 'mcp_integration',
          documentCount: documents.length
        }
      };
      
      const job = await storage.createDataIngestionJob(jobData);
      
      // Process documents (this would be done asynchronously in production)
      const { ingestionService } = await import('./ingestionService');
      const result = await ingestionService.processDocuments(
        caseId,
        documents.map((doc: any) => ({
          fileName: doc.fileName || 'unnamed_document.txt',
          content: doc.content,
          filePath: `/mcp_uploads/${doc.fileName || 'unnamed_document.txt'}`
        })),
        userId
      );
      
      // Update job status
      await ingestionService.updateIngestionJobStatus(job.id, 'completed', result);
      
      return {
        success: true,
        data: {
          jobId: job.id,
          result,
          message: `Processed ${result.documentsProcessed} documents, created ${result.entriesCreated} timeline entries`
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to ingest documents: ${error}`,
        statusCode: 400
      };
    }
  }
  
  private async handleGetTimeline(payload: any, userId: string): Promise<McpApiResponse> {
    try {
      const { caseId, startDate, endDate, limit = 50 } = payload;
      
      const result = await storage.getTimelineEntries(caseId, {
        startDate,
        endDate,
        limit
      });
      
      return {
        success: true,
        data: {
          entries: result.entries,
          totalCount: result.totalCount,
          hasMore: result.hasMore
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get timeline: ${error}`,
        statusCode: 400
      };
    }
  }
  
  private generateRecommendations(analysis: any, contradictions: any[], deadlines: any[]): string[] {
    const recommendations: string[] = [];
    
    if (contradictions.length > 0) {
      recommendations.push(`Review ${contradictions.length} timeline contradictions that need resolution`);
    }
    
    if (deadlines.length > 0) {
      recommendations.push(`${deadlines.length} upcoming deadlines in the next 30 days require attention`);
    }
    
    if (analysis.confidenceLevels.low > analysis.totalEntries * 0.3) {
      recommendations.push('Consider verifying entries with low confidence levels');
    }
    
    if (analysis.entriesByType.tasks > analysis.entriesByType.events * 2) {
      recommendations.push('Timeline has many tasks but few documented events - consider adding more event documentation');
    }
    
    return recommendations;
  }
  
  // Sync data to external platform
  async syncToExternalPlatform(integrationId: string, caseId: string): Promise<McpApiResponse> {
    try {
      const integration = await storage.getMcpIntegration(integrationId);
      if (!integration) {
        return {
          success: false,
          error: "Integration not found",
          statusCode: 404
        };
      }
      
      const timelineData = await storage.getTimelineEntries(caseId, {});
      
      // Format data for external platform
      const mcpData: McpTimelineData = {
        entries: timelineData.entries.map(entry => ({
          date: entry.date,
          description: entry.description,
          type: entry.entryType,
          confidence: entry.confidenceLevel === 'unverified' ? 'low' : entry.confidenceLevel,
          sources: []
        })),
        metadata: {
          platform: integration.platform,
          extractedAt: new Date().toISOString(),
          totalEntries: timelineData.totalCount
        }
      };
      
      // Update last sync
      await storage.updateMcpIntegration(integrationId, {
        lastSyncDate: new Date(),
        syncStatus: 'completed'
      });
      
      return {
        success: true,
        data: mcpData
      };
    } catch (error) {
      return {
        success: false,
        error: `Sync failed: ${error}`,
        statusCode: 500
      };
    }
  }
}

export const mcpService = new McpIntegrationService();
