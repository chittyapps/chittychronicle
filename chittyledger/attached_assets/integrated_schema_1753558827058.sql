-- ChittyOS Integrated MCP Database Schema
-- Supports ChatGPT, Fortress, and Coordinator MCPs

-- ==========================================
-- CORE EXECUTION TRACKING
-- ==========================================

CREATE TABLE IF NOT EXISTS secure_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    prompt TEXT NOT NULL,
    prompt_hash VARCHAR(64) NOT NULL, -- SHA-256 of prompt
    security_level VARCHAR(20) NOT NULL CHECK (security_level IN ('standard', 'fortress', 'verified')),
    execution_method VARCHAR(20) NOT NULL CHECK (execution_method IN ('direct', 'sandboxed', 'verified')),
    
    -- Associated IDs
    chat_session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    fortress_job_id VARCHAR(255),
    evidence_id UUID,
    case_id VARCHAR(255),
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Status and results
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'executing', 'completed', 'failed', 'verified')),
    
    -- Results storage
    chatgpt_response TEXT,
    fortress_output TEXT,
    fortress_signature TEXT,
    verification_status BOOLEAN,
    
    -- Metadata
    model VARCHAR(100),
    label VARCHAR(500),
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    
    -- Chain integration
    chain_facts JSONB DEFAULT '[]', -- Array of fact IDs
    
    -- Indexes
    INDEX idx_secure_executions_user_id (user_id),
    INDEX idx_secure_executions_status (status),
    INDEX idx_secure_executions_security_level (security_level),
    INDEX idx_secure_executions_created_at (created_at),
    INDEX idx_secure_executions_case_id (case_id),
    INDEX idx_secure_executions_prompt_hash (prompt_hash)
);

-- ==========================================
-- EVIDENCE MANAGEMENT
-- ==========================================

CREATE TABLE IF NOT EXISTS evidence_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES secure_executions(id) ON DELETE CASCADE,
    case_id VARCHAR(255),
    evidence_type VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Fortress integration
    fortress_job_id VARCHAR(255),
    input_hash VARCHAR(64),
    output_hash VARCHAR(64),
    pgp_signature TEXT,
    signature_verified BOOLEAN DEFAULT false,
    signature_verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Chain facts
    chain_facts JSONB DEFAULT '[]',
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'verified', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Package information
    evidence_package_id UUID,
    package_format VARCHAR(50),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX idx_evidence_records_execution_id (execution_id),
    INDEX idx_evidence_records_case_id (case_id),
    INDEX idx_evidence_records_evidence_type (evidence_type),
    INDEX idx_evidence_records_status (status),
    INDEX idx_evidence_records_created_at (created_at)
);

-- ==========================================
-- CHITTYCHAIN FACTS STORAGE
-- ==========================================

CREATE TABLE IF NOT EXISTS chitty_chain_facts (
    uuid VARCHAR(64) PRIMARY KEY, -- Fact hash from ChittyChain
    subject TEXT NOT NULL,
    predicate TEXT NOT NULL,
    object TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    
    -- Timing
    timestamp BIGINT NOT NULL, -- Original timestamp from assertion
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Verification
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_method VARCHAR(100),
    
    -- Fortress integration
    fortress_signature TEXT,
    signature_verified BOOLEAN DEFAULT false,
    
    -- Relationships
    execution_id UUID REFERENCES secure_executions(id) ON DELETE SET NULL,
    evidence_id UUID REFERENCES evidence_records(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX idx_chitty_chain_facts_subject (subject),
    INDEX idx_chitty_chain_facts_predicate (predicate),
    INDEX idx_chitty_chain_facts_object (object),
    INDEX idx_chitty_chain_facts_source (source),
    INDEX idx_chitty_chain_facts_timestamp (timestamp),
    INDEX idx_chitty_chain_facts_verified (verified),
    INDEX idx_chitty_chain_facts_execution_id (execution_id)
);

-- ==========================================
-- EXECUTIVE ORCHESTRATION
-- ==========================================

CREATE TABLE IF NOT EXISTS executive_orchestrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task TEXT NOT NULL,
    executives_involved JSONB NOT NULL, -- Array of executive roles
    
    -- Security
    security_required BOOLEAN DEFAULT false,
    security_level VARCHAR(20) DEFAULT 'standard',
    evidence_tracking BOOLEAN DEFAULT false,
    
    -- Associated executions
    execution_ids JSONB DEFAULT '[]', -- Array of secure_execution IDs
    evidence_ids JSONB DEFAULT '[]', -- Array of evidence IDs
    
    -- Status
    status VARCHAR(20) DEFAULT 'initiated' CHECK (status IN ('initiated', 'executing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    results JSONB DEFAULT '{}',
    coordination_log JSONB DEFAULT '[]', -- Log of executive interactions
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX idx_executive_orchestrations_status (status),
    INDEX idx_executive_orchestrations_created_at (created_at),
    INDEX idx_executive_orchestrations_security_required (security_required)
);

-- ==========================================
-- AUDIT AND COMPLIANCE
-- ==========================================

CREATE TABLE IF NOT EXISTS security_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_type VARCHAR(50) NOT NULL,
    audit_level VARCHAR(20) NOT NULL CHECK (audit_level IN ('basic', 'comprehensive', 'forensic')),
    
    -- Scope
    execution_ids JSONB DEFAULT '[]',
    evidence_ids JSONB DEFAULT '[]',
    fact_ids JSONB DEFAULT '[]',
    
    -- Configuration
    verify_signatures BOOLEAN DEFAULT true,
    cross_reference BOOLEAN DEFAULT true,
    include_chain_verification BOOLEAN DEFAULT true,
    
    -- Results
    findings JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Auditor information
    auditor_id VARCHAR(255),
    automated BOOLEAN DEFAULT true,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX idx_security_audits_audit_type (audit_type),
    INDEX idx_security_audits_status (status),
    INDEX idx_security_audits_risk_level (risk_level),
    INDEX idx_security_audits_started_at (started_at)
);

-- ==========================================
-- COMPARISON AND ANALYSIS
-- ==========================================

CREATE TABLE IF NOT EXISTS ai_response_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt TEXT NOT NULL,
    prompt_hash VARCHAR(64) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    
    -- Execution references
    standard_execution_id UUID REFERENCES secure_executions(id) ON DELETE CASCADE,
    fortress_execution_id UUID REFERENCES secure_executions(id) ON DELETE CASCADE,
    analysis_execution_id UUID REFERENCES secure_executions(id) ON DELETE SET NULL,
    
    -- Results comparison
    responses_identical BOOLEAN,
    significant_differences BOOLEAN,
    security_implications JSONB DEFAULT '{}',
    
    -- Analysis
    analysis_results JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    analysis_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    model VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX idx_ai_response_comparisons_user_id (user_id),
    INDEX idx_ai_response_comparisons_prompt_hash (prompt_hash),
    INDEX idx_ai_response_comparisons_created_at (created_at),
    INDEX idx_ai_response_comparisons_responses_identical (responses_identical)
);

