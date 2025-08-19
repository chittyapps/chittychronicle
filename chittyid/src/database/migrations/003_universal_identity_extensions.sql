-- ChittyID Universal Identity Extensions
-- Extends base schema to support places, events, and evidence system

-- ========================================
-- PLACES EXTENSION
-- ========================================

-- Places table for physical and virtual locations
CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    place_type VARCHAR(50) NOT NULL CHECK (place_type IN ('physical', 'virtual', 'hybrid')),
    
    -- Location data
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    altitude DECIMAL(10, 2),
    polygon JSONB, -- GeoJSON polygon for complex boundaries
    timezone VARCHAR(50),
    
    -- Ownership
    owner_identity_id UUID REFERENCES identities(id),
    ownership_verified BOOLEAN DEFAULT false,
    ownership_documents JSONB DEFAULT '[]'::JSONB,
    
    -- Metadata
    capacity INTEGER,
    accessibility_features JSONB DEFAULT '{}'::JSONB,
    operating_hours JSONB DEFAULT '{}'::JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(identity_id)
);

-- Indexes for place queries
CREATE INDEX idx_places_type ON places(place_type);
CREATE INDEX idx_places_location ON places USING GIST (
    ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_places_owner ON places(owner_identity_id) WHERE owner_identity_id IS NOT NULL;

-- Place verification records
CREATE TABLE place_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN (
        'address_verification', 'business_registration', 'property_deed',
        'geolocation', 'photo_verification', 'site_inspection'
    )),
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES identities(id),
    evidence_ids UUID[] DEFAULT '{}',
    details JSONB DEFAULT '{}'::JSONB,
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(place_id, verification_type)
);

-- ========================================
-- EVENTS EXTENSION
-- ========================================

-- Events table for trackable occurrences
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    
    -- Temporal data
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTERVAL GENERATED ALWAYS AS (end_time - start_time) STORED,
    
    -- Location
    location_place_id UUID REFERENCES places(id),
    location_description TEXT,
    
    -- Participants
    organizer_identity_id UUID REFERENCES identities(id),
    expected_participants INTEGER,
    
    -- Event-specific data
    event_data JSONB DEFAULT '{}'::JSONB,
    
    -- Verification
    confidence_score DECIMAL(3,2) DEFAULT 0.00 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(identity_id)
);

-- Indexes for event queries
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_time ON events(start_time, end_time);
CREATE INDEX idx_events_location ON events(location_place_id) WHERE location_place_id IS NOT NULL;
CREATE INDEX idx_events_organizer ON events(organizer_identity_id) WHERE organizer_identity_id IS NOT NULL;

-- Event participants (many-to-many)
CREATE TABLE event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'attendee',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    attestation JSONB, -- Participant's attestation of the event
    UNIQUE(event_id, participant_identity_id)
);

CREATE INDEX idx_event_participants_event ON event_participants(event_id);
CREATE INDEX idx_event_participants_identity ON event_participants(participant_identity_id);

-- ========================================
-- EVIDENCE SYSTEM
-- ========================================

-- Master evidence table
CREATE TABLE evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chitty_id VARCHAR(255) NOT NULL UNIQUE,
    evidence_type VARCHAR(50) NOT NULL CHECK (evidence_type IN (
        'document', 'photo', 'video', 'audio', 'sensor_data', 
        'attestation', 'blockchain_anchor', 'system_log'
    )),
    
    -- Content and storage
    content_hash VARCHAR(64) NOT NULL, -- SHA-256 hash
    content_size BIGINT,
    mime_type VARCHAR(100),
    storage_uri TEXT, -- IPFS CID or other storage reference
    encryption_key_id VARCHAR(255), -- Reference to KMS key if encrypted
    
    -- Provenance
    created_by UUID NOT NULL REFERENCES identities(id),
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    captured_location_id UUID REFERENCES places(id),
    capture_device JSONB, -- Device info that captured the evidence
    
    -- Chain of custody
    custody_chain JSONB DEFAULT '[]'::JSONB, -- Array of custody transfers
    tamper_seal VARCHAR(64), -- Hash of hash + metadata
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    tags TEXT[] DEFAULT '{}',
    
    -- Immutability tracking
    freeze_status VARCHAR(20) DEFAULT 'mutable' CHECK (freeze_status IN (
        'mutable', 'pending_freeze', 'frozen_offchain', 'minting', 'minted_onchain'
    )),
    freeze_requested_at TIMESTAMP WITH TIME ZONE,
    frozen_at TIMESTAMP WITH TIME ZONE,
    freeze_hash VARCHAR(64),
    
    -- Blockchain anchoring
    chain_tx_hash VARCHAR(66),
    chain_block_number BIGINT,
    chain_timestamp TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for evidence queries
CREATE INDEX idx_evidence_type ON evidence(evidence_type);
CREATE INDEX idx_evidence_creator ON evidence(created_by);
CREATE INDEX idx_evidence_freeze_status ON evidence(freeze_status);
CREATE INDEX idx_evidence_captured_at ON evidence(captured_at);
CREATE INDEX idx_evidence_tags ON evidence USING GIN(tags);

