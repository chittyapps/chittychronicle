# replit.md

## Overview

This repository contains ChittyTrust, a revolutionary 6-dimensional trust scoring system that evaluates entities (people, organizations, AI agents) based on verifiable actions and outcomes. The system provides a Flask web application that demonstrates three different personas and their trust scores across multiple dimensions and output metrics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modular architecture with clear separation between the trust engine core, web interface, and demonstration data:

### Frontend Architecture
- **Flask web application** serving as the main interface
- **Bootstrap 5 + Chart.js** for responsive UI and data visualization
- **Single-page application** with dynamic persona selection and trust score visualization
- **Feather icons** for consistent iconography

### Backend Architecture
- **Flask REST API** providing trust calculation endpoints
- **Modular trust engine** with pluggable dimension calculators
- **Asynchronous trust calculations** using asyncio for complex scoring algorithms
- **Pydantic models** for data validation and serialization

## Key Components

### Trust Engine Core (`src/chitty_trust/`)
- **core.py**: Main TrustEngine class and calculate_trust() convenience function
- **dimensions.py**: Six trust dimension calculators (Source, Temporal, Channel, Outcome, Network, Justice)
- **models.py**: Pydantic models for TrustEntity, TrustEvent, Credential, Connection
- **scores.py**: Four output score calculators (People's, Legal, State, Chitty Score™)

### Web Application
- **app.py**: Flask application with trust calculation endpoints
- **main.py**: Application entry point
- **templates/index.html**: Single-page dashboard interface
- **static/**: CSS and JavaScript for frontend functionality

### Demo Data
- **demo_data.py**: Three demonstration personas (Alice Community, Bob Business, Charlie Changed) with rich event histories

## Data Flow

1. **Persona Selection**: User selects from three predefined personas in the web interface
2. **Trust Calculation Request**: Frontend makes API call to `/api/trust/<persona_id>`
3. **Data Retrieval**: Demo data system provides entity and events for the selected persona
4. **6D Trust Analysis**: Trust engine calculates scores across six dimensions:
   - Source (Who): Identity verification and credentials
   - Temporal (When): Time-based behavioral consistency
   - Channel (How): Communication channel trust levels
   - Outcome (Results): Track record of positive/negative outcomes
   - Network (Connections): Quality of network connections
   - Justice (Impact): Alignment with justice principles
5. **Output Score Generation**: Four distinct scores calculated for different stakeholders:
   - People's Score: Community impact emphasis
   - Legal Score: Technical compliance emphasis
   - State Score: Authority approval emphasis
   - Chitty Score™: Justice + outcomes focus
6. **Visualization**: Results displayed via radar charts and detailed breakdowns

## External Dependencies

### Python Packages
- **Flask**: Web framework for API and serving
- **Pydantic**: Data validation and serialization
- **NumPy**: Numerical calculations for trust algorithms
- **asyncio**: Asynchronous trust calculation processing

### Frontend Libraries
- **Bootstrap 5**: Responsive UI framework
- **Chart.js**: Interactive data visualization
- **Feather Icons**: Consistent iconography
- **Custom CSS**: ChittyTrust brand styling with dark theme and dynamic spark system

### Development Tools
- **Poetry**: Dependency management (preferred)
- **pytest**: Testing framework with coverage reporting
- **Rich**: Enhanced console output for demos

## Deployment Strategy

### Development Environment
- **Flask development server** with debug mode enabled
- **Hot reload** for rapid development iteration
- **Environment variables** for configuration (SESSION_SECRET)

### Production Considerations
- **WSGI-compatible** Flask application ready for production deployment
- **Static file serving** through Flask (can be moved to CDN/nginx)
- **Environment-based configuration** for secrets and database connections
- **Async-ready architecture** for scaling trust calculations

### Key Architectural Decisions

1. **Modular Trust Dimensions**: Each trust dimension is implemented as a separate class, allowing for easy extension and modification of scoring algorithms.

2. **Multiple Output Scores**: Rather than a single trust score, the system provides four different scores optimized for different stakeholders, recognizing that trust is contextual.

3. **Async Trust Calculations**: Trust scoring is implemented asynchronously to handle complex calculations and potential future database operations without blocking the web interface.

4. **Rich Demo Data**: Three detailed personas with comprehensive event histories demonstrate the full capabilities of the trust engine across different user types.

5. **Frontend-First Visualization**: The web interface prioritizes clear visualization of multi-dimensional trust data through radar charts and detailed breakdowns.

6. **Pydantic Data Validation**: Strong typing and validation ensure data integrity throughout the trust calculation pipeline.

7. **Dynamic Spark Design System**: Comprehensive visual language using shield-spark combinations to communicate trust levels, verification states, and brand identity:
   - **Lightning Spark Element**: Angular, energetic spark based on brand guidelines with gradient colors and CSS clip-path for authentic lightning shape
   - **Trust Level Mapping**: L0-L4 levels with distinct spark colors, animations, and intensities
   - **Verification States**: Active, pending, and failed states with appropriate visual feedback
   - **Position Variations**: Spark-over (top-right), spark-inside (center), and spark-emanating (multiple sparks) for different contexts
   - **Brand Integration**: Primary logo using dynamic spark-shield combination with hover effects and responsive design

The system is designed to be both a working demonstration of 6D trust scoring and a foundation for production trust evaluation systems.

## Recent Changes

### ChittyBeacon App Tracking Integration (August 6, 2025)
- **Complete ChittyBeacon integration**: Added Python implementation of ChittyBeacon app tracking system from GitHub repository
- **Auto-detection capabilities**: Platform detection (Replit, GitHub, Vercel, etc.), ChittyOS component detection, Claude Code detection
- **Event tracking**: Startup/shutdown events, periodic heartbeats (5-minute intervals), custom API event tracking
- **Privacy-focused design**: Only tracks app identity, platform info, and system details - no personal data or secrets
- **ChittyOS monitoring**: Integrated with ChittyOS ecosystem tracking via https://beacon.chitty.cc endpoint
- **API endpoints**:
  - `/api/chitty-beacon` - Status and configuration information
  - `/api/chitty-beacon/test` - Test custom event tracking
  - Automatic beacon events on all ChittyOS API access
- **Configuration support**: Environment variables for endpoint, interval, enable/disable, and verbose mode
- **Cross-platform support**: Works on Replit, GitHub Actions, Vercel, Netlify, Heroku, AWS, GCP, Azure

### ChittyChain Integrated Workflow System (August 5, 2025)
- **Complete workflow integration**: Implemented end-to-end ChittyID → ChittyTrust → ChittyVerify → ChittyChain workflow pipeline
- **Evidence Ledger as unverified database**: Evidence Ledger serves as unverified/unminted database of evidence before workflow processing
- **ChittyID first**: Identity verification and user onboarding as entry point to trust ecosystem
- **ChittyChain last**: Blockchain immutability as final step for verified trust records with cryptographic finality
- **Workflow architecture**:
  - ChittyID: Identity verification and credential establishment (first)
  - ChittyTrust: 6D trust score calculation from verified data  
  - ChittyVerify: Data integrity validation (just before ChittyChain)
  - ChittyChain: Immutable blockchain recording for audit trails (last)
- **Evidence processing pipeline**:
  - Evidence Ledger: Unverified/unminted evidence collection
  - Workflow processing: Verification and validation through pipeline
  - Blockchain anchoring: Final immutable recording on ChittyChain
- **Enterprise capabilities**:
  - Database-driven trust calculations using real verification records
  - Multi-layered verification with integrity checks
  - Automated blockchain anchoring for compliance
  - Integration snippets for team collaboration
- **API endpoints**: 
  - `/api/chitty-workflow/execute/<user_id>` - Complete workflow execution
  - `/api/chitty-workflow/batch-process` - Batch user processing
  - `/api/evidence-ledger/integration-snippets` - Team collaboration docs

The system provides production-ready trust verification workflow where Evidence Ledger serves as the unverified database, ChittyID provides entry verification, and ChittyChain delivers final blockchain immutability.

### ChittyID Verification Marketplace Implementation (July 31, 2025)
- **Complete marketplace system**: Implemented full verification request marketplace with PostgreSQL database
- **Clerk-based authentication**: Set up authentication framework ready for Clerk integration
- **Historical trust tracking**: Added comprehensive trust history tracking across all 6 dimensions with 30-day trend analysis
- **Advanced visualizations**: Created interactive trust history charts showing composite scores and Chitty Score™ trends
- **Database architecture**: 
  - User management with ChittyID integration
  - Verification request lifecycle (create, claim, complete)
  - Trust history recording with dimensional breakdown
  - Verifier profiles and marketplace metrics
  - ChittyCoin transaction system for rewards
- **Live marketplace features**:
  - Real-time verification request listings
  - Priority-based filtering and search
  - Trust level-based verifier matching
  - Reward system integration
  - User dashboard with personal metrics
- **Sample data system**: Auto-populated with realistic demonstration data including users, requests, and 30-day trust histories