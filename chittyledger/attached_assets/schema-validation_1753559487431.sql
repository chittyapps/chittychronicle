-- ChittyChain Evidence Ledger Schema Validation
-- Comprehensive validation and reinforcement checks
-- Created: 2025-01-15

-- Schema Validation Queries
-- ========================

-- Check all required extensions
SELECT 
    extname,
    extversion,
    extrelocatable
FROM pg_extension 
WHERE extname = 'uuid-ossp';

-- Validate all custom types exist
SELECT 
    typname,
    typtype,
    typcategory
FROM pg_type 
WHERE typname IN (
    'evidence_tier',
    'evidence_type', 
    'user_type',
    'case_type',
    'fact_type',
    'classification_level'
);

-- Check all tables exist with correct structure
SELECT 
    schemaname,
    tablename,
    tableowner,
    tablespace,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename IN (
    'users',
    'cases',
    'master_evidence',
    'atomic_facts',
    'chain_of_custody_log',
    'contradiction_tracking',
    'audit_trail',
    'contradiction_facts',
    'related_facts',
    'case_parties'
);

-- Validate foreign key constraints
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    rc.match_option,
    rc.update_rule,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- Check indexes exist for performance
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'master_evidence',
    'atomic_facts',
    'chain_of_custody_log',
    'audit_trail'
)
ORDER BY tablename, indexname;

-- Validate triggers are properly configured
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table IN (
        'users',
        'cases', 
        'master_evidence',
        'atomic_facts',
        'contradiction_tracking'
    )
ORDER BY event_object_table, trigger_name;

-- Check views exist and are accessible
SELECT 
    viewname,
    viewowner,
    definition
FROM pg_views
WHERE viewname IN (
    'pending_verification',
    'high_weight_evidence',
    'recent_mints',
    'case_summary'
);

-- Validate functions exist
SELECT 
    proname,
    pronargs,
    prorettype::regtype,
    prosrc
FROM pg_proc
WHERE proname IN (
    'calculate_evidence_weight',
    'update_evidence_weight',
    'update_updated_at_column'
);

-- Data Integrity Checks
-- =====================

-- Check constraint violations
SELECT 
    conrelid::regclass AS table_name,
    conname AS constraint_name,
    consrc AS constraint_definition
FROM pg_constraint
WHERE contype = 'c'
    AND conrelid::regclass::text IN (
        'users',
        'cases',
        'master_evidence', 
        'atomic_facts'
    );

-- Validate enum values are properly set
SELECT 
    t.typname,
    e.enumlabel,
    e.enumsortorder
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN (
    'evidence_tier',
    'evidence_type',
    'user_type',
    'case_type',
    'fact_type',
    'classification_level'
)
ORDER BY t.typname, e.enumsortorder;

-- Performance Validation
-- ======================

-- Check index usage statistics
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'master_evidence',
        'atomic_facts',
        'chain_of_custody_log',
        'audit_trail'
    )
ORDER BY tablename, indexname;

-- Validate table statistics
SELECT 
    schemaname,
    tablename,
    n_tup_ins,
    n_tup_upd,
    n_tup_del,
    n_live_tup,
    n_dead_tup,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'users',
        'cases',
        'master_evidence',
        'atomic_facts',
        'chain_of_custody_log',
        'contradiction_tracking',
        'audit_trail'
    );

-- Security Validation
-- ===================

-- Check table permissions
SELECT 
    grantee,
    table_schema,
    table_name,
    privilege_type,
    is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public'
    AND table_name IN (
        'users',
        'cases',
        'master_evidence',
        'atomic_facts',
        'chain_of_custody_log',
        'contradiction_tracking',
        'audit_trail'
    )
ORDER BY table_name, grantee;

-- Validate row level security (if enabled)
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'users',
        'cases', 
        'master_evidence',
        'atomic_facts'
    );

-- Test Evidence Weight Calculation
-- ================================

-- Test weight calculation function
SELECT 
    tier,
    calculate_evidence_weight(tier::evidence_tier, 'Digital Signature') AS weight_with_sig,
    calculate_evidence_weight(tier::evidence_tier, 'None') AS weight_without_auth
FROM (
    VALUES 
        ('SELF_AUTHENTICATING'),
        ('GOVERNMENT'),
        ('FINANCIAL_INSTITUTION'),
        ('INDEPENDENT_THIRD_PARTY'),
        ('BUSINESS_RECORDS'),
        ('FIRST_PARTY_ADVERSE'),
        ('FIRST_PARTY_FRIENDLY'),
        ('UNCORROBORATED_PERSON')
) AS t(tier);

-- Schema Completeness Check
-- =========================

-- Verify all required columns exist
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'users',
        'cases',
        'master_evidence',
        'atomic_facts',
        'chain_of_custody_log',
        'contradiction_tracking',
        'audit_trail'
    )
ORDER BY table_name, ordinal_position;

-- Final Health Check
-- ==================

-- Overall database health
SELECT 
    'Schema Health' AS check_type,
    CASE 
        WHEN COUNT(*) = 10 THEN 'PASS'
        ELSE 'FAIL - Missing Tables'
    END AS status,
    COUNT(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'users', 'cases', 'master_evidence', 'atomic_facts',
        'chain_of_custody_log', 'contradiction_tracking', 'audit_trail',
        'contradiction_facts', 'related_facts', 'case_parties'
    )

UNION ALL

SELECT 
    'Function Health' AS check_type,
    CASE 
        WHEN COUNT(*) >= 3 THEN 'PASS'
        ELSE 'FAIL - Missing Functions'
    END AS status,
    COUNT(*) AS function_count
FROM pg_proc
WHERE proname IN (
    'calculate_evidence_weight',
    'update_evidence_weight', 
    'update_updated_at_column'
)

UNION ALL

SELECT 
    'View Health' AS check_type,
    CASE 
        WHEN COUNT(*) = 4 THEN 'PASS'
        ELSE 'FAIL - Missing Views'
    END AS status,
    COUNT(*) AS view_count
FROM pg_views
WHERE viewname IN (
    'pending_verification',
    'high_weight_evidence',
    'recent_mints',
    'case_summary'
)

UNION ALL

SELECT 
    'Trigger Health' AS check_type,
    CASE 
        WHEN COUNT(*) >= 6 THEN 'PASS'
        ELSE 'FAIL - Missing Triggers'
    END AS status,
    COUNT(*) AS trigger_count
FROM information_schema.triggers
WHERE event_object_schema = 'public';

-- Output validation summary
SELECT 
    'VALIDATION COMPLETE' AS message,
    NOW() AS timestamp,
    current_database() AS database,
    current_user AS user;