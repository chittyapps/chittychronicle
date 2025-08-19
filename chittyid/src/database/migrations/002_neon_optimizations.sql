-- ChittyID Database Schema v0.1 - Neon Optimized
-- PostgreSQL schema for ChittyID authentication system with Neon-specific optimizations

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create roles for connection management
-- Run these commands via Neon CLI:
-- neon roles create chittyid_app --database-name main
-- neon roles create chittyid_readonly --database-name main

-- Tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    domain VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_tenants_domain ON tenants(domain);

-- Identities table
CREATE TABLE identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chitty_id VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('user', 'service', 'mcp', 'org', 'device')),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX idx_identities_chitty_id ON identities(chitty_id);
CREATE INDEX idx_identities_tenant_id ON identities(tenant_id);
-- Partial index for active identities only (Neon optimization)
CREATE INDEX idx_identities_active ON identities(tenant_id, type) WHERE status = 'active';

-- Service accounts table
CREATE TABLE service_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id VARCHAR(255) NOT NULL UNIQUE,
    client_secret_hash VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    lvl INTEGER DEFAULT 2 CHECK (lvl BETWEEN 1 AND 5),
    roles TEXT[] DEFAULT ARRAY[]::TEXT[],
    scopes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE UNIQUE INDEX idx_service_accounts_client_id ON service_accounts(client_id);
CREATE INDEX idx_service_accounts_tenant_id ON service_accounts(tenant_id);

-- Servers table (MCP servers)
CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    audience VARCHAR(255) NOT NULL UNIQUE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id VARCHAR(255) REFERENCES service_accounts(client_id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deleted')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE UNIQUE INDEX idx_servers_audience ON servers(audience);
-- Partial index for active servers only
CREATE INDEX idx_servers_active ON servers(tenant_id) WHERE status = 'active';

-- Legacy API keys table
CREATE TABLE api_keys_legacy (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prefix VARCHAR(50) NOT NULL UNIQUE,
    hash VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    scope TEXT DEFAULT '',
    lvl INTEGER DEFAULT 1 CHECK (lvl BETWEEN 1 AND 5),
    expires_at TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE UNIQUE INDEX idx_api_keys_prefix ON api_keys_legacy(prefix);
-- Partial index for active, non-expired keys only
CREATE INDEX idx_api_keys_active_valid ON api_keys_legacy(tenant_id, prefix) 
    WHERE active = true AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

-- JWKS table
CREATE TABLE jwks (
    kid VARCHAR(255) PRIMARY KEY,
    alg VARCHAR(50) NOT NULL DEFAULT 'EdDSA',
    kty VARCHAR(50) NOT NULL DEFAULT 'OKP',
    use VARCHAR(50) NOT NULL DEFAULT 'sig',
    public_key TEXT NOT NULL,
    private_key_encrypted BYTEA, -- Encrypted with KMS
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    retired_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::JSONB
);

-- Partial index for active keys only (not retired)
CREATE INDEX idx_jwks_active ON jwks(created_at) WHERE retired_at IS NULL;
CREATE INDEX idx_jwks_retired ON jwks(retired_at) WHERE retired_at IS NOT NULL;

-- Revocations table
CREATE TABLE revocations (
    jti VARCHAR(255) PRIMARY KEY,
    sub VARCHAR(255) NOT NULL,
    reason VARCHAR(255),
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    revoked_by VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL -- When the JTI would have expired naturally
);

CREATE INDEX idx_revocations_sub ON revocations(sub);
-- Partial index for non-expired revocations only
CREATE INDEX idx_revocations_active ON revocations(jti) WHERE expires_at > CURRENT_TIMESTAMP;

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, tenant_id)
);

CREATE INDEX idx_roles_tenant_id ON roles(tenant_id);

-- Role bindings table
CREATE TABLE role_bindings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(255),
    expires_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(identity_id, role_id)
);

CREATE INDEX idx_role_bindings_identity_id ON role_bindings(identity_id);
-- Partial index for non-expired bindings only
CREATE INDEX idx_role_bindings_active ON role_bindings(identity_id, role_id) 
    WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP;

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    resource VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    effect VARCHAR(10) NOT NULL CHECK (effect IN ('allow', 'deny')),
    conditions JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, resource, action)
);

