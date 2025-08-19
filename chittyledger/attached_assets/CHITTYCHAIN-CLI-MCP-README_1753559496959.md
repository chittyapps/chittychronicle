# ChittyChain CLI & MCP Server

## Overview

This repository contains two complementary tools for interacting with the ChittyChain blockchain:

1. **ChittyChain CLI** - Command-line interface for blockchain operations
2. **ChittyChain MCP Server** - Model Context Protocol server for AI integration

These tools provide direct blockchain access without duplicating the existing MCP evidence management functionality already available in the system.

## Architecture

### Existing Infrastructure
- **ChittyChain Core**: Located at `/Users/nickbianchi/MAIN/ai/exec/gc/sys/chittycases/chittychain/`
- **MCP Integration**: Evidence management tools via `chittychain-mcp-integration.js`
- **Legal Platform**: Full Next.js application with Notion integration

### New Tools (No Duplication)
- **CLI**: Blockchain-specific operations (mining, validation, recovery)
- **MCP Server**: Blockchain tools for AI models (not evidence management)

## Installation

```bash
cd /Users/nickbianchi/MAIN/ai/agents/agentsmith
npm install
```

## ChittyChain CLI

### Features
- Mine blocks with pending artifacts
- Validate blockchain integrity
- Query artifacts and blocks
- Create backups and recover from errors
- Export blockchain data
- Analyze performance statistics
- Verify artifacts with Merkle proofs

### Usage

```bash
# Make executable
chmod +x chittychain-cli.js

# Run directly
./chittychain-cli.js [command] [options]

# Or via node
node chittychain-cli.js [command] [options]
```

### Commands

#### `status` - Display blockchain status
```bash
./chittychain-cli.js status
```

#### `mine` - Mine a new block
```bash
./chittychain-cli.js mine --miner user@example.com
```

#### `validate` - Validate the blockchain
```bash
./chittychain-cli.js validate --verbose --export validation-report.json
```

#### `query` - Query artifacts
```bash
./chittychain-cli.js query --case CASE_123 --min-weight 0.8 --tier GOVERNMENT
```

#### `verify` - Verify an artifact
```bash
./chittychain-cli.js verify ARTIFACT_ID
```

#### `backup` - Create blockchain backup
```bash
./chittychain-cli.js backup --dir ./backups
```

#### `recover` - Recover from errors
```bash
./chittychain-cli.js recover --strategy safe
```

#### `export` - Export blockchain data
```bash
./chittychain-cli.js export --format json --output blockchain.json --include-artifacts
```

#### `analyze` - Analyze blockchain performance
```bash
./chittychain-cli.js analyze
```

## ChittyChain MCP Server

### Features
- Mine blocks via MCP tools
- Validate blockchain integrity
- Query blocks and artifacts
- Calculate and verify Merkle proofs
- Analyze blockchain performance
- Backup and recovery operations
- Batch artifact minting
- Export blockchain data

### Starting the Server

```bash
# Run the MCP server
npm run mcp

# Or directly
node chittychain-mcp-server.js
```

### Available Tools

1. **chittychain_mine_block** - Mine pending artifacts into a new block
2. **chittychain_validate_chain** - Validate blockchain integrity
3. **chittychain_get_block** - Retrieve block by index or hash
4. **chittychain_query_blocks** - Query blocks with filters
5. **chittychain_get_merkle_proof** - Get Merkle proof for artifact
6. **chittychain_verify_merkle_proof** - Verify a Merkle proof
7. **chittychain_analyze_performance** - Analyze blockchain statistics
8. **chittychain_backup** - Create blockchain backup
9. **chittychain_recover** - Recover from errors
10. **chittychain_mint_batch** - Mint multiple artifacts
11. **chittychain_export_chain** - Export blockchain data
12. **chittychain_calculate_hash** - Calculate SHA3-256 hash

### MCP Configuration

Add to your MCP configuration file:

