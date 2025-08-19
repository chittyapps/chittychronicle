# ChittyChronicle - Legal Timeline Management Application

## Overview

ChittyChronicle is a specialized legal timeline management application that serves as the primary evidence ingestion point for the Chitty ecosystem. While focused on timeline organization and case management, it functions as the gateway for feeding evidence and legal data into ChittyLedger, ChittyVerify, ChittyTrust, and the broader ChittyChain ecosystem. The application enables legal professionals to create timelines, upload evidence, and seamlessly route data through the verification and trust scoring pipeline while maintaining proper chain of custody and audit trails.

**Strategic Position**: ChittyChronicle is designed as a "lite version" timeline tool that introduces users to the Chitty ecosystem and drives adoption of ChittyID and ChittyOS through integrated workflows and upgrade prompts.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**ChittyID Authentication Integration (August 19, 2025)**
- ✓ Created ChittyAuth service in `server/chittyAuth.ts` with full OIDC integration
- ✓ Updated schema to support ChittyID users with roles, permissions, and attestations  
- ✓ Added ChittyChain verification for cryptographic identity validation
- ✓ Implemented role-based and permission-based access control middleware
- ✓ Created React hook `useChittyAuth` for frontend authentication state
- ✓ Clarified ChittyID as universal authentication system for people, places, things, and events
- ✓ Updated upgrade prompts and documentation to emphasize universal entity authentication
- 🔄 ChittyAuth temporarily disabled during development - needs ChittyID server endpoints
- ✅ Application runs successfully without authentication barriers

**Complete UI/UX Redesign from Scratch (August 19, 2025)**
- ✓ Created entirely new modern design system with clean professional aesthetics
- ✓ Built ModernHome component with streamlined header and navigation
- ✓ Added integrated search and user controls in unified header design
- ✓ Designed dashboard-style stats cards with color-coded icons and smooth animations
- ✓ Improved case cards with hover effects, better typography, and modern shadows
- ✓ Created Chitty Ecosystem hub page showing all 6 integrated applications
- ✓ Fixed dashboard integration issues and removed template dependencies
- ✓ Updated color scheme to professional blue/gray palette with soft shadows
- ✓ Implemented comprehensive Chitty ecosystem integration architecture
- ✓ Repositioned ChittyChronicle as primary evidence ingestion point for ecosystem
- ✓ Added ecosystem navigation and cross-app data flow documentation

## System Architecture

### Frontend Architecture

The client-side application is built using **React 18 with TypeScript** for type safety and modern development practices. The UI architecture leverages:

- **Component System**: Uses shadcn/ui components for consistent design patterns and accessibility
- **State Management**: TanStack Query for server state management and caching
- **Form Handling**: React Hook Form with Zod validation for robust form management
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **Routing**: Wouter for lightweight client-side routing

The application follows a component-based architecture with clear separation between UI components, business logic, and data fetching. Custom hooks encapsulate authentication logic and shared functionality.

### Backend Architecture

The server-side uses **Express.js with TypeScript** to provide a RESTful API. Key architectural decisions include:

- **Development Tooling**: tsx for development with hot reloading, esbuild for production builds
- **Request Processing**: Express middleware for JSON parsing, request logging, and error handling
- **API Design**: RESTful endpoints organized by resource (cases, timeline entries, sources)
- **Type Safety**: Shared TypeScript types between frontend and backend via the `/shared` directory

### Data Storage Architecture

**PostgreSQL** serves as the primary database with **Drizzle ORM** providing type-safe database operations:

- **Schema Definition**: Centralized schema definitions in `/shared/schema.ts` using Drizzle's schema builder
- **Connection Management**: Neon serverless PostgreSQL with connection pooling
- **Migrations**: Drizzle Kit for schema migrations and database management
- **Validation**: Zod schemas for runtime type validation of API requests

The database schema supports complex legal data structures including timeline entries, case metadata, source documents, and audit trails.

### Authentication System

**ChittyID Authentication** integration provides universal identification and secure user management:

- **Universal Identity**: ChittyID serves as the authentication system for people, places, things, and events across the entire Chitty ecosystem
- **OAuth Flow**: OpenID Connect with ChittyID as the identity provider for all Chitty applications
- **ChittyAuth Service**: Handles authentication flows with signature verification via ChittyChain
- **Session Management**: PostgreSQL-backed sessions with configurable TTL
- **Passport.js**: Handles authentication middleware and user serialization
- **Authorization**: Role-based and permission-based access control
- **ChittyChain Integration**: Cryptographic verification of user identities and attestations
- **Entity Management**: Supports identification and authentication for legal entities, evidence items, locations, and temporal events

### File Upload Architecture

The application supports document management through multiple upload providers:

- **Google Cloud Storage**: Primary storage for document attachments
- **Uppy Integration**: Modern file upload interface with drag-and-drop, progress tracking, and chunked uploads
- **Multiple Providers**: Configurable support for AWS S3 and other cloud storage solutions

## External Dependencies

### Cloud Services
- **Neon Database**: Serverless PostgreSQL hosting with automatic scaling
- **Google Cloud Storage**: Document and file attachment storage
- **ChittyID**: Universal identity system for Chitty ecosystem authentication
- **ChittyChain**: Blockchain-based verification system for identity attestations

### Core Framework Dependencies
- **React Ecosystem**: React 18, TanStack Query for data fetching, React Hook Form for forms
- **UI Framework**: Radix UI primitives with shadcn/ui component system
- **Backend Framework**: Express.js with TypeScript support
- **Database Layer**: Drizzle ORM with PostgreSQL driver

### Development and Build Tools
- **Vite**: Frontend build tool with HMR and optimized production builds
- **TypeScript**: Type safety across the entire application
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Drizzle Kit**: Database schema management and migration tools

### File Processing
- **Uppy**: File upload handling with multiple cloud provider support
- **Memoization**: Performance optimization for expensive operations