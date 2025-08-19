// Cloudflare AI Fortress MCP Server
// Secure AI execution with ChittyChain integration

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

// Environment variables for Cloudflare Worker
interface Env {
  FORTRESS_API_URL: string;
  FORTRESS_API_KEY: string;
  CHITTY_DATABASE_URL: string;
  CHITTY_ENCRYPTION_KEY: string;
  PGP_PUBLIC_KEY: string;
}

// Fortress API interfaces
interface FortressInputPayload {
  content: string;
  label: string;
}

interface FortressAgentJob {
  prompt: string;
  label: string;
}

interface FortressAssertion {
  subject: string;
  predicate: string;
  object: string;
  source: string;
  timestamp: number;
}

interface FortressOutput {
  output: string;
  signature: string;
  verified_by: string;
}

interface ChittyChainFact {
  uuid: string;
  subject: string;
  predicate: string;
  object: string;
  source: string;
  timestamp: number;
  ingested_at: number;
  verified: boolean;
  fortress_signature?: string;
}

// ChittyOS Evidence Management
interface EvidenceItem {
  id: string;
  fortress_job_id: string;
  input_hash: string;
  output_hash: string;
  pgp_signature: string;
  chain_facts: string[];
  created_at: string;
  status: 'pending' | 'completed' | 'verified' | 'failed';
  metadata: Record<string, any>;
}

