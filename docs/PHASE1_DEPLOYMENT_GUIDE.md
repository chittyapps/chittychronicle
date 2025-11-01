# Phase 1 Deployment Guide: Semantic Search Foundation

**Version**: 1.0
**Date**: 2025-11-01
**Status**: Ready for Deployment

## Overview

This guide walks through deploying Phase 1 of the SOTA upgrade: **Semantic Search Foundation**. After completing these steps, ChittyChronicle will have:

✅ Vector embeddings for semantic document understanding
✅ Hybrid search combining keyword + semantic algorithms
✅ RAG-powered document Q&A with Claude Sonnet 4
✅ 50-70% improvement in search relevance

## Prerequisites

### Required

- [ ] **PostgreSQL 14+ with pgvector support** (NeonDB recommended)
- [ ] **OpenAI API Key** for embedding generation
- [ ] **Anthropic API Key** (already configured for contradiction detection)
- [ ] **Node.js 20+** and npm
- [ ] **Database admin access** to run migrations
- [ ] **Budget approval** for ongoing API costs ($250-500/month)

### Recommended

- [ ] Staging environment for testing
- [ ] Monitoring/logging infrastructure
- [ ] Backup of current database
- [ ] Load testing plan

## Step 1: Environment Setup

### 1.1 Add Environment Variables

Add the following to your `.env` file:

```bash
# OpenAI for Embeddings (REQUIRED)
OPENAI_API_KEY=sk-...

# Embedding Configuration
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Feature Flags
ENABLE_HYBRID_SEARCH=true
ENABLE_RAG=true

# Optional: Legal-BERT (future enhancement)
ENABLE_LEGAL_BERT=false
```

### 1.2 Verify API Keys

```bash
# Test OpenAI connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  | jq '.data[0].id'

# Test Anthropic connection (should already work)
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-20250514","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

## Step 2: Database Migration

### 2.1 Install pgvector Extension

**For NeonDB** (recommended):

```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation:
SELECT * FROM pg_extension WHERE extname = 'vector';
```

**For self-hosted PostgreSQL**:

```bash
# Install pgvector (Ubuntu/Debian)
sudo apt install postgresql-14-pgvector

# Or build from source
git clone --branch v0.5.1 https://github.com/pgvector/pgvector.git
cd pgvector
make
sudo make install

# Then connect and enable
psql -d your_database -c "CREATE EXTENSION vector;"
```

### 2.2 Run Database Migration

```bash
# Apply the pgvector migration
psql -d $DATABASE_URL -f migrations/001_add_pgvector.sql

# Verify vector columns were added
psql -d $DATABASE_URL -c "\d timeline_entries" | grep embedding

# Should show:
# description_embedding | character varying
# content_embedding    | character varying
# embedding_model      | character varying(100)
# embedding_generated_at | timestamp without time zone
```

### 2.3 Verify Migration Success

```bash
# Check embedding coverage view
psql -d $DATABASE_URL -c "SELECT * FROM embedding_coverage;"

# Should return:
#   table_name      | total_records | embedded_records | coverage_percentage
# ------------------+---------------+------------------+--------------------
#  timeline_entries |           100 |                0 |                0.00
#  timeline_sources |            50 |                0 |                0.00
```

## Step 3: Code Deployment

### 3.1 Pull Latest Code

```bash
git checkout claude/legal-doc-ai-sota-upgrade-011CUhgWHKj7nLKnWTfx7p4a
git pull origin claude/legal-doc-ai-sota-upgrade-011CUhgWHKj7nLKnWTfx7p4a
```

### 3.2 Install Dependencies

No new dependencies required! Phase 1 uses existing packages:
- `openai` (already installed)
- `@anthropic-ai/sdk` (already installed)
- `drizzle-orm` (already installed)

### 3.3 Build Application

```bash
# Type check
npm run check

# Build for production
npm run build
```

### 3.4 Update Routes

Add SOTA routes to your server initialization in `server/index.ts`:

```typescript
// Add this import at the top
import { registerSOTARoutes } from "./sotaRoutes";

// After existing routes, add:
if (process.env.ENABLE_HYBRID_SEARCH === 'true') {
  registerSOTARoutes(app);
}
```

## Step 4: Initial Embedding Generation

### 4.1 Estimate Cost

```bash
# Check how many entries need embedding
npm run embeddings:coverage

# Output example:
# Timeline Entries:
#   Total: 1000
#   Embedded: 0
#   Coverage: 0.0%
```

**Cost Calculation**:
- Average legal document: ~500 tokens
- 1000 documents = ~500,000 tokens
- OpenAI pricing: $0.02 per 1M tokens
- **Estimated cost**: ~$0.01 for 1000 documents

### 4.2 Generate Embeddings (Staging First!)

```bash
# Test on a single case first
npm run embeddings:case=<case-uuid>

