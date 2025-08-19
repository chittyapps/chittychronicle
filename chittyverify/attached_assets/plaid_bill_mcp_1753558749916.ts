// Plaid Bill MCP Integration
// Connects Plaid bill workflows with secure AI analysis and evidence tracking

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
  PLAID_CLIENT_ID: string;
  PLAID_SECRET: string;
  PLAID_ENV: string;
  CAO_WORKSPACE_PATH: string;
}

// Supported billers from the Plaid integration
const PLAID_BILLERS = {
  usaa: {
    id: 'usaa',
    name: 'USAA',
    category: 'insurance',
    bill_types: ['auto_insurance', 'home_insurance', 'life_insurance', 'banking'],
    typical_amount_range: [100, 2000],
    billing_frequency: 'monthly'
  },
  xfinity: {
    id: 'xfinity',
    name: 'Xfinity/Comcast',
    category: 'utilities',
    bill_types: ['internet', 'cable', 'phone'],
    typical_amount_range: [50, 300],
    billing_frequency: 'monthly'
  },
  comed: {
    id: 'comed',
    name: 'ComEd',
    category: 'utilities',
    bill_types: ['electricity'],
    typical_amount_range: [30, 500],
    billing_frequency: 'monthly'
  },
  peoples_gas: {
    id: 'peoples_gas',
    name: 'Peoples Gas',
    category: 'utilities',
    bill_types: ['natural_gas'],
    typical_amount_range: [20, 300],
    billing_frequency: 'monthly'
  }
};

interface PlaidBillAnalysisRequest {
  billers: string[];
  analysisType: 'cost_analysis' | 'usage_trends' | 'budget_planning' | 'anomaly_detection' | 'tax_preparation';
  dateRange: {
    startDate: string;
    endDate: string;
  };
  securityLevel: 'standard' | 'fortress' | 'verified';
  createEvidence?: boolean;
  caseId?: string;
}

