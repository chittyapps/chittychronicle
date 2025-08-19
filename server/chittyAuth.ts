import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { createHash, randomBytes } from "crypto";

/**
 * ChittyID Authentication Service
 * 
 * Provides authentication using ChittyID (the universal identity system for the Chitty ecosystem)
 * with ChittyAuth for secure authentication flows and ChittyChain for verification.
 */

interface ChittyIDUser {
  chittyId: string;
  email?: string;
  name: string;
  roles: string[];
  permissions: string[];
  publicKey?: string;
  verified: boolean;
  attestations?: {
    issuer: string;
    claim: string;
    timestamp: string;
    signature: string;
  }[];
  metadata?: Record<string, any>;
}

interface ChittyAuthToken {
  accessToken: string;
  refreshToken?: string;
  idToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export class ChittyAuthService {
  private issuerUrl: string;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private oidcConfig?: client.Configuration;

  constructor() {
    this.issuerUrl = process.env.CHITTYID_ISSUER_URL || "https://auth.chitty.com/oidc";
    this.clientId = process.env.CHITTYID_CLIENT_ID || "chittytimeline";
    this.clientSecret = process.env.CHITTYID_CLIENT_SECRET || "";
    this.redirectUri = process.env.CHITTYID_REDIRECT_URI || "http://localhost:5000/auth/callback";
  }

  /**
   * Initialize ChittyID authentication
   */
  async initialize(): Promise<client.Configuration> {
    // Discover ChittyID OIDC configuration
    this.oidcConfig = await client.discovery(
      new URL(this.issuerUrl),
      this.clientId,
      {
        client_secret: this.clientSecret,
        redirect_uris: [this.redirectUri],
        response_types: ['code'],
        grant_types: ['authorization_code', 'refresh_token'],
        token_endpoint_auth_method: 'client_secret_post',
      }
    );

    return this.oidcConfig;
  }

  /**
   * Setup Express session with PostgreSQL storage
   */
  setupSession(): RequestHandler {
    const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
    const pgStore = connectPg(session);
    const sessionStore = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });

