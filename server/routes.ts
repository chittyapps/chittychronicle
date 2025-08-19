import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { z } from "zod";
import { insertCaseSchema, insertTimelineEntrySchema, insertTimelineSourceSchema } from "@shared/schema";

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
      res.json(result);
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

  const httpServer = createServer(app);
  return httpServer;
}
