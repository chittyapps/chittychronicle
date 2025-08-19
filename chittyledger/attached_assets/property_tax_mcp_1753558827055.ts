// Property Tax MCP Integration
// Connects property tax workflows with secure AI analysis and evidence tracking

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
  CAO_WORKSPACE_PATH: string;
}

// Property definitions from user input
const CHICAGO_PROPERTIES = [
  {
    id: 'addison_541',
    address: '541 W ADDISON ST',
    unit: '541-3 South',
    pin: '14-21-111-008-1006',
    propertyType: 'C',
    subdivision: '25024798',
    legalDescription: 'Unit 541-3 South in the Addition Lake Shore West Condominium, as delineated on a survey of the following described real estate: The Westerly 25.02 feet of Lot 4 and all of Lot 5 and the Easterly 34 feet of Lot 6 in Block 1 in Baird and Warner\'s Subdivision of Block 12 of Hundley\'s Subdivision...',
    section: 21,
    township: 40,
    range: 14
  },
  {
    id: 'surf_211',
    address: '550 W SURF ST', 
    unit: 'C-211',
    pin: '14-28-122-017-1180',
    propertyType: 'C',
    subdivision: '26911238',
    legalDescription: 'Unit C-211 in Commodore/Greenbriar Landmark Condominium, as delineated on a survey of the following described real estate: Lots 14, 15 and 16 in Block 3 in Le Moyne\'s Subdivision...',
    section: 28,
    township: 40,
    range: 14
  },
  {
    id: 'surf_504',
    address: '559 W SURF ST',
    unit: 'C-504', 
    pin: '14-28-122-017-1091',
    propertyType: 'C',
    subdivision: '26911238',
    legalDescription: 'Unit C-504 together with its undivided percentage interest in the common elements in Commodore/Greenbrier Landmark Condominium...',
    section: 28,
    township: 40,
    range: 14
  },
  {
    id: 'clarendon_1610',
    address: '4343 N Clarendon Ave',
    unit: '1610',
    pin: '14-16-300-032-1238', 
    propertyType: 'C',
    subdivision: null,
    legalDescription: 'Unit 1610 at 4343 N Clarendon Ave',
    section: 16,
    township: null,
    range: null
  }
];

interface PropertyTaxAnalysisRequest {
  pins: string[];
  analysisType: 'assessment_trends' | 'tax_burden_analysis' | 'comparable_properties' | 'investment_analysis' | 'appeal_assessment';
  includeMarketData?: boolean;
  securityLevel: 'standard' | 'fortress' | 'verified';
  createEvidence?: boolean;
  caseId?: string;
}