CREATE INDEX idx_permissions_role_id ON permissions(role_id);
-- Covering index for permission checks
CREATE INDEX idx_permissions_lookup ON permissions(role_id, resource, action) INCLUDE (effect);

-- Tool permissions table
CREATE TABLE tool_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    mcp_server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL,
    scope_required VARCHAR(255) NOT NULL,
    lvl_required INTEGER DEFAULT 1 CHECK (lvl_required BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, mcp_server_id, tool_name)
);

-- Covering index for tool permission lookups
CREATE INDEX idx_tool_permissions_lookup ON tool_permissions(tenant_id, mcp_server_id, tool_name) 
    INCLUDE (scope_required, lvl_required);

-- Audit log table - Partitioned by time for better performance
CREATE TABLE audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_sub VARCHAR(255) NOT NULL,
    action VARCHAR(255) NOT NULL,
    target VARCHAR(255),
    target_type VARCHAR(50),
    meta JSONB DEFAULT '{}'::JSONB,
    ip_address INET,
    user_agent TEXT,
    ts TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (ts);

-- Create partitions for current and next month
CREATE TABLE audit_current PARTITION OF audit 
    FOR VALUES FROM (date_trunc('month', CURRENT_DATE)) 
    TO (date_trunc('month', CURRENT_DATE + INTERVAL '1 month'));

CREATE TABLE audit_next PARTITION OF audit 
    FOR VALUES FROM (date_trunc('month', CURRENT_DATE + INTERVAL '1 month')) 
    TO (date_trunc('month', CURRENT_DATE + INTERVAL '2 months'));

-- Indexes on partitioned audit table
CREATE INDEX idx_audit_current_actor ON audit_current(actor_sub);
CREATE INDEX idx_audit_current_ts ON audit_current(ts);
CREATE INDEX idx_audit_next_actor ON audit_next(actor_sub);
CREATE INDEX idx_audit_next_ts ON audit_next(ts);

