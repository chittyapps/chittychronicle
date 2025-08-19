# ChittyOS Integrated MCP System Deployment Guide

## 🏗️ System Architecture Overview

Your integrated ChittyOS MCP system consists of three coordinated components:

1. **ChatGPT MCP** - Standard AI interactions with session management
2. **Fortress MCP** - Secure AI execution with PGP signing and sandboxing  
3. **Coordinator MCP** - Orchestrates both systems with evidence tracking

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ChatGPT MCP   │    │  Fortress MCP   │    │ Coordinator MCP │
│                 │    │                 │    │                 │
│ • Chat Sessions │    │ • Secure Exec   │    │ • Orchestration │
│ • Usage Analytics│   │ • PGP Signing   │    │ • Evidence Mgmt │
│ • Cost Tracking │    │ • ChittyChain   │    │ • Security Audit│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Neon Database  │
                    │                 │
                    │ • Unified Schema│
                    │ • Evidence Chain│
                    │ • Audit Trails  │
                    └─────────────────┘
```

## 🚀 Quick Start Deployment

### 1. Prerequisites Setup

```bash
# Navigate to ChittyOS root
cd /Users/nickbianchi/MAIN/chittyos

# Create MCP integration directory
mkdir -p mcp-servers/integrated-system
cd mcp-servers/integrated-system

# Install global dependencies
npm install -g wrangler
npm install -g @modelcontextprotocol/sdk
```

### 2. Environment Configuration

```bash
# Create master environment file
cat > .env << EOF
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Fortress Configuration  
FORTRESS_API_URL=http://localhost:8000
FORTRESS_API_KEY=your_fortress_trusted_gateway_key

# Database Configuration
CHITTY_DATABASE_URL=your_neon_postgres_url
CHITTY_ENCRYPTION_KEY=your_32_byte_encryption_key

# PGP Configuration
PGP_PUBLIC_KEY=your_pgp_public_key_block
PGP_KEY_ID=your_pgp_key_id

# MCP URLs (will be set after deployment)
CHATGPT_MCP_URL=https://chitty-chatgpt-mcp.your-subdomain.workers.dev
FORTRESS_MCP_URL=https://chitty-fortress-mcp.your-subdomain.workers.dev
COORDINATOR_MCP_URL=https://chitty-coordinator-mcp.your-subdomain.workers.dev
EOF
```

### 3. Database Setup

```bash
# Apply the integrated schema
psql $CHITTY_DATABASE_URL -f integrated_schema.sql

# Verify tables created
psql $CHITTY_DATABASE_URL -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%chat%' OR table_name LIKE '%fortress%' OR table_name LIKE '%evidence%';"
```

### 4. Deploy Individual MCPs

#### Deploy ChatGPT MCP
```bash
mkdir -p chatgpt-mcp
cd chatgpt-mcp

# Copy ChatGPT MCP files (from previous artifacts)
# - src/index.ts
# - wrangler.toml 
# - package.json

# Set secrets
wrangler secret put OPENAI_API_KEY
wrangler secret put CHITTY_DATABASE_URL
wrangler secret put CHITTY_ENCRYPTION_KEY

# Deploy
npm install
wrangler deploy --env production

cd ..
```

#### Deploy Fortress MCP
```bash
mkdir -p fortress-mcp
cd fortress-mcp

# Copy Fortress MCP files
# - src/index.ts (Fortress MCP server)
# - wrangler.toml (modified for fortress)
# - package.json

# Set secrets
wrangler secret put FORTRESS_API_URL
wrangler secret put FORTRESS_API_KEY
wrangler secret put CHITTY_DATABASE_URL
wrangler secret put CHITTY_ENCRYPTION_KEY
wrangler secret put PGP_PUBLIC_KEY

# Deploy
npm install
wrangler deploy --env production

cd ..
```

#### Deploy Coordinator MCP
```bash
mkdir -p coordinator-mcp
cd coordinator-mcp

# Copy Coordinator MCP files
# - src/index.ts (Coordinator server)
# - wrangler.toml (modified for coordinator)
# - package.json

# Set secrets with MCP URLs from previous deployments
wrangler secret put CHATGPT_MCP_URL
wrangler secret put FORTRESS_MCP_URL
wrangler secret put CHITTY_DATABASE_URL
wrangler secret put CHITTY_ENCRYPTION_KEY
wrangler secret put OPENAI_API_KEY
wrangler secret put FORTRESS_API_KEY

# Deploy
npm install
wrangler deploy --env production
```

## 🔧 Fortress Setup Integration

### 1. Fortress Server Configuration

```bash
# Update your existing FortressSetup.py with database integration
cd /path/to/fortress

