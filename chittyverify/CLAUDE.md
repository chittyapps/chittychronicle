# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot reload (Vite frontend + Express backend)
- `npm run build` - Build for production (compiles TypeScript and bundles with Vite/esbuild)
- `npm run start` - Run production server

### Type Checking & Validation
- `npm run check` - Run TypeScript type checking across entire codebase

### Database Operations
- `npm run db:push` - Push schema changes to PostgreSQL database (Drizzle ORM)

### Testing
- `node test-core-functionality.js` - Test core blockchain functionality
- `node test-live-system.js` - Test live system integration

## Architecture Overview

This is the **ChittyChain Evidence Ledger** - a legal evidence verification system combining blockchain immutability with AI analysis. It implements a 7-table authentic schema for court-admissible evidence management.

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Radix UI
- **Backend**: Express.js + TypeScript (ESM mode)
- **Database**: PostgreSQL with Drizzle ORM
- **Blockchain**: Custom ChittyChain V2 with Ethereum integration
- **State Management**: TanStack React Query
- **Routing**: Wouter (lightweight client-side routing)

### Key Architectural Patterns

1. **Database Schema** (`/db/schema.ts`):
   - 7 interconnected tables: users, cases, masterEvidence, atomicFacts, chainOfCustodyLog, contradictionTracking, auditTrail
   - Each user gets their own PostgreSQL instance (data ownership model)
   - Drizzle ORM with Zod validation for type safety

2. **Frontend Structure** (`/client/src/`):
   - Components organized by feature domain (blockchain/, evidence/, trust/, ui/)
   - Pages use React Query for server state management
   - Blockchain services in `/client/src/lib/blockchain/` handle minting operations
   - Trust scoring widgets implement 6D ChittyTrust system

3. **Backend API** (`/server/`):
   - RESTful endpoints in `/server/routes.ts`
   - Storage abstraction in `/server/storage.ts`
   - Session-based authentication with Passport.js
   - Vite integration for development/production serving

4. **Blockchain Integration** (`/client/src/lib/blockchain/`):
   - ChittyChain V2 implementation with artifact minting
   - Smart contracts for evidence registry
   - Consent layer requiring user approval for minting
   - Validation service with multi-level integrity checks

### Critical Implementation Details

1. **Evidence Processing Pipeline**:
   - Upload → Validation → AI Analysis → Trust Scoring → Optional Blockchain Minting
   - Each step tracked in audit trail
   - Chain of custody maintained throughout

2. **Trust Scoring System** (6 dimensions):
   - Source, Time, Channel, Outcomes, Network, Justice scores
   - Calculated for both users and evidence
   - Influences evidence weight and credibility

3. **API Endpoint Pattern**:
   ```
   /api/cases - Case management
   /api/cases/:caseId/evidence - Evidence within cases
   /api/evidence/:id/analyze - Trigger AI analysis
   /api/evidence/:id/mint - Blockchain minting
   /api/evidence/:evidenceId/facts - Atomic facts
   ```

4. **Environment Variables Required**:
   - `DATABASE_URL` - PostgreSQL connection string
   - Session secret and other auth configs
   - Blockchain RPC endpoints for ChittyChain

### Development Guidelines

1. **Type Safety**: Always use TypeScript types and Zod schemas for validation
2. **Database Changes**: Update schema in `/db/schema.ts` and run `npm run db:push`
3. **Component Creation**: Follow existing patterns in `/client/src/components/`
4. **API Endpoints**: Add new routes in `/server/routes.ts` following RESTful conventions
5. **Blockchain Operations**: Use services in `/client/src/lib/blockchain/` for all chain interactions
6. **Error Handling**: Comprehensive error boundaries and try-catch blocks for blockchain operations

### File Locations for Common Tasks

- **Add new database table**: `/db/schema.ts`
- **Create new API endpoint**: `/server/routes.ts`
- **Add UI component**: `/client/src/components/ui/`
- **Implement new page**: `/client/src/pages/`
- **Blockchain service**: `/client/src/lib/blockchain/`
- **Trust scoring logic**: `/client/src/components/trust/`
- **Evidence processing**: `/client/src/components/evidence/`