
-- openphone_ingest.sql
BEGIN;

DROP TABLE IF EXISTS staging_openphone_messages;
CREATE TABLE staging_openphone_messages (
    message_id TEXT,
    direction TEXT,
    from_number TEXT,
    to_number TEXT,
    body TEXT,
    created_at TIMESTAMPTZ,
    conversation_id TEXT
);

-- Expect: \copy staging_openphone_messages FROM 'OpenPhone Data/ORuce0BjRH_messages.csv' WITH CSV HEADER

INSERT INTO messages(source, external_id, external_thread_id, direction, sender_party_id, subject, body_text, sent_at)
SELECT
    'openphone'::message_source,
    message_id,
    conversation_id,
    direction,
    CASE WHEN direction = 'outbound'
         THEN upsert_party('phone', from_number, NULL)
         ELSE upsert_party('phone', to_number, NULL)
    END,
    NULL,
    body,
    created_at
FROM staging_openphone_messages;

-- Link participants
INSERT INTO message_parties(message_id, party_id, role)
SELECT m.message_id,
       CASE WHEN s.direction = 'outbound'
            THEN upsert_party('phone', s.from_number, NULL)
            ELSE upsert_party('phone', s.to_number, NULL)
       END,
       'sender'
FROM staging_openphone_messages s
JOIN messages m ON m.external_id = s.message_id AND m.source = 'openphone';

INSERT INTO message_parties(message_id, party_id, role)
SELECT m.message_id,
       CASE WHEN s.direction = 'outbound'
            THEN upsert_party('phone', s.to_number, NULL)
            ELSE upsert_party('phone', s.from_number, NULL)
       END,
       'recipient'
FROM staging_openphone_messages s
JOIN messages m ON m.external_id = s.message_id AND m.source = 'openphone';

-- Attach conversations
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT message_id FROM messages WHERE source = 'openphone'
    LOOP
        PERFORM attach_conversation(r.message_id);
    END LOOP;
END$$;

COMMIT;