class PropertyTaxMCP {
  private server: Server;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.server = new Server(
      {
        name: 'property-tax-mcp',
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
            name: 'property_tax_retrieve_and_analyze',
            description: 'Retrieve property tax data and perform secure AI analysis with evidence tracking',
            inputSchema: {
              type: 'object',
              properties: {
                pins: {
                  type: 'array',
                  items: { type: 'string' },
                  default: CHICAGO_PROPERTIES.map(p => p.pin),
                  description: 'Property Index Numbers (PINs) to analyze'
                },
                year: {
                  type: 'number',
                  default: 2024,
                  description: 'Tax year to retrieve and analyze'
                },
                analysisType: {
                  type: 'string',
                  enum: ['assessment_trends', 'tax_burden_analysis', 'comparable_properties', 'investment_analysis', 'appeal_assessment'],
                  default: 'assessment_trends',
                  description: 'Type of analysis to perform'
                },
                includeMarketData: {
                  type: 'boolean',
                  default: false,
                  description: 'Include market value comparisons'
                },
                securityLevel: {
                  type: 'string',
                  enum: ['standard', 'fortress', 'verified'],
                  default: 'verified',
                  description: 'Security level for AI analysis'
                },
                createEvidence: {
                  type: 'boolean',
                  default: true,
                  description: 'Create legal evidence package for appeals/legal use'
                },
                caseId: {
                  type: 'string',
                  description: 'Case ID for legal evidence tracking'
                }
              }
            }
          },
          {
            name: 'property_tax_assessment_appeal_analysis',
            description: 'Analyze properties for potential assessment appeals',
            inputSchema: {
              type: 'object',
              properties: {
                pins: {
                  type: 'array',
                  items: { type: 'string' },
                  default: CHICAGO_PROPERTIES.map(p => p.pin),
                  description: 'PINs to analyze for appeal potential'
                },
                appealThreshold: {
                  type: 'number',
                  default: 0.10,
                  description: 'Minimum percentage over-assessment to recommend appeal'
                },
                includeComparables: {
                  type: 'boolean',
                  default: true,
                  description: 'Include comparable property analysis'
                },
                generateAppealDocs: {
                  type: 'boolean',
                  default: false,
                  description: 'Generate draft appeal documentation'
                }
              }
            }
          },
          {
            name: 'property_tax_portfolio_analysis',
            description: 'Comprehensive analysis of entire property portfolio',
            inputSchema: {
              type: 'object',
              properties: {
                includeTrends: {
                  type: 'boolean',
                  default: true,
                  description: 'Include multi-year trend analysis'
                },
                includeProjections: {
                  type: 'boolean',
                  default: true,
                  description: 'Include future tax projections'
                },
                optimizationRecommendations: {
                  type: 'boolean',
                  default: true,
                  description: 'Include tax optimization strategies'
                },
                securityLevel: {
                  type: 'string',
                  enum: ['standard', 'fortress', 'verified'],
                  default: 'verified'
                }
              }
            }
          },
          {
            name: 'property_tax_monitor_setup',
            description: 'Set up automated monitoring for property tax changes',
            inputSchema: {
              type: 'object',
              properties: {
                pins: {
                  type: 'array',
                  items: { type: 'string' },
                  default: CHICAGO_PROPERTIES.map(p => p.pin)
                },
                alertThresholds: {
                  type: 'object',
                  properties: {
                    assessmentChange: { type: 'number', default: 0.05 },
                    taxIncrease: { type: 'number', default: 0.10 },
                    paymentDeadline: { type: 'number', default: 30 }
                  }
                },
                monitoringFrequency: {
                  type: 'string',
                  enum: ['daily', 'weekly', 'monthly'],
                  default: 'weekly'
                }
              }
            }
          },
          {
            name: 'property_tax_payment_planning',
            description: 'Analyze and plan property tax payments for optimal cash flow',
            inputSchema: {
              type: 'object',
              properties: {
                pins: {
                  type: 'array',
                  items: { type: 'string' },
                  default: CHICAGO_PROPERTIES.map(p => p.pin)
                },
                planningHorizon: {
                  type: 'string',
                  enum: ['current_year', '3_years', '5_years', '10_years'],
                  default: '3_years'
                },
                includeInflation: {
                  type: 'boolean',
                  default: true
                },
                optimizeInstallments: {
                  type: 'boolean',
                  default: true,
                  description: 'Optimize installment payment timing'
                }
              }
            }
          },
          {
            name: 'property_execute_tax_workflow',
            description: 'Execute CAO property tax workflows directly through MCP',
            inputSchema: {
              type: 'object',
              properties: {
                workflow: {
                  type: 'string',
                  enum: ['scrapeCookCountyAssessor', 'scrapeCookCountyTreasurer', 'retrieveAllPropertyTaxData', 'monitorPropertyTaxChanges'],
                  description: 'Property tax workflow to execute'
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
              required: ['workflow']
            }
          },
          {
            name: 'property_generate_tax_report',
            description: 'Generate comprehensive property tax reports',
            inputSchema: {
              type: 'object',
              properties: {
                reportType: {
                  type: 'string',
                  enum: ['annual_summary', 'portfolio_analysis', 'appeal_analysis', 'investment_summary', 'tax_planning'],
                  default: 'annual_summary'
                },
                pins: {
                  type: 'array',
                  items: { type: 'string' },
                  default: CHICAGO_PROPERTIES.map(p => p.pin)
                },
                includeCharts: {
                  type: 'boolean',
                  default: true
                },
                outputFormat: {
                  type: 'string',
                  enum: ['json', 'pdf', 'excel', 'html'],
                  default: 'pdf'
                },
                secureGeneration: {
                  type: 'boolean',
                  default: true,
                  description: 'Use Fortress MCP for report generation'
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
          case 'property_tax_retrieve_and_analyze':
            return await this.handleRetrieveAndAnalyze(args);
          
          case 'property_tax_assessment_appeal_analysis':
            return await this.handleAssessmentAppealAnalysis(args);
          
          case 'property_tax_portfolio_analysis':
            return await this.handlePortfolioAnalysis(args);
          
          case 'property_tax_monitor_setup':
            return await this.handleMonitorSetup(args);
          
          case 'property_tax_payment_planning':
            return await this.handlePaymentPlanning(args);
          
          case 'property_execute_tax_workflow':
            return await this.handleExecuteTaxWorkflow(args);
          
          case 'property_generate_tax_report':
            return await this.handleGenerateTaxReport(args);
          
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

  private async handleRetrieveAndAnalyze(args: any) {
    const {
      pins = CHICAGO_PROPERTIES.map(p => p.pin),
      year = 2024,
      analysisType = 'assessment_trends',
      includeMarketData = false,
      securityLevel = 'verified',
      createEvidence = true,
      caseId
    } = args;

    const executionId = crypto.randomUUID();
    const results: any = {
      executionId,
      retrievalResults: null,
      analysisResults: null,
      evidenceId: null,
      propertiesProcessed: pins.length
    };

    try {
      // Step 1: Retrieve property tax data using CAO workflows
      const retrievalResult = await this.executePropertyTaxWorkflow('retrieveAllPropertyTaxData', {
        pins,
        year,
        includeHistory: true
      });

      results.retrievalResults = retrievalResult;

      // Step 2: Gather property data for analysis
      const propertyData = await this.gatherPropertyDataFromMemory(pins, year);
      
      // Add Chicago property context
      const enrichedData = this.enrichWithChicagoPropertyData(propertyData, pins);

      // Step 3: Perform AI analysis with specified security level
      if (enrichedData.length > 0) {
        const analysisPrompt = this.buildPropertyAnalysisPrompt(enrichedData, analysisType, includeMarketData);
        
        const analysisResult = await this.callCoordinatorMCP('chitty_secure_ai_execute', {
          prompt: analysisPrompt,
          security_level: securityLevel,
          user_id: 'property-tax-system',
          label: `property-tax-analysis-${analysisType}`,
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
                properties_processed: results.propertiesProcessed,
                tax_year: year,
                analysis_type: analysisType,
                security_level: securityLevel,
                evidence_created: !!results.evidenceId
              },
              chicago_properties: CHICAGO_PROPERTIES.filter(p => pins.includes(p.pin)),
              retrieval_results: results.retrievalResults,
              analysis_results: results.analysisResults,
              evidence_id: results.evidenceId
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      throw new Error(`Property tax retrieval and analysis failed: ${error.message}`);
    }
  }

  private async handleAssessmentAppealAnalysis(args: any) {
    const {
      pins = CHICAGO_PROPERTIES.map(p => p.pin),
      appealThreshold = 0.10,
      includeComparables = true,
      generateAppealDocs = false
    } = args;

    // Get property data for appeal analysis
    const propertyData = await this.gatherPropertyDataFromMemory(pins, 2024);
    const enrichedData = this.enrichWithChicagoPropertyData(propertyData, pins);

    // Create appeal analysis prompt
    const appealPrompt = `
Analyze these Chicago condominium properties for potential property tax assessment appeals:

Appeal Threshold: ${appealThreshold * 100}% over-assessment
Include Comparables: ${includeComparables}

Properties to analyze:
${JSON.stringify(enrichedData, null, 2)}

For each property, analyze:
1. Current assessment vs market value
2. Assessment trends over time
3. Comparable property assessments in the area
4. Potential over-assessment percentage
5. Appeal viability and potential savings
6. Required documentation and evidence
7. Recommended appeal strategy

Identify properties that exceed the ${appealThreshold * 100}% over-assessment threshold and provide detailed analysis for potential appeals.

Return structured analysis with appeal recommendations.
`;

    // Execute with Fortress MCP for secure analysis
    const appealResult = await this.callFortressMCP('fortress_secure_execute', {
      prompt: appealPrompt,
      label: 'property-assessment-appeal-analysis'
    });

    const appealAnalysis = JSON.parse(appealResult.content[0].text).output;

    // Generate appeal documentation if requested
    let appealDocuments = null;
    if (generateAppealDocs) {
      appealDocuments = await this.generateAppealDocumentation(appealAnalysis);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            appeal_analysis: {
              properties_analyzed: pins.length,
              appeal_threshold: appealThreshold,
              properties_recommended_for_appeal: appealAnalysis.recommended_appeals?.length || 0,
              total_potential_savings: appealAnalysis.total_potential_savings || 0,
              analysis_results: appealAnalysis,
              appeal_documents: appealDocuments
            }
          }, null, 2)
        }
      ]
    };
  }

  private async handlePortfolioAnalysis(args: any) {
    const {
      includeTrends = true,
      includeProjections = true,
      optimizationRecommendations = true,
      securityLevel = 'verified'
    } = args;

    const pins = CHICAGO_PROPERTIES.map(p => p.pin);
    
    // Gather comprehensive portfolio data
    const portfolioData = await this.gatherPortfolioData(pins, includeTrends);

    // Create portfolio analysis prompt
    const portfolioPrompt = `
Perform comprehensive analysis of this Chicago condominium property portfolio:

Portfolio Properties:
${JSON.stringify(CHICAGO_PROPERTIES, null, 2)}

Tax and Assessment Data:
${JSON.stringify(portfolioData, null, 2)}

Analysis Requirements:
- Include Trends: ${includeTrends}
- Include Projections: ${includeProjections}
- Optimization Recommendations: ${optimizationRecommendations}

Provide analysis covering:
1. Portfolio overview and summary statistics
2. Assessment trends across all properties
3. Tax burden analysis and comparisons
4. Geographic clustering and location factors
5. Condo association and building-specific factors
${includeProjections ? '6. Future tax projections (3-5 years)' : ''}
${optimizationRecommendations ? '7. Tax optimization strategies and recommendations' : ''}
8. Risk factors and market considerations
9. Investment performance from tax perspective

Return comprehensive portfolio analysis with actionable insights.
`;

    // Execute with specified security level
    const portfolioResult = await this.callCoordinatorMCP('chitty_secure_ai_execute', {
      prompt: portfolioPrompt,
      security_level: securityLevel,
      user_id: 'property-tax-system',
      label: 'property-portfolio-analysis',
      create_evidence: true
    });

    const portfolioAnalysis = JSON.parse(portfolioResult.content[0].text);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            portfolio_summary: {
              total_properties: CHICAGO_PROPERTIES.length,
              security_level: securityLevel,
              includes_trends: includeTrends,
              includes_projections: includeProjections,
              includes_optimization: optimizationRecommendations
            },
            properties: CHICAGO_PROPERTIES,
            analysis_results: portfolioAnalysis.results
          }, null, 2)
        }
      ]
    };
  }

