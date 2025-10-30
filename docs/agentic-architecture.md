# ARIBIA Chronicle - Agentic Architecture Documentation

## Overview

The ARIBIA Chronicle implements a cutting-edge **Autonomous Legal Intelligence Platform** using an agentic architecture. This system employs multiple specialized AI agents that work autonomously to process evidence, detect contradictions, synthesize timelines, provide strategic recommendations, and automate legal document generation.

## Architecture Philosophy

### Core Principles

1. **Autonomy**: Agents operate independently without human intervention
2. **Specialization**: Each agent focuses on a specific domain of legal intelligence
3. **Collaboration**: Agents share insights and coordinate through event systems
4. **Resilience**: Self-healing capabilities and predictive failure detection
5. **Observability**: Full transparency into agent operations and decisions

### ChittyOS API v2.0 Compliance

All agents implement the ChittyOS API v2.0 standard:

- **`/health`** - Health status reporting
- **`self_heal()`** - Autonomous error recovery
- **`predict_failures()`** - Predictive failure analysis
- **`ship_event()`** - Event publishing to ChittyChain

## Agent Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                  AUTONOMOUS ORCHESTRATOR                │
│              (Coordinates all agents)                   │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Evidence Agent │  Analysis Agent │  Litigation Agent  │
│                 │                 │                     │
│  • Auto-ingest  │  • Contradiction│  • Timeline Sync    │
│  • Categorize   │  • Truth Scoring│  • Deadline Predict │
│  • Deduplicate  │  • Cross-ref    │  • Motion Generate  │
└─────────────────┴─────────────────┴─────────────────────────┘
```

## Agent Specifications

### 1. Evidence Agent

**Purpose**: Autonomous evidence processing and organization

**Capabilities**:
- **Auto-ingest**: Monitors source directories for new evidence
- **Intelligent Categorization**: AI-powered classification into legal categories
- **Duplicate Detection**: Hash-based deduplication
- **OCR Processing**: Extracts text from scanned documents
- **Metadata Extraction**: Captures creation dates, authors, file properties
- **Chain of Custody**: Maintains cryptographic audit trail

**Configuration**:
```yaml
agents:
  evidence_processor:
    enabled: true
    auto_start: true
    processing_interval: "5m"
    batch_size: 50
    max_concurrent: 5
```

**Processing Flow**:
```
New File Detected
    ↓
Calculate Hash (SHA-256)
    ↓
Check Duplicates
    ↓
AI Categorization (Claude Sonnet 4)
    ↓
Extract Metadata
    ↓
Store in Database
    ↓
Ship Event to ChittyChain
```

**Categories**:
- `financial_records` - Bank statements, transactions, wires
- `property_documentation` - Deeds, titles, mortgages
- `communication_records` - Emails, texts, letters
- `court_filings` - Petitions, motions, orders
- `sworn_statements` - Affidavits, depositions, testimony
- `contradictory_evidence` - Documents showing contradictions
- `supporting_documentation` - Receipts, invoices, contracts

**Priority Levels**:
- **Critical**: Core evidence (sworn statements, property docs, contradictions)
- **High**: Important supporting evidence (financials, communications)
- **Medium**: Standard documentation
- **Low**: Background information

### 2. Analysis Agent

**Purpose**: Contradiction detection and truth scoring

**Capabilities**:
- **Contradiction Detection**: Identifies inconsistencies across evidence
- **Truth Scoring**: Assigns confidence scores to evidence claims
- **Cross-Reference Analysis**: Links related evidence pieces
- **Witness Consistency**: Evaluates testimony reliability
- **Timeline Validation**: Detects temporal impossibilities

**Configuration**:
```yaml
agents:
  contradiction_analyzer:
    enabled: true
    auto_start: true
    analysis_interval: "15m"
    confidence_threshold: 0.85
    cross_reference_enabled: true
```

**Contradiction Types**:

| Type | Description | Example |
|------|-------------|---------|
| **Temporal** | Timeline inconsistencies | "I was at work" but GPS shows different location |
| **Factual** | Contradictory facts | "Never received funds" but bank records show deposit |
| **Witness** | Inconsistent testimony | Statement A contradicts Statement B |
| **Location** | Location contradictions | Cannot be in two places simultaneously |
| **Entity** | Entity misidentification | Wrong person/company named |
| **Logical** | Logical impossibilities | Event A requires Event B but B never happened |

**Severity Classification**:
- **Critical (0.9+)**: Clear perjury or fraud
- **High (0.7+)**: Significant inconsistency
- **Medium (0.5+)**: Minor discrepancy
- **Low (0.3+)**: Potential variation

**Truth Scoring Algorithm**:
```typescript
truth_score = Σ (factor.weight × factor.score)

