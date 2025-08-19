# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChittyTimeline is a legal timeline management application for evidentiary tracking and litigation support. Built with TypeScript/React frontend, Express backend, PostgreSQL database via Drizzle ORM, and Replit authentication.

## Development Commands

```bash
# Start development server (port 5000)
npm run dev

# Build for production
npm run build

# Start production server  
npm run start

# TypeScript type checking
npm run check

# Push database schema changes
npm run db:push
```

## Architecture

### Tech Stack
- **Frontend**: React 18, TypeScript, TanStack Query, React Hook Form, shadcn/ui components
- **Backend**: Express with TypeScript (tsx for dev, esbuild for prod)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth with PostgreSQL session storage
- **Styling**: Tailwind CSS with shadcn/ui components
- **Build**: Vite for client, esbuild for server

### Project Structure
- `/client` - React frontend
  - `/src/components/ui` - shadcn/ui component library
  - `/src/hooks` - Custom hooks (auth, toast, mobile detection)
  - `/src/pages` - Page components (home, timeline, landing)
  - `/src/lib` - Utilities and query client setup
- `/server` - Express backend
  - `index.ts` - Server entry with middleware setup
  - `routes.ts` - API route definitions
  - `storage.ts` - Database operations interface
  - `replitAuth.ts` - Replit OIDC authentication
  - `db.ts` - Drizzle database connection
  - `vite.ts` - Vite dev server integration
  - `ingestionService.ts` - Document ingestion handling
- `/shared` - Shared TypeScript code
  - `schema.ts` - Drizzle schema and Zod validation schemas

### API Routes
All routes prefixed with `/api/` require authentication:
- `/api/auth/user` - Get current user
- `/api/cases` - CRUD operations for cases
- `/api/timeline/entries` - Timeline entry CRUD with filtering
- `/api/timeline/entries/:id/sources` - Document source management
- `/api/timeline/analysis/contradictions` - Detect timeline conflicts
- `/api/timeline/analysis/deadlines` - Upcoming deadline tracking
- `/api/timeline/search` - Full-text search across entries

### Database Schema

Core tables:
- `users` - Replit Auth user accounts
- `sessions` - Express session storage
- `cases` - Legal case records with ChittyPM integration
- `timeline_entries` - Events/tasks with temporal data and ChittyID
- `timeline_sources` - Document attachments
- `timeline_contradictions` - Detected conflicts
- `data_ingestion_jobs` - Document processing queue
- `mcp_integrations` - MCP extension settings
- `chitty_id_users` - ChittyID user mapping
- `chitty_pm_projects` - ChittyPM project integration

Key features:
- Entry types: 'task' and 'event' with specific subtypes
- Confidence levels: high/medium/low/unverified
- Task status: pending/in_progress/completed/blocked
- Event status: occurred/upcoming/missed
- Soft deletion via deleted_at timestamp
- Relationship tracking via related_entries and dependencies arrays

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (required)
- `PORT` - Server port (defaults to 5000)
- `NODE_ENV` - development/production
- `SESSION_SECRET` - Express session secret (auto-generated in Replit)
- `REPLIT_DOMAINS` - Replit domain for auth (auto-set)
- `ISSUER_URL` - OIDC issuer (defaults to https://replit.com/oidc)

## Key Implementation Details

- Single port serves both API and client assets
- Authentication uses Replit OIDC with Passport.js
- Session storage in PostgreSQL via connect-pg-simple
- File uploads handled via Google Cloud Storage integration
- ChittyID generated for each timeline entry for external system integration
- Path aliases: `@/` → client/src, `@shared/` → shared, `@assets/` → attached_assets
- Vite HMR in development, static serving in production
- Request logging for API calls with response truncation