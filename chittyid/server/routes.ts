import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupChittyAuth, requireAuth, optionalAuth } from "./chittyAuth";
import { chittyIdService } from "./chittyIdService";
import { insertVerificationSchema, insertBusinessSchema, insertVerificationRequestSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  setupChittyAuth(app);

  // ChittyAuth handles the auth routes internally

  // ChittyID mothership status endpoint
  app.get('/api/chittyid/mothership/status', async (req, res) => {
    try {
      const isOnline = await chittyIdService.checkMothershipStatus();
      res.json({ 
        mothership: 'id.chitty.cc',
        online: isOnline,
        message: isOnline ? 'ChittyID mothership is online and ready' : 'ChittyID mothership is offline. Please wait for central server to come online.'
      });
    } catch (error) {
      console.error("Error checking mothership status:", error);
      res.status(500).json({ message: "Failed to check mothership status" });
    }
  });

  // ChittyID routes
  app.post('/api/chittyid/create', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if user already has a ChittyID
      const existingChittyId = await storage.getChittyIdByUserId(userId);
      if (existingChittyId) {
        return res.status(400).json({ message: "User already has a ChittyID" });
      }

      // Check mothership status first
      const mothershipOnline = await chittyIdService.checkMothershipStatus();
      if (!mothershipOnline) {
        return res.status(503).json({ 
          message: "ChittyID generation requires connection to mothership server at id.chitty.cc. Please wait for the central server to come online.",
          mothership: 'id.chitty.cc',
          online: false
        });
      }

      // Generate ChittyID through mothership service
      const chittyIdCode = await chittyIdService.generateChittyId('identity', 'person', {
        userId,
        email: req.user.email,
        firstName: req.user.firstName,
        lastName: req.user.lastName
      });
      
      const chittyId = await storage.createChittyId({
        userId,
        chittyIdCode,
        trustScore: 100, // Starting trust score
        trustLevel: 'L0',
        verificationStatus: 'pending',
      });

      res.json(chittyId);
    } catch (error) {
      console.error("Error creating ChittyID:", error);
      if (error.message.includes('mothership')) {
        res.status(503).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create ChittyID" });
      }
    }
  });

  app.get('/api/chittyid/:code', async (req, res) => {
    try {
      const { code } = req.params;
      const chittyId = await storage.getChittyIdByCode(code);
      
      if (!chittyId) {
        return res.status(404).json({ message: "ChittyID not found" });
      }

      // Only return public information for external verification
      const publicInfo = {
        code: chittyId.chittyIdCode,
        trustScore: chittyId.trustScore,
        trustLevel: chittyId.trustLevel,
        verificationStatus: chittyId.verificationStatus,
        issuedAt: chittyId.issuedAt,
      };

      res.json(publicInfo);
    } catch (error) {
      console.error("Error fetching ChittyID:", error);
      res.status(500).json({ message: "Failed to fetch ChittyID" });
    }
  });

  // Verification routes
  app.post('/api/verifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chittyId = await storage.getChittyIdByUserId(userId);
      
      if (!chittyId) {
        return res.status(400).json({ message: "No ChittyID found for user" });
      }

      const validatedData = insertVerificationSchema.parse({
        ...req.body,
        chittyId: chittyId.id,
      });

      const verification = await storage.createVerification(validatedData);
      
      // Auto-approve basic verifications for demo purposes
      if (['email', 'phone'].includes(validatedData.verificationType)) {
        await storage.updateVerificationStatus(verification.id, 'verified', new Date());
        
        // Update trust score
        const currentTrustScore = chittyId.trustScore || 0;
        const newTrustScore = currentTrustScore + 50;
        let newTrustLevel = chittyId.trustLevel || 'L0';
        if (newTrustScore >= 200 && newTrustLevel === 'L0') newTrustLevel = 'L1';
        if (newTrustScore >= 500 && newTrustLevel === 'L1') newTrustLevel = 'L2';
        
        await storage.updateChittyIdTrustScore(chittyId.id, newTrustScore, newTrustLevel);
      }

      res.json(verification);
    } catch (error) {
      console.error("Error creating verification:", error);
      res.status(500).json({ message: "Failed to create verification" });
    }
  });

  // Advanced ChittyID generation endpoint
  app.post('/api/chittyid/generate-advanced', async (req, res) => {
    try {
      const { db } = await import('./db');
      const result = await db.execute("SELECT generate_chitty_id_code() as code");
      const chittyCode = result[0].code;
      
      const validation = await db.execute(
        "SELECT validate_chitty_id_code($1) as validation",
        [chittyCode]
      );
      
      res.json({
        chitty_id_code: chittyCode,
        validation: validation[0].validation,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error generating ChittyID:", error);
      res.status(500).json({ message: "Failed to generate ChittyID" });
    }
  });

  // ChittyID validation endpoint
  app.post('/api/chittyid/validate', async (req, res) => {
    try {
      const { chitty_id_code } = req.body;
      if (!chitty_id_code) {
        return res.status(400).json({ message: "chitty_id_code is required" });
      }
      
      const { db } = await import('./db');
      const result = await db.execute(
        "SELECT validate_chitty_id_code($1) as validation",
        [chitty_id_code]
      );
      
      res.json({
        chitty_id_code,
        validation: result[0].validation
      });
    } catch (error) {
      console.error("Error validating ChittyID:", error);
      res.status(500).json({ message: "Failed to validate ChittyID" });
    }
  });

  // Trust score calculation endpoint
  app.post('/api/trust/calculate', async (req, res) => {
    try {
      const {
        email_verified = false,
        phone_verified = false,
        id_card_verified = false,
        address_verified = false,
        business_verifications = 0,
        account_age_days = 0,
        verification_consistency_score = 100
      } = req.body;
      
      const { db } = await import('./db');
      const result = await db.execute(`
        SELECT 
          calculate_trust_score($1, $2, $3, $4, $5, $6, $7) as trust_score,
          get_trust_level_from_score(calculate_trust_score($1, $2, $3, $4, $5, $6, $7)) as trust_level
      `, [
        email_verified,
        phone_verified, 
        id_card_verified,
        address_verified,
        business_verifications,
        account_age_days,
        verification_consistency_score
      ]);
      
      res.json({
        trust_score: result[0].trust_score,
        trust_level: result[0].trust_level,
        calculation_params: {
          email_verified,
          phone_verified,
          id_card_verified,
          address_verified,
          business_verifications,
          account_age_days,
          verification_consistency_score
        }
      });
    } catch (error) {
      console.error("Error calculating trust score:", error);
      res.status(500).json({ message: "Failed to calculate trust score" });
    }
  });

  // System statistics endpoint
  app.get('/api/system/stats', async (req, res) => {
    try {
      const { db } = await import('./db');
      const result = await db.execute("SELECT get_chitty_id_stats() as stats");
      res.json(result[0].stats);
    } catch (error) {
      console.error("Error fetching system stats:", error);
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });

  // Advanced verification processing
  app.post('/api/verifications/process-advanced', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chittyId = await storage.getChittyIdByUserId(userId);
      
      if (!chittyId) {
        return res.status(400).json({ message: "No ChittyID found for user" });
      }

      const { verification_type, status, metadata } = req.body;
      
      if (!verification_type || !status) {
        return res.status(400).json({ 
          message: "verification_type and status are required" 
        });
      }
      
      const { db } = await import('./db');
      const result = await db.execute(`
        SELECT process_verification_update($1, $2, $3, $4) as result
      `, [chittyId.chittyIdCode, verification_type, status, metadata || {}]);
      
      res.json(result[0].result);
    } catch (error) {
      console.error("Error processing verification:", error);
      res.status(500).json({ message: "Failed to process verification" });
    }
  });

  // Business integration API
  app.post('/api/business/verify-chitty', async (req, res) => {
    try {
      const apiKey = req.headers['x-api-key'] as string;
      if (!apiKey) {
        return res.status(401).json({ message: "API key required in X-API-Key header" });
      }
      
      const business = await storage.getBusinessByApiKey(apiKey);
      if (!business) {
        return res.status(401).json({ message: "Invalid API key" });
      }
      
      const { chitty_id, trust_threshold } = req.body;
      if (!chitty_id) {
        return res.status(400).json({ message: "chitty_id is required" });
      }
      
      const chittyRecord = await storage.getChittyIdByCode(chitty_id);
      if (!chittyRecord) {
        return res.status(404).json({ message: "ChittyID not found" });
      }
      
      const requiredThreshold = trust_threshold || business.trustThreshold || 500;
      const approved = (chittyRecord.trustScore || 0) >= requiredThreshold;
      
      // Log verification request
      await storage.createVerificationRequest({
        businessId: business.id,
        chittyId: chittyRecord.id,
        requestType: 'instant_verify',
        status: approved ? 'approved' : 'rejected',
        trustScoreAtRequest: chittyRecord.trustScore,
        responseData: {
          trust_score: chittyRecord.trustScore,
          trust_level: chittyRecord.trustLevel,
          threshold_met: approved,
          required_threshold: requiredThreshold
        }
      });
      
      res.json({
        approved,
        chitty_id,
        trust_score: chittyRecord.trustScore,
        trust_level: chittyRecord.trustLevel,
        required_threshold: requiredThreshold,
        business_name: business.name,
        verification_timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error processing business verification:", error);
      res.status(500).json({ message: "Failed to process business verification" });
    }
  });

  // Universal ChittyID endpoints for People, Places, Things, Events
  app.post('/api/universal/create', requireAuth, async (req: any, res) => {
    try {
      const { entity_type, name, description, attributes, is_public } = req.body;
      const userId = req.user.id;
      
      if (!entity_type || !name) {
        return res.status(400).json({ message: "entity_type and name are required" });
      }
      
      const validTypes = ['person', 'place', 'thing', 'event'];
      if (!validTypes.includes(entity_type)) {
        return res.status(400).json({ message: "entity_type must be one of: person, place, thing, event" });
      }
      
      const { db } = await import('./db');
      const generateFunction = {
        person: 'generate_person_chitty_id',
        place: 'generate_place_chitty_id', 
        thing: 'generate_thing_chitty_id',
        event: 'generate_event_chitty_id'
      }[entity_type];
      
      const codeResult = await db.execute(`SELECT ${generateFunction}() as code`);
      const chittyCode = codeResult[0].code;
      
      const insertResult = await db.execute(`
        INSERT INTO universal_entities (
          chitty_id_code, entity_type, name, description, attributes, 
          owner_user_id, is_public, trust_score, trust_level
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 100, 'L0')
        RETURNING *
      `, [chittyCode, entity_type, name, description || null, JSON.stringify(attributes || {}), userId, is_public || false]);
      
      res.status(201).json(insertResult[0]);
    } catch (error) {
      console.error("Error creating universal entity:", error);
      res.status(500).json({ message: "Failed to create universal entity" });
    }
  });

  app.get('/api/universal/search', async (req, res) => {
    try {
      const { entity_type, name, is_public } = req.query;
      const { db } = await import('./db');
      
      let query = "SELECT * FROM universal_entities WHERE 1=1";
      const params: any[] = [];
      let paramCount = 0;
      
      if (entity_type) {
        paramCount++;
        query += ` AND entity_type = $${paramCount}`;
        params.push(entity_type);
      }
      
      if (name) {
        paramCount++;
        query += ` AND name ILIKE $${paramCount}`;
        params.push(`%${name}%`);
      }
      
      if (is_public !== undefined) {
        paramCount++;
        query += ` AND is_public = $${paramCount}`;
        params.push(is_public === 'true');
      }
      
      query += " ORDER BY trust_score DESC, created_at DESC LIMIT 50";
      
      const result = await db.execute(query, params);
      res.json(result);
    } catch (error) {
      console.error("Error searching universal entities:", error);
      res.status(500).json({ message: "Failed to search universal entities" });
    }
  });

  app.get('/api/universal/:chittyCode', async (req, res) => {
    try {
      const { chittyCode } = req.params;
      const { db } = await import('./db');
      
      const result = await db.execute(
        "SELECT * FROM universal_entities WHERE chitty_id_code = $1",
        [chittyCode]
      );
      
      if (result.length === 0) {
        return res.status(404).json({ message: "Universal entity not found" });
      }
      
      res.json(result[0]);
    } catch (error) {
      console.error("Error fetching universal entity:", error);
      res.status(500).json({ message: "Failed to fetch universal entity" });
    }
  });

  // Enhanced universal stats endpoint
  app.get('/api/universal/stats', async (req, res) => {
    try {
      const { db } = await import('./db');
      const result = await db.execute("SELECT get_universal_chitty_stats() as stats");
      res.json(result[0].stats);
    } catch (error) {
      console.error("Error fetching universal stats:", error);
      res.status(500).json({ message: "Failed to fetch universal stats" });
    }
  });

  app.get('/api/verifications', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chittyId = await storage.getChittyIdByUserId(userId);
      
      if (!chittyId) {
        return res.json([]);
      }

      const verifications = await storage.getVerificationsByChittyId(chittyId.id);
      res.json(verifications);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      res.status(500).json({ message: "Failed to fetch verifications" });
    }
  });

  // Business routes
  app.get('/api/businesses', async (req, res) => {
    try {
      const businesses = await storage.getAllBusinesses();
      // Remove sensitive information
      const publicBusinesses = businesses.map(b => ({
        id: b.id,
        name: b.name,
        industry: b.industry,
        trustThreshold: b.trustThreshold,
      }));
      res.json(publicBusinesses);
    } catch (error) {
      console.error("Error fetching businesses:", error);
      res.status(500).json({ message: "Failed to fetch businesses" });
    }
  });

  app.post('/api/businesses', requireAuth, async (req: any, res) => {
    try {
      const validatedData = insertBusinessSchema.parse(req.body);
      const business = await storage.createBusiness(validatedData);
      res.json(business);
    } catch (error) {
      console.error("Error creating business:", error);
      res.status(500).json({ message: "Failed to create business" });
    }
  });

  // Business verification API (for external business partners)
  app.post('/api/verify', async (req, res) => {
    try {
      const { chittyIdCode, requestType, apiKey } = req.body;
      
      if (!apiKey) {
        return res.status(401).json({ message: "API key required" });
      }

      const business = await storage.getBusinessByApiKey(apiKey);
      if (!business) {
        return res.status(401).json({ message: "Invalid API key" });
      }

      const chittyId = await storage.getChittyIdByCode(chittyIdCode);
      if (!chittyId) {
        return res.status(404).json({ message: "ChittyID not found" });
      }

      // Create verification request
      const verificationRequest = await storage.createVerificationRequest({
        businessId: business.id,
        chittyId: chittyId.id,
        requestType,
        trustScoreAtRequest: chittyId.trustScore,
      });

      // Check if ChittyID meets business trust threshold
      const chittyTrustScore = chittyId.trustScore || 0;
      const businessThreshold = business.trustThreshold || 500;
      const approved = chittyTrustScore >= businessThreshold && 
                      chittyId.verificationStatus === 'verified';

      const responseData = {
        approved,
        trustScore: chittyId.trustScore,
        trustLevel: chittyId.trustLevel,
        verificationStatus: chittyId.verificationStatus,
        message: approved ? "Verification approved" : "Trust threshold not met",
      };

      await storage.updateVerificationRequestStatus(
        verificationRequest.id,
        approved ? 'approved' : 'rejected',
        responseData
      );

      res.json(responseData);
    } catch (error) {
      console.error("Error processing verification:", error);
      res.status(500).json({ message: "Failed to process verification" });
    }
  });

  // Dashboard stats
  app.get('/api/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chittyId = await storage.getChittyIdByUserId(userId);
      
      const stats = {
        trustScore: chittyId?.trustScore || 0,
        trustLevel: chittyId?.trustLevel || 'L0',
        verificationStatus: chittyId?.verificationStatus || 'pending',
        verificationCount: chittyId ? (await storage.getVerificationsByChittyId(chittyId.id)).length : 0,
        businessPartners: (await storage.getAllBusinesses()).length,
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