# Create requirements.txt
cat > requirements.txt << EOF
fastapi==0.104.1
uvicorn==0.24.0
pydantic==2.5.0
psycopg2-binary==2.9.9
sqlalchemy==2.0.23
requests==2.31.0
python-gnupg==0.5.2
EOF

# Install dependencies
pip install -r requirements.txt
```

### 2. Enhanced Fortress Integration

Add this to your `FortressSetup.py`:

```python
import psycopg2
from sqlalchemy import create_engine, text
import os

# Database connection
DATABASE_URL = os.getenv('CHITTY_DATABASE_URL')
engine = create_engine(DATABASE_URL)

def log_to_chitty_db(execution_data):
    """Log execution to ChittyOS database"""
    with engine.connect() as conn:
        conn.execute(text("""
            INSERT INTO secure_executions 
            (fortress_job_id, prompt, prompt_hash, security_level, execution_method, status, fortress_output, fortress_signature)
            VALUES (:job_id, :prompt, :prompt_hash, 'fortress', 'sandboxed', 'completed', :output, :signature)
        """), execution_data)
        conn.commit()

# Add this to your existing endpoints
@app.post("/run/{input_id}")
async def run_agent(input_id: str):
    # ... existing code ...
    
    # After successful execution, log to database
    execution_data = {
        'job_id': input_id,
        'prompt': 'stored_separately',  # Get from input file
        'prompt_hash': sha256sum(prompt_content),
        'output': output_content,
        'signature': signature_content
    }
    log_to_chitty_db(execution_data)
    
    # ... rest of existing code ...
```

## 🎯 MCP Client Configuration

### For Claude Desktop
```json
{
  "mcpServers": {
    "chittyos-ai": {
      "command": "npx",
      "args": [
        "-y", 
        "@modelcontextprotocol/server-fetch", 
        "https://chitty-coordinator-mcp.your-subdomain.workers.dev"
      ]
    },
    "chatgpt": {
      "command": "npx", 
      "args": [
        "-y",
        "@modelcontextprotocol/server-fetch",
        "https://chitty-chatgpt-mcp.your-subdomain.workers.dev"
      ]
    },
    "fortress": {
      "command": "npx",
      "args": [
        "-y", 
        "@modelcontextprotocol/server-fetch",
        "https://chitty-fortress-mcp.your-subdomain.workers.dev"
      ]
    }
  }
}
```

### For ChittyOS Internal Use
```typescript
// Add to your ChittyOS configuration
const mcpConfig = {
  coordinatorMCP: 'https://chitty-coordinator-mcp.your-subdomain.workers.dev',
  chatgptMCP: 'https://chitty-chatgpt-mcp.your-subdomain.workers.dev', 
  fortressMCP: 'https://chitty-fortress-mcp.your-subdomain.workers.dev',
  fortressAPI: 'http://localhost:8000'
};
```

## 🧪 Testing the Integration

### 1. Health Checks
```bash
# Test all endpoints
curl https://chitty-chatgpt-mcp.your-subdomain.workers.dev/health
curl https://chitty-fortress-mcp.your-subdomain.workers.dev/health  
curl https://chitty-coordinator-mcp.your-subdomain.workers.dev/health

# Test Fortress API
curl http://localhost:8000/
```

### 2. Basic Functionality Test

```javascript
// Test standard execution
await mcp.callTool('chitty_secure_ai_execute', {
  prompt: 'Explain quantum computing in simple terms',
  security_level: 'standard',
  user_id: 'test-user-123',
  label: 'quantum-explanation-test'
});

// Test fortress execution  
await mcp.callTool('chitty_secure_ai_execute', {
  prompt: 'Analyze this legal contract for potential risks',
  security_level: 'fortress',
  user_id: 'test-user-123',
  case_id: 'case-123',
  label: 'contract-analysis-test',
  create_evidence: true
});

// Test verified execution
await mcp.callTool('chitty_secure_ai_execute', {
  prompt: 'Generate a financial analysis report',
  security_level: 'verified', 
  user_id: 'test-user-123',
  label: 'financial-analysis-test'
});
```

### 3. Evidence Chain Test

```javascript
// Create evidence and verify chain
const execution = await mcp.callTool('chitty_secure_ai_execute', {
  prompt: 'Legal opinion on trademark dispute',
  security_level: 'verified',
  user_id: 'lawyer-123',
  case_id: 'trademark-dispute-456',
  create_evidence: true,
  label: 'trademark-legal-opinion'
});

// Create evidence package
const evidencePackage = await mcp.callTool('chitty_evidence_package', {
  execution_id: execution.execution_id,
  case_id: 'trademark-dispute-456',
  package_format: 'legal_brief'
});