-- Authorization codes table (for PKCE flow)
CREATE TABLE authorization_codes (
    code VARCHAR(255) PRIMARY KEY,
    client_id VARCHAR(255) NOT NULL,
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    redirect_uri TEXT NOT NULL,
    scope TEXT,
    code_challenge VARCHAR(255),
    code_challenge_method VARCHAR(10) DEFAULT 'S256',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partial index for unused, non-expired codes only
CREATE INDEX idx_authorization_codes_valid ON authorization_codes(code, client_id) 
    WHERE used_at IS NULL AND expires_at > CURRENT_TIMESTAMP;

-- Refresh tokens table
CREATE TABLE refresh_tokens (
    token_hash VARCHAR(255) PRIMARY KEY,
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    client_id VARCHAR(255) NOT NULL,
    scope TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Partial index for active refresh tokens only
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(identity_id, client_id) 
    WHERE revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP;

-- Sessions table (for tracking active sessions)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    client_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(255),
    lvl INTEGER DEFAULT 1 CHECK (lvl BETWEEN 1 AND 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Covering index for active session lookups
CREATE INDEX idx_sessions_active ON sessions(identity_id, expires_at) 
    INCLUDE (lvl, device_fingerprint) WHERE expires_at > CURRENT_TIMESTAMP;

-- JTI cache table (for replay protection) - UNLOGGED for performance
CREATE UNLOGGED TABLE jti_cache (
    jti VARCHAR(255) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Hash index for JTI lookups (faster for equality checks)
CREATE INDEX idx_jti_cache_hash ON jti_cache USING hash(jti);
-- B-tree index for cleanup operations
CREATE INDEX idx_jti_cache_expires ON jti_cache(expires_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_identities_updated_at BEFORE UPDATE ON identities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_accounts_updated_at BEFORE UPDATE ON service_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servers_updated_at BEFORE UPDATE ON servers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tool_permissions_updated_at BEFORE UPDATE ON tool_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optimized cleanup function with batching
CREATE OR REPLACE FUNCTION cleanup_expired_data(batch_size INT DEFAULT 1000)
RETURNS TABLE(table_name TEXT, deleted_count BIGINT) AS $$
DECLARE
    deleted_jti BIGINT;
    deleted_codes BIGINT;
    deleted_tokens BIGINT;
    deleted_sessions BIGINT;
    deleted_revocations BIGINT;
BEGIN
    -- Clean expired JTI cache entries in batches
    WITH deleted AS (
        DELETE FROM jti_cache 
        WHERE jti IN (
            SELECT jti FROM jti_cache 
            WHERE expires_at < CURRENT_TIMESTAMP 
            LIMIT batch_size
        )
        RETURNING *
    )
    SELECT count(*) INTO deleted_jti FROM deleted;
    
    -- Clean expired authorization codes
    WITH deleted AS (
        DELETE FROM authorization_codes 
        WHERE expires_at < CURRENT_TIMESTAMP AND used_at IS NULL
        RETURNING *
    )
    SELECT count(*) INTO deleted_codes FROM deleted;
    
    -- Clean expired refresh tokens
    WITH deleted AS (
        DELETE FROM refresh_tokens 
        WHERE expires_at < CURRENT_TIMESTAMP OR revoked_at IS NOT NULL
        RETURNING *
    )
    SELECT count(*) INTO deleted_tokens FROM deleted;
    
    -- Clean expired sessions
    WITH deleted AS (
        DELETE FROM sessions 
        WHERE expires_at < CURRENT_TIMESTAMP
        RETURNING *
    )
    SELECT count(*) INTO deleted_sessions FROM deleted;
    
    -- Clean old revocations (after natural expiry + 7 days)
    WITH deleted AS (
        DELETE FROM revocations 
        WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '7 days'
        RETURNING *
    )
    SELECT count(*) INTO deleted_revocations FROM deleted;
    
    -- Return cleanup statistics
    RETURN QUERY VALUES 
        ('jti_cache', deleted_jti),
        ('authorization_codes', deleted_codes),
        ('refresh_tokens', deleted_tokens),
        ('sessions', deleted_sessions),
        ('revocations', deleted_revocations);
END;
$$ LANGUAGE plpgsql;

-- Function to create next month's audit partition
CREATE OR REPLACE FUNCTION create_audit_partition()
RETURNS void AS $$
DECLARE
    next_month_start DATE;
    next_month_end DATE;
    partition_name TEXT;
BEGIN
    next_month_start := date_trunc('month', CURRENT_DATE + INTERVAL '2 months');
    next_month_end := date_trunc('month', CURRENT_DATE + INTERVAL '3 months');
    partition_name := 'audit_' || to_char(next_month_start, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF audit 
                    FOR VALUES FROM (%L) TO (%L)', 
                   partition_name, next_month_start, next_month_end);
    
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(actor_sub)', 
                   'idx_' || partition_name || '_actor', partition_name);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(ts)', 
                   'idx_' || partition_name || '_ts', partition_name);
END;
$$ LANGUAGE plpgsql;

-- Prepared statements for high-frequency operations
PREPARE check_jti(TEXT) AS 
    SELECT 1 FROM jti_cache WHERE jti = $1;

PREPARE insert_jti(TEXT, TIMESTAMPTZ) AS 
    INSERT INTO jti_cache (jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING;

PREPARE validate_client_credentials(TEXT) AS 
    SELECT sa.client_id, sa.lvl, sa.roles, sa.scopes, i.chitty_id, t.name as tenant_name
    FROM service_accounts sa
    JOIN identities i ON sa.identity_id = i.id
    JOIN tenants t ON sa.tenant_id = t.id
    WHERE sa.client_id = $1;

PREPARE get_active_jwks() AS 
    SELECT kid, public_key FROM jwks WHERE retired_at IS NULL ORDER BY created_at DESC;

-- Create initial system tenant and roles
INSERT INTO tenants (name, domain) VALUES ('ChittyCorp', 'chitty.cc') ON CONFLICT DO NOTHING;

-- Grant permissions to application role
-- Note: Run these via Neon CLI after creating the role:
-- GRANT CONNECT ON DATABASE main TO chittyid_app;
-- GRANT USAGE ON SCHEMA public TO chittyid_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO chittyid_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO chittyid_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO chittyid_app;

-- Grant read-only permissions
-- GRANT CONNECT ON DATABASE main TO chittyid_readonly;
-- GRANT USAGE ON SCHEMA public TO chittyid_readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO chittyid_readonly;