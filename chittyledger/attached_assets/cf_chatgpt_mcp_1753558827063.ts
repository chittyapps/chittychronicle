// Cloudflare ChatGPT MCP Server
// Deploy as Cloudflare Worker for ChittyOS integration

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
  OPENAI_API_KEY: string;
  CHITTY_DATABASE_URL: string;
  CHITTY_ENCRYPTION_KEY: string;
}

// OpenAI API interface
interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ChittyOS integration types
interface ChittyChatSession {
  id: string;
  user_id: string;
  session_name: string;
  created_at: string;
  updated_at: string;
  messages: ChittyMessage[];
  metadata: Record<string, any>;
}

interface ChittyMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tokens_used?: number;
  cost?: number;
}

class CloudflareChatGPTMCP {
  private server: Server;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    this.server = new Server(
      {
        name: 'cloudflare-chatgpt-mcp',
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
            name: 'chatgpt_complete',
            description: 'Send a completion request to ChatGPT/OpenAI',
            inputSchema: {
              type: 'object',
              properties: {
                messages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                      content: { type: 'string' }
                    },
                    required: ['role', 'content']
                  },
                  description: 'Array of messages for the conversation'
                },
                model: {
                  type: 'string',
                  default: 'gpt-4',
                  description: 'OpenAI model to use'
                },
                max_tokens: {
                  type: 'number',
                  default: 1000,
                  description: 'Maximum tokens in response'
                },
                temperature: {
                  type: 'number',
                  default: 0.7,
                  description: 'Response creativity (0-2)'
                },
                session_id: {
                  type: 'string',
                  description: 'ChittyOS session ID for tracking'
                }
              },
              required: ['messages']
            }
          },
          {
            name: 'chatgpt_stream',
            description: 'Stream a ChatGPT response in real-time',
            inputSchema: {
              type: 'object',
              properties: {
                messages: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                      content: { type: 'string' }
                    },
                    required: ['role', 'content']
                  }
                },
                model: { type: 'string', default: 'gpt-4' },
                session_id: { type: 'string' }
              },
              required: ['messages']
            }
          },
          {
            name: 'chitty_chat_session_create',
            description: 'Create a new ChittyOS chat session',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string', description: 'User ID' },
                session_name: { type: 'string', description: 'Name for the session' },
                initial_system_prompt: { type: 'string', description: 'Initial system message' }
              },
              required: ['user_id', 'session_name']
            }
          },
          {
            name: 'chitty_chat_session_list',
            description: 'List ChittyOS chat sessions for a user',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string', description: 'User ID' },
                limit: { type: 'number', default: 20 },
                offset: { type: 'number', default: 0 }
              },
              required: ['user_id']
            }
          },
          {
            name: 'chitty_chat_session_get',
            description: 'Get a specific ChittyOS chat session with messages',
            inputSchema: {
              type: 'object',
              properties: {
                session_id: { type: 'string', description: 'Session ID' },
                include_messages: { type: 'boolean', default: true }
              },
              required: ['session_id']
            }
          },
          {
            name: 'chitty_message_add',
            description: 'Add a message to a ChittyOS chat session',
            inputSchema: {
              type: 'object',
              properties: {
                session_id: { type: 'string' },
                role: { type: 'string', enum: ['user', 'assistant', 'system'] },
                content: { type: 'string' },
                tokens_used: { type: 'number' },
                cost: { type: 'number' }
              },
              required: ['session_id', 'role', 'content']
            }
          },
          {
            name: 'chitty_usage_analytics',
            description: 'Get ChatGPT usage analytics for ChittyOS',
            inputSchema: {
              type: 'object',
              properties: {
                user_id: { type: 'string' },
                start_date: { type: 'string', description: 'ISO date string' },
                end_date: { type: 'string', description: 'ISO date string' },
                granularity: { type: 'string', enum: ['day', 'week', 'month'], default: 'day' }
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
          case 'chatgpt_complete':
            return await this.handleChatGPTComplete(args);
          
          case 'chatgpt_stream':
            return await this.handleChatGPTStream(args);
          
          case 'chitty_chat_session_create':
            return await this.handleCreateSession(args);
          
          case 'chitty_chat_session_list':
            return await this.handleListSessions(args);
          
          case 'chitty_chat_session_get':
            return await this.handleGetSession(args);
          
          case 'chitty_message_add':
            return await this.handleAddMessage(args);
          
          case 'chitty_usage_analytics':
            return await this.handleUsageAnalytics(args);
          
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

  private async handleChatGPTComplete(args: any) {
    const { messages, model = 'gpt-4', max_tokens = 1000, temperature = 0.7, session_id } = args;

    const openaiRequest: OpenAIRequest = {
      model,
      messages,
      max_tokens,
      temperature
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openaiRequest)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const result: OpenAIResponse = await response.json();

    // Store in ChittyOS if session_id provided
    if (session_id) {
      await this.storeInteraction(session_id, messages[messages.length - 1], result.choices[0].message, result.usage);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            response: result.choices[0].message.content,
            usage: result.usage,
            model: result.model,
            session_id
          }, null, 2)
        }
      ]
    };
  }

  private async handleChatGPTStream(args: any) {
    const { messages, model = 'gpt-4', session_id } = args;

    const openaiRequest = {
      model,
      messages,
      stream: true
    };

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(openaiRequest)
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Note: Streaming implementation would need WebSocket or SSE support
    // For now, return stream setup confirmation
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'stream_initiated',
            session_id,
            message: 'Streaming response initiated. Full streaming requires WebSocket implementation.'
          }, null, 2)
        }
      ]
    };
  }

  private async handleCreateSession(args: any) {
    const { user_id, session_name, initial_system_prompt } = args;
    
    const sessionId = crypto.randomUUID();
    const now = new Date().toISOString();

    const session: ChittyChatSession = {
      id: sessionId,
      user_id,
      session_name,
      created_at: now,
      updated_at: now,
      messages: [],
      metadata: { model_provider: 'openai' }
    };

    // Add initial system prompt if provided
    if (initial_system_prompt) {
      session.messages.push({
        id: crypto.randomUUID(),
        session_id: sessionId,
        role: 'system',
        content: initial_system_prompt,
        timestamp: now
      });
    }

    await this.storeSession(session);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ session }, null, 2)
        }
      ]
    };
  }

  private async handleListSessions(args: any) {
    const { user_id, limit = 20, offset = 0 } = args;
    
    const sessions = await this.getSessions(user_id, limit, offset);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ sessions, count: sessions.length }, null, 2)
        }
      ]
    };
  }

  private async handleGetSession(args: any) {
    const { session_id, include_messages = true } = args;
    
    const session = await this.getSession(session_id, include_messages);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ session }, null, 2)
        }
      ]
    };
  }

  private async handleAddMessage(args: any) {
    const { session_id, role, content, tokens_used, cost } = args;
    
    const message: ChittyMessage = {
      id: crypto.randomUUID(),
      session_id,
      role,
      content,
      timestamp: new Date().toISOString(),
      tokens_used,
      cost
    };

    await this.storeMessage(message);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ message }, null, 2)
        }
      ]
    };
  }

  private async handleUsageAnalytics(args: any) {
    const { user_id, start_date, end_date, granularity = 'day' } = args;
    
    const analytics = await this.getUsageAnalytics(user_id, start_date, end_date, granularity);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ analytics }, null, 2)
        }
      ]
    };
  }

  // Database operations (placeholder - implement with your preferred DB)
  private async storeSession(session: ChittyChatSession) {
    // Implementation for storing session in Neon PostgreSQL
    console.log('Storing session:', session.id);
  }

  private async getSessions(userId: string, limit: number, offset: number): Promise<ChittyChatSession[]> {
    // Implementation for retrieving sessions
    return [];
  }

  private async getSession(sessionId: string, includeMessages: boolean): Promise<ChittyChatSession | null> {
    // Implementation for retrieving specific session
    return null;
  }

  private async storeMessage(message: ChittyMessage) {
    // Implementation for storing message
    console.log('Storing message:', message.id);
  }

  private async storeInteraction(sessionId: string, userMessage: OpenAIMessage, assistantMessage: any, usage: any) {
    // Store both user and assistant messages
    await this.storeMessage({
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: userMessage.role,
      content: userMessage.content,
      timestamp: new Date().toISOString()
    });

    await this.storeMessage({
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: 'assistant',
      content: assistantMessage.content,
      timestamp: new Date().toISOString(),
      tokens_used: usage.total_tokens,
      cost: this.calculateCost(usage.total_tokens)
    });
  }

  private calculateCost(tokens: number): number {
    // GPT-4 pricing calculation (update as needed)
    const inputCostPer1k = 0.03;
    const outputCostPer1k = 0.06;
    return (tokens / 1000) * ((inputCostPer1k + outputCostPer1k) / 2);
  }

  private async getUsageAnalytics(userId?: string, startDate?: string, endDate?: string, granularity: string = 'day') {
    // Implementation for usage analytics
    return {
      total_sessions: 0,
      total_messages: 0,
      total_tokens: 0,
      total_cost: 0,
      breakdown: []
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Cloudflare ChatGPT MCP Server running');
  }
}

// Cloudflare Worker export
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle HTTP requests if needed
    if (request.method === 'GET' && new URL(request.url).pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        service: 'cloudflare-chatgpt-mcp',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('ChatGPT MCP Server', { status: 200 });
  }
};

// For local development
if (typeof process !== 'undefined' && process.env) {
  const env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
    CHITTY_DATABASE_URL: process.env.CHITTY_DATABASE_URL!,
    CHITTY_ENCRYPTION_KEY: process.env.CHITTY_ENCRYPTION_KEY!
  };

  const server = new CloudflareChatGPTMCP(env);
  server.start().catch(console.error);
}