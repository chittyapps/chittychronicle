# ChittyID Universal API Deployment

## Deployment URL: id.chitty.cc/get

### Universal ChittyID Endpoints

#### Entity Creation
POST /api/universal/create
- Creates ChittyIDs for people, places, things, events
- Generates entity-specific prefixes (CP/CL/CT/CE)
- Supports public/private visibility controls

#### Entity Search & Discovery
GET /api/universal/search?entity_type=person&name=John
- Cross-entity search capabilities
- Trust score filtering
- Public entity discovery

#### ChittyID Validation & Generation
POST /api/chittyid/generate-advanced
POST /api/chittyid/validate
- Advanced Mod-97 checksum validation
- Collision detection algorithms
- Real-time generation with transparency

#### Trust Score Calculation
POST /api/trust/calculate
- Herrmann Brain Dominance algorithm
- Transparent calculation parameters
- Progressive L0-L5 trust levels

#### Business Integration
POST /api/business/verify-chitty
- API key authentication
- Cross-entity verification support
- Detailed response analytics

#### System Analytics
GET /api/universal/stats
- Real-time universal system statistics
- Cross-entity trust distributions
- Traditional vs Universal ChittyID metrics

### Sample ChittyIDs Generated:
- CP-2025-VER-9417-Y (Person: John Doe, Trust L1)
- CL-2025-VER-2026-X (Place: Millennium Park, Trust L1)  
- CT-2025-VER-0042-Z (Thing: MacBook Pro 2024, Trust L0)
- CE-2025-VER-5762-F (Event: Tech Conference 2025, Trust L2)

### Database Functions Available:
- generate_person_chitty_id()
- generate_place_chitty_id()
- generate_thing_chitty_id()
- generate_event_chitty_id()
- validate_chitty_id_code(code)
- calculate_trust_score(params)
- process_verification_update(code, type, status, metadata)
- get_universal_chitty_stats()

Ready for deployment at id.chitty.cc/get
