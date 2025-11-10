# ChittyOS Integration Architecture Strategy

**Version**: 1.0.0
**Updated**: 2025-10-18
**Scope**: ChittyOS Ecosystem (34+ services)

---

## Executive Summary

This document defines the strategic purpose, boundaries, and implementation patterns for all integration types across the ChittyOS ecosystem. It ensures consistent, predictable, and maintainable integration patterns across slash commands, plugins, agents, extensions, connectors, CLI tools, MCP integrations, and APIs.

---

## Integration Type Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTION LAYER                   │
├─────────────────────────────────────────────────────────────┤
│  Slash Commands  │  CLI Tools  │  Web UI  │  Mobile Apps    │
└─────────────────────────────────────────────────────────────┘
                          ↕️
┌─────────────────────────────────────────────────────────────┐
│                   CHITTYCHAT ORCHESTRATION HUB               │
│          Cross-Channel • Cross-Platform • Cross-Model        │
├─────────────────────────────────────────────────────────────┤
│  Message Bus • State Sync • Context Propagation             │
│  Topics • Projects • Sessions • Todos • Contexts            │
└─────────────────────────────────────────────────────────────┘
                          ↕️
┌─────────────────────────────────────────────────────────────┐
│                   AI INTEGRATION LAYER                       │
├─────────────────────────────────────────────────────────────┤
│  MCP Servers  │  Agents  │  Extensions  │  Plugins          │
└─────────────────────────────────────────────────────────────┘
                          ↕️
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE INTEGRATION LAYER                  │
├─────────────────────────────────────────────────────────────┤
│  Connectors  │  APIs  │  Event Bus  │  WebSockets           │
└─────────────────────────────────────────────────────────────┘
                          ↕️
