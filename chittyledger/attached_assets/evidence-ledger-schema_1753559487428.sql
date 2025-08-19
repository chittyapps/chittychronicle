-- ChittyChain Evidence Ledger Schema
-- Legal-grade evidence management with blockchain integration
-- Created: 2025-01-15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Evidence Tiers Enum
CREATE TYPE evidence_tier AS ENUM (
    'SELF_AUTHENTICATING',
    'GOVERNMENT', 
    'FINANCIAL_INSTITUTION',
    'INDEPENDENT_THIRD_PARTY',
    'BUSINESS_RECORDS',
    'FIRST_PARTY_ADVERSE',
    'FIRST_PARTY_FRIENDLY',
    'UNCORROBORATED_PERSON'
);

-- Evidence Types Enum
CREATE TYPE evidence_type AS ENUM (
    'Document',
    'Image', 
    'Communication',
    'Financial Record',
    'Legal Filing',
    'Physical Evidence'
);

-- User Types Enum
CREATE TYPE user_type AS ENUM (
    'PARTY_PETITIONER',
    'PARTY_RESPONDENT', 
    'ATTORNEY_PETITIONER',
    'ATTORNEY_RESPONDENT',
    'COURT_OFFICER',
    'EXPERT_WITNESS'
);

-- Case Types Enum
CREATE TYPE case_type AS ENUM (
    'DIVORCE',
    'CUSTODY',
    'CIVIL', 
    'CRIMINAL',
    'PROBATE'
);

-- Fact Types Enum
CREATE TYPE fact_type AS ENUM (
    'DATE',
    'AMOUNT',
    'ADMISSION',
    'IDENTITY', 
    'LOCATION',
    'RELATIONSHIP',
    'ACTION',
    'STATUS'
);

-- Classification Levels Enum
CREATE TYPE classification_level AS ENUM (
    'FACT',
    'SUPPORTED_CLAIM',
    'ASSERTION',
    'ALLEGATION', 
    'CONTRADICTION'
);

-- Table 1: USERS
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number TEXT UNIQUE NOT NULL DEFAULT 'REG' || lpad((random() * 99999999)::text, 8, '0'),
    user_type user_type NOT NULL,
    full_name TEXT NOT NULL,
    bar_number TEXT,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    verified_status BOOLEAN DEFAULT false,
    trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    two_fa_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: CASES  
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id TEXT UNIQUE NOT NULL, -- Jurisdiction + Year + Type + Number
    jurisdiction TEXT NOT NULL,
    case_number TEXT NOT NULL,
    case_type case_type NOT NULL,
    filing_date DATE NOT NULL,
    judge_assigned TEXT,
    case_status TEXT DEFAULT 'Active' CHECK (case_status IN ('Active', 'Stayed', 'Closed', 'Appeal')),
    key_dates JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: MASTER EVIDENCE
CREATE TABLE master_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    artifact_id TEXT UNIQUE NOT NULL DEFAULT 'ART-' || uuid_generate_v4()::text,
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    evidence_type evidence_type NOT NULL,
    evidence_tier evidence_tier NOT NULL,
    evidence_weight DECIMAL(3,2) DEFAULT 0.0 CHECK (evidence_weight >= 0.0 AND evidence_weight <= 1.0),
    content_hash TEXT NOT NULL, -- SHA-256
    original_filename TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source_verification_status TEXT DEFAULT 'Pending' CHECK (source_verification_status IN ('Verified', 'Pending', 'Failed')),
    authentication_method TEXT CHECK (authentication_method IN ('Seal', 'Stamp', 'Certification', 'Notarization', 'Digital Signature', 'Metadata', 'Witness', 'None')),
    supporting_claims TEXT[],
    contradicting_claims TEXT[],
    minting_status TEXT DEFAULT 'Pending' CHECK (minting_status IN ('Minted', 'Pending', 'Rejected', 'Requires Corroboration')),
    block_number TEXT,
    audit_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: ATOMIC FACTS
CREATE TABLE atomic_facts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fact_id TEXT UNIQUE NOT NULL DEFAULT 'FACT-' || uuid_generate_v4()::text,
    parent_document_id UUID REFERENCES master_evidence(id) ON DELETE CASCADE,
    fact_text TEXT NOT NULL,
    fact_type fact_type NOT NULL,
    location_in_document TEXT, -- p./¶/l.
    classification_level classification_level NOT NULL,
    weight DECIMAL(3,2) DEFAULT 0.0 CHECK (weight >= 0.0 AND weight <= 1.0),
    credibility_factors TEXT[] DEFAULT '{}', -- Against Interest, Contemporaneous, Business Duty, Official Duty
    supports_case_theory TEXT[],
    contradicts_case_theory TEXT[],
    chittychain_status TEXT DEFAULT 'Pending' CHECK (chittychain_status IN ('Minted', 'Pending', 'Rejected')),
    verification_date DATE,
    verification_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 5: CHAIN OF CUSTODY LOG
