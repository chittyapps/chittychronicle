import express, { type Express, type RequestHandler } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

// ChittyAuth Configuration
interface ChittyAuthConfig {
  sessionSecret: string;
  sessionTtl: number;
  dbUrl: string;
}

interface ChittyUser {
  id: string;
  email: string;
  chittyId?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  trustScore?: number;
  isVerified?: boolean;
  createdAt: Date;
}

declare global {
  namespace Express {
    interface User extends ChittyUser {}
  }
}

// Password hashing utilities
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Session configuration
function getSessionConfig(config: ChittyAuthConfig) {
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: config.dbUrl,
    createTableIfMissing: true,
    ttl: config.sessionTtl / 1000, // convert to seconds
    tableName: "session",
  });

  return session({
    secret: config.sessionSecret,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: config.sessionTtl,
    },
  });
}

// ChittyAuth setup
export function setupChittyAuth(app: Express) {
  const config: ChittyAuthConfig = {
    sessionSecret: process.env.SESSION_SECRET || "chittyid-secret-key",
    sessionTtl: 7 * 24 * 60 * 60 * 1000, // 1 week
    dbUrl: process.env.CHITTYID_NEON_DB_URL || process.env.DATABASE_URL!,
  };

  // Set up session middleware
  app.set("trust proxy", 1);
  app.use(getSessionConfig(config));

  // Registration endpoint - Creates user with ChittyID as primary identity
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user already exists
      try {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(400).json({ 
            message: "User already exists",
            chittyId: existingUser.chittyId // Return existing ChittyID
          });
        }
      } catch (dbError) {
        console.error("Database error checking user:", dbError);
        return res.status(500).json({ message: "Database connection error" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user with ChittyID from mothership
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName,
        lastName,
      });

      // Set session with ChittyID
      (req.session as any).userId = user.id;
      (req.session as any).chittyId = user.chittyId;
      (req.session as any).user = user;

      res.status(201).json({
        user: {
          id: user.id,
          email: user.email,
          chittyId: user.chittyId,
          firstName: user.firstName,
          lastName: user.lastName,
          trustScore: user.trustScore,
          isVerified: user.isVerified,
        },
        message: `ChittyID ${user.chittyId} created successfully`
      });
    } catch (error) {
      console.error("Registration error:", error);
      // Check if error is from ChittyID service
      if (error.message?.includes('mothership')) {
        return res.status(503).json({ 
          message: "ChittyID service temporarily unavailable. Please try again later.",
          error: error.message 
        });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint - Supports both email and ChittyID login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password, useChittyId } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ message: "Identifier and password are required" });
      }

      let user;
      
      if (useChittyId) {
        // Login with ChittyID
        const users = await storage.getUserByChittyId(identifier);
        user = users;
      } else {
        // Login with email
        user = await storage.getUserByEmail(identifier);
      }

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Set session with ChittyID
      (req.session as any).userId = user.id;
      (req.session as any).chittyId = user.chittyId;
      (req.session as any).user = user;

      res.json({
        user: {
          id: user.id,
          email: user.email,
          chittyId: user.chittyId,
          firstName: user.firstName,
          lastName: user.lastName,
          trustScore: user.trustScore,
          isVerified: user.isVerified,
        },
        message: `Logged in with ChittyID: ${user.chittyId}`
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get current user endpoint
  app.get("/api/auth/user", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        user: {
          id: user.id,
          email: user.email,
          chittyId: user.chittyId,
          firstName: user.firstName,
          lastName: user.lastName,
          trustScore: user.trustScore,
          isVerified: user.isVerified,
        }
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(401).json({ message: "Unauthorized" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  // ChittyID verification endpoint
  app.post("/api/auth/verify-chittyid", async (req, res) => {
    try {
      const { chittyId } = req.body;
      const userId = (req.session as any)?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Verify ChittyID exists and is valid
      const isValid = await storage.verifyChittyId(chittyId);
      if (!isValid) {
        return res.status(400).json({ message: "Invalid ChittyID" });
      }

      // Update user verification status
      await storage.updateUserVerification(userId, true);
      
      res.json({ message: "ChittyID verified successfully" });
    } catch (error) {
      console.error("ChittyID verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // ChittyID lookup endpoint - Get user info by ChittyID
  app.get("/api/auth/chittyid/:chittyId", async (req, res) => {
    try {
      const { chittyId } = req.params;
      
      const user = await storage.getUserByChittyId(chittyId);
      if (!user) {
        return res.status(404).json({ message: "ChittyID not found" });
      }

      // Return public info only
      res.json({
        chittyId: user.chittyId,
        firstName: user.firstName,
        lastName: user.lastName,
        trustScore: user.trustScore,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("ChittyID lookup error:", error);
      res.status(500).json({ message: "Lookup failed" });
    }
  });

  // ChittyID validation endpoint - Check if ChittyID format is valid
  app.post("/api/auth/validate-chittyid", async (req, res) => {
    try {
      const { chittyId } = req.body;
      
      if (!chittyId) {
        return res.status(400).json({ message: "ChittyID is required" });
      }

      const isValid = await storage.verifyChittyId(chittyId);
      
      res.json({ 
        chittyId,
        valid: isValid,
        format: isValid ? "Valid ChittyID format" : "Invalid ChittyID format"
      });
    } catch (error) {
      console.error("ChittyID validation error:", error);
      res.status(500).json({ message: "Validation failed" });
    }
  });
}

// Authentication middleware
export const requireAuth: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUserById(userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};

// Optional authentication middleware (doesn't fail if not authenticated)
export const optionalAuth: RequestHandler = async (req, res, next) => {
  try {
    const userId = (req.session as any)?.userId;
    if (userId) {
      const user = await storage.getUserById(userId);
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    next();
  }
};