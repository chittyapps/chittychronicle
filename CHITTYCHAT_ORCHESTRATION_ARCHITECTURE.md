# ChittyChat Universal Orchestration Architecture

**Version**: 1.0.0
**Updated**: 2025-10-18
**Status**: Design Specification

---

## Executive Summary

**ChittyChat** is the universal orchestration hub for the ChittyOS ecosystem, enabling seamless synchronization across:

- **Topics, Projects, Sessions** - Project/session lifecycle management
- **Todos** - Cross-session task coordination
- **Time, States, Contexts** - Temporal and state synchronization
- **Repos, Services** - Code and service state sync
- **Cross-Channel** - Slack, Discord, email, SMS, WhatsApp, iMessage
- **Cross-Platform** - Web, mobile, desktop, CLI, API
- **Cross-Model** - Claude, ChatGPT, Gemini, custom AI agents

---

## Architectural Vision

```
┌─────────────────────────────────────────────────────────────────┐
│                      CHITTYCHAT HUB                              │
│              Universal Orchestration Layer                       │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Sync       │  │   Connect    │  │   Beacon     │          │
│  │   Engine     │  │   Events     │  │   Alerts     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Message Bus & State Store                    │  │
│  │    Topics • Sessions • Todos • Contexts • States          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                           ↕️  ↕️  ↕️
┌─────────────────────────────────────────────────────────────────┐
│                      ADAPTERS LAYER                              │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Cross-Channel  │  Cross-Platform │     Cross-Model             │
│                 │                 │                             │
│  • Slack        │  • Web UI       │  • Claude Desktop (MCP)     │
│  • Discord      │  • Mobile Apps  │  • ChatGPT (Actions)        │
│  • Email        │  • CLI Tools    │  • Gemini (Extensions)      │
│  • SMS/Twilio   │  • VS Code Ext  │  • Custom Agents            │
│  • WhatsApp     │  • Replit       │  • ChittyRouter (Gateway)   │
│  • iMessage     │  • Cloudflare   │  • Voice Assistants         │
└─────────────────┴─────────────────┴─────────────────────────────┘
                           ↕️  ↕️  ↕️
┌─────────────────────────────────────────────────────────────────┐
│                    CHITTYOS SERVICES                             │
├─────────────────────────────────────────────────────────────────┤
│  ChittyChronicle • ChittyID • ChittyPM • ChittyLegal           │
│  ChittyChain • ChittyTrust • ChittyRegistry • 27+ more         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. ChittyChat Hub (Central Orchestrator)

**Location**: `/Users/nb/.claude/projects/-/CHITTYOS/chittyos-services/chittychat/`

**Purpose**: Central message bus and state synchronization coordinator

**Responsibilities**:
- **Message Routing**: Route messages between channels, platforms, and models
- **State Management**: Maintain synchronized state across all participants
- **Session Coordination**: Track active sessions across platforms
- **Todo Orchestration**: Coordinate tasks across parallel sessions
- **Context Propagation**: Ensure context flows across all touchpoints
- **Event Broadcasting**: Publish events to all subscribers
- **Conflict Resolution**: Handle state conflicts with CRDT-like algorithms

**Key Modules**:
```
chittychat/
├── core/
│   ├── message-bus.ts          # Central message routing
│   ├── state-store.ts          # Synchronized state storage
│   ├── session-registry.ts     # Active session tracking
│   └── conflict-resolver.ts    # State conflict resolution
├── sync/
│   ├── sync-engine.ts          # Synchronization orchestration
│   ├── sync-protocol.ts        # Sync protocol definitions
│   └── sync-adapters.ts        # Adapter interfaces
├── adapters/
│   ├── channels/               # Cross-channel adapters
│   ├── platforms/              # Cross-platform adapters
│   └── models/                 # Cross-model adapters
└── api/
    ├── ws-server.ts            # WebSocket server
    ├── http-api.ts             # HTTP REST API
    └── mcp-server.ts           # MCP integration
