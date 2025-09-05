
-- cross_source_ingest.sql
BEGIN;

DROP TABLE IF EXISTS staging_messages;
CREATE TABLE staging_messages (
    sent_at             TIMESTAMPTZ,
    source              TEXT,
    direction           TEXT,
    sender_id_type      TEXT,
    sender_identifier   TEXT,
    recipient_id_type   TEXT,
    recipient_identifier TEXT,
    subject             TEXT,
    body_text           TEXT,
    external_thread_id  TEXT,
    external_id         TEXT
);

-- After \copy into staging_messages, run the normalization:
INSERT INTO messages(source, external_id, external_thread_id, direction, sender_party_id, subject, body_text, sent_at)
SELECT
    source::message_source,
    external_id,
    external_thread_id,
    direction,
    upsert_party(sender_id_type, sender_identifier, NULL),
    NULLIF(subject,''),
    body_text,
    sent_at
FROM staging_messages;

-- Link parties for each row
INSERT INTO message_parties(message_id, party_id, role)
SELECT m.message_id,
       upsert_party(s.sender_id_type, s.sender_identifier, NULL),
       'sender'
FROM staging_messages s
JOIN messages m ON m.external_id IS NOT DISTINCT FROM s.external_id
               AND m.sent_at = s.sent_at
               AND m.source = s.source::message_source;

INSERT INTO message_parties(message_id, party_id, role)
SELECT m.message_id,
       upsert_party(s.recipient_id_type, s.recipient_identifier, NULL),
       'recipient'
FROM staging_messages s
JOIN messages m ON m.external_id IS NOT DISTINCT FROM s.external_id
               AND m.sent_at = s.sent_at
               AND m.source = s.source::message_source;

-- Attach conversations
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT message_id FROM messages
             WHERE NOT EXISTS (SELECT 1 FROM conversation_messages cm WHERE cm.message_id = messages.message_id)
    LOOP
        PERFORM attach_conversation(r.message_id);
    END LOOP;
END$$;

COMMIT;
