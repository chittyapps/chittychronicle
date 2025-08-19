import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
// import { chittyAuth, isAuthenticated, hasRole, hasPermission } from "./chittyAuth";
import { z } from "zod";
import { 
  insertCaseSchema, 
  insertTimelineEntrySchema, 
  insertTimelineSourceSchema,
  insertDataIngestionJobSchema,
  insertMcpIntegrationSchema 
} from "@shared/schema";
import { ingestionService } from "./ingestionService";
import { mcpService } from "./mcpService";

export async function registerRoutes(app: Express): Promise<Server> {
  // ChittyID authentication - temporarily disabled for development
  // await chittyAuth.setupAuth(app);

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'healthy', 
      auth: 'Replit',
      timestamp: new Date().toISOString() 
    });
  });

  // Cases
  app.get('/api/cases', async (req: any, res) => {
    try {
      const cases = await storage.getCases('demo-user');
      res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.post('/api/cases', async (req: any, res) => {
    try {
      const caseData = insertCaseSchema.parse({
        ...req.body,
        createdBy: 'demo-user',
      });
      
      const newCase = await storage.createCase(caseData);
      res.status(201).json(newCase);
    } catch (error) {
      console.error("Error creating case:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid case data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create case" });
    }
  });

  app.get('/api/cases/:id', async (req: any, res) => {
    try {
      const caseItem = await storage.getCase(req.params.id, 'demo-user');
      if (!caseItem) {
        return res.status(404).json({ message: "Case not found" });
      }
      res.json(caseItem);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  // Timeline entries
  app.get('/api/timeline/entries', async (req: any, res) => {
    try {
      const { caseId, startDate, endDate, entryType, confidenceLevel, limit, offset } = req.query;

      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        entryType: entryType as string,
        confidenceLevel: confidenceLevel as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const result = await storage.getTimelineEntries(caseId as string, filters);
      res.json({
        entries: result.entries,
        totalCount: result.totalCount,
        hasMore: result.hasMore
      });
    } catch (error) {
      console.error("Error fetching timeline entries:", error);
      res.status(500).json({ message: "Failed to fetch timeline entries" });
    }
  });

  app.post('/api/timeline/entries', async (req: any, res) => {
    try {
      const entryData = insertTimelineEntrySchema.parse({
        ...req.body,
        createdBy: 'demo-user',
        modifiedBy: 'demo-user',
      });
      
      const entry = await storage.createTimelineEntry(entryData);
      res.status(201).json(entry);
    } catch (error) {
      console.error("Error creating timeline entry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create timeline entry" });
    }
  });

  app.get('/api/timeline/entries/:id', async (req: any, res) => {
    try {
      const { caseId } = req.query;
      const entry = await storage.getTimelineEntry(req.params.id, caseId as string);
      if (!entry) {
        return res.status(404).json({ message: "Timeline entry not found" });
      }
      res.json(entry);
    } catch (error) {
      console.error("Error fetching timeline entry:", error);
      res.status(500).json({ message: "Failed to fetch timeline entry" });
    }
  });

  app.put('/api/timeline/entries/:id', async (req: any, res) => {
    try {
      const userId = 'demo-user';
      const entryData = insertTimelineEntrySchema.partial().parse(req.body);
      
      const updatedEntry = await storage.updateTimelineEntry(req.params.id, entryData, userId);
      if (!updatedEntry) {
        return res.status(404).json({ message: "Timeline entry not found" });
      }
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating timeline entry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update timeline entry" });
    }
  });

  app.delete('/api/timeline/entries/:id', async (req: any, res) => {
    try {
      const userId = 'demo-user';
      const success = await storage.deleteTimelineEntry(req.params.id, userId);
      if (!success) {
        return res.status(404).json({ message: "Timeline entry not found" });
      }
      res.json({ message: "Timeline entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting timeline entry:", error);
      res.status(500).json({ message: "Failed to delete timeline entry" });
    }
  });

  // Timeline sources
  app.get('/api/timeline/entries/:entryId/sources', async (req: any, res) => {
    try {
      const sources = await storage.getTimelineSources(req.params.entryId);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching timeline sources:", error);
      res.status(500).json({ message: "Failed to fetch timeline sources" });
    }
  });

  app.post('/api/timeline/entries/:entryId/sources', async (req: any, res) => {
    try {
      const sourceData = insertTimelineSourceSchema.parse({
        ...req.body,
        entryId: req.params.entryId,
      });
      
      const source = await storage.createTimelineSource(sourceData);
      res.status(201).json(source);
    } catch (error) {
      console.error("Error creating timeline source:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid source data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create timeline source" });
    }
  });

  // Search
  app.get('/api/timeline/search', async (req: any, res) => {
    try {
      const { caseId, query } = req.query;
      
      if (!caseId || !query) {
        return res.status(400).json({ message: "caseId and query are required" });
      }
      
      const entries = await storage.searchTimelineEntries(caseId as string, query as string);
      res.json(entries);
    } catch (error) {
      console.error("Error searching timeline entries:", error);
      res.status(500).json({ message: "Failed to search timeline entries" });
    }
  });

  // Data ingestion routes
  app.post('/api/ingestion/jobs', async (req: any, res) => {
    try {
      const userId = 'demo-user';
      const jobData = insertDataIngestionJobSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      const jobId = await ingestionService.createIngestionJob(jobData);
      res.status(201).json({ success: true, jobId });
    } catch (error) {
      console.error("Error creating ingestion job:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid job data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create ingestion job" });
    }
  });

  app.get('/api/ingestion/jobs/:caseId', async (req: any, res) => {
    try {
      const jobs = await storage.getDataIngestionJobs(req.params.caseId);
      res.json({ jobs });
    } catch (error) {
      console.error("Error fetching ingestion jobs:", error);
      res.status(500).json({ message: "Failed to fetch ingestion jobs" });
    }
  });

  app.post('/api/ingestion/process', async (req: any, res) => {
    try {
      const userId = 'demo-user';
      const { caseId, documents } = req.body;
      
      if (!caseId || !documents || !Array.isArray(documents)) {
        return res.status(400).json({ message: "caseId and documents array are required" });
      }

      // Create ingestion job
      const jobData = {
        caseId,
        source: 'manual_upload' as const,
        sourceIdentifier: 'Direct Upload',
        status: 'processing' as const,
        createdBy: userId,
        metadata: { documentCount: documents.length }
      };

      const jobId = await ingestionService.createIngestionJob(jobData);

      // Process documents
      const result = await ingestionService.processDocuments(caseId, documents, userId);
      
      // Update job status
      await ingestionService.updateIngestionJobStatus(jobId, 'completed', result);

      res.json({ 
        success: true, 
        jobId, 
        result,
        message: `Processed ${result.documentsProcessed} documents, created ${result.entriesCreated} timeline entries`
      });
    } catch (error) {
      console.error("Error processing documents:", error);
      res.status(500).json({ message: "Failed to process documents" });
    }
  });

  // MCP Integration routes
  app.post('/api/mcp/integrations', async (req: any, res) => {
    try {
      const userId = 'demo-user';
      const integrationData = insertMcpIntegrationSchema.parse({
        ...req.body,
        createdBy: userId,
      });
      
      const integration = await mcpService.createIntegration(integrationData);
      res.status(201).json({ success: true, integration });
    } catch (error) {
      console.error("Error creating MCP integration:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid integration data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create MCP integration" });
    }
  });

  app.get('/api/mcp/integrations', async (req: any, res) => {
    try {
      const userId = 'demo-user';
      const integrations = await mcpService.getActiveIntegrations(userId);
      res.json({ integrations });
    } catch (error) {
      console.error("Error fetching MCP integrations:", error);
      res.status(500).json({ message: "Failed to fetch MCP integrations" });
    }
  });

  app.get('/api/mcp/config/:platform', async (req: any, res) => {
    try {
      const { platform } = req.params;
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      
      const config = mcpService.generateMcpConfig(platform, baseUrl);
      res.json(config);
    } catch (error) {
      console.error("Error generating MCP config:", error);
      res.status(500).json({ message: "Failed to generate MCP config" });
    }
  });

  app.post('/api/mcp/:integrationId/:action', async (req: any, res) => {
    try {
      const userId = 'demo-user';
      const { integrationId, action } = req.params;
      
      const result = await mcpService.processMcpRequest(integrationId, action, req.body, userId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(result.statusCode || 400).json(result);
      }
    } catch (error) {
      console.error("Error processing MCP request:", error);
      res.status(500).json({ message: "Failed to process MCP request" });
    }
  });

  app.post('/api/mcp/sync/:integrationId/:caseId', async (req: any, res) => {
    try {
      const { integrationId, caseId } = req.params;
      
      const result = await mcpService.syncToExternalPlatform(integrationId, caseId);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(result.statusCode || 400).json(result);
      }
    } catch (error) {
      console.error("Error syncing to external platform:", error);
      res.status(500).json({ message: "Failed to sync to external platform" });
    }
  });

  // Contradiction detection endpoint
  app.post('/api/timeline/detect-contradictions/:caseId', async (req: any, res) => {
    try {
      const contradictions = await ingestionService.detectContradictions(req.params.caseId);
      res.json({ contradictions });
    } catch (error) {
      console.error("Error detecting contradictions:", error);
      res.status(500).json({ message: "Failed to detect contradictions" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}