┌─────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                      │
├─────────────────────────────────────────────────────────────┤
│  Service Discovery  │  Registry  │  Authentication          │
└─────────────────────────────────────────────────────────────┘
```

**See**: [CHITTYCHAT_ORCHESTRATION_ARCHITECTURE.md](CHITTYCHAT_ORCHESTRATION_ARCHITECTURE.md) for full orchestration layer specification.

---

## 1. Slash Commands (`/command`)

### Purpose
**Interactive development workflow orchestration for AI assistants (Claude Code, ChatGPT Canvas).**

### Strategic Role
- **Primary User**: AI coding assistants (Claude Code, ChatGPT)
- **Execution Context**: Within AI chat sessions
- **Scope**: Cross-project, meta-operations
- **Response**: Human-readable output + side effects

### When to Use
✅ **Use slash commands for:**
- Project health checks (`/health`, `/chittycheck`)
- Development workflows (`/dev`, `/test`, `/deploy`)
- Cross-service synchronization (`/sync`, `/status`)
- Session initialization (`/project`)
- Compliance validation (`/chittyid`, `/registry`)
- Quick fixes (`/fix`, `/clean`)

❌ **Don't use slash commands for:**
- Production automation (use APIs)
- Programmatic service-to-service calls (use connectors)
- Data manipulation (use CLI tools or APIs)
- Long-running tasks (use agents or workers)

### Implementation Pattern

**Location**: `/Users/nb/.claude/projects/-/chittychat/*.sh`

**Naming Convention**: `{purpose}-{action}.sh`
- Examples: `chittycheck-enhanced.sh`, `project-health-check.sh`, `slash-commands-extended.sh`

**Script Structure**:
```bash
#!/usr/bin/env bash
# Purpose: One-line description
# Usage: /command [args]
# Dependencies: service1, service2

set -euo pipefail  # Fail fast

# Validation
check_environment() {
  # Verify required vars, services
}

# Main logic
main() {
  # Implementation
}

# Output formatting (for AI consumption)
format_output() {
  # Human-readable + structured data
}

main "$@"
```

**Registration**: Define in `/Users/nb/.claude/CLAUDE.md`
```markdown
### Command Name
- `/command` → `/path/to/script.sh`
```

### Current Slash Commands

| Command | Script | Purpose | Status |
|---------|--------|---------|--------|
| `/chittycheck` | `chittycheck-enhanced.sh` | Compliance validation (blocks local IDs) | ✅ Production |
| `/health` | `project-health-check.sh` | Service health monitoring | ✅ Production |
| `/chittyid` | `chittyid-command.sh` | ChittyID minting/verification | ✅ Production |
| `/project` | `project-orchestrator.sh` | Session loading, env setup | ✅ Production |
| `/status` | `slash-commands-extended.sh status` | Project status reporting | ✅ Production |
| `/sync` | `slash-commands-extended.sh sync` | Cross-repo synchronization | ⚠️ Script missing |
| `/dev` | `slash-commands-extended.sh dev` | Development server startup | ✅ Production |
| `/test` | `slash-commands-extended.sh test` | Test suite execution | ✅ Production |
| `/deploy` | `slash-commands-extended.sh deploy` | Deployment automation | ✅ Production |
| `/clean` | `slash-commands-extended.sh clean` | Cleanup & cache clearing | ✅ Production |
| `/fix` | `slash-commands-extended.sh fix` | Auto-repair utilities | ✅ Production |
| `/registry` | `claude-registry-client.sh` | ChittyRegistry interactions | ✅ Production |

---

## 2. CLI Tools (`chit`, `chitfix`, `chitlint`)

### Purpose
**Programmatic command-line utilities for developers and automation scripts.**

### Strategic Role
- **Primary User**: Developers, CI/CD pipelines, automation scripts
- **Execution Context**: Terminal, scripts, cron jobs
- **Scope**: Single-service or cross-service operations
- **Response**: Machine-readable output (JSON, exit codes)

### When to Use
✅ **Use CLI tools for:**
- Automated compliance checks (CI/CD)
- Data migrations
- Batch operations
- Service provisioning
- Code generation
- Local development utilities

❌ **Don't use CLI tools for:**
- Interactive AI workflows (use slash commands)
- Real-time service communication (use APIs)
- Long-running services (use daemons/workers)

### Implementation Pattern

**Location**: `/Users/nb/.claude/projects/-/chittycheck/`

**Naming Convention**: `chit{purpose}`
- Examples: `chit` (main CLI), `chitfix` (auto-repair), `chitlint` (linting)

**Language**: Bash, Node.js, Python (choose based on ecosystem)

**Structure**:
```bash
#!/usr/bin/env node
// or: #!/usr/bin/env bash

// 1. Argument parsing (use yargs, commander, or getopts)
// 2. Validation
// 3. Execution
// 4. Output (JSON for machine consumption)
// 5. Exit code (0=success, 1=error, 2=warning)
```

**Example**:
```bash
chit validate --service chittychronicle --output json
chit fix --pattern local-ids --dry-run
```

### Current CLI Tools

| Tool | Language | Purpose |
|------|----------|---------|
| `chit` | Bash | Main compliance CLI (1189+ blocked patterns) |
| `chitfix` | Bash | Automated fixes for common issues |
| `chitlint` | Bash | Linting for ChittyOS standards |
| `chitfix-local-ids.mjs` | Node.js | Remove local ChittyID generation |

---

## 3. MCP (Model Context Protocol) Integrations

### Purpose
**Enable AI assistants (Claude, ChatGPT) to directly control ChittyOS services through standardized tool interfaces.**

### Strategic Role
- **Primary User**: Claude Desktop, ChatGPT, AI agents
- **Execution Context**: AI assistant tool calls
- **Scope**: Service-specific operations (timeline management, document ingestion)
- **Response**: Structured JSON responses for AI consumption

### When to Use
✅ **Use MCP for:**
- AI-assisted service operations
- Natural language → structured actions
- Multi-step workflows requiring AI decision-making
- Knowledge retrieval for AI assistants
- Context-aware automation

❌ **Don't use MCP for:**
- Direct user-facing APIs (use REST APIs)
- Service-to-service communication (use connectors)
- High-throughput operations (use direct APIs)
- Real-time streaming (use WebSockets)

### Implementation Pattern

**Location**: `{service}/server/mcpService.ts` + `/.well-known/mcp-manifest.json`

**Structure**:
```typescript
// server/mcpService.ts
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  handler: (params: any) => Promise<any>;
}

export const mcpTools: MCPTool[] = [
  {
    name: "create_timeline_entry",
    description: "Create a new timeline entry with AI-extracted metadata",
    inputSchema: { /* JSON Schema */ },
    handler: async (params) => {
      // Implementation
      return { success: true, entryId: "..." };
    }
  }
];
```

**Manifest** (`/.well-known/mcp-manifest.json`):
```json
{
  "name": "chittychronicle",
  "version": "1.0.0",
  "description": "Legal timeline management",
  "capabilities": [
    "timeline_management",
    "contradiction_detection",
    "document_ingestion"
  ],
  "tools": [
    {
      "name": "create_timeline_entry",
      "description": "...",
      "inputSchema": { /* JSON Schema */ }
    }
  ]
}
```

**Registration**: Auto-discovery via ChittyRegistry + MCP coordinator

### Current MCP Implementations

| Service | Tools | Manifest |
|---------|-------|----------|
| **chittychronicle** | create_timeline_entry, analyze_case_timeline, detect_contradictions, search_timeline, manage_case_documents | `/.well-known/mcp-manifest.json` |
| **chittyregistry** | register_service, discover_service, validate_manifest | `/src/mcp-agent.ts` |
| **chittymcp** | Universal MCP coordinator | `/mcp-evidence-server/`, `/mcp-unified-consolidated/` |

---

## 4. APIs (REST/HTTP Endpoints)

### Purpose
**Production-grade service-to-service communication and external integrations.**

### Strategic Role
- **Primary User**: Services, web/mobile apps, external partners
- **Execution Context**: HTTP requests
- **Scope**: All CRUD operations, business logic
- **Response**: JSON (or negotiated content-type)

### When to Use
✅ **Use APIs for:**
- All production service operations
- Web/mobile app backends
- External partner integrations
- Webhook receivers
- Authenticated user operations

❌ **Don't use APIs for:**
- AI assistant interactions (use MCP)
- Real-time bidirectional communication (use WebSockets)
- File transfers >10MB (use presigned URLs)

### Implementation Pattern

**Structure**:
```
/api/{version}/{resource}/{action}
```

**Examples**:
- `/api/v1/cases` - Case CRUD
- `/api/v1/timeline/entries` - Timeline CRUD
- `/api/v1/timeline/analysis/contradictions` - AI analysis

**Service Discovery**:
```
/.well-known/service-manifest.json
/openapi.json
```

**Authentication**:
- User endpoints: ChittyID OIDC (Bearer tokens)
- Service endpoints: Service tokens (env: `{SERVICE}_SERVICE_TOKEN`)

**Error Handling**:
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "ChittyID token required",
    "details": {}
  }
}
```

