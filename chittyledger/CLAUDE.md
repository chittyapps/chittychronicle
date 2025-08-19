# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChittyChain Evidence Ledger is a legal evidence management system with blockchain-inspired architecture for immutable evidence tracking and chain of custody management.

## Key Commands

### Development
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build both client and server for production
- `npm run start` - Run production server
- `npm run check` - TypeScript type checking
- `npm run db:push` - Push database schema changes with Drizzle Kit

### Testing & Linting
**Note:** No testing or linting tools are currently configured in this project.

## Architecture Overview

### Tech Stack
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + Shadcn/ui
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Neon serverless) - currently using in-memory storage
- **State Management**: TanStack Query for server state
- **Routing**: Wouter (client), Express (server)

### Project Structure
```
/
├── client/         # React frontend app
│   └── src/
│       ├── components/   # UI components (shadcn/ui + custom)
│       ├── pages/       # Route components
│       ├── hooks/       # Custom React hooks
│       └── lib/         # Utilities & API client
├── server/         # Express backend
│   ├── routes.ts   # API endpoints
│   └── storage.ts  # Data access layer (currently in-memory)
└── shared/         # Shared types & database schema
    └── schema.ts   # Drizzle ORM schema definitions
```

### Database Schema

The system uses a sophisticated legal evidence management schema with:
- **Master Evidence**: Central evidence registry with blockchain status
- **Atomic Facts**: Granular fact extraction with confidence scoring
- **Chain of Custody**: Immutable audit trail
- **Evidence Tiers**: 8-tier trust classification system (1.0 to 0.4)
- **Contradictions**: Automated conflict detection

### API Endpoints
- `/api/cases` - Case management
- `/api/evidence` - Evidence CRUD operations
- `/api/facts` - Atomic fact extraction
- `/api/contradictions` - Conflict management
- `/api/dashboard/stats` - Analytics data

## Development Notes

1. **Database**: Currently using in-memory storage (`MemStorage` class). To use PostgreSQL, configure environment variables and run migrations.

2. **Authentication**: Passport.js is installed but not implemented. Auth middleware is currently bypassed.

3. **Environment**: This is a Replit project with special Vite configuration for their environment.

4. **UI Components**: Uses Shadcn/ui component library. Components are in `client/src/components/ui/`.

5. **Type Safety**: Full TypeScript coverage with Zod validation for API requests/responses.