```

---

### 2. Synchronization Domains

ChittyChat synchronizes across these key domains:

#### A. **Topics**
**Definition**: Conceptual subjects or themes (e.g., "Legal Case 12345", "Q4 Financial Review")

**Synchronization**:
- Topic creation/update across all platforms
- Participant tracking (who's involved)
- Related artifacts (docs, messages, todos)
- Topic lifecycle (active, archived, closed)

**Data Model**:
```typescript
interface Topic {
  chittyId: string;              // CHITTY-CONTEXT-*
  title: string;
  description: string;
  participants: ChittyID[];      // User/service ChittyIDs
  relatedTopics: ChittyID[];     // Parent/child/sibling topics
  artifacts: {
    messages: ChittyID[];
    documents: ChittyID[];
    todos: ChittyID[];
    sessions: ChittyID[];
  };
  metadata: {
    created: Date;
    modified: Date;
    status: 'active' | 'archived' | 'closed';
    tags: string[];
  };
}
```

#### B. **Projects**
**Definition**: Structured work efforts (e.g., ChittyChronicle development, client engagement)

**Synchronization**:
- Project state across ChittyPM, Claude Code, web UI
- Milestone tracking
- Resource allocation
- Dependencies

**Data Model**:
```typescript
interface Project {
  chittyId: string;              // CHITTY-PROJ-*
  name: string;
  description: string;
  chittyPmProjectId?: string;    // ChittyPM integration
  topics: ChittyID[];            // Related topics
  repos: string[];               // Git repositories
  sessions: ChittyID[];          // Active/past sessions
  milestones: Milestone[];
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  metadata: {
    created: Date;
    modified: Date;
    owner: ChittyID;
    team: ChittyID[];
  };
}
```

#### C. **Sessions**
**Definition**: Temporal work contexts (e.g., Claude Code session, Slack thread, Zoom meeting)

**Synchronization**:
- Session state across platforms (Claude Desktop ↔ Web ↔ CLI)
- Active session tracking
- Session continuity (crash recovery)
- Cross-session context

**Data Model**:
```typescript
interface Session {
  chittyId: string;              // CHITTY-SESSION-*
  sessionId: string;             // Platform-specific ID
  platform: 'claude-code' | 'web' | 'slack' | 'cli' | 'mobile';
  projectId?: ChittyID;          // Parent project
  topicId?: ChittyID;            // Related topic
  todos: Todo[];                 // Session todos
  context: SessionContext;       // Full context state
  participants: ChittyID[];      // Users/agents in session
  status: 'active' | 'paused' | 'ended' | 'crashed';
  timestamps: {
    started: Date;
    lastActive: Date;
    ended?: Date;
  };
}

interface SessionContext {
  messages: Message[];
  files: FileReference[];
  state: Record<string, any>;    // Arbitrary state
  crumbs: Breadcrumb[];          // Navigation history
}
```

#### D. **Todos**
**Definition**: Actionable tasks with status tracking

**Synchronization**:
- Cross-session todo coordination
- Status updates propagate to all platforms
- Dependency tracking
- Todo mesh reconciliation (parallel sessions)

**Data Model**:
```typescript
interface Todo {
  chittyId: string;              // CHITTY-TODO-*
  content: string;
  activeForm: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  sessionId: ChittyID;           // Origin session
  projectId?: ChittyID;          // Parent project
  assignees: ChittyID[];         // Assigned users/agents
  dependencies: ChittyID[];      // Blocking todos
  deadline?: Date;
  metadata: {
    created: Date;
    modified: Date;
    completedAt?: Date;
    priority: 'low' | 'medium' | 'high' | 'critical';
  };
}
```

#### E. **Time & States**
**Definition**: Temporal markers and state snapshots

**Synchronization**:
- Timeline coordination across services
- State snapshots for rollback
- Temporal queries (state at time T)
- Event ordering

**Data Model**:
```typescript
interface TemporalState {
  chittyId: string;              // CHITTY-STATE-*
  entityId: ChittyID;            // Entity this state belongs to
  entityType: 'session' | 'project' | 'topic' | 'todo';
  snapshot: any;                 // State snapshot
  timestamp: Date;
  vectorClock: VectorClock;      // Distributed causality tracking
  checksum: string;              // State integrity
}

