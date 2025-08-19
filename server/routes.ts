import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Case routes
  app.get('/api/cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const cases = await storage.getCases(userId);
      res.json(cases);
    } catch (error) {
      console.error("Error fetching cases:", error);
      res.status(500).json({ message: "Failed to fetch cases" });
    }
  });

  app.get('/api/cases/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const caseRecord = await storage.getCase(req.params.id, userId);
      if (!caseRecord) {
        return res.status(404).json({ message: "Case not found" });
      }
      res.json(caseRecord);
    } catch (error) {
      console.error("Error fetching case:", error);
      res.status(500).json({ message: "Failed to fetch case" });
    }
  });

  app.post('/api/cases', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const caseData = insertCaseSchema.parse({
        ...req.body,
        createdBy: userId,
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

  // Timeline routes
  app.get('/api/timeline/entries', isAuthenticated, async (req: any, res) => {
    try {
      const { caseId, startDate, endDate, entryType, eventSubtype, taskStatus, confidenceLevel, tags, limit, offset } = req.query;
      
      if (!caseId) {
        return res.status(400).json({ message: "caseId is required" });
      }

      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        entryType: entryType as 'task' | 'event',
        eventSubtype: eventSubtype as string,
        taskStatus: taskStatus as string,
        confidenceLevel: confidenceLevel as string,
        tags: tags ? (tags as string).split(',') : undefined,
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

  app.get('/api/timeline/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { caseId } = req.query;
      if (!caseId) {
        return res.status(400).json({ message: "caseId is required" });
      }

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

  app.post('/api/timeline/entries', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entryData = insertTimelineEntrySchema.parse({
        ...req.body,
        createdBy: userId,
        modifiedBy: userId,
      });
      
      const entry = await storage.createTimelineEntry(entryData);
      res.status(201).json({ success: true, entry, chittyId: entry.chittyId });
    } catch (error) {
      console.error("Error creating timeline entry:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create timeline entry" });
    }
  });

  app.put('/api/timeline/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const entryData = req.body;
      
      const entry = await storage.updateTimelineEntry(req.params.id, entryData, userId);
      if (!entry) {
        return res.status(404).json({ message: "Timeline entry not found" });
      }
      
      res.json({ success: true, entry });
    } catch (error) {
      console.error("Error updating timeline entry:", error);
      res.status(500).json({ message: "Failed to update timeline entry" });
    }
  });

  app.delete('/api/timeline/entries/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const success = await storage.deleteTimelineEntry(req.params.id, userId);
      
      if (!success) {
        return res.status(404).json({ message: "Timeline entry not found" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting timeline entry:", error);
      res.status(500).json({ message: "Failed to delete timeline entry" });
    }
  });

  // Source routes
  app.get('/api/timeline/entries/:id/sources', isAuthenticated, async (req: any, res) => {
    try {
      const sources = await storage.getTimelineSources(req.params.id);
      res.json(sources);
    } catch (error) {
      console.error("Error fetching sources:", error);
      res.status(500).json({ message: "Failed to fetch sources" });
    }
  });

  app.post('/api/timeline/entries/:id/sources', isAuthenticated, async (req: any, res) => {
    try {
      const sourceData = insertTimelineSourceSchema.parse({
        ...req.body,
        entryId: req.params.id,
      });
      
      const source = await storage.createTimelineSource(sourceData);
      res.status(201).json(source);
    } catch (error) {
      console.error("Error creating source:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid source data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create source" });
    }
  });

  // Analysis routes
  app.get('/api/timeline/analysis/contradictions', isAuthenticated, async (req: any, res) => {
    try {
      const { caseId } = req.query;
      if (!caseId) {
        return res.status(400).json({ message: "caseId is required" });
      }

      const contradictions = await storage.getContradictions(caseId as string);
      res.json({ contradictions });
    } catch (error) {
      console.error("Error fetching contradictions:", error);
      res.status(500).json({ message: "Failed to fetch contradictions" });
    }
  });

  app.get('/api/timeline/analysis/deadlines', isAuthenticated, async (req: any, res) => {
    try {
      const { caseId, days } = req.query;
      if (!caseId) {
        return res.status(400).json({ message: "caseId is required" });
      }

      const daysAhead = days ? parseInt(days as string) : 30;
      const deadlines = await storage.getUpcomingDeadlines(caseId as string, daysAhead);
      res.json({ deadlines });
    } catch (error) {
      console.error("Error fetching deadlines:", error);
      res.status(500).json({ message: "Failed to fetch deadlines" });
    }
  });

  // Search route
  app.get('/api/timeline/search', isAuthenticated, async (req: any, res) => {
    try {
      const { caseId, q } = req.query;
      if (!caseId || !q) {
        return res.status(400).json({ message: "caseId and q (query) are required" });
      }

      const entries = await storage.searchTimelineEntries(caseId as string, q as string);
      res.json({ entries });
    } catch (error) {
      console.error("Error searching timeline entries:", error);
      res.status(500).json({ message: "Failed to search timeline entries" });
    }
  });

  // Data ingestion routes
  app.post('/api/ingestion/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/ingestion/jobs/:caseId', isAuthenticated, async (req: any, res) => {
    try {
      const jobs = await storage.getDataIngestionJobs(req.params.caseId);
      res.json({ jobs });
    } catch (error) {
      console.error("Error fetching ingestion jobs:", error);
      res.status(500).json({ message: "Failed to fetch ingestion jobs" });
    }
  });

  app.post('/api/ingestion/process', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
  app.post('/api/mcp/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/mcp/integrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/mcp/:integrationId/:action', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.post('/api/mcp/sync/:integrationId/:caseId', isAuthenticated, async (req: any, res) => {
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
  app.post('/api/timeline/detect-contradictions/:caseId', isAuthenticated, async (req: any, res) => {
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
