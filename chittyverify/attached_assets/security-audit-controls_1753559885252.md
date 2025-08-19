# ChittyChain Evidence Ledger Security & Audit Controls

## Security Architecture Overview

### Multi-Layer Security Model
1. **Database Layer**: PostgreSQL with row-level security
2. **Application Layer**: MCP server with authentication
3. **Blockchain Layer**: Immutable audit trails
4. **Network Layer**: Encrypted connections and API security
5. **Access Layer**: Role-based permissions and 2FA

## Authentication & Authorization

### User Authentication
```sql
-- User verification with trust scoring
CREATE TABLE users (
    id UUID PRIMARY KEY,
    user_type user_type NOT NULL,
    verified_status BOOLEAN DEFAULT false,
    trust_score INTEGER DEFAULT 50 CHECK (trust_score >= 0 AND trust_score <= 100),
    two_fa_enabled BOOLEAN DEFAULT false,
    bar_number TEXT, -- For attorney verification
    -- ... other fields
);
```

### Role-Based Access Control (RBAC)
```sql
-- Evidence access based on user type
CREATE POLICY evidence_access_policy ON master_evidence
    FOR SELECT USING (
        CASE current_user_type()
            WHEN 'COURT_OFFICER' THEN true
            WHEN 'ATTORNEY_PETITIONER' THEN case_id IN (SELECT id FROM cases WHERE user_is_party(auth.uid()))
            WHEN 'ATTORNEY_RESPONDENT' THEN case_id IN (SELECT id FROM cases WHERE user_is_party(auth.uid()))
            ELSE false
        END
    );
```

### Multi-Factor Authentication (MFA)
- **Requirement**: All legal professionals must enable 2FA
- **Implementation**: `two_fa_enabled` boolean field
- **Verification**: TOTP or SMS-based authentication
- **Backup**: Recovery codes for emergency access

## Data Protection & Encryption

### Data at Rest
- **Database**: AES-256 encryption via Neon PostgreSQL
- **Blockchain**: SHA-256 hashing for content integrity
- **Files**: Encrypted storage with key management
- **Backups**: Encrypted with separate key rotation

### Data in Transit
- **API Connections**: TLS 1.3 minimum
- **MCP Protocol**: Encrypted stdio transport
- **Database**: SSL/TLS connections required
- **Blockchain**: Secure peer-to-peer communication

### Content Hash Verification
```sql
-- SHA-256 content integrity
CREATE TABLE master_evidence (
    content_hash TEXT NOT NULL CHECK (length(content_hash) = 66 AND content_hash LIKE 'sha256:%'),
    -- Trigger to verify hash on insert/update
    -- ... other fields
);
```

## Audit Trail Security

### Immutable Audit Logging
```sql
-- Tamper-evident audit trail
CREATE TABLE audit_trail (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    target_artifact_id UUID,
    ip_address INET,
    session_id TEXT,
    success_failure TEXT NOT NULL,
    details JSONB,
    -- Immutability constraints
    CONSTRAINT immutable_audit CHECK (timestamp IS NOT NULL),
    CONSTRAINT valid_action CHECK (action_type IN ('Upload', 'Verify', 'Mint', 'Reject', 'Query', 'Modify', 'Access'))
);

-- Prevent updates/deletes on audit trail
CREATE POLICY audit_immutable ON audit_trail
    FOR UPDATE USING (false);
CREATE POLICY audit_no_delete ON audit_trail
    FOR DELETE USING (false);
```

### Blockchain Integration
- **Block Hashing**: SHA-256 for tamper detection
- **Merkle Trees**: Efficient integrity verification
- **Timestamping**: Cryptographic proof of creation time
- **Distributed Verification**: Multiple node validation

### Comprehensive Logging
```javascript
// Audit log entry for every operation
const auditLog = {
    timestamp: new Date().toISOString(),
    user_id: userId,
    action_type: 'CREATE_EVIDENCE',
    target_artifact_id: evidenceId,
    ip_address: request.ip,
    session_id: request.sessionId,
    success_failure: 'Success',
    details: {
        evidence_type: evidenceType,
        evidence_tier: evidenceTier,
        authentication_method: authMethod,
        case_id: caseId
    }
};
```

## Chain of Custody Security

### Cryptographic Chain Protection
```sql
-- Immutable chain of custody with hash verification
CREATE TABLE chain_of_custody_log (
    id SERIAL PRIMARY KEY,
    evidence_id UUID NOT NULL,
    custodian_id UUID NOT NULL,
    date_received TIMESTAMP WITH TIME ZONE NOT NULL,
    date_transferred TIMESTAMP WITH TIME ZONE,
    transfer_method TEXT NOT NULL,
    integrity_check_method TEXT NOT NULL,
    integrity_verified BOOLEAN DEFAULT false,
    custody_hash TEXT GENERATED ALWAYS AS (
        encode(sha256(
            evidence_id::text || 
            custodian_id::text || 
            date_received::text || 
            transfer_method
        ), 'hex')
    ) STORED,
    notes TEXT,
    -- Prevent tampering
    CONSTRAINT custody_immutable CHECK (date_received IS NOT NULL)
);
```