-- ==========================================
-- EVIDENCE PACKAGES
-- ==========================================

CREATE TABLE IF NOT EXISTS evidence_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id VARCHAR(255),
    execution_id UUID REFERENCES secure_executions(id) ON DELETE CASCADE,
    
    -- Package details
    package_format VARCHAR(50) NOT NULL CHECK (package_format IN ('json', 'pdf', 'legal_brief')),
    package_data JSONB NOT NULL,
    package_file_path TEXT,
    
    -- Chain facts inclusion
    include_chain_facts BOOLEAN DEFAULT true,
    chain_facts_included JSONB DEFAULT '[]',
    
    -- Signatures and verification
    package_hash VARCHAR(64),
    package_signature TEXT,
    verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'signed', 'verified', 'delivered')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Legal metadata
    legal_metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX idx_evidence_packages_case_id (case_id),
    INDEX idx_evidence_packages_execution_id (execution_id),
    INDEX idx_evidence_packages_status (status),
    INDEX idx_evidence_packages_created_at (created_at)
);

-- ==========================================
-- VIEWS FOR COMMON QUERIES
-- ==========================================

-- Complete execution summary with all related data
CREATE VIEW execution_summary AS
SELECT 
    se.id,
    se.user_id,
    se.security_level,
    se.status,
    se.created_at,
    se.completed_at,
    se.model,
    se.label,
    
    -- Evidence information
    er.id as evidence_id,
    er.evidence_type,
    er.signature_verified,
    
    -- Chain facts count
    jsonb_array_length(se.chain_facts) as chain_facts_count,
    
    -- Timing analysis
    EXTRACT(EPOCH FROM (se.completed_at - se.created_at)) as execution_duration_seconds,
    
    -- Verification status
    CASE 
        WHEN se.security_level = 'verified' AND se.verification_status = true THEN 'verified'
        WHEN se.security_level = 'fortress' AND er.signature_verified = true THEN 'fortress_verified'
        WHEN se.security_level = 'standard' THEN 'standard_complete'
        ELSE 'incomplete'
    END as verification_level

FROM secure_executions se
LEFT JOIN evidence_records er ON se.id = er.execution_id;

-- Security audit summary
CREATE VIEW security_audit_summary AS
SELECT 
    DATE(sa.started_at) as audit_date,
    sa.audit_level,
    COUNT(*) as total_audits,
    COUNT(*) FILTER (WHERE sa.status = 'completed') as completed_audits,
    COUNT(*) FILTER (WHERE sa.risk_level = 'high' OR sa.risk_level = 'critical') as high_risk_audits,
    AVG(EXTRACT(EPOCH FROM (sa.completed_at - sa.started_at))) as avg_audit_duration_seconds
FROM security_audits sa
WHERE sa.started_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(sa.started_at), sa.audit_level
ORDER BY audit_date DESC;