  private async handleMonitorSetup(args: any) {
    const {
      pins = CHICAGO_PROPERTIES.map(p => p.pin),
      alertThresholds = {
        assessmentChange: 0.05,
        taxIncrease: 0.10,
        paymentDeadline: 30
      },
      monitoringFrequency = 'weekly'
    } = args;

    // Set up monitoring configuration
    const monitoringConfig = {
      monitoring_id: crypto.randomUUID(),
      properties: CHICAGO_PROPERTIES.filter(p => pins.includes(p.pin)),
      alert_thresholds: alertThresholds,
      frequency: monitoringFrequency,
      created_at: new Date().toISOString(),
      active: true
    };

    // Store monitoring configuration
    await this.storeMonitoringConfig(monitoringConfig);

    // Record monitoring setup on ChittyChain
    await this.callFortressMCP('fortress_log_assertion', {
      subject: `property-monitoring:${monitoringConfig.monitoring_id}`,
      predicate: 'monitoring_configured',
      object: `properties:${pins.length}`,
      source: 'property-tax-mcp'
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            monitoring_id: monitoringConfig.monitoring_id,
            properties_monitored: pins.length,
            alert_thresholds: alertThresholds,
            monitoring_frequency: monitoringFrequency,
            configuration: monitoringConfig
          }, null, 2)
        }
      ]
    };
  }

  private async handlePaymentPlanning(args: any) {
    const {
      pins = CHICAGO_PROPERTIES.map(p => p.pin),
      planningHorizon = '3_years',
      includeInflation = true,
      optimizeInstallments = true
    } = args;

    // Get current payment data
    const paymentData = await this.gatherPaymentData(pins);

    // Create payment planning prompt
    const planningPrompt = `
Analyze and plan property tax payments for this Chicago condo portfolio:

Properties:
${JSON.stringify(CHICAGO_PROPERTIES.filter(p => pins.includes(p.pin)), null, 2)}

Current Payment Data:
${JSON.stringify(paymentData, null, 2)}

Planning Parameters:
- Planning Horizon: ${planningHorizon}
- Include Inflation: ${includeInflation}
- Optimize Installments: ${optimizeInstallments}

Provide:
1. Current annual tax burden analysis
2. Payment schedule optimization recommendations
3. Cash flow impact analysis
${includeInflation ? '4. Inflation-adjusted projections' : ''}
${optimizeInstallments ? '5. Installment payment timing optimization' : ''}
6. Tax escrow recommendations
7. Financial planning strategies
8. Risk mitigation approaches

Return comprehensive payment planning analysis.
`;

    // Execute analysis
    const planningResult = await this.callCoordinatorMCP('chitty_secure_ai_execute', {
      prompt: planningPrompt,
      security_level: 'verified',
      user_id: 'property-tax-system',
      label: 'property-payment-planning'
    });

    const planningAnalysis = JSON.parse(planningResult.content[0].text);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            payment_planning: {
              properties_analyzed: pins.length,
              planning_horizon: planningHorizon,
              includes_inflation: includeInflation,
              optimizes_installments: optimizeInstallments,
              analysis_results: planningAnalysis.results
            }
          }, null, 2)
        }
      ]
    };
  }

  private async handleExecuteTaxWorkflow(args: any) {
    const {
      workflow,
      parameters = {},
      trackExecution = true
    } = args;

    // Add default PIN parameters if not provided
    if (!parameters.pins) {
      parameters.pins = CHICAGO_PROPERTIES.map(p => p.pin);
    }

    const result = await this.executePropertyTaxWorkflow(workflow, parameters);

    if (trackExecution) {
      await this.callFortressMCP('fortress_log_assertion', {
        subject: `property-tax-workflow:${workflow}`,
        predicate: 'executed',
        object: `result:${result.success ? 'success' : 'failure'}`,
        source: 'property-tax-mcp'
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
            chicago_properties: CHICAGO_PROPERTIES,
            result
          }, null, 2)
        }
      ]
    };
  }

  private async handleGenerateTaxReport(args: any) {
    const {
      reportType = 'annual_summary',
      pins = CHICAGO_PROPERTIES.map(p => p.pin),
      includeCharts = true,
      outputFormat = 'pdf',
      secureGeneration = true
    } = args;

    // Gather data for report
    const reportData = await this.gatherReportData(pins, reportType);

    // Create report generation prompt
    const reportPrompt = `
Generate a comprehensive ${reportType} property tax report for these Chicago condominiums:

Properties Included:
${JSON.stringify(CHICAGO_PROPERTIES.filter(p => pins.includes(p.pin)), null, 2)}

Report Data:
${JSON.stringify(reportData, null, 2)}

Report Specifications:
- Report Type: ${reportType}
- Include Charts: ${includeCharts}
- Output Format: ${outputFormat}

Generate a professional report including:
1. Executive summary
2. Property portfolio overview
3. Tax assessment analysis
4. Payment history and status
5. Trends and projections
${includeCharts ? '6. Visual charts and graphs' : ''}
7. Recommendations and action items
8. Supporting documentation references

Format for ${outputFormat} output with professional layout.
`;

    // Use appropriate MCP based on security setting
    const securityLevel = secureGeneration ? 'fortress' : 'standard';
    
    const reportResult = await this.callCoordinatorMCP('chitty_secure_ai_execute', {
      prompt: reportPrompt,
      security_level: securityLevel,
      user_id: 'property-tax-system',
      label: `property-tax-report-${reportType}`
    });

    const report = JSON.parse(reportResult.content[0].text);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            report_type: reportType,
            properties_included: pins.length,
            output_format: outputFormat,
            security_level: securityLevel,
            chicago_properties: CHICAGO_PROPERTIES.filter(p => pins.includes(p.pin)),
            report: report.results
          }, null, 2)
        }
      ]
    };
  }

  // Helper methods
  private enrichWithChicagoPropertyData(propertyData: any[], pins: string[]) {
    return pins.map(pin => {
      const chicagoProperty = CHICAGO_PROPERTIES.find(p => p.pin === pin);
      const taxData = propertyData.find(p => p.pin === pin);
      
      return {
        ...chicagoProperty,
        ...taxData,
        enriched_at: new Date().toISOString()
      };
    });
  }

  private buildPropertyAnalysisPrompt(properties: any[], analysisType: string, includeMarketData: boolean) {
    const prompts = {
      assessment_trends: `Analyze assessment trends over time for these Chicago condominium properties.`,
      tax_burden_analysis: `Analyze the tax burden and compare to Chicago market averages for these condo properties.`,
      comparable_properties: `Find and analyze comparable properties for assessment validation.`,
      investment_analysis: `Perform investment analysis considering tax implications for these properties.`,
      appeal_assessment: `Analyze properties for potential assessment appeals and over-taxation.`
    };

    return `${prompts[analysisType] || prompts.assessment_trends}

Properties to analyze:
${JSON.stringify(properties, null, 2)}

Include market data analysis: ${includeMarketData}

Provide detailed analysis with specific insights for Chicago condominium properties, considering:
- Cook County assessment practices
- Chicago condo market factors
- Property-specific characteristics
- Legal descriptions and subdivisions
- Common element interests

Return structured analysis with actionable recommendations.`;
  }

  private async executePropertyTaxWorkflow(workflow: string, parameters: any) {
    // Would execute actual CAO workflow
    return {
      success: true,
      workflow,
      parameters,
      result: 'Mock property tax workflow execution'
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

  private async callFortressMCP(tool: string, args: any) {
    const response = await fetch(`${this.env.FORTRESS_MCP_URL}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, arguments: args })
    });
    return await response.json();
  }

  // Placeholder methods for data integration
  private async gatherPropertyDataFromMemory(pins: string[], year: number) {
    return [];
  }

  private async gatherPortfolioData(pins: string[], includeTrends: boolean) {
    return {};
  }

  private async gatherPaymentData(pins: string[]) {
    return {};
  }

  private async gatherReportData(pins: string[], reportType: string) {
    return {};
  }

  private async storeMonitoringConfig(config: any) {
    console.log('Storing monitoring config:', config.monitoring_id);
  }

  private async generateAppealDocumentation(appealAnalysis: any) {
    return {
      appeal_documents_generated: true,
      analysis: appealAnalysis
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Property Tax MCP Server running');
  }
}

// Cloudflare Worker export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'property-tax-mcp',
        chicago_properties: CHICAGO_PROPERTIES.length,
        coordinator_mcp: env.COORDINATOR_MCP_URL,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Property Tax MCP Server', { status: 200 });
  }
};

// For local development
if (typeof process !== 'undefined' && process.env) {
  const env = {
    COORDINATOR_MCP_URL: process.env.COORDINATOR_MCP_URL || 'http://localhost:8003',
    CHATGPT_MCP_URL: process.env.CHATGPT_MCP_URL || 'http://localhost:8001',
    FORTRESS_MCP_URL: process.env.FORTRESS_MCP_URL || 'http://localhost:8002',
    CHITTY_DATABASE_URL: process.env.CHITTY_DATABASE_URL!,
    CAO_WORKSPACE_PATH: process.env.CAO_WORKSPACE_PATH || '/Users/nickbianchi/MAIN/ai/exec/cao'
  };

  const server = new PropertyTaxMCP(env);
  server.start().catch(console.error);
}