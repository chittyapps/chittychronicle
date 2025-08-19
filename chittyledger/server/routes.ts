import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEvidenceSchema, insertCaseSchema, insertFactSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Cases endpoints
  app.get("/api/cases", async (req, res) => {
    try {
      const cases = await storage.getCases();
      res.json(cases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  app.get("/api/cases/:id", async (req, res) => {
    try {
      const case_ = await storage.getCase(req.params.id);
      if (!case_) {
        return res.status(404).json({ error: "Case not found" });
      }
      res.json(case_);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch case" });
    }
  });

  app.post("/api/cases", async (req, res) => {
    try {
      const validatedData = insertCaseSchema.parse(req.body);
      const newCase = await storage.createCase(validatedData);
      res.status(201).json(newCase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid case data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create case" });
    }
  });

  // Evidence endpoints
  app.get("/api/evidence", async (req, res) => {
    try {
      const { caseId } = req.query;
      let evidence;
      
      if (caseId && typeof caseId === 'string') {
        evidence = await storage.getEvidenceByCase(caseId);
      } else {
        evidence = await storage.getAllEvidence();
      }
      
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch evidence" });
    }
  });

  app.get("/api/evidence/:id", async (req, res) => {
    try {
      const evidence = await storage.getEvidence(req.params.id);
      if (!evidence) {
        return res.status(404).json({ error: "Evidence not found" });
      }
      res.json(evidence);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch evidence" });
    }
  });

  app.post("/api/evidence", async (req, res) => {
    try {
      const validatedData = insertEvidenceSchema.parse(req.body);
      const newEvidence = await storage.createEvidence(validatedData);
      
      // Add chain of custody entry
      await storage.addChainOfCustodyEntry({
        evidenceId: newEvidence.id,
        action: "UPLOADED",
        performedBy: newEvidence.uploadedBy!,
        timestamp: new Date(),
        location: "Digital Upload",
        notes: "Initial evidence upload",
        hashBefore: null,
        hashAfter: newEvidence.hashValue,
      });
      
      res.status(201).json(newEvidence);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid evidence data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create evidence" });
    }
  });

  app.patch("/api/evidence/:id", async (req, res) => {
    try {
      const updates = req.body;
      const updatedEvidence = await storage.updateEvidence(req.params.id, updates);
      
      if (!updatedEvidence) {
        return res.status(404).json({ error: "Evidence not found" });
      }
      
      // Add chain of custody entry for updates
      if (updates.status || updates.blockNumber) {
        await storage.addChainOfCustodyEntry({
          evidenceId: updatedEvidence.id,
          action: updates.status === "MINTED" ? "MINTED" : "UPDATED",
          performedBy: updates.verifiedBy || updatedEvidence.uploadedBy!,
          timestamp: new Date(),
          location: "Blockchain Network",
          notes: `Evidence ${updates.status === "MINTED" ? "minted to blockchain" : "updated"}`,
          hashBefore: updatedEvidence.hashValue,
          hashAfter: updates.hashValue || updatedEvidence.hashValue,
        });
      }
      
      res.json(updatedEvidence);
    } catch (error) {
      res.status(500).json({ error: "Failed to update evidence" });
    }
  });

  // Verify evidence - starts trust degradation timer
  app.post("/api/evidence/:id/verify", async (req, res) => {
    try {
      const verifiedEvidence = await storage.verifyEvidence(req.params.id);
      
      if (!verifiedEvidence) {
        return res.status(404).json({ error: "Evidence not found" });
      }
      
      res.json(verifiedEvidence);
    } catch (error) {
      res.status(500).json({ error: "Failed to verify evidence" });
    }
  });

  // Check minting eligibility - blockchain path
  app.get("/api/evidence/:id/minting-eligibility", async (req, res) => {
    try {
      const eligibility = await storage.calculateMintingEligibility(req.params.id);
      res.json(eligibility);
    } catch (error) {
      res.status(500).json({ error: "Failed to check minting eligibility" });
    }
  });

  // Get ChittyTrust score - separate scoring system
  app.get("/api/evidence/:id/chittytrust-score", async (req, res) => {
    try {
      const score = await storage.calculateChittyTrustScore(req.params.id);
      res.json({ score });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate ChittyTrust score" });
    }
  });

  // Update ChittyTrust score
  app.post("/api/evidence/:id/update-chittytrust", async (req, res) => {
    try {
      const updatedEvidence = await storage.updateChittyTrustScore(req.params.id);
      if (!updatedEvidence) {
        return res.status(404).json({ error: "Evidence not found" });
      }
      res.json(updatedEvidence);
    } catch (error) {
      res.status(500).json({ error: "Failed to update ChittyTrust score" });
    }
  });

  // Mint evidence - locks trust score permanently (only if eligible)
  app.post("/api/evidence/:id/mint", async (req, res) => {
    try {
      const { blockNumber, hashValue } = req.body;
      
      if (!blockNumber || !hashValue) {
        return res.status(400).json({ error: "Block number and hash value are required" });
      }

      // Check eligibility first
      const eligibility = await storage.calculateMintingEligibility(req.params.id);
      if (!eligibility.eligible) {
        return res.status(400).json({ 
          error: "Evidence not eligible for minting", 
          eligibility: eligibility 
        });
      }
      
      const mintedEvidence = await storage.mintEvidence(req.params.id, blockNumber, hashValue);
      
      if (!mintedEvidence) {
        return res.status(404).json({ error: "Evidence not found" });
      }
      
      res.json(mintedEvidence);
    } catch (error) {
      res.status(500).json({ error: "Failed to mint evidence" });
    }
  });

  // Get current trust score (with degradation calculation)
  app.get("/api/evidence/:id/trust", async (req, res) => {
    try {
      const currentTrust = await storage.calculateCurrentTrustScore(req.params.id);
      const evidence = await storage.getEvidence(req.params.id);
      
      if (!evidence) {
        return res.status(404).json({ error: "Evidence not found" });
      }
      
      res.json({
        evidenceId: req.params.id,
        currentTrustScore: currentTrust,
        originalTrustScore: evidence.originalTrustScore,
        status: evidence.status,
        mintedAt: evidence.mintedAt,
        verifiedAt: evidence.verifiedAt,
        degradationRate: evidence.trustDegradationRate,
        lastUpdate: evidence.lastTrustUpdate,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate trust score" });
    }
  });

  // Atomic Facts endpoints
  app.get("/api/evidence/:evidenceId/facts", async (req, res) => {
    try {
      const facts = await storage.getFactsByEvidence(req.params.evidenceId);
      res.json(facts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch atomic facts" });
    }
  });

  app.post("/api/facts", async (req, res) => {
    try {
      const validatedData = insertFactSchema.parse(req.body);
      const newFact = await storage.createFact(validatedData);
      res.status(201).json(newFact);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid fact data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create fact" });
    }
  });

  // Chain of Custody endpoints
  app.get("/api/evidence/:evidenceId/custody", async (req, res) => {
    try {
      const custody = await storage.getChainOfCustody(req.params.evidenceId);
      res.json(custody);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chain of custody" });
    }
  });

  // Contradictions endpoints
  app.get("/api/contradictions", async (req, res) => {
    try {
      const { active } = req.query;
      let contradictions;
      
      if (active === 'true') {
        contradictions = await storage.getActiveContradictions();
      } else {
        contradictions = await storage.getContradictions();
      }
      
      res.json(contradictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contradictions" });
    }
  });

  // Dashboard stats endpoint
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const allEvidence = await storage.getAllEvidence();
      const allCases = await storage.getCases();
      const activeContradictions = await storage.getActiveContradictions();
      
      const mintedEvidence = allEvidence.filter(e => e.status === 'MINTED');
      const verificationRate = allEvidence.length > 0 ? 
        (mintedEvidence.length / allEvidence.length * 100).toFixed(1) : '0.0';
      
      const activeCases = allCases.filter(c => c.status === 'active');
      const criticalContradictions = activeContradictions.filter(c => c.severity === 'high');
      
      res.json({
        evidenceArtifacts: allEvidence.length,
        verificationRate: parseFloat(verificationRate),
        activeCases: activeCases.length,
        criticalContradictions: criticalContradictions.length,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
