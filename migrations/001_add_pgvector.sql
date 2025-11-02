-- Migration: Add pgvector extension and vector embedding columns
-- Phase 1: Semantic Search Foundation
-- Date: 2025-11-01

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add vector embedding columns to timeline_entries
ALTER TABLE timeline_entries
ADD COLUMN IF NOT EXISTS description_embedding vector(768),
ADD COLUMN IF NOT EXISTS content_embedding vector(1536),
ADD COLUMN IF NOT EXISTS embedding_model varchar(100),
ADD COLUMN IF NOT EXISTS embedding_generated_at timestamp;

-- Add vector embedding columns to timeline_sources
ALTER TABLE timeline_sources
ADD COLUMN IF NOT EXISTS excerpt_embedding vector(768),
ADD COLUMN IF NOT EXISTS embedding_model varchar(100),
ADD COLUMN IF NOT EXISTS embedding_generated_at timestamp;

-- Create indexes for vector similarity search using IVFFlat
-- IVFFlat is faster than brute force for large datasets
-- lists = 100 is a good starting point for up to 1M vectors
-- Adjust based on dataset size: lists ≈ sqrt(row_count)

-- Index for description embeddings (Legal-BERT, 768 dimensions)
CREATE INDEX IF NOT EXISTS timeline_entries_description_embedding_idx
ON timeline_entries
USING ivfflat (description_embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for content embeddings (OpenAI, 1536 dimensions)
CREATE INDEX IF NOT EXISTS timeline_entries_content_embedding_idx
ON timeline_entries
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for source excerpt embeddings
CREATE INDEX IF NOT EXISTS timeline_sources_excerpt_embedding_idx
ON timeline_sources
USING ivfflat (excerpt_embedding vector_cosine_ops)
WITH (lists = 100);

-- Add index on embedding_generated_at for tracking coverage
CREATE INDEX IF NOT EXISTS timeline_entries_embedding_generated_at_idx
ON timeline_entries (embedding_generated_at)
WHERE embedding_generated_at IS NOT NULL;

-- Create a view for monitoring embedding coverage
CREATE OR REPLACE VIEW embedding_coverage AS
SELECT
  'timeline_entries' as table_name,
  COUNT(*) as total_records,
  COUNT(description_embedding) as embedded_records,
  ROUND(100.0 * COUNT(description_embedding) / NULLIF(COUNT(*), 0), 2) as coverage_percentage,
  MAX(embedding_generated_at) as last_embedding_generated
FROM timeline_entries
WHERE deleted_at IS NULL
UNION ALL
SELECT
  'timeline_sources' as table_name,
  COUNT(*) as total_records,
  COUNT(excerpt_embedding) as embedded_records,
  ROUND(100.0 * COUNT(excerpt_embedding) / NULLIF(COUNT(*), 0), 2) as coverage_percentage,
  MAX(embedding_generated_at) as last_embedding_generated
FROM timeline_sources;

-- Create function to get similar entries by vector similarity
CREATE OR REPLACE FUNCTION find_similar_entries(
  query_embedding vector(768),
  case_filter uuid DEFAULT NULL,
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 20
)
RETURNS TABLE (
  entry_id uuid,
  similarity float,
  description text,
  date date,
  entry_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    te.id,
    1 - (te.description_embedding <=> query_embedding) as similarity,
    te.description,
    te.date,
    te.entry_type::text
  FROM timeline_entries te
  WHERE te.deleted_at IS NULL
    AND te.description_embedding IS NOT NULL
    AND (case_filter IS NULL OR te.case_id = case_filter)
    AND (1 - (te.description_embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY te.description_embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON COLUMN timeline_entries.description_embedding IS 'Legal-BERT embedding (768-dim) for semantic search on description field';
COMMENT ON COLUMN timeline_entries.content_embedding IS 'OpenAI embedding (1536-dim) for full content semantic search';
COMMENT ON COLUMN timeline_entries.embedding_model IS 'Model used to generate embedding (e.g., legal-bert-base, text-embedding-3-small)';
COMMENT ON COLUMN timeline_entries.embedding_generated_at IS 'Timestamp when embedding was generated, NULL if not yet embedded';

COMMENT ON FUNCTION find_similar_entries IS 'Find semantically similar timeline entries using vector similarity search';
COMMENT ON VIEW embedding_coverage IS 'Monitor percentage of records with embeddings generated';

-- Migration complete
-- Next steps:
-- 1. Run embedding generation for existing records
-- 2. Update application code to generate embeddings on insert/update
-- 3. Deploy hybrid search API endpoints