interface VectorClock {
  [nodeId: string]: number;      // Lamport timestamps per node
}
```

#### F. **Contexts**
**Definition**: Semantic context for AI/human understanding

**Synchronization**:
- Context propagation to all AI models
- Context enrichment from multiple sources
- Context summarization
- Context-aware routing

**Data Model**:
```typescript
interface Context {
  chittyId: string;              // CHITTY-CONTEXT-*
  type: 'session' | 'conversation' | 'document' | 'system';
  content: {
    summary: string;             // AI-generated summary
    keyPoints: string[];         // Extracted key points
    entities: Entity[];          // Named entities
    relationships: Relationship[]; // Entity relationships
  };
  sources: ChittyID[];           // Source entities
  enrichments: Enrichment[];     // Additional context
  metadata: {
    created: Date;
    modified: Date;
    confidence: number;          // Context confidence (0-1)
  };
}
```

#### G. **Repos & Services**
**Definition**: Code repositories and deployed services

**Synchronization**:
- Git state across repos
- Service health/status
- Deployment tracking
- Service discovery updates

**Data Model**:
```typescript
interface Repo {
  chittyId: string;              // CHITTY-REPO-*
  url: string;                   // Git URL
  branch: string;
  commit: string;                // Current HEAD
  workingTree: 'clean' | 'dirty';
  services: ChittyID[];          // Services in this repo
  metadata: {
    lastSync: Date;
    syncStatus: 'synced' | 'ahead' | 'behind' | 'diverged';
  };
}

interface Service {
  chittyId: string;              // CHITTY-SERVICE-*
  name: string;
  type: 'chittyapp' | 'chittyservice' | 'external';
  repoId?: ChittyID;             // Source repo
  endpoints: Endpoint[];
  health: 'healthy' | 'degraded' | 'down' | 'unknown';
  metadata: {
    version: string;
    deployed: Date;
    lastHealthCheck: Date;
  };
}
```

---

## Synchronization Protocol

### Protocol Layers

```
Layer 4: Application    → Domain-specific sync (todos, sessions, etc.)
Layer 3: State          → CRDT-based state convergence
Layer 2: Message        → Reliable message delivery
Layer 1: Transport      → WebSocket, HTTP, MCP, platform APIs
```

### Message Format

```typescript
interface SyncMessage {
  id: string;                    // Unique message ID
  type: SyncMessageType;
  source: {
    nodeId: string;              // Originating node
    platform: string;            // Source platform
    chittyId: ChittyID;          // Source entity ChittyID
  };
  target: {
    broadcast: boolean;          // Broadcast to all?
    nodeIds?: string[];          // Specific target nodes
    platforms?: string[];        // Specific platforms
  };
  payload: SyncPayload;
  metadata: {
    timestamp: Date;
    vectorClock: VectorClock;
    causality: ChittyID[];       // Causally dependent message IDs
    ttl: number;                 // Time-to-live (seconds)
  };
}

type SyncMessageType =
  | 'state_update'               // State change
  | 'state_request'              // Request current state
  | 'state_snapshot'             // Full state snapshot
  | 'event'                      // Domain event
  | 'command'                    // Execute command
  | 'query'                      // Query state
  | 'heartbeat'                  // Keep-alive
  | 'ack'                        // Acknowledgment
  | 'conflict'                   // State conflict detected
  ;

interface SyncPayload {
  domain: SyncDomain;
  operation: 'create' | 'update' | 'delete' | 'query';
  entity: {
    chittyId: ChittyID;
    type: string;
    data: any;
  };
  delta?: StateDelta;            // For incremental updates
}

