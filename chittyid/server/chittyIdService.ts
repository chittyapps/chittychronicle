import crypto from 'crypto';

export interface ChittyIdResponse {
  chittyId: string;
  displayFormat: string;
  timestamp?: string;
  vertical?: string;
  valid: boolean;
}

export interface ChittyIdValidationResponse {
  chittyId: string;
  valid: boolean;
  details?: any;
}

// Identity Service Implementation following ChittyID Architecture
class ChittyIdService {
  private mothershipUrl: string;
  private apiKey: string;
  private nodeId: string;

  constructor() {
    this.mothershipUrl = process.env.CHITTYID_MOTHERSHIP_URL || 'https://id.chitty.cc';
    this.apiKey = process.env.CHITTYID_API_KEY || 'dev-key';
    this.nodeId = process.env.CHITTYID_NODE_ID || '01';
  }

  // Core Identity Service - implements `identity-service.create(domain, type, attrs, ctx)`
  async generateChittyId(domain: string = 'identity', type: string = 'person', attrs: any = {}): Promise<string> {
    try {
      console.log(`🔗 Connecting to ChittyID mothership at ${this.mothershipUrl}`);
      
      const response = await fetch(`${this.mothershipUrl}/api/identity/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-Node-ID': this.nodeId
        },
        body: JSON.stringify({
          domain,
          type,
          attrs,
          ctx: {
            source: 'chittyauth',
            timestamp: new Date().toISOString(),
            nodeId: this.nodeId
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ChittyID mothership API error: ${response.status} ${response.statusText}`);
      }

      const data: ChittyIdResponse = await response.json();
      console.log(`✅ ChittyID generated from mothership: ${data.chittyId}`);
      return data.chittyId || data.displayFormat;
      
    } catch (error) {
      console.error('❌ ChittyID mothership unavailable:', error.message);
      throw new Error('ChittyID generation requires connection to mothership server at id.chitty.cc. Please try again when the central server is online.');
    }
  }

  async checkMothershipStatus(): Promise<boolean> {
    try {
      console.log(`🔍 Checking ChittyID mothership status...`);
      
      const response = await fetch(`${this.mothershipUrl}/api/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const isOnline = response.ok;
      console.log(`🌐 ChittyID mothership status: ${isOnline ? 'ONLINE' : 'OFFLINE'}`);
      return isOnline;
      
    } catch (error) {
      console.log(`🔴 ChittyID mothership OFFLINE: ${error.message}`);
      return false;
    }
  }

  async validateChittyId(chittyId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.mothershipUrl}/api/v1/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({ chittyId }),
        timeout: 5000
      });

      if (!response.ok) {
        console.warn('ChittyID validation API error, using fallback validation');
        return this.validateFallbackChittyId(chittyId);
      }

      const data: ChittyIdValidationResponse = await response.json();
      return data.valid;
      
    } catch (error) {
      console.warn('Failed to validate ChittyID with mothership:', error.message);
      return this.validateFallbackChittyId(chittyId);
    }
  }

  // Implements structured ID format: VV-G-LLL-SSSS-T-YM-C-X
  private generateStructuredFallbackId(domain: string, type: string): string {
    // VV = Vertical (CP=ChittyPerson, CL=ChittyLocation, CT=ChittyThing, CE=ChittyEvent)
    const verticalMap: { [key: string]: string } = {
      'person': 'CP',
      'location': 'CL', 
      'thing': 'CT',
      'event': 'CE'
    };
    const vertical = verticalMap[type] || 'CP';
    
    // G = Generation (time-based epoch)
    const now = new Date();
    const epochMs = now.getTime();
    const generation = Math.floor(epochMs / 1000000).toString(36).substring(0, 1).toUpperCase();
    
    // LLL = Location/Node identifier (3 chars)
    const locationCode = this.nodeId.padStart(2, '0') + '1';
    
    // SSSS = Sequence (4 chars, time + random)
    const timeComponent = now.getSeconds().toString().padStart(2, '0');
    const randomComponent = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const sequence = timeComponent + randomComponent;
    
    // T = Type modifier
    const typeModifier = type.charAt(0).toUpperCase();
    
    // YM = Year-Month encoding
    const yearMonth = (now.getFullYear() % 100).toString().padStart(2, '0') + 
                     (now.getMonth() + 1).toString().padStart(2, '0');
    
    // C = Category
    const category = domain.charAt(0).toUpperCase();
    
    // Build base ID without checksum
    const baseId = `${vertical}-${generation}-${locationCode}-${sequence}-${typeModifier}-${yearMonth}-${category}`;
    
    // X = Mod-97 checksum (2 digits)
    const checksum = this.calculateMod97Checksum(baseId).toString().padStart(2, '0');
    
    return `${baseId}-${checksum}`;
  }

  private validateFallbackChittyId(chittyId: string): boolean {
    // Structured format validation: VV-G-LLL-SSSS-T-YM-C-X
    const pattern = /^(CP|CL|CT|CE)-[A-Z0-9]-[A-Z0-9]{3}-[0-9]{4}-[A-Z]-[0-9]{4}-[A-Z]-[0-9]{2}$/;
    if (!pattern.test(chittyId)) {
      return false;
    }

    // Validate Mod-97 checksum
    const parts = chittyId.split('-');
    if (parts.length !== 8) return false;
    
    const baseStr = parts.slice(0, 7).join('-');
    const providedChecksum = parseInt(parts[7]);
    const calculatedChecksum = this.calculateMod97Checksum(baseStr);
    
    return providedChecksum === calculatedChecksum;
  }

  private calculateMod97Checksum(str: string): number {
    let sum = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charAt(i);
      if (char >= '0' && char <= '9') {
        sum += parseInt(char);
      } else if (char >= 'A' && char <= 'Z') {
        sum += char.charCodeAt(0) - 55; // A=10, B=11, etc.
      }
    }
    return sum % 97;
  }

  // Sync with mothership - registers user with the central system
  async syncUserWithMothership(userId: string, chittyId: string, userData: any): Promise<boolean> {
    try {
      const response = await fetch(`${this.mothershipUrl}/api/v1/register-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          chittyId,
          userId,
          metadata: {
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            registrationTimestamp: new Date().toISOString(),
            source: 'chittyauth'
          }
        }),
        timeout: 5000
      });

      if (!response.ok) {
        console.warn(`Failed to sync user ${chittyId} with mothership: ${response.status}`);
        return false;
      }

      console.log(`✅ User ${chittyId} synced with ChittyID mothership`);
      return true;
      
    } catch (error) {
      console.warn(`Failed to sync user ${chittyId} with mothership:`, error.message);
      return false;
    }
  }
}

export const chittyIdService = new ChittyIdService();