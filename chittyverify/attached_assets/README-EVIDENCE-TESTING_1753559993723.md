# ChittyChain Evidence Ledger Testing Suite

## Overview

This comprehensive testing suite validates the ChittyChain Evidence Ledger - a legal-grade evidence management system with blockchain integration. The system provides court-ready evidence tracking, atomic fact management, and contradiction resolution for legal proceedings.

## Testing Architecture

### 🧪 Test Suites

1. **Database Schema Tests** - PostgreSQL schema validation and integrity
2. **Evidence Management Tests** - Legal evidence processing and weight calculation
3. **Atomic Facts Tests** - Fact extraction and credibility analysis
4. **Chain of Custody Tests** - Evidence transfer tracking and verification
5. **Contradiction Detection Tests** - AI-powered conflict resolution
6. **MCP Server Tests** - Model Context Protocol integration
7. **Performance Tests** - Load testing and optimization validation

### 🗄️ Database Schema

The Evidence Ledger uses a comprehensive PostgreSQL schema with:

- **Users** - Attorneys, parties, court officers with role-based access
- **Cases** - Court cases with jurisdiction and status tracking
- **Master Evidence** - Primary evidence artifacts with authenticity tiers
- **Atomic Facts** - Individual factual claims extracted from evidence
- **Chain of Custody** - Immutable evidence transfer logs
- **Contradiction Tracking** - AI-powered conflict detection and resolution
- **Audit Trail** - Complete system access and modification logs

### 🎯 Evidence Tiers & Weights

```
SELF_AUTHENTICATING      → 1.00 (Perfect reliability)
GOVERNMENT              → 0.95 (Court orders, official records)
FINANCIAL_INSTITUTION   → 0.90 (Bank records, certified statements)
INDEPENDENT_THIRD_PARTY → 0.85 (Expert witnesses, neutral parties)
BUSINESS_RECORDS        → 0.80 (Corporate documents, business duty)
FIRST_PARTY_ADVERSE     → 0.75 (Admissions against interest)
FIRST_PARTY_FRIENDLY    → 0.60 (Self-serving statements)
UNCORROBORATED_PERSON   → 0.40 (Individual testimony without corroboration)
```

## Quick Start

### Prerequisites

```bash
# Required environment variables
export DATABASE_URL="postgresql://user:pass@host:5432/chittychain"
# OR
export NEON_DATABASE_URL="postgresql://user:pass@host:5432/chittychain"

# Node.js 18+ required
node --version  # Should be 18.0.0 or higher
```

### Installation

```bash
# Install dependencies
npm install

# Deploy database schema
npm run db:deploy

# Run all tests
npm test
```

### Running Specific Test Suites

```bash
# Database tests only
npm run test:database

# Evidence ledger tests only
npm run test:evidence

# MCP server tests only
npm run test:mcp

# Performance tests only
npm run test:performance

# Generate coverage report
npm run test:coverage
```

## Test Categories

### 1. Database Schema Tests (`test:database`)

Validates the PostgreSQL schema deployment and integrity:

- ✅ Schema creation and constraint enforcement
- ✅ Trigger functionality (auto-weight calculation)
- ✅ Index performance optimization
- ✅ Referential integrity and cascade deletion
- ✅ Custom functions (evidence weight calculation)

### 2. Evidence Management Tests (`test:evidence`)

Tests the core evidence processing system:

- ✅ Evidence artifact creation with automatic tier-based weighting
- ✅ Content hash verification and duplicate detection
- ✅ Authentication method validation (Seal, Stamp, Notarization, etc.)
- ✅ Minting status workflow (Pending → Verified → Minted)
- ✅ Supporting and contradicting claims tracking

### 3. Atomic Facts Tests

Validates fact extraction and classification:

- ✅ Fact type classification (DATE, AMOUNT, ADMISSION, etc.)
- ✅ Classification levels (FACT, SUPPORTED_CLAIM, ASSERTION, ALLEGATION)
- ✅ Credibility factor analysis (Against Interest, Contemporaneous, etc.)
- ✅ Case theory support and contradiction tracking
- ✅ Document location references (page/paragraph/line)

### 4. Chain of Custody Tests

Ensures evidence integrity throughout the legal process:

- ✅ Custodian transfer logging with timestamps
- ✅ Transfer method validation (SEALED_ENVELOPE, CERTIFIED_MAIL, etc.)
- ✅ Integrity verification methods (HASH_VERIFICATION, SEAL_INTACT, etc.)
- ✅ Immutable custody log with complete audit trail

### 5. Contradiction Detection Tests

Tests AI-powered conflict resolution:

- ✅ Direct contradiction detection between facts
- ✅ Temporal impossibility identification
- ✅ Logical inconsistency analysis
- ✅ Hierarchy-based resolution rules
- ✅ Impact assessment on case theory

### 6. MCP Server Tests (`test:mcp`)

Validates Model Context Protocol integration:

