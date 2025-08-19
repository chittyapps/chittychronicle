// Email Bill Ingestion MCP Server
// Universal email processing for bills@chitty.cc and receipts@chitty.cc

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

interface Env {
  COORDINATOR_MCP_URL: string;
  CAO_BILL_MCP_URL: string;
  PLAID_BILL_MCP_URL: string;
  PROPERTY_TAX_MCP_URL: string;
  CHITTY_DATABASE_URL: string;
  WAVE_API_KEY: string;
  WAVE_BUSINESS_ID: string;
  GMAIL_API_KEY: string;
  GMAIL_CLIENT_SECRET: string;
}

// Sender recognition patterns
const SENDER_PATTERNS = {
  utilities: {
    'comed': ['noreply@comed.com', 'customerservice@comed.com', 'billing@comed.com'],
    'peoples_gas': ['noreply@peoplesgasdelivery.com', 'customercare@peoplesgasdelivery.com'],
    'xfinity': ['comcast@email.comcast.com', 'xfinity@comcast.com', 'noreply@comcast.com'],
    'nicor': ['customercare@nicorgas.com', 'noreply@nicorgas.com'],
    'water_dept': ['billing@cityofchicago.org', 'water@cityofchicago.org']
  },
  retail: {
    'homedepot': ['DoNotReply@orders.homedepot.com', 'receipts@homedepot.com'],
    'lowes': ['DoNotReply@lowes.com', 'receipts@lowes.com'],
    'amazon': ['auto-confirm@amazon.com', 'ship-confirm@amazon.com'],
    'target': ['GuestServices@target.com', 'receipts@target.com'],
    'walmart': ['noreply@walmart.com', 'pickup@walmart.com']
  },
  services: {
    'insurance': [
      'noreply@usaa.com', 'service@usaa.com',
      'noreply@geico.com', 'service@geico.com',
      'noreply@allstate.com'
    ],
    'banks': [
      'noreply@chase.com', 'alerts@chase.com',
      'noreply@bankofamerica.com', 'alerts@bofa.com',
      'noreply@wellsfargo.com'
    ],
    'subscriptions': [
      'noreply@netflix.com', 'billing@netflix.com',
      'noreply@spotify.com', 'billing@spotify.com',
      'noreply@adobe.com'
    ]
  },
  property: {
    'cook_county': ['noreply@cookcountyil.gov', 'treasurer@cookcountyil.gov'],
    'chicago': ['noreply@cityofchicago.org', 'buildings@cityofchicago.org'],
    'hoa': ['billing@', 'management@', 'accounting@'] // Pattern matching
  }
};

// Wave Accounting categories mapping
const WAVE_CATEGORIES = {
  utilities: 'Utilities',
  retail_supplies: 'Office Supplies & Materials',
  retail_equipment: 'Equipment',
  insurance: 'Insurance',
  property_tax: 'Taxes & Licenses',
  banking: 'Bank Charges',
  subscriptions: 'Software & Subscriptions',
  maintenance: 'Repairs & Maintenance',
  other: 'General Business Expenses'
};

interface EmailBill {
  messageId: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string;
  attachments: Array<{
    filename: string;
    contentType: string;
    data: string;
  }>;
  extractedData?: {
    amount?: number;
    dueDate?: string;
    accountNumber?: string;
    billType?: string;
    vendor?: string;
  };
}

interface ProcessingResult {
  success: boolean;
  billId: string;
  routedTo: string;
  extractedData: any;
  waveTransactionId?: string;
  evidenceId?: string;
}

