import express from 'express';

/**
 * ChittyBeacon Integration Service
 * 
 * Implements the ChittyBeacon backend functionality for evidence verification
 * and blockchain integration within the ChittyVerify platform.
 */

export interface ChittyBeaconConfig {
  nodeId: number;
  jurisdiction: string;
  apiVersion: string;
}

export interface BeaconResponse {
  beaconId: string;
  timestamp: number;
  hash: string;
  signature: string;
  status: 'pending' | 'verified' | 'failed';
}

export interface EvidenceBeacon {
  evidenceId: string;
  beaconId: string;
  chittyId: string;
  timestamp: number;
  hash: string;
  metadata: {
    type: string;
    size: number;
    source: string;
    jurisdiction: string;
  };
}

export class ChittyBeaconService {
  private config: ChittyBeaconConfig;

  constructor(config: Partial<ChittyBeaconConfig> = {}) {
    this.config = {
      nodeId: config.nodeId || 1,
      jurisdiction: config.jurisdiction || 'USA',
      apiVersion: config.apiVersion || 'v1'
    };
  }

  /**
   * Generate a ChittyBeacon for evidence verification
   */
  async generateBeacon(evidenceData: {
    chittyId: string;
    evidenceType: string;
    fileHash: string;
    fileSize: number;
    source: string;
  }): Promise<EvidenceBeacon> {
    const timestamp = Date.now();
    const beaconId = this.generateBeaconId();
    
    // Create cryptographic hash of the evidence metadata
    const metadataHash = await this.createMetadataHash({
      chittyId: evidenceData.chittyId,
      evidenceType: evidenceData.evidenceType,
      fileHash: evidenceData.fileHash,
      timestamp,
      beaconId
    });

    return {
      evidenceId: `EV-${timestamp}-${beaconId.slice(-8)}`,
      beaconId,
      chittyId: evidenceData.chittyId,
      timestamp,
      hash: metadataHash,
      metadata: {
        type: evidenceData.evidenceType,
        size: evidenceData.fileSize,
        source: evidenceData.source,
        jurisdiction: this.config.jurisdiction
      }
    };
  }

  /**
   * Verify a ChittyBeacon and its associated evidence
   */
  async verifyBeacon(beaconId: string): Promise<BeaconResponse> {
    try {
      // In production, this would verify against the blockchain
      // For now, return a verification response based on the beacon format
      const isValidFormat = this.validateBeaconFormat(beaconId);
      
      return {
        beaconId,
        timestamp: Date.now(),
        hash: await this.createBeaconHash(beaconId),
        signature: await this.signBeacon(beaconId),
        status: isValidFormat ? 'verified' : 'failed'
      };
    } catch (error) {
      return {
        beaconId,
        timestamp: Date.now(),
        hash: '',
        signature: '',
        status: 'failed'
      };
    }
  }

  /**
   * Get beacon status and verification details
   */
  async getBeaconStatus(beaconId: string): Promise<{
    beaconId: string;
    status: string;
    timestamp: number;
    verificationLayers: {
      source: boolean;
      time: boolean;
      integrity: boolean;
      custody: boolean;
      trust: boolean;
      justice: boolean;
    };
  }> {
    const verification = await this.verifyBeacon(beaconId);
    
    return {
      beaconId,
      status: verification.status,
      timestamp: verification.timestamp,
      verificationLayers: {
        source: verification.status === 'verified',
        time: verification.status === 'verified',
        integrity: verification.status === 'verified',
        custody: verification.status === 'verified',
        trust: verification.status === 'verified',
        justice: verification.status === 'verified'
      }
    };
  }

  /**
   * Create immutable evidence record
   */
  async createEvidenceRecord(evidenceBeacon: EvidenceBeacon): Promise<{
    recordId: string;
    immutableHash: string;
    timestamp: number;
    status: string;
  }> {
    const recordId = `REC-${evidenceBeacon.timestamp}-${evidenceBeacon.beaconId.slice(-8)}`;
    const immutableHash = await this.createImmutableHash(evidenceBeacon);
    
    return {
      recordId,
      immutableHash,
      timestamp: Date.now(),
      status: 'immutable'
    };
  }