### API Versioning Strategy

| Pattern | Use Case | Example |
|---------|----------|---------|
| **URL Path** | Major versions | `/api/v1/cases`, `/api/v2/cases` |
| **Header** | Minor versions | `API-Version: 2024-10-18` |
| **Query Param** | Feature flags | `/api/cases?beta=true` |

### Current API Patterns

**ChittyChronicle** (`/api`):
- Authentication: `/auth/login`, `/auth/callback`, `/api/auth/user`
- Cases: `/api/cases`, `/api/cases/:id`
- Timeline: `/api/timeline/entries`, `/api/timeline/search`
- Analysis: `/api/timeline/analysis/contradictions`, `/api/timeline/analysis/deadlines`
- Communications: `/api/communications/conversations`, `/api/communications/messages`
- MCP: `/api/mcp/timeline`, `/api/mcp/cases`, `/api/mcp/ingest`

---

## 5. Agents (Autonomous AI Workers)

### Purpose
**Long-running, autonomous AI-powered processes that make decisions and execute multi-step workflows.**

### Strategic Role
- **Primary User**: Background automation, scheduled tasks
- **Execution Context**: Worker processes, queues
- **Scope**: Complex workflows requiring AI reasoning
- **Response**: Asynchronous results via events or callbacks

### When to Use
✅ **Use agents for:**
- Multi-step workflows with AI decision-making
- Scheduled analysis tasks (contradiction detection runs)
- Document processing pipelines
- Autonomous monitoring and alerting
- Adaptive workflow optimization

❌ **Don't use agents for:**
- Simple CRUD operations (use APIs)
- Synchronous requests (use MCP)
- Stateless operations (use functions)

