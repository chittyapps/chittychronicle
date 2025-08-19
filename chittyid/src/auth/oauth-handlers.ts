import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Pool, PoolClient } from 'pg';
import { randomBytes, createHash } from 'crypto';
import { ulid } from 'ulid';
import bcrypt from 'bcrypt';
import { ChittyIDProvider } from './chittyid-oidc-provider';
import { AuditEvents, BatchedAuditLogger } from './chittyid-audit-logger';

interface TokenRequest {
  grant_type: string;
  client_id?: string;
  client_secret?: string;
  audience?: string;
  scope?: string;
  code?: string;
  redirect_uri?: string;
  code_verifier?: string;
  refresh_token?: string;
  username?: string;
  password?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  id_token?: string;
}

interface ClientCredentials {
  client_id: string;
  client_secret_hash: string;
  tenant_id: string;
  identity_id: string;
  lvl: number;
  roles: string[];
  scopes: string;
  chitty_id: string;
  tenant_name: string;
}

interface AuthorizationCode {
  code: string;
  client_id: string;
  identity_id: string;
  redirect_uri: string;
  scope: string;
  code_challenge?: string;
  code_challenge_method?: string;
  expires_at: Date;
}

export class ChittyIDOAuthHandlers {
  constructor(
    private provider: ChittyIDProvider,
    private pool: Pool,
    private auditLogger?: BatchedAuditLogger
  ) {}