### Transfer Verification
- **Hash Verification**: SHA-256 content hash comparison
- **Seal Integrity**: Physical seal verification
- **Witness Confirmation**: Third-party verification
- **Metadata Matching**: Digital signature validation

### Gap Detection
```sql
-- Detect breaks in chain of custody
CREATE OR REPLACE FUNCTION detect_custody_gaps(evidence_uuid UUID)
RETURNS TABLE(gap_start TIMESTAMP, gap_end TIMESTAMP) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lag(date_transferred) OVER (ORDER BY date_received) AS gap_start,
        date_received AS gap_end
    FROM chain_of_custody_log
    WHERE evidence_id = evidence_uuid
        AND lag(date_transferred) OVER (ORDER BY date_received) IS NOT NULL
        AND lag(date_transferred) OVER (ORDER BY date_received) < date_received;
END;
$$ LANGUAGE plpgsql;
```

## Privilege Protection

### Attorney-Client Privilege
```sql
-- Privilege protection at data level
CREATE TABLE privilege_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evidence_id UUID REFERENCES master_evidence(id),
    privilege_type TEXT NOT NULL CHECK (privilege_type IN ('attorney_client', 'work_product', 'common_interest')),
    claimed_by UUID REFERENCES users(id),
    claimed_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    waived_by UUID REFERENCES users(id),
    waived_date TIMESTAMP WITH TIME ZONE,
    court_ruling TEXT,
    status TEXT DEFAULT 'claimed' CHECK (status IN ('claimed', 'waived', 'overruled', 'upheld'))
);
```

### Work Product Protection
- **Doctrine Coverage**: Attorney work product privilege
- **Implementation**: Privilege flags on evidence
- **Access Control**: Limited to claiming attorney
- **Waiver Tracking**: Inadvertent disclosure protection

### Common Interest Privilege
- **Shared Defense**: Multiple parties with common interest
- **Implementation**: Privilege sharing rules
- **Access Control**: Extended to common interest parties
- **Waiver Prevention**: Controlled disclosure rules

## Compliance & Regulatory Security

### SOX Compliance (Sarbanes-Oxley)
- **Internal Controls**: Segregation of duties
- **Audit Trail**: Complete transaction logging
- **Change Management**: Controlled evidence modifications
- **Reporting**: Regular compliance reports

### GDPR Compliance (Data Protection)
- **Data Minimization**: Only necessary data collected
- **Right to Erasure**: Controlled deletion procedures
- **Data Portability**: Export capabilities
- **Consent Management**: Explicit consent tracking

### HIPAA Compliance (Healthcare)
- **PHI Protection**: Healthcare information safeguards
- **Access Controls**: Role-based PHI access
- **Audit Logs**: PHI access tracking
- **Breach Notification**: Automated incident response

## Threat Detection & Response

### Anomaly Detection
```sql
-- Detect unusual access patterns
CREATE OR REPLACE FUNCTION detect_access_anomalies(user_uuid UUID, time_window INTERVAL DEFAULT '1 hour')
RETURNS TABLE(
    anomaly_type TEXT,
    access_count INTEGER,
    normal_range INTEGER,
    severity TEXT
) AS $$
BEGIN
    -- Detect unusual access volumes
    RETURN QUERY
    SELECT 
        'high_volume_access' AS anomaly_type,
        COUNT(*)::INTEGER AS access_count,
        (SELECT AVG(hourly_count)::INTEGER FROM user_hourly_access_stats WHERE user_id = user_uuid) AS normal_range,
        CASE 
            WHEN COUNT(*) > (SELECT AVG(hourly_count) * 3 FROM user_hourly_access_stats WHERE user_id = user_uuid) THEN 'HIGH'
            WHEN COUNT(*) > (SELECT AVG(hourly_count) * 2 FROM user_hourly_access_stats WHERE user_id = user_uuid) THEN 'MEDIUM'
            ELSE 'LOW'
        END AS severity
    FROM audit_trail
    WHERE user_id = user_uuid
        AND timestamp > NOW() - time_window
        AND action_type = 'Access';
END;
$$ LANGUAGE plpgsql;
```

### Intrusion Detection
- **Failed Login Monitoring**: Brute force detection
- **Privilege Escalation**: Unauthorized access attempts
- **Data Exfiltration**: Unusual download patterns
- **System Tampering**: Unauthorized modifications

### Incident Response
```sql
-- Security incident logging
CREATE TABLE security_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    description TEXT,
    response_actions JSONB,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id)
);
```

## Disaster Recovery & Business Continuity

### Backup Security
- **Encryption**: AES-256 for all backups
- **Versioning**: Point-in-time recovery
- **Geographic Distribution**: Multiple data centers
- **Testing**: Regular restore testing

### Recovery Procedures
```bash
# Secure backup and recovery
pg_dump --encrypt --compress=9 $NEON_DATABASE_URL > encrypted_backup.sql.gz
gpg --cipher-algo AES256 --compress-algo 2 --symmetric encrypted_backup.sql.gz

# Recovery with integrity verification
gpg --decrypt encrypted_backup.sql.gz.gpg | psql $RECOVERY_DATABASE_URL
```