### Implementation Pattern

**Structure**:
```typescript
// agent/{name}/index.ts
export class ContradictionDetectionAgent {
  async run(context: AgentContext) {
    // 1. Gather context
    // 2. Make AI-powered decisions
    // 3. Execute actions via APIs/MCP
    // 4. Emit results/events
  }
}
```

**Execution**:
- **Scheduled**: Cron jobs, ChittyPM tasks
- **Event-driven**: ChittyConnect event subscriptions
- **On-demand**: API trigger endpoints

### Current Agent Implementations

| Agent | Purpose | Trigger |
|-------|---------|---------|
| **Contradiction Detection** | Analyze timelines for conflicts | On-demand API + scheduled |
| **ChittyRegistry MCP Agent** | Service discovery for AI assistants | Event-driven |
| **Pipeline Orchestrator** | Workflow orchestration | Queue-based |

---

## 6. Extensions (Service Augmentation)

### Purpose
**Modular capabilities that extend core service functionality without modifying core codebase.**

### Strategic Role
- **Primary User**: Services needing pluggable features
- **Execution Context**: Service runtime
- **Scope**: Feature additions, integrations
- **Response**: Depends on hook point

### When to Use
✅ **Use extensions for:**
- Third-party integrations (Plaid, DocuSign, Notion)
- Custom authentication providers
- Data source connectors
- Export format handlers
- Custom AI models

❌ **Don't use extensions for:**
- Core business logic (use APIs)
- Cross-cutting concerns (use middleware)
- One-off scripts (use CLI tools)

### Implementation Pattern

**Structure**:
```typescript
// extensions/{name}/index.ts
export interface Extension {
  name: string;
  version: string;
  hooks: HookRegistry;
  install: (service: Service) => Promise<void>;
  uninstall: () => Promise<void>;
}

// Example: Plaid Bill Integration Extension
export const plaidBillExtension: Extension = {
  name: "plaid-bill-integration",
  version: "1.0.0",
  hooks: {
    "timeline.entry.create": async (entry) => {
      // Enhance entry with Plaid transaction data
    }
  },
  install: async (service) => {
    // Register hooks, configure
  },
  uninstall: async () => {
    // Cleanup
  }
};
```

**Registration**: Service manifest extension registry

### Current Extension Pattern Examples

**ChittyLedger Extensions**:
- `cao_bill_mcp_integration.ts` - CAO bill ingestion
- `email_bill_ingestion_mcp.ts` - Email bill parsing
- `plaid_bill_mcp.ts` - Plaid transaction linking
- `property_tax_mcp.ts` - Property tax integration

---

## 7. Plugins (User-Installed Capabilities)

### Purpose
**User-installable features that add functionality to a service without code changes.**

### Strategic Role
- **Primary User**: End users, admins
- **Execution Context**: Service runtime with user-level isolation
- **Scope**: User-specific features
- **Response**: UI components + API endpoints

### When to Use
✅ **Use plugins for:**
- Marketplace-distributed features
- User-configurable integrations
- Custom report generators
- Workflow templates
- UI customizations

❌ **Don't use plugins for:**
- System-wide features (use extensions)
- Core functionality (use APIs)
- Development tools (use CLI)

### Implementation Pattern

**Structure**:
```typescript
// plugins/{plugin-id}/manifest.json
{
  "id": "custom-deadline-alerts",
  "name": "Custom Deadline Alerts",
  "version": "1.0.0",
  "author": "user@example.com",
  "permissions": ["timeline.read", "notifications.send"],
  "hooks": ["timeline.entry.created"],
  "ui": {
    "settings": "/plugins/custom-deadline-alerts/settings"
  }
}

// plugins/{plugin-id}/index.ts
export default {
  onInstall: async (config) => {},
  onTimelineEntryCreated: async (entry) => {
    // Custom alerting logic
  }
}
```

**Discovery**: Plugin marketplace (planned)

### Current Status
⚠️ **Not yet implemented** - Planned for ChittyTrust marketplace

---

## 8. Connectors (Service-to-Service Integration)

### Purpose
**Stateful, bidirectional communication channels between ChittyOS services.**