// Verify chain facts
const verification = await mcp.callTool('chitty_chain_verify', {
  fact_ids: execution.results.chain_facts,
  verify_signatures: true,
  cross_reference: true
});
```

## 📊 Monitoring and Analytics

### 1. Database Monitoring

```sql
-- Monitor execution performance
SELECT 
    security_level,
    COUNT(*) as total_executions,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration,
    COUNT(*) FILTER (WHERE status = 'completed') as successful_executions
FROM secure_executions 
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY security_level;

-- Evidence integrity check
SELECT 
    COUNT(*) as total_evidence,
    COUNT(*) FILTER (WHERE signature_verified = true) as verified_evidence,
    COUNT(*) FILTER (WHERE status = 'verified') as fully_verified
FROM evidence_records 
WHERE created_at >= NOW() - INTERVAL '7 days';

-- Chain facts verification status
SELECT 
    source,
    COUNT(*) as total_facts,
    COUNT(*) FILTER (WHERE verified = true) as verified_facts,
    ROUND(AVG(CASE WHEN verified THEN 1 ELSE 0 END) * 100, 2) as verification_rate
FROM chitty_chain_facts 
WHERE ingested_at >= NOW() - INTERVAL '7 days'
GROUP BY source;
```

### 2. Cloudflare Workers Analytics

```bash
# Monitor worker performance
wrangler analytics --env production

# View worker logs
wrangler tail --env production
```

## 🔒 Security Considerations

### 1. API Key Rotation

```bash
# Rotate OpenAI API key
wrangler secret put OPENAI_API_KEY --env production

# Rotate Fortress API key  
wrangler secret put FORTRESS_API_KEY --env production

# Update database encryption key (careful!)
wrangler secret put CHITTY_ENCRYPTION_KEY --env production
```

### 2. PGP Key Management

```bash
# Generate new PGP key for Fortress
gpg --full-generate-key

# Export public key for MCP
gpg --armor --export YOUR_KEY_ID > fortress_public_key.asc

# Update in Cloudflare
cat fortress_public_key.asc | wrangler secret put PGP_PUBLIC_KEY --env production
```

### 3. Audit Trail Verification

```javascript
// Regular integrity audits
await mcp.callTool('chitty_security_audit', {
  audit_level: 'comprehensive',
  verify_signatures: true,
  include_chain_verification: true
});
```

## 🚦 Operational Procedures

### Daily Operations

1. **Health Checks** - All MCP endpoints and Fortress API
2. **Execution Monitoring** - Check for failed executions
3. **Evidence Verification** - Verify new evidence signatures
4. **Chain Integrity** - Validate new ChittyChain facts

### Weekly Operations

1. **Security Audit** - Comprehensive security review
2. **Performance Analysis** - Execution times and costs
3. **Database Maintenance** - Cleanup old data
4. **Key Rotation Review** - Check key expiration dates

### Emergency Procedures

1. **Service Outage** - Failover to backup systems
2. **Security Breach** - Isolate and audit affected data
3. **Key Compromise** - Emergency key rotation
4. **Data Corruption** - Restore from backups and re-verify

## 📈 Scaling Considerations

### Database Scaling
- **Read Replicas** for analytics queries
- **Partitioning** for large execution tables
- **Archiving** old evidence records

### Worker Scaling
- **Auto-scaling** based on request volume
- **Regional deployment** for global access
- **Circuit breakers** for API failures

### Fortress Scaling
- **Multiple instances** for redundancy
- **Load balancing** for high volume
- **Container orchestration** for scaling

## 🎯 Success Metrics

### Technical Metrics
- ✅ **Execution Success Rate**: > 99.5%
- ✅ **Average Response Time**: < 5 seconds
- ✅ **Signature Verification**: 100% for fortress/verified levels
- ✅ **Chain Integrity**: 100% fact verification

### Business Metrics  
- ✅ **Cost per Execution**: Optimized by security level
- ✅ **Evidence Admissibility**: Legal standards compliance
- ✅ **Audit Compliance**: Zero security findings
- ✅ **User Satisfaction**: Seamless secure AI experience

---

## 🏁 Deployment Complete!

Your integrated ChittyOS MCP system is now ready for production use with:

- **Three coordinated MCP servers** on Cloudflare Workers
- **Unified database schema** with complete audit trails  
- **Fortress integration** for secure AI execution
- **Evidence management** for legal compliance
- **Chain integrity** with cryptographic verification

**Next Steps:**
1. Configure your ChittyOS executives to use the Coordinator MCP
2. Set up monitoring dashboards
3. Train users on security levels and evidence creation
4. Implement regular security audits

**Your AI fortress is operational! 🚀**