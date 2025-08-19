import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Pool } from 'pg';
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { ulid } from 'ulid';
import { AuditEvents, BatchedAuditLogger } from './chittyid-audit-logger';

interface ServerRegistrationRequest {
  name: string;
  audience: string;
  tenant: string;
  metadata?: Record<string, any>;
  description?: string;
  allowed_tools?: string[];
  default_scopes?: string[];
}

interface ServerRegistrationResponse {
  server_id: string;
  client_id: string;
  client_secret: string;
  audience: string;
  name: string;
  tenant: string;
  created_at: string;
  jwks_uri?: string;
  metadata?: Record<string, any>;
}

interface ClientCreationRequest {
  name: string;
  tenant_id: string;
  type: 'service' | 'application' | 'spa';
  lvl: number;
  roles?: string[];
  scopes?: string;
  redirect_uris?: string[];
  metadata?: Record<string, any>;
}

interface ClientCreationResponse {
  client_id: string;
  client_secret?: string; // Only for confidential clients
  name: string;
  type: string;
  lvl: number;
  created_at: string;
  redirect_uris?: string[];
}

export class ChittyIDServerRegistry {
  constructor(
    private pool: Pool,
    private auditLogger?: BatchedAuditLogger
  ) {}

  /**
   * Register a new MCP server (requires L5 trust level)
   */
  async registerServer(
    request: FastifyRequest<{ Body: ServerRegistrationRequest }>,
    reply: FastifyReply,
    actorSub: string
  ): Promise<ServerRegistrationResponse> {
    const { name, audience, tenant, metadata, description, allowed_tools, default_scopes } = request.body;

    // Validate required fields
    if (!name || !audience || !tenant) {
      reply.code(400);
      throw new Error('name, audience, and tenant are required');
    }

    // Validate audience format (should be URI-like)
    if (!this.isValidAudience(audience)) {
      reply.code(400);
      throw new Error('audience must be a valid URI (e.g., mcp://server-name or https://example.com/api)');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if tenant exists
      const tenantResult = await client.query('SELECT id FROM tenants WHERE name = $1', [tenant]);
      if (tenantResult.rows.length === 0) {
        reply.code(404);
        throw new Error(`Tenant '${tenant}' not found`);
      }
      const tenantId = tenantResult.rows[0].id;

      // Check if audience is already taken
      const audienceCheck = await client.query('SELECT id FROM servers WHERE audience = $1', [audience]);
      if (audienceCheck.rows.length > 0) {
        reply.code(409);
        throw new Error(`Audience '${audience}' is already registered`);
      }

      // Generate client credentials
      const clientId = this.generateClientId();
      const clientSecret = this.generateClientSecret();
      const clientSecretHash = await bcrypt.hash(clientSecret, 12);
      const serverId = ulid();

      // Create service identity for the server
      const chittyId = `${tenant}.mcp.${serverId}`;
      
      const identityResult = await client.query(`
        INSERT INTO identities (chitty_id, type, tenant_id, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [chittyId, 'mcp', tenantId, { server_type: 'mcp', auto_generated: true }]);
      
      const identityId = identityResult.rows[0].id;

      // Create service account with L2 trust level (standard server-to-server)
      await client.query(`
        INSERT INTO service_accounts (client_id, client_secret_hash, tenant_id, identity_id, name, lvl, roles, scopes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        clientId,
        clientSecretHash,
        tenantId,
        identityId,
        `${name} Service Account`,
        2, // L2 trust level for MCP servers
        ['mcp.server'],
        default_scopes?.join(' ') || 'mcp:invoke tools:read tools:write'
      ]);

      // Register the MCP server
      const serverResult = await client.query(`
        INSERT INTO servers (id, name, audience, tenant_id, client_id, metadata)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `, [serverId, name, audience, tenantId, clientId, {
        ...metadata,
        description,
        allowed_tools,
        default_scopes,
        registered_by: actorSub,
        registration_date: new Date().toISOString()
      }]);

      // Set up default tool permissions if provided
      if (allowed_tools && allowed_tools.length > 0) {
        for (const tool of allowed_tools) {
          await client.query(`
            INSERT INTO tool_permissions (tenant_id, mcp_server_id, tool_name, scope_required, lvl_required)
            VALUES ($1, $2, $3, $4, $5)
          `, [tenantId, serverId, tool, 'tools:write', 2]);
        }
      }

      await client.query('COMMIT');

      // Log server registration
      if (this.auditLogger) {
        await this.auditLogger.log(AuditEvents.serverRegistered(actorSub, serverId, audience));
      }

      return {
        server_id: serverId,
        client_id: clientId,
        client_secret: clientSecret,
        audience: audience,
        name: name,
        tenant: tenant,
        created_at: serverResult.rows[0].created_at,
        jwks_uri: `https://registry.chitty.cc/.well-known/jwks.json`,
        metadata: serverResult.rows[0].metadata
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new OAuth2 client (service accounts, applications, SPAs)
   */
  async createClient(
    request: FastifyRequest<{ Body: ClientCreationRequest }>,
    reply: FastifyReply,
    actorSub: string
  ): Promise<ClientCreationResponse> {
    const { name, tenant_id, type, lvl, roles, scopes, redirect_uris, metadata } = request.body;

    // Validate required fields
    if (!name || !tenant_id || !type) {
      reply.code(400);
      throw new Error('name, tenant_id, and type are required');
    }

    // Validate trust level
    if (lvl < 1 || lvl > 5) {
      reply.code(400);
      throw new Error('lvl must be between 1 and 5');
    }

    // Validate client type
    if (!['service', 'application', 'spa'].includes(type)) {
      reply.code(400);
      throw new Error('type must be one of: service, application, spa');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Verify tenant exists
      const tenantCheck = await client.query('SELECT id, name FROM tenants WHERE id = $1', [tenant_id]);
      if (tenantCheck.rows.length === 0) {
        reply.code(404);
        throw new Error('Tenant not found');
      }
      const tenantName = tenantCheck.rows[0].name;

      // Generate client credentials
      const clientId = this.generateClientId();
      let clientSecret: string | undefined;
      let clientSecretHash: string | undefined;

      // Only confidential clients (service/application) get client secrets
      if (type === 'service' || type === 'application') {
        clientSecret = this.generateClientSecret();
        clientSecretHash = await bcrypt.hash(clientSecret, 12);
      }

      // Create identity for the client
      const chittyId = `${tenantName}.${type}.${ulid()}`;
      
      const identityResult = await client.query(`
        INSERT INTO identities (chitty_id, type, tenant_id, metadata)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [chittyId, type === 'service' ? 'service' : 'user', tenant_id, { client_type: type, auto_generated: true }]);
      
      const identityId = identityResult.rows[0].id;

      // Create service account
      const serviceAccountResult = await client.query(`
        INSERT INTO service_accounts (client_id, client_secret_hash, tenant_id, identity_id, name, lvl, roles, scopes, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING created_at
      `, [
        clientId,
        clientSecretHash,
        tenant_id,
        identityId,
        name,
        lvl,
        roles || [type === 'service' ? 'service' : 'user'],
        scopes || (type === 'service' ? 'mcp:invoke tools:read' : 'openid profile'),
        {
          ...metadata,
          client_type: type,
          redirect_uris: type === 'spa' ? redirect_uris : undefined,
          registered_by: actorSub,
          registration_date: new Date().toISOString()
        }
      ]);

      await client.query('COMMIT');

      // Log client creation
      if (this.auditLogger) {
        await this.auditLogger.log({
          actor_sub: actorSub,
          action: 'client_created',
          target: clientId,
          target_type: 'oauth_client',
          meta: { client_type: type, trust_level: lvl, tenant_id }
        });
      }

      return {
        client_id: clientId,
        client_secret: clientSecret,
        name: name,
        type: type,
        lvl: lvl,
        created_at: serviceAccountResult.rows[0].created_at,
        redirect_uris: type === 'spa' ? redirect_uris : undefined
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get server information by ID
   */
  async getServer(serverId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT s.*, t.name as tenant_name, sa.client_id, sa.scopes, sa.roles
        FROM servers s
        JOIN tenants t ON s.tenant_id = t.id
        LEFT JOIN service_accounts sa ON s.client_id = sa.client_id
        WHERE s.id = $1 AND s.status = 'active'
      `, [serverId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  /**
   * List servers for a tenant
   */
  async listServers(tenantId: string, limit = 50, offset = 0): Promise<any[]> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT s.*, sa.client_id, sa.scopes, sa.roles,
               COUNT(*) OVER() as total_count
        FROM servers s
        JOIN service_accounts sa ON s.client_id = sa.client_id
        WHERE s.tenant_id = $1 AND s.status = 'active'
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3
      `, [tenantId, limit, offset]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Update server metadata
   */
  async updateServer(serverId: string, updates: Partial<ServerRegistrationRequest>, actorSub: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        UPDATE servers 
        SET metadata = metadata || $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'active'
        RETURNING id
      `, [serverId, { 
        ...updates,
        updated_by: actorSub,
        updated_at: new Date().toISOString()
      }]);

      if (result.rows.length > 0 && this.auditLogger) {
        await this.auditLogger.log({
          actor_sub: actorSub,
          action: 'server_updated',
          target: serverId,
          target_type: 'mcp_server',
          meta: { updates }
        });
      }

      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Deactivate a server
   */
  async deactivateServer(serverId: string, actorSub: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Deactivate server
      const serverResult = await client.query(`
        UPDATE servers 
        SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'active'
        RETURNING client_id
      `, [serverId]);

      if (serverResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return false;
      }

      // Deactivate associated identity
      await client.query(`
        UPDATE identities 
        SET status = 'suspended', updated_at = CURRENT_TIMESTAMP
        WHERE id IN (
          SELECT identity_id FROM service_accounts WHERE client_id = $1
        )
      `, [serverResult.rows[0].client_id]);

      await client.query('COMMIT');

      // Log server deactivation
      if (this.auditLogger) {
        await this.auditLogger.log({
          actor_sub: actorSub,
          action: 'server_deactivated',
          target: serverId,
          target_type: 'mcp_server',
          meta: { reason: 'administrative_action' }
        });
      }

      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods

  private generateClientId(): string {
    // Generate a readable client ID: prefix + ULID
    return `chitty_${ulid().toLowerCase()}`;
  }

  private generateClientSecret(): string {
    // Generate a secure client secret: prefix + random bytes
    const secret = randomBytes(32).toString('base64url');
    return `cs_${secret}`;
  }

  private isValidAudience(audience: string): boolean {
    try {
      // Allow MCP URIs or HTTP(S) URLs
      return audience.startsWith('mcp://') || 
             audience.startsWith('https://') || 
             audience.startsWith('http://localhost');
    } catch {
      return false;
    }
  }
}

// Fastify plugin
export async function chittyIDServerRegistryPlugin(fastify: FastifyInstance, options: any) {
  const registry = new ChittyIDServerRegistry(options.pool, options.auditLogger);

  // Server registration endpoint (requires L5)
  fastify.post('/v1/servers/register', {
    preHandler: [
      // Require L5 trust level for server registration
      async (request: any, reply) => {
        if (!request.chittyId || request.chittyId.lvl < 5) {
          reply.code(403).send({
            error: 'insufficient_trust_level',
            error_description: 'Server registration requires L5 trust level',
            'WWW-Authenticate': 'Bearer level=5'
          });
        }
      }
    ]
  }, async (request: any, reply) => {
    try {
      return await registry.registerServer(request, reply, request.chittyId.sub);
    } catch (error) {
      if (error.message.includes('already registered')) {
        return reply.code(409).send({ error: 'audience_exists', error_description: error.message });
      }
      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: 'tenant_not_found', error_description: error.message });
      }
      throw error;
    }
  });

  // Client creation endpoint (requires L4)
  fastify.post('/v1/clients', {
    preHandler: [
      async (request: any, reply) => {
        if (!request.chittyId || request.chittyId.lvl < 4) {
          reply.code(403).send({
            error: 'insufficient_trust_level',
            error_description: 'Client creation requires L4 trust level',
            'WWW-Authenticate': 'Bearer level=4'
          });
        }
      }
    ]
  }, async (request: any, reply) => {
    return await registry.createClient(request, reply, request.chittyId.sub);
  });

  // Get server info
  fastify.get('/v1/servers/:id', async (request: any, reply) => {
    const server = await registry.getServer(request.params.id);
    if (!server) {
      return reply.code(404).send({ error: 'server_not_found' });
    }
    return server;
  });

  // List servers for tenant
  fastify.get('/v1/servers', async (request: any, reply) => {
    const { tenant_id, limit = 50, offset = 0 } = request.query;
    
    if (!tenant_id) {
      return reply.code(400).send({ error: 'tenant_id is required' });
    }

    return await registry.listServers(tenant_id, limit, offset);
  });

  // Update server
  fastify.patch('/v1/servers/:id', {
    preHandler: [
      async (request: any, reply) => {
        if (!request.chittyId || request.chittyId.lvl < 4) {
          reply.code(403).send({
            error: 'insufficient_trust_level',
            error_description: 'Server updates require L4 trust level'
          });
        }
      }
    ]
  }, async (request: any, reply) => {
    const updated = await registry.updateServer(request.params.id, request.body, request.chittyId.sub);
    if (!updated) {
      return reply.code(404).send({ error: 'server_not_found' });
    }
    return { success: true };
  });

  // Deactivate server
  fastify.delete('/v1/servers/:id', {
    preHandler: [
      async (request: any, reply) => {
        if (!request.chittyId || request.chittyId.lvl < 5) {
          reply.code(403).send({
            error: 'insufficient_trust_level',
            error_description: 'Server deactivation requires L5 trust level'
          });
        }
      }
    ]
  }, async (request: any, reply) => {
    const deactivated = await registry.deactivateServer(request.params.id, request.chittyId.sub);
    if (!deactivated) {
      return reply.code(404).send({ error: 'server_not_found' });
    }
    return { success: true };
  });
}