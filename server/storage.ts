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
  parties,
  partyIdentifiers,
  messages,
  conversations,
  messageParties,
  conversationMessages,
  messageAttachments,
  evidenceEnvelopes,
  evidenceDistributions,
  evidenceEnvelopeParticipants,
  outboundMessages,
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
  type Party,
  type InsertParty,
  type PartyIdentifier,
  type InsertPartyIdentifier,
  type Message,
  type InsertMessage,
  type Conversation,
  type InsertConversation,
  type MessageParty,
  type InsertMessageParty,
  type ConversationMessage,
  type InsertConversationMessage,
  type MessageAttachment,
  type InsertMessageAttachment,
  type EvidenceEnvelope,
  type InsertEvidenceEnvelope,
  type EvidenceDistribution,
  type EvidenceEnvelopeParticipant,
  type InsertEvidenceEnvelopeParticipant,
  type OutboundMessage,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, or, like, isNull, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // ChittyID User operations
  getChittyIdUser(chittyId: string): Promise<ChittyIdUser | undefined>;
  createChittyIdUser(userData: InsertChittyIdUser): Promise<ChittyIdUser>;
  
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
  
  getTimelineEntriesByCase(caseId: string): Promise<TimelineEntry[]>;
  
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
  getContradictionById(id: string): Promise<TimelineContradiction | undefined>;
  updateContradiction(id: string, updates: Partial<InsertTimelineContradiction>): Promise<TimelineContradiction | undefined>;
  resolveContradiction(id: string, resolvedBy: string, resolution: string): Promise<void>;

  // Search and analysis
  searchTimelineEntries(caseId: string, query: string): Promise<TimelineEntry[]>;
  getAllTimelineEntries(): Promise<TimelineEntry[]>;
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
  
  
  // ChittyPM operations
  createChittyPmProject(project: InsertChittyPmProject): Promise<ChittyPmProject>;
  getChittyPmProjects(): Promise<ChittyPmProject[]>;
  syncChittyPmProject(chittyPmId: string, updates: Partial<ChittyPmProject>): Promise<ChittyPmProject | undefined>;
  
  // Communications operations
  
  // Party operations
  createParty(partyData: InsertParty): Promise<Party>;
  getParty(id: string): Promise<Party | undefined>;
  findPartiesByCase(caseId: string): Promise<Party[]>;
  findPartyByIdentifier(idType: string, normalizedIdentifier: string): Promise<Party | undefined>;
  upsertPartyWithIdentifier(partyData: Omit<InsertParty, 'id'>, identifier: InsertPartyIdentifier): Promise<Party>;
  linkPartyToChittyId(partyId: string, chittyId: string): Promise<Party | undefined>;
  
  // Party identifier operations
  addIdentifier(identifierData: InsertPartyIdentifier): Promise<PartyIdentifier>;
  listIdentifiers(partyId: string): Promise<PartyIdentifier[]>;
  findByNormalized(idType: string, normalizedIdentifier: string): Promise<PartyIdentifier[]>;
  
  // Conversation operations
  upsertConversationBySourceThread(source: string, externalThreadId: string, conversationData: Omit<InsertConversation, 'id'>): Promise<Conversation>;
  findBySoftKey(caseId: string, softKey: string): Promise<Conversation | undefined>;
  listConversationsByCase(caseId: string, options?: { limit?: number; cursor?: string }): Promise<Conversation[]>;
  
  // Message operations
  upsertBySourceExternalId(source: string, externalId: string, messageData: Omit<InsertMessage, 'id'>): Promise<Message>;
  getMessage(id: string): Promise<Message | undefined>;
  listMessagesByCase(caseId: string, filters?: {
    from?: string;
    to?: string;
    partyId?: string;
    direction?: 'inbound' | 'outbound' | 'system';
    limit?: number;
    offset?: number;
  }): Promise<Message[]>;
  listMessagesByConversation(conversationId: string): Promise<Message[]>;
  searchMessages(caseId: string, query: string): Promise<Message[]>;
  
  // Message party operations
  addMessageRoles(messageId: string, roles: InsertMessageParty[]): Promise<MessageParty[]>;
  listMessageParties(messageId: string): Promise<MessageParty[]>;
  
  // Conversation message operations
  linkConversationMessage(conversationId: string, messageId: string): Promise<ConversationMessage>;
  listConversationMessages(conversationId: string): Promise<Message[]>;
  
  // Message attachment operations
  addAttachment(attachmentData: InsertMessageAttachment): Promise<MessageAttachment>;
  listAttachmentsByMessage(messageId: string): Promise<MessageAttachment[]>;
  findAttachmentBySha256(sha256: string): Promise<MessageAttachment | undefined>;
  
  // Evidence orchestrator operations
  createEvidenceEnvelope(envelopeData: InsertEvidenceEnvelope): Promise<EvidenceEnvelope>;
  getEvidenceEnvelope(id: string): Promise<EvidenceEnvelope | undefined>;
  getEvidenceEnvelopes(caseId: string): Promise<EvidenceEnvelope[]>;
  getEvidenceDistributions(envelopeId: string): Promise<EvidenceDistribution[]>;
  getAllEvidenceDistributions(caseId?: string, filters?: {
    status?: string;
    target?: string;
    limit?: number;
    offset?: number;
  }): Promise<EvidenceDistribution[]>;
  getOutboundMessages(distributionId?: string, filters?: {
    status?: string;
    target?: string;
    limit?: number;
  }): Promise<OutboundMessage[]>;
  addEvidenceParticipant(participantData: InsertEvidenceEnvelopeParticipant): Promise<EvidenceEnvelopeParticipant>;
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
  
  async getTimelineEntriesByCase(caseId: string): Promise<TimelineEntry[]> {
    return await db
      .select()
      .from(timelineEntries)
      .where(and(
        eq(timelineEntries.caseId, caseId),
        isNull(timelineEntries.deletedAt)
      ))
      .orderBy(desc(timelineEntries.date));
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

  async getContradictionById(id: string): Promise<TimelineContradiction | undefined> {
    const [contradiction] = await db
      .select()
      .from(timelineContradictions)
      .where(eq(timelineContradictions.id, id));
    return contradiction;
  }

  async updateContradiction(
    id: string,
    updates: Partial<InsertTimelineContradiction>
  ): Promise<TimelineContradiction | undefined> {
    const [updated] = await db
      .update(timelineContradictions)
      .set(updates)
      .where(eq(timelineContradictions.id, id))
      .returning();
    return updated;
  }

  async resolveContradiction(
    id: string,
    resolvedBy: string,
    resolution: string
  ): Promise<void> {
    await db
      .update(timelineContradictions)
      .set({
        resolution,
        resolvedBy,
        resolvedDate: new Date(),
      })
      .where(eq(timelineContradictions.id, id));
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

  async getAllTimelineEntries(): Promise<TimelineEntry[]> {
    return await db
      .select()
      .from(timelineEntries)
      .where(isNull(timelineEntries.deletedAt))
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

  // Communications operations

  // Party operations
  async createParty(partyData: InsertParty): Promise<Party> {
    const [party] = await db
      .insert(parties)
      .values(partyData)
      .returning();
    return party;
  }

  async getParty(id: string): Promise<Party | undefined> {
    const [party] = await db
      .select()
      .from(parties)
      .where(eq(parties.id, id));
    return party;
  }

  async findPartiesByCase(caseId: string): Promise<Party[]> {
    return await db
      .select()
      .from(parties)
      .where(eq(parties.caseId, caseId))
      .orderBy(desc(parties.createdAt));
  }

  async findPartyByIdentifier(idType: string, normalizedIdentifier: string): Promise<Party | undefined> {
    const result = await db
      .select({
        id: parties.id,
        displayName: parties.displayName,
        caseId: parties.caseId,
        chittyId: parties.chittyId,
        createdAt: parties.createdAt,
      })
      .from(parties)
      .innerJoin(partyIdentifiers, eq(parties.id, partyIdentifiers.partyId))
      .where(and(
        eq(partyIdentifiers.idType, idType),
        eq(partyIdentifiers.normalizedIdentifier, normalizedIdentifier)
      ))
      .limit(1);
    
    return result[0];
  }

  async upsertPartyWithIdentifier(partyData: Omit<InsertParty, 'id'>, identifier: InsertPartyIdentifier): Promise<Party> {
    // First try to find existing party by identifier
    const existing = await this.findPartyByIdentifier(identifier.idType, identifier.identifier);
    
    if (existing) {
      // Update existing party if needed
      const [updated] = await db
        .update(parties)
        .set(partyData)
        .where(eq(parties.id, existing.id))
        .returning();
      return updated;
    }

    // Create new party and identifier
    const [party] = await db
      .insert(parties)
      .values(partyData)
      .returning();

    await db
      .insert(partyIdentifiers)
      .values({
        ...identifier,
        partyId: party.id,
      });

    return party;
  }

  async linkPartyToChittyId(partyId: string, chittyId: string): Promise<Party | undefined> {
    const [party] = await db
      .update(parties)
      .set({ chittyId })
      .where(eq(parties.id, partyId))
      .returning();
    return party;
  }

  // Party identifier operations
  async addIdentifier(identifierData: InsertPartyIdentifier): Promise<PartyIdentifier> {
    const [identifier] = await db
      .insert(partyIdentifiers)
      .values(identifierData)
      .returning();
    return identifier;
  }

  async listIdentifiers(partyId: string): Promise<PartyIdentifier[]> {
    return await db
      .select()
      .from(partyIdentifiers)
      .where(eq(partyIdentifiers.partyId, partyId));
  }

  async findByNormalized(idType: string, normalizedIdentifier: string): Promise<PartyIdentifier[]> {
    return await db
      .select()
      .from(partyIdentifiers)
      .where(and(
        eq(partyIdentifiers.idType, idType),
        eq(partyIdentifiers.normalizedIdentifier, normalizedIdentifier)
      ));
  }

  // Conversation operations
  async upsertConversationBySourceThread(source: string, externalThreadId: string, conversationData: Omit<InsertConversation, 'id'>): Promise<Conversation> {
    // Try to find existing conversation by source and external thread ID
    const [existing] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.source, source),
        eq(conversations.externalThreadId, externalThreadId)
      ))
      .limit(1);

    if (existing) {
      // Update existing conversation
      const [updated] = await db
        .update(conversations)
        .set(conversationData)
        .where(eq(conversations.id, existing.id))
        .returning();
      return updated;
    }

    // Create new conversation
    const [conversation] = await db
      .insert(conversations)
      .values({
        ...conversationData,
        source,
        externalThreadId,
      })
      .returning();
    return conversation;
  }

  async findBySoftKey(caseId: string, softKey: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.caseId, caseId),
        eq(conversations.softKey, softKey)
      ))
      .limit(1);
    return conversation;
  }

  async listConversationsByCase(caseId: string, options?: { limit?: number; cursor?: string }): Promise<Conversation[]> {
    let query = db
      .select()
      .from(conversations)
      .where(eq(conversations.caseId, caseId))
      .orderBy(desc(conversations.createdAt));

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    return await query;
  }

  // Message operations
  async upsertBySourceExternalId(source: string, externalId: string, messageData: Omit<InsertMessage, 'id'>): Promise<Message> {
    // Try to find existing message by source and external ID
    const [existing] = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.source, source),
        eq(messages.externalId, externalId)
      ))
      .limit(1);

    if (existing) {
      // Update existing message
      const [updated] = await db
        .update(messages)
        .set(messageData)
        .where(eq(messages.id, existing.id))
        .returning();
      return updated;
    }

    // Create new message
    const [message] = await db
      .insert(messages)
      .values({
        ...messageData,
        source,
        externalId,
      })
      .returning();
    return message;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db
      .select()
      .from(messages)
      .where(eq(messages.id, id));
    return message;
  }

  async listMessagesByCase(caseId: string, filters?: {
    from?: string;
    to?: string;
    partyId?: string;
    direction?: 'inbound' | 'outbound' | 'system';
    limit?: number;
    offset?: number;
  }): Promise<Message[]> {
    let query = db
      .select()
      .from(messages)
      .where(eq(messages.caseId, caseId))
      .orderBy(desc(messages.sentAt));

    // Apply filters
    const conditions = [eq(messages.caseId, caseId)];
    
    if (filters?.direction) {
      conditions.push(eq(messages.direction, filters.direction));
    }

    query = db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.sentAt));

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.offset(filters.offset);
    }

    return await query;
  }

  async listMessagesByConversation(conversationId: string): Promise<Message[]> {
    return await db
      .select({
        id: messages.id,
        source: messages.source,
        externalId: messages.externalId,
        direction: messages.direction,
        externalThreadId: messages.externalThreadId,
        subject: messages.subject,
        bodyText: messages.bodyText,
        normalizedText: messages.normalizedText,
        contentHash: messages.contentHash,
        sentAt: messages.sentAt,
        receivedAt: messages.receivedAt,
        caseId: messages.caseId,
        createdAt: messages.createdAt,
        senderPartyId: messages.senderPartyId,
      })
      .from(messages)
      .innerJoin(conversationMessages, eq(messages.id, conversationMessages.messageId))
      .where(eq(conversationMessages.conversationId, conversationId))
      .orderBy(messages.sentAt);
  }

  async searchMessages(caseId: string, query: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.caseId, caseId),
        or(
          like(messages.subject, `%${query}%`),
          like(messages.bodyText, `%${query}%`)
        )
      ))
      .orderBy(desc(messages.sentAt));
  }

  // Message party operations
  async addMessageRoles(messageId: string, roles: InsertMessageParty[]): Promise<MessageParty[]> {
    const roleData = roles.map(role => ({
      ...role,
      messageId,
    }));

    return await db
      .insert(messageParties)
      .values(roleData)
      .returning();
  }

  async listMessageParties(messageId: string): Promise<MessageParty[]> {
    return await db
      .select()
      .from(messageParties)
      .where(eq(messageParties.messageId, messageId));
  }

  // Conversation message operations
  async linkConversationMessage(conversationId: string, messageId: string): Promise<ConversationMessage> {
    const [link] = await db
      .insert(conversationMessages)
      .values({
        conversationId,
        messageId,
      })
      .returning();
    return link;
  }

  async listConversationMessages(conversationId: string): Promise<Message[]> {
    return this.listMessagesByConversation(conversationId);
  }

  // Message attachment operations
  async addAttachment(attachmentData: InsertMessageAttachment): Promise<MessageAttachment> {
    const [attachment] = await db
      .insert(messageAttachments)
      .values(attachmentData)
      .returning();
    return attachment;
  }

  async listAttachmentsByMessage(messageId: string): Promise<MessageAttachment[]> {
    return await db
      .select()
      .from(messageAttachments)
      .where(eq(messageAttachments.messageId, messageId));
  }

  async findAttachmentBySha256(sha256: string): Promise<MessageAttachment | undefined> {
    const [attachment] = await db
      .select()
      .from(messageAttachments)
      .where(eq(messageAttachments.sha256, sha256))
      .limit(1);
    return attachment;
  }

  // Evidence orchestrator operations
  async createEvidenceEnvelope(envelopeData: InsertEvidenceEnvelope): Promise<EvidenceEnvelope> {
    const [envelope] = await db
      .insert(evidenceEnvelopes)
      .values(envelopeData)
      .returning();
    return envelope;
  }

  async getEvidenceEnvelope(id: string): Promise<EvidenceEnvelope | undefined> {
    const [envelope] = await db
      .select()
      .from(evidenceEnvelopes)
      .where(eq(evidenceEnvelopes.id, id))
      .limit(1);
    return envelope;
  }

  async getEvidenceEnvelopes(caseId: string): Promise<EvidenceEnvelope[]> {
    return await db
      .select()
      .from(evidenceEnvelopes)
      .where(eq(evidenceEnvelopes.caseId, caseId))
      .orderBy(desc(evidenceEnvelopes.createdAt));
  }

  async getEvidenceDistributions(envelopeId: string): Promise<EvidenceDistribution[]> {
    return await db
      .select()
      .from(evidenceDistributions)
      .where(eq(evidenceDistributions.envelopeId, envelopeId))
      .orderBy(desc(evidenceDistributions.dispatchedAt));
  }

  async addEvidenceParticipant(participantData: InsertEvidenceEnvelopeParticipant): Promise<EvidenceEnvelopeParticipant> {
    const [participant] = await db
      .insert(evidenceEnvelopeParticipants)
      .values(participantData)
      .returning();
    return participant;
  }

  async getAllEvidenceDistributions(caseId?: string, filters?: {
    status?: string;
    target?: string;
    limit?: number;
    offset?: number;
  }): Promise<EvidenceDistribution[]> {
    const conditions = [];
    
    if (caseId) {
      const envelopesForCase = await db
        .select({ id: evidenceEnvelopes.id })
        .from(evidenceEnvelopes)
        .where(eq(evidenceEnvelopes.caseId, caseId));
      const envelopeIds = envelopesForCase.map(e => e.id);
      if (envelopeIds.length > 0) {
        conditions.push(inArray(evidenceDistributions.envelopeId, envelopeIds));
      } else {
        return [];
      }
    }

    if (filters?.status) {
      conditions.push(eq(evidenceDistributions.status, filters.status));
    }

    if (filters?.target) {
      conditions.push(eq(evidenceDistributions.target, filters.target as any));
    }

    // Build the query without type casting issues
    let queryBuilder = db
      .select()
      .from(evidenceDistributions)
      .$dynamic();

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }

    // Order by dispatchedAt (most recent first), nulls last
    queryBuilder = queryBuilder.orderBy(desc(evidenceDistributions.dispatchedAt));

    if (filters?.limit) {
      queryBuilder = queryBuilder.limit(filters.limit);
    }

    if (filters?.offset) {
      queryBuilder = queryBuilder.offset(filters.offset);
    }

    return await queryBuilder;
  }

  async getOutboundMessages(distributionId?: string, filters?: {
    status?: string;
    target?: string;
    limit?: number;
  }): Promise<OutboundMessage[]> {
    let query = db.select().from(outboundMessages);

    const conditions = [];

    if (distributionId) {
      conditions.push(eq(outboundMessages.distributionId, distributionId));
    }

    if (filters?.status) {
      conditions.push(eq(outboundMessages.status, filters.status));
    }

    if (filters?.target) {
      conditions.push(eq(outboundMessages.target, filters.target as any));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    query = query.orderBy(desc(outboundMessages.createdAt)) as any;

    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }

    return await query;
  }
}

export const storage = new DatabaseStorage();
