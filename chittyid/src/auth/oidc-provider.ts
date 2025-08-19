import Fastify from 'fastify';
import { importSPKI, SignJWT, exportJWK, generateKeyPair } from 'jose';
import { ulid } from 'ulid';

interface OIDCConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  introspection_endpoint: string;
  revocation_endpoint: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  subject_types_supported: string[];
  id_token_signing_alg_values_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  claims_supported: string[];
  scopes_supported: string[];
}

interface JWK {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  key: any;
}

class ChittyIDProvider {
  private issuer = 'https://registry.chitty.cc';
  private activeKeys: Map<string, JWK> = new Map();
  private keyRotationInterval = 30 * 24 * 60 * 60 * 1000; // 30 days
  private keyOverlapPeriod = 7 * 24 * 60 * 60 * 1000; // 7 days

  async initializeKeys() {
    // Generate initial signing key
    const { publicKey, privateKey } = await generateKeyPair('EdDSA');
    const kid = ulid();
    
    this.activeKeys.set(kid, {
      kid,
      kty: 'OKP',
      alg: 'EdDSA',
      use: 'sig',
      key: privateKey
    });

    // Schedule key rotation
    setInterval(() => this.rotateKeys(), this.keyRotationInterval);
  }

  async rotateKeys() {
    const { publicKey, privateKey } = await generateKeyPair('EdDSA');
    const kid = ulid();
    
    // Add new key
    this.activeKeys.set(kid, {
      kid,
      kty: 'OKP',
      alg: 'EdDSA',
      use: 'sig',
      key: privateKey
    });

    // Remove old keys after overlap period
    setTimeout(() => {
      const keysToRemove = Array.from(this.activeKeys.keys()).slice(0, -2);
      keysToRemove.forEach(k => this.activeKeys.delete(k));
    }, this.keyOverlapPeriod);
  }

  getOpenIDConfiguration(): OIDCConfiguration {
    return {
      issuer: this.issuer,
      authorization_endpoint: `${this.issuer}/v1/oauth/authorize`,
      token_endpoint: `${this.issuer}/v1/oauth/token`,
      jwks_uri: `${this.issuer}/.well-known/jwks.json`,
      introspection_endpoint: `${this.issuer}/v1/oauth/introspect`,
      revocation_endpoint: `${this.issuer}/v1/oauth/revoke`,
      response_types_supported: ['code', 'token'],
      grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token', 'chitty_api_key'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['EdDSA'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      claims_supported: ['sub', 'iss', 'aud', 'exp', 'iat', 'jti', 'lvl', 'org', 'tenant', 'roles', 'scope'],
      scopes_supported: ['openid', 'profile', 'mcp:invoke', 'tools:read', 'tools:write', 'tokens:introspect', 'write:critical']
    };
  }

  async getJWKS() {
    const keys = await Promise.all(
      Array.from(this.activeKeys.values()).map(async (jwk) => {
        const publicKey = await exportJWK(jwk.key);
        return {
          ...publicKey,
          kid: jwk.kid,
          alg: jwk.alg,
          use: jwk.use
        };
      })
    );

    return { keys };
  }

  async createToken(claims: any, trustLevel: number = 1): Promise<string> {
    const [currentKey] = Array.from(this.activeKeys.values()).slice(-1);
    if (!currentKey) throw new Error('No signing key available');

    const ttlByLevel = {
      1: 30 * 60, // 30m
      2: 30 * 60, // 30m
      3: 20 * 60, // 20m
      4: 15 * 60, // 15m
      5: 10 * 60  // 10m
    };

    const ttl = ttlByLevel[trustLevel] || 30 * 60;
    const now = Math.floor(Date.now() / 1000);

    const jwt = await new SignJWT({
      ...claims,
      iss: this.issuer,
      iat: now,
      nbf: now,
      exp: now + ttl,
      jti: ulid(),
      lvl: trustLevel
    })
      .setProtectedHeader({ alg: 'EdDSA', kid: currentKey.kid })
      .sign(currentKey.key);

    return jwt;
  }
}

// Fastify Plugin
export async function chittyIDPlugin(fastify: Fastify.FastifyInstance) {
  const provider = new ChittyIDProvider();
  await provider.initializeKeys();

  // Well-known endpoints
  fastify.get('/.well-known/openid-configuration', async (request, reply) => {
    return provider.getOpenIDConfiguration();
  });

  fastify.get('/.well-known/jwks.json', async (request, reply) => {
    return await provider.getJWKS();
  });

  // OAuth2 token endpoint
  fastify.post('/v1/oauth/token', async (request, reply) => {
    const { grant_type } = request.body as any;

    switch (grant_type) {
      case 'client_credentials':
        return handleClientCredentials(request, reply, provider);
      case 'authorization_code':
        return handleAuthorizationCode(request, reply, provider);
      case 'refresh_token':
        return handleRefreshToken(request, reply, provider);
      case 'chitty_api_key':
        return handleApiKeyExchange(request, reply, provider);
      default:
        return reply.code(400).send({ error: 'unsupported_grant_type' });
    }
  });

  // Introspection endpoint
  fastify.post('/v1/oauth/introspect', async (request, reply) => {
    const { token } = request.body as any;
    // TODO: Implement token introspection
    return { active: true };
  });

  // Revocation endpoint
  fastify.post('/v1/oauth/revoke', async (request, reply) => {
    const { token, token_type_hint } = request.body as any;
    // TODO: Implement token revocation
    return reply.code(200).send();
  });
}

async function handleClientCredentials(request: any, reply: any, provider: ChittyIDProvider) {
  const { client_id, client_secret, scope, audience } = request.body;

  // TODO: Validate client credentials against database
  
  const token = await provider.createToken({
    sub: `chitty.cc.service.${client_id}`,
    aud: audience,
    scope: scope || 'mcp:invoke tools:read',
    roles: ['mcp.server']
  }, 2); // L2 for service-to-service

  return {
    access_token: token,
    token_type: 'Bearer',
    expires_in: 1800,
    scope: scope
  };
}

async function handleAuthorizationCode(request: any, reply: any, provider: ChittyIDProvider) {
  const { code, redirect_uri, code_verifier, client_id } = request.body;

  // TODO: Validate authorization code and PKCE
  
  const token = await provider.createToken({
    sub: 'chitty.cc.user.01JJH3R4Y7E0Y9SWQ9ZV7W4TTP', // TODO: Get from code
    aud: client_id,
    scope: 'openid profile mcp:invoke',
    roles: ['user']
  }, 3); // L3 for user actions

  return {
    access_token: token,
    token_type: 'Bearer',
    expires_in: 1200,
    refresh_token: ulid() // TODO: Store refresh token
  };
}

async function handleRefreshToken(request: any, reply: any, provider: ChittyIDProvider) {
  const { refresh_token } = request.body;

  // TODO: Validate refresh token
  
  return reply.code(501).send({ error: 'not_implemented' });
}

async function handleApiKeyExchange(request: any, reply: any, provider: ChittyIDProvider) {
  const apiKey = request.headers['x-api-key'];

  // TODO: Validate API key against legacy table
  
  return reply.code(501).send({ error: 'not_implemented' });
}