### Strategic Role
- **Primary User**: Services needing real-time data sync
- **Execution Context**: Background workers, event listeners
- **Scope**: Data synchronization, event propagation
- **Response**: Asynchronous, event-driven

### When to Use
✅ **Use connectors for:**
- Real-time data synchronization
- Event-driven integrations
- Bidirectional updates (ChittyPM ↔ ChittyChronicle)
- Persistent connections (WebSocket clients)
- Cross-service workflows

❌ **Don't use connectors for:**
- One-off API calls (use HTTP client)
- User-facing operations (use APIs)
- Simple webhooks (use API endpoints)

### Implementation Pattern

**Structure**:
```typescript
// connectors/{service}/client.ts
export class ChittyPMConnector {
  private wsClient: WebSocket;

  async connect() {
    // Establish WebSocket connection
    // Subscribe to events
  }

  async syncProject(project) {
    // Bidirectional sync
  }

  onEvent(eventType, handler) {
    // Event subscription
  }
}

// Usage
const pmConnector = new ChittyPMConnector({
  apiUrl: process.env.CHITTYPM_API_URL,
  wsUrl: process.env.CHITTYPM_WS_URL
});

await pmConnector.connect();
pmConnector.onEvent("task.updated", async (task) => {
  // Handle task update
});
```

**Configuration**: Environment variables + service discovery

### Current Connector Implementations

| Connector | Source | Target | Protocol |
|-----------|--------|--------|----------|
| **ChittyPM Integration** | ChittyChronicle | ChittyPM | HTTP + WebSocket |
| **ChittyConnect Emitter** | All services | ChittyConnect | HTTP POST (events) |
| **ChittyBeacon Client** | ChittyChronicle | ChittyBeacon | WebSocket (alerts) |
| **ChittyChain Verifier** | ChittyChronicle | ChittyChain | HTTP (attestation) |

---

## 9. Service Discovery (ChittyRegistry)

### Purpose
**Centralized registry for service metadata, capabilities, and endpoints.**

### Strategic Role
- **Primary User**: All ChittyOS services
- **Execution Context**: Service startup, runtime lookups
- **Scope**: Service metadata, health, capabilities
- **Response**: Service manifests, endpoint URLs

### When to Use
✅ **Always use service discovery for:**
- Service registration on startup
- Capability discovery
- Dynamic endpoint resolution
- Health monitoring
- Version compatibility checks

### Implementation Pattern

**Service Manifest** (`/.well-known/service-manifest.json`):
```json
{
  "name": "chittychronicle",
  "version": "1.0.0",
  "description": "Legal timeline management",
  "endpoints": {
    "api": "https://chronicle.chitty.cc/api",
    "mcp": "https://chronicle.chitty.cc/.well-known/mcp-manifest.json",
    "openapi": "https://chronicle.chitty.cc/openapi.json"
  },
  "capabilities": [
    "timeline_management",
    "contradiction_detection",
    "document_ingestion"
  ],
  "dependencies": {
    "chittyid": "^1.0.0",
    "chittyconnect": "^1.0.0"
  },
  "health": "/health"
}
```

**Registration**:
```bash
npm run registry:register
```

---

## 10. ChittyChat Orchestration Hub

### Purpose
**Universal synchronization and orchestration layer for cross-channel, cross-platform, and cross-model coordination.**

### Strategic Role
- **Primary User**: All ChittyOS services, platforms, and AI models
- **Execution Context**: Central message bus and state store
- **Scope**: Universal state synchronization
- **Response**: Real-time state updates, event broadcasts

### When to Use
✅ **ChittyChat orchestrates:**
- Cross-session todo synchronization
- Cross-platform state sync (web ↔ mobile ↔ CLI)
- Cross-model context propagation (Claude ↔ ChatGPT ↔ Gemini)
- Cross-channel messaging (Slack ↔ Discord ↔ email)
- Session continuity and crash recovery
- Project/topic coordination
- Temporal state management

### Synchronization Domains

ChittyChat synchronizes across these domains:

