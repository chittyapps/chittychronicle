import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';

interface AuditEvent {
  actor_sub: string;
  action: string;
  target?: string;
  target_type?: string;
  meta?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  ts?: Date;
}

interface BatchedAuditLoggerOptions {
  pool: Pool;
  batchSize?: number;
  batchInterval?: number;
  maxRetries?: number;
  retryDelay?: number;
  enableMetrics?: boolean;
}

class BatchedAuditLogger extends EventEmitter {
  private pool: Pool;
  private batchSize: number;
  private batchInterval: number;
  private maxRetries: number;
  private retryDelay: number;
  private enableMetrics: boolean;

  private eventQueue: AuditEvent[] = [];
  private batchTimer: NodeJS.Timer | null = null;
  private processing = false;
  private shutdown = false;

  // Metrics
  private metrics = {
    eventsReceived: 0,
    eventsProcessed: 0,
    batchesProcessed: 0,
    failedBatches: 0,
    averageBatchSize: 0,
    lastFlushTime: new Date(),
    errors: 0
  };

  constructor(options: BatchedAuditLoggerOptions) {
    super();
    
    this.pool = options.pool;
    this.batchSize = options.batchSize || 100;
    this.batchInterval = options.batchInterval || 5000; // 5 seconds
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.enableMetrics = options.enableMetrics || true;

    this.startBatchTimer();
    this.setupGracefulShutdown();
  }