CREATE TABLE chain_of_custody_log (
    id SERIAL PRIMARY KEY,
    evidence_id UUID REFERENCES master_evidence(id) ON DELETE CASCADE,
    custodian_id UUID REFERENCES users(id) ON DELETE CASCADE,
    date_received TIMESTAMP WITH TIME ZONE NOT NULL,
    date_transferred TIMESTAMP WITH TIME ZONE,
    transfer_method TEXT CHECK (transfer_method IN ('SEALED_ENVELOPE', 'CERTIFIED_MAIL', 'SECURE_DIGITAL', 'COURT_FILING', 'NOTARY_TRANSFER', 'DIRECT_HANDOFF')),
    integrity_check_method TEXT CHECK (integrity_check_method IN ('HASH_VERIFICATION', 'SEAL_INTACT', 'WITNESS_CONFIRMATION', 'METADATA_MATCH')),
    integrity_verified BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 6: CONTRADICTION TRACKING
CREATE TABLE contradiction_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contradiction_id TEXT UNIQUE NOT NULL DEFAULT 'CONFLICT-' || uuid_generate_v4()::text,
    conflict_type TEXT NOT NULL CHECK (conflict_type IN ('DIRECT_CONTRADICTION', 'TEMPORAL_IMPOSSIBILITY', 'LOGICAL_INCONSISTENCY', 'PARTIAL_CONFLICT')),
    winning_fact_id UUID REFERENCES atomic_facts(id),
    resolution_method TEXT CHECK (resolution_method IN ('HIERARCHY_RULE', 'TEMPORAL_PRIORITY', 'AUTHENTICATION_SUPERIORITY', 'ADVERSE_ADMISSION', 'CONTEMPORANEOUS_RECORD')),
    resolution_date DATE,
    impact_on_case TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table 7: AUDIT TRAIL
CREATE TABLE audit_trail (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id),
    action_type TEXT NOT NULL CHECK (action_type IN ('Upload', 'Verify', 'Mint', 'Reject', 'Query', 'Modify', 'Access')),
    target_artifact_id UUID REFERENCES master_evidence(id),
    ip_address INET,
    session_id TEXT,
    success_failure TEXT NOT NULL CHECK (success_failure IN ('Success', 'Failure')),
    details JSONB
);

-- Junction table for conflicting facts in contradiction tracking
CREATE TABLE contradiction_facts (
    contradiction_id UUID REFERENCES contradiction_tracking(id) ON DELETE CASCADE,
    fact_id UUID REFERENCES atomic_facts(id) ON DELETE CASCADE,
    PRIMARY KEY (contradiction_id, fact_id)
);

-- Junction table for related facts
CREATE TABLE related_facts (
    fact_id UUID REFERENCES atomic_facts(id) ON DELETE CASCADE,
    related_fact_id UUID REFERENCES atomic_facts(id) ON DELETE CASCADE,
    PRIMARY KEY (fact_id, related_fact_id)
);

-- Junction table for case parties
CREATE TABLE case_parties (
    case_id UUID REFERENCES cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (case_id, user_id)
);

-- Evidence weight calculation function based on tier
CREATE OR REPLACE FUNCTION calculate_evidence_weight(tier evidence_tier, auth_method TEXT)
RETURNS DECIMAL(3,2) AS $$
BEGIN
    CASE tier
        WHEN 'SELF_AUTHENTICATING' THEN RETURN 1.0;
        WHEN 'GOVERNMENT' THEN RETURN 0.95;
        WHEN 'FINANCIAL_INSTITUTION' THEN RETURN 0.90;
        WHEN 'INDEPENDENT_THIRD_PARTY' THEN RETURN 0.85;
        WHEN 'BUSINESS_RECORDS' THEN RETURN 0.80;
        WHEN 'FIRST_PARTY_ADVERSE' THEN RETURN 0.75;
        WHEN 'FIRST_PARTY_FRIENDLY' THEN RETURN 0.60;
        WHEN 'UNCORROBORATED_PERSON' THEN RETURN 0.40;
        ELSE RETURN 0.50;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate evidence weight
CREATE OR REPLACE FUNCTION update_evidence_weight()
RETURNS TRIGGER AS $$
BEGIN
    NEW.evidence_weight := calculate_evidence_weight(NEW.evidence_tier, NEW.authentication_method);
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER evidence_weight_trigger
    BEFORE INSERT OR UPDATE ON master_evidence
    FOR EACH ROW
    EXECUTE FUNCTION update_evidence_weight();

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_master_evidence_updated_at BEFORE UPDATE ON master_evidence FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_atomic_facts_updated_at BEFORE UPDATE ON atomic_facts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contradiction_tracking_updated_at BEFORE UPDATE ON contradiction_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_master_evidence_case_id ON master_evidence(case_id);
CREATE INDEX idx_master_evidence_user_id ON master_evidence(user_id);
CREATE INDEX idx_master_evidence_content_hash ON master_evidence(content_hash);
CREATE INDEX idx_atomic_facts_parent_document ON atomic_facts(parent_document_id);
CREATE INDEX idx_chain_custody_evidence ON chain_of_custody_log(evidence_id);
CREATE INDEX idx_audit_trail_user ON audit_trail(user_id);
CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp);
CREATE INDEX idx_audit_trail_action_type ON audit_trail(action_type);

-- Views for common queries
CREATE VIEW pending_verification AS
SELECT * FROM master_evidence WHERE source_verification_status = 'Pending';

CREATE VIEW high_weight_evidence AS
SELECT * FROM master_evidence WHERE evidence_weight >= 0.9;

CREATE VIEW recent_mints AS
SELECT * FROM master_evidence 
WHERE minting_status = 'Minted' 
ORDER BY verification_date DESC;

CREATE VIEW case_summary AS
SELECT 
    c.*,
    COUNT(me.id) as total_evidence_items,
    COUNT(af.id) FILTER (WHERE af.chittychain_status = 'Minted') as minted_facts_count
FROM cases c
LEFT JOIN master_evidence me ON c.id = me.case_id
LEFT JOIN atomic_facts af ON me.id = af.parent_document_id
GROUP BY c.id;

-- Initial data setup
INSERT INTO users (user_type, full_name, email, verified_status) VALUES
('COURT_OFFICER', 'System Admin', 'admin@chittychain.com', true);

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO chittychain_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO chittychain_user;