| Domain | Description | CLI Command |
|--------|-------------|-------------|
| **Topics** | Conceptual subjects/themes | `chitty sync topics` |
| **Projects** | Structured work efforts | `chitty sync projects` |
| **Sessions** | Temporal work contexts | `chitty sync sessions` |
| **Todos** | Actionable tasks | `chitty sync todos` |
| **Contexts** | Semantic AI context | `chitty sync contexts` |
| **Repos** | Git repositories | `chitty sync repos` |
| **Services** | ChittyOS service state | `chitty sync services` |
| **Time & States** | Temporal markers | `chitty sync states` |

### Architecture

**See**: [CHITTYCHAT_ORCHESTRATION_ARCHITECTURE.md](CHITTYCHAT_ORCHESTRATION_ARCHITECTURE.md)

**Key Components**:
1. **Message Bus** - Routes messages between channels, platforms, models
2. **State Store** - CRDT-based synchronized state storage
3. **Sync Engine** - Orchestrates synchronization across domains
4. **Adapters** - Channel/platform/model-specific integrations
5. **Conflict Resolver** - Handles concurrent updates with vector clocks

**Data Flow**:
```
User Action (any platform/model/channel)
    ↓
ChittyChat Hub receives sync message
    ↓
State Store updated with CRDT merge
    ↓
Broadcast to all subscribed adapters
    ↓
Adapters push to platforms/channels/models
    ↓
All participants see synchronized state
```

### CLI Interface

```bash
# Sync specific domain
chitty sync todos
chitty sync sessions
chitty sync contexts

# Sync to specific targets
chitty sync todos --platform web,cli
chitty sync contexts --model claude,chatgpt
chitty sync sessions --channel slack

# Watch mode (continuous sync)
chitty sync todos --watch

# Full sync
chitty sync all
```

### API Endpoints

**ChittyChat Hub**: `https://chat.chitty.cc/api/v1`

```
POST   /sync/{domain}                    # Sync specific domain
POST   /sync/{domain}/{entityId}         # Sync specific entity
GET    /sync/{domain}/{entityId}/status  # Get sync status
POST   /sync/broadcast                   # Broadcast to all platforms
WebSocket: wss://chat.chitty.cc/ws       # Real-time sync
```

### Cross-Channel Adapters

| Channel | Status | Integration |
|---------|--------|-------------|
| Web UI | ✅ Implemented | WebSocket |
| CLI | ✅ Implemented | `chitty` tool |
| Claude Code | ✅ Implemented | MCP + slash commands |
| Slack | 🚧 Planned | Slack API + Bot |
| Discord | 🚧 Planned | Discord.js |
| Email | 🚧 Planned | SMTP/IMAP |
| SMS | 🚧 Planned | Twilio |
| WhatsApp | 🚧 Planned | WhatsApp Business API |

### Cross-Platform Adapters

| Platform | Status | Integration |
|----------|--------|-------------|
| Web | ✅ Implemented | React + WebSocket |
| CLI | ✅ Implemented | `chitty sync` |
| Mobile | 🚧 Planned | React Native |
| VS Code | 🚧 Planned | Extension API |
| Cloudflare | 🚧 Planned | Workers |

### Cross-Model Adapters

| Model | Status | Integration |
|-------|--------|-------------|
| Claude Desktop | ✅ Implemented | MCP Server |
| Claude Code | ✅ Implemented | Native |
| ChatGPT | 🚧 Planned | GPT Actions |
| Gemini | 🚧 Planned | Extensions API |
| Voice Assistants | 🚧 Planned | ChittyRouter |

### Implementation Status

**Current** (Phase 1):
- ✅ Session management in `chitty` CLI
- ✅ Basic todo reconciliation
- ✅ ChittyConnect event publishing
- ✅ Architecture specification

**Q1 2025** (Phase 2):
- [ ] ChittyChat Hub HTTP API
- [ ] ChittyChat WebSocket server
- [ ] CRDT-based state store
- [ ] `chitty sync` CLI implementation
- [ ] Web/CLI/Claude Code adapters

**Q2 2025** (Phase 3):
- [ ] Slack, Discord, email adapters
- [ ] Mobile apps
- [ ] ChatGPT integration

---

## Naming Conventions

### Slash Commands
**Format**: `/lowercase`
- Examples: `/chittycheck`, `/health`, `/sync`
- **Rule**: Single word or compound word, always lowercase