    return session({
      secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: sessionTtl,
        sameSite: 'lax',
      },
    });
  }

  /**
   * Setup ChittyID authentication middleware
   */
  async setupAuth(app: Express): Promise<void> {
    // Initialize OIDC
    const config = await this.initialize();

    // Setup session
    app.use(this.setupSession());

    // Initialize Passport
    app.use(passport.initialize());
    app.use(passport.session());

    // Configure ChittyID strategy
    const verifyFunction: VerifyFunction = async (tokens, claims, done) => {
      try {
        // Extract ChittyID user information
        const chittyUser: ChittyIDUser = {
          chittyId: claims.sub || `CID-${randomBytes(4).toString('hex').toUpperCase()}`,
          email: claims.email as string,
          name: claims.name as string || claims.preferred_username as string || 'Unknown User',
          roles: (claims.roles as string[]) || ['user'],
          permissions: (claims.permissions as string[]) || [],
          publicKey: claims.public_key as string,
          verified: claims.email_verified as boolean || false,
          attestations: claims.attestations as any,
          metadata: {
            picture: claims.picture,
            locale: claims.locale,
            organization: claims.organization,
          },
        };

        // Store or update user in database
        await this.updateUserSession(chittyUser, tokens);

        done(null, { claims, tokens });
      } catch (error) {
        done(error);
      }
    };

    const strategy = new Strategy(config, verifyFunction);
    passport.use('chittyid', strategy);

    // Serialize/deserialize user
    passport.serializeUser((user: any, done) => {
      done(null, {
        chittyId: user.claims.sub,
        tokens: user.tokens,
      });
    });

    passport.deserializeUser(async (data: any, done) => {
      try {
        const user = await storage.getUser(data.chittyId);
        if (!user) {
          return done(null, false);
        }

        // Refresh token if needed
        if (this.isTokenExpired(data.tokens)) {
          const refreshed = await this.refreshToken(data.tokens.refresh_token);
          data.tokens = refreshed;
        }

        done(null, { user, tokens: data.tokens });
      } catch (error) {
        done(error);
      }
    });

    // Auth routes
    this.setupAuthRoutes(app);
  }

  /**
   * Setup authentication routes
   */
  private setupAuthRoutes(app: Express): void {
    // Login route
    app.get('/auth/login', passport.authenticate('chittyid'));

    // Callback route
    app.get('/auth/callback', 
      passport.authenticate('chittyid', {
        successRedirect: '/',
        failureRedirect: '/auth/error',
      })
    );

    // Logout route
    app.post('/auth/logout', (req, res) => {
      req.logout((err) => {
        if (err) {
          return res.status(500).json({ error: 'Logout failed' });
        }
        res.redirect('/');
      });
    });

    // Current user endpoint
    app.get('/api/auth/me', this.isAuthenticated, async (req: any, res) => {
      try {
        const chittyId = req.user?.user?.id || req.user?.claims?.sub;
        if (!chittyId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }

        const user = await storage.getUser(chittyId);
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Get ChittyID profile with attestations
        const profile = await this.getChittyProfile(chittyId);

        res.json({
          user,
          profile,
          permissions: req.user?.claims?.permissions || [],
        });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user profile' });
      }
    });

    // Verify ChittyID endpoint
    app.post('/api/auth/verify', async (req, res) => {
      try {
        const { chittyId, signature, data } = req.body;
        const verified = await this.verifyChittySignature(chittyId, signature, data);
        res.json({ verified });
      } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
      }
    });

    // Refresh token endpoint
    app.post('/api/auth/refresh', this.isAuthenticated, async (req: any, res) => {
      try {
        const refreshToken = req.user?.tokens?.refresh_token;
        if (!refreshToken) {
          return res.status(401).json({ error: 'No refresh token' });
        }

        const tokens = await this.refreshToken(refreshToken);
        req.user.tokens = tokens;
        
        res.json({ success: true, expiresIn: tokens.expiresIn });
      } catch (error) {
        res.status(500).json({ error: 'Token refresh failed' });
      }
    });
  }

  /**
   * Authentication middleware
   */
  isAuthenticated: RequestHandler = (req, res, next) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ error: 'Authentication required' });
  };

  /**
   * Check if user has required role
   */
  hasRole(role: string): RequestHandler {
    return (req: any, res, next) => {
      const userRoles = req.user?.claims?.roles || [];
      if (userRoles.includes(role) || userRoles.includes('admin')) {
        return next();
      }
      res.status(403).json({ error: 'Insufficient permissions' });
    };
  }

  /**
   * Check if user has required permission
   */
  hasPermission(permission: string): RequestHandler {
    return (req: any, res, next) => {
      const userPermissions = req.user?.claims?.permissions || [];
      if (userPermissions.includes(permission) || userPermissions.includes('*')) {
        return next();
      }
      res.status(403).json({ error: 'Insufficient permissions' });
    };
  }

  /**
   * Update user session with ChittyID data
   */
  private async updateUserSession(chittyUser: ChittyIDUser, tokens: any): Promise<void> {
    const userData = {
      id: chittyUser.chittyId,
      email: chittyUser.email,
      firstName: chittyUser.name.split(' ')[0],
      lastName: chittyUser.name.split(' ').slice(1).join(' '),
      profileImageUrl: chittyUser.metadata?.picture,
    };

    await storage.upsertUser(userData);

    // Store ChittyID-specific data
    const existingChittyUser = await storage.getChittyIdUser(chittyUser.chittyId);
    if (!existingChittyUser) {
      await storage.createChittyIdUser({
        chittyId: chittyUser.chittyId,
        publicKey: chittyUser.publicKey || '',
        roles: chittyUser.roles,
        permissions: chittyUser.permissions,
        verified: chittyUser.verified,
        metadata: chittyUser.metadata,
      });
    }
  }

  /**
   * Get ChittyID profile with chain verification
   */
  private async getChittyProfile(chittyId: string): Promise<any> {
    try {
      // In production, fetch from ChittyID service
      const response = await fetch(`${this.issuerUrl}/profile/${chittyId}`, {
        headers: {
          'Authorization': `Bearer ${this.clientSecret}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch ChittyID profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching ChittyID profile:', error);
      
      // Return cached data
      const cached = await storage.getChittyIdUser(chittyId);
      return cached || { chittyId, verified: false };
    }
  }

  /**
   * Verify ChittyID signature using ChittyChain
   */
  private async verifyChittySignature(
    chittyId: string,
    signature: string,
    data: any
  ): Promise<boolean> {
    try {
      // Get user's public key
      const user = await storage.getChittyIdUser(chittyId);
      if (!user?.publicKey) {
        return false;
      }

      // Verify signature
      const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
      
      // In production, verify against ChittyChain
      const response = await fetch(`https://chain.chitty.com/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chittyId,
          signature,
          hash,
          publicKey: user.publicKey,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.verified === true;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(tokens: any): boolean {
    if (!tokens?.expires_at) return true;
    return Date.now() >= tokens.expires_at * 1000;
  }

  /**
   * Refresh access token
   */
  private async refreshToken(refreshToken: string): Promise<ChittyAuthToken> {
    if (!this.oidcConfig) {
      throw new Error('ChittyID not initialized');
    }

    const response = await client.refreshTokenGrant(this.oidcConfig, refreshToken);
    
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      idToken: response.id_token,
      expiresIn: response.expires_in || 3600,
      tokenType: response.token_type,
      scope: response.scope,
    };
  }

  /**
   * Generate ChittyID for new users
   */
  generateChittyId(): string {
    const timestamp = Date.now().toString(36);
    const random = randomBytes(4).toString('hex');
    return `CID-${timestamp}${random}`.toUpperCase().substring(0, 12);
  }

  /**
   * Create attestation for user actions
   */
  async createAttestation(
    chittyId: string,
    claim: string,
    metadata?: any
  ): Promise<string> {
    const attestation = {
      issuer: 'ChittyChronicle',
      subject: chittyId,
      claim,
      timestamp: new Date().toISOString(),
      metadata,
    };

    const hash = createHash('sha256').update(JSON.stringify(attestation)).digest('hex');
    
    // In production, record on ChittyChain
    console.log(`Created attestation: ${hash}`);
    
    return hash;
  }
}

export const chittyAuth = new ChittyAuthService();
export const isAuthenticated = chittyAuth.isAuthenticated;
export const hasRole = (role: string) => chittyAuth.hasRole(role);
export const hasPermission = (permission: string) => chittyAuth.hasPermission(permission);