Factors:
- Source Credibility (30%)
- Corroboration (30%)
- Consistency (20%)
- Chain of Custody (20%)
```

### 3. Litigation Agent

**Purpose**: Autonomous document generation and deadline monitoring

**Capabilities**:
- **Deadline Monitoring**: Tracks all case deadlines with advance warnings
- **Document Generation**: Auto-generates motions, affidavits, responses
- **Filing Automation**: Prepares court-ready documents
- **Discovery Management**: Handles discovery requests and responses
- **Strategic Recommendations**: Suggests optimal legal strategies

**Configuration**:
```yaml
agents:
  litigation_responder:
    enabled: true
    auto_start: true
    monitoring_interval: "1h"
    auto_generate_responses: false  # Requires human approval
```

**Document Templates**:
- `motion_for_sanctions` - Rule 137 sanctions motion
- `response_to_petition` - Comprehensive petition responses
- `contempt_petition` - TRO violation contempt filings
- `discovery_response` - Discovery request responses
- `affidavit` - Sworn affidavits with evidence citations
- `exhibit_index` - Exhibit indexes and tables

**Deadline Warning System**:
```yaml
advance_warnings: ["7d", "3d", "1d", "4h", "1h"]
```

**Document Generation Process**:
```
Deadline Approaching
    ↓
Fetch Relevant Evidence
    ↓
Analyze Strategic Objectives
    ↓
Generate Draft (Claude Sonnet 4)
    ↓
Extract Sections & Citations
    ↓
Human Review (if required)
    ↓
Finalize Document
```

### 4. Timeline Synthesis Agent

**Purpose**: Autonomous timeline generation and event correlation

**Capabilities**:
- **Timeline Generation**: Creates chronological case narratives
- **Event Correlation**: Links related events across evidence
- **Gap Detection**: Identifies missing timeline information
- **Chronology Validation**: Ensures timeline consistency
- **Relationship Mapping**: Maps connections between entities

**Configuration**:
```yaml
agents:
  timeline_synthesizer:
    enabled: true
    auto_start: true
    synthesis_interval: "10m"
    auto_update: true
    event_correlation: true
```

### 5. Strategy Advisor Agent

**Purpose**: Predictive analytics and strategic recommendations

**Capabilities**:
- **Predictive Analytics**: Models case outcomes
- **Case Strength Assessment**: Evaluates evidence strength
- **Strategic Recommendations**: Suggests optimal legal approaches
- **Risk Analysis**: Identifies case risks and opportunities
- **Settlement Probability**: Calculates settlement likelihood

**Configuration**:
```yaml
agents:
  strategy_advisor:
    enabled: true
    auto_start: true
    analysis_interval: "30m"
    predictive_analytics: true
    case_outcome_modeling: true
```

**Case Strength Formula**:
```
strength = baseline(0.5) +
           critical_contradictions × 0.1 +
           (avg_truth_score - 0.5) × 0.4

Capped at 0.95 (never 100% certain)
```

## Inter-Agent Communication

### Event System

All agents communicate through a shared event system:

```typescript
interface AgentEvent {
  type: string;
  source_agent: string;
  timestamp: string;
  data: any;
  priority: 'critical' | 'high' | 'normal' | 'low';
}
```

### Event Types

- `evidence.ingested` - New evidence added
- `contradiction.detected` - Contradiction found
- `timeline.updated` - Timeline changed
- `deadline.approaching` - Deadline warning
- `document.generated` - New document created
- `analysis.complete` - Analysis finished

### ChittyChain Integration

All critical events are shipped to ChittyChain for immutable tracking:

```typescript
await ship_event({
  type: 'evidence.ingested',
  data: {
    evidence_id: 'ev-123',
    category: 'financial_records',
    hash: 'sha256...'
  },
  chain_of_custody: [
    'ingested:2025-10-29T10:00:00Z',
    'agent:evidence-processor',
    'case:2024D007847'
  ]
});
```

## Agent Lifecycle

### Startup Sequence

1. Load configuration from `config/aribia-litigation.yaml`
2. Initialize AI clients (Anthropic Claude)
3. Register with ChittyOS discovery
4. Start autonomous processing loops
5. Begin health monitoring

### Health Monitoring

Each agent reports health status:

```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  processing_queue: 15,
  last_processed: '2025-10-29T10:30:00Z',
  uptime: 3600,
  errors_last_hour: 2
}
```

### Self-Healing

Agents automatically recover from errors:

```typescript
async self_heal() {
  - Clear stuck processing queues
  - Reset error counters
  - Restart failed imports
  - Validate database connections
  - Reindex corrupted data
}
```

### Predictive Failures

Agents predict failures before they occur:

```typescript
{
  predictions: [
    {
      type: 'queue_overflow',
      probability: 0.75,
      eta: '2h',
      recommended_action: 'Scale up processing workers'
    }
  ]
}
```

## AI Model Selection

All agents use **Claude Sonnet 4** (`claude-sonnet-4-20250514`) for analysis:

- **Contradiction Detection**: Temperature 0.0 (deterministic)
- **Evidence Categorization**: Temperature 0.1 (mostly deterministic)
- **Document Generation**: Temperature 0.3 (creative but focused)

## Observability

### Logging

All agent operations are logged:

```
[EvidenceAgent] Starting evidence processing...
[EvidenceAgent] Found 47 new files
[EvidenceAgent] Organized: contract.pdf → financial_records (high)
[EvidenceAgent] Event shipped: evidence.batch_processed
```

### Metrics

Key metrics tracked:

- **Evidence Processing Rate**: Files processed per minute
- **Contradiction Detection Rate**: Contradictions found per analysis
- **Agent Health**: Uptime, queue size, error rate
- **API Response Time**: Agent API latency
- **Database Performance**: Query execution time

### Monitoring Dashboard

Access agent status at: `http://localhost:5000/agents/status`

