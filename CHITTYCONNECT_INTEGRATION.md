# ChittyConnect Integration for ChittyChronicle

**Date**: 2025-10-21
**Status**: Implementation Complete - Ready for Testing

## Overview

ChittyChronicle now properly integrates with **ChittyConnect** as the central coordination layer for all platform and service connections, following ChittyOS architectural standards.

## Architecture Change

### Before (Incorrect):
```
Platforms (iMessage, WhatsApp, etc.) → ChittyChronicle (direct integration)
                                            ↓
                                      ChittyConnect (event emission only)
```

### After (Correct):
```
Platforms (iMessage, WhatsApp, etc.)
    ↓ webhooks
ChittyConnect (integration hub + intelligence)
    ↓ REST API
ChittyChronicle (consumes data + publishes timeline events)
    ↓ context events
ChittyConnect (audit trail + memory storage)
```

## New Components

### 1. **ChittyConnect Client** (`server/chittyConnectClient.ts`)

Provides programmatic access to all ChittyConnect capabilities:

**Platform Message Consumption**:
- `getMessages()` - Fetch messages from specific platforms
- `getConversations()` - Get conversation threads
- `getAggregatedMessages()` - Cross-platform message aggregation

**Intelligence APIs**:
- `persistMemory()` - Store interaction context in MemoryCloude™
- `recallMemory()` - Semantic search across conversation history
- `getEcosystemAwareness()` - Real-time service health + anomaly detection
- `executeTask()` - Cognitive-Coordination™ for multi-step workflows

**Service Coordination**:
- `logTimelineEvent()` - Publish events to ChittyConnect audit trail
- `getEntityTimeline()` - Retrieve event history for entities
- `getServicesStatus()` - Check all ChittyOS services

**Third-Party Proxies**:
- `queryNotion()` - Query Notion databases via ChittyConnect
- `getCalendarEvents()` - Google Calendar integration

###2. **Communications Service** (`server/communicationsService.ts`)

Orchestrates platform data consumption and timeline generation:

**Key Methods**:
- `syncMessagesFromChittyConnect()` - Pull platform messages and store locally
- `getCommunicationsSummary()` - Aggregated communications analytics
- `generateTimelineFromMessages()` - AI-powered timeline extraction
- `storeMessageLocally()` - Cache messages for timeline linking

**Data Flow**:
1. Messages arrive at ChittyConnect via platform webhooks
2. ChittyChronicle pulls messages via `chittyConnect.getMessages()`
3. Local storage caches messages for timeline integration
4. Timeline entries link to source messages via `messageId` + `messageSource`

### 3. **New API Routes** (`server/routes.ts`)

#### Platform Integration Routes:

```http
POST /api/cases/:caseId/communications/sync
Body: { platforms: ['imessage', 'whatsapp'], startDate, endDate }
Response: { success: true, synced: 42, messages: [...] }
```

Syncs messages from ChittyConnect for specified platforms.

```http
GET /api/cases/:caseId/communications-summary
Response: {
  summary: { totalParties, totalConversations, totalMessages, messagesBySource },
  parties: [...],
  recentMessages: [...]
}
```

Returns aggregated communications analytics (auto-syncs from ChittyConnect if empty).

```http
POST /api/cases/:caseId/communications/generate-timeline
Body: { conversationId: 'optional' }
Response: { success: true, generated: 5, entries: [...] }
```

Uses ChittyConnect's Cognitive-Coordination™ to extract legal events from messages.

#### Ecosystem Health Route:

```http
GET /api/chittyconnect/ecosystem/health
Response: {
  success: true,
  timestamp: 1729544896912,
  ecosystem: { totalServices: 12, healthy: 10, degraded: 1, down: 1 },
  anomalies: [...],
  predictions: { count: 2, details: [...] }
}
```

Real-time ChittyOS ecosystem awareness powered by ContextConsciousness™.

## Environment Configuration

### Required Variables:

```bash
# ChittyConnect Base URL
CHITTYCONNECT_BASE_URL=https://chittyconnect-staging.ccorp.workers.dev

# Service Token for ChittyChronicle → ChittyConnect auth
CHITTYCHRONICLE_SERVICE_TOKEN=<service-token-from-chittyauth>

# Optional: API Key for intelligence APIs
CHITTYCONNECT_API_KEY=<api-key-from-chittyauth>
```