type SyncDomain =
  | 'topics'
  | 'projects'
  | 'sessions'
  | 'todos'
  | 'contexts'
  | 'repos'
  | 'services'
  ;
```

### Conflict Resolution Strategy

**CRDT-Inspired Approach** (Conflict-free Replicated Data Types):

1. **Last-Write-Wins (LWW)**: For simple fields (title, description)
   - Use vector clocks for causality
   - Highest timestamp wins
   - ChittyID as tiebreaker

2. **Multi-Value Register (MVR)**: For conflicting updates
   - Maintain all conflicting versions
   - Surface to user for manual resolution
   - AI-assisted merge suggestions

3. **Add-Wins Set**: For collections (tags, participants)
   - Additions always preserved
   - Deletions only apply if causally after addition

4. **Operational Transformation**: For collaborative text editing
   - Transform concurrent operations
   - Preserve user intent
   - Converge to consistent state

**Example Conflict Resolution**:
```typescript
interface ConflictResolution {
  conflictId: string;
  entityId: ChittyID;
  conflictType: 'concurrent_update' | 'divergent_state' | 'causal_violation';
  versions: ConflictVersion[];
  resolution: {
    strategy: 'lww' | 'mvr' | 'merge' | 'manual';
    winnerId?: string;           // For LWW
    mergedState?: any;            // For automatic merge
    pending?: boolean;            // Requires manual resolution
  };
}
```

---

## Cross-Channel Adapters

### Adapter Interface

```typescript
interface ChannelAdapter {
  id: string;                    // Unique adapter ID
  channel: string;               // e.g., 'slack', 'discord'

  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Message handling
  sendMessage(message: AdapterMessage): Promise<void>;
  onMessage(handler: (message: AdapterMessage) => void): void;

  // State sync
  syncState(state: SyncState): Promise<void>;
  getState(): Promise<SyncState>;

  // Metadata
  getCapabilities(): ChannelCapabilities;
}

interface AdapterMessage {
  chittyId: ChittyID;            // Message ChittyID
  content: {
    text?: string;
    attachments?: Attachment[];
    embeds?: Embed[];
  };
  sender: ChittyID;              // Sender ChittyID
  channel: string;               // Channel identifier
  thread?: string;               // Thread identifier
  timestamp: Date;
}

interface ChannelCapabilities {
  supportsThreads: boolean;
  supportsReactions: boolean;
  supportsAttachments: boolean;
  supportsRichText: boolean;
  supportsVoice: boolean;
  supportsVideo: boolean;
  maxMessageLength: number;
}
```

### Implemented Adapters

| Channel | Status | Capabilities | Notes |
|---------|--------|--------------|-------|
| **Slack** | 🚧 Planned | Threads, reactions, files, rich text | Slack API + Bot |
| **Discord** | 🚧 Planned | Threads, reactions, files, embeds | Discord.js |
| **Email** | 🚧 Planned | Attachments, threading (References header) | SMTP/IMAP |
| **SMS** | 🚧 Planned | Text only, 160 char limit | Twilio API |
| **WhatsApp** | 🚧 Planned | Text, media, groups | WhatsApp Business API |
| **iMessage** | 🚧 Planned | Text, media, threads | macOS only, AppleScript |
| **Web UI** | ✅ Implemented | Full capabilities | WebSocket + HTTP |
| **CLI** | ✅ Implemented | Text only | `chitty` CLI |

---

## Cross-Platform Adapters

### Platform Interface

```typescript
interface PlatformAdapter {
  id: string;
  platform: string;              // 'web', 'mobile', 'cli', 'vscode'

  // Session management
  createSession(config: SessionConfig): Promise<Session>;
  resumeSession(sessionId: string): Promise<Session>;
  endSession(sessionId: string): Promise<void>;

  // Todo sync
  syncTodos(todos: Todo[]): Promise<void>;
  onTodoUpdate(handler: (todo: Todo) => void): void;

  // Context sync
  syncContext(context: Context): Promise<void>;
  getContext(): Promise<Context>;

