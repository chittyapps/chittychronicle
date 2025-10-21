/**
 * ChittyConnect Client
 *
 * ChittyConnect serves as the central integration hub for:
 * 1. Platform connections (iMessage, WhatsApp, email, DocuSign, OpenPhone)
 * 2. Service-to-service coordination
 * 3. Intelligence layers (ContextConsciousness, MemoryCloude, Cognitive-Coordination)
 *
 * ChittyChronicle consumes platform data FROM ChittyConnect rather than directly integrating.
 */

export interface ChittyConnectMessage {
  id: string;
  platform: 'imessage' | 'whatsapp' | 'email' | 'docusign' | 'openphone';
  externalId: string;
  externalThreadId: string;
  direction: 'inbound' | 'outbound' | 'system';
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  bodyText: string;
  bodyHtml?: string;
  sentAt: string;
  receivedAt: string;
  attachments?: Array<{
    url: string;
    mimeType: string;
    fileName: string;
    sha256: string;
  }>;
  metadata?: Record<string, any>;
}

export interface ChittyConnectConversation {
  id: string;
  platform: 'imessage' | 'whatsapp' | 'email' | 'docusign' | 'openphone';
  externalThreadId: string;
  participants: string[];
  startedAt: string;
  lastMessageAt: string;
  messageCount: number;
  messages: ChittyConnectMessage[];
}

export interface MemoryContext {
  sessionId: string;
  interaction: {
    userId: string;
    type: string;
    content: string;
    entities: Array<{
      type: string;
      id: string;
      name: string;
    }>;
    actions: Array<{
      type: string;
      [key: string]: any;
    }>;
  };
}

export interface EcosystemAwareness {
  success: boolean;
  timestamp: number;
  ecosystem: {
    totalServices: number;
    healthy: number;
    degraded: number;
    down: number;
  };
  anomalies: Array<{
    type: string;
    service: string;
    value: number;
    threshold: number;
    severity: string;
  }>;
  predictions: {
    count: number;
    details: Array<{
      type: string;
      service: string;
      timeToFailure: number;
      confidence: number;
    }>;
  };
}

export class ChittyConnectClient {
  private baseUrl: string;
  private serviceToken: string;
  private apiKey?: string;

  constructor(config?: {
    baseUrl?: string;
    serviceToken?: string;
    apiKey?: string;
  }) {
    this.baseUrl = config?.baseUrl ||
                   process.env.CHITTYCONNECT_BASE_URL ||
                   'https://chittyconnect-staging.ccorp.workers.dev';
    this.serviceToken = config?.serviceToken ||
                        process.env.CHITTYCHRONICLE_SERVICE_TOKEN || '';
    this.apiKey = config?.apiKey || process.env.CHITTYCONNECT_API_KEY;
  }

