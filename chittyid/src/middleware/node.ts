import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { createRemoteJWKSet, jwtVerify, JWTVerifyResult } from 'jose';
import LRU from 'tiny-lru';

interface ChittyIDTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nbf?: number;
  jti: string;
  lvl: number;
  org?: string;
  tenant?: string;
  roles?: string[];
  scope?: string;
  mcp_server_id?: string;
  permitted_tools?: string[];
  rate_tier?: string;
}

interface ChittyIDMiddlewareOptions {
  jwksUri?: string;
  issuer?: string;
  audience?: string;
  requiredScopes?: string[];
  minTrustLevel?: number;
  jtiCacheSize?: number;
  jtiCacheTTL?: number;
  onTokenVerified?: (claims: ChittyIDTokenClaims) => Promise<void>;
  skipPaths?: string[];
}

interface ChittyIDAuthRequest extends FastifyRequest {
  chittyId: ChittyIDTokenClaims;
}

class JTICache {
  private cache: ReturnType<typeof LRU>;
  private ttl: number;

  constructor(size: number = 10000, ttl: number = 3600000) {
    this.cache = LRU(size);
    this.ttl = ttl;
  }

  async check(jti: string): Promise<boolean> {
    if (this.cache.get(jti)) {
      return false; // Already seen
    }
    this.cache.set(jti, true, this.ttl);
    return true;
  }
}

export const chittyIDMiddleware: FastifyPluginAsync<ChittyIDMiddlewareOptions> = async (
  fastify,
  options
) => {
  const {
    jwksUri = 'https://registry.chitty.cc/.well-known/jwks.json',
    issuer = 'https://registry.chitty.cc',
    audience,
    requiredScopes = [],
    minTrustLevel = 1,
    jtiCacheSize = 10000,
    jtiCacheTTL = 3600000,
    onTokenVerified,
    skipPaths = []
  } = options;

  const JWKS = createRemoteJWKSet(new URL(jwksUri));
  const jtiCache = new JTICache(jtiCacheSize, jtiCacheTTL);

  fastify.decorateRequest('chittyId', null);

  fastify.addHook('onRequest', async (request: ChittyIDAuthRequest, reply: FastifyReply) => {
    // Skip auth for certain paths
    if (skipPaths.includes(request.url)) {
      return;
    }

    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        error: 'unauthorized',
        error_description: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.slice(7);

    try {
      // Verify JWT
      const { payload } = await jwtVerify(token, JWKS, {
        issuer,
        audience,
        clockTolerance: 5
      }) as JWTVerifyResult & { payload: ChittyIDTokenClaims };

      // Check JTI for replay protection
      const isNew = await jtiCache.check(payload.jti);
      if (!isNew) {
        return reply.code(401).send({
          error: 'invalid_token',
          error_description: 'Token replay detected'
        });
      }

      // Check trust level
      if (payload.lvl < minTrustLevel) {
        return reply.code(403).send({
          error: 'insufficient_trust_level',
          error_description: `Trust level ${minTrustLevel} required, but token has level ${payload.lvl}`,
          'WWW-Authenticate': `Bearer scope="${requiredScopes.join(' ')}" level=${minTrustLevel}`
        });
      }

      // Check required scopes
      const tokenScopes = (payload.scope || '').split(' ').filter(s => s);
      const hasAllScopes = requiredScopes.every(scope => tokenScopes.includes(scope));
      
      if (!hasAllScopes) {
        return reply.code(403).send({
          error: 'insufficient_scope',
          error_description: `Required scopes: ${requiredScopes.join(' ')}`,
          'WWW-Authenticate': `Bearer scope="${requiredScopes.join(' ')}"`
        });
      }

      // Custom token verification hook
      if (onTokenVerified) {
        await onTokenVerified(payload);
      }

      // Attach claims to request
      request.chittyId = payload;

    } catch (error) {
      if (error.code === 'ERR_JWT_EXPIRED') {
        return reply.code(401).send({
          error: 'token_expired',
          error_description: 'The access token has expired'
        });
      }

      return reply.code(401).send({
        error: 'invalid_token',
        error_description: error.message || 'Token validation failed'
      });
    }
  });
};

