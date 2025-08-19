# ChittyChain Project Structure

This document outlines the complete structure of the ChittyChain repository and explains the purpose of each directory and file.

## Root Directory

```
ChittyChain/
├── README.md                    # Main project documentation
├── CONTRIBUTING.md              # Contribution guidelines
├── PROJECT_STRUCTURE.md         # This file
├── BLOCKCHAIN-V2-README.md      # Blockchain v2 implementation details
├── package.json                 # Node.js dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── deploy.sh                   # Deployment script
└── [additional files...]
```

## Core Application Structure

### `/src/` - Core Blockchain Implementation
The heart of ChittyChain's blockchain technology.

```
src/
├── index.js                    # Main entry point
├── blockchain/
│   ├── ChittyBlock.js         # Block structure and validation
│   ├── ChittyBlockV2.js       # Enhanced block with metadata
│   ├── ChittyChain.js         # Main blockchain class
│   ├── ChittyChainV2.js       # V2 with advanced features
│   ├── SmartContracts.js      # Contract execution engine
│   └── index.js               # Blockchain module exports
└── core/
    ├── AuthenticationGateway.js # Access control system
    ├── EvidenceIntake.js       # Evidence ingestion service
    └── ForensicAnalysis.js     # Chain analysis tools
```

### `/lib/` - TypeScript Services Layer
Modern TypeScript services for blockchain operations.

```
lib/
├── ai.ts                       # AI integration utilities
├── notion.ts                   # Notion API client
├── blockchain/
│   ├── chittychain.ts         # TypeScript blockchain interface
│   ├── oracle.ts              # External data integration
│   ├── validation-service.ts  # Transaction validation
│   ├── artifact-minting-service.ts # NFT minting service
│   └── error-recovery-service.ts   # Error handling
├── evidence-ledger/
│   ├── api/
│   │   ├── blockchain-service.ts      # Blockchain API
│   │   ├── contradiction-service.ts   # Conflict detection
│   │   ├── evidence-service.ts        # Evidence management
│   │   ├── facts-service.ts           # Fact extraction
│   │   └── notion-client.ts           # Notion integration
│   └── schemas/
│       ├── formulas.ts                # Legal formulas
│       └── types.ts                   # Type definitions
├── property/
│   ├── title-ingestion.ts            # Property title processing
│   └── divorce-workflow.ts           # Property division logic
├── security/
│   └── secrets-manager.ts            # Key management
└── mcp/
    ├── connection-adapter.ts          # MCP protocol adapter
    └── training-framework.ts          # AI training framework
```

### `/contracts/` - Smart Contracts
Solidity smart contracts for blockchain operations.

```
contracts/
├── EvidenceRegistry.sol        # Immutable evidence storage
├── PropertyEscrow.sol         # Automated property transfers
└── PropertyToken.sol          # ERC-721 property tokens
```

### `/app/` - Next.js Application
Frontend web application built with Next.js.

```
app/
├── layout.tsx                 # Root layout component
├── page.tsx                   # Home page
├── globals.css               # Global styles
├── error.tsx                 # Error page
├── not-found.tsx            # 404 page
├── ai-assistant/
│   └── page.tsx              # AI assistant interface
├── cases/
│   ├── page.tsx              # Cases list
│   └── new/
│       └── page.tsx          # New case form
├── search/
│   └── page.tsx              # Search interface
└── api/
    ├── ai/
    │   └── route.ts          # AI API endpoint
    ├── cases/
    │   └── route.ts          # Cases API
    ├── evidence/
    │   ├── upload/
    │   │   └── route.ts      # Evidence upload
    │   ├── mint/
    │   │   └── route.ts      # Evidence minting
    │   ├── verify/
    │   │   └── route.ts      # Evidence verification
    │   └── extract-facts/
    │       └── route.ts      # Fact extraction
    ├── property/
    │   ├── ingest/
    │   │   └── route.ts      # Property ingestion
    │   └── divorce/
    │       └── route.ts      # Divorce workflow
    └── webhooks/
        └── notion/
            └── route.ts      # Notion webhooks
```

## Configuration Files

### Build & Development
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `postcss.config.js` - PostCSS configuration
- `middleware.ts` - Next.js middleware

### Testing
- `test-blockchain.js` - Basic blockchain tests
- `test-blockchain-v2.js` - V2 blockchain tests
- `test-blockchain-core.js` - Core functionality tests
- `stress-test.js` - Performance testing

### Test Data
```
test-documents/
├── callidus-test-set.md       # Test legal documents
├── mixed-evidence-test.md     # Mixed evidence scenarios
└── petition-test.txt          # Sample petition
```

## Documentation

```
docs/
├── MCP-TRAINING-GUIDE.md      # MCP integration guide
└── NOTION-SETUP-GUIDE.md      # Notion setup instructions
```

## Key Features by Directory

### Blockchain Core (`/src/blockchain/`)
- **ChittyChain**: Main blockchain implementation
- **ChittyBlock**: Block structure and validation
- **SmartContracts**: Contract execution engine
- **Consensus**: Proof-of-stake validation
- **Mining**: Block creation and validation

### Services Layer (`/lib/`)
- **AI Integration**: OpenAI and Anthropic API clients
- **Evidence Management**: Document hashing and storage
- **Property Services**: Real estate tokenization
- **Security**: Authentication and encryption
- **Oracle Services**: External data integration

### Smart Contracts (`/contracts/`)
- **EvidenceRegistry**: Immutable evidence storage
- **PropertyToken**: ERC-721 property tokens
- **PropertyEscrow**: Automated transfers
- **Access Control**: Role-based permissions

### Web Application (`/app/`)
- **Case Management**: Legal case tracking
- **Evidence Upload**: Document ingestion
- **AI Assistant**: Legal analysis
- **Property Management**: Real estate operations
- **Search**: Full-text search capabilities

## Development Workflow

1. **Core Development**: Start with `/src/` for blockchain features
2. **Service Layer**: Add TypeScript services in `/lib/`
3. **Smart Contracts**: Deploy contracts from `/contracts/`
4. **Frontend**: Build UI in `/app/`
5. **Testing**: Use test files in root directory
6. **Documentation**: Update `/docs/` and README files

## Deployment Structure

- **Development**: Local Next.js server
- **Staging**: Vercel deployment
- **Production**: Cloudflare Pages + Workers

## Integration Points

### External Systems
- **Notion**: Case and document management
- **OpenAI/Anthropic**: AI-powered analysis
- **Clerk**: User authentication
- **Ethereum**: Smart contract deployment
- **IPFS**: Decentralized storage

### Internal Systems
- **ChittyFinance**: Financial transaction integration
- **ChittyLegal**: Legal document processing
- **ChittyAssets**: Asset tokenization

## Security Architecture

- **Authentication**: Clerk-based user management
- **Authorization**: Role-based access control
- **Encryption**: End-to-end evidence encryption
- **Key Management**: 1Password integration
- **Audit Trail**: Immutable blockchain records

## Performance Considerations

- **Blockchain**: Optimized for enterprise use
- **Smart Contracts**: Gas-efficient operations
- **Frontend**: React optimization with Next.js
- **Database**: Efficient querying with indexing
- **Caching**: Redis for frequently accessed data

This structure provides a comprehensive foundation for blockchain-enabled legal and property management operations while maintaining separation of concerns and scalability.