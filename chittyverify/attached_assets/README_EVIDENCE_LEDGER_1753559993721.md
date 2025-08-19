# ChittyChain Evidence Ledger

A blockchain-inspired legal evidence management system for court proceedings with immutable chain of custody tracking and automated contradiction resolution.

## Quick Start

### Database Setup
```bash
# Deploy schema to Neon database
psql $NEON_DATABASE_URL < database/evidence-ledger-schema.sql
```

### MCP Server
```bash
# Start the enhanced MCP server
node chittychain-mcp-server.js

# Test with MCP inspector
npx @modelcontextprotocol/inspector node chittychain-mcp-server.js
```

## Schema Overview

### 7 Core Tables
- **MASTER EVIDENCE** - Central evidence registry with automatic weight calculation
- **ATOMIC FACTS** - Extracted facts with credibility scoring and classification
- **CASES** - Legal matter containers with roll-ups and key dates
- **USERS** - Parties, attorneys, experts with trust scores and verification
- **CHAIN OF CUSTODY LOG** - Immutable evidence transfer tracking
- **CONTRADICTION TRACKING** - Automated conflict detection and resolution
- **AUDIT TRAIL** - Complete operation logging for compliance

## Evidence Weight Hierarchy

The system automatically calculates evidence weight based on type and authentication:

| Tier | Weight | Examples |
|------|--------|----------|
| SELF_AUTHENTICATING | 1.0 | Court records, certified documents |
| GOVERNMENT | 0.95 | Official government documents |
| FINANCIAL_INSTITUTION | 0.90 | Bank records, financial statements |
| INDEPENDENT_THIRD_PARTY | 0.85 | Professional services records |
| BUSINESS_RECORDS | 0.80 | Corporate documents, contracts |
| FIRST_PARTY_ADVERSE | 0.75 | Opposing party admissions |
| FIRST_PARTY_FRIENDLY | 0.60 | Friendly party statements |
| UNCORROBORATED_PERSON | 0.40 | Personal testimony without backup |

## MCP Tools (22 Total)

### Evidence Management (7 New Tools)
- `chittychain_create_evidence` - Create evidence with auto-weight calculation
- `chittychain_add_atomic_fact` - Extract facts with classification levels
- `chittychain_detect_contradictions` - AI-powered contradiction detection
- `chittychain_resolve_contradiction` - Hierarchy-based conflict resolution
- `chittychain_chain_of_custody` - Track evidence transfers with integrity verification
- `chittychain_evidence_dashboard` - Comprehensive case analysis dashboard
- `chittychain_audit_report` - Generate audit trails for discovery

### Blockchain Operations (15 Existing Tools)
- Mining, validation, querying, and cryptographic proof tools
- Batch operations and dependency resolution
- Trust analysis and verification workflows

## Usage Examples

### Creating Evidence
```javascript
// Create new evidence record
await mcp.call('chittychain_create_evidence', {
  caseId: 'ILLINOIS-COOK-2024-DIVORCE-12345',
  userId: 'user-attorney-petitioner-001',
  evidenceType: 'Financial Record',
  evidenceTier: 'FINANCIAL_INSTITUTION',
  originalFilename: 'bank_statement_2024.pdf',
  contentHash: 'sha256:abc123...',
  authenticationMethod: 'Digital Signature'
});
```

### Extracting Facts
```javascript
// Add atomic fact from evidence
await mcp.call('chittychain_add_atomic_fact', {
  parentDocumentId: 'evidence-uuid-123',
  factText: 'Account balance was $15,000 on 2024-01-15',
  factType: 'AMOUNT',
  classificationLevel: 'FACT',
  locationInDocument: 'p.2/¶3/l.1',
  credibilityFactors: ['Contemporaneous', 'Business Duty']
});
```

### Detecting Contradictions
```javascript
// Analyze case for contradictions
await mcp.call('chittychain_detect_contradictions', {
  caseId: 'ILLINOIS-COOK-2024-DIVORCE-12345',
  conflictTypes: ['DIRECT_CONTRADICTION', 'TEMPORAL_IMPOSSIBILITY']
});
```

## File Structure

```
ChittyChain/
├── database/
│   └── evidence-ledger-schema.sql    # Complete PostgreSQL schema
├── chittychain-mcp-server.js         # Enhanced MCP server with 22 tools
├── src/
│   └── blockchain/                   # Core blockchain implementation
└── README_EVIDENCE_LEDGER.md         # This file
```

## Integration Points

### Claude Desktop
- Configure as "blockchain-legal-evidence" MCP server
- Access via MCP protocol with 1Password secrets
- Environment: `NEON_DATABASE_URL` for PostgreSQL connection

### ChittyCounsel Platform
- Evidence upload and processing workflows
- AI-powered fact extraction and classification
- Automated contradiction detection
- Court-ready package generation

### Executive AI Systems
- **General Counsel (GC)**: Full evidence management and analysis
- **Chief Automation Officer (CAO)**: Process automation and monitoring
- **Chief Executive Officer (CEO)**: Strategic case analysis and risk assessment

## Security & Compliance

### Blockchain Features
- Immutable evidence records with cryptographic hashing
- Tamper-evident audit trails with block validation
- Distributed verification with Merkle proofs
- Automated integrity checking

### Legal Standards
- Federal Rules of Evidence compliance
- Chain of custody requirements (Rule 901)
- Self-authentication support (Rule 902)
- Discovery obligation tracking
- Attorney-client privilege protection

## Development

### Database Migrations
```bash
# Apply schema updates
psql $NEON_DATABASE_URL < database/migrations/001_evidence_ledger.sql

# Verify installation
psql $NEON_DATABASE_URL -c "SELECT COUNT(*) FROM master_evidence;"
```

### Testing MCP Tools
```bash
# Start MCP inspector for interactive testing
npx @modelcontextprotocol/inspector node chittychain-mcp-server.js

# Test specific evidence tool
echo '{"method": "tools/call", "params": {"name": "chittychain_create_evidence", "arguments": {...}}}' | node chittychain-mcp-server.js
```

### Performance Monitoring
- Database query optimization with EXPLAIN ANALYZE
- Index usage monitoring for evidence searches
- Audit trail volume management
- Memory usage for large case datasets

## Roadmap

### Phase 1 (Complete)
- ✅ Evidence ledger schema design
- ✅ MCP server integration
- ✅ Automatic weight calculation
- ✅ Contradiction detection framework

### Phase 2 (In Progress)
- 🔄 Production deployment
- 🔄 ChittyCounsel integration
- 🔄 Executive AI training
- 🔄 Court package templates

### Phase 3 (Planned)
- 📋 Machine learning enhancement
- 📋 Mobile evidence capture
- 📋 Third-party integrations
- 📋 Advanced analytics dashboard