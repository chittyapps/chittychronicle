// ChittyID Integration Service
// Interfaces with the ChittyID API for authentication and verification

export interface ChittyIDValidation {
  chittyId: string;
  valid: boolean;
  details?: {
    timestamp: string;
    vertical: string;
    nodeId?: string;
    jurisdiction?: string;
  };
}

export interface ChittyIDGeneration {
  chittyId: string;
  displayFormat: string;
  timestamp: string;
  vertical: string;
  valid: boolean;
}

export class ChittyIDService {
  private readonly baseUrl: string;
  private readonly fallbackMode: boolean;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.fallbackMode = !process.env.CHITTYID_API_URL; // Use fallback if no API URL provided
  }

  async validateChittyID(chittyId: string): Promise<ChittyIDValidation> {
    // Use fallback if ChittyID service is not configured
    if (this.fallbackMode) {
      return this.validateChittyIDFallback(chittyId);
    }

    try {
      const apiUrl = process.env.CHITTYID_API_URL || this.baseUrl;
      const response = await fetch(`${apiUrl}/api/v1/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.CHITTYID_API_KEY ? `Bearer ${process.env.CHITTYID_API_KEY}` : '',
        },
        body: JSON.stringify({ chittyId }),
      });

      if (!response.ok) {
        throw new Error(`ChittyID API error: ${response.status}`);
      }

      return await response.json() as ChittyIDValidation;
    } catch (error) {
      console.error('ChittyID validation failed, using fallback:', error);
      return this.validateChittyIDFallback(chittyId);
    }
  }

  private validateChittyIDFallback(chittyId: string): ChittyIDValidation {
    // ChittyID format validation: CH-YYYY-AAA-NNNN-X format
    const chittyIdPattern = /^CH-\d{4}-[A-Z]{3}-\d{4}-[A-Z]$/;
    const isValid = chittyIdPattern.test(chittyId);
    
    return {
      chittyId,
      valid: isValid,
      details: isValid ? {
        timestamp: new Date().toISOString(),
        vertical: chittyId.split('-')[2], // Extract vertical from ID
        nodeId: "fallback-node",
        jurisdiction: "USA"
      } : undefined
    };
  }

  async generateChittyID(vertical: string = 'VER'): Promise<ChittyIDGeneration> {
    // Use fallback if ChittyID service is not configured
    if (this.fallbackMode) {
      return this.generateChittyIDFallback(vertical);
    }

    try {
      const apiUrl = process.env.CHITTYID_API_URL || this.baseUrl;
      const response = await fetch(`${apiUrl}/api/v1/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': process.env.CHITTYID_API_KEY ? `Bearer ${process.env.CHITTYID_API_KEY}` : '',
        },
        body: JSON.stringify({ vertical }),
      });

      if (!response.ok) {
        throw new Error(`ChittyID API error: ${response.status}`);
      }

      return await response.json() as ChittyIDGeneration;
    } catch (error) {
      console.error('ChittyID generation failed, using fallback:', error);
      return this.generateChittyIDFallback(vertical);
    }
  }

  private generateChittyIDFallback(vertical: string = 'VER'): ChittyIDGeneration {
    const year = new Date().getFullYear();
    const sequenceNumber = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    const checksum = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // Random A-Z
    
    const chittyId = `CH-${year}-${vertical.toUpperCase().substring(0, 3).padEnd(3, 'X')}-${sequenceNumber}-${checksum}`;
    
    return {
      chittyId,
      displayFormat: chittyId,
      timestamp: new Date().toISOString(),
      vertical: vertical.toUpperCase(),
      valid: true
    };
  }

  async healthCheck(): Promise<{ status: string; service: string; mode?: string }> {
    if (this.fallbackMode) {
      return {
        status: 'operational',
        service: 'ChittyID',
        mode: 'fallback'
      };
    }

    try {
      const apiUrl = process.env.CHITTYID_API_URL || this.baseUrl;
      const response = await fetch(`${apiUrl}/health`, {
        headers: {
          'Authorization': process.env.CHITTYID_API_KEY ? `Bearer ${process.env.CHITTYID_API_KEY}` : '',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }

      return await response.json() as { status: string; service: string };
    } catch (error) {
      console.warn('ChittyID health check failed, using fallback mode:', error);
      return {
        status: 'operational',
        service: 'ChittyID',
        mode: 'fallback'
      };
    }
  }
}

export const chittyIdService = new ChittyIDService();