### High Availability
- **Database Clustering**: Multi-node PostgreSQL
- **Load Balancing**: Distributed request handling
- **Failover**: Automatic system switching
- **Health Monitoring**: Continuous availability checks

## Security Monitoring & Alerting

### Real-Time Monitoring
```javascript
// Security event monitoring
const securityMonitor = {
    // Failed authentication attempts
    failedLogins: (count, timeWindow) => {
        if (count > 5 && timeWindow < 300) { // 5 attempts in 5 minutes
            return { alert: 'BRUTE_FORCE_DETECTED', severity: 'HIGH' };
        }
    },
    
    // Unusual access patterns
    accessPatterns: (userId, accessCount, normalRange) => {
        if (accessCount > normalRange * 3) {
            return { alert: 'ANOMALOUS_ACCESS', severity: 'MEDIUM' };
        }
    },
    
    // Privilege violations
    privilegeViolations: (userId, attemptedResource, userPermissions) => {
        if (!userPermissions.includes(attemptedResource)) {
            return { alert: 'PRIVILEGE_VIOLATION', severity: 'HIGH' };
        }
    }
};
```

### Automated Responses
- **Account Lockout**: Temporary access suspension
- **IP Blocking**: Network-level restrictions
- **Privilege Revocation**: Access level reduction
- **Incident Escalation**: Administrative notification

## Compliance Reporting

### Audit Report Generation
```sql
-- Generate compliance audit report
CREATE OR REPLACE FUNCTION generate_compliance_report(
    report_type TEXT,
    start_date DATE,
    end_date DATE
) RETURNS JSON AS $$
DECLARE
    report_data JSON;
BEGIN
    SELECT json_build_object(
        'report_type', report_type,
        'period', json_build_object('start', start_date, 'end', end_date),
        'evidence_statistics', (
            SELECT json_build_object(
                'total_evidence', COUNT(*),
                'verified_evidence', COUNT(*) FILTER (WHERE source_verification_status = 'Verified'),
                'minted_evidence', COUNT(*) FILTER (WHERE minting_status = 'Minted')
            )
            FROM master_evidence
            WHERE upload_date BETWEEN start_date AND end_date
        ),
        'audit_statistics', (
            SELECT json_build_object(
                'total_actions', COUNT(*),
                'successful_actions', COUNT(*) FILTER (WHERE success_failure = 'Success'),
                'failed_actions', COUNT(*) FILTER (WHERE success_failure = 'Failure')
            )
            FROM audit_trail
            WHERE timestamp::date BETWEEN start_date AND end_date
        ),
        'security_incidents', (
            SELECT json_agg(json_build_object(
                'type', incident_type,
                'severity', severity,
                'resolved', resolved_at IS NOT NULL
            ))
            FROM security_incidents
            WHERE detected_at::date BETWEEN start_date AND end_date
        )
    ) INTO report_data;
    
    RETURN report_data;
END;
$$ LANGUAGE plpgsql;
```

## Security Testing & Validation

### Penetration Testing
- **Quarterly Testing**: External security assessment
- **Vulnerability Scanning**: Automated security scans
- **Code Review**: Static analysis security testing
- **Social Engineering**: Phishing simulation tests

### Security Metrics
```sql
-- Security health metrics
CREATE VIEW security_health_metrics AS
SELECT 
    'authentication_success_rate' AS metric,
    (COUNT(*) FILTER (WHERE success_failure = 'Success') * 100.0 / COUNT(*)) AS value,
    'percentage' AS unit
FROM audit_trail
WHERE action_type = 'Access'
    AND timestamp > NOW() - INTERVAL '24 hours'

UNION ALL

SELECT 
    'average_trust_score' AS metric,
    AVG(trust_score) AS value,
    'score' AS unit
FROM users
WHERE verified_status = true

UNION ALL

SELECT 
    'privilege_violation_rate' AS metric,
    (COUNT(*) * 100.0 / (SELECT COUNT(*) FROM audit_trail WHERE timestamp > NOW() - INTERVAL '24 hours')) AS value,
    'percentage' AS unit
FROM security_incidents
WHERE incident_type = 'PRIVILEGE_VIOLATION'
    AND detected_at > NOW() - INTERVAL '24 hours';
```

## Implementation Checklist

### Database Security
- [ ] Row-level security policies implemented
- [ ] Audit trail immutability enforced
- [ ] Privilege protection controls active
- [ ] Encryption at rest configured

### Application Security
- [ ] MCP server authentication required
- [ ] Role-based access controls implemented
- [ ] Input validation and sanitization
- [ ] Error handling without information leakage

### Network Security
- [ ] TLS 1.3 minimum for all connections
- [ ] API rate limiting implemented
- [ ] IP whitelisting for sensitive operations
- [ ] Network segmentation configured

### Operational Security
- [ ] Security monitoring activated
- [ ] Incident response procedures documented
- [ ] Backup encryption and testing
- [ ] Regular security training conducted

### Compliance Security
- [ ] SOX controls implemented
- [ ] GDPR compliance verified
- [ ] HIPAA safeguards active
- [ ] Legal privilege protection enforced