  // Platform-specific capabilities
  getCapabilities(): PlatformCapabilities;
}
```

### Implemented Platforms

| Platform | Status | Integration Point | Notes |
|----------|--------|-------------------|-------|
| **Web UI** | ✅ Implemented | React apps, WebSocket | ChittyChronicle, ChittyTrust, etc. |
| **CLI** | ✅ Implemented | `chitty` tool | Session continuity, todo sync |
| **Claude Code** | ✅ Implemented | MCP, slash commands | Primary development platform |
| **Mobile** | 🚧 Planned | React Native | iOS/Android apps |
| **VS Code** | 🚧 Planned | Extension API | ChittyOS extension |
| **Replit** | 🚧 Planned | Replit Auth integration | Cloud development |
| **Cloudflare Workers** | 🚧 Planned | Workers API | Edge deployment |

---

## Cross-Model Adapters

### Model Interface

```typescript
interface ModelAdapter {
  id: string;
  model: string;                 // 'claude', 'chatgpt', 'gemini'
  provider: string;              // 'anthropic', 'openai', 'google'

  // Capabilities
  supportsMCP: boolean;
  supportsActions: boolean;
  supportsExtensions: boolean;

  // Context management
  sendContext(context: Context): Promise<void>;
  getContext(): Promise<Context>;

  // Tool invocation
  registerTools(tools: Tool[]): Promise<void>;
  invokeTool(toolId: string, params: any): Promise<any>;

  // Conversation sync
  syncConversation(messages: Message[]): Promise<void>;
}
```

### Implemented Model Adapters

| Model | Status | Integration Method | Capabilities |
|-------|--------|-------------------|--------------|
| **Claude Desktop** | ✅ Implemented | MCP Server | Full tool access, context sharing |
| **Claude Code** | ✅ Implemented | Slash commands, MCP | Native integration |
| **ChatGPT** | 🚧 Planned | GPT Actions | API-based tool calling |
| **Gemini** | 🚧 Planned | Extensions API | Function calling |
| **Custom Agents** | 🚧 Planned | ChittyRouter | Unified gateway |
| **Voice Assistants** | 🚧 Planned | Speech-to-text + ChittyChat | Alexa, Google Assistant |

---

## CLI Interface: `chitty sync`

### Command Structure

```bash
chitty sync <domain> [options]

Domains:
  topics          Sync topics across platforms
  projects        Sync project state
  sessions        Sync session state and context
  todos           Sync todos across sessions
  contexts        Sync AI context across models
  repos           Sync git repositories
  services        Sync service health and state
  all             Sync everything

Options:
  --platform <p>  Sync to specific platform (web, cli, mobile)
  --channel <c>   Sync to specific channel (slack, discord, email)
  --model <m>     Sync to specific AI model (claude, chatgpt, gemini)
  --session <s>   Sync specific session
  --project <p>   Sync specific project
  --watch         Continuous sync mode
  --dry-run       Show what would be synced
  --verbose       Verbose output
```

### Usage Examples

```bash
# Sync current session state to all platforms
chitty sync sessions

# Sync todos to Claude Desktop and web UI
chitty sync todos --platform web,cli --model claude

# Sync project state to ChittyPM and Slack
chitty sync projects --channel slack

# Watch mode: continuously sync todos
chitty sync todos --watch

# Sync everything (full state)
chitty sync all --verbose

# Dry run: see what would be synced
chitty sync contexts --dry-run