class EmailBillIngestionMCP {
  private server: Server;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.server = new Server(
      {
        name: 'email-bill-ingestion-mcp',
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
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'email_bill_process_inbox',
            description: 'Process all unread bills from bills@chitty.cc and receipts@chitty.cc',
            inputSchema: {
              type: 'object',
              properties: {
                mailboxes: {
                  type: 'array',
                  items: { type: 'string', enum: ['bills@chitty.cc', 'receipts@chitty.cc', 'both'] },
                  default: ['both'],
                  description: 'Email addresses to process'
                },
                processAttachments: {
                  type: 'boolean',
                  default: true,
                  description: 'Process PDF attachments for bill data'
                },
                autoRoute: {
                  type: 'boolean',
                  default: true,
                  description: 'Automatically route to appropriate MCP based on sender'
                },
                syncToWave: {
                  type: 'boolean',
                  default: true,
                  description: 'Sync processed bills to Wave Accounting'
                },
                securityLevel: {
                  type: 'string',
                  enum: ['standard', 'fortress', 'verified'],
                  default: 'verified',
                  description: 'Security level for AI processing'
                }
              }
            }
          },
          {
            name: 'email_bill_process_single',
            description: 'Process a specific email bill by message ID',
            inputSchema: {
              type: 'object',
              properties: {
                messageId: {
                  type: 'string',
                  description: 'Gmail message ID to process'
                },
                forceRoute: {
                  type: 'string',
                  enum: ['cao', 'plaid', 'property', 'manual'],
                  description: 'Force routing to specific processor'
                },
                syncToWave: {
                  type: 'boolean',
                  default: true
                },
                createEvidence: {
                  type: 'boolean',
                  default: true,
                  description: 'Create evidence package for legal/tax purposes'
                }
              },
              required: ['messageId']
            }
          },
          {
            name: 'email_bill_setup_monitoring',
            description: 'Set up automated email monitoring with rules',
            inputSchema: {
              type: 'object',
              properties: {
                monitoringRules: {
                  type: 'object',
                  properties: {
                    autoProcess: { type: 'boolean', default: true },
                    processInterval: { type: 'string', default: 'hourly' },
                    alertOnLargeBills: { type: 'number', default: 1000 },
                    alertOnFailures: { type: 'boolean', default: true }
                  }
                },
                senderRules: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      senderPattern: { type: 'string' },
                      routeTo: { type: 'string' },
                      waveCategory: { type: 'string' },
                      securityLevel: { type: 'string' }
                    }
                  }
                }
              }
            }
          },
          {
            name: 'email_bill_extract_data',
            description: 'Extract structured data from email bill using AI',
            inputSchema: {
              type: 'object',
              properties: {
                emailContent: {
                  type: 'string',
                  description: 'Email content to analyze'
                },
                attachments: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Base64 encoded attachment data'
                },
                billType: {
                  type: 'string',
                  enum: ['utility', 'retail', 'service', 'property', 'unknown'],
                  default: 'unknown'
                },
                securityLevel: {
                  type: 'string',
                  enum: ['standard', 'fortress', 'verified'],
                  default: 'verified'
                }
              },
              required: ['emailContent']
            }
          },
          {
            name: 'email_bill_route_to_processor',
            description: 'Route extracted bill data to appropriate MCP processor',
            inputSchema: {
              type: 'object',
              properties: {
                billData: {
                  type: 'object',
                  description: 'Extracted bill data'
                },
                processorType: {
                  type: 'string',
                  enum: ['cao', 'plaid', 'property', 'manual'],
                  description: 'Target processor'
                },
                originalEmail: {
                  type: 'object',
                  description: 'Original email metadata'
                }
              },
              required: ['billData', 'processorType']
            }
          },
          {
            name: 'email_bill_sync_to_wave',
            description: 'Sync processed bill to Wave Accounting',
            inputSchema: {
              type: 'object',
              properties: {
                billData: {
                  type: 'object',
                  description: 'Processed bill data'
                },
                waveCategory: {
                  type: 'string',
                  description: 'Wave accounting category'
                },
                createReceiptUpload: {
                  type: 'boolean',
                  default: true,
                  description: 'Upload original email/attachments as receipt'
                }
              },
              required: ['billData']
            }
          },
          {
            name: 'email_bill_analytics',
            description: 'Generate analytics on email bill processing',
            inputSchema: {
              type: 'object',
              properties: {
                timeRange: {
                  type: 'object',
                  properties: {
                    startDate: { type: 'string' },
                    endDate: { type: 'string' }
                  }
                },
                groupBy: {
                  type: 'string',
                  enum: ['sender', 'category', 'processor', 'date'],
                  default: 'category'
                },
                includeFailures: {
                  type: 'boolean',
                  default: true
                }
              }
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'email_bill_process_inbox':
            return await this.handleProcessInbox(args);
          
          case 'email_bill_process_single':
            return await this.handleProcessSingle(args);
          
          case 'email_bill_setup_monitoring':
            return await this.handleSetupMonitoring(args);
          
          case 'email_bill_extract_data':
            return await this.handleExtractData(args);
          
          case 'email_bill_route_to_processor':
            return await this.handleRouteToProcessor(args);
          
          case 'email_bill_sync_to_wave':
            return await this.handleSyncToWave(args);
          
          case 'email_bill_analytics':
            return await this.handleAnalytics(args);
          
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

  private async handleProcessInbox(args: any) {
    const {
      mailboxes = ['both'],
      processAttachments = true,
      autoRoute = true,
      syncToWave = true,
      securityLevel = 'verified'
    } = args;

    const results = {
      processed: 0,
      successful: 0,
      failed: 0,
      routed: {
        cao: 0,
        plaid: 0,
        property: 0,
        manual: 0
      },
      waveTransactions: 0,
      errors: []
    };

    const emailAddresses = mailboxes.includes('both') 
      ? ['bills@chitty.cc', 'receipts@chitty.cc']
      : mailboxes;

    try {
      for (const emailAddress of emailAddresses) {
        // Get unread emails
        const unreadEmails = await this.getUnreadEmails(emailAddress);
        
        for (const email of unreadEmails) {
          try {
            // Extract bill data
            const extractedData = await this.extractBillData(email, securityLevel);
            
            // Determine routing
            let processorType = 'manual';
            if (autoRoute) {
              processorType = this.determineProcessor(email.from, extractedData);
            }

            // Route to processor
            const processingResult = await this.routeToProcessor(
              extractedData, 
              processorType, 
              email
            );

            // Sync to Wave if successful
            if (processingResult.success && syncToWave) {
              const waveResult = await this.syncToWave(extractedData, processorType);
              if (waveResult.success) {
                results.waveTransactions++;
                processingResult.waveTransactionId = waveResult.transactionId;
              }
            }

            if (processingResult.success) {
              results.successful++;
              results.routed[processorType]++;
            } else {
              results.failed++;
              results.errors.push({
                email: email.messageId,
                error: processingResult.error
              });
            }

            results.processed++;

          } catch (error) {
            results.failed++;
            results.errors.push({
              email: email.messageId,
              error: error.message
            });
          }
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              processing_summary: {
                emails_processed: results.processed,
                successful: results.successful,
                failed: results.failed,
                routing_breakdown: results.routed,
                wave_transactions_created: results.waveTransactions
              },
              mailboxes_processed: emailAddresses,
              security_level: securityLevel,
              errors: results.errors
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      throw new Error(`Email inbox processing failed: ${error.message}`);
    }
  }

  private async handleProcessSingle(args: any) {
    const {
      messageId,
      forceRoute,
      syncToWave = true,
      createEvidence = true
    } = args;

    try {
      // Get email by message ID
      const email = await this.getEmailById(messageId);
      
      // Extract bill data
      const extractedData = await this.extractBillData(email, 'verified');
      
      // Determine or use forced routing
      const processorType = forceRoute || this.determineProcessor(email.from, extractedData);
      
      // Route to processor
      const processingResult = await this.routeToProcessor(extractedData, processorType, email);
      
      // Sync to Wave
      let waveResult = null;
      if (processingResult.success && syncToWave) {
        waveResult = await this.syncToWave(extractedData, processorType);
      }

      // Create evidence package
      let evidenceId = null;
      if (createEvidence && processingResult.success) {
        const evidenceResult = await this.createEvidencePackage(
          email, 
          extractedData, 
          processingResult
        );
        evidenceId = evidenceResult.evidenceId;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: processingResult.success,
              message_id: messageId,
              extracted_data: extractedData,
              routed_to: processorType,
              processing_result: processingResult,
              wave_transaction: waveResult,
              evidence_id: evidenceId
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      throw new Error(`Single email processing failed: ${error.message}`);
    }
  }

  private async handleExtractData(args: any) {
    const {
      emailContent,
      attachments = [],
      billType = 'unknown',
      securityLevel = 'verified'
    } = args;

    // Create extraction prompt
    const extractionPrompt = `
Extract structured bill/receipt data from this email:

Email Content:
${emailContent}

${attachments.length > 0 ? `Attachments: ${attachments.length} files included` : 'No attachments'}

Extract the following information:
1. Vendor/Company name
2. Bill amount and currency
3. Due date
4. Account number or reference
5. Bill/Invoice number
6. Service period (if applicable)
7. Payment methods accepted
8. Category/type of expense
9. Tax amount (if separate)
10. Any late fees or additional charges

Return structured JSON with extracted data.
`;

    // Execute with specified security level
    const extractionResult = await this.callCoordinatorMCP('chitty_secure_ai_execute', {
      prompt: extractionPrompt,
      security_level: securityLevel,
      user_id: 'email-bill-system',
      label: `email-bill-extraction-${billType}`
    });

    const extractedData = JSON.parse(extractionResult.content[0].text);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            bill_type: billType,
            security_level: securityLevel,
            extracted_data: extractedData.results
          }, null, 2)
        }
      ]
    };
  }

  // Helper methods
  private determineProcessor(from: string, extractedData: any): string {
    // Check sender patterns
    for (const [category, patterns] of Object.entries(SENDER_PATTERNS)) {
      for (const [processor, senders] of Object.entries(patterns)) {
        if (senders.some(sender => from.toLowerCase().includes(sender.toLowerCase()))) {
          switch (category) {
            case 'utilities':
              return 'plaid';
            case 'retail':
              return 'cao';
            case 'property':
              return 'property';
            default:
              return 'manual';
          }
        }
      }
    }

    // AI-based classification fallback
    if (extractedData?.vendor) {
      const vendor = extractedData.vendor.toLowerCase();
      if (vendor.includes('home depot') || vendor.includes('lowes')) return 'cao';
      if (vendor.includes('comed') || vendor.includes('xfinity') || vendor.includes('usaa')) return 'plaid';
      if (vendor.includes('cook county') || vendor.includes('property tax')) return 'property';
    }

    return 'manual';
  }

  private async routeToProcessor(extractedData: any, processorType: string, email: EmailBill) {
    const routingMap = {
      'cao': this.env.CAO_BILL_MCP_URL,
      'plaid': this.env.PLAID_BILL_MCP_URL,
      'property': this.env.PROPERTY_TAX_MCP_URL,
      'manual': null
    };

    if (processorType === 'manual') {
      return {
        success: true,
        processorType: 'manual',
        message: 'Requires manual processing'
      };
    }

    const mcpUrl = routingMap[processorType];
    if (!mcpUrl) {
      throw new Error(`Unknown processor type: ${processorType}`);
    }

    // Route to appropriate MCP
    const response = await fetch(`${mcpUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: `${processorType}_process_email_bill`,
        arguments: {
          extractedData,
          originalEmail: {
            messageId: email.messageId,
            from: email.from,
            subject: email.subject,
            date: email.date
          }
        }
      })
    });

    return await response.json();
  }

  private async syncToWave(extractedData: any, processorType: string) {
    // Determine Wave category
    const category = this.determineWaveCategory(extractedData, processorType);
    
    // Create Wave transaction
    const waveTransaction = {
      amount: extractedData.amount || 0,
      description: `${extractedData.vendor || 'Unknown'} - ${extractedData.billNumber || 'Email Bill'}`,
      category: category,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      notes: `Processed via email ingestion from ${extractedData.vendor || 'unknown sender'}`
    };

    // Call Wave API (implementation would integrate with actual Wave API)
    return {
      success: true,
      transactionId: `wave_${Date.now()}`,
      category: category
    };
  }

  private determineWaveCategory(extractedData: any, processorType: string): string {
    // Map processor types to Wave categories
    const processorCategories = {
      'cao': 'Office Supplies & Materials',
      'plaid': 'Utilities',
      'property': 'Taxes & Licenses',
      'manual': 'General Business Expenses'
    };

    return processorCategories[processorType] || WAVE_CATEGORIES.other;
  }

  private async callCoordinatorMCP(tool: string, args: any) {
    const response = await fetch(`${this.env.COORDINATOR_MCP_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, arguments: args })
    });
    return await response.json();
  }

  // Placeholder methods for email integration
  private async getUnreadEmails(emailAddress: string): Promise<EmailBill[]> {
    // Would integrate with Gmail API
    return [];
  }

  private async getEmailById(messageId: string): Promise<EmailBill> {
    // Would retrieve specific email
    return null;
  }

  private async extractBillData(email: EmailBill, securityLevel: string) {
    // Would extract data using AI
    return {};
  }

  private async createEvidencePackage(email: EmailBill, extractedData: any, processingResult: any) {
    // Would create evidence package
    return { evidenceId: crypto.randomUUID() };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Email Bill Ingestion MCP Server running');
  }
}