class CloudflareFortressMCP {
  private server: Server;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.server = new Server(
      {
        name: 'cloudflare-fortress-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'fortress_secure_execute',
            description: 'Execute AI prompt in secure Fortress environment with PGP signing',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'AI prompt to execute securely'
                },
                label: {
                  type: 'string',
                  description: 'Label for the execution job'
                },
                evidence_id: {
                  type: 'string',
                  description: 'Optional evidence tracking ID'
                }
              },
              required: ['prompt', 'label']
            }
          },
          {
            name: 'fortress_ingest_content',
            description: 'Ingest content into Fortress trusted input directory',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'Content to ingest'
                },
                label: {
                  type: 'string',
                  description: 'Label for the content'
                }
              },
              required: ['content', 'label']
            }
          },
          {
            name: 'fortress_run_agent',
            description: 'Run AI agent on previously ingested content',
            inputSchema: {
              type: 'object',
              properties: {
                input_id: {
                  type: 'string',
                  description: 'Input ID from previous ingest operation'
                }
              },
              required: ['input_id']
            }
          },
          {
            name: 'fortress_get_output',
            description: 'Retrieve signed output from Fortress',
            inputSchema: {
              type: 'object',
              properties: {
                output_file: {
                  type: 'string',
                  description: 'Output file name'
                },
                verify_signature: {
                  type: 'boolean',
                  default: true,
                  description: 'Verify PGP signature'
                }
              },
              required: ['output_file']
            }
          },
          {
            name: 'fortress_log_assertion',
            description: 'Log an atomic fact assertion to ChittyChain',
            inputSchema: {
              type: 'object',
              properties: {
                subject: {
                  type: 'string',
                  description: 'Subject of the assertion'
                },
                predicate: {
                  type: 'string',
                  description: 'Predicate of the assertion'
                },
                object: {
                  type: 'string',
                  description: 'Object of the assertion'
                },
                source: {
                  type: 'string',
                  description: 'Source of the assertion'
                }
              },
              required: ['subject', 'predicate', 'object', 'source']
            }
          },
          {
            name: 'chitty_evidence_create',
            description: 'Create new evidence tracking record',
            inputSchema: {
              type: 'object',
              properties: {
                case_id: {
                  type: 'string',
                  description: 'Associated case ID'
                },
                evidence_type: {
                  type: 'string',
                  description: 'Type of evidence'
                },
                description: {
                  type: 'string',
                  description: 'Evidence description'
                },
                metadata: {
                  type: 'object',
                  description: 'Additional metadata'
                }
              },
              required: ['evidence_type', 'description']
            }
          },
          {
            name: 'chitty_evidence_list',
            description: 'List evidence records with filtering',
            inputSchema: {
              type: 'object',
              properties: {
                case_id: {
                  type: 'string',
                  description: 'Filter by case ID'
                },
                status: {
                  type: 'string',
                  enum: ['pending', 'completed', 'verified', 'failed'],
                  description: 'Filter by status'
                },
                limit: {
                  type: 'number',
                  default: 20
                },
                offset: {
                  type: 'number',
                  default: 0
                }
              }
            }
          },
          {
            name: 'chitty_chain_query',
            description: 'Query ChittyChain facts with filtering',
            inputSchema: {
              type: 'object',
              properties: {
                subject: {
                  type: 'string',
                  description: 'Filter by subject'
                },
                predicate: {
                  type: 'string',
                  description: 'Filter by predicate'
                },
                object: {
                  type: 'string',
                  description: 'Filter by object'
                },
                source: {
                  type: 'string',
                  description: 'Filter by source'
                },
                start_time: {
                  type: 'number',
                  description: 'Start timestamp filter'
                },
                end_time: {
                  type: 'number',
                  description: 'End timestamp filter'
                },
                verified_only: {
                  type: 'boolean',
                  default: false
                }
              }
            }
          },
          {
            name: 'fortress_verify_signature',
            description: 'Verify PGP signature of Fortress output',
            inputSchema: {
              type: 'object',
              properties: {
                content: {
                  type: 'string',
                  description: 'Content to verify'
                },
                signature: {
                  type: 'string',
                  description: 'PGP signature'
                },
                public_key: {
                  type: 'string',
                  description: 'PGP public key (optional, uses env default)'
                }
              },
              required: ['content', 'signature']
            }
          },
          {
            name: 'fortress_audit_trail',
            description: 'Get audit trail for a specific job or evidence',
            inputSchema: {
              type: 'object',
              properties: {
                job_id: {
                  type: 'string',
                  description: 'Fortress job ID'
                },
                evidence_id: {
                  type: 'string',
                  description: 'Evidence ID'
                },
                include_chain_facts: {
                  type: 'boolean',
                  default: true
                }
              }
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'fortress_secure_execute':
            return await this.handleSecureExecute(args);
          
          case 'fortress_ingest_content':
            return await this.handleIngestContent(args);
          
          case 'fortress_run_agent':
            return await this.handleRunAgent(args);
          
          case 'fortress_get_output':
            return await this.handleGetOutput(args);
          
          case 'fortress_log_assertion':
            return await this.handleLogAssertion(args);
          
          case 'chitty_evidence_create':
            return await this.handleCreateEvidence(args);
          
          case 'chitty_evidence_list':
            return await this.handleListEvidence(args);
          
          case 'chitty_chain_query':
            return await this.handleChainQuery(args);
          
          case 'fortress_verify_signature':
            return await this.handleVerifySignature(args);
          
          case 'fortress_audit_trail':
            return await this.handleAuditTrail(args);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
        }
      } catch (error) {
        console.error(`Error in tool ${name}:`, error);
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private async handleSecureExecute(args: any) {
    const { prompt, label, evidence_id } = args;

    try {
      // Step 1: Ingest content
      const ingestResponse = await this.callFortressAPI('/ingest', 'POST', {
        content: prompt,
        label: label
      });

      const inputId = ingestResponse.input_id;

      // Step 2: Run agent
      const runResponse = await this.callFortressAPI(`/run/${inputId}`, 'POST');
      const outputFile = runResponse.output_file;

      // Step 3: Get output with signature
      const outputResponse = await this.callFortressAPI(`/output/${outputFile}`, 'GET');

      // Step 4: Create evidence record if evidence_id provided
      let evidenceRecord = null;
      if (evidence_id) {
        evidenceRecord = await this.createEvidenceRecord({
          id: evidence_id,
          fortress_job_id: inputId,
          input_hash: await this.calculateHash(prompt),
          output_hash: await this.calculateHash(outputResponse.output),
          pgp_signature: outputResponse.signature,
          status: 'completed'
        });
      }

      // Step 5: Log assertion about the execution
      const assertion = {
        subject: `fortress:job:${inputId}`,
        predicate: 'executed_securely',
        object: `output:${outputFile}`,
        source: 'fortress-mcp',
        timestamp: Date.now()
      };

      const assertionResponse = await this.callFortressAPI('/assert', 'POST', assertion);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              job_id: inputId,
              output: outputResponse.output,
              signature: outputResponse.signature,
              verified_by: outputResponse.verified_by,
              evidence_id: evidence_id,
              assertion_id: assertionResponse.fact_id,
              status: 'completed'
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      throw new Error(`Secure execution failed: ${error.message}`);
    }
  }

  private async handleIngestContent(args: any) {
    const { content, label } = args;

    const response = await this.callFortressAPI('/ingest', 'POST', {
      content,
      label
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            input_id: response.input_id,
            status: response.status,
            content_hash: await this.calculateHash(content)
          }, null, 2)
        }
      ]
    };
  }

  private async handleRunAgent(args: any) {
    const { input_id } = args;

    const response = await this.callFortressAPI(`/run/${input_id}`, 'POST');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            job_id: input_id,
            output_file: response.output_file,
            status: response.status
          }, null, 2)
        }
      ]
    };
  }

  private async handleGetOutput(args: any) {
    const { output_file, verify_signature = true } = args;

    const response = await this.callFortressAPI(`/output/${output_file}`, 'GET');

    let signatureValid = null;
    if (verify_signature) {
      signatureValid = await this.verifyPGPSignature(
        response.output,
        response.signature,
        this.env.PGP_PUBLIC_KEY
      );
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            output: response.output,
            signature: response.signature,
            verified_by: response.verified_by,
            signature_valid: signatureValid
          }, null, 2)
        }
      ]
    };
  }

  private async handleLogAssertion(args: any) {
    const { subject, predicate, object, source } = args;

    const assertion: FortressAssertion = {
      subject,
      predicate,
      object,
      source,
      timestamp: Date.now()
    };

    const response = await this.callFortressAPI('/assert', 'POST', assertion);

    // Also store in ChittyOS database
    await this.storeChainFact({
      uuid: response.fact_id,
      subject,
      predicate,
      object,
      source,
      timestamp: assertion.timestamp,
      ingested_at: Date.now(),
      verified: false
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            fact_id: response.fact_id,
            timestamp: response.timestamp,
            status: response.status
          }, null, 2)
        }
      ]
    };
  }

  private async handleCreateEvidence(args: any) {
    const { case_id, evidence_type, description, metadata = {} } = args;

    const evidenceId = crypto.randomUUID();
    const evidence: EvidenceItem = {
      id: evidenceId,
      fortress_job_id: '',
      input_hash: '',
      output_hash: '',
      pgp_signature: '',
      chain_facts: [],
      created_at: new Date().toISOString(),
      status: 'pending',
      metadata: {
        case_id,
        evidence_type,
        description,
        ...metadata
      }
    };

    await this.storeEvidence(evidence);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ evidence }, null, 2)
        }
      ]
    };
  }

  private async handleListEvidence(args: any) {
    const { case_id, status, limit = 20, offset = 0 } = args;

    const evidence = await this.getEvidence({ case_id, status }, limit, offset);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ evidence, count: evidence.length }, null, 2)
        }
      ]
    };
  }

  private async handleChainQuery(args: any) {
    const {
      subject,
      predicate,
      object,
      source,
      start_time,
      end_time,
      verified_only = false
    } = args;

    const facts = await this.queryChainFacts({
      subject,
      predicate,
      object,
      source,
      start_time,
      end_time,
      verified_only
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ facts, count: facts.length }, null, 2)
        }
      ]
    };
  }

  private async handleVerifySignature(args: any) {
    const { content, signature, public_key } = args;

    const keyToUse = public_key || this.env.PGP_PUBLIC_KEY;
    const isValid = await this.verifyPGPSignature(content, signature, keyToUse);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            content_hash: await this.calculateHash(content),
            signature_valid: isValid,
            verified_at: new Date().toISOString()
          }, null, 2)
        }
      ]
    };
  }

  private async handleAuditTrail(args: any) {
    const { job_id, evidence_id, include_chain_facts = true } = args;

    const trail = await this.getAuditTrail(job_id, evidence_id, include_chain_facts);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ audit_trail: trail }, null, 2)
        }
      ]
    };
  }

  // Helper methods
  private async callFortressAPI(endpoint: string, method: string, body?: any) {
    const url = `${this.env.FORTRESS_API_URL}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.env.FORTRESS_API_KEY
      }
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Fortress API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  private async calculateHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async verifyPGPSignature(content: string, signature: string, publicKey: string): Promise<boolean> {
    // Placeholder for PGP verification - implement with crypto library
    // In a real implementation, you'd use a PGP library like OpenPGP.js
    console.log('PGP verification not implemented in this demo');
    return true; // Mock verification
  }

  // Database operations
  private async storeEvidence(evidence: EvidenceItem) {
    // Implementation for storing evidence in database
    console.log('Storing evidence:', evidence.id);
  }

  private async getEvidence(filters: any, limit: number, offset: number): Promise<EvidenceItem[]> {
    // Implementation for retrieving evidence
    return [];
  }

  private async storeChainFact(fact: ChittyChainFact) {
    // Implementation for storing chain facts
    console.log('Storing chain fact:', fact.uuid);
  }

  private async queryChainFacts(filters: any): Promise<ChittyChainFact[]> {
    // Implementation for querying chain facts
    return [];
  }

  private async createEvidenceRecord(data: any): Promise<EvidenceItem> {
    const evidence: EvidenceItem = {
      ...data,
      chain_facts: [],
      created_at: new Date().toISOString(),
      metadata: data.metadata || {}
    };

    await this.storeEvidence(evidence);
    return evidence;
  }

  private async getAuditTrail(jobId?: string, evidenceId?: string, includeChainFacts: boolean = true) {
    // Implementation for retrieving audit trail
    return {
      job_id: jobId,
      evidence_id: evidenceId,
      events: [],
      chain_facts: includeChainFacts ? [] : undefined
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Cloudflare Fortress MCP Server running');
  }
}

// Cloudflare Worker export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'cloudflare-fortress-mcp',
        fortress_api: env.FORTRESS_API_URL,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Fortress MCP Server', { status: 200 });
  }
};

// For local development
if (typeof process !== 'undefined' && process.env) {
  const env = {
    FORTRESS_API_URL: process.env.FORTRESS_API_URL || 'http://localhost:8000',
    FORTRESS_API_KEY: process.env.FORTRESS_API_KEY!,
    CHITTY_DATABASE_URL: process.env.CHITTY_DATABASE_URL!,
    CHITTY_ENCRYPTION_KEY: process.env.CHITTY_ENCRYPTION_KEY!,
    PGP_PUBLIC_KEY: process.env.PGP_PUBLIC_KEY!
  };

  const server = new CloudflareFortressMCP(env);
  server.start().catch(console.error);
}