  /**
   * Handle Client Credentials grant (L2 - service to service)
   */
  async handleClientCredentials(request: FastifyRequest<{ Body: TokenRequest }>, reply: FastifyReply): Promise<TokenResponse> {
    const { client_id, client_secret, audience, scope } = request.body;

    if (!client_id || !client_secret) {
      reply.code(400);
      throw new Error('client_id and client_secret are required');
    }

    // Validate client credentials
    const client = await this.validateClientCredentials(client_id, client_secret);
    if (!client) {
      if (this.auditLogger) {
        await this.auditLogger.log(AuditEvents.authenticationFailed(
          client_id,
          'invalid_client_credentials',
          { grant_type: 'client_credentials' }
        ));
      }
      reply.code(401);
      throw new Error('Invalid client credentials');
    }

    // Create access token with L2 trust level
    const accessToken = await this.provider.createToken({
      sub: client.chitty_id,
      aud: audience || 'default',
      scope: scope || client.scopes,
      roles: client.roles,
      org: client.tenant_name,
      tenant: client.tenant_name,
      mcp_server_id: client_id
    }, client.lvl);

    // Log successful token issuance
    if (this.auditLogger) {
      await this.auditLogger.log(AuditEvents.tokenIssued(
        client.chitty_id,
        audience || 'default',
        client.lvl,
        { grant_type: 'client_credentials', client_id }
      ));
    }

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.getTTLByLevel(client.lvl),
      scope: scope || client.scopes
    };
  }

  /**
   * Handle Authorization Code grant with PKCE (L3 - user interactions)
   */
  async handleAuthorizationCode(request: FastifyRequest<{ Body: TokenRequest }>, reply: FastifyReply): Promise<TokenResponse> {
    const { code, redirect_uri, code_verifier, client_id } = request.body;

    if (!code || !redirect_uri || !client_id) {
      reply.code(400);
      throw new Error('code, redirect_uri, and client_id are required');
    }

    // Validate authorization code
    const authCode = await this.validateAuthorizationCode(code, client_id, redirect_uri);
    if (!authCode) {
      if (this.auditLogger) {
        await this.auditLogger.log(AuditEvents.authenticationFailed(
          client_id,
          'invalid_authorization_code',
          { grant_type: 'authorization_code', code: code.substring(0, 8) + '...' }
        ));
      }
      reply.code(400);
      throw new Error('Invalid authorization code');
    }

    // Validate PKCE if present
    if (authCode.code_challenge && authCode.code_challenge_method) {
      if (!code_verifier) {
        reply.code(400);
        throw new Error('code_verifier is required for PKCE');
      }

      const valid = this.validatePKCE(code_verifier, authCode.code_challenge, authCode.code_challenge_method);
      if (!valid) {
        if (this.auditLogger) {
          await this.auditLogger.log(AuditEvents.authenticationFailed(
            client_id,
            'invalid_pkce_verification',
            { grant_type: 'authorization_code' }
          ));
        }
        reply.code(400);
        throw new Error('Invalid PKCE verification');
      }
    }

    // Get user identity
    const identity = await this.getIdentityById(authCode.identity_id);
    if (!identity) {
      reply.code(400);
      throw new Error('Invalid user identity');
    }

    // Mark authorization code as used
    await this.markAuthorizationCodeUsed(code);

    // Create access token with L3 trust level
    const accessToken = await this.provider.createToken({
      sub: identity.chitty_id,
      aud: client_id,
      scope: authCode.scope,
      roles: identity.roles || ['user'],
      org: identity.tenant_name,
      tenant: identity.tenant_name
    }, 3); // L3 for user actions

    // Create refresh token
    const refreshToken = await this.createRefreshToken(identity.id, client_id, authCode.scope);

    // Log successful token issuance
    if (this.auditLogger) {
      await this.auditLogger.log(AuditEvents.tokenIssued(
        identity.chitty_id,
        client_id,
        3,
        { grant_type: 'authorization_code', has_refresh_token: true }
      ));
    }

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.getTTLByLevel(3),
      refresh_token: refreshToken,
      scope: authCode.scope
    };
  }

  /**
   * Handle Refresh Token grant
   */
  async handleRefreshToken(request: FastifyRequest<{ Body: TokenRequest }>, reply: FastifyReply): Promise<TokenResponse> {
    const { refresh_token, scope } = request.body;

    if (!refresh_token) {
      reply.code(400);
      throw new Error('refresh_token is required');
    }

    // Validate refresh token
    const tokenData = await this.validateRefreshToken(refresh_token);
    if (!tokenData) {
      if (this.auditLogger) {
        await this.auditLogger.log(AuditEvents.authenticationFailed(
          'unknown',
          'invalid_refresh_token',
          { grant_type: 'refresh_token' }
        ));
      }
      reply.code(401);
      throw new Error('Invalid refresh token');
    }

    // Get user identity
    const identity = await this.getIdentityById(tokenData.identity_id);
    if (!identity) {
      reply.code(400);
      throw new Error('Invalid user identity');
    }

    // Update refresh token last used
    await this.updateRefreshTokenUsage(refresh_token);

    // Create new access token
    const accessToken = await this.provider.createToken({
      sub: identity.chitty_id,
      aud: tokenData.client_id,
      scope: scope || tokenData.scope,
      roles: identity.roles || ['user'],
      org: identity.tenant_name,
      tenant: identity.tenant_name
    }, 3); // L3 for user actions

    // Log token refresh
    if (this.auditLogger) {
      await this.auditLogger.log(AuditEvents.tokenIssued(
        identity.chitty_id,
        tokenData.client_id,
        3,
        { grant_type: 'refresh_token', scope: scope || tokenData.scope }
      ));
    }

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: this.getTTLByLevel(3),
      scope: scope || tokenData.scope
    };
  }

  /**
   * Handle Legacy API Key exchange
   */
  async handleApiKeyExchange(request: FastifyRequest, reply: FastifyReply): Promise<TokenResponse> {
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      reply.code(400);
      throw new Error('X-API-Key header is required');
    }

    // Validate API key
    const keyData = await this.validateApiKey(apiKey);
    if (!keyData) {
      if (this.auditLogger) {
        await this.auditLogger.log(AuditEvents.authenticationFailed(
          'unknown',
          'invalid_api_key',
          { grant_type: 'chitty_api_key', key_prefix: apiKey.substring(0, 8) }
        ));
      }
      reply.code(401);
      throw new Error('Invalid API key');
    }

    // Update API key last used
    await this.updateApiKeyUsage(keyData.id);

    // Create access token with key's trust level
    const accessToken = await this.provider.createToken({
      sub: keyData.chitty_id,
      aud: 'legacy-api',
      scope: keyData.scope,
      roles: keyData.roles || ['legacy'],
      org: keyData.tenant_name,
      tenant: keyData.tenant_name,
      rate_tier: 'legacy'
    }, keyData.lvl);

    // Log legacy key usage (with deprecation warning)
    if (this.auditLogger) {
      await this.auditLogger.log({
        actor_sub: keyData.chitty_id,
        action: 'legacy_api_key_used',
        target: keyData.prefix,
        target_type: 'api_key',
        meta: {
          grant_type: 'chitty_api_key',
          deprecated: true,
          migration_required: true,
          key_age_days: Math.floor((Date.now() - keyData.created_at.getTime()) / (1000 * 60 * 60 * 24))
        }
      });
    }

    // Set deprecation warning header
    reply.header('X-ChittyID-Deprecation-Warning', 'API keys are deprecated. Please migrate to OAuth2 client credentials.');

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: Math.min(this.getTTLByLevel(keyData.lvl), 900), // Max 15 minutes for legacy keys
      scope: keyData.scope
    };
  }

  // Database helper methods

  private async validateClientCredentials(clientId: string, clientSecret: string): Promise<ClientCredentials | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT sa.client_id, sa.client_secret_hash, sa.tenant_id, sa.identity_id, 
               sa.lvl, sa.roles, sa.scopes, i.chitty_id, t.name as tenant_name
        FROM service_accounts sa
        JOIN identities i ON sa.identity_id = i.id
        JOIN tenants t ON sa.tenant_id = t.id
        WHERE sa.client_id = $1 AND i.status = 'active'
      `, [clientId]);

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      const valid = await bcrypt.compare(clientSecret, row.client_secret_hash);
      
      return valid ? row : null;
    } finally {
      client.release();
    }
  }

  private async validateAuthorizationCode(code: string, clientId: string, redirectUri: string): Promise<AuthorizationCode | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM authorization_codes 
        WHERE code = $1 AND client_id = $2 AND redirect_uri = $3 
        AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL
      `, [code, clientId, redirectUri]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  private validatePKCE(codeVerifier: string, codeChallenge: string, method: string): boolean {
    if (method === 'S256') {
      const hash = createHash('sha256').update(codeVerifier).digest();
      const challenge = hash.toString('base64url');
      return challenge === codeChallenge;
    } else if (method === 'plain') {
      return codeVerifier === codeChallenge;
    }
    return false;
  }

  private async markAuthorizationCodeUsed(code: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE authorization_codes SET used_at = CURRENT_TIMESTAMP WHERE code = $1',
        [code]
      );
    } finally {
      client.release();
    }
  }

  private async getIdentityById(identityId: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT i.*, t.name as tenant_name, 
               COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
        FROM identities i
        JOIN tenants t ON i.tenant_id = t.id
        LEFT JOIN role_bindings rb ON i.id = rb.identity_id 
        LEFT JOIN roles r ON rb.role_id = r.id
        WHERE i.id = $1 AND i.status = 'active'
        GROUP BY i.id, t.name
      `, [identityId]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  private async createRefreshToken(identityId: string, clientId: string, scope: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    const client = await this.pool.connect();
    try {
      await client.query(`
        INSERT INTO refresh_tokens (token_hash, identity_id, client_id, scope, expires_at)
        VALUES ($1, $2, $3, $4, $5)
      `, [tokenHash, identityId, clientId, scope, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]); // 30 days
      
      return token;
    } finally {
      client.release();
    }
  }

  private async validateRefreshToken(refreshToken: string): Promise<any> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM refresh_tokens 
        WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP AND revoked_at IS NULL
      `, [tokenHash]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  private async updateRefreshTokenUsage(refreshToken: string): Promise<void> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE refresh_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE token_hash = $1',
        [tokenHash]
      );
    } finally {
      client.release();
    }
  }

  private async validateApiKey(apiKey: string): Promise<any> {
    const parts = apiKey.split('_');
    if (parts.length < 2) return null;
    
    const prefix = parts[0] + '_' + parts[1]; // e.g., "ck_live"
    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    
    const client = await this.pool.connect();
    try {
      const result = await client.query(`
        SELECT ak.*, i.chitty_id, t.name as tenant_name,
               COALESCE(array_agg(r.name) FILTER (WHERE r.name IS NOT NULL), '{}') as roles
        FROM api_keys_legacy ak
        JOIN identities i ON ak.owner_identity_id = i.id
        JOIN tenants t ON ak.tenant_id = t.id
        LEFT JOIN role_bindings rb ON i.id = rb.identity_id 
        LEFT JOIN roles r ON rb.role_id = r.id
        WHERE ak.prefix = $1 AND ak.hash = $2 AND ak.active = true
        AND (ak.expires_at IS NULL OR ak.expires_at > CURRENT_TIMESTAMP)
        AND i.status = 'active'
        GROUP BY ak.id, i.chitty_id, t.name
      `, [prefix, keyHash]);

      return result.rows.length > 0 ? result.rows[0] : null;
    } finally {
      client.release();
    }
  }

  private async updateApiKeyUsage(keyId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query(
        'UPDATE api_keys_legacy SET last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
        [keyId]
      );
    } finally {
      client.release();
    }
  }

  private getTTLByLevel(level: number): number {
    const ttlMap = {
      1: 30 * 60, // 30 minutes
      2: 30 * 60, // 30 minutes
      3: 20 * 60, // 20 minutes
      4: 15 * 60, // 15 minutes
      5: 10 * 60  // 10 minutes
    };
    return ttlMap[level] || 30 * 60;
  }
}