### CLI Tools
**Format**: `chit{purpose}`
- Examples: `chit`, `chitfix`, `chitlint`
- **Rule**: Prefix `chit`, lowercase, descriptive suffix

### MCP Tools
**Format**: `{verb}_{resource}_{action}`
- Examples: `create_timeline_entry`, `analyze_case_timeline`
- **Rule**: Snake_case, verb-first, descriptive

### API Endpoints
**Format**: `/api/{version}/{resource}/{action}`
- Examples: `/api/v1/timeline/entries`, `/api/v1/cases`
- **Rule**: Kebab-case, RESTful conventions

### Services
**Format**: `chitty{domain}`
- Examples: `chittychronicle`, `chittytrust`, `chittyregistry`
- **Rule**: Lowercase, no hyphens, domain-descriptive

### Connectors
**Format**: `Chitty{Service}Connector`
- Examples: `ChittyPMConnector`, `ChittyBeaconClient`
- **Rule**: PascalCase, suffix `Connector` or `Client`

### Extensions
**Format**: `{integration}-{purpose}-extension`
- Examples: `plaid-bill-integration`, `docusign-verification`
- **Rule**: Kebab-case, descriptive, suffix `-extension`

### Agents
**Format**: `{Purpose}Agent`
- Examples: `ContradictionDetectionAgent`, `TimelineAnalysisAgent`
- **Rule**: PascalCase, suffix `Agent`

---

## Decision Matrix: Which Integration Type to Use?

| Scenario | Integration Type | Rationale |
|----------|------------------|-----------|
| **AI assistant needs to create timeline entries** | MCP | Designed for AI tool calls |
| **Developer runs compliance check in terminal** | CLI Tool (`chit validate`) | Programmatic execution |
| **AI coding assistant validates project** | Slash Command (`/chittycheck`) | Interactive workflow |
| **Web app needs to fetch cases** | API (`GET /api/cases`) | Production service communication |
| **ChittyPM syncs tasks in real-time** | Connector (WebSocket client) | Bidirectional, persistent connection |
| **User installs custom report format** | Plugin | User-installable feature |
| **Service adds Plaid integration** | Extension | Service augmentation |
| **Scheduled nightly contradiction analysis** | Agent | Autonomous, long-running AI task |
| **Service needs to discover ChittyBeacon URL** | Service Discovery (ChittyRegistry) | Dynamic endpoint resolution |
| **Sync todos across 3 parallel Claude sessions** | ChittyChat (`chitty sync todos`) | Cross-session orchestration |
| **Share context from Claude to ChatGPT** | ChittyChat (`chitty sync contexts --model chatgpt`) | Cross-model context propagation |
| **Get Slack notification when todo completed** | ChittyChat (auto-sync to Slack adapter) | Cross-channel messaging |
| **Continue work from CLI session on mobile** | ChittyChat (`chitty sync sessions --platform mobile`) | Cross-platform continuity |

---

## Implementation Checklist

When adding a new integration capability, follow this checklist:

### For Slash Commands
- [ ] Create `.sh` script in `/Users/nb/.claude/projects/-/chittychat/`
- [ ] Add entry to `/Users/nb/.claude/CLAUDE.md` under slash commands
- [ ] Test execution in Claude Code session
- [ ] Document in project CLAUDE.md

### For CLI Tools
- [ ] Create executable in appropriate project (`/chittycheck/`, `/scripts/`)
- [ ] Add to PATH or document installation
- [ ] Write usage documentation
- [ ] Add to CI/CD if applicable

### For MCP Integrations
- [ ] Implement `server/mcpService.ts` with tool definitions
- [ ] Generate `/.well-known/mcp-manifest.json`
- [ ] Add routes to `server/routes.ts`
- [ ] Register with ChittyMCP coordinator
- [ ] Test with Claude Desktop or ChatGPT

### For APIs
- [ ] Define routes in `server/routes.ts`
- [ ] Implement authentication middleware
- [ ] Generate OpenAPI spec (`/openapi.json`)
- [ ] Add to service manifest
- [ ] Write integration tests