class PlaidBillMCP {
  private server: Server;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.server = new Server(
      {
        name: 'plaid-bill-mcp',
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
            name: 'plaid_connect_and_analyze_bills',
            description: 'Connect to Plaid billers and perform secure AI analysis of bills',
            inputSchema: {
              type: 'object',
              properties: {
                billers: {
                  type: 'array',
                  items: { type: 'string', enum: ['usaa', 'xfinity', 'comed', 'peoples_gas', 'all'] },
                  default: ['all'],
                  description: 'Billers to connect and analyze'
                },
                userId: {
                  type: 'string',
                  description: 'User ID for Plaid connections'
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
                  enum: ['cost_analysis', 'usage_trends', 'budget_planning', 'anomaly_detection', 'tax_preparation'],
                  default: 'cost_analysis',
                  description: 'Type of analysis to perform'
                },
                securityLevel: {
                  type: 'string',
                  enum: ['standard', 'fortress', 'verified'],
                  default: 'verified',
                  description: 'Security level for AI analysis'
                },
                createEvidence: {
                  type: 'boolean',
                  default: false,
                  description: 'Create evidence package for tax/legal purposes'
                },
                caseId: {
                  type: 'string',
                  description: 'Case ID for evidence tracking'
                }
              },
              required: ['userId', 'dateRange']
            }
          },
          {
            name: 'plaid_setup_biller_connections',
            description: 'Set up Plaid connections for specified billers',
            inputSchema: {
              type: 'object',
              properties: {
                billers: {
                  type: 'array',
                  items: { type: 'string', enum: ['usaa', 'xfinity', 'comed', 'peoples_gas'] },
                  description: 'Billers to set up connections for'
                },
                userId: {
                  type: 'string',
                  description: 'User ID for tracking connections'
                },
                returnLinkTokens: {
                  type: 'boolean',
                  default: true,
                  description: 'Return Plaid Link tokens for frontend integration'
                }
              },
              required: ['billers', 'userId']
            }
          },
          {
            name: 'plaid_smart_bill_categorization',
            description: 'Use AI to categorize and analyze Plaid bills for budgeting and tax purposes',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID'
                },
                billers: {
                  type: 'array',
                  items: { type: 'string', enum: ['usaa', 'xfinity', 'comed', 'peoples_gas', 'all'] },
                  default: ['all']
                },
                categories: {
                  type: 'array',
                  items: { type: 'string' },
                  default: ['insurance', 'utilities', 'telecommunications', 'housing', 'transportation'],
                  description: 'Expense categories for classification'
                },
                createBudgetAnalysis: {
                  type: 'boolean',
                  default: true,
                  description: 'Create budget analysis and recommendations'
                },
                aiModel: {
                  type: 'string',
                  default: 'gpt-4',
                  description: 'AI model for categorization'
                }
              },
              required: ['userId']
            }
          },
          {
            name: 'plaid_utility_usage_analysis',
            description: 'Analyze utility usage patterns and costs (ComEd, Peoples Gas)',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID'
                },
                utilities: {
                  type: 'array',
                  items: { type: 'string', enum: ['comed', 'peoples_gas', 'both'] },
                  default: ['both'],
                  description: 'Utilities to analyze'
                },
                analysisType: {
                  type: 'string',
                  enum: ['seasonal_patterns', 'efficiency_analysis', 'cost_optimization', 'comparative_analysis'],
                  default: 'seasonal_patterns'
                },
                includeWeatherCorrelation: {
                  type: 'boolean',
                  default: true,
                  description: 'Correlate usage with Chicago weather data'
                },
                generateRecommendations: {
                  type: 'boolean',
                  default: true,
                  description: 'Generate energy efficiency recommendations'
                }
              },
              required: ['userId']
            }
          },
          {
            name: 'plaid_insurance_analysis',
            description: 'Analyze insurance costs and coverage optimization (USAA)',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID'
                },
                insuranceTypes: {
                  type: 'array',
                  items: { type: 'string', enum: ['auto', 'home', 'life', 'all'] },
                  default: ['all'],
                  description: 'Insurance types to analyze'
                },
                analysisType: {
                  type: 'string',
                  enum: ['cost_trends', 'coverage_optimization', 'rate_comparison', 'claims_impact'],
                  default: 'cost_trends'
                },
                includeMarketComparison: {
                  type: 'boolean',
                  default: false,
                  description: 'Include market rate comparisons'
                },
                generateOptimizations: {
                  type: 'boolean',
                  default: true,
                  description: 'Generate cost optimization recommendations'
                }
              },
              required: ['userId']
            }
          },
          {
            name: 'plaid_bill_anomaly_detection',
            description: 'Detect unusual patterns or potential issues in Plaid bills',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID'
                },
                billers: {
                  type: 'array',
                  items: { type: 'string', enum: ['usaa', 'xfinity', 'comed', 'peoples_gas', 'all'] },
                  default: ['all']
                },
                anomalyTypes: {
                  type: 'array',
                  items: { 
                    type: 'string', 
                    enum: ['unusual_amounts', 'billing_frequency', 'seasonal_anomalies', 'rate_changes', 'missing_bills'] 
                  },
                  default: ['unusual_amounts', 'billing_frequency'],
                  description: 'Types of anomalies to detect'
                },
                alertThreshold: {
                  type: 'number',
                  default: 0.8,
                  description: 'Confidence threshold for anomaly alerts (0-1)'
                },
                lookbackMonths: {
                  type: 'number',
                  default: 12,
                  description: 'Months of historical data to analyze'
                }
              },
              required: ['userId']
            }
          },
          {
            name: 'plaid_generate_expense_report',
            description: 'Generate comprehensive expense reports from Plaid bills',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID'
                },
                reportType: {
                  type: 'string',
                  enum: ['monthly', 'quarterly', 'annual', 'tax_summary', 'budget_analysis'],
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
                includeTrends: {
                  type: 'boolean',
                  default: true,
                  description: 'Include spending trends and projections'
                },
                outputFormat: {
                  type: 'string',
                  enum: ['json', 'csv', 'pdf', 'excel'],
                  default: 'json'
                },
                secureGeneration: {
                  type: 'boolean',
                  default: true,
                  description: 'Use Fortress MCP for secure report generation'
                }
              },
              required: ['userId', 'dateRange']
            }
          },
          {
            name: 'plaid_execute_workflow',
            description: 'Execute Plaid bill workflows directly through MCP',
            inputSchema: {
              type: 'object',
              properties: {
                workflow: {
                  type: 'string',
                  enum: ['initializePlaidLink', 'exchangePlaidToken', 'retrieveBillsFromBiller', 'retrieveAllPlaidBills', 'monitorPlaidBills', 'managePlaidConnections'],
                  description: 'Plaid workflow to execute'
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
            name: 'plaid_budget_planning',
            description: 'Create budget plans and forecasts based on Plaid bill data',
            inputSchema: {
              type: 'object',
              properties: {
                userId: {
                  type: 'string',
                  description: 'User ID'
                },
                planningHorizon: {
                  type: 'string',
                  enum: ['3_months', '6_months', '1_year', '2_years'],
                  default: '1_year'
                },
                includeInflation: {
                  type: 'boolean',
                  default: true,
                  description: 'Include inflation projections'
                },
                optimizationGoals: {
                  type: 'array',
                  items: { type: 'string', enum: ['cost_reduction', 'energy_efficiency', 'service_optimization', 'tax_optimization'] },
                  default: ['cost_reduction', 'energy_efficiency']
                },
                generateActionPlan: {
                  type: 'boolean',
                  default: true,
                  description: 'Generate actionable optimization plan'
                }
              },
              required: ['userId']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'plaid_connect_and_analyze_bills':
            return await this.handleConnectAndAnalyzeBills(args);
          
          case 'plaid_setup_biller_connections':
            return await this.handleSetupBillerConnections(args);
          
          case 'plaid_smart_bill_categorization':
            return await this.handleSmartBillCategorization(args);
          
          case 'plaid_utility_usage_analysis':
            return await this.handleUtilityUsageAnalysis(args);
          
          case 'plaid_insurance_analysis':
            return await this.handleInsuranceAnalysis(args);
          
          case 'plaid_bill_anomaly_detection':
            return await this.handleBillAnomalyDetection(args);
          
          case 'plaid_generate_expense_report':
            return await this.handleGenerateExpenseReport(args);
          
          case 'plaid_execute_workflow':
            return await this.handleExecuteWorkflow(args);
          
          case 'plaid_budget_planning':
            return await this.handleBudgetPlanning(args);
          
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

  private async handleConnectAndAnalyzeBills(args: any) {
    const {
      billers = ['all'],
      userId,
      dateRange,
      analysisType = 'cost_analysis',
      securityLevel = 'verified',
      createEvidence = false,
      caseId
    } = args;

    const executionId = crypto.randomUUID();
    const results: any = {
      executionId,
      connectionResults: {},
      billRetrievalResults: {},
      analysisResults: null,
      evidenceId: null,
      totalBills: 0,
      totalAmount: 0
    };

    try {
      // Step 1: Ensure connections are set up for billers
      const billersToProcess = billers.includes('all') ? Object.keys(PLAID_BILLERS) : billers;
      
      for (const biller of billersToProcess) {
        // Check if connection exists, if not, set up Link token
        const connectionStatus = await this.checkPlaidConnection(biller, userId);
        results.connectionResults[biller] = connectionStatus;
      }

      // Step 2: Retrieve bills from connected billers
      const billRetrievalResult = await this.executePlaidWorkflow('retrieveAllPlaidBills', {
        userId,
        dateRange
      });

      results.billRetrievalResults = billRetrievalResult;
      
      if (billRetrievalResult.success) {
        results.totalBills = billRetrievalResult.summary?.total_bills || 0;
        results.totalAmount = billRetrievalResult.summary?.total_amount || 0;
      }

      // Step 3: Gather bills from Memory-Cloude for analysis
      const allBills = await this.gatherPlaidBillsFromMemory(userId, dateRange, billersToProcess);

      // Step 4: Perform AI analysis with specified security level
      if (allBills.length > 0) {
        const analysisPrompt = this.buildPlaidAnalysisPrompt(allBills, analysisType, billersToProcess);
        
        const analysisResult = await this.callCoordinatorMCP('chitty_secure_ai_execute', {
          prompt: analysisPrompt,
          security_level: securityLevel,
          user_id: userId,
          label: `plaid-bill-analysis-${analysisType}`,
          create_evidence: createEvidence,
          case_id: caseId
        });

        results.analysisResults = JSON.parse(analysisResult.content[0].text);
      }

      // Step 5: Create evidence package if requested
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
                billers_processed: billersToProcess.length,
                bills_retrieved: results.totalBills,
                total_amount: results.totalAmount,
                analysis_type: analysisType,
                security_level: securityLevel,
                evidence_created: !!results.evidenceId
              },
              plaid_billers: Object.fromEntries(
                billersToProcess.map(b => [b, PLAID_BILLERS[b]])
              ),
              connection_results: results.connectionResults,
              bill_retrieval: results.billRetrievalResults,
              analysis_results: results.analysisResults,
              evidence_id: results.evidenceId
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      throw new Error(`Plaid bill connection and analysis failed: ${error.message}`);
    }
  }

  private async handleSetupBillerConnections(args: any) {
    const {
      billers,
      userId,
      returnLinkTokens = true
    } = args;

    const connectionResults = {};

    for (const biller of billers) {
      try {
        const linkResult = await this.executePlaidWorkflow('initializePlaidLink', {
          biller,
          userId
        });

        connectionResults[biller] = {
          success: linkResult.success,
          biller_name: PLAID_BILLERS[biller]?.name,
          link_token: returnLinkTokens ? linkResult.link_token : '[HIDDEN]',
          frontend_url: returnLinkTokens ? linkResult.frontend_url : '[HIDDEN]',
          expires_in: linkResult.expires_in
        };

      } catch (error) {
        connectionResults[biller] = {
          success: false,
          error: error.message
        };
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            user_id: userId,
            billers_setup: billers.length,
            connection_results: connectionResults,
            next_steps: returnLinkTokens ? 
              'Use the provided link tokens to complete Plaid Link flow in your frontend application' :
              'Link tokens generated but hidden for security. Retrieve separately if needed.'
          }, null, 2)
        }
      ]
    };
  }

  private async handleSmartBillCategorization(args: any) {
    const {
      userId,
      billers = ['all'],
      categories = ['insurance', 'utilities', 'telecommunications', 'housing', 'transportation'],
      createBudgetAnalysis = true,
      aiModel = 'gpt-4'
    } = args;

    // Retrieve bills from Memory-Cloude
    const billersToProcess = billers.includes('all') ? Object.keys(PLAID_BILLERS) : billers;
    const bills = await this.getPlaidBillsForCategorization(userId, billersToProcess);

    // Create categorization prompt
    const categorizationPrompt = `
Analyze these Plaid-retrieved bills and categorize them for budgeting and expense tracking:

Categories available: ${categories.join(', ')}

Bills to categorize:
${JSON.stringify(bills.map(bill => ({
  biller: bill.biller,
  biller_name: bill.biller_name,
  amount: bill.amount,
  date: bill.date,
  description: bill.description,
  bill_type: bill.bill_type
})), null, 2)}

For each bill, provide:
1. Primary expense category from the available categories
2. Secondary subcategory (e.g., "home_insurance" under "insurance")
3. Tax deductibility assessment (personal/business/mixed)
4. Budget impact classification (fixed/variable/seasonal)
5. Optimization opportunities
6. Monthly budget allocation recommendations

${createBudgetAnalysis ? 'Also create a comprehensive budget analysis with monthly averages, seasonal variations, and optimization recommendations.' : ''}

Return structured JSON with categorization and budget analysis results.
`;

    // Execute with ChatGPT MCP
    const categorizationResult = await this.callChatGPTMCP('chatgpt_complete', {
      messages: [
        { role: 'system', content: 'You are a personal finance and budgeting expert specializing in bill categorization and expense optimization.' },
        { role: 'user', content: categorizationPrompt }
      ],
      model: aiModel
    });

    const categorization = JSON.parse(categorizationResult.content[0].text).response;

    // Update bills in Memory-Cloude with categories
    for (const bill of bills) {
      await this.updateBillCategories(bill.bill_id, categorization);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            user_id: userId,
            bills_categorized: bills.length,
            billers_processed: billersToProcess,
            plaid_billers: Object.fromEntries(
              billersToProcess.map(b => [b, PLAID_BILLERS[b]])
            ),
            categorization_results: categorization,
            budget_analysis_included: createBudgetAnalysis
          }, null, 2)
        }
      ]
    };
  }

  private async handleUtilityUsageAnalysis(args: any) {
    const {
      userId,
      utilities = ['both'],
      analysisType = 'seasonal_patterns',
      includeWeatherCorrelation = true,
      generateRecommendations = true
    } = args;

    // Determine which utilities to analyze
    const utilitiesToAnalyze = utilities.includes('both') ? ['comed', 'peoples_gas'] : utilities;

    // Retrieve utility bills for analysis
    const utilityBills = await this.getUtilityBillsForAnalysis(userId, utilitiesToAnalyze);

    // Create utility analysis prompt
    const utilityPrompt = `
Analyze utility usage patterns and costs for Chicago-area utilities:

Utilities being analyzed: ${utilitiesToAnalyze.map(u => PLAID_BILLERS[u]?.name).join(', ')}
Analysis Type: ${analysisType}
Include Weather Correlation: ${includeWeatherCorrelation}

Utility Bills Data:
${JSON.stringify(utilityBills, null, 2)}

Provide analysis covering:
1. Usage patterns and trends over time
2. Seasonal variations and correlations
3. Cost efficiency analysis
4. Rate structure impact assessment
${includeWeatherCorrelation ? '5. Chicago weather correlation analysis' : ''}
${generateRecommendations ? '6. Energy efficiency recommendations' : ''}
7. Peak usage identification
8. Budget planning recommendations

Focus on Chicago-specific factors:
- Harsh winter heating costs (Peoples Gas)
- Summer cooling demands (ComEd)
- Rate tier structures and time-of-use impacts
- Energy efficiency programs available

Return comprehensive utility analysis with actionable insights.
`;

    // Execute with Fortress MCP for secure analysis
    const utilityResult = await this.callFortressMCP('fortress_secure_execute', {
      prompt: utilityPrompt,
      label: 'utility-usage-analysis'
    });

    const utilityAnalysis = JSON.parse(utilityResult.content[0].text).output;

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            user_id: userId,
            utilities_analyzed: utilitiesToAnalyze,
            analysis_type: analysisType,
            bills_analyzed: utilityBills.length,
            weather_correlation: includeWeatherCorrelation,
            recommendations_included: generateRecommendations,
            utility_analysis: utilityAnalysis
          }, null, 2)
        }
      ]
    };
  }

  private async handleInsuranceAnalysis(args: any) {
    const {
      userId,
      insuranceTypes = ['all'],
      analysisType = 'cost_trends',
      includeMarketComparison = false,
      generateOptimizations = true
    } = args;

    // Retrieve USAA insurance bills
    const insuranceBills = await this.getInsuranceBillsForAnalysis(userId, insuranceTypes);

    // Create insurance analysis prompt
    const insurancePrompt = `
Analyze USAA insurance costs and coverage optimization:

Insurance Types: ${insuranceTypes.includes('all') ? 'All USAA insurance products' : insuranceTypes.join(', ')}
Analysis Type: ${analysisType}
Include Market Comparison: ${includeMarketComparison}

Insurance Bills Data:
${JSON.stringify(insuranceBills, null, 2)}

Provide analysis covering:
1. Cost trends and premium changes over time
2. Coverage adequacy assessment
3. Deductible optimization analysis
4. Bundle savings opportunities
${includeMarketComparison ? '5. Market rate comparison and competitive analysis' : ''}
${generateOptimizations ? '6. Cost optimization recommendations' : ''}
7. Policy adjustment recommendations
8. Claims impact on future premiums

Consider USAA-specific factors:
- Military/veteran discount eligibility
- Multi-policy bundling benefits
- Member loyalty programs
- Geographic risk factors (Chicago area)

Return comprehensive insurance analysis with optimization strategies.
`;

    // Execute with verified security level
    const insuranceResult = await this.callCoordinatorMCP('chitty_secure_ai_execute', {
      prompt: insurancePrompt,
      security_level: 'verified',
      user_id: userId,
      label: 'usaa-insurance-analysis'
    });

    const insuranceAnalysis = JSON.parse(insuranceResult.content[0].text);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            user_id: userId,
            insurance_types: insuranceTypes,
            analysis_type: analysisType,
            bills_analyzed: insuranceBills.length,
            market_comparison: includeMarketComparison,
            optimizations_included: generateOptimizations,
            insurance_analysis: insuranceAnalysis.results
          }, null, 2)
        }
      ]
    };
  }

  private async handleBillAnomalyDetection(args: any) {
    const {
      userId,
      billers = ['all'],
      anomalyTypes = ['unusual_amounts', 'billing_frequency'],
      alertThreshold = 0.8,
      lookbackMonths = 12
    } = args;

    const billersToAnalyze = billers.includes('all') ? Object.keys(PLAID_BILLERS) : billers;

    // Get historical bills for anomaly detection
    const historicalBills = await this.getHistoricalBillsForAnomalyDetection(userId, billersToAnalyze, lookbackMonths);

    // Create anomaly detection prompt
    const anomalyPrompt = `
Analyze these Plaid bills for anomalies and unusual patterns:

Billers: ${billersToAnalyze.map(b => PLAID_BILLERS[b]?.name).join(', ')}
Anomaly Types: ${anomalyTypes.join(', ')}
Alert Threshold: ${alertThreshold}
Lookback Period: ${lookbackMonths} months

Historical Bills Data:
${JSON.stringify(historicalBills, null, 2)}

Expected ranges for each biller:
${billersToAnalyze.map(b => `${PLAID_BILLERS[b]?.name}: $${PLAID_BILLERS[b]?.typical_amount_range[0]}-${PLAID_BILLERS[b]?.typical_amount_range[1]}`).join('\n')}

Identify:
1. Unusual spending amounts (outside expected ranges)
2. Billing frequency anomalies (missing bills, extra charges)
3. Seasonal anomalies (unexpected seasonal patterns)
4. Rate changes and sudden price increases
5. Missing bills or payment issues

For each anomaly found, provide:
- Confidence score (0-1)
- Detailed description of the anomaly
- Potential causes and explanations
- Severity level (low/medium/high/critical)
- Recommended actions

Return structured JSON with anomaly analysis and alerts.
`;

    // Execute with Fortress MCP for secure analysis
    const anomalyResult = await this.callFortressMCP('fortress_secure_execute', {
      prompt: anomalyPrompt,
      label: 'plaid-bill-anomaly-detection'
    });

    const anomalies = JSON.parse(anomalyResult.content[0].text).output;

    // Filter by alert threshold
    const highConfidenceAnomalies = this.filterAnomaliesByThreshold(anomalies, alertThreshold);

    // Record findings on ChittyChain
    await this.callFortressMCP('fortress_log_assertion', {
      subject: `plaid-anomaly-scan:${Date.now()}`,
      predicate: 'detected_anomalies',
      object: `count:${highConfidenceAnomalies.length}`,
      source: 'plaid-bill-mcp'
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            user_id: userId,
            scan_summary: {
              billers_analyzed: billersToAnalyze.length,
              bills_analyzed: historicalBills.length,
              anomalies_detected: highConfidenceAnomalies.length,
              lookback_months: lookbackMonths,
              alert_threshold: alertThreshold
            },
            plaid_billers: Object.fromEntries(
              billersToAnalyze.map(b => [b, PLAID_BILLERS[b]])
            ),
            anomalies: highConfidenceAnomalies,
            full_analysis: anomalies
          }, null, 2)
        }
      ]
    };
  }

  // Additional handler methods for remaining tools...
  private async handleGenerateExpenseReport(args: any) {
    // Implementation for expense report generation
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Expense report generation not yet implemented' }) }] };
  }

  private async handleExecuteWorkflow(args: any) {
    const { workflow, parameters, trackExecution = true } = args;

    const result = await this.executePlaidWorkflow(workflow, parameters);

    if (trackExecution) {
      await this.callFortressMCP('fortress_log_assertion', {
        subject: `plaid-workflow:${workflow}`,
        predicate: 'executed',
        object: `result:${result.success ? 'success' : 'failure'}`,
        source: 'plaid-bill-mcp'
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

  private async handleBudgetPlanning(args: any) {
    // Implementation for budget planning
    return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Budget planning not yet implemented' }) }] };
  }

  // Helper methods
  private buildPlaidAnalysisPrompt(bills: any[], analysisType: string, billers: string[]) {
    const prompts = {
      cost_analysis: `Analyze cost patterns and trends in these Plaid-retrieved bills.`,
      usage_trends: `Analyze usage trends and seasonal patterns in these utility and service bills.`,
      budget_planning: `Create budget recommendations based on these bill patterns.`,
      anomaly_detection: `Detect anomalies and unusual patterns in these bills.`,
      tax_preparation: `Prepare these bills for tax filing and deduction analysis.`
    };

    return `${prompts[analysisType] || prompts.cost_analysis}

Billers included: ${billers.map(b => PLAID_BILLERS[b]?.name).join(', ')}

Bills to analyze:
${JSON.stringify(bills, null, 2)}

Consider these biller-specific factors:
${billers.map(b => {
  const biller = PLAID_BILLERS[b];
  return `- ${biller?.name}: ${biller?.category}, typical range $${biller?.typical_amount_range[0]}-${biller?.typical_amount_range[1]}, ${biller?.billing_frequency}`;
}).join('\n')}

Provide detailed analysis with actionable insights and recommendations.`;
  }

  private async executePlaidWorkflow(workflow: string, parameters: any) {
    // Would execute actual Plaid workflow
    return {
      success: true,
      workflow,
      parameters,
      result: 'Mock Plaid workflow execution'
    };
  }

  private async checkPlaidConnection(biller: string, userId: string) {
    // Would check if Plaid connection exists for biller
    return {
      biller,
      connected: false,
      needs_setup: true
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

  // Placeholder methods for data integration
  private async gatherPlaidBillsFromMemory(userId: string, dateRange: any, billers: string[]) {
    return [];
  }

  private async getPlaidBillsForCategorization(userId: string, billers: string[]) {
    return [];
  }

  private async getUtilityBillsForAnalysis(userId: string, utilities: string[]) {
    return [];
  }

  private async getInsuranceBillsForAnalysis(userId: string, insuranceTypes: string[]) {
    return [];
  }

  private async getHistoricalBillsForAnomalyDetection(userId: string, billers: string[], months: number) {
    return [];
  }

  private filterAnomaliesByThreshold(anomalies: any, threshold: number) {
    return anomalies.filter((anomaly: any) => anomaly.confidence >= threshold);
  }

  private async updateBillCategories(billId: string, categorization: any) {
    console.log(`Updating bill ${billId} with categories`);
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Plaid Bill MCP Server running');
  }
}

// Cloudflare Worker export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'plaid-bill-mcp',
        supported_billers: Object.keys(PLAID_BILLERS),
        coordinator_mcp: env.COORDINATOR_MCP_URL,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Plaid Bill MCP Server', { status: 200 });
  }
};

// For local development
if (typeof process !== 'undefined' && process.env) {
  const env = {
    COORDINATOR_MCP_URL: process.env.COORDINATOR_MCP_URL || 'http://localhost:8003',
    CHATGPT_MCP_URL: process.env.CHATGPT_MCP_URL || 'http://localhost:8001',
    FORTRESS_MCP_URL: process.env.FORTRESS_MCP_URL || 'http://localhost:8002',
    CHITTY_DATABASE_URL: process.env.CHITTY_DATABASE_URL!,
    PLAID_CLIENT_ID: process.env.PLAID_CLIENT_ID!,
    PLAID_SECRET: process.env.PLAID_SECRET!,
    PLAID_ENV: process.env.PLAID_ENV || 'sandbox',
    CAO_WORKSPACE_PATH: process.env.CAO_WORKSPACE_PATH || '/Users/nickbianchi/MAIN/ai/exec/cao'
  };

  const server = new PlaidBillMCP(env);
  server.start().catch(console.error);
}