
-- cross_source_merge_functions.sql
BEGIN;

-- Normalize helpers
CREATE OR REPLACE FUNCTION normalize_identifier(p_id_type TEXT, p_identifier TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN p_id_type = 'email' THEN lower(btrim(p_identifier))
        WHEN p_id_type = 'phone' THEN regexp_replace(p_identifier, '[^0-9\+]', '', 'g')
        ELSE lower(btrim(p_identifier))
    END;
$$;

-- Upsert or fetch a party by identifier
CREATE OR REPLACE FUNCTION upsert_party(p_id_type TEXT, p_identifier TEXT, p_display_name TEXT DEFAULT NULL)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    norm TEXT := normalize_identifier(p_id_type, p_identifier);
    pid  BIGINT;
BEGIN
    SELECT pi.party_id INTO pid
    FROM party_identifiers pi
    WHERE pi.id_type = p_id_type AND pi.normalized_identifier = norm
    LIMIT 1;

    IF pid IS NOT NULL THEN
        RETURN pid;
    END IF;

    INSERT INTO parties(display_name) VALUES (p_display_name) RETURNING party_id INTO pid;
    INSERT INTO party_identifiers(party_id, id_type, identifier) VALUES (pid, p_id_type, p_identifier)
    ON CONFLICT (id_type, normalized_identifier) DO NOTHING;
    RETURN pid;
END;
$$;

-- Link an additional identifier to an existing party
CREATE OR REPLACE FUNCTION link_identifier(p_party_id BIGINT, p_id_type TEXT, p_identifier TEXT)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO party_identifiers(party_id, id_type, identifier)
    VALUES (p_party_id, p_id_type, p_identifier)
    ON CONFLICT (id_type, normalized_identifier) DO UPDATE
      SET party_id = EXCLUDED.party_id;
END;
$$;

-- Probable duplicate detection within ±3 minutes
CREATE OR REPLACE FUNCTION is_probable_duplicate(p_source message_source, p_content_hash TEXT, p_sent_at TIMESTAMPTZ, p_sender BIGINT)
RETURNS BOOLEAN
LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM messages m
        WHERE m.source = p_source
          AND m.content_hash = p_content_hash
          AND m.sender_party_id IS NOT DISTINCT FROM p_sender
          AND m.sent_at BETWEEN p_sent_at - interval '3 minutes' AND p_sent_at + interval '3 minutes'
    );
$$;

-- Attach or create conversation
CREATE OR REPLACE FUNCTION attach_conversation(p_message_id BIGINT)
RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    v_source message_source;
    v_thread TEXT;
    v_sent   TIMESTAMPTZ;
    v_conv   BIGINT;
BEGIN
    SELECT source, external_thread_id, sent_at INTO v_source, v_thread, v_sent
    FROM messages WHERE message_id = p_message_id;

    IF v_thread IS NOT NULL THEN
        INSERT INTO conversations(source, external_thread_id, started_at, last_message_at, confidence)
        VALUES (v_source, v_thread, v_sent, v_sent, 1.0)
        ON CONFLICT (source, external_thread_id) DO UPDATE
           SET last_message_at = GREATEST(conversations.last_message_at, EXCLUDED.last_message_at)
        RETURNING conversation_id INTO v_conv;
    ELSE
        -- Soft key based on 2-hour bucket and participants
        WITH parts AS (
            SELECT string_agg(distinct p.normalized_identifier, ',' ORDER BY p.normalized_identifier) AS fp
            FROM (
                SELECT pi.normalized_identifier
                FROM message_parties mp
                JOIN party_identifiers pi ON pi.party_id = mp.party_id
                WHERE mp.message_id = p_message_id
            ) p
        )
        INSERT INTO conversations(source, soft_key, started_at, last_message_at, confidence)
        SELECT v_source,
               md5(date_trunc('hour', v_sent)::text || ':' ||
                   to_char(date_trunc('hour', v_sent) + interval '2 hour','YYYY-MM-DD\"T\"HH24') || ':' ||
                   fp),
               v_sent, v_sent, 0.6
        FROM parts
        RETURNING conversation_id INTO v_conv;
    END IF;

    INSERT INTO conversation_messages(conversation_id, message_id)
    VALUES (v_conv, p_message_id)
    ON CONFLICT DO NOTHING;

    RETURN v_conv;
END;
$$;

-- Record a message end-to-end, with simple dedup check
CREATE OR REPLACE FUNCTION record_message(
    p_source message_source,
    p_external_id TEXT,
    p_external_thread_id TEXT,
    p_direction TEXT,
    p_sender_id_type TEXT,
    p_sender_identifier TEXT,
    p_recipient_id_type TEXT,
    p_recipient_identifier TEXT,
    p_subject TEXT,
    p_body_text TEXT,
    p_sent_at TIMESTAMPTZ
) RETURNS BIGINT
LANGUAGE plpgsql AS $$
DECLARE
    sender_pid BIGINT;
    recip_pid  BIGINT;
    mid        BIGINT;
    chash      TEXT;