// Express middleware variant
import { Request, Response, NextFunction } from 'express';

export function chittyIDExpressMiddleware(options: ChittyIDMiddlewareOptions = {}) {
  const {
    jwksUri = 'https://registry.chitty.cc/.well-known/jwks.json',
    issuer = 'https://registry.chitty.cc',
    audience,
    requiredScopes = [],
    minTrustLevel = 1,
    jtiCacheSize = 10000,
    jtiCacheTTL = 3600000,
    onTokenVerified,
    skipPaths = []
  } = options;

  const JWKS = createRemoteJWKSet(new URL(jwksUri));
  const jtiCache = new JTICache(jtiCacheSize, jtiCacheTTL);

  return async (req: Request & { chittyId?: ChittyIDTokenClaims }, res: Response, next: NextFunction) => {
    // Skip auth for certain paths
    if (skipPaths.includes(req.path)) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        error_description: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.slice(7);

    try {
      // Verify JWT
      const { payload } = await jwtVerify(token, JWKS, {
        issuer,
        audience,
        clockTolerance: 5
      }) as JWTVerifyResult & { payload: ChittyIDTokenClaims };

      // Check JTI for replay protection
      const isNew = await jtiCache.check(payload.jti);
      if (!isNew) {
        return res.status(401).json({
          error: 'invalid_token',
          error_description: 'Token replay detected'
        });
      }

      // Check trust level
      if (payload.lvl < minTrustLevel) {
        res.setHeader('WWW-Authenticate', `Bearer scope="${requiredScopes.join(' ')}" level=${minTrustLevel}`);
        return res.status(403).json({
          error: 'insufficient_trust_level',
          error_description: `Trust level ${minTrustLevel} required, but token has level ${payload.lvl}`
        });
      }

      // Check required scopes
      const tokenScopes = (payload.scope || '').split(' ').filter(s => s);
      const hasAllScopes = requiredScopes.every(scope => tokenScopes.includes(scope));
      
      if (!hasAllScopes) {
        res.setHeader('WWW-Authenticate', `Bearer scope="${requiredScopes.join(' ')}"`);
        return res.status(403).json({
          error: 'insufficient_scope',
          error_description: `Required scopes: ${requiredScopes.join(' ')}`
        });
      }

      // Custom token verification hook
      if (onTokenVerified) {
        await onTokenVerified(payload);
      }

      // Attach claims to request
      req.chittyId = payload;
      next();

    } catch (error) {
      if (error.code === 'ERR_JWT_EXPIRED') {
        return res.status(401).json({
          error: 'token_expired',
          error_description: 'The access token has expired'
        });
      }

      return res.status(401).json({
        error: 'invalid_token',
        error_description: error.message || 'Token validation failed'
      });
    }
  };
}

// Helper functions
export function hasScope(claims: ChittyIDTokenClaims, scope: string): boolean {
  const scopes = (claims.scope || '').split(' ');
  return scopes.includes(scope);
}

export function hasRole(claims: ChittyIDTokenClaims, role: string): boolean {
  return (claims.roles || []).includes(role);
}

export function hasTool(claims: ChittyIDTokenClaims, tool: string): boolean {
  return (claims.permitted_tools || []).includes(tool);
}

export function getTrustLevel(claims: ChittyIDTokenClaims): number {
  return claims.lvl || 1;
}

// Usage example:
/*
// Fastify
await fastify.register(chittyIDMiddleware, {
  audience: 'mcp://my-service',
  requiredScopes: ['mcp:invoke', 'tools:read'],
  minTrustLevel: 2
});

// Express
app.use(chittyIDExpressMiddleware({
  audience: 'mcp://my-service',
  requiredScopes: ['mcp:invoke', 'tools:read'],
  minTrustLevel: 2
}));

// In route handler
fastify.get('/protected', async (request: ChittyIDAuthRequest, reply) => {
  const { sub, roles, permitted_tools } = request.chittyId;
  // Handle request
});
*/