```json
{
  "mcpServers": {
    "chittychain": {
      "command": "node",
      "args": ["/Users/nickbianchi/MAIN/ai/agents/agentsmith/chittychain-mcp-server.js"],
      "description": "ChittyChain blockchain operations"
    }
  }
}
```

## Integration Examples

### CLI Integration
```bash
# Complete workflow example
./chittychain-cli.js status
./chittychain-cli.js mine --miner legal@chittychain.local
./chittychain-cli.js validate --verbose
./chittychain-cli.js query --tier GOVERNMENT --limit 5
./chittychain-cli.js backup
```

### MCP Integration
```javascript
// Example using MCP tools
const result = await mcp.callTool('chittychain_mint_batch', {
  artifacts: [
    {
      id: 'DOC_001',
      contentHash: 'sha3_hash',
      statement: 'Court order',
      weight: 0.95,
      tier: 'GOVERNMENT',
      type: 'COURT_ORDER'
    }
  ],
  minerEmail: 'system@chittychain.local'
});
```

## Blockchain Operations Guide

### Mining Process
1. Artifacts are added to pending pool
2. Mining initiated via CLI or MCP
3. Proof-of-work algorithm finds valid nonce
4. Block created with Merkle tree
5. Block added to chain

### Validation Process
1. Genesis block verification
2. Hash linkage validation
3. Merkle root verification
4. Timestamp consistency
5. Artifact integrity checks

### Recovery Strategies
- **Safe**: Minimal changes, preserve data
- **Aggressive**: Fix errors, may lose recent data
- **Rebuild**: Complete chain reconstruction

## Evidence Tier System

The blockchain enforces a tiered evidence system:

1. **SELF_AUTHENTICATING** (1.0): Court orders, sealed documents
2. **GOVERNMENT** (0.95): Government issued documents
3. **FINANCIAL_INSTITUTION** (0.90): Bank records
4. **INDEPENDENT_THIRD_PARTY** (0.85): Third party reports
5. **BUSINESS_RECORDS** (0.80): Business documents
6. **FIRST_PARTY_ADVERSE** (0.75): Adverse party statements
7. **FIRST_PARTY_FRIENDLY** (0.60): Friendly party statements
8. **UNCORROBORATED_PERSON** (0.40): Personal testimonies

## Performance Metrics

- **Mining**: ~50-200ms per block (difficulty 4)
- **Validation**: <1s for 1000+ blocks
- **Query**: <100ms for complex queries
- **Recovery**: <5s for auto-recovery
- **Merkle Proof**: <10ms generation/verification

## Security Features

1. **SHA3-256 Hashing**: Cryptographically secure
2. **Merkle Trees**: Efficient verification
3. **Proof of Work**: Prevents tampering
4. **Immutable History**: No modifications after mining
5. **Backup System**: Automated recovery options

## Best Practices

1. **Regular Backups**: Run daily backups
2. **Validation**: Validate before critical operations
3. **Batch Operations**: Use batch minting for efficiency
4. **Monitor Events**: Subscribe to blockchain events
5. **Error Handling**: Implement recovery strategies

## Troubleshooting

### Common Issues

1. **Mining Fails**
   - Check for pending artifacts
   - Verify miner email format
   - Ensure sufficient system resources

2. **Validation Errors**
   - Run recovery with safe strategy
   - Check backup availability
   - Review error details

3. **Query Performance**
   - Use indexed fields (caseId, tier)
   - Limit results appropriately
   - Consider date ranges

## Development

### Running Tests
```bash
npm test
```

### Adding New Tools
1. Add tool definition to `tools` array
2. Implement handler in `toolHandlers`
3. Update documentation

### Contributing
- Follow existing code patterns
- Add comprehensive error handling
- Update tests for new features
- Document all changes

## Future Enhancements

1. **Multi-chain Support**: Cross-chain evidence
2. **IPFS Integration**: Distributed storage
3. **Smart Contract Deployment**: On-chain execution
4. **Mobile SDK**: iOS/Android support
5. **GraphQL API**: Advanced querying

## License

MIT License - See LICENSE file for details