  /**
   * Log an audit event (non-blocking)
   */
  async log(event: AuditEvent): Promise<void> {
    if (this.shutdown) {
      throw new Error('Audit logger is shutting down');
    }

    // Add timestamp if not provided
    if (!event.ts) {
      event.ts = new Date();
    }

    this.eventQueue.push(event);
    this.metrics.eventsReceived++;

    // Emit event for monitoring
    this.emit('event-queued', event);

    // Check if we should flush immediately
    if (this.eventQueue.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Flush queued events immediately
   */
  async flush(): Promise<void> {
    if (this.processing || this.eventQueue.length === 0) {
      return;
    }

    this.processing = true;
    
    try {
      const batch = this.eventQueue.splice(0, this.batchSize);
      await this.processBatch(batch);
      
      this.metrics.batchesProcessed++;
      this.metrics.eventsProcessed += batch.length;
      this.metrics.averageBatchSize = Math.round(this.metrics.eventsProcessed / this.metrics.batchesProcessed);
      this.metrics.lastFlushTime = new Date();

      this.emit('batch-processed', {
        batchSize: batch.length,
        queueSize: this.eventQueue.length
      });

    } catch (error) {
      this.metrics.failedBatches++;
      this.metrics.errors++;
      this.emit('batch-failed', error);
      throw error;
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a batch of audit events
   */
  private async processBatch(events: AuditEvent[], attempt = 1): Promise<void> {
    if (events.length === 0) return;

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Use COPY for high-performance bulk insert
      const copyQuery = `
        COPY audit (actor_sub, action, target, target_type, meta, ip_address, user_agent, ts)
        FROM STDIN WITH (FORMAT csv, HEADER false, DELIMITER ',', QUOTE '"', ESCAPE '"')
      `;

      const copyStream = client.query(copyQuery);

      // Convert events to CSV format
      const csvData = events.map(event => {
        const row = [
          event.actor_sub,
          event.action,
          event.target || null,
          event.target_type || null,
          event.meta ? JSON.stringify(event.meta) : null,
          event.ip_address || null,
          event.user_agent || null,
          event.ts?.toISOString() || new Date().toISOString()
        ];
        
        return row.map(field => {
          if (field === null) return '';
          const escaped = String(field).replace(/"/g, '""');
          return `"${escaped}"`;
        }).join(',');
      }).join('\n');

      // Write CSV data
      copyStream.write(csvData + '\n');
      copyStream.end();

      await new Promise((resolve, reject) => {
        copyStream.on('end', resolve);
        copyStream.on('error', reject);
      });

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      
      if (attempt < this.maxRetries) {
        this.emit('batch-retry', { attempt, error: error.message });
        await this.delay(this.retryDelay * attempt);
        return this.processBatch(events, attempt + 1);
      }
      
      // If all retries failed, store events for later or emit failure
      this.emit('batch-failed-permanently', { events, error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Start the batch timer
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    this.batchTimer = setInterval(async () => {
      try {
        await this.flush();
      } catch (error) {
        this.emit('error', error);
      }
    }, this.batchInterval);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueSize: this.eventQueue.length,
      isProcessing: this.processing
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      eventsReceived: 0,
      eventsProcessed: 0,
      batchesProcessed: 0,
      failedBatches: 0,
      averageBatchSize: 0,
      lastFlushTime: new Date(),
      errors: 0
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.shutdown = true;
    
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush remaining events
    if (this.eventQueue.length > 0) {
      await this.flush();
    }

    this.emit('shutdown');
  }

  private setupGracefulShutdown(): void {
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Fastify plugin for audit logging
export async function chittyIDAuditPlugin(fastify: any, options: any) {
  const auditLogger = new BatchedAuditLogger({
    pool: options.pool,
    ...options.audit
  });

  fastify.decorate('auditLogger', auditLogger);

  // Helper function to log auth events
  fastify.decorateRequest('logAuditEvent', function(this: any, event: Omit<AuditEvent, 'ip_address' | 'user_agent'>) {
    const fullEvent: AuditEvent = {
      ...event,
      ip_address: this.ip,
      user_agent: this.headers['user-agent']
    };
    
    return auditLogger.log(fullEvent);
  });

  // Add hooks for automatic logging of auth events
  fastify.addHook('onResponse', async (request: any, reply: any) => {
    // Log successful auth operations
    if (request.url.startsWith('/v1/oauth/') && reply.statusCode < 400) {
      const action = request.url.split('/').pop();
      const actor = request.chittyId?.sub || request.headers['x-client-id'] || 'anonymous';
      
      await auditLogger.log({
        actor_sub: actor,
        action: `oauth_${action}`,
        target: request.body?.audience || request.body?.client_id,
        target_type: 'oauth_operation',
        meta: {
          method: request.method,
          url: request.url,
          status: reply.statusCode,
          grant_type: request.body?.grant_type
        },
        ip_address: request.ip,
        user_agent: request.headers['user-agent']
      });
    }
  });

  // Shutdown hook
  fastify.addHook('onClose', async () => {
    await auditLogger.shutdown();
  });

  // Metrics endpoint
  fastify.get('/_metrics/audit', async () => {
    return auditLogger.getMetrics();
  });
}

// Express middleware variant
export function chittyIDAuditMiddleware(options: BatchedAuditLoggerOptions) {
  const auditLogger = new BatchedAuditLogger(options);

  return {
    middleware: (req: any, res: any, next: any) => {
      req.auditLogger = auditLogger;
      req.logAuditEvent = (event: Omit<AuditEvent, 'ip_address' | 'user_agent'>) => {
        return auditLogger.log({
          ...event,
          ip_address: req.ip,
          user_agent: req.headers['user-agent']
        });
      };
      next();
    },
    
    logger: auditLogger,
    
    metricsHandler: (req: any, res: any) => {
      res.json(auditLogger.getMetrics());
    }
  };
}

// Utility functions for common audit events
export class AuditEvents {
  static tokenIssued(sub: string, audience: string, trustLevel: number, meta?: any): AuditEvent {
    return {
      actor_sub: sub,
      action: 'token_issued',
      target: audience,
      target_type: 'token',
      meta: { trust_level: trustLevel, ...meta }
    };
  }

  static tokenRevoked(sub: string, jti: string, reason?: string): AuditEvent {
    return {
      actor_sub: sub,
      action: 'token_revoked',
      target: jti,
      target_type: 'token',
      meta: { reason }
    };
  }

  static serverRegistered(actor: string, serverId: string, audience: string): AuditEvent {
    return {
      actor_sub: actor,
      action: 'server_registered',
      target: serverId,
      target_type: 'mcp_server',
      meta: { audience }
    };
  }

  static authenticationFailed(sub: string, reason: string, meta?: any): AuditEvent {
    return {
      actor_sub: sub,
      action: 'authentication_failed',
      target_type: 'authentication',
      meta: { reason, ...meta }
    };
  }

  static privilegeEscalation(sub: string, fromLevel: number, toLevel: number, reason?: string): AuditEvent {
    return {
      actor_sub: sub,
      action: 'privilege_escalation',
      target_type: 'trust_level',
      meta: { from_level: fromLevel, to_level: toLevel, reason }
    };
  }
}

export { BatchedAuditLogger, AuditEvent };