-- Chain facts verification status
CREATE VIEW chain_verification_summary AS
SELECT 
    DATE(ccf.ingested_at) as ingest_date,
    ccf.source,
    COUNT(*) as total_facts,
    COUNT(*) FILTER (WHERE ccf.verified = true) as verified_facts,
    COUNT(*) FILTER (WHERE ccf.signature_verified = true) as signature_verified_facts,
    ROUND(
        (COUNT(*) FILTER (WHERE ccf.verified = true) * 100.0) / COUNT(*), 
        2
    ) as verification_percentage
FROM chitty_chain_facts ccf
WHERE ccf.ingested_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(ccf.ingested_at), ccf.source
ORDER BY ingest_date DESC;

-- ==========================================
-- TRIGGERS FOR AUTOMATION
-- ==========================================

-- Update evidence record when execution completes
CREATE OR REPLACE FUNCTION update_evidence_on_execution_complete()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        UPDATE evidence_records 
        SET 
            status = 'completed',
            output_hash = encode(sha256(NEW.fortress_output::bytea), 'hex'),
            signature_verified = NEW.verification_status,
            updated_at = CURRENT_TIMESTAMP
        WHERE execution_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_update_evidence_on_execution_complete
    AFTER UPDATE ON secure_executions
    FOR EACH ROW EXECUTE FUNCTION update_evidence_on_execution_complete();

-- Auto-verify chain facts when fortress signature is added
CREATE OR REPLACE FUNCTION auto_verify_chain_facts()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fortress_signature IS NOT NULL AND OLD.fortress_signature IS NULL THEN
        NEW.signature_verified = true;
        NEW.verified = true;
        NEW.verified_at = CURRENT_TIMESTAMP;
        NEW.verification_method = 'fortress_signature';
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trigger_auto_verify_chain_facts
    BEFORE UPDATE ON chitty_chain_facts
    FOR EACH ROW EXECUTE FUNCTION auto_verify_chain_facts();

-- ==========================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- ==========================================

-- Get complete audit trail for an execution
CREATE OR REPLACE FUNCTION get_execution_audit_trail(execution_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'execution', row_to_json(se),
        'evidence', COALESCE(array_to_json(array_agg(DISTINCT er)), '[]'::json),
        'chain_facts', COALESCE(array_to_json(array_agg(DISTINCT ccf)), '[]'::json),
        'audits', COALESCE(array_to_json(array_agg(DISTINCT sa)), '[]'::json),
        'packages', COALESCE(array_to_json(array_agg(DISTINCT ep)), '[]'::json)
    ) INTO result
    FROM secure_executions se
    LEFT JOIN evidence_records er ON se.id = er.execution_id
    LEFT JOIN chitty_chain_facts ccf ON se.id = ccf.execution_id
    LEFT JOIN security_audits sa ON se.id = ANY(SELECT jsonb_array_elements_text(sa.execution_ids)::UUID)
    LEFT JOIN evidence_packages ep ON se.id = ep.execution_id
    WHERE se.id = execution_uuid
    GROUP BY se.id;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Verify execution integrity
CREATE OR REPLACE FUNCTION verify_execution_integrity(execution_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    execution_record secure_executions%ROWTYPE;
    integrity_report JSONB;
BEGIN
    SELECT * INTO execution_record FROM secure_executions WHERE id = execution_uuid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Execution not found');
    END IF;
    
    SELECT jsonb_build_object(
        'execution_id', execution_record.id,
        'prompt_hash_verified', execution_record.prompt_hash = encode(sha256(execution_record.prompt::bytea), 'hex'),
        'fortress_signature_present', execution_record.fortress_signature IS NOT NULL,
        'verification_status', execution_record.verification_status,
        'chain_facts_count', jsonb_array_length(execution_record.chain_facts),
        'evidence_records_count', (SELECT COUNT(*) FROM evidence_records WHERE execution_id = execution_uuid),
        'completed', execution_record.status = 'completed',
        'security_level', execution_record.security_level,
        'integrity_score', 
            CASE 
                WHEN execution_record.security_level = 'verified' 
                     AND execution_record.verification_status = true 
                     AND execution_record.fortress_signature IS NOT NULL 
                THEN 100
                WHEN execution_record.security_level = 'fortress' 
                     AND execution_record.fortress_signature IS NOT NULL 
                THEN 80
                WHEN execution_record.security_level = 'standard' 
                     AND execution_record.status = 'completed' 
                THEN 60
                ELSE 20
            END
    ) INTO integrity_report;
    
    RETURN integrity_report;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- INITIAL DATA AND CONFIGURATION
-- ==========================================

-- Insert default security audit configurations
INSERT INTO security_audits (audit_type, audit_level, automated, status) VALUES
('daily_integrity_check', 'basic', true, 'pending'),
('weekly_comprehensive_audit', 'comprehensive', true, 'pending'),
('monthly_forensic_review', 'forensic', true, 'pending')
ON CONFLICT DO NOTHING;

-- Performance indexes for heavy queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_secure_executions_composite 
    ON secure_executions (user_id, status, security_level, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chitty_chain_facts_composite 
    ON chitty_chain_facts (verified, source, timestamp DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_records_composite 
    ON evidence_records (case_id, status, created_at DESC);