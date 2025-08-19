# ChittyID Platform

## Overview

ChittyID is a comprehensive universal identity verification and trust scoring platform deployed at **id.chitty.cc/get**. The system now implements proper ChittyID mothership integration with structured ID format `VV-G-LLL-SSSS-T-YM-C-X` and connects to the Identity Service for authentic ChittyID generation. **CRITICAL**: The system now requires the central mothership server to be online before creating any ChittyIDs, ensuring authentic ID generation rather than standalone fallback IDs. The system provides a foundational identity backbone that issues deterministic, privacy-preserving IDs for People, Places, Things, and Events while tracking behavioral patterns across time-scales. It serves as the core infrastructure for the ChittyOS ecosystem, enabling progressive trust building through sophisticated verification workflows and allowing businesses to integrate comprehensive identity verification services.

The platform implements an advanced Herrmann Brain Dominance trust scoring system (L0-L5) with algorithmic transparency, universal entity support with prefixes (CP/CL/CT/CE), PostgreSQL-based advanced functions, and comprehensive audit trails. The system supports both traditional ChittyIDs for people and universal ChittyIDs for all entity types, with complete API integration for business partners.

## User Preferences

Preferred communication style: Simple, everyday language.
Clear algorithmic color system: ChittyID uses transparent Herrmann Brain Dominance colors with algorithmic rainbow cascading effects. Blue (Analytical), Orange (Practical), Red (Interpersonal), Yellow (Experimental) - completely avoiding green. The system implements clear hue-rotate algorithms that shift colors transparently based on trust levels.
Deployment preference: id.chitty.cc/get for universal ChittyID access and API endpoints.

## System Architecture

### Frontend Architecture
The client application is built with React 18 using Vite as the build tool. It implements a component-based architecture with shadcn/ui for consistent design components and Tailwind CSS for styling. The application uses wouter for lightweight routing and TanStack Query for state management and API communication. The frontend follows a modular structure with separate pages for landing, home dashboard, verification flows, and business management.

### Backend Architecture
The server is built with Express.js and TypeScript, following a RESTful API design. It implements Replit's OpenID Connect authentication system with session-based authentication using PostgreSQL session storage. The backend uses a layered architecture with separate modules for routes, storage, and authentication. The storage layer implements a comprehensive interface pattern for database operations, ensuring consistent data access patterns across the application.

### Database Design
The system uses PostgreSQL with Drizzle ORM for type-safe database operations. The schema implements a comprehensive identity verification system with tables for users, ChittyIDs, verifications, businesses, and verification requests. It includes proper foreign key relationships, enumerated types for status tracking, and indexing for performance. The database supports session storage for authentication and includes audit trail capabilities.

### Universal Identity Management System
ChittyID implements a comprehensive universal identity system supporting People, Places, Things, and Events with entity-specific prefixes using the structured format `VV-G-LLL-SSSS-T-YM-C-X`:
- CP-G-LLL-SSSS-T-YM-C-X (ChittyPerson for individuals)
- CL-G-LLL-SSSS-T-YM-C-X (ChittyLocation for places)
- CT-G-LLL-SSSS-T-YM-C-X (ChittyThing for objects/assets)
- CE-G-LLL-SSSS-T-YM-C-X (ChittyEvent for activities)

Where:
- VV = Vertical (CP/CL/CT/CE)
- G = Generation (time-based epoch)
- LLL = Location/Node identifier
- SSSS = Sequence (time + random)
- T = Type modifier
- YM = Year-Month encoding  
- C = Category
- X = Mod-97 checksum (2 digits)

The system uses advanced Mod-97 checksum validation with collision detection, PostgreSQL-based generation functions, and sophisticated trust scoring algorithms based on Herrmann Brain Dominance model. The platform features progressive verification workflows where entities advance through trust levels (L0-L5) with complete algorithmic transparency.

### Verification and Trust Scoring
The platform implements a multi-factor verification system supporting email, phone, ID cards, and address verification. Each verification type contributes specific trust points, and the system tracks verification status through enumerated states. The trust scoring algorithm considers multiple factors and maintains historical verification data for audit purposes.

### Advanced Business Integration Layer
The system provides comprehensive APIs deployed at id.chitty.cc/get for businesses to integrate universal identity verification. Key endpoints include:
- `/api/universal/create` - Create entities for people, places, things, events
- `/api/universal/search` - Search across all entity types
- `/api/business/verify-chitty` - Business verification with API keys
- `/api/trust/calculate` - Transparent trust score calculation
- `/api/system/stats` - Real-time universal system statistics

Businesses can register, receive API keys, set trust thresholds, and submit verification requests across all entity types. The platform tracks verification requests with detailed analytics and cross-entity relationship mapping.

## External Dependencies

### Database Infrastructure
- **Neon Database**: PostgreSQL-compatible serverless database for data persistence
- **Drizzle ORM**: Type-safe database operations and schema management
- **connect-pg-simple**: PostgreSQL session store for authentication

### Authentication Services
- **Replit OpenID Connect**: Primary authentication provider
- **Passport.js**: Authentication middleware with OpenID Connect strategy
- **Express Session**: Session management with PostgreSQL backing

### Frontend Libraries
- **React 18**: Core frontend framework with modern hooks and concurrent features
- **Vite**: Build tool and development server with hot module replacement
- **TanStack Query**: Data fetching, caching, and synchronization
- **wouter**: Lightweight client-side routing
- **Tailwind CSS**: Utility-first CSS framework for styling

### UI Component System
- **shadcn/ui**: Comprehensive component library built on Radix UI primitives
- **Radix UI**: Unstyled, accessible UI primitives for complex components
- **Lucide React**: Icon library with consistent design language
- **class-variance-authority**: Type-safe component variant management

### Development and Build Tools
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing with Tailwind CSS integration
- **date-fns**: Date manipulation and formatting utilities

### Validation and Schema Management
- **Zod**: Runtime type validation and schema definition
- **drizzle-zod**: Integration between Drizzle ORM and Zod schemas
- **React Hook Form**: Form state management with validation integration