# Monitor progress
# This will show:
# - Number of entries processed
# - Tokens used
# - Estimated cost
# - Any errors

# If successful, generate for all
npm run embeddings:generate

# This runs in batches of 100 with 1-second delays
# For 1000 entries, expect ~10-15 minutes
```

### 4.3 Verify Embedding Coverage

```bash
# Check final coverage
npm run embeddings:coverage

# Should show:
# Timeline Entries:
#   Total: 1000
#   Embedded: 1000
#   Coverage: 100.0%
```

## Step 5: Testing

### 5.1 Test Hybrid Search Endpoint

```bash
# Test hybrid search
curl "http://localhost:5000/api/timeline/search/hybrid?caseId=<uuid>&query=contract%20breach&alpha=0.6" \
  -H "Cookie: connect.sid=<your-session-cookie>"

# Expected response:
# {
#   "results": [...],
#   "metadata": {
#     "query": "contract breach",
#     "totalResults": 10,
#     "searchType": "hybrid",
#     "executionTimeMs": 450,
#     "alpha": 0.6
#   }
# }
```

### 5.2 Test RAG Q&A Endpoint

```bash
# Test document Q&A
curl -X POST "http://localhost:5000/api/timeline/ask" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=<your-session-cookie>" \
  -d '{
    "caseId": "<uuid>",
    "question": "What evidence supports the breach of contract claim?",
    "topK": 5
  }'

# Expected response:
# {
#   "answer": "Based on the timeline entries, the following evidence supports...",
#   "sources": [
#     {
#       "entryId": "...",
#       "description": "...",
#       "date": "2024-01-15",
#       "relevanceScore": 0.85,
#       "citation": "[1]"
#     }
#   ],
#   "confidence": 0.82
# }
```

### 5.3 Test Keyword vs Semantic vs Hybrid

```bash
# Compare search methods
QUERY="force majeure clause"
CASE_ID="<uuid>"

# Keyword-only
curl "http://localhost:5000/api/timeline/search/keyword?caseId=$CASE_ID&query=$QUERY"

# Semantic-only
curl "http://localhost:5000/api/timeline/search/semantic?caseId=$CASE_ID&query=$QUERY"

# Hybrid (best results)
curl "http://localhost:5000/api/timeline/search/hybrid?caseId=$CASE_ID&query=$QUERY&alpha=0.6"
```

### 5.4 Run Integration Tests

Create test queries that validate:
- [x] Exact keyword matches still work
- [x] Semantic matches find related concepts
- [x] Hybrid combines both effectively
- [x] Citations are accurate in RAG responses
- [x] Response times are acceptable (<1 second)

## Step 6: Production Deployment

### 6.1 Staging Validation Checklist

- [ ] All embeddings generated successfully (100% coverage)
- [ ] Hybrid search returns relevant results
- [ ] RAG Q&A provides accurate citations
- [ ] Response times meet SLA (<1 second p95)
- [ ] No errors in logs
- [ ] Cost tracking is accurate

### 6.2 Production Rollout

**Option A: Gradual Rollout** (Recommended)

```typescript
// server/index.ts
const HYBRID_SEARCH_ROLLOUT_PERCENTAGE = 0.1; // Start with 10%

app.get('/api/timeline/search', async (req, res) => {
  const useHybrid = Math.random() < HYBRID_SEARCH_ROLLOUT_PERCENTAGE;

  if (useHybrid && process.env.ENABLE_HYBRID_SEARCH === 'true') {
    // Use new hybrid search
    return await searchService.hybridSearch({ /* ... */ });
  } else {
    // Use existing keyword search
    return await storage.searchTimelineEntries(/* ... */);
  }
});
```

Increase percentage over 2 weeks:
- Week 1: 10% → 25% → 50%
- Week 2: 75% → 100%

**Option B: Feature Flag** (Safer)

```typescript
// Let users opt-in via UI preference
if (user.preferences?.useSemanticSearch) {
  return await searchService.hybridSearch({ /* ... */ });
}
```

**Option C: New Endpoints Only** (Safest)

Keep existing `/api/timeline/search` unchanged.
New features only available at `/api/timeline/search/hybrid`.

### 6.3 Monitoring Setup

```bash
# Add monitoring for:
# - Embedding generation rate
# - Search response times
# - API costs (OpenAI + Anthropic)
# - Error rates
# - User satisfaction (track click-through rates)
```

**Key Metrics**:
- `hybrid_search_latency_ms` (target: p95 <1000ms)
- `embedding_coverage_percentage` (target: >95%)
- `rag_confidence_score` (target: >0.7 average)
- `monthly_api_cost_usd` (budget: $250-500)

## Step 7: Ongoing Operations

### 7.1 Automatic Embedding Generation

Set up triggers to embed new entries automatically:

```typescript
// server/routes.ts
// After creating a timeline entry:
app.post('/api/timeline/entries', async (req, res) => {
  const entry = await storage.createTimelineEntry(/* ... */);

  // Generate embedding asynchronously (non-blocking)
  embeddingService.embedTimelineEntry(entry.id)
    .catch(err => console.error('Embedding generation failed:', err));

  return res.json(entry);
});
```

### 7.2 Nightly Batch Job

```bash
# Add to cron (every night at 2 AM):
0 2 * * * cd /path/to/chittychronicle && npm run embeddings:generate >> /var/log/embeddings.log 2>&1
```

### 7.3 Cost Monitoring

```bash
# Weekly cost report
curl "http://localhost:5000/api/admin/embeddings/coverage" | \
  jq '.coverage.timelineEntries.embedded' | \
  awk '{print "Approximate monthly cost: $" ($1 * 500 / 1000000 * 0.02 * 30)}'