### Production URLs:

```bash
# Frontend: https://app.chitty.cc/chronicle
# Backend API: https://chronicle.chitty.cc
# ChittyConnect: https://chittyconnect-staging.ccorp.workers.dev
```

## Integration Patterns

### 1. Event Publishing (Existing - Enhanced)

ChittyChronicle publishes context events TO ChittyConnect:

```typescript
// Already implemented in contextEmitter.ts
await emitContextEvent('timeline_entry_added', {
  subject_id: entry.chitty_id,
  related_ids: [entry.case_id],
  payload: { entryId: entry.id, caseId: entry.caseId }
});
```

Events logged locally (`reports/context-events.jsonl`) + sent to ChittyConnect if configured.

### 2. Message Consumption (NEW)

ChittyChronicle consumes platform data FROM ChittyConnect:

```typescript
// Sync messages from iMessage and WhatsApp
const result = await communicationsService.syncMessagesFromChittyConnect({
  caseId: 'case-123',
  platforms: ['imessage', 'whatsapp'],
  startDate: '2025-01-01',
  endDate: '2025-10-21'
});

// Messages are now stored locally for timeline integration
console.log(`Synced ${result.synced} messages`);
```

### 3. Intelligence Integration (NEW)

Leverage ChittyConnect's AI capabilities:

```typescript
// Use MemoryCloude™ for context-aware search
const contexts = await chittyConnect.recallMemory({
  sessionId: `case-${caseId}`,
  query: 'timeline events and communications',
  semantic: true,
  limit: 10
});

// Use Cognitive-Coordination™ for complex workflows
const workflow = await chittyConnect.executeTask({
  task: {
    description: 'Extract legal events from messages',
    type: 'legal_timeline_extraction',
    metadata: { caseId, messageCount: 100 }
  },
  sessionId: `case-${caseId}`
});
```

### 4. Ecosystem Monitoring (NEW)

Proactive service health monitoring:

```typescript
// Check ecosystem health
const health = await chittyConnect.getEcosystemAwareness();

if (health.predictions.count > 0) {
  // Alert about predicted failures
  for (const prediction of health.predictions.details) {
    console.warn(`Service ${prediction.service} may fail in ${prediction.timeToFailure}s`);
  }
}
```

## Data Models

### ChittyConnect Message Format:

```typescript
{
  id: "msg-123",
  platform: "whatsapp",
  externalId: "ext-456",
  externalThreadId: "thread-789",
  direction: "inbound",
  from: "+1-555-0100",
  to: ["+1-555-0101"],
  subject: "Meeting Confirmation",
  bodyText: "Meeting confirmed for tomorrow",
  sentAt: "2025-10-21T10:00:00Z",
  receivedAt: "2025-10-21T10:00:05Z",
  attachments: [{
    url: "https://...",
    mimeType: "application/pdf",
    fileName: "contract.pdf",
    sha256: "abc123..."
  }],
  metadata: { priority: "high" }
}
```

### Local Storage Schema:

Messages synced from ChittyConnect are stored in:
- `parties` - Participants with ChittyID linkage
- `party_identifiers` - Email/phone/WhatsApp JID normalization
- `messages` - Full message content with `source` and `externalId`
- `conversations` - Threaded grouping by `externalThreadId` + `source`
- `timeline_entries` - Legal events with `messageId` + `messageSource` linkage

## Platform Support

| Platform | Source Enum | ID Type | Normalization |
|----------|-------------|---------|---------------|
| iMessage | `imessage` | `imessage` | Phone digits-only |
| WhatsApp | `whatsapp` | `whatsapp_jid` | WhatsApp JID format |
| Email | `email` | `email` | Lowercase |
| DocuSign | `docusign` | `email` | Lowercase (uses email) |
| OpenPhone | `openphone` | `phone` | Phone digits-only |

## Deployment Configuration

### Frontend (`vite.config.ts`):

```typescript
base: process.env.NODE_ENV === "production" ? "/chronicle/" : "/"
```