# Sync specific session to specific channel
chitty sync sessions --session sess-12345 --channel discord
```

### Implementation

**Location**: `/Users/nb/.claude/projects/-/CHITTYOS/chittyos-services/chittymcp/chitty`

**Add sync subcommand**:
```bash
sync|--sync)
    local domain="${2:-all}"
    shift 2 2>/dev/null || shift 1

    # Parse options
    local platforms=()
    local channels=()
    local models=()
    local session_id=""
    local project_id=""
    local watch=false
    local dry_run=false
    local verbose=false

    while [[ $# -gt 0 ]]; do
        case "$1" in
            --platform)
                IFS=',' read -ra platforms <<< "$2"
                shift 2
                ;;
            --channel)
                IFS=',' read -ra channels <<< "$2"
                shift 2
                ;;
            --model)
                IFS=',' read -ra models <<< "$2"
                shift 2
                ;;
            --session)
                session_id="$2"
                shift 2
                ;;
            --project)
                project_id="$2"
                shift 2
                ;;
            --watch)
                watch=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done

    # Execute sync
    sync_domain "$domain" \
        --platforms "${platforms[@]}" \
        --channels "${channels[@]}" \
        --models "${models[@]}" \
        --session "$session_id" \
        --project "$project_id" \
        --watch "$watch" \
        --dry-run "$dry_run" \
        --verbose "$verbose"
    ;;
```

---

## API Endpoints

### ChittyChat HTTP API

**Base URL**: `https://chat.chitty.cc/api/v1`

#### Sync Endpoints

```
POST   /sync/{domain}                    # Sync specific domain
POST   /sync/{domain}/{entityId}         # Sync specific entity
GET    /sync/{domain}/{entityId}/status  # Get sync status
POST   /sync/broadcast                   # Broadcast to all platforms
GET    /sync/conflicts                   # List unresolved conflicts
POST   /sync/conflicts/{id}/resolve      # Resolve conflict
```

#### Session Endpoints

```
POST   /sessions                         # Create session
GET    /sessions/{sessionId}             # Get session
PUT    /sessions/{sessionId}             # Update session
DELETE /sessions/{sessionId}             # End session
GET    /sessions/{sessionId}/context     # Get session context
POST   /sessions/{sessionId}/sync        # Sync session state
```

#### Todo Endpoints

```
GET    /todos                            # List todos (filtered)
POST   /todos                            # Create todo
PUT    /todos/{todoId}                   # Update todo
DELETE /todos/{todoId}                   # Delete todo
POST   /todos/reconcile                  # Reconcile parallel session todos
GET    /todos/mesh                       # Get todo mesh visualization
```

#### Context Endpoints

```
POST   /contexts                         # Create context
GET    /contexts/{contextId}             # Get context
POST   /contexts/{contextId}/enrich      # Enrich context with AI
POST   /contexts/propagate               # Propagate context to models
```

### ChittyChat WebSocket API

**URL**: `wss://chat.chitty.cc/ws`

**Protocol**: Sync messages over WebSocket

```typescript
// Client → Server
{
  "type": "subscribe",
  "domains": ["todos", "sessions"],
  "filters": {
    "projectId": "CHITTY-PROJ-12345"
  }
}

// Server → Client (real-time updates)
{
  "type": "state_update",
  "domain": "todos",
  "operation": "update",
  "entity": {
    "chittyId": "CHITTY-TODO-67890",
    "status": "completed"
  }
}

// Client → Server (send update)
{
  "type": "state_update",
  "domain": "todos",
  "entity": { /* todo data */ }
}
```

---

## Data Flow Examples

### Example 1: Todo Created in Claude Code

```
1. User creates todo in Claude Code session
   ↓
2. TodoWrite tool sends to ChittyChat Hub
   POST https://chat.chitty.cc/api/v1/todos
   ↓
3. ChittyChat Hub:
   - Generates CHITTY-TODO-* ID
   - Stores in state store
   - Broadcasts sync message
   ↓
4. Sync Engine routes to:
   - Web UI (WebSocket)
   - Slack (channel adapter)
   - ChatGPT (model adapter via ChittyRouter)
   - Mobile app (platform adapter)
   ↓
5. All platforms receive todo and update local state
   ↓
6. User sees todo appear in Slack, web UI, mobile simultaneously
```

### Example 2: Cross-Session Todo Reconciliation

