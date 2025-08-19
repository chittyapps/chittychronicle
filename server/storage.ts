import {
  users,
  cases,
  timelineEntries,
  timelineSources,
  timelineContradictions,
  type User,
  type UpsertUser,
  type Case,
  type InsertCase,
  type TimelineEntry,
  type InsertTimelineEntry,
  type TimelineSource,
  type InsertTimelineSource,
  type TimelineContradiction,
  type InsertTimelineContradiction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, or, like, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Case operations
  getCases(userId: string): Promise<Case[]>;
  getCase(id: string, userId: string): Promise<Case | undefined>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, caseData: Partial<InsertCase>, userId: string): Promise<Case | undefined>;
  
  // Timeline operations
  getTimelineEntries(caseId: string, filters?: {
    startDate?: string;
    endDate?: string;
    entryType?: 'task' | 'event';
    eventSubtype?: string;
    taskStatus?: string;
    confidenceLevel?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{entries: TimelineEntry[], total: number}>;
  
  getTimelineEntry(id: string, caseId: string): Promise<TimelineEntry | undefined>;
  createTimelineEntry(entryData: InsertTimelineEntry): Promise<TimelineEntry>;
  updateTimelineEntry(id: string, entryData: Partial<InsertTimelineEntry>, userId: string): Promise<TimelineEntry | undefined>;
  deleteTimelineEntry(id: string, userId: string): Promise<boolean>;
  
  // Source operations
  getTimelineSources(entryId: string): Promise<TimelineSource[]>;
  createTimelineSource(sourceData: InsertTimelineSource): Promise<TimelineSource>;
  
  // Contradiction operations
  getTimelineContradictions(entryId: string): Promise<TimelineContradiction[]>;
  createTimelineContradiction(contradictionData: InsertTimelineContradiction): Promise<TimelineContradiction>;
  
  // Search and analysis
  searchTimelineEntries(caseId: string, query: string): Promise<TimelineEntry[]>;
  getUpcomingDeadlines(caseId: string, daysAhead?: number): Promise<TimelineEntry[]>;
  getContradictions(caseId: string): Promise<TimelineContradiction[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
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

  // Case operations
  async getCases(userId: string): Promise<Case[]> {
    return await db
      .select()
      .from(cases)
      .where(eq(cases.createdBy, userId))
      .orderBy(desc(cases.createdAt));
  }

  async getCase(id: string, userId: string): Promise<Case | undefined> {
    const [caseRecord] = await db
      .select()
      .from(cases)
      .where(and(eq(cases.id, id), eq(cases.createdBy, userId)));
    return caseRecord;
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const [caseRecord] = await db
      .insert(cases)
      .values(caseData)
      .returning();
    return caseRecord;
  }

  async updateCase(id: string, caseData: Partial<InsertCase>, userId: string): Promise<Case | undefined> {
    const [caseRecord] = await db
      .update(cases)
      .set(caseData)
      .where(and(eq(cases.id, id), eq(cases.createdBy, userId)))
      .returning();
    return caseRecord;
  }

  // Timeline operations
  async getTimelineEntries(caseId: string, filters?: {
    startDate?: string;
    endDate?: string;
    entryType?: 'task' | 'event';
    eventSubtype?: string;
    taskStatus?: string;
    confidenceLevel?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<{entries: TimelineEntry[], total: number}> {
    let query = db
      .select()
      .from(timelineEntries)
      .where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt)
      ));

    // Apply filters
    if (filters?.startDate) {
      query = query.where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt),
        gte(timelineEntries.date, filters.startDate)
      ));
    }
    
    if (filters?.endDate) {
      query = query.where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt),
        lte(timelineEntries.date, filters.endDate)
      ));
    }
    
    if (filters?.entryType) {
      query = query.where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt),
        eq(timelineEntries.entryType, filters.entryType)
      ));
    }

    query = query.orderBy(desc(timelineEntries.date));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }
    
    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    const entries = await query;
    
    // Get total count
    const [{ count }] = await db
      .select({ count: db.$count(timelineEntries) })
      .from(timelineEntries)
      .where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt)
      ));

    return { entries, total: count };
  }

  async getTimelineEntry(id: string, caseId: string): Promise<TimelineEntry | undefined> {
    const [entry] = await db
      .select()
      .from(timelineEntries)
      .where(and(
        eq(timelineEntries.id, id),
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt)
      ));
    return entry;
  }

  async createTimelineEntry(entryData: InsertTimelineEntry): Promise<TimelineEntry> {
    const chittyId = `CT-${randomUUID().substring(0, 8).toUpperCase()}`;
    
    const [entry] = await db
      .insert(timelineEntries)
      .values({
        ...entryData,
        chittyId,
      })
      .returning();
    return entry;
  }

  async updateTimelineEntry(id: string, entryData: Partial<InsertTimelineEntry>, userId: string): Promise<TimelineEntry | undefined> {
    const [entry] = await db
      .update(timelineEntries)
      .set({
        ...entryData,
        modifiedBy: userId,
        lastModified: new Date(),
      })
      .where(and(
        eq(timelineEntries.id, id),
        isNull(timelineEntries.deletedAt)
      ))
      .returning();
    return entry;
  }

  async deleteTimelineEntry(id: string, userId: string): Promise<boolean> {
    const [entry] = await db
      .update(timelineEntries)
      .set({
        deletedAt: new Date(),
        modifiedBy: userId,
        lastModified: new Date(),
      })
      .where(eq(timelineEntries.id, id))
      .returning();
    return !!entry;
  }

  // Source operations
  async getTimelineSources(entryId: string): Promise<TimelineSource[]> {
    return await db
      .select()
      .from(timelineSources)
      .where(eq(timelineSources.entryId, entryId));
  }

  async createTimelineSource(sourceData: InsertTimelineSource): Promise<TimelineSource> {
    const [source] = await db
      .insert(timelineSources)
      .values(sourceData)
      .returning();
    return source;
  }

  // Contradiction operations
  async getTimelineContradictions(entryId: string): Promise<TimelineContradiction[]> {
    return await db
      .select()
      .from(timelineContradictions)
      .where(eq(timelineContradictions.entryId, entryId));
  }

  async createTimelineContradiction(contradictionData: InsertTimelineContradiction): Promise<TimelineContradiction> {
    const [contradiction] = await db
      .insert(timelineContradictions)
      .values(contradictionData)
      .returning();
    return contradiction;
  }

  // Search and analysis
  async searchTimelineEntries(caseId: string, query: string): Promise<TimelineEntry[]> {
    return await db
      .select()
      .from(timelineEntries)
      .where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt),
        or(
          like(timelineEntries.description, `%${query}%`),
          like(timelineEntries.detailedNotes, `%${query}%`)
        )
      ))
      .orderBy(desc(timelineEntries.date));
  }

  async getUpcomingDeadlines(caseId: string, daysAhead: number = 30): Promise<TimelineEntry[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    
    return await db
      .select()
      .from(timelineEntries)
      .where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt),
        or(
          eq(timelineEntries.entryType, 'task'),
          eq(timelineEntries.eventSubtype, 'deadline')
        ),
        gte(timelineEntries.date, new Date().toISOString().split('T')[0]),
        lte(timelineEntries.date, futureDate.toISOString().split('T')[0])
      ))
      .orderBy(timelineEntries.date);
  }

  async getContradictions(caseId: string): Promise<TimelineContradiction[]> {
    return await db
      .select()
      .from(timelineContradictions)
      .innerJoin(timelineEntries, eq(timelineContradictions.entryId, timelineEntries.id))
      .where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt)
      ));
  }
}

export const storage = new DatabaseStorage();