BEGIN
    sender_pid := upsert_party(p_sender_id_type, p_sender_identifier, NULL);
    recip_pid  := upsert_party(p_recipient_id_type, p_recipient_identifier, NULL);

    INSERT INTO messages(source, external_id, external_thread_id, direction, sender_party_id, subject, body_text, sent_at)
    VALUES (p_source, p_external_id, p_external_thread_id, p_direction, sender_pid, p_subject, p_body_text, p_sent_at)
    RETURNING message_id, content_hash INTO mid, chash;

    IF is_probable_duplicate(p_source, chash, p_sent_at, sender_pid) THEN
        DELETE FROM messages WHERE message_id = mid;
        RETURN NULL;
    END IF;

    INSERT INTO message_parties(message_id, party_id, role) VALUES
        (mid, sender_pid, 'sender'),
        (mid, recip_pid, 'recipient')
    ON CONFLICT DO NOTHING;

    PERFORM attach_conversation(mid);
    RETURN mid;
END;
$$;

-- Search messages with optional filters
CREATE OR REPLACE FUNCTION search_messages(
    p_query TEXT,
    p_source message_source DEFAULT NULL,
    p_start DATE DEFAULT NULL,
    p_end   DATE DEFAULT NULL
)
RETURNS TABLE (
    message_id BIGINT,
    source message_source,
    sent_at TIMESTAMPTZ,
    subject TEXT,
    snippet TEXT,
    rank REAL
)
LANGUAGE sql STABLE AS $$
    WITH base AS (
        SELECT m.*,
               ts_rank(m.fts, plainto_tsquery('english', coalesce(p_query,''))) AS rank
        FROM messages m
        WHERE (p_source IS NULL OR m.source = p_source)
          AND (p_start IS NULL OR m.sent_at >= p_start::timestamptz)
          AND (p_end   IS NULL OR m.sent_at < (p_end::timestamptz + interval '1 day'))
          AND (p_query IS NULL OR m.fts @@ plainto_tsquery('english', p_query))
    )
    SELECT message_id, source, sent_at, subject,
           CASE
             WHEN length(body_text) > 180 THEN substr(body_text, 1, 177) || '...'
             ELSE body_text
           END AS snippet,
           rank
    FROM base
    ORDER BY sent_at, message_id;
$$;

-- Find all messages for a party by any identifier
CREATE OR REPLACE FUNCTION find_party_messages(p_identifier TEXT)
RETURNS TABLE (
    message_id BIGINT,
    source message_source,
    sent_at TIMESTAMPTZ,
    subject TEXT,
    body_text TEXT
)
LANGUAGE sql STABLE AS $$
    WITH target_party AS (
        SELECT pi.party_id
        FROM party_identifiers pi
        WHERE pi.normalized_identifier = normalize_identifier(
            CASE WHEN position('@' IN p_identifier) > 0 THEN 'email'
                 WHEN p_identifier ~ '^[0-9\+\-\(\) ]+$' THEN 'phone'
                 ELSE 'other' END, p_identifier)
        LIMIT 1
    )
    SELECT m.message_id, m.source, m.sent_at, m.subject, m.body_text
    FROM messages m
    JOIN message_parties mp ON mp.message_id = m.message_id
    WHERE mp.party_id IN (SELECT party_id FROM target_party)
    ORDER BY m.sent_at, m.message_id;
$$;

-- Case timeline for a set of identifiers
CREATE OR REPLACE FUNCTION generate_case_timeline(p_start DATE, p_end DATE, p_identifiers TEXT[])
RETURNS TABLE(
    sent_at TIMESTAMPTZ,
    source message_source,
    direction TEXT,
    subject TEXT,
    body_text TEXT,
    sender TEXT,
    recipients TEXT
)
LANGUAGE sql STABLE AS $$
    WITH ids AS (
        SELECT DISTINCT normalize_identifier(
            CASE WHEN position('@' IN id) > 0 THEN 'email'
                 WHEN id ~ '^[0-9\+\-\(\) ]+$' THEN 'phone'
                 ELSE 'other' END, id) AS norm
        FROM unnest(p_identifiers) AS id
    ), parties_hit AS (
        SELECT DISTINCT pi.party_id
        FROM party_identifiers pi
        JOIN ids ON ids.norm = pi.normalized_identifier
    ),
    msgs As (
        SELECT m.*
        FROM messages m
        WHERE m.sent_at >= p_start::timestamptz
          AND m.sent_at <  (p_end::timestamptz + interval '1 day')
          AND EXISTS (
              SELECT 1 FROM message_parties mp
              WHERE mp.message_id = m.message_id AND mp.party_id IN (SELECT party_id FROM parties_hit)
          )
    )
    SELECT m.sent_at, m.source, m.direction, m.subject, m.body_text,
           (SELECT string_agg(distinct pi2.identifier, ', ')
              FROM message_parties mp2
              JOIN party_identifiers pi2 ON pi2.party_id = mp2.party_id
              WHERE mp2.message_id = m.message_id AND mp2.role = 'sender') AS sender,
           (SELECT string_agg(distinct pi3.identifier, ', ')
              FROM message_parties mp3
              JOIN party_identifiers pi3 ON pi3.party_id = mp3.party_id
              WHERE mp3.message_id = m.message_id AND mp3.role IN ('recipient','cc','bcc','signer')) AS recipients
    FROM msgs m
    ORDER BY m.sent_at;
$$;

COMMIT;
