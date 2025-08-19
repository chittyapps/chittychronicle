# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChittyTimeline is a legal timeline management application for evidentiary tracking and litigation support. It's built with a TypeScript/React frontend, Express backend, PostgreSQL database (via Drizzle ORM), and uses Replit's authentication system.

## Development Commands

```bash
# Start development server (runs on port 5000 by default)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run TypeScript type checking
npm run check

# Push database schema changes
npm run db:push
```

## Architecture

### Tech Stack
- **Frontend**: React 18 with TypeScript, TanStack Query, React Hook Form, shadcn/ui components
- **Backend**: Express server with TypeScript (tsx for dev, esbuild for prod)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth integration with session management
- **Styling**: Tailwind CSS with custom shadcn/ui components

### Key Directories
- `/client` - React frontend application
  - `/src/components/ui` - shadcn/ui components library
  - `/src/hooks` - Custom React hooks including auth
  - `/src/pages` - Page components
- `/server` - Express backend
  - `index.ts` - Server entry point
  - `routes.ts` - API route definitions
  - `storage.ts` - Database operations layer
  - `replitAuth.ts` - Replit authentication setup
  - `db.ts` - Database connection
- `/shared` - Shared code between frontend and backend
  - `schema.ts` - Drizzle schema definitions and Zod validation schemas

### API Structure
All API routes are prefixed with `/api/` and require authentication:
- `/api/auth/*` - Authentication endpoints
- `/api/cases/*` - Case management
- `/api/timeline/entries/*` - Timeline entry CRUD operations
- `/api/timeline/analysis/*` - Analysis endpoints (contradictions, deadlines)
- `/api/timeline/search` - Search functionality

### Database Schema
The application uses PostgreSQL with the following core tables:
- `users` - User accounts from Replit Auth
- `cases` - Legal cases
- `timeline_entries` - Events and tasks with temporal data
- `timeline_sources` - Document sources linked to entries
- `timeline_contradictions` - Detected conflicts between entries

Timeline entries support:
- Two types: 'task' and 'event' with specific subtypes
- Confidence levels for verification
- Status tracking for both events and tasks
- Relationship mapping via related_entries and dependencies arrays
- Soft deletion with deleted_at timestamp

### Environment Requirements
- `DATABASE_URL` - PostgreSQL connection string (required)
- `PORT` - Server port (defaults to 5000)
- `NODE_ENV` - Environment mode (development/production)

## Important Notes

- The application runs on a single port serving both API and client
- Authentication is handled via Replit Auth with session storage in PostgreSQL
- All timeline entries generate a unique `chittyId` for system integration
- The app supports file uploads via Google Cloud Storage integration
- Vite is used for development with HMR support
- Path aliases configured: `@/` for client/src, `@shared/` for shared code