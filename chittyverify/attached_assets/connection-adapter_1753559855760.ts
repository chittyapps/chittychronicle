/**
 * Universal Connection Adapter for MCPs
 * Handles diverse data sources with intelligent adaptation
 */

import { MCPTrainer } from './training-framework';

export class UniversalMCPAdapter {
  private adapters: Map<string, ConnectionAdapter> = new Map();
  private trainer: MCPTrainer;
  
  constructor() {
    this.trainer = new MCPTrainer();
    this.initializeAdapters();
  }
  
  /**
   * Core adaptation strategies for different connection types
   */
  private initializeAdapters() {
    // 1. Legal Database Adapter (Westlaw, LexisNexis, PACER)
    this.adapters.set('legal-db', {
      async connect(config: any) {
        return {
          preprocess: (query: string) => {
            // Standardize legal citations
            return query
              .replace(/v\.?\s+/gi, ' v. ')
              .replace(/\s+/, ' ')
              .trim();
          },
          
          transform: (data: any) => {
            // Normalize varied legal data formats
            const normalized: any = {};
            
            // Handle different case number formats
            normalized.caseNumber = 
              data.case_no || 
              data.docket_number || 
              data.citation ||
              data.case_id;
            
            // Normalize party names
            if (data.plaintiff && data.defendant) {
              normalized.parties = [data.plaintiff, data.defendant];
            } else if (data.parties) {
              normalized.parties = Array.isArray(data.parties) 
                ? data.parties 
                : data.parties.split(/\s+v\.?\s+/i);
            }
            
            // Handle dates in various formats
            normalized.filingDate = this.parseFlexibleDate(
              data.filing_date || 
              data.filed || 
              data.date_filed
            );
            
            return normalized;
          },
          
          validate: (data: any) => {
            const required = ['caseNumber', 'parties', 'filingDate'];
            const missing = required.filter(field => !data[field]);
            
            if (missing.length > 0) {
              return {
                valid: false,
                confidence: 0.6,
                issues: missing.map(f => `Missing ${f}`),
                partial: true, // Still usable with lower confidence
              };
            }
            
            return { valid: true, confidence: 0.95 };
          },
        };
      },
    });
    
    // 2. County Recorder Adapter (Property Records)
    this.adapters.set('county-recorder', {
      async connect(config: any) {
        return {
          preprocess: (request: any) => {
            // Handle different parcel ID formats
            if (request.parcelId) {
              request.parcelId = request.parcelId
                .replace(/[^0-9-]/g, '')
                .replace(/-+/g, '-');
            }
            return request;
          },
          
          transform: (data: any) => {
            // Map varied property record formats
            return {
              parcelId: data.APN || data.parcel_number || data.property_id,
              owner: this.extractOwnerInfo(data),
              legalDescription: data.legal_desc || data.legal || data.description,
              recordedDate: this.parseFlexibleDate(data.rec_date || data.recorded),
              documentType: this.normalizeDocType(data.doc_type || data.type),
              amount: this.parseMonetaryAmount(data.amount || data.consideration),
            };
          },
          
          enrichment: async (data: any) => {
            // Add computed fields
            if (data.legalDescription) {
              data.propertyType = this.inferPropertyType(data.legalDescription);
            }
            return data;
          },
        };
      },
    });
    
    // 3. Blockchain Adapter (Ethereum, Polygon, etc.)
    this.adapters.set('blockchain', {
      async connect(config: any) {
        return {
          preprocess: (request: any) => {
            // Ensure addresses are checksummed
            if (request.address) {
              request.address = this.toChecksumAddress(request.address);
            }
            return request;
          },
          
          transform: (data: any) => {
            // Handle different blockchain response formats
            if (data.result && typeof data.result === 'string') {
              // JSON-RPC response
              return this.decodeBlockchainData(data.result);
            } else if (data.data) {
              // REST API response
              return data.data;
            }
            return data;
          },
          
          errorHandler: (error: any) => {
            if (error.code === -32000) {
              return { retry: true, delay: 5000 };
            }
            return { retry: false, fallback: 'use-cache' };
          },
        };
      },
    });
    
    // 4. AI Service Adapter (OpenAI, Anthropic, etc.)
    this.adapters.set('ai-service', {
      async connect(config: any) {
        return {
          preprocess: (prompt: any) => {
            // Add system context for legal domain
            return {
              ...prompt,
              system: prompt.system || "You are a legal analysis expert.",
              temperature: prompt.temperature || 0.7,
            };
          },
          
          transform: (response: any) => {
            // Normalize different AI response formats
            if (response.choices) {
              // OpenAI format
              return {
                text: response.choices[0].message.content,
                confidence: response.choices[0].confidence || 0.8,
                model: response.model,
              };
            } else if (response.content) {
              // Anthropic format
              return {
                text: response.content[0].text,
                confidence: 0.85,
                model: response.model,
              };
            }
            return response;
          },
          
          postprocess: (result: any) => {
            // Extract structured data from AI responses
            const extracted = this.extractStructuredData(result.text);
            return {
              ...result,
              structured: extracted,
            };
          },
        };
      },
    });
  }
  