-- Atomic facts extracted from evidence
CREATE TABLE atomic_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
    fact_type VARCHAR(100) NOT NULL,
    subject_identity_id UUID REFERENCES identities(id),
    predicate VARCHAR(255) NOT NULL,
    object_value JSONB NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 1.00 CHECK (confidence >= 0 AND confidence <= 1),
    extracted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    extracted_by VARCHAR(255), -- System or AI that extracted the fact
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_atomic_facts_evidence ON atomic_facts(evidence_id);
CREATE INDEX idx_atomic_facts_subject ON atomic_facts(subject_identity_id);
CREATE INDEX idx_atomic_facts_type ON atomic_facts(fact_type);

-- ========================================
-- CLAIMS SYSTEM
-- ========================================

-- Claims composed from multiple evidence pieces
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chitty_id VARCHAR(255) NOT NULL UNIQUE,
    claim_type VARCHAR(100) NOT NULL,
    assertion TEXT NOT NULL,
    
    -- Claim author
    author_identity_id UUID NOT NULL REFERENCES identities(id),
    authored_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Validity scoring
    validity_status VARCHAR(20) DEFAULT 'pending' CHECK (validity_status IN (
        'pending', 'valid', 'partially_valid', 'disputed', 'invalidated'
    )),
    validity_score DECIMAL(3,2) DEFAULT 0.00 CHECK (validity_score >= 0 AND validity_score <= 1),
    
    -- Claim-specific data
    claim_data JSONB DEFAULT '{}'::JSONB,
    
    -- Immutability
    freeze_status VARCHAR(20) DEFAULT 'mutable' CHECK (freeze_status IN (
        'mutable', 'pending_freeze', 'frozen_offchain', 'minting', 'minted_onchain'
    )),
    frozen_at TIMESTAMP WITH TIME ZONE,
    freeze_hash VARCHAR(64),
    
    -- Blockchain anchoring
    chain_tx_hash VARCHAR(66),
    chain_block_number BIGINT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claims_type ON claims(claim_type);
CREATE INDEX idx_claims_author ON claims(author_identity_id);
CREATE INDEX idx_claims_validity ON claims(validity_status);
CREATE INDEX idx_claims_freeze_status ON claims(freeze_status);

-- Claim components (evidence supporting the claim)
CREATE TABLE claim_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    evidence_id UUID NOT NULL REFERENCES evidence(id),
    role VARCHAR(50) NOT NULL, -- 'supporting', 'contradicting', 'context'
    weight DECIMAL(3,2) DEFAULT 1.00 CHECK (weight >= -1 AND weight <= 1),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    added_by UUID REFERENCES identities(id),
    notes TEXT,
    UNIQUE(claim_id, evidence_id)
);

CREATE INDEX idx_claim_components_claim ON claim_components(claim_id);
CREATE INDEX idx_claim_components_evidence ON claim_components(evidence_id);

-- ========================================
-- RELATIONSHIPS
-- ========================================

-- Universal relationships between any entities
CREATE TABLE relationships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    to_identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
        -- Ownership
        'owns', 'manages', 'created',
        -- Location
        'located_at', 'occurred_at', 'resides_at',
        -- Participation
        'participated_in', 'witnessed', 'operated',
        -- Hierarchy
        'parent_of', 'member_of', 'component_of',
        -- Trust
        'trusts', 'verified_by', 'delegates_to'
    )),
    
    -- Temporal
    established_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Verification
    verified BOOLEAN DEFAULT false,
    verified_by UUID REFERENCES identities(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB,
    
    UNIQUE(from_identity_id, to_identity_id, relationship_type)
);

CREATE INDEX idx_relationships_from ON relationships(from_identity_id);
CREATE INDEX idx_relationships_to ON relationships(to_identity_id);
CREATE INDEX idx_relationships_type ON relationships(relationship_type);
CREATE INDEX idx_relationships_active ON relationships(from_identity_id, to_identity_id) 
    WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP;

-- ========================================
-- TRACKING SYSTEM
-- ========================================

-- Universal tracking events for all entities
CREATE TABLE tracking_events (
    id BIGSERIAL PRIMARY KEY,
    entity_identity_id UUID NOT NULL REFERENCES identities(id),
    action VARCHAR(100) NOT NULL,
    
    -- Context
    location_identity_id UUID REFERENCES identities(id),
    actor_identity_id UUID REFERENCES identities(id),
    
    -- Event data
    details JSONB DEFAULT '{}'::JSONB,
    confidence DECIMAL(3,2) DEFAULT 1.00 CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Timestamp
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Source
    source_type VARCHAR(50), -- 'manual', 'sensor', 'system', 'inference'
    source_id VARCHAR(255)
);

-- Partitioned by time for performance
CREATE INDEX idx_tracking_entity ON tracking_events(entity_identity_id, occurred_at DESC);
CREATE INDEX idx_tracking_location ON tracking_events(location_identity_id, occurred_at DESC) 
    WHERE location_identity_id IS NOT NULL;
CREATE INDEX idx_tracking_actor ON tracking_events(actor_identity_id, occurred_at DESC)
    WHERE actor_identity_id IS NOT NULL;