### For Connectors
- [ ] Create client class (`{Service}Connector`)
- [ ] Implement connection lifecycle (connect, reconnect, disconnect)
- [ ] Add event subscription interface
- [ ] Handle errors gracefully (non-fatal, best-effort)
- [ ] Document environment variables

### For Agents
- [ ] Define agent class with `run()` method
- [ ] Implement AI decision-making logic
- [ ] Set up execution triggers (cron, events, API)
- [ ] Emit context events to ChittyConnect
- [ ] Add monitoring/logging

### For Extensions
- [ ] Define extension manifest
- [ ] Implement install/uninstall hooks
- [ ] Document required permissions
- [ ] Add to service extension registry
- [ ] Test isolation and cleanup

### For Service Discovery
- [ ] Generate `/.well-known/service-manifest.json`
- [ ] Generate `/.well-known/mcp-manifest.json`
- [ ] Generate `/openapi.json`
- [ ] Implement `/health` endpoint
- [ ] Register with ChittyRegistry via `npm run registry:register`

---

## Integration Patterns Reference

### Best Practices

1. **Non-Fatal Design**: All integrations should degrade gracefully
   ```typescript
   try {
     await chittyConnectClient.publishEvent(event);
   } catch (error) {
     console.warn('ChittyConnect unavailable, logging locally:', error);
     await logEventLocally(event);
   }
   ```

2. **Environment-Driven Configuration**: Use env vars + service discovery
   ```typescript
   const config = {
     apiUrl: process.env.CHITTYPM_API_URL || await registry.discover('chittypm'),
     timeout: parseInt(process.env.CHITTYPM_TIMEOUT || '5000')
   };
   ```

3. **Event Emission**: Emit context events for observability
   ```typescript
   await contextEmitter.emit({
     event_type: 'timeline_entry_added',
     subject_id: entry.chitty_id,
     payload: { entry }
   });
   ```

4. **Service Tokens**: Use service-specific tokens for auth
   ```typescript
   headers: {
     'Authorization': `Bearer ${process.env.CHITTYCHRONICLE_SERVICE_TOKEN}`
   }
   ```

5. **Retry Logic**: Implement exponential backoff
   ```typescript
   await retry(() => api.call(), {
     retries: 3,
     factor: 2,
     minTimeout: 1000
   });
   ```

---

## Future Roadmap

### Q1 2025
- [ ] Plugin marketplace infrastructure
- [ ] Multi-channel notification delivery (email, SMS, push)
- [ ] Enhanced agent orchestration via ChittyPM

### Q2 2025
- [ ] ChittyChain blockchain integration (full implementation)
- [ ] GraphQL API layer (alternative to REST)
- [ ] Real-time collaboration via WebRTC

### Q3 2025
- [ ] Federation protocol for multi-tenant deployments
- [ ] Advanced MCP capabilities (streaming, webhooks)
- [ ] Extension marketplace

---

## Appendix: Command Reference

### Slash Commands Quick Reference
```bash
/chittycheck      # Validate compliance (blocks local IDs)
/health          # Check service health
/chittyid        # Mint/verify ChittyID
/project         # Initialize session
/status          # Show project status
/sync            # Synchronize cross-repo
/dev             # Start dev server
/test            # Run test suite
/deploy          # Deploy to production
/clean           # Clean caches
/fix             # Auto-repair
/registry        # Registry operations
```

### CLI Tools Quick Reference
```bash
chit validate --service {name}     # Validate service compliance
chit fix --pattern {pattern}       # Auto-fix issues
chit lint                          # Lint codebase
chitfix-local-ids.mjs             # Remove local ID generation
```

### Registry Commands
```bash
npm run registry:register          # Register with ChittyRegistry
npm run registry:local:scan        # Scan local metadata
npm run registry:generate-core     # Generate manifests
npm run registry:validate          # Validate manifests
```

### MCP Commands
```bash
npm run mcp:cf:lite               # Cloudflare inventory (lite)
npm run mcp:cf:standard           # Cloudflare inventory (standard)
npm run mcp:cf:deep               # Cloudflare inventory (deep)
```

---

**Version**: 1.0.0
**Maintained by**: ChittyOS Core Team
**Last Updated**: 2025-10-18
**Next Review**: 2025-11-18