// Fastify plugin integration
export async function chittyIDOAuthPlugin(fastify: FastifyInstance, options: any) {
  const oauthHandlers = new ChittyIDOAuthHandlers(
    options.provider,
    options.pool,
    options.auditLogger
  );

  fastify.post('/v1/oauth/token', async (request, reply) => {
    const { grant_type } = request.body as TokenRequest;

    try {
      switch (grant_type) {
        case 'client_credentials':
          return await oauthHandlers.handleClientCredentials(request, reply);
        case 'authorization_code':
          return await oauthHandlers.handleAuthorizationCode(request, reply);
        case 'refresh_token':
          return await oauthHandlers.handleRefreshToken(request, reply);
        case 'chitty_api_key':
          return await oauthHandlers.handleApiKeyExchange(request, reply);
        default:
          reply.code(400);
          return { error: 'unsupported_grant_type', error_description: `Grant type '${grant_type}' is not supported` };
      }
    } catch (error) {
      const errorMap = {
        'client_id and client_secret are required': { error: 'invalid_request', error_description: error.message },
        'Invalid client credentials': { error: 'invalid_client', error_description: error.message },
        'Invalid authorization code': { error: 'invalid_grant', error_description: error.message },
        'Invalid refresh token': { error: 'invalid_grant', error_description: error.message },
        'Invalid API key': { error: 'invalid_grant', error_description: error.message }
      };

      const errorResponse = errorMap[error.message] || { 
        error: 'server_error', 
        error_description: 'An internal server error occurred' 
      };

      return reply.code(reply.statusCode || 400).send(errorResponse);
    }
  });
}