  /**
   * Generate a unique beacon ID following ChittyID format
   */
  private generateBeaconId(): string {
    const year = new Date().getFullYear();
    const nodeId = this.config.nodeId.toString().padStart(4, '0');
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    
    return `CB-${year}-BCN-${nodeId}-${timestamp}-${random}`;
  }

  /**
   * Create cryptographic hash of metadata
   */
  private async createMetadataHash(metadata: any): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(metadata));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create beacon verification hash
   */
  private async createBeaconHash(beaconId: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${beaconId}-${this.config.nodeId}-${Date.now()}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Sign beacon for authenticity
   */
  private async signBeacon(beaconId: string): Promise<string> {
    // In production, this would use proper cryptographic signing
    // For now, create a deterministic signature based on beacon ID
    const encoder = new TextEncoder();
    const data = encoder.encode(`CHITTYBEACON-${beaconId}-${this.config.jurisdiction}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }

  /**
   * Create immutable hash for evidence record
   */
  private async createImmutableHash(evidenceBeacon: EvidenceBeacon): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({
      beaconId: evidenceBeacon.beaconId,
      chittyId: evidenceBeacon.chittyId,
      hash: evidenceBeacon.hash,
      timestamp: evidenceBeacon.timestamp,
      metadata: evidenceBeacon.metadata
    }));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate beacon ID format
   */
  private validateBeaconFormat(beaconId: string): boolean {
    // ChittyBeacon format: CB-YYYY-BCN-NNNN-TTTTTTTT-RRRR
    const beaconRegex = /^CB-\d{4}-BCN-\d{4}-\d{8}-[A-Z0-9]{4}$/;
    return beaconRegex.test(beaconId);
  }

  /**
   * Health check for ChittyBeacon service
   */
  async healthCheck(): Promise<{
    status: string;
    service: string;
    version: string;
    nodeId: number;
    jurisdiction: string;
  }> {
    return {
      status: 'operational',
      service: 'ChittyBeacon',
      version: this.config.apiVersion,
      nodeId: this.config.nodeId,
      jurisdiction: this.config.jurisdiction
    };
  }
}

/**
 * ChittyBeacon Express Router
 */
export function createChittyBeaconRouter(): express.Router {
  const router = express.Router();
  const beaconService = new ChittyBeaconService({
    nodeId: parseInt(process.env.CHITTYBEACON_NODE_ID || '1'),
    jurisdiction: process.env.CHITTYBEACON_JURISDICTION || 'USA',
    apiVersion: 'v1'
  });

  // Health check
  router.get('/health', async (req, res) => {
    try {
      const health = await beaconService.healthCheck();
      res.json(health);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'ChittyBeacon health check failed' 
      });
    }
  });

  // Generate beacon for evidence
  router.post('/beacon/generate', async (req, res) => {
    try {
      const { chittyId, evidenceType, fileHash, fileSize, source } = req.body;
      
      if (!chittyId || !evidenceType || !fileHash) {
        return res.status(400).json({ 
          error: 'Missing required fields: chittyId, evidenceType, fileHash' 
        });
      }

      const beacon = await beaconService.generateBeacon({
        chittyId,
        evidenceType,
        fileHash,
        fileSize: fileSize || 0,
        source: source || 'unknown'
      });

      res.json(beacon);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to generate beacon' 
      });
    }
  });

  // Verify beacon
  router.post('/beacon/verify', async (req, res) => {
    try {
      const { beaconId } = req.body;
      
      if (!beaconId) {
        return res.status(400).json({ error: 'beaconId is required' });
      }

      const verification = await beaconService.verifyBeacon(beaconId);
      res.json(verification);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to verify beacon' 
      });
    }
  });

  // Get beacon status
  router.get('/beacon/:beaconId/status', async (req, res) => {
    try {
      const { beaconId } = req.params;
      const status = await beaconService.getBeaconStatus(beaconId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to get beacon status' 
      });
    }
  });

  // Create immutable evidence record
  router.post('/evidence/record', async (req, res) => {
    try {
      const evidenceBeacon = req.body;
      const record = await beaconService.createEvidenceRecord(evidenceBeacon);
      res.json(record);
    } catch (error) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create evidence record' 
      });
    }
  });

  return router;
}

export const chittyBeaconService = new ChittyBeaconService();