Frontend deployed to: `https://app.chitty.cc/chronicle/`

### Backend (`wrangler.toml`):

```toml
name = "chittychronicle"
routes = [
  { pattern = "chronicle.chitty.cc/*", zone_name = "chitty.cc" }
]
```

Backend API at: `https://chronicle.chitty.cc/`

### API Client (`client/src/lib/api.ts`):

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://chronicle.chitty.cc' : '');
```

Development: Relative URLs (`/api/*`)
Production: `https://chronicle.chitty.cc/api/*`

## Testing Checklist

- [ ] Verify ChittyConnect health check: `GET /api/chittyconnect/ecosystem/health`
- [ ] Test message sync: `POST /api/cases/{caseId}/communications/sync`
- [ ] Verify local storage after sync (check `messages`, `parties` tables)
- [ ] Test communications summary: `GET /api/cases/{caseId}/communications-summary`
- [ ] Test timeline generation: `POST /api/cases/{caseId}/communications/generate-timeline`
- [ ] Verify context events in `reports/context-events.jsonl`
- [ ] Confirm events published to ChittyConnect (check ChittyConnect logs)
- [ ] Test ecosystem awareness predictions and anomaly detection
- [ ] Validate cross-platform message deduplication
- [ ] Verify timeline entries link to source messages

## Migration Notes

### Fallback Behavior:

If ChittyConnect is unavailable:
1. `contextEmitter.ts` silently falls back to local-only logging
2. `communicationsService` returns empty results (no crash)
3. Health check returns `{ healthy: false, message: '...' }`

### Gradual Rollout:

1. Deploy with `CHITTYCONNECT_BASE_URL` unset → local-only mode
2. Set `CHITTYCONNECT_BASE_URL` → enables event publishing
3. Set `CHITTYCONNECT_API_KEY` → enables intelligence APIs
4. Platform webhooks → configured in ChittyConnect dashboard

## ChittyConnect Intelligence Layers

### ContextConsciousness™

Real-time ecosystem awareness:
- Monitors 12+ ChittyOS services
- Detects anomalies (latency spikes, error rates)
- Predicts failures with confidence scores
- Returns in <100ms (cached in KV)

### MemoryCloude™

90-day semantic memory:
- Stores interaction context with embeddings
- Cross-session recall with semantic search
- Automatic entity extraction
- Privacy-preserving (encrypted at rest)

### Cognitive-Coordination™

Intelligent task orchestration:
- Multi-step workflow execution
- Autonomous decision-making
- Recommendation generation
- Legal timeline extraction from unstructured messages

## Files Modified

1. **server/chittyConnectClient.ts** (NEW) - ChittyConnect API client
2. **server/communicationsService.ts** (NEW) - Platform data orchestration
3. **server/routes.ts** - Added ChittyConnect integration routes
4. **client/src/lib/api.ts** (NEW) - Frontend API client with configurable base URL
5. **vite.config.ts** - Added `/chronicle/` base path for production
6. **wrangler.toml** - Updated routes to `chronicle.chitty.cc`
7. **.env.example** - Added `VITE_API_BASE_URL` configuration

## Next Steps

1. **Configure ChittyConnect webhooks** for platforms (iMessage, WhatsApp, etc.)
2. **Deploy to production** at `chronicle.chitty.cc` (backend) and `app.chitty.cc/chronicle` (frontend)
3. **Obtain service tokens** from ChittyAuth for production ChittyConnect access
4. **Test end-to-end flow** with real platform data
5. **Monitor ecosystem health** via `/api/chittyconnect/ecosystem/health`

## Support

- **ChittyConnect Docs**: `/Users/nb/.claude/projects/-/CHITTYOS/chittyos-apps/chittyconnect/INTELLIGENCE_GUIDE.md`
- **ChittyConnect API**: `https://chittyconnect-staging.ccorp.workers.dev/api/*`
- **Integration Strategy**: `/Users/nb/.claude/projects/-/CHITTYAPPS/chittychronicle/INTEGRATION_STRATEGY.md`

---

**Architecture Status**: ✅ Aligned with ChittyGov patterns
**Integration Status**: ✅ Complete - Ready for testing
**Deployment Status**: ⏳ Pending configuration