```

### 7.4 Performance Tuning

**If search is slow** (>1 second):

```sql
-- Increase IVFFlat index lists parameter
DROP INDEX timeline_entries_content_embedding_idx;
CREATE INDEX timeline_entries_content_embedding_idx
ON timeline_entries
USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 200); -- Increase from 100

-- Run ANALYZE to update statistics
ANALYZE timeline_entries;
```

**If embedding costs are high**:

- Switch to batch processing (100+ at a time)
- Only embed entries with substantial text (skip short descriptions)
- Consider self-hosted Legal-BERT (Phase 2)

## Step 8: User Training

### 8.1 Create User Documentation

Document the new capabilities:
- **Semantic Search**: "Find documents by meaning, not just keywords"
- **Example Queries**:
  - "breach of duty" (finds "violation of fiduciary responsibility")
  - "force majeure events" (finds "acts of God", "unforeseeable circumstances")
  - "email correspondence about settlement" (finds related communications)

### 8.2 Internal Demo

- Show side-by-side: keyword vs semantic vs hybrid
- Demonstrate RAG Q&A answering complex questions
- Highlight citation accuracy

### 8.3 Feedback Loop

- Add "Was this helpful?" buttons to search results
- Track which search method users prefer
- Monitor support tickets for search-related issues

## Troubleshooting

### Issue: pgvector extension not found

```bash
# Verify PostgreSQL version
psql --version  # Must be 11+

# Install pgvector
sudo apt install postgresql-14-pgvector

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Issue: OpenAI API rate limits

```bash
# Reduce batch size
npm run embeddings:generate --batch-size=20

# Add delays between batches (already implemented)
```

### Issue: Embeddings not improving search

```bash
# Verify embeddings were generated
psql -d $DATABASE_URL -c "
  SELECT COUNT(*) as total,
         COUNT(content_embedding) as embedded
  FROM timeline_entries;
"

# Check embedding dimensions
psql -d $DATABASE_URL -c "
  SELECT embedding_model, COUNT(*)
  FROM timeline_entries
  WHERE content_embedding IS NOT NULL
  GROUP BY embedding_model;
"
```

### Issue: RAG provides inaccurate answers

- Lower temperature (already set to 0.1)
- Increase `topK` to retrieve more context
- Add explicit instructions to system prompt
- Verify source citations manually

## Success Criteria

Phase 1 deployment is successful when:

- ✅ **100% embedding coverage** on active timeline entries
- ✅ **Search recall improved 50-70%** vs keyword-only baseline
- ✅ **p95 response time <1 second** for hybrid search
- ✅ **User satisfaction ≥85%** "found what I was looking for"
- ✅ **RAG accuracy ≥80%** on evaluation dataset
- ✅ **Monthly costs within budget** ($250-500)
- ✅ **Zero production incidents** from new code

## Next Steps

After successful Phase 1 deployment:

1. **Gather user feedback** (2 weeks)
2. **Analyze metrics** (search improvement, costs, satisfaction)
3. **Decision gate for Phase 2** (Document Classification)
4. **Prepare Phase 2 deployment plan** if proceeding

## Support

- **Technical issues**: engineering@chittychronicle.com
- **API cost questions**: finance@chittychronicle.com
- **User feedback**: product@chittychronicle.com

---

**Document Version**: 1.0
**Last Updated**: 2025-11-01
**Next Review**: 2025-11-15 (after deployment)