// Cloudflare Worker export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'email-bill-ingestion-mcp',
        supported_mailboxes: ['bills@chitty.cc', 'receipts@chitty.cc'],
        integrations: ['Wave Accounting', 'CAO Bills', 'Plaid Bills', 'Property Tax'],
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Email Bill Ingestion MCP Server', { status: 200 });
  }
};

// For local development
if (typeof process !== 'undefined' && process.env) {
  const env = {
    COORDINATOR_MCP_URL: process.env.COORDINATOR_MCP_URL || 'http://localhost:8003',
    CAO_BILL_MCP_URL: process.env.CAO_BILL_MCP_URL || 'http://localhost:8004',
    PLAID_BILL_MCP_URL: process.env.PLAID_BILL_MCP_URL || 'http://localhost:8005',
    PROPERTY_TAX_MCP_URL: process.env.PROPERTY_TAX_MCP_URL || 'http://localhost:8006',
    CHITTY_DATABASE_URL: process.env.CHITTY_DATABASE_URL!,
    WAVE_API_KEY: process.env.WAVE_API_KEY!,
    WAVE_BUSINESS_ID: process.env.WAVE_BUSINESS_ID!,
    GMAIL_API_KEY: process.env.GMAIL_API_KEY!,
    GMAIL_CLIENT_SECRET: process.env.GMAIL_CLIENT_SECRET!
  };

  const server = new EmailBillIngestionMCP(env);
  server.start().catch(console.error);
}