  private async request<T>(
    path: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    // Use API key if available, otherwise service token
    if (this.apiKey) {
      headers['X-ChittyOS-API-Key'] = this.apiKey;
    } else if (this.serviceToken) {
      headers['Authorization'] = `Bearer ${this.serviceToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `ChittyConnect API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  //===========================================================================
  // PLATFORM MESSAGE CONSUMPTION
  //===========================================================================

  /**
   * Get messages from a specific platform for a case
   */
  async getMessages(params: {
    platform: 'imessage' | 'whatsapp' | 'email' | 'docusign' | 'openphone';
    caseId?: string;
    threadId?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ChittyConnectMessage[]> {
    const query = new URLSearchParams();
    if (params.caseId) query.set('caseId', params.caseId);
    if (params.threadId) query.set('threadId', params.threadId);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.limit) query.set('limit', params.limit.toString());

    return this.request<ChittyConnectMessage[]>(
      `/api/messages/${params.platform}?${query.toString()}`
    );
  }

  /**
   * Get conversations from a specific platform
   */
  async getConversations(params: {
    platform: 'imessage' | 'whatsapp' | 'email' | 'docusign' | 'openphone';
    caseId?: string;
    participant?: string;
    limit?: number;
  }): Promise<ChittyConnectConversation[]> {
    const query = new URLSearchParams();
    if (params.caseId) query.set('caseId', params.caseId);
    if (params.participant) query.set('participant', params.participant);
    if (params.limit) query.set('limit', params.limit.toString());

    return this.request<ChittyConnectConversation[]>(
      `/api/conversations/${params.platform}?${query.toString()}`
    );
  }

  /**
   * Get aggregated messages across all platforms
   */
  async getAggregatedMessages(params: {
    caseId: string;
    startDate?: string;
    endDate?: string;
    platforms?: string[];
  }): Promise<ChittyConnectMessage[]> {
    return this.request<ChittyConnectMessage[]>(
      '/api/messages/aggregate',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  }

  //===========================================================================
  // INTELLIGENCE APIS
  //===========================================================================

  /**
   * MemoryCloude™: Persist interaction context
   */
  async persistMemory(context: MemoryContext): Promise<{
    success: boolean;
    memoryId: string;
  }> {
    return this.request('/api/intelligence/memory/persist', {
      method: 'POST',
      body: JSON.stringify(context),
    });
  }

  /**
   * MemoryCloude™: Recall context with semantic search
   */
  async recallMemory(params: {
    sessionId: string;
    query: string;
    limit?: number;
    semantic?: boolean;
  }): Promise<{
    success: boolean;
    contexts: MemoryContext[];
  }> {
    return this.request('/api/intelligence/memory/recall', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * ContextConsciousness™: Get ecosystem awareness
   */
  async getEcosystemAwareness(): Promise<EcosystemAwareness> {
    return this.request('/api/intelligence/consciousness/awareness');
  }

  /**
   * Cognitive-Coordination™: Execute multi-step task
   */
  async executeTask(params: {
    task: {
      description: string;
      type: string;
      metadata?: Record<string, any>;
    };
    sessionId: string;
  }): Promise<{
    success: boolean;
    result: {
      taskId: string;
      status: string;
      recommendations?: string[];
      insights?: string[];
    };
  }> {
    return this.request('/api/intelligence/coordination/execute', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  //===========================================================================
  // SERVICE COORDINATION
  //===========================================================================

  /**
   * Log timeline event to ChittyConnect audit trail
   */
  async logTimelineEvent(params: {
    eventType: string;
    entityId: string;
    data: Record<string, any>;
  }): Promise<{
    success: boolean;
    logId: string;
  }> {
    return this.request('/api/chittychronicle/log', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get timeline for an entity from ChittyConnect
   */
  async getEntityTimeline(entityId: string): Promise<{
    success: boolean;
    timeline: Array<{
      eventType: string;
      timestamp: string;
      data: Record<string, any>;
    }>;
  }> {
    return this.request(`/api/chittychronicle/timeline/${entityId}`);
  }

  /**
   * Check all ChittyOS services status
   */
  async getServicesStatus(): Promise<{
    services: Array<{
      name: string;
      status: 'healthy' | 'degraded' | 'down';
      latency?: number;
      lastCheck: string;
    }>;
  }> {
    return this.request('/api/services/status');
  }

  //===========================================================================
  // THIRD-PARTY PLATFORM PROXIES
  //===========================================================================

  /**
   * Query Notion database via ChittyConnect proxy
   */
  async queryNotion(params: {
    databaseId: string;
    filter?: Record<string, any>;
  }): Promise<any> {
    return this.request('/api/thirdparty/notion/query', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  /**
   * Get Google Calendar events via ChittyConnect proxy
   */
  async getCalendarEvents(params: {
    calendarId: string;
    timeMin?: string;
    timeMax?: string;
  }): Promise<any> {
    const query = new URLSearchParams(params as any);
    return this.request(`/api/thirdparty/google/calendar/events?${query}`);
  }

  //===========================================================================
  // HEALTH CHECK
  //===========================================================================

  /**
   * Check if ChittyConnect is available
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    message?: string;
  }> {
    try {
      await this.request('/health');
      return { healthy: true };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
export const chittyConnect = new ChittyConnectClient();
