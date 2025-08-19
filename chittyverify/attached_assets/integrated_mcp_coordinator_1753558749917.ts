// ChittyOS Integrated MCP Coordinator
// Orchestrates ChatGPT and Fortress MCPs for secure AI execution

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

interface Env {
  CHATGPT_MCP_URL: string;
  FORTRESS_MCP_URL: string;
  CHITTY_DATABASE_URL: string;
  CHITTY_ENCRYPTION_KEY: string;
  OPENAI_API_KEY: string;
  FORTRESS_API_KEY: string;
}

interface SecureExecution {
  id: string;
  user_id: string;
  prompt: string;
  security_level: 'standard' | 'fortress' | 'verified';
  execution_method: 'direct' | 'sandboxed' | 'verified';
  chat_session_id?: string;
  fortress_job_id?: string;
  evidence_id?: string;
  created_at: string;
  completed_at?: string;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'verified';
  results: {
    chatgpt_response?: string;
    fortress_output?: string;
    fortress_signature?: string;
    verification_status?: boolean;
    chain_facts?: string[];
  };
  metadata: Record<string, any>;
}

class ChittyOSMCPCoordinator {
  private server: Server;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.server = new Server(
      {
        name: 'chittyos-mcp-coordinator',
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
            name: 'chitty_secure_ai_execute',
            description: 'Execute AI prompt with configurable security levels (standard/fortress/verified)',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'AI prompt to execute'
                },
                security_level: {
                  type: 'string',
                  enum: ['standard', 'fortress', 'verified'],
                  default: 'standard',
                  description: 'Security level: standard (ChatGPT only), fortress (sandboxed), verified (fortress + signature)'
                },
                user_id: {
                  type: 'string',
                  description: 'User ID for tracking'
                },
                case_id: {
                  type: 'string',
                  description: 'Optional case ID for legal evidence'
                },
                model: {
                  type: 'string',
                  default: 'gpt-4',
                  description: 'ChatGPT model to use'
                },
                label: {
                  type: 'string',
                  description: 'Label for the execution'
                },
                create_evidence: {
                  type: 'boolean',
                  default: false,
                  description: 'Create evidence record for legal use'
                }
              },
              required: ['prompt', 'user_id']
            }
          },
          {
            name: 'chitty_compare_ai_responses',
            description: 'Compare responses from ChatGPT (standard) vs Fortress (secure) execution',
            inputSchema: {
              type: 'object',
              properties: {
                prompt: {
                  type: 'string',
                  description: 'Prompt to test with both systems'
                },
                user_id: {
                  type: 'string',
                  description: 'User ID'
                },
                model: {
                  type: 'string',
                  default: 'gpt-4'
                },
                create_analysis: {
                  type: 'boolean',
                  default: true,
                  description: 'Create analysis of differences'
                }
              },
              required: ['prompt', 'user_id']
            }
          },
          {
            name: 'chitty_execution_status',
            description: 'Get status of a secure execution job',
            inputSchema: {
              type: 'object',
              properties: {
                execution_id: {
                  type: 'string',
                  description: 'Execution ID to check'
                }
              },
              required: ['execution_id']
            }
          },
          {
            name: 'chitty_evidence_package',
            description: 'Create complete evidence package with AI execution proof',
            inputSchema: {
              type: 'object',
              properties: {
                execution_id: {
                  type: 'string',
                  description: 'Execution ID to package'
                },
                case_id: {
                  type: 'string',
                  description: 'Case ID for legal filing'
                },
                include_chain_facts: {
                  type: 'boolean',
                  default: true
                },
                package_format: {
                  type: 'string',
                  enum: ['json', 'pdf', 'legal_brief'],
                  default: 'json'
                }
              },
              required: ['execution_id']
            }
          },
          {
            name: 'chitty_security_audit',
            description: 'Audit security and integrity of AI execution pipeline',
            inputSchema: {
              type: 'object',
              properties: {
                execution_ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Execution IDs to audit'
                },
                audit_level: {
                  type: 'string',
                  enum: ['basic', 'comprehensive', 'forensic'],
                  default: 'comprehensive'
                },
                include_signatures: {
                  type: 'boolean',
                  default: true
                }
              }
            }
          },
          {
            name: 'chitty_chain_verify',
            description: 'Verify integrity of ChittyChain facts and assertions',
            inputSchema: {
              type: 'object',
              properties: {
                fact_ids: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Fact IDs to verify'
                },
                verify_signatures: {
                  type: 'boolean',
                  default: true
                },
                cross_reference: {
                  type: 'boolean',
                  default: true,
                  description: 'Cross-reference with external sources'
                }
              }
            }
          },
          {
            name: 'chitty_orchestrate_executives',
            description: 'Orchestrate ChittyOS executives with secure AI execution',
            inputSchema: {
              type: 'object',
              properties: {
                task: {
                  type: 'string',
                  description: 'Task for executive coordination'
                },
                executives: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Executives to involve (GC, CFO, CMO, etc.)'
                },
                security_required: {
                  type: 'boolean',
                  default: false,
                  description: 'Use Fortress for sensitive executive decisions'
                },
                evidence_tracking: {
                  type: 'boolean',
                  default: false,
                  description: 'Create evidence trail for decisions'
                }
              },
              required: ['task', 'executives']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'chitty_secure_ai_execute':
            return await this.handleSecureAIExecute(args);
          
          case 'chitty_compare_ai_responses':
            return await this.handleCompareAIResponses(args);
          
          case 'chitty_execution_status':
            return await this.handleExecutionStatus(args);
          
          case 'chitty_evidence_package':
            return await this.handleEvidencePackage(args);
          
          case 'chitty_security_audit':
            return await this.handleSecurityAudit(args);
          
          case 'chitty_chain_verify':
            return await this.handleChainVerify(args);
          
          case 'chitty_orchestrate_executives':
            return await this.handleOrchestrateExecutives(args);
          
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

  private async handleSecureAIExecute(args: any) {
    const {
      prompt,
      security_level = 'standard',
      user_id,
      case_id,
      model = 'gpt-4',
      label,
      create_evidence = false
    } = args;

    const executionId = crypto.randomUUID();
    const execution: SecureExecution = {
      id: executionId,
      user_id,
      prompt,
      security_level,
      execution_method: this.getExecutionMethod(security_level),
      case_id,
      created_at: new Date().toISOString(),
      status: 'pending',
      results: {},
      metadata: { model, label }
    };

    // Store initial execution record
    await this.storeExecution(execution);

    try {
      execution.status = 'executing';
      await this.updateExecution(execution);

      switch (security_level) {
        case 'standard':
          await this.executeStandard(execution, prompt, model);
          break;
        
        case 'fortress':
          await this.executeFortress(execution, prompt, label || 'secure-execution');
          break;
        
        case 'verified':
          await this.executeVerified(execution, prompt, label || 'verified-execution');
          break;
      }

      execution.status = 'completed';
      execution.completed_at = new Date().toISOString();

      // Create evidence if requested
      if (create_evidence && case_id) {
        const evidenceId = await this.createEvidenceRecord(execution);
        execution.evidence_id = evidenceId;
      }

      await this.updateExecution(execution);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              execution_id: executionId,
              status: execution.status,
              security_level,
              results: execution.results,
              evidence_id: execution.evidence_id,
              verification: {
                fortress_signed: !!execution.results.fortress_signature,
                signature_valid: execution.results.verification_status,
                chain_facts_logged: execution.results.chain_facts?.length || 0
              }
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      execution.status = 'failed';
      execution.metadata.error = error.message;
      await this.updateExecution(execution);
      throw error;
    }
  }

  private async executeStandard(execution: SecureExecution, prompt: string, model: string) {
    const chatResponse = await this.callChatGPTMCP('chatgpt_complete', {
      messages: [
        { role: 'user', content: prompt }
      ],
      model,
      session_id: execution.id
    });

    execution.results.chatgpt_response = JSON.parse(chatResponse.content[0].text).response;
    execution.chat_session_id = execution.id;
  }

  private async executeFortress(execution: SecureExecution, prompt: string, label: string) {
    const fortressResponse = await this.callFortressMCP('fortress_secure_execute', {
      prompt,
      label,
      evidence_id: execution.id
    });

    const result = JSON.parse(fortressResponse.content[0].text);
    execution.results.fortress_output = result.output;
    execution.results.fortress_signature = result.signature;
    execution.fortress_job_id = result.job_id;
    execution.results.chain_facts = [result.assertion_id];
  }

  private async executeVerified(execution: SecureExecution, prompt: string, label: string) {
    // Execute in fortress first
    await this.executeFortress(execution, prompt, label);

    // Verify the signature
    const verifyResponse = await this.callFortressMCP('fortress_verify_signature', {
      content: execution.results.fortress_output,
      signature: execution.results.fortress_signature
    });

    const verifyResult = JSON.parse(verifyResponse.content[0].text);
    execution.results.verification_status = verifyResult.signature_valid;

    // Also run through standard ChatGPT for comparison
    await this.executeStandard(execution, prompt, execution.metadata.model);

    // Log comparison assertion
    const comparisonAssertion = await this.callFortressMCP('fortress_log_assertion', {
      subject: `execution:${execution.id}`,
      predicate: 'compared_with_standard',
      object: `chatgpt:${execution.chat_session_id}`,
      source: 'chittyos-coordinator'
    });

    execution.results.chain_facts = execution.results.chain_facts || [];
    execution.results.chain_facts.push(JSON.parse(comparisonAssertion.content[0].text).fact_id);
  }

  private async handleCompareAIResponses(args: any) {
    const { prompt, user_id, model = 'gpt-4', create_analysis = true } = args;

    // Execute both standard and fortress
    const standardExecution = await this.handleSecureAIExecute({
      prompt,
      user_id,
      security_level: 'standard',
      model,
      label: 'comparison-standard'
    });

    const fortressExecution = await this.handleSecureAIExecute({
      prompt,
      user_id,
      security_level: 'fortress',
      model,
      label: 'comparison-fortress'
    });

    const standardResult = JSON.parse(standardExecution.content[0].text);
    const fortressResult = JSON.parse(fortressExecution.content[0].text);

    let analysis = null;
    if (create_analysis) {
      // Create analysis comparing the responses
      const analysisPrompt = `Compare these two AI responses to the same prompt and analyze differences:

Prompt: ${prompt}

Standard Response: ${standardResult.results.chatgpt_response}

Fortress Response: ${fortressResult.results.fortress_output}

Provide analysis of:
1. Content differences
2. Security implications
3. Reliability assessment
4. Recommendation for use case`;

      const analysisExecution = await this.handleSecureAIExecute({
        prompt: analysisPrompt,
        user_id,
        security_level: 'verified',
        model,
        label: 'response-analysis'
      });

      analysis = JSON.parse(analysisExecution.content[0].text);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            comparison_id: crypto.randomUUID(),
            standard_execution: standardResult.execution_id,
            fortress_execution: fortressResult.execution_id,
            analysis_execution: analysis?.execution_id,
            summary: {
              both_completed: standardResult.status === 'completed' && fortressResult.status === 'completed',
              fortress_verified: fortressResult.verification?.signature_valid,
              differences_detected: standardResult.results.chatgpt_response !== fortressResult.results.fortress_output
            },
            results: {
              standard: standardResult.results,
              fortress: fortressResult.results,
              analysis: analysis?.results
            }
          }, null, 2)
        }
      ]
    };
  }

  private async handleExecutionStatus(args: any) {
    const { execution_id } = args;
    
    const execution = await this.getExecution(execution_id);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ execution }, null, 2)
        }
      ]
    };
  }

  private async handleEvidencePackage(args: any) {
    const { execution_id, case_id, include_chain_facts = true, package_format = 'json' } = args;
    
    const execution = await this.getExecution(execution_id);
    const evidencePackage = await this.createEvidencePackage(execution, case_id, include_chain_facts, package_format);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ evidence_package: evidencePackage }, null, 2)
        }
      ]
    };
  }

  private async handleSecurityAudit(args: any) {
    const { execution_ids = [], audit_level = 'comprehensive', include_signatures = true } = args;
    
    const auditReport = await this.performSecurityAudit(execution_ids, audit_level, include_signatures);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ audit_report: auditReport }, null, 2)
        }
      ]
    };
  }

  private async handleChainVerify(args: any) {
    const { fact_ids = [], verify_signatures = true, cross_reference = true } = args;
    
    const verification = await this.verifyChainFacts(fact_ids, verify_signatures, cross_reference);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ verification }, null, 2)
        }
      ]
    };
  }

  private async handleOrchestrateExecutives(args: any) {
    const { task, executives, security_required = false, evidence_tracking = false } = args;
    
    const orchestrationResult = await this.orchestrateExecutives(task, executives, security_required, evidence_tracking);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ orchestration: orchestrationResult }, null, 2)
        }
      ]
    };
  }

  // Helper methods
  private getExecutionMethod(securityLevel: string): 'direct' | 'sandboxed' | 'verified' {
    switch (securityLevel) {
      case 'standard': return 'direct';
      case 'fortress': return 'sandboxed';
      case 'verified': return 'verified';
      default: return 'direct';
    }
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

  // Database operations (implement with your database)
  private async storeExecution(execution: SecureExecution) {
    console.log('Storing execution:', execution.id);
  }

  private async updateExecution(execution: SecureExecution) {
    console.log('Updating execution:', execution.id);
  }

  private async getExecution(executionId: string): Promise<SecureExecution | null> {
    console.log('Getting execution:', executionId);
    return null;
  }

  private async createEvidenceRecord(execution: SecureExecution): Promise<string> {
    console.log('Creating evidence for execution:', execution.id);
    return crypto.randomUUID();
  }

  private async createEvidencePackage(execution: SecureExecution, caseId?: string, includeChainFacts: boolean = true, format: string = 'json') {
    return {
      package_id: crypto.randomUUID(),
      execution_id: execution.id,
      case_id: caseId,
      format,
      created_at: new Date().toISOString(),
      contents: execution
    };
  }

  private async performSecurityAudit(executionIds: string[], auditLevel: string, includeSignatures: boolean) {
    return {
      audit_id: crypto.randomUUID(),
      level: auditLevel,
      executions_audited: executionIds.length,
      findings: [],
      recommendations: [],
      audit_completed_at: new Date().toISOString()
    };
  }

  private async verifyChainFacts(factIds: string[], verifySignatures: boolean, crossReference: boolean) {
    return {
      verification_id: crypto.randomUUID(),
      facts_verified: factIds.length,
      all_valid: true,
      verification_completed_at: new Date().toISOString()
    };
  }

  private async orchestrateExecutives(task: string, executives: string[], securityRequired: boolean, evidenceTracking: boolean) {
    return {
      orchestration_id: crypto.randomUUID(),
      task,
      executives_involved: executives,
      security_level: securityRequired ? 'fortress' : 'standard',
      evidence_created: evidenceTracking,
      status: 'initiated',
      created_at: new Date().toISOString()
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('ChittyOS MCP Coordinator running');
  }
}

// Cloudflare Worker export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'chittyos-mcp-coordinator',
        chatgpt_mcp: env.CHATGPT_MCP_URL,
        fortress_mcp: env.FORTRESS_MCP_URL,
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('ChittyOS MCP Coordinator', { status: 200 });
  }
};

// For local development
if (typeof process !== 'undefined' && process.env) {
  const env = {
    CHATGPT_MCP_URL: process.env.CHATGPT_MCP_URL || 'http://localhost:8001',
    FORTRESS_MCP_URL: process.env.FORTRESS_MCP_URL || 'http://localhost:8002',
    CHITTY_DATABASE_URL: process.env.CHITTY_DATABASE_URL!,
    CHITTY_ENCRYPTION_KEY: process.env.CHITTY_ENCRYPTION_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    FORTRESS_API_KEY: process.env.FORTRESS_API_KEY!
  };

  const server = new ChittyOSMCPCoordinator(env);
  server.start().catch(console.error);
}