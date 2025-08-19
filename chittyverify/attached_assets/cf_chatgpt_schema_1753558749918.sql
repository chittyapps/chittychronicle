-- ChittyOS ChatGPT MCP Database Schema
-- Compatible with Neon PostgreSQL and Cloudflare D1

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    session_name VARCHAR(500) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    metadata JSONB DEFAULT '{}',
    total_messages INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    total_cost DECIMAL(10,6) DEFAULT 0.00,
    
    -- Indexes
    INDEX idx_chat_sessions_user_id (user_id),
    INDEX idx_chat_sessions_created_at (created_at),
    INDEX idx_chat_sessions_status (status)
);

-- Messages Table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tokens_used INTEGER,
    cost DECIMAL(10,6),
    model VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    
    -- Indexes
    INDEX idx_chat_messages_session_id (session_id),
    INDEX idx_chat_messages_timestamp (timestamp),
    INDEX idx_chat_messages_role (role)
);

-- Usage Analytics Table
CREATE TABLE IF NOT EXISTS usage_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    hour INTEGER CHECK (hour >= 0 AND hour <= 23),
    messages_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    cost DECIMAL(10,6) DEFAULT 0.00,
    model VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Composite unique constraint for aggregation
    UNIQUE (user_id, session_id, date, hour, model),
    
    -- Indexes
    INDEX idx_usage_analytics_user_date (user_id, date),
    INDEX idx_usage_analytics_session_date (session_id, date),
    INDEX idx_usage_analytics_date (date)
);

-- API Keys Table (for user-specific OpenAI keys)
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL DEFAULT 'openai',
    key_hash VARCHAR(255) NOT NULL, -- Encrypted API key
    key_name VARCHAR(100), -- User-friendly name
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    
    -- Unique constraint
    UNIQUE (user_id, provider, key_name),
    
    -- Indexes
    INDEX idx_api_keys_user_id (user_id),
    INDEX idx_api_keys_provider (provider),
    INDEX idx_api_keys_active (is_active)
);

-- Model Configurations Table
CREATE TABLE IF NOT EXISTS model_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    config_name VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    max_tokens INTEGER DEFAULT 1000,
    temperature DECIMAL(3,2) DEFAULT 0.70,
    top_p DECIMAL(3,2) DEFAULT 1.00,
    frequency_penalty DECIMAL(3,2) DEFAULT 0.00,
    presence_penalty DECIMAL(3,2) DEFAULT 0.00,
    system_prompt TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE (user_id, config_name),
    
    -- Indexes
    INDEX idx_model_configs_user_id (user_id),
    INDEX idx_model_configs_default (user_id, is_default) WHERE is_default = true
);

-- Session Templates Table
CREATE TABLE IF NOT EXISTS session_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255),
    template_name VARCHAR(200) NOT NULL,
    description TEXT,
    system_prompt TEXT,
    initial_messages JSONB DEFAULT '[]',
    model_config_id UUID REFERENCES model_configs(id) ON DELETE SET NULL,
    is_public BOOLEAN DEFAULT false,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_session_templates_user_id (user_id),
    INDEX idx_session_templates_public (is_public) WHERE is_public = true,
    INDEX idx_session_templates_name (template_name)
);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_sessions_updated_at 
    BEFORE UPDATE ON chat_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_model_configs_updated_at 
    BEFORE UPDATE ON model_configs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_templates_updated_at 
    BEFORE UPDATE ON session_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update session statistics
CREATE OR REPLACE FUNCTION update_session_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE chat_sessions 
        SET 
            total_messages = total_messages + 1,
            total_tokens = total_tokens + COALESCE(NEW.tokens_used, 0),
            total_cost = total_cost + COALESCE(NEW.cost, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.session_id;
        
        -- Update usage analytics
        INSERT INTO usage_analytics (
            user_id, session_id, date, hour, messages_count, tokens_used, cost, model
        )
        SELECT 
            cs.user_id,
            NEW.session_id,
            DATE(NEW.timestamp),
            EXTRACT(HOUR FROM NEW.timestamp)::INTEGER,
            1,
            COALESCE(NEW.tokens_used, 0),
            COALESCE(NEW.cost, 0),
            NEW.model
        FROM chat_sessions cs 
        WHERE cs.id = NEW.session_id
        ON CONFLICT (user_id, session_id, date, hour, model) 
        DO UPDATE SET
            messages_count = usage_analytics.messages_count + 1,
            tokens_used = usage_analytics.tokens_used + COALESCE(NEW.tokens_used, 0),
            cost = usage_analytics.cost + COALESCE(NEW.cost, 0);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

CREATE TRIGGER update_session_stats_trigger
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_session_stats();

-- Views for common queries
CREATE VIEW session_summaries AS
SELECT 
    cs.id,
    cs.user_id,
    cs.session_name,
    cs.created_at,
    cs.updated_at,
    cs.total_messages,
    cs.total_tokens,
    cs.total_cost,
    cs.status,
    COALESCE(last_msg.content, 'No messages yet') as last_message_preview,
    last_msg.timestamp as last_message_at
FROM chat_sessions cs
LEFT JOIN LATERAL (
    SELECT content, timestamp 
    FROM chat_messages cm 
    WHERE cm.session_id = cs.id 
    ORDER BY timestamp DESC 
    LIMIT 1
) last_msg ON true;

CREATE VIEW user_usage_summary AS
SELECT 
    user_id,
    DATE(date) as usage_date,
    SUM(messages_count) as total_messages,
    SUM(tokens_used) as total_tokens,
    SUM(cost) as total_cost,
    COUNT(DISTINCT session_id) as active_sessions
FROM usage_analytics
GROUP BY user_id, DATE(date)
ORDER BY usage_date DESC;

-- Indexes on views (if supported)
CREATE INDEX idx_session_summaries_user_updated 
    ON chat_sessions (user_id, updated_at DESC);

-- Initial data
INSERT INTO model_configs (user_id, config_name, model, system_prompt, is_default) VALUES
('system', 'default-gpt4', 'gpt-4', 'You are a helpful AI assistant integrated with ChittyOS.', true),
('system', 'creative-gpt4', 'gpt-4', 'You are a creative AI assistant that helps with writing, brainstorming, and creative tasks.', false),
('system', 'technical-gpt4', 'gpt-4', 'You are a technical AI assistant specializing in programming, software architecture, and system design.', false);

INSERT INTO session_templates (user_id, template_name, description, system_prompt, is_public) VALUES
(NULL, 'General Assistant', 'General purpose AI assistant', 'You are a helpful AI assistant.', true),
(NULL, 'Code Review', 'AI assistant for code review and programming help', 'You are an expert programmer and code reviewer. Help analyze code, suggest improvements, and explain programming concepts.', true),
(NULL, 'Legal Research', 'AI assistant for legal research and analysis', 'You are a legal research assistant. Help find relevant laws, cases, and legal concepts. Always remind users to consult with qualified attorneys.', true),
(NULL, 'Business Analysis', 'AI assistant for business analysis and strategy', 'You are a business analyst. Help with market research, business strategy, and data analysis.', true);