# ChittyOS ChatGPT MCP Server

A comprehensive Cloudflare Worker-based MCP server that integrates OpenAI's ChatGPT with the ChittyOS ecosystem.

## 🚀 Features

- **Full ChatGPT Integration**: Complete OpenAI API integration with streaming support
- **ChittyOS Native**: Built-in session management, analytics, and cost tracking
- **Cloudflare Workers**: Serverless deployment with global edge distribution
- **Multi-User Support**: User-specific API keys and configurations
- **Usage Analytics**: Detailed token usage and cost tracking
- **Session Templates**: Pre-configured chat templates for different use cases
- **Model Configurations**: User-defined model parameters and system prompts

## 📋 Prerequisites

- Cloudflare account with Workers enabled
- OpenAI API key
- Neon PostgreSQL database (for ChittyOS integration)
- Node.js 18+ for local development

## 🛠 Installation

### 1. Clone and Setup

```bash
# Navigate to your ChittyOS directory
cd /Users/nickbianchi/MAIN/chittyos

# Create the MCP server directory
mkdir -p mcp-servers/chatgpt-mcp
cd mcp-servers/chatgpt-mcp

# Initialize the project
npm init -y
npm install @modelcontextprotocol/sdk @types/node
npm install -D @cloudflare/workers-types typescript wrangler tsx
```

### 2. Environment Setup

```bash
# Set up Cloudflare Worker secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put CHITTY_DATABASE_URL
wrangler secret put CHITTY_ENCRYPTION_KEY

# For local development, create .env file
cat > .env << EOF
OPENAI_API_KEY=your_openai_api_key_here
CHITTY_DATABASE_URL=your_neon_postgres_url
CHITTY_ENCRYPTION_KEY=your_32_byte_encryption_key
EOF
```

### 3. Database Setup

```bash
# Run the schema against your Neon database
psql $CHITTY_DATABASE_URL -f schema.sql
```

### 4. Deploy to Cloudflare

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod

# Check deployment
curl https://chitty-chatgpt-mcp.your-subdomain.workers.dev/health
```

## 🔧 Configuration

### MCP Client Integration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "chatgpt": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch", "https://chitty-chatgpt-mcp.your-subdomain.workers.dev"]
    }
  }
}
```

### ChittyOS Integration

The server automatically integrates with these ChittyOS systems:

- **Cases**: Link chat sessions to legal cases
- **Documents**: Reference documents in conversations
- **Finance**: Track AI usage costs
- **Consultant**: Enhanced AI orchestration
- **Verify**: Content verification and fact-checking

## 📚 Usage Examples

### Basic Chat Completion

```javascript
// Using the MCP tool
await mcp.callTool('chatgpt_complete', {
  messages: [
    { role: 'system', content: 'You are a helpful assistant.' },
    { role: 'user', content: 'Explain quantum computing' }
  ],
  model: 'gpt-4',
  max_tokens: 1000,
  temperature: 0.7,
  session_id: 'user123-session456'
});
```

### Create Chat Session

```javascript
// Create a new session
await mcp.callTool('chitty_chat_session_create', {
  user_id: 'user123',
  session_name: 'Legal Research Session',
  initial_system_prompt: 'You are a legal research assistant specializing in contract law.'
});
```

### Stream Response

```javascript
// Stream a response
await mcp.callTool('chatgpt_stream', {
  messages: [
    { role: 'user', content: 'Write a detailed analysis of...' }
  ],
  model: 'gpt-4',
  session_id: 'session123'
});
```

### Usage Analytics

```javascript
// Get usage analytics
await mcp.callTool('chitty_usage_analytics', {
  user_id: 'user123',
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  granularity: 'day'
});
```

## 🔌 API Endpoints

### Health Check
```
GET /health
```

### WebSocket Support (Future)
```
WebSocket /ws/stream/{sessionId}
```

## 📊 Database Schema

### Core Tables

- **chat_sessions**: Session management and metadata
- **chat_messages**: Individual messages with tokens/cost tracking
- **usage_analytics**: Aggregated usage statistics
- **api_keys**: User-specific API key management
- **model_configs**: Custom model configurations
- **session_templates**: Reusable session templates

### Key Features

- ✅ Automatic cost calculation
- ✅ Token usage tracking
- ✅ Session statistics
- ✅ Usage analytics aggregation
- ✅ Template system
- ✅ Multi-user API key support

## 🔐 Security

### API Key Management
- Encrypted storage of user API keys
- Per-user key rotation support
- Usage monitoring and limits

### Access Control
- User-specific sessions and data
- Encrypted sensitive data
- Secure environment variable handling

## 🚦 Rate Limiting

Default OpenAI rate limits apply:
- GPT-4: 10,000 TPM (tokens per minute)
- GPT-3.5: 60,000 TPM
- Custom limits can be implemented per user

## 📈 Monitoring

### Built-in Analytics
- Token usage per session/user
- Cost tracking with model-specific pricing
- Response time monitoring
- Error rate tracking

### Cloudflare Analytics
- Worker invocation metrics
- Geographic distribution
- Performance insights

## 🔧 Development

### Local Development

```bash
# Start local development server
npm run dev:local

# Run with Cloudflare dev environment
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Formatting
npm run format
```

### Testing

```bash
# Run tests
npm test

# Test MCP integration
npx @modelcontextprotocol/inspector http://localhost:8000
```

## 🌟 ChittyOS Integration Points

### Executive Coordination
The MCP server can coordinate with ChittyOS executives:

```javascript
// Trigger executive analysis
await mcp.callTool('chatgpt_complete', {
  messages: [
    { role: 'system', content: 'Coordinate with CLOUDEFO for financial analysis...' }
  ],
  session_id: 'exec-coordination-session'
});
```

### Document Integration
```javascript
// Reference ChittyOS documents
await mcp.callTool('chatgpt_complete', {
  messages: [
    { role: 'user', content: 'Analyze the contract in document ID: doc123' }
  ],
  session_id: 'document-analysis-session'
});
```

### Case Management
```javascript
// Link to legal cases
await mcp.callTool('chitty_chat_session_create', {
  user_id: 'lawyer123',
  session_name: 'Case Analysis: Smith v. Jones',
  metadata: { case_id: 'case456', case_type: 'contract_dispute' }
});
```

## 🐛 Troubleshooting

### Common Issues

1. **API Key Issues**: Verify OpenAI API key is set correctly
2. **Database Connection**: Check Neon PostgreSQL URL and permissions
3. **Deployment Failures**: Verify Cloudflare Worker limits and settings
4. **MCP Connection**: Ensure proper server URL and transport configuration

### Debug Mode

```bash
# Enable debug logging
export DEBUG=chitty:mcp:chatgpt
npm run dev:local
```

### Logs

```bash
# View Cloudflare Worker logs
wrangler tail

# View specific deployment logs
wrangler tail --env production
```

## 📝 Contributing

1. Follow ChittyOS development patterns
2. Add tests for new features
3. Update documentation
4. Use conventional commits
5. Integrate with existing ChittyOS systems

## 📄 License

MIT License - Part of the ChittyOS ecosystem

---

**Integration Status**: ✅ Ready for ChittyOS deployment
**Security**: ✅ Production-ready with encryption
**Scalability**: ✅ Cloudflare Workers edge deployment
**Monitoring**: ✅ Built-in analytics and logging