```json
{
  "evidence_processor": {
    "status": "healthy",
    "processed_today": 142,
    "queue_size": 8,
    "uptime": "6h 23m"
  },
  "contradiction_analyzer": {
    "status": "healthy",
    "contradictions_found": 17,
    "avg_confidence": 0.87,
    "uptime": "6h 23m"
  },
  "litigation_responder": {
    "status": "healthy",
    "documents_generated": 3,
    "deadlines_tracked": 12,
    "uptime": "6h 23m"
  }
}
```

## Security and Compliance

### Attorney-Client Privilege

All agent operations maintain attorney-client privilege:

- Evidence marked as privileged
- Work product protection enabled
- Audit trail for all access

### Chain of Custody

Cryptographic chain of custody for all evidence:

```
Evidence Hash (SHA-256)
    ↓
ChittyChain Block
    ↓
Immutable Audit Trail
```

### Data Encryption

- **At Rest**: AES-256 encryption
- **In Transit**: TLS 1.3
- **Database**: Encrypted Neon PostgreSQL

## Deployment

### Starting Agents

```bash
# Initialize all agents
bash deploy/init-agents.sh

# Start individual agent
npm run agent:evidence:start
```

### Stopping Agents

```bash
# Stop all agents
bash deploy/stop-agents.sh

# Stop individual agent
npm run agent:evidence:stop
```

### Agent Status

```bash
# View agent status
bash deploy/agent-status.sh
```

## Configuration

### Agent-Specific Configuration

Each agent can be configured in `config/aribia-litigation.yaml`:

```yaml
agents:
  evidence_processor:
    enabled: true
    auto_start: true
    processing_interval: "5m"
    batch_size: 50

  contradiction_analyzer:
    enabled: true
    confidence_threshold: 0.85

  litigation_responder:
    enabled: true
    auto_generate_responses: false
```

## Best Practices

1. **Monitor agent logs** regularly for anomalies
2. **Review AI-generated documents** before filing
3. **Validate contradiction reports** with manual review
4. **Keep configuration updated** as case evolves
5. **Test self-healing** in development environment
6. **Backup agent state** before major changes

## Troubleshooting

### Agent Not Starting

```bash
# Check logs
tail -f logs/evidence-agent.log

# Verify configuration
npm run config:validate

# Restart agent
npm run agent:evidence:restart
```

### High Error Rate

```bash
# Trigger self-heal
curl -X POST http://localhost:5000/api/agents/evidence/heal

# Check predictions
curl http://localhost:5000/api/agents/evidence/predictions
```

### Performance Degradation

```bash
# Scale up workers
export MAX_WORKERS=20
npm run agent:evidence:restart

# Clear cache
npm run agent:evidence:clear-cache
```

## Future Enhancements

### Planned Features

- **Multi-Case Management**: Support multiple cases simultaneously
- **Collaborative Agents**: Agents that work together on complex tasks
- **Learning from Outcomes**: Improve predictions based on case results
- **Natural Language Interface**: Chat with agents about case strategy
- **Advanced Predictive Analytics**: Machine learning for case outcome prediction

---

**Document Version**: 1.0
**Last Updated**: 2025-10-29
**Maintained By**: ARIBIA Chronicle Development Team
