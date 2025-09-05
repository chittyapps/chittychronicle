
-- cross_source_merge_schema.sql
-- Neon/PostgreSQL schema for unified communications timeline

BEGIN;

-- Enum for message source
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_source') THEN
        CREATE TYPE message_source AS ENUM ('imessage','whatsapp','email','docusign','openphone');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS parties (
    party_id        BIGSERIAL PRIMARY KEY,
    display_name    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_identifiers (
    party_identifier_id BIGSERIAL PRIMARY KEY,
    party_id            BIGINT NOT NULL REFERENCES parties(party_id) ON DELETE CASCADE,
    id_type             TEXT NOT NULL CHECK (id_type IN ('email','phone','whatsapp_jid','imessage','docusign','openphone','other')),
    identifier          TEXT NOT NULL,
    normalized_identifier TEXT GENERATED ALWAYS AS (
        CASE
            WHEN id_type = 'email' THEN lower(btrim(identifier))
            WHEN id_type = 'phone' THEN regexp_replace(identifier, '[^0-9\+]', '', 'g')
            ELSE lower(btrim(identifier))
        END
    ) STORED
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_party_identifier_unique
    ON party_identifiers (id_type, normalized_identifier);

CREATE TABLE IF NOT EXISTS conversations (
    conversation_id     BIGSERIAL PRIMARY KEY,
    source              message_source,
    external_thread_id  TEXT,
    soft_key            TEXT,
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    confidence          NUMERIC(4,3) DEFAULT 1.000,
    UNIQUE (source, external_thread_id)
);

CREATE TABLE IF NOT EXISTS messages (
    message_id          BIGSERIAL PRIMARY KEY,
    source              message_source NOT NULL,
    external_id         TEXT,
    external_thread_id  TEXT,
    direction           TEXT CHECK (direction IN ('inbound','outbound','system')),
    sender_party_id     BIGINT REFERENCES parties(party_id),
    subject             TEXT,
    body_text           TEXT,
    normalized_text     TEXT GENERATED ALWAYS AS (
        lower(regexp_replace(coalesce(body_text,''), '\s+', ' ', 'g'))
    ) STORED,
    content_hash        TEXT GENERATED ALWAYS AS (md5(coalesce(normalized_text,''))) STORED,
    sent_at             TIMESTAMPTZ NOT NULL,
    received_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_messages_sent_at ON messages(sent_at);
CREATE INDEX IF NOT EXISTS ix_messages_content_hash ON messages(content_hash);

-- Full-text search
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS fts tsvector
        GENERATED ALWAYS AS (to_tsvector('english', coalesce(subject,'') || ' ' || coalesce(body_text,''))) STORED;
CREATE INDEX IF NOT EXISTS ix_messages_fts ON messages USING GIN (fts);

CREATE TABLE IF NOT EXISTS message_parties (
    message_id  BIGINT NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
    party_id    BIGINT NOT NULL REFERENCES parties(party_id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('sender','recipient','cc','bcc','signer','other')),
    PRIMARY KEY (message_id, party_id, role)
);
CREATE INDEX IF NOT EXISTS ix_message_parties_party ON message_parties(party_id);

CREATE TABLE IF NOT EXISTS conversation_messages (
    conversation_id BIGINT NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    message_id      BIGINT NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, message_id)
);

CREATE TABLE IF NOT EXISTS attachments (
    attachment_id   BIGSERIAL PRIMARY KEY,
    message_id      BIGINT NOT NULL REFERENCES messages(message_id) ON DELETE CASCADE,
    file_name       TEXT,
    mime_type       TEXT,
    url             TEXT,
    sha256          TEXT,
    size_bytes      BIGINT
);

COMMIT;
