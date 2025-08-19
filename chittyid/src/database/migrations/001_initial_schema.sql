-- ChittyID Database Schema v0.1
-- PostgreSQL schema for ChittyID authentication system

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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
CREATE INDEX idx_identities_type ON identities(type);

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

CREATE INDEX idx_service_accounts_client_id ON service_accounts(client_id);
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

CREATE INDEX idx_servers_audience ON servers(audience);
CREATE INDEX idx_servers_tenant_id ON servers(tenant_id);

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

CREATE INDEX idx_api_keys_prefix ON api_keys_legacy(prefix);
CREATE INDEX idx_api_keys_active ON api_keys_legacy(active);

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

CREATE INDEX idx_jwks_created_at ON jwks(created_at);
CREATE INDEX idx_jwks_retired_at ON jwks(retired_at);

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
CREATE INDEX idx_revocations_expires_at ON revocations(expires_at);

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
CREATE INDEX idx_role_bindings_role_id ON role_bindings(role_id);

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
CREATE INDEX idx_permissions_resource ON permissions(resource);

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

CREATE INDEX idx_tool_permissions_tenant_id ON tool_permissions(tenant_id);
CREATE INDEX idx_tool_permissions_mcp_server_id ON tool_permissions(mcp_server_id);

-- Audit log table
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
);

CREATE INDEX idx_audit_actor_sub ON audit(actor_sub);
CREATE INDEX idx_audit_action ON audit(action);
CREATE INDEX idx_audit_ts ON audit(ts);

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

CREATE INDEX idx_authorization_codes_expires_at ON authorization_codes(expires_at);

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

CREATE INDEX idx_refresh_tokens_identity_id ON refresh_tokens(identity_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

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

CREATE INDEX idx_sessions_identity_id ON sessions(identity_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- JTI cache table (for replay protection)
CREATE TABLE jti_cache (
    jti VARCHAR(255) PRIMARY KEY,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_jti_cache_expires_at ON jti_cache(expires_at);

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

-- Clean up expired data periodically
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS void AS $$
BEGIN
    -- Clean expired JTI cache entries
    DELETE FROM jti_cache WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Clean expired authorization codes
    DELETE FROM authorization_codes WHERE expires_at < CURRENT_TIMESTAMP AND used_at IS NULL;
    
    -- Clean expired refresh tokens
    DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Clean expired sessions
    DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP;
    
    -- Clean old revocations (after natural expiry + 7 days)
    DELETE FROM revocations WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create initial system tenant and roles
INSERT INTO tenants (name, domain) VALUES ('ChittyCorp', 'chitty.cc');

-- Sample data for testing
-- INSERT INTO identities (chitty_id, type, tenant_id) 
-- SELECT 'chitty.cc.mcp.registry', 'mcp', id FROM tenants WHERE name = 'ChittyCorp';