```
1. User has 3 parallel Claude Code sessions working on same project
   ↓
2. Each session creates different todos
   Session A: Todo 1, Todo 2
   Session B: Todo 2 (duplicate), Todo 3
   Session C: Todo 4, Todo 5
   ↓
3. User runs: chitty sync todos --project CHITTY-PROJ-123
   ↓
4. ChittyChat Hub:
   - Fetches todos from all 3 sessions
   - Detects Todo 2 duplicate (by content hash)
   - Reconciles status:
     * Session A: in_progress
     * Session B: completed
     → Result: completed (most advanced status wins)
   - Merges all todos with deduplication
   ↓
5. Reconciled todo mesh:
   Todo 1 (pending, from Session A)
   Todo 2 (completed, merged from A+B)
   Todo 3 (pending, from Session B)
   Todo 4 (in_progress, from Session C)
   Todo 5 (pending, from Session C)
   ↓
6. Broadcasts reconciled state to all sessions
   ↓
7. All sessions now show same 5 todos with correct statuses
```

### Example 3: Context Propagation Across Models

```
1. User working in Claude Code on ChittyChronicle
   ↓
2. Context accumulated:
   - File reads
   - Recent changes
   - Conversation history
   ↓
3. User switches to ChatGPT to ask architecture question
   ↓
4. ChittyChat Hub:
   - Detects context switch
   - Extracts relevant context (last 10 messages, current files)
   - Generates context summary via Claude API
   ↓
5. Context sent to ChatGPT via GPT Actions:
   POST https://chat.chitty.cc/api/v1/contexts/propagate
   {
     "source": "claude-code",
     "target": "chatgpt",
     "contextId": "CHITTY-CONTEXT-789",
     "summary": "User working on ChittyChronicle legal timeline app..."
   }
   ↓
6. ChatGPT receives context and can answer with full awareness
   ↓
7. User gets consistent experience across models
```

---

## Implementation Roadmap

### Phase 1: Foundation (Current)
- ✅ ChittyChat service structure in ecosystem
- ✅ Basic session management in `chitty` CLI
- ✅ ChittyConnect event publishing
- ✅ ChittyBeacon alerting
- 🚧 Sync protocol specification (this document)

### Phase 2: Core Sync Engine (Q1 2025)
- [ ] ChittyChat Hub HTTP API
- [ ] ChittyChat WebSocket server
- [ ] State store with CRDT-based conflict resolution
- [ ] `chitty sync` CLI implementation
- [ ] Basic adapters: web, CLI, Claude Code (MCP)

### Phase 3: Cross-Channel (Q2 2025)
- [ ] Slack adapter
- [ ] Discord adapter
- [ ] Email adapter (SMTP/IMAP)
- [ ] SMS adapter (Twilio)
- [ ] Channel-agnostic message routing

### Phase 4: Cross-Platform (Q2-Q3 2025)
- [ ] Mobile apps (iOS/Android)
- [ ] VS Code extension
- [ ] Replit integration
- [ ] Cloudflare Workers deployment
- [ ] Platform-agnostic state sync

### Phase 5: Cross-Model (Q3 2025)
- [ ] ChatGPT Actions integration
- [ ] Gemini Extensions integration
- [ ] Custom agent framework
- [ ] ChittyRouter unified gateway
- [ ] Voice assistant adapters

### Phase 6: Advanced Features (Q4 2025)
- [ ] AI-powered conflict resolution
- [ ] Predictive state sync (pre-fetch)
- [ ] Offline sync with eventual consistency
- [ ] Time-travel debugging (replay state history)
- [ ] Visual todo mesh explorer

---

## Security & Privacy

### Authentication
- **User Authentication**: ChittyID OIDC tokens
- **Service Authentication**: Service tokens per adapter
- **Message Signing**: HMAC-SHA256 signatures
- **Token Rotation**: Automatic rotation every 24h

### Authorization
- **RBAC**: Role-based access control via ChittyID
- **Scope Isolation**: Users only see their own data + shared contexts
- **Channel Permissions**: Respect platform-specific permissions (e.g., Slack channel membership)