- ✅ 22 blockchain and evidence tools registration
- ✅ Legal-grade minting with trust analysis
- ✅ Dependency resolution and optimal minting order
- ✅ Court-ready export functionality
- ✅ Cryptographic proof generation

### 7. Performance Tests (`test:performance`)

Load testing and optimization validation:

- ✅ Bulk evidence insertion performance
- ✅ Complex query optimization
- ✅ Index utilization verification
- ✅ Memory usage and connection pooling
- ✅ Concurrent user simulation

## Advanced Features

### Contradiction Resolution Hierarchy

The system implements legal precedence rules for resolving conflicts:

1. **HIERARCHY_RULE** - Higher tier evidence wins
2. **TEMPORAL_PRIORITY** - Contemporaneous records preferred
3. **AUTHENTICATION_SUPERIORITY** - Authenticated evidence preferred
4. **ADVERSE_ADMISSION** - Admissions against interest prioritized
5. **CONTEMPORANEOUS_RECORD** - Real-time documentation preferred

### Trust Analysis & Scoring

- **Evidence Weight Calculation** - Automatic tier-based scoring
- **Credibility Factor Analysis** - Multiple reliability indicators
- **Contradiction Impact Assessment** - Case theory strengthening/weakening
- **Chain of Custody Integrity** - Unbroken custody verification

### Court-Ready Export

- **Discovery Format Export** - Standard legal proceeding formats
- **Audit Trail Generation** - Complete evidence history
- **Cryptographic Proof** - Blockchain verification for court
- **Timeline Reconstruction** - Chronological fact ordering

## Test Configuration

### Jest Configuration (`jest.config.js`)

```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  maxWorkers: 1 // Prevent database connection conflicts
};
```

### Database Test Setup

```javascript
beforeAll(async () => {
  await dbClient.connect();
  // Deploy schema
  await dbClient.query(fs.readFileSync('database/evidence-ledger-schema.sql', 'utf8'));
});

afterAll(async () => {
  // Clean up test data
  await dbClient.query('DELETE FROM atomic_facts WHERE fact_id LIKE $1', ['TEST-%']);
  await dbClient.end();
});
```

## Monitoring & Metrics

### Test Metrics Tracked

- **Test Coverage** - Line, branch, and function coverage
- **Performance Benchmarks** - Query execution times
- **Database Health** - Connection pool stats, query performance
- **Memory Usage** - Heap utilization during testing
- **Error Rates** - Failed test categorization

### Continuous Integration

```bash
# CI/CD pipeline commands
npm run test                 # Full test suite
npm run test:coverage       # Generate coverage reports
npm run db:validate         # Schema validation
npm run test:performance    # Performance benchmarking
```

## Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check environment variables
echo $DATABASE_URL
echo $NEON_DATABASE_URL

# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

**Schema Deployment Issues:**
```bash
# Re-deploy schema
npm run db:deploy

# Validate schema
npm run db:validate
```

**Test Failures:**
```bash
# Run specific test suite
npm run test:database

# Enable verbose output
npx jest --verbose

# Debug individual test
npx jest --testNamePattern="should create evidence"
```

### Performance Optimization

**Database Optimization:**
- Ensure proper indexing on frequently queried columns
- Monitor query execution plans with EXPLAIN ANALYZE
- Use connection pooling for concurrent tests

**Test Optimization:**
- Run tests in isolated database transactions
- Use test data factories for consistent setup
- Implement parallel test execution where safe

## Security Considerations

### Test Data Security

- ✅ All test data uses synthetic/fake information
- ✅ No real case numbers or personal information
- ✅ Automated cleanup of test artifacts
- ✅ Isolated test database environment

### Access Control Testing

- ✅ Role-based permission validation
- ✅ User type constraint enforcement
- ✅ Audit trail completeness verification
- ✅ Session management and authentication

## Integration with ChittyChain Ecosystem

### MCP Server Integration

The Evidence Ledger integrates with the broader ChittyChain ecosystem via:

- **Memory-Cloude** - Executive memory sharing
- **API-Unified** - External service integration
- **ChittyChain MCP** - 22 blockchain and evidence tools
- **GitHub Integration** - Version control and deployment

### Legal Platform Integration

- **ChittyCounsel** - Legal AI agent integration
- **ChittyFinance** - Financial evidence correlation
- **ChittyAssets** - Asset ownership verification
- **ChittyWorkforce** - AI executive case management

## Contributing

### Adding New Tests

```javascript
describe('New Feature Tests', () => {
  test('should validate new functionality', async () => {
    // Test implementation
    const result = await dbClient.query('SELECT ...');
    expect(result.rows[0]).toMatchObject({
      // Expected structure
    });
  });
});
```

### Performance Test Guidelines

- Measure baseline performance before optimization
- Test with realistic data volumes
- Validate memory usage and connection handling
- Document performance benchmarks

## License

This testing suite is part of the ChittyChain legal evidence blockchain platform.

**Copyright © 2024 Chitty Holdings LLC. All rights reserved.**

---

For support or questions about the Evidence Ledger testing suite, please contact the ChittyChain development team.