  /**
   * Flexible data parsing utilities
   */
  private parseFlexibleDate(dateStr: any): string | null {
    if (!dateStr) return null;
    
    const patterns = [
      // ISO format
      /^\d{4}-\d{2}-\d{2}/,
      // US format
      /^\d{1,2}\/\d{1,2}\/\d{2,4}/,
      // European format
      /^\d{1,2}-\d{1,2}-\d{2,4}/,
      // Written format
      /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}/i,
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(dateStr)) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().split('T')[0];
        }
      }
    }
    
    return null;
  }
  
  private parseMonetaryAmount(amount: any): number | null {
    if (typeof amount === 'number') return amount;
    if (!amount) return null;
    
    const cleaned = amount
      .toString()
      .replace(/[$,]/g, '')
      .replace(/\s+/g, '');
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  private extractOwnerInfo(data: any): any {
    if (data.owner) return data.owner;
    
    // Try different field combinations
    const names = [];
    if (data.grantor) names.push(data.grantor);
    if (data.grantee) names.push(data.grantee);
    if (data.owner_name) names.push(data.owner_name);
    if (data.current_owner) names.push(data.current_owner);
    
    return names.length > 0 ? names : null;
  }
  
  private normalizeDocType(type: string): string {
    const mappings: Record<string, string> = {
      'deed': 'deed',
      'warranty deed': 'deed',
      'quitclaim': 'deed',
      'mortgage': 'lien',
      'deed of trust': 'lien',
      'lien': 'lien',
      'easement': 'encumbrance',
      'covenant': 'encumbrance',
    };
    
    const normalized = type.toLowerCase().trim();
    for (const [key, value] of Object.entries(mappings)) {
      if (normalized.includes(key)) return value;
    }
    
    return 'other';
  }
  
  private inferPropertyType(legalDesc: string): string {
    const desc = legalDesc.toLowerCase();
    
    if (desc.includes('lot') && desc.includes('block')) return 'residential';
    if (desc.includes('unit') || desc.includes('condo')) return 'condominium';
    if (desc.includes('acres')) return 'land';
    if (desc.includes('suite') || desc.includes('floor')) return 'commercial';
    
    return 'unknown';
  }
  
  private toChecksumAddress(address: string): string {
    // Simplified checksum - in production use web3.utils
    return address.toLowerCase();
  }
  
  private decodeBlockchainData(hexData: string): any {
    // Decode blockchain response - simplified
    return { decoded: hexData };
  }
  
  private extractStructuredData(text: string): any {
    // Extract key-value pairs from AI responses
    const structured: any = {};
    
    // Look for patterns like "Property: 123 Main St"
    const kvPattern = /([A-Z][\w\s]+):\s*([^\n]+)/g;
    let match;
    
    while ((match = kvPattern.exec(text)) !== null) {
      const key = match[1].trim().toLowerCase().replace(/\s+/g, '_');
      structured[key] = match[2].trim();
    }
    
    return structured;
  }
  
  /**
   * Main connection method with automatic adaptation
   */
  async connect(source: string, config: any): Promise<any> {
    // Auto-detect connection type if not specified
    const detectedType = this.detectConnectionType(source, config);
    const adapter = this.adapters.get(detectedType);
    
    if (!adapter) {
      throw new Error(`No adapter found for connection type: ${detectedType}`);
    }
    
    return await adapter.connect(config);
  }
  
  private detectConnectionType(source: string, config: any): string {
    // Smart detection based on patterns
    if (source.includes('county') || source.includes('recorder')) {
      return 'county-recorder';
    }
    if (source.includes('chain') || config.rpcUrl) {
      return 'blockchain';
    }
    if (source.includes('ai') || source.includes('gpt') || source.includes('claude')) {
      return 'ai-service';
    }
    if (source.includes('legal') || source.includes('court')) {
      return 'legal-db';
    }
    
    return 'generic';
  }
}

interface ConnectionAdapter {
  connect(config: any): Promise<any>;
}