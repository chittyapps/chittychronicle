# ChittyChain V2 - Enhanced Blockchain Evidence System

## Overview

ChittyChain V2 is a production-ready blockchain implementation designed specifically for legal evidence management. It provides immutable evidence tracking, tiered validation, contradiction detection, and comprehensive recovery mechanisms.

## Key Features

### 1. **Enhanced Core Blockchain**
- **ChittyBlockV2**: Improved block structure with SHA3-256 hashing, Merkle tree implementation, and comprehensive validation
- **ChittyChainV2**: Event-driven architecture with artifact indexing, contradiction engine, and consensus rules
- **Performance**: Optimized mining algorithm with progress callbacks and batch processing

### 2. **Tiered Evidence System**
- **Government Tier** (0.9-1.0 weight): Auto-mints with digital seal authentication
- **Financial Tier** (0.7-0.9 weight): Auto-mints at 0.95+ weight
- **Third Party Tier** (0.5-0.7 weight): Requires verification and 0.9+ weight
- **Personal Tier** (0.0-0.5 weight): Requires multiple corroborations

### 3. **Smart Artifact Minting**
- **Validation Pipeline**: Multi-stage validation before minting
- **Contradiction Detection**: Automatic detection and resolution based on tier hierarchy
- **Merkle Proofs**: Every minted artifact includes verifiable proof of inclusion
- **Batch Processing**: Efficient batch minting with individual validation

### 4. **Blockchain Validation**
- **Comprehensive Checks**: Genesis validation, hash linkage, Merkle roots, timestamps
- **Integrity Monitoring**: Real-time chain integrity verification
- **Validation Reports**: Exportable JSON reports with recommendations

### 5. **Error Recovery**
- **Auto-Recovery**: Multiple recovery strategies (safe, aggressive, rebuild)
- **Backup System**: Automatic backups with configurable retention
- **Block Repair**: Automatic hash recalculation and chain repair
- **Checkpoint System**: Named checkpoints for critical operations

### 6. **Smart Contracts**
- **EvidenceRegistry.sol**: On-chain evidence tracking with corroboration support
- **Tiered Validation**: Smart contract enforcement of evidence tiers
- **Contradiction Reporting**: On-chain contradiction tracking and resolution

## Architecture

```
chittychain/
├── src/blockchain/
│   ├── ChittyBlockV2.js      # Enhanced block implementation
│   ├── ChittyChainV2.js      # Enhanced chain with validation
│   └── index.js              # Blockchain exports
├── lib/blockchain/
│   ├── artifact-minting-service.ts    # Comprehensive minting workflow
│   ├── validation-service.ts          # Chain validation and integrity
│   └── error-recovery-service.ts      # Error handling and recovery
├── contracts/
│   ├── EvidenceRegistry.sol          # Evidence tracking contract
│   └── PropertyToken.sol             # Property tokenization
└── test-blockchain-v2.js             # Comprehensive test suite
```

## Usage

### Basic Minting

```javascript
import { ChittyChainV2 } from './src/blockchain/ChittyChainV2.js';

const chain = new ChittyChainV2();

// Mint government document
const artifacts = [{
  id: 'DOC_001',
  contentHash: 'sha3_hash_here',
  statement: 'Property deed from County Recorder',
  weight: 0.95,
  tier: 'GOVERNMENT',
  type: 'DEED',
  caseId: 'CASE_123',
  authenticationMethod: 'DIGITAL_SEAL'
}];

const result = await chain.mintArtifacts(artifacts, 'user@example.com');
console.log(`Minted: ${result.minted.length} artifacts`);
console.log(`Block: ${result.block.hash}`);
```

### Validation

```javascript
import { BlockchainValidationService } from './lib/blockchain/validation-service.js';

const validator = new BlockchainValidationService(chain);
const validation = await validator.validateBlockchain();

console.log(`Valid: ${validation.valid}`);
console.log(`Errors: ${validation.errors.length}`);
console.log(`Warnings: ${validation.warnings.length}`);
```

### Recovery

```javascript
import { BlockchainRecoveryService } from './lib/blockchain/error-recovery-service.js';

const recovery = new BlockchainRecoveryService(chain);

// Create backup
const backupPath = await recovery.createBackup();

// Auto-recover from errors
const result = await recovery.autoRecover();
console.log(`Recovery: ${result.message}`);
```

### Query Artifacts

```javascript
// Query by case
const caseArtifacts = chain.queryArtifacts({
  caseId: 'CASE_123',
  minWeight: 0.8,
  tier: 'GOVERNMENT'
});

// Query by date range
const recentArtifacts = chain.queryArtifacts({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  type: 'DOCUMENT'
});
```

## Testing

Run the comprehensive test suite:

```bash
node test-blockchain-v2.js
```

The test suite covers:
- Basic blockchain operations
- Artifact minting process
- Tiered evidence validation
- Contradiction detection
- Blockchain validation
- Merkle proof verification
- Error recovery
- Performance testing
- Edge cases

## Performance

- **Mining**: ~50-200ms per block (difficulty 4)
- **Validation**: <1s for chains with 1000+ blocks
- **Query**: <100ms for complex queries
- **Recovery**: <5s for auto-recovery

## Security Features

1. **Immutability**: SHA3-256 hashing with Merkle trees
2. **Proof of Work**: Configurable difficulty mining
3. **Tier-based Access**: Evidence hierarchy enforcement
4. **Contradiction Prevention**: Automatic conflict detection
5. **Audit Trail**: Complete history with Merkle proofs

## Best Practices

1. **Regular Backups**: Enable auto-backup with 10+ retention
2. **Validation**: Run validation before critical operations
3. **Batch Minting**: Use batch operations for efficiency
4. **Error Handling**: Implement try-catch with recovery
5. **Monitoring**: Subscribe to chain events for real-time updates

## Events

The blockchain emits events for monitoring:

```javascript
chain.on('blockMined', (data) => {
  console.log(`New block: ${data.hash}`);
});

chain.on('artifactMinted', (data) => {
  console.log(`Artifact minted: ${data.artifactId}`);
});
```

## Integration with Notion

The system integrates with Notion for evidence management:

```javascript
import { ArtifactMintingService } from './lib/blockchain/artifact-minting-service.js';

const mintingService = new ArtifactMintingService();
const result = await mintingService.mintEvidence({
  evidenceId: 'notion_evidence_id',
  userId: 'user@example.com',
  forceOverride: false
});
```

## Troubleshooting

### Chain Corruption
```javascript
const recovery = new BlockchainRecoveryService(chain);
await recovery.autoRecover();
```

### Missing Blocks
```javascript
await recovery.recoverFromBackup();
```

### Invalid Artifacts
```javascript
const validation = await validator.validateBlockchain();
// Check validation.errors for specific issues
```

## Future Enhancements

1. **Multi-chain Support**: Cross-chain evidence sharing
2. **IPFS Integration**: Distributed evidence storage
3. **Zero-Knowledge Proofs**: Privacy-preserving validation
4. **Smart Contract Automation**: Automated legal workflows
5. **Mobile SDK**: iOS/Android evidence submission

## License

MIT License - See LICENSE file for details