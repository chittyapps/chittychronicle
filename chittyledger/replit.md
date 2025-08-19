# ChittyChain Evidence Ledger

## Overview

ChittyChain Evidence Ledger is a comprehensive legal evidence management system built with blockchain-inspired architecture. The application provides immutable evidence tracking, chain of custody management, and forensic analysis capabilities for legal proceedings. It combines a React frontend with an Express backend, utilizing PostgreSQL for data persistence and supporting evidence verification through a tiered authentication system.

## User Preferences

Preferred communication style: Simple, everyday language.
Design preference: Clean, sophisticated interfaces without excessive tactical elements. Prefers restrained professional design over complex animations and effects.
Color scheme: Dark themes with emerald green accents (inspired by ChittyTrust reference design).

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for build tooling
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with clean dark theme (slate backgrounds, emerald accents)
- **State Management**: TanStack Query for server state and data fetching
- **Routing**: Wouter for lightweight client-side routing
- **Design Philosophy**: Clean, sophisticated legal-tech interface inspired by ChittyTrust design - professional and restrained without excessive tactical elements

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **API Design**: RESTful endpoints for cases, evidence, facts, and custody tracking
- **Schema Validation**: Zod for runtime type validation and data transformation
- **Storage Pattern**: Repository pattern with in-memory storage (expandable to PostgreSQL)

### Database Design
- **Evidence Tiering System**: 8-tier evidence classification from SELF_AUTHENTICATING (1.0) to UNCORROBORATED_PERSON (0.4)
- **Atomic Facts**: Granular fact extraction from evidence documents with classification levels
- **Chain of Custody**: Immutable tracking of evidence handling and transfers
- **Contradiction Detection**: System for identifying and resolving conflicting evidence
- **Audit Trail**: Comprehensive logging of all system interactions

### Key Data Entities
1. **Master Evidence**: Central registry with content hashing, authentication methods, and blockchain status
2. **Atomic Facts**: Extracted assertions with credibility factors and case theory relationships  
3. **Cases**: Matter-level containers with rollup statistics and deadline tracking
4. **Users**: Role-based access with authentication and authorization
5. **Chain of Custody**: Tamper-proof evidence transfer log
6. **Contradictions**: Conflict resolution engine for opposing evidence

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, Vite, TanStack Query for modern frontend development
- **UI Framework**: Radix UI primitives with Shadcn/ui components for accessible design system
- **Backend Stack**: Express.js with TypeScript for API server functionality
- **Database Layer**: Drizzle ORM with PostgreSQL adapter, Neon serverless database hosting

### Development and Build Tools
- **TypeScript**: Type safety across frontend and backend with shared schema definitions
- **Tailwind CSS**: Utility-first styling with custom legal design tokens
- **PostCSS**: CSS processing with autoprefixer for browser compatibility
- **ESBuild**: Fast bundling for production builds

### Authentication and Security
- **Neon Database**: Serverless PostgreSQL for production data storage
- **Session Management**: Built-in session handling with secure evidence tracking
- **Encryption**: Content hashing with SHA-256 for evidence integrity verification

### Legal Technology Integration
- **ChittyOS Ecosystem**: Integration points for broader legal technology suite
- **MCP (Model Context Protocol)**: AI integration framework for evidence analysis
- **Blockchain Components**: Evidence minting and verification system with proof-of-work
- **6D Trust Revolution**: Implements Source, Time, Chain, Outcomes, Network, and Justice metrics for comprehensive evidence evaluation

## Recent Changes (January 2025)

### Design System Transformation
- **Date**: January 5, 2025
- **Change**: Complete design overhaul from complex tactical elements to clean, professional aesthetic
- **Inspiration**: ChittyTrust reference design with dark slate theme and emerald accents
- **User Feedback**: "ohh noice" - positive reception of simplified, sophisticated approach
- **Impact**: Improved usability and professional appearance while maintaining legal-tech credibility

### Core Concept Clarification
- **Date**: January 5, 2025
- **Change**: Corrected fundamental messaging about ChittyChain's role
- **User Feedback**: "Chitty chain doesn't measure, chitty chain is the ledger"
- **Implementation**: Updated hero section and messaging to emphasize ChittyChain as the immutable evidence ledger rather than a measurement system
- **Impact**: Clarified that ChittyChain IS the ledger that records evidence, not a system that measures evidence

### 6D Trust Integration with Blockchain Path
- **Date**: January 5, 2025
- **Change**: Integrated 6D Trust Revolution framework as the path to blockchain minting
- **User Feedback**: "I would putt he path to teh chain vs puttinte trust score 6d.. that's part o fteh path to the chain"
- **Implementation**: 
  - 6D Trust Revolution framework (Source, Time, Chain, Network, Outcomes, Justice) now determines blockchain minting eligibility
  - Each dimension has specific point values contributing to overall minting score
  - Must achieve 70%+ across all six dimensions to qualify for permanent blockchain preservation
  - Visual component shows detailed breakdown of each trust dimension
  - Unified system where 6D evaluation IS the path to the chain
- **Impact**: 6D Trust framework becomes the comprehensive evaluation system for blockchain permanence eligibility