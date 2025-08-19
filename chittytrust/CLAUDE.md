# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the Application
- `python main.py` - Start Flask development server on port 5000
- `gunicorn --bind 0.0.0.0:5000 main:app` - Production server (used by Replit)
- `gunicorn --bind 0.0.0.0:5000 --reuse-port --reload main:app` - Development with auto-reload

### Database Management
- Database is PostgreSQL with SQLAlchemy ORM
- Models auto-create on first run via `db.create_all()`
- Sample data initializes automatically if no users exist

### Frontend Assets
- Static files in `/static/` directory (CSS, JS, examples)
- Templates in `/templates/` directory (Jinja2)
- Bootstrap 5 + Chart.js for UI components

## Core Architecture

### ChittyTrust 6D Trust Engine
The application implements a sophisticated trust scoring system with 6 dimensions:

**Trust Dimensions:**
- Source Trust (15% weight) - Identity verification and credentials
- Temporal Trust (10% weight) - Historical consistency and longevity
- Channel Trust (15% weight) - Communication channel reliability
- Outcome Trust (20% weight) - Track record of positive outcomes
- Network Trust (15% weight) - Quality of network connections
- Justice Trust (25% weight) - Alignment with justice principles

**Output Scores:**
- People Score - Interpersonal trust assessment
- Legal Score - Legal system alignment
- State Score - Institutional trust level
- ChittyScore - Overall ChittyOS trust rating

### Application Structure

**Core Flask App (`app.py`):**
- Routes for trust calculation API (`/api/trust/<persona_id>`)
- Marketplace endpoints (`/api/marketplace/*`)
- User profile and authentication routes
- Analytics and insights generation

**Trust Engine (`src/chitty_trust/`):**
- `core.py` - Main TrustEngine class and calculation logic
- `dimensions.py` - Individual dimension calculation algorithms
- `models.py` - TrustEntity and TrustEvent data models
- `scores.py` - Output score calculators (People, Legal, State, Chitty)
- `analytics.py` - Trust insights and pattern detection
- `visualization.py` - Chart and visualization generation

**Database Models (`models.py`):**
- User - Clerk-authenticated users with ChittyID
- VerificationRequest - Marketplace verification requests
- TrustHistory - Historical trust score tracking
- VerifierProfile - Verifier marketplace profiles
- ChittyCoin - Reward system transactions

**Marketplace (`marketplace.py`):**
- MarketplaceService - Request creation and claiming
- TrustHistoryService - Historical tracking and trends
- VerifierService - Verifier profile management

**Authentication (`auth.py`):**
- Clerk-based authentication system
- JWT token verification (simplified for development)
- User creation and session management

### Key Features

**Trust Calculation Flow:**
1. Persona data retrieved via `get_persona_data(persona_id)`
2. Async trust calculation using 6D algorithm
3. Dimension scores calculated individually
4. Output scores derived from dimension combinations
5. Confidence and explanation generated
6. Results cached and returned as JSON

**Verification Marketplace:**
- Users submit verification requests with rewards
- Verifiers can claim and complete requests
- Trust scores updated based on verification outcomes
- ChittyCoin reward system for completed verifications

**Demo Personas:**
- `alice` - High-trust community leader
- `bob` - Mixed business history
- `charlie` - "Shitty to Chitty" transformation story

## Development Notes

### Async Operations
All trust calculations use async/await pattern. Flask routes handle this with:
```python
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)
result = loop.run_until_complete(calculate_trust(entity, events))
loop.close()
```

### Trust Level Mapping
Composite scores map to ChittyID levels:
- L4 (90+): Institutional
- L3 (75+): Professional  
- L2 (50+): Enhanced
- L1 (25+): Basic
- L0 (0+): Anonymous

### Database Configuration
- Uses PostgreSQL via DATABASE_URL environment variable
- Connection pooling with 300s recycle time
- Auto-ping for connection health
- Sample data initialization on empty database

### Security Considerations
- Clerk authentication for production
- JWT verification simplified for development
- Database models include proper relationships and constraints
- Trust calculations include confidence intervals and validation