### Data Privacy
- **Encryption in Transit**: TLS 1.3 for all HTTP/WebSocket
- **Encryption at Rest**: AES-256 for state store
- **End-to-End Encryption**: Optional E2E for sensitive channels
- **Data Residency**: Configurable storage regions
- **GDPR Compliance**: Right to delete, data portability

### Audit Trail
- **Event Logging**: All sync operations logged to ChittyChain
- **State Snapshots**: Periodic snapshots for auditability
- **Change Attribution**: Every change linked to ChittyID
- **Replay Capability**: Reconstruct state at any point in time

---

## Performance & Scalability

### Message Throughput
- **Target**: 10,000 messages/second per hub instance
- **Sharding**: Horizontal scaling by topic/project
- **Load Balancing**: Round-robin across hub instances

### Latency
- **Target**: <100ms end-to-end sync latency
- **Optimization**: WebSocket for real-time, HTTP for batch
- **Caching**: Redis for hot state data

### Storage
- **State Store**: PostgreSQL with TimescaleDB for time-series
- **Message Queue**: Redis Streams for reliable delivery
- **File Storage**: Google Cloud Storage for attachments

### Monitoring
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Alerting**: ChittyBeacon integration
- **Health Checks**: `/health` endpoint per service

---

## Developer Guide

### Adding a New Channel Adapter

1. **Implement ChannelAdapter interface**
   ```typescript
   // adapters/channels/my-channel.ts
   export class MyChannelAdapter implements ChannelAdapter {
     // Implementation
   }
   ```

2. **Register adapter**
   ```typescript
   // adapters/registry.ts
   adapterRegistry.register('my-channel', MyChannelAdapter);
   ```

3. **Configure credentials**
   ```env
   MY_CHANNEL_API_KEY=...
   MY_CHANNEL_WEBHOOK_URL=...
   ```

4. **Test adapter**
   ```bash
   npm test -- adapters/channels/my-channel.test.ts
   ```

### Adding a New Sync Domain

1. **Define data model**
   ```typescript
   // models/my-domain.ts
   export interface MyDomain {
     chittyId: ChittyID;
     // ...fields
   }
   ```

2. **Implement sync logic**
   ```typescript
   // sync/domains/my-domain.ts
   export class MyDomainSync implements DomainSync<MyDomain> {
     // Implementation
   }
   ```

3. **Add CLI command**
   ```bash
   # Add to chitty CLI
   case "$domain" in
     my-domain)
       sync_my_domain "$@"
       ;;
   esac
   ```

4. **Add API endpoints**
   ```typescript
   // api/routes/my-domain.ts
   router.post('/sync/my-domain', syncMyDomain);
   ```

---

## Appendix: Configuration

### Environment Variables

```env
# ChittyChat Hub
CHITTYCHAT_BASE_URL=https://chat.chitty.cc
CHITTYCHAT_WS_URL=wss://chat.chitty.cc/ws
CHITTYCHAT_API_KEY=...

# ChittySync Service
CHITTYSYNC_ENDPOINT=https://sync.chitty.cc

# Adapters - Channels
SLACK_BOT_TOKEN=...
SLACK_SIGNING_SECRET=...
DISCORD_BOT_TOKEN=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

# Adapters - Models
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
GOOGLE_AI_API_KEY=...

# Storage
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
GOOGLE_CLOUD_STORAGE_BUCKET=...

# ChittyOS Services
CHITTYID_SERVICE=https://id.chitty.cc
CHITTYAUTH_SERVICE=https://auth.chitty.cc
CHITTYCONNECT_BASE_URL=https://connect.chitty.cc
CHITTY_BEACON_API_URL=https://api.chittybeacon.com/v1
CHITTYREGISTRY_URL=https://registry.chitty.cc
```

---

**Version**: 1.0.0
**Status**: Design Specification
**Next Review**: 2025-11-01
**Maintainer**: ChittyOS Core Team
