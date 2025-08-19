import {
  users,
  chittyIds,
  verifications,
  businesses,
  verificationRequests,
  type User,
  type UpsertUser,
  type ChittyId,
  type InsertChittyId,
  type Verification,
  type InsertVerification,
  type Business,
  type InsertBusiness,
  type VerificationRequest,
  type InsertVerificationRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { chittyIdService } from "./chittyIdService";

export interface IStorage {
  // User operations (required for ChittyAuth)
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByChittyId(chittyId: string): Promise<User | undefined>;
  createUser(userData: { email: string; password: string; firstName?: string; lastName?: string }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  verifyChittyId(chittyId: string): Promise<boolean>;
  updateUserVerification(userId: string, isVerified: boolean): Promise<void>;
  
  // ChittyID operations
  getChittyIdByUserId(userId: string): Promise<ChittyId | undefined>;
  getChittyIdByCode(code: string): Promise<ChittyId | undefined>;
  createChittyId(data: InsertChittyId): Promise<ChittyId>;
  updateChittyIdTrustScore(id: string, trustScore: number, trustLevel: string): Promise<ChittyId>;
  
  // Verification operations
  getVerificationsByChittyId(chittyId: string): Promise<Verification[]>;
  createVerification(data: InsertVerification): Promise<Verification>;
  updateVerificationStatus(id: string, status: string, verifiedAt?: Date): Promise<Verification>;
  
  // Business operations
  getBusinessByApiKey(apiKey: string): Promise<Business | undefined>;
  getAllBusinesses(): Promise<Business[]>;
  createBusiness(data: InsertBusiness): Promise<Business>;
  
  // Verification request operations
  createVerificationRequest(data: InsertVerificationRequest): Promise<VerificationRequest>;
  getVerificationRequestsByBusiness(businessId: string): Promise<VerificationRequest[]>;
  updateVerificationRequestStatus(id: string, status: string, responseData?: any): Promise<VerificationRequest>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for ChittyAuth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      console.log(`Querying user by email: ${email}`);
      const [user] = await db.select().from(users).where(eq(users.email, email));
      console.log(`Found user:`, user ? `${user.email} (${user.id})` : 'null');
      return user;
    } catch (error) {
      console.error('Database error in getUserByEmail:', error);
      throw error;
    }
  }

  async getUserByChittyId(chittyId: string): Promise<User | undefined> {
    try {
      console.log(`Querying user by ChittyID: ${chittyId}`);
      const [user] = await db.select().from(users).where(eq(users.chittyId, chittyId));
      console.log(`Found user:`, user ? `${user.email} (ChittyID: ${user.chittyId})` : 'null');
      return user;
    } catch (error) {
      console.error('Database error in getUserByChittyId:', error);
      throw error;
    }
  }

  async createUser(userData: { email: string; password: string; firstName?: string; lastName?: string }): Promise<User> {
    const userId = `chitty_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Generate ChittyID through mothership connection with proper identity service call
    const chittyIdCode = await chittyIdService.generateChittyId('identity', 'person', {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName
    });
    
    const [newUser] = await db.insert(users).values({
      id: userId,
      email: userData.email,
      password: userData.password,
      firstName: userData.firstName,
      lastName: userData.lastName,
      chittyId: chittyIdCode,
      trustScore: 100,
      isVerified: false,
    }).returning();
    
    // Sync with ChittyID mothership
    await chittyIdService.syncUserWithMothership(userId, chittyIdCode, userData);
    
    return newUser;
  }

  async verifyChittyId(chittyId: string): Promise<boolean> {
    // First check local database
    const [existing] = await db.select().from(users).where(eq(users.chittyId, chittyId));
    if (existing) {
      return true;
    }
    
    // If not found locally, validate with ChittyID mothership
    return await chittyIdService.validateChittyId(chittyId);
  }

  async updateUserVerification(userId: string, isVerified: boolean): Promise<void> {
    await db.update(users)
      .set({ isVerified })
      .where(eq(users.id, userId));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // ChittyID operations
  async getChittyIdByUserId(userId: string): Promise<ChittyId | undefined> {
    const [chittyId] = await db
      .select()
      .from(chittyIds)
      .where(eq(chittyIds.userId, userId));
    return chittyId;
  }

  async getChittyIdByCode(code: string): Promise<ChittyId | undefined> {
    const [chittyId] = await db
      .select()
      .from(chittyIds)
      .where(eq(chittyIds.chittyIdCode, code));
    return chittyId;
  }

  async createChittyId(data: InsertChittyId): Promise<ChittyId> {
    // Generate ChittyID through mothership service if userId is provided
    let chittyIdCode: string;
    if (data.chittyIdCode) {
      chittyIdCode = data.chittyIdCode;
    } else {
      chittyIdCode = await this.generateChittyIdCode();
    }
    
    const [chittyId] = await db
      .insert(chittyIds)
      .values({
        ...data,
        chittyIdCode,
      })
      .returning();
    
    // Sync with mothership if userId exists - this is required for authentic ChittyIDs
    if (data.userId) {
      await chittyIdService.syncUserWithMothership(data.userId, chittyIdCode, data);
    }
    
    return chittyId;
  }

  async updateChittyIdTrustScore(id: string, trustScore: number, trustLevel: string): Promise<ChittyId> {
    const [chittyId] = await db
      .update(chittyIds)
      .set({
        trustScore,
        trustLevel: trustLevel as any,
        updatedAt: new Date(),
      })
      .where(eq(chittyIds.id, id))
      .returning();
    return chittyId;
  }

  // Verification operations
  async getVerificationsByChittyId(chittyId: string): Promise<Verification[]> {
    return await db
      .select()
      .from(verifications)
      .where(eq(verifications.chittyId, chittyId))
      .orderBy(desc(verifications.createdAt));
  }

  async createVerification(data: InsertVerification): Promise<Verification> {
    const [verification] = await db
      .insert(verifications)
      .values(data)
      .returning();
    return verification;
  }

  async updateVerificationStatus(id: string, status: string, verifiedAt?: Date): Promise<Verification> {
    const [verification] = await db
      .update(verifications)
      .set({
        status: status as any,
        verifiedAt,
        updatedAt: new Date(),
      })
      .where(eq(verifications.id, id))
      .returning();
    return verification;
  }

  // Business operations
  async getBusinessByApiKey(apiKey: string): Promise<Business | undefined> {
    const [business] = await db
      .select()
      .from(businesses)
      .where(eq(businesses.apiKey, apiKey));
    return business;
  }

  async getAllBusinesses(): Promise<Business[]> {
    return await db
      .select()
      .from(businesses)
      .where(eq(businesses.isActive, true))
      .orderBy(desc(businesses.createdAt));
  }

  async createBusiness(data: InsertBusiness): Promise<Business> {
    const [business] = await db
      .insert(businesses)
      .values({
        ...data,
        apiKey: this.generateApiKey(),
      })
      .returning();
    return business;
  }

  // Verification request operations
  async createVerificationRequest(data: InsertVerificationRequest): Promise<VerificationRequest> {
    const [request] = await db
      .insert(verificationRequests)
      .values(data)
      .returning();
    return request;
  }

  async getVerificationRequestsByBusiness(businessId: string): Promise<VerificationRequest[]> {
    return await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.businessId, businessId))
      .orderBy(desc(verificationRequests.createdAt));
  }

  async updateVerificationRequestStatus(id: string, status: string, responseData?: any): Promise<VerificationRequest> {
    const [request] = await db
      .update(verificationRequests)
      .set({
        status,
        responseData,
        updatedAt: new Date(),
      })
      .where(eq(verificationRequests.id, id))
      .returning();
    return request;
  }

  // Helper methods
  private async generateChittyIdCode(): Promise<string> {
    // Use mothership service for proper structured ID generation
    return await chittyIdService.generateChittyId('identity', 'person', {});
  }

  private calculateCheckDigit(input: string): string {
    // Simple check digit calculation (could be made more sophisticated)
    const sum = input.split('').reduce((acc, digit) => acc + parseInt(digit), 0);
    return String.fromCharCode(65 + (sum % 26)); // A-Z
  }

  private generateApiKey(): string {
    return 'ck_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}

export const storage = new DatabaseStorage();
