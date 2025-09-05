
-- cross_source_queries.sql
BEGIN;

CREATE OR REPLACE VIEW v_unified_timeline AS
SELECT
    m.message_id,
    m.source,
    m.sent_at,
    m.direction,
    m.subject,
    m.body_text,
    m.content_hash,
    (SELECT string_agg(DISTINCT pi.identifier, ', ')
     FROM message_parties mp
     JOIN party_identifiers pi ON pi.party_id = mp.party_id
     WHERE mp.message_id = m.message_id AND mp.role = 'sender'
    ) AS from_identities,
    (SELECT string_agg(DISTINCT pi.identifier, ', ')
     FROM message_parties mp
     JOIN party_identifiers pi ON pi.party_id = mp.party_id
     WHERE mp.message_id = m.message_id AND mp.role IN ('recipient','cc','bcc','signer')
    ) AS to_identities
FROM messages m
ORDER BY m.sent_at, m.message_id;

CREATE OR REPLACE VIEW v_party_activity AS
SELECT
    p.party_id,
    coalesce(p.display_name, min(pi.identifier)) AS label,
    count(DISTINCT m.message_id) AS message_count,
    jsonb_object_agg(m.source, cnt) FILTER (WHERE cnt IS NOT NULL) AS by_source
FROM parties p
JOIN party_identifiers pi ON pi.party_id = p.party_id
LEFT JOIN LATERAL (
    SELECT m.source, count(*) AS cnt
    FROM message_parties mp
    JOIN messages m ON m.message_id = mp.message_id
    WHERE mp.party_id = p.party_id
    GROUP BY m.source
) s ON true
GROUP BY p.party_id
ORDER BY message_count DESC;

COMMIT;
