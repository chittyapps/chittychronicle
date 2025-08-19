import {
  users,
  cases,
  timelineEntries,
  timelineSources,
  timelineContradictions,
  dataIngestionJobs,
  mcpIntegrations,
  chittyIdUsers,
  chittyPmProjects,
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
  type DataIngestionJob,
  type InsertDataIngestionJob,
  type McpIntegration,
  type InsertMcpIntegration,
  type ChittyIdUser,
  type InsertChittyIdUser,
  type ChittyPmProject,
  type InsertChittyPmProject,
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
  }): Promise<{entries: TimelineEntry[], totalCount: number, hasMore: boolean}>;
  
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
  
  // Data ingestion operations
  createDataIngestionJob(job: InsertDataIngestionJob): Promise<DataIngestionJob>;
  getDataIngestionJobs(caseId: string): Promise<DataIngestionJob[]>;
  updateDataIngestionJob(jobId: string, updates: Partial<DataIngestionJob>): Promise<DataIngestionJob | undefined>;
  
  // MCP integration operations
  createMcpIntegration(integration: InsertMcpIntegration): Promise<McpIntegration>;
  getMcpIntegrations(userId: string): Promise<McpIntegration[]>;
  getMcpIntegration(integrationId: string): Promise<McpIntegration | undefined>;
  updateMcpIntegration(integrationId: string, updates: Partial<McpIntegration>): Promise<McpIntegration | undefined>;
  
  // ChittyID operations
  createChittyIdUser(user: InsertChittyIdUser): Promise<ChittyIdUser>;
  getChittyIdUser(chittyId: string): Promise<ChittyIdUser | undefined>;
  
  // ChittyPM operations
  createChittyPmProject(project: InsertChittyPmProject): Promise<ChittyPmProject>;
  getChittyPmProjects(): Promise<ChittyPmProject[]>;
  syncChittyPmProject(chittyPmId: string, updates: Partial<ChittyPmProject>): Promise<ChittyPmProject | undefined>;
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
  }): Promise<{entries: TimelineEntry[], totalCount: number, hasMore: boolean}> {
    let query = db
      .select()
      .from(timelineEntries)
      .where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt)
      ));

    // Apply filters
    const conditions = [
      eq(timelineEntries.caseId, caseId),
      isNull(timelineEntries.deletedAt)
    ];
    
    if (filters?.startDate) {
      conditions.push(gte(timelineEntries.date, filters.startDate));
    }
    
    if (filters?.endDate) {
      conditions.push(lte(timelineEntries.date, filters.endDate));
    }
    
    if (filters?.entryType) {
      conditions.push(eq(timelineEntries.entryType, filters.entryType));
    }
    
    query = db
      .select()
      .from(timelineEntries)
      .where(and(...conditions))
      .orderBy(desc(timelineEntries.date));

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

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const hasMore = (offset + limit) < count;

    return { entries, totalCount: count, hasMore };
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
    const results = await db
      .select({
        id: timelineContradictions.id,
        createdAt: timelineContradictions.createdAt,
        entryId: timelineContradictions.entryId,
        conflictingEntryId: timelineContradictions.conflictingEntryId,
        natureOfConflict: timelineContradictions.natureOfConflict,
        resolution: timelineContradictions.resolution,
        resolvedBy: timelineContradictions.resolvedBy,
        resolvedDate: timelineContradictions.resolvedDate
      })
      .from(timelineContradictions)
      .innerJoin(timelineEntries, eq(timelineContradictions.entryId, timelineEntries.id))
      .where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt)
      ));
    
    return results;
  }

  // Data ingestion operations
  async createDataIngestionJob(job: InsertDataIngestionJob): Promise<DataIngestionJob> {
    const [ingestionJob] = await db
      .insert(dataIngestionJobs)
      .values(job)
      .returning();
    return ingestionJob;
  }

  async getDataIngestionJobs(caseId: string): Promise<DataIngestionJob[]> {
    return await db
      .select()
      .from(dataIngestionJobs)
      .where(eq(dataIngestionJobs.caseId, caseId))
      .orderBy(desc(dataIngestionJobs.createdAt));
  }

  async updateDataIngestionJob(jobId: string, updates: Partial<DataIngestionJob>): Promise<DataIngestionJob | undefined> {
    const [job] = await db
      .update(dataIngestionJobs)
      .set(updates)
      .where(eq(dataIngestionJobs.id, jobId))
      .returning();
    return job;
  }

  // MCP integration operations
  async createMcpIntegration(integration: InsertMcpIntegration): Promise<McpIntegration> {
    const [mcpIntegration] = await db
      .insert(mcpIntegrations)
      .values(integration)
      .returning();
    return mcpIntegration;
  }

  async getMcpIntegrations(userId: string): Promise<McpIntegration[]> {
    return await db
      .select()
      .from(mcpIntegrations)
      .where(eq(mcpIntegrations.createdBy, userId))
      .orderBy(desc(mcpIntegrations.createdAt));
  }

  async getMcpIntegration(integrationId: string): Promise<McpIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(mcpIntegrations)
      .where(eq(mcpIntegrations.id, integrationId));
    return integration;
  }

  async updateMcpIntegration(integrationId: string, updates: Partial<McpIntegration>): Promise<McpIntegration | undefined> {
    const [integration] = await db
      .update(mcpIntegrations)
      .set(updates)
      .where(eq(mcpIntegrations.id, integrationId))
      .returning();
    return integration;
  }

  // ChittyID operations
  async createChittyIdUser(user: InsertChittyIdUser): Promise<ChittyIdUser> {
    const [chittyUser] = await db
      .insert(chittyIdUsers)
      .values(user)
      .returning();
    return chittyUser;
  }

  async getChittyIdUser(chittyId: string): Promise<ChittyIdUser | undefined> {
    const [user] = await db
      .select()
      .from(chittyIdUsers)
      .where(eq(chittyIdUsers.chittyId, chittyId));
    return user;
  }

  // ChittyPM operations
  async createChittyPmProject(project: InsertChittyPmProject): Promise<ChittyPmProject> {
    const [pmProject] = await db
      .insert(chittyPmProjects)
      .values(project)
      .returning();
    return pmProject;
  }

  async getChittyPmProjects(): Promise<ChittyPmProject[]> {
    return await db
      .select()
      .from(chittyPmProjects)
      .orderBy(desc(chittyPmProjects.createdAt));
  }

  async syncChittyPmProject(chittyPmId: string, updates: Partial<ChittyPmProject>): Promise<ChittyPmProject | undefined> {
    const [project] = await db
      .update(chittyPmProjects)
      .set(updates)
      .where(eq(chittyPmProjects.chittyPmId, chittyPmId))
      .returning();
    return project;
  }
}

export const storage = new DatabaseStorage();
