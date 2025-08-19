// CAO Bill Retrieval MCP Integration
// Connects retail bill workflows with secure AI analysis and evidence tracking

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
  CHATGPT_MCP_URL: string;
  FORTRESS_MCP_URL: string;
  CHITTY_DATABASE_URL: string;
  ONEPASSWORD_SERVICE_ACCOUNT_TOKEN: string;
  CAO_WORKSPACE_PATH: string;
}

interface BillAnalysisRequest {
  bills: any[];
  analysisType: 'cost_breakdown' | 'trend_analysis' | 'tax_preparation' | 'expense_categorization' | 'anomaly_detection';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  vendors: string[];
  securityLevel: 'standard' | 'fortress' | 'verified';
  createEvidence?: boolean;
  caseId?: string;
}

interface BillRetrievalResult {
  success: boolean;
  vendor: string;
  billsRetrieved: number;
  totalAmount: number;
  bills: {
    orderNumber: string;
    date: string;
    amount: number;
    itemCount: number;
  }[];
  memoryCloudKeys: string[];
  chainRecordId: string;
}

class CAOBillMCP {
  private server: Server;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.server = new Server(
      {
        name: 'cao-bill-mcp',
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
            name: 'cao_retrieve_and_analyze_bills',
            description: 'Retrieve retail bills and perform secure AI analysis with evidence tracking',
            inputSchema: {
              type: 'object',
              properties: {
                vendors: {
                  type: 'array',
                  items: { type: 'string', enum: ['homedepot', 'lowes', 'all'] },
                  default: ['all'],
                  description: 'Vendors to retrieve bills from'
                },
                dateRange: {
                  type: 'object',
                  properties: {
                    startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
                    endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' }
                  },
                  required: ['startDate', 'endDate']
                },
                analysisType: {
                  type: 'string',
                  enum: ['cost_breakdown', 'trend_analysis', 'tax_preparation', 'expense_categorization', 'anomaly_detection'],
                  default: 'cost_breakdown',
                  description: 'Type of analysis to perform on retrieved bills'
                },
                securityLevel: {
                  type: 'string',
                  enum: ['standard', 'fortress', 'verified'],
                  default: 'standard',
                  description: 'Security level for AI analysis'
                },
                createEvidence: {
                  type: 'boolean',
                  default: false,
                  description: 'Create legal evidence package for tax/audit purposes'
                },
                caseId: {
                  type: 'string',
                  description: 'Case ID for legal evidence tracking'
                }
              },
              required: ['dateRange']
            }
          },
          {
            name: 'cao_smart_bill_categorization',
            description: 'Use AI to categorize and tag bills for accounting/tax purposes',
            inputSchema: {
              type: 'object',
              properties: {
                billIds: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Memory-Cloude bill IDs to categorize'
                },
                categories: {
                  type: 'array',
                  items: { type: 'string' },
                  default: ['materials', 'tools', 'equipment', 'services', 'maintenance', 'other'],
                  description: 'Expense categories to use'
                },
                aiModel: {
                  type: 'string',
                  default: 'gpt-4',
                  description: 'AI model for categorization'
                },
                createTaxSummary: {
                  type: 'boolean',
                  default: true,
                  description: 'Generate tax-ready expense summary'
                }
              },
              required: ['billIds']
            }
          },
          {
            name: 'cao_bill_anomaly_detection',
            description: 'Detect unusual spending patterns or potential fraud in bills',
            inputSchema: {
              type: 'object',
              properties: {
                vendor: {
                  type: 'string',
                  enum: ['homedepot', 'lowes', 'all'],
                  default: 'all'
                },
                timeframe: {
                  type: 'string',
                  enum: ['last_30_days', 'last_90_days', 'last_year', 'custom'],
                  default: 'last_90_days'
                },
                customDateRange: {
                  type: 'object',
                  properties: {
                    startDate: { type: 'string' },
                    endDate: { type: 'string' }
                  }
                },
                anomalyTypes: {
                  type: 'array',
                  items: { 
                    type: 'string', 
                    enum: ['unusual_amounts', 'frequency_spikes', 'item_anomalies', 'price_variations', 'timing_patterns'] 
                  },
                  default: ['unusual_amounts', 'frequency_spikes'],
                  description: 'Types of anomalies to detect'
                },
                alertThreshold: {
                  type: 'number',
                  default: 0.8,
                  description: 'Confidence threshold for anomaly alerts (0-1)'
                }
              }
            }
          },
          {
            name: 'cao_generate_expense_report',
            description: 'Generate comprehensive expense reports from retrieved bills',
            inputSchema: {
              type: 'object',
              properties: {
                reportType: {
                  type: 'string',
                  enum: ['monthly', 'quarterly', 'annual', 'custom', 'tax_summary'],
                  default: 'monthly'
                },
                dateRange: {
                  type: 'object',
                  properties: {
                    startDate: { type: 'string' },
                    endDate: { type: 'string' }
                  },
                  required: ['startDate', 'endDate']
                },
                includeItemDetails: {
                  type: 'boolean',
                  default: false,
                  description: 'Include line-item details in report'
                },
                groupBy: {
                  type: 'string',
                  enum: ['vendor', 'category', 'date', 'amount'],
                  default: 'vendor'
                },
                outputFormat: {
                  type: 'string',
                  enum: ['json', 'csv', 'pdf', 'excel'],
                  default: 'json'
                },
                secureGeneration: {
                  type: 'boolean',
                  default: true,
                  description: 'Use Fortress MCP for report generation'
                }
              },
              required: ['dateRange']
            }
          },
          {
            name: 'cao_execute_bill_workflow',
            description: 'Execute CAO retail bill workflows directly through MCP',
            inputSchema: {
              type: 'object',
              properties: {
                workflow: {
                  type: 'string',
                  enum: ['retrieveHomeDepotBills', 'retrieveLowesBills', 'retrieveAllRetailBills'],
                  description: 'CAO workflow to execute'
                },
                parameters: {
                  type: 'object',
                  description: 'Parameters to pass to the workflow'
                },
                trackExecution: {
                  type: 'boolean',
                  default: true,
                  description: 'Track execution in ChittyChain'
                }
              },
              required: ['workflow', 'parameters']
            }
          },
          {
            name: 'cao_bill_tax_preparation',
            description: 'Prepare tax-ready summaries and documentation from bills',
            inputSchema: {
              type: 'object',
              properties: {
                taxYear: {
                  type: 'number',
                  default: 2024,
                  description: 'Tax year for preparation'
                },
                businessEntity: {
                  type: 'string',
                  description: 'Business entity name for tax filing'
                },
                expenseCategories: {
                  type: 'array',
                  items: { type: 'string' },
                  default: ['business_equipment', 'materials', 'maintenance', 'professional_services'],
                  description: 'Tax expense categories'
                },
                generateScheduleC: {
                  type: 'boolean',
                  default: false,
                  description: 'Generate Schedule C business expense summary'
                },
                includeSupporting: {
                  type: 'boolean',
                  default: true,
                  description: 'Include supporting documentation'
                },
                securityLevel: {
                  type: 'string',
                  enum: ['standard', 'fortress', 'verified'],
                  default: 'verified',
                  description: 'Security level for tax document generation'
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
          case 'cao_retrieve_and_analyze_bills':
            return await this.handleRetrieveAndAnalyzeBills(args);
          
          case 'cao_smart_bill_categorization':
            return await this.handleSmartBillCategorization(args);
          
          case 'cao_bill_anomaly_detection':
            return await this.handleBillAnomalyDetection(args);
          
          case 'cao_generate_expense_report':
            return await this.handleGenerateExpenseReport(args);
          
          case 'cao_execute_bill_workflow':
            return await this.handleExecuteBillWorkflow(args);
          
          case 'cao_bill_tax_preparation':
            return await this.handleBillTaxPreparation(args);
          
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

  private async handleRetrieveAndAnalyzeBills(args: any) {
    const {
      vendors = ['all'],
      dateRange,
      analysisType = 'cost_breakdown',
      securityLevel = 'standard',
      createEvidence = false,
      caseId
    } = args;

    const executionId = crypto.randomUUID();
    const results: any = {
      executionId,
      retrievalResults: {},
      analysisResults: null,
      evidenceId: null,
      totalBills: 0,
      totalAmount: 0
    };

    try {
      // Step 1: Retrieve bills using CAO workflows
      const vendorsToRetrieve = vendors.includes('all') ? ['homedepot', 'lowes'] : vendors;
      
      for (const vendor of vendorsToRetrieve) {
        const workflowName = vendor === 'homedepot' ? 'retrieveHomeDepotBills' : 'retrieveLowesBills';
        
        const retrievalResult = await this.executeCAOWorkflow(workflowName, {
          dateRange,
          accountType: 'pro'
        });

        results.retrievalResults[vendor] = retrievalResult;
        results.totalBills += retrievalResult.billsRetrieved || 0;
        results.totalAmount += retrievalResult.totalAmount || 0;
      }

      // Step 2: Gather bills from Memory-Cloude for analysis
      const allBills = await this.gatherBillsFromMemory(dateRange, vendorsToRetrieve);

      // Step 3: Perform AI analysis with specified security level
      if (allBills.length > 0) {
        const analysisPrompt = this.buildAnalysisPrompt(allBills, analysisType);
        
        const analysisResult = await this.callCoordinatorMCP('chitty_secure_ai_execute', {
          prompt: analysisPrompt,
          security_level: securityLevel,
          user_id: 'cao-system',
          label: `bill-analysis-${analysisType}`,
          create_evidence: createEvidence,
          case_id: caseId
        });

        results.analysisResults = JSON.parse(analysisResult.content[0].text);
      }

      // Step 4: Create evidence package if requested
      if (createEvidence && results.analysisResults) {
        const evidencePackage = await this.callCoordinatorMCP('chitty_evidence_package', {
          execution_id: results.analysisResults.execution_id,
          case_id: caseId,
          package_format: 'json'
        });

        results.evidenceId = JSON.parse(evidencePackage.content[0].text).evidence_package.package_id;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              execution_id: executionId,
              summary: {
                bills_retrieved: results.totalBills,
                total_amount: results.totalAmount,
                vendors_processed: vendorsToRetrieve,
                analysis_type: analysisType,
                security_level: securityLevel
              },
              retrieval_results: results.retrievalResults,
              analysis_results: results.analysisResults,
              evidence_id: results.evidenceId
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      throw new Error(`Bill retrieval and analysis failed: ${error.message}`);
    }
  }

  private async handleSmartBillCategorization(args: any) {
    const {
      billIds,
      categories = ['materials', 'tools', 'equipment', 'services', 'maintenance', 'other'],
      aiModel = 'gpt-4',
      createTaxSummary = true
    } = args;

    // Retrieve bills from Memory-Cloude
    const bills = await this.getBillsByIds(billIds);

    // Create categorization prompt
    const categorizationPrompt = `
Analyze these retail bills and categorize each item for business expense tracking:

Categories available: ${categories.join(', ')}

Bills to categorize:
${JSON.stringify(bills.map(bill => ({
  orderNumber: bill.orderNumber,
  vendor: bill.vendor,
  date: bill.date,
  amount: bill.amount,
  items: bill.items
})), null, 2)}

For each bill and item, provide:
1. Primary expense category
2. Tax deductibility assessment (business/personal/mixed)
3. Recommended accounting code
4. Notes for tax preparation

Return structured JSON with categorization results.
`;

    // Execute with ChatGPT MCP
    const categorizationResult = await this.callChatGPTMCP('chatgpt_complete', {
      messages: [
        { role: 'system', content: 'You are a business expense categorization expert.' },
        { role: 'user', content: categorizationPrompt }
      ],
      model: aiModel
    });

    const categorization = JSON.parse(categorizationResult.content[0].text).response;

    // Update bills in Memory-Cloude with categories
    for (const bill of bills) {
      await this.updateBillCategories(bill.id, categorization);
    }

    // Generate tax summary if requested
    let taxSummary = null;
    if (createTaxSummary) {
      taxSummary = await this.generateTaxSummary(bills, categorization);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            bills_categorized: bills.length,
            categorization_results: categorization,
            tax_summary: taxSummary
          }, null, 2)
        }
      ]
    };
  }

  private async handleBillAnomalyDetection(args: any) {
    const {
      vendor = 'all',
      timeframe = 'last_90_days',
      customDateRange,
      anomalyTypes = ['unusual_amounts', 'frequency_spikes'],
      alertThreshold = 0.8
    } = args;

    // Determine date range
    const dateRange = this.calculateDateRange(timeframe, customDateRange);

    // Retrieve historical bills for analysis
    const bills = await this.getBillsForAnomalyDetection(vendor, dateRange);

    // Create anomaly detection prompt
    const anomalyPrompt = `
Analyze these retail bills for anomalies and unusual patterns:

Anomaly types to detect: ${anomalyTypes.join(', ')}
Alert threshold: ${alertThreshold}

Historical bills data:
${JSON.stringify(bills.map(bill => ({
  date: bill.date,
  vendor: bill.vendor,
  amount: bill.amount,
  itemCount: bill.items?.length || 0,
  orderNumber: bill.orderNumber
})), null, 2)}

Identify:
1. Unusual spending amounts (compared to historical average)
2. Frequency spikes (more orders than normal)
3. Item anomalies (unusual items or quantities)
4. Price variations (same items at different prices)
5. Timing patterns (orders at unusual times)

For each anomaly found, provide:
- Confidence score (0-1)
- Description of the anomaly
- Potential causes
- Recommended actions

Return structured JSON with anomaly analysis.
`;

    // Execute with Fortress MCP for secure analysis
    const anomalyResult = await this.callFortressMCP('fortress_secure_execute', {
      prompt: anomalyPrompt,
      label: 'bill-anomaly-detection'
    });

    const anomalies = JSON.parse(anomalyResult.content[0].text).output;

    // Filter by alert threshold
    const highConfidenceAnomalies = this.filterAnomaliesByThreshold(anomalies, alertThreshold);

    // Record findings on ChittyChain
    await this.callFortressMCP('fortress_log_assertion', {
      subject: `bill-anomaly-scan:${Date.now()}`,
      predicate: 'detected_anomalies',
      object: `count:${highConfidenceAnomalies.length}`,
      source: 'cao-bill-mcp'
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            scan_summary: {
              bills_analyzed: bills.length,
              anomalies_detected: highConfidenceAnomalies.length,
              date_range: dateRange,
              alert_threshold: alertThreshold
            },
            anomalies: highConfidenceAnomalies,
            full_analysis: anomalies
          }, null, 2)
        }
      ]
    };
  }

  private async handleGenerateExpenseReport(args: any) {
    const {
      reportType = 'monthly',
      dateRange,
      includeItemDetails = false,
      groupBy = 'vendor',
      outputFormat = 'json',
      secureGeneration = true
    } = args;

    // Retrieve bills for report period
    const bills = await this.getBillsForReport(dateRange);

    // Create report generation prompt
    const reportPrompt = `
Generate a comprehensive expense report with the following specifications:

Report Type: ${reportType}
Date Range: ${dateRange.startDate} to ${dateRange.endDate}
Group By: ${groupBy}
Include Item Details: ${includeItemDetails}
Output Format: ${outputFormat}

Bills data:
${JSON.stringify(bills, null, 2)}

Generate a professional expense report including:
1. Executive summary
2. Total amounts by category/vendor
3. Spending trends and patterns
4. Notable items or anomalies
5. Tax implications summary
6. Recommendations for cost optimization

Format the output as requested (${outputFormat}).
`;

    // Use appropriate MCP based on security setting
    const securityLevel = secureGeneration ? 'fortress' : 'standard';
    
    const reportResult = await this.callCoordinatorMCP('chitty_secure_ai_execute', {
      prompt: reportPrompt,
      security_level: securityLevel,
      user_id: 'cao-system',
      label: `expense-report-${reportType}`
    });

    const report = JSON.parse(reportResult.content[0].text);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            report_type: reportType,
            date_range: dateRange,
            bills_included: bills.length,
            security_level: securityLevel,
            report: report.results
          }, null, 2)
        }
      ]
    };
  }

  private async handleExecuteBillWorkflow(args: any) {
    const {
      workflow,
      parameters,
      trackExecution = true
    } = args;

    const result = await this.executeCAOWorkflow(workflow, parameters);

    if (trackExecution) {
      await this.callFortressMCP('fortress_log_assertion', {
        subject: `cao-workflow:${workflow}`,
        predicate: 'executed',
        object: `result:${result.success ? 'success' : 'failure'}`,
        source: 'cao-bill-mcp'
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            workflow_executed: workflow,
            parameters_used: parameters,
            execution_tracked: trackExecution,
            result
          }, null, 2)
        }
      ]
    };
  }

  private async handleBillTaxPreparation(args: any) {
    const {
      taxYear = 2024,
      businessEntity,
      expenseCategories = ['business_equipment', 'materials', 'maintenance', 'professional_services'],
      generateScheduleC = false,
      includeSupporting = true,
      securityLevel = 'verified'
    } = args;

    // Retrieve bills for tax year
    const bills = await this.getBillsForTaxYear(taxYear);

    // Create tax preparation prompt
    const taxPrompt = `
Prepare tax documentation for the following business expenses:

Tax Year: ${taxYear}
Business Entity: ${businessEntity || 'Not specified'}
Expense Categories: ${expenseCategories.join(', ')}

Bills for tax preparation:
${JSON.stringify(bills, null, 2)}

Generate:
1. Expense summary by category
2. Total deductible amounts
3. Documentation requirements checklist
4. IRS compliance notes
${generateScheduleC ? '5. Schedule C business expense breakdown' : ''}

Ensure all calculations are accurate and compliant with current tax code.
`;

    // Execute with verified security level
    const taxResult = await this.callCoordinatorMCP('chitty_secure_ai_execute', {
      prompt: taxPrompt,
      security_level: securityLevel,
      user_id: 'cao-system',
      label: `tax-preparation-${taxYear}`,
      create_evidence: true
    });

    const taxDocumentation = JSON.parse(taxResult.content[0].text);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            tax_year: taxYear,
            business_entity: businessEntity,
            bills_processed: bills.length,
            security_level: securityLevel,
            evidence_created: true,
            tax_documentation: taxDocumentation.results
          }, null, 2)
        }
      ]
    };
  }

  // Helper methods
  private async executeCAOWorkflow(workflow: string, parameters: any) {
    // Execute CAO workflow - would call the actual workflow engine
    // For now, return mock result
    return {
      success: true,
      workflow,
      parameters,
      result: 'Mock workflow execution'
    };
  }

  private async callCoordinatorMCP(tool: string, args: any) {
    const response = await fetch(`${this.env.COORDINATOR_MCP_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, arguments: args })
    });
    return await response.json();
  }

  private async callChatGPTMCP(tool: string, args: any) {
    const response = await fetch(`${this.env.CHATGPT_MCP_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, arguments: args })
    });
    return await response.json();
  }

  private async callFortressMCP(tool: string, args: any) {
    const response = await fetch(`${this.env.FORTRESS_MCP_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, arguments: args })
    });
    return await response.json();
  }

  // Placeholder methods for Memory-Cloude integration
  private async gatherBillsFromMemory(dateRange: any, vendors: string[]) {
    // Would integrate with Memory-Cloude V6
    return [];
  }

  private async getBillsByIds(billIds: string[]) {
    // Would retrieve from Memory-Cloude
    return [];
  }

  private async getBillsForAnomalyDetection(vendor: string, dateRange: any) {
    // Would query Memory-Cloude for historical bills
    return [];
  }

  private async getBillsForReport(dateRange: any) {
    // Would query Memory-Cloude for report period
    return [];
  }

  private async getBillsForTaxYear(taxYear: number) {
    // Would query Memory-Cloude for tax year bills
    return [];
  }

  private buildAnalysisPrompt(bills: any[], analysisType: string) {
    const prompts = {
      cost_breakdown: `Analyze these retail bills and provide a detailed cost breakdown by category, vendor, and time period.`,
      trend_analysis: `Analyze spending trends and patterns in these retail bills over time.`,
      tax_preparation: `Prepare these retail bills for tax filing, categorizing expenses and identifying deductions.`,
      expense_categorization: `Categorize these retail bills into appropriate business expense categories.`,
      anomaly_detection: `Detect any unusual patterns, anomalies, or potential fraud in these retail bills.`
    };

    return `${prompts[analysisType] || prompts.cost_breakdown}

Bills to analyze:
${JSON.stringify(bills, null, 2)}

Provide detailed analysis with actionable insights.`;
  }

  private calculateDateRange(timeframe: string, customDateRange?: any) {
    const now = new Date();
    
    switch (timeframe) {
      case 'last_30_days':
        return {
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      case 'last_90_days':
        return {
          startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      case 'last_year':
        return {
          startDate: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
      case 'custom':
        return customDateRange;
      default:
        return {
          startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: now.toISOString().split('T')[0]
        };
    }
  }

  private filterAnomaliesByThreshold(anomalies: any, threshold: number) {
    return anomalies.filter((anomaly: any) => anomaly.confidence >= threshold);
  }

  private async updateBillCategories(billId: string, categorization: any) {
    // Would update Memory-Cloude with categorization
    console.log(`Updating bill ${billId} with categories`);
  }

  private async generateTaxSummary(bills: any[], categorization: any) {
    // Generate tax summary from categorized bills
    return {
      total_deductible: 0,
      categories: {},
      recommendations: []
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('CAO Bill MCP Server running');
  }
}

// Cloudflare Worker export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'cao-bill-mcp',
        coordinator_mcp: env.COORDINATOR_MCP_URL,
        cao_workspace: env.CAO_WORKSPACE_PATH,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('CAO Bill MCP Server', { status: 200 });
  }
};

// For local development
if (typeof process !== 'undefined' && process.env) {
  const env = {
    COORDINATOR_MCP_URL: process.env.COORDINATOR_MCP_URL || 'http://localhost:8003',
    CHATGPT_MCP_URL: process.env.CHATGPT_MCP_URL || 'http://localhost:8001',
    FORTRESS_MCP_URL: process.env.FORTRESS_MCP_URL || 'http://localhost:8002',
    CHITTY_DATABASE_URL: process.env.CHITTY_DATABASE_URL!,
    ONEPASSWORD_SERVICE_ACCOUNT_TOKEN: process.env.ONEPASSWORD_SERVICE_ACCOUNT_TOKEN!,
    CAO_WORKSPACE_PATH: process.env.CAO_WORKSPACE_PATH || '/Users/nickbianchi/MAIN/ai/exec/cao'
  };

  const server = new CAOBillMCP(env);
  server.start().catch(console.error);
}