CREATE INDEX idx_tracking_time ON tracking_events(occurred_at DESC);

-- ========================================
-- VERIFICATION METHODS
-- ========================================

-- Extended verification methods for all entity types
CREATE TABLE verification_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL,
    
    -- Verification details
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    verified_by UUID REFERENCES identities(id),
    verification_data JSONB DEFAULT '{}'::JSONB,
    
    -- Strength and expiry
    strength INTEGER NOT NULL CHECK (strength BETWEEN 1 AND 5),
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Evidence
    evidence_ids UUID[] DEFAULT '{}',
    
    UNIQUE(identity_id, method_type)
);

CREATE INDEX idx_verification_methods_identity ON verification_methods(identity_id);
CREATE INDEX idx_verification_methods_type ON verification_methods(method_type);
CREATE INDEX idx_verification_methods_active ON verification_methods(identity_id, method_type)
    WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP;

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to calculate trust level based on verifications
CREATE OR REPLACE FUNCTION calculate_trust_level(p_identity_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_identity_type VARCHAR(50);
    v_max_strength INTEGER;
    v_trust_level INTEGER := 1;
BEGIN
    -- Get identity type
    SELECT type INTO v_identity_type 
    FROM identities 
    WHERE id = p_identity_id;
    
    -- Get maximum verification strength
    SELECT COALESCE(MAX(strength), 1) INTO v_max_strength
    FROM verification_methods
    WHERE identity_id = p_identity_id
    AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);
    
    -- Apply type-specific rules
    CASE v_identity_type
        WHEN 'user', 'org' THEN
            -- People need identity verification
            IF EXISTS (
                SELECT 1 FROM verification_methods 
                WHERE identity_id = p_identity_id 
                AND method_type = 'government_id'
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            ) THEN
                v_trust_level := GREATEST(v_trust_level, 4);
            END IF;
            
        WHEN 'service', 'mcp' THEN
            -- Services use cryptographic verification
            IF EXISTS (
                SELECT 1 FROM verification_methods 
                WHERE identity_id = p_identity_id 
                AND method_type IN ('cryptographic', 'code_signing')
                AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
            ) THEN
                v_trust_level := GREATEST(v_trust_level, 3);
            END IF;
            
        WHEN 'place' THEN
            -- Places need ownership verification
            IF EXISTS (
                SELECT 1 FROM place_verifications
                WHERE place_id IN (SELECT id FROM places WHERE identity_id = p_identity_id)
                AND verification_type = 'property_deed'
            ) THEN
                v_trust_level := GREATEST(v_trust_level, 4);
            END IF;
            
        WHEN 'event' THEN
            -- Events need witness verification
            DECLARE
                v_witness_count INTEGER;
            BEGIN
                SELECT COUNT(DISTINCT participant_identity_id) INTO v_witness_count
                FROM event_participants
                WHERE event_id IN (SELECT id FROM events WHERE identity_id = p_identity_id)
                AND attestation IS NOT NULL;
                
                IF v_witness_count >= 3 THEN
                    v_trust_level := GREATEST(v_trust_level, 3);
                END IF;
                IF v_witness_count >= 5 THEN
                    v_trust_level := GREATEST(v_trust_level, 4);
                END IF;
            END;
    END CASE;
    
    -- Return the higher of calculated level or max verification strength
    RETURN LEAST(GREATEST(v_trust_level, v_max_strength), 5);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update identity trust level
CREATE OR REPLACE FUNCTION update_identity_trust_level()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the trust level in a custom field (add to identities table if needed)
    UPDATE identities 
    SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{trust_level}',
        to_jsonb(calculate_trust_level(NEW.identity_id))
    )
    WHERE id = NEW.identity_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_trust_on_verification
AFTER INSERT OR UPDATE ON verification_methods
FOR EACH ROW EXECUTE FUNCTION update_identity_trust_level();

-- ========================================
-- MIGRATION HELPERS
-- ========================================

-- Add place type to existing identities
ALTER TABLE identities 
ADD CONSTRAINT check_identity_type_extended 
CHECK (type IN ('user', 'service', 'mcp', 'org', 'device', 'place', 'event', 'artifact'));

-- Function to generate ChittyID for evidence
CREATE OR REPLACE FUNCTION generate_evidence_chitty_id(
    p_tenant_name VARCHAR,
    p_evidence_type VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
    RETURN LOWER(p_tenant_name || '.evidence.' || p_evidence_type || '.' || 
           REPLACE(CAST(uuid_generate_v7() AS TEXT), '-', ''));
END;
$$ LANGUAGE plpgsql;

-- Function to generate ChittyID for claims
CREATE OR REPLACE FUNCTION generate_claim_chitty_id(
    p_tenant_name VARCHAR,
    p_claim_type VARCHAR
) RETURNS VARCHAR AS $$
BEGIN
    RETURN LOWER(p_tenant_name || '.claim.' || p_claim_type || '.' || 
           REPLACE(CAST(uuid_generate_v7() AS TEXT), '-', ''));
END;
$$ LANGUAGE plpgsql;