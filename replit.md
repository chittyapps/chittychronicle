# ChittyChronicle - Legal Timeline Management Application

## Overview

ChittyChronicle is a specialized legal timeline management application designed for evidentiary tracking and litigation support. The application enables legal professionals to manage case timelines, track evidence, monitor deadlines, detect contradictions, and maintain proper chain of custody documentation. It provides a comprehensive solution for organizing and managing legal information with strict compliance requirements, including attorney-client privilege protection and audit trail maintenance.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**ChittyID Authentication Integration (August 19, 2025)**
- ✓ Created ChittyAuth service in `server/chittyAuth.ts` with full OIDC integration
- ✓ Updated schema to support ChittyID users with roles, permissions, and attestations  
- ✓ Added ChittyChain verification for cryptographic identity validation
- ✓ Implemented role-based and permission-based access control middleware
- ✓ Created React hook `useChittyAuth` for frontend authentication state
- 🔄 ChittyAuth temporarily disabled during development - needs ChittyID server endpoints
- ✅ Application runs successfully without authentication barriers

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

**ChittyID Authentication** integration provides secure user management:

- **OAuth Flow**: OpenID Connect with ChittyID as the identity provider for the Chitty ecosystem
- **ChittyAuth Service**: Handles authentication flows with signature verification via ChittyChain
- **Session Management**: PostgreSQL-backed sessions with configurable TTL
- **Passport.js**: Handles authentication middleware and user serialization
- **Authorization**: Role-based and permission-based access control
- **ChittyChain Integration**: Cryptographic verification of user identities and attestations

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