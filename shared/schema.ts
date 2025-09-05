import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  date,
  uuid,
  pgEnum,
  boolean,
  real,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cases table
export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  caseName: varchar("case_name", { length: 255 }).notNull(),
  caseNumber: varchar("case_number", { length: 100 }).unique().notNull(),
  jurisdiction: varchar("jurisdiction", { length: 255 }),
  filingDate: date("filing_date"),
  trialDate: date("trial_date"),
  discoveryDeadline: date("discovery_deadline"),
  chittyPmProjectId: varchar("chitty_pm_project_id", { length: 255 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").notNull(),
});

// Entry types enums
export const entryTypeEnum = pgEnum('entry_type', ['task', 'event']);
export const eventSubtypeEnum = pgEnum('event_subtype', ['deadline', 'filed', 'signed', 'executed', 'served', 'hearing', 'occurred', 'expired']);
export const taskSubtypeEnum = pgEnum('task_subtype', ['draft', 'file', 'serve', 'review', 'respond']);
export const confidenceLevelEnum = pgEnum('confidence_level', ['high', 'medium', 'low', 'unverified']);
export const eventStatusEnum = pgEnum('event_status', ['occurred', 'upcoming', 'missed']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'blocked']);
export const documentTypeEnum = pgEnum('document_type', ['court_filing', 'email', 'contract', 'financial', 'corporate_filing', 'correspondence', 'other']);
export const verificationStatusEnum = pgEnum('verification_status', ['verified', 'pending', 'failed']);
export const ingestionStatusEnum = pgEnum('ingestion_status', ['pending', 'processing', 'completed', 'failed']);
export const ingestionSourceEnum = pgEnum('ingestion_source', ['email', 'cloud_storage', 'api', 'manual_upload', 'mcp_extension']);
export const messageSourceEnum = pgEnum('message_source', ['imessage', 'whatsapp', 'email', 'docusign', 'openphone']);
export const partyIdTypeEnum = pgEnum('party_id_type', ['email', 'phone', 'whatsapp_jid', 'imessage', 'docusign', 'openphone', 'other']);
export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound', 'system']);
export const messagePartyRoleEnum = pgEnum('message_party_role', ['sender', 'recipient', 'cc', 'bcc', 'signer', 'other']);

// Timeline entries table
export const timelineEntries = pgTable("timeline_entries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  chittyId: varchar("chitty_id", { length: 255 }).unique(),
  caseId: uuid("case_id").references(() => cases.id).notNull(),
  entryType: entryTypeEnum("entry_type").notNull(),
  eventSubtype: eventSubtypeEnum("event_subtype"),
  taskSubtype: taskSubtypeEnum("task_subtype"),
  date: date("date").notNull(),
  description: text("description").notNull(),
  detailedNotes: text("detailed_notes"),
  confidenceLevel: confidenceLevelEnum("confidence_level").notNull(),
  eventStatus: eventStatusEnum("event_status"),
  taskStatus: taskStatusEnum("task_status"),
  assignedTo: varchar("assigned_to", { length: 255 }),
  dueDate: date("due_date"),
  tags: text("tags").array().default(sql`ARRAY[]::text[]`),
  relatedEntries: uuid("related_entries").array().default(sql`ARRAY[]::uuid[]`),
  dependencies: uuid("dependencies").array().default(sql`ARRAY[]::uuid[]`),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  modifiedBy: varchar("modified_by", { length: 255 }).notNull(),
  lastModified: timestamp("last_modified").defaultNow(),
  deletedAt: timestamp("deleted_at"),
  // Message linkage fields for audit trail when converting communications to timeline entries
  messageId: uuid("message_id"),
  messageSource: messageSourceEnum("message_source"),
  messageDirection: messageDirectionEnum("message_direction"),
  metadata: jsonb("metadata"),
});

// Sources table
export const timelineSources = pgTable("timeline_sources", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: uuid("entry_id").references(() => timelineEntries.id, { onDelete: 'cascade' }).notNull(),
  documentType: documentTypeEnum("document_type").notNull(),
  fileName: text("file_name").notNull(),
  filePath: text("file_path").notNull(),
  page: varchar("page", { length: 20 }),
  paragraph: varchar("paragraph", { length: 50 }),
  lineNumber: varchar("line_number", { length: 20 }),
  excerpt: text("excerpt"),
  verificationStatus: verificationStatusEnum("verification_status").notNull(),
  verifiedDate: timestamp("verified_date"),
  verifiedBy: varchar("verified_by", { length: 255 }),
  chittyAssetId: varchar("chitty_asset_id", { length: 255 }),
  metadata: jsonb("metadata"),
});

// Contradictions table
export const timelineContradictions = pgTable("timeline_contradictions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  entryId: uuid("entry_id").references(() => timelineEntries.id, { onDelete: 'cascade' }).notNull(),
  conflictingEntryId: uuid("conflicting_entry_id").references(() => timelineEntries.id).notNull(),
  natureOfConflict: text("nature_of_conflict").notNull(),
  resolution: text("resolution"),
  resolvedBy: varchar("resolved_by", { length: 255 }),
  resolvedDate: timestamp("resolved_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Data ingestion pipeline table
export const dataIngestionJobs = pgTable("data_ingestion_jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: uuid("case_id").references(() => cases.id).notNull(),
  source: ingestionSourceEnum("source").notNull(),
  sourceIdentifier: varchar("source_identifier", { length: 500 }),
  status: ingestionStatusEnum("status").notNull().default('pending'),
  documentsFound: varchar("documents_found", { length: 10 }).default('0'),
  documentsProcessed: varchar("documents_processed", { length: 10 }).default('0'),
  entriesCreated: varchar("entries_created", { length: 10 }).default('0'),
  errorLog: text("error_log"),
  processingStarted: timestamp("processing_started"),
  processingCompleted: timestamp("processing_completed"),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"),
});

// MCP Integration table for external AI systems
export const mcpIntegrations = pgTable("mcp_integrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  integrationName: varchar("integration_name", { length: 100 }).notNull(),
  platform: varchar("platform", { length: 50 }).notNull(), // claude, chatgpt, etc
  apiEndpoint: varchar("api_endpoint", { length: 500 }),
  authToken: varchar("auth_token", { length: 500 }),
  isActive: varchar("is_active", { length: 10 }).notNull().default('true'),
  lastSyncDate: timestamp("last_sync_date"),
  syncStatus: varchar("sync_status", { length: 50 }).default('idle'),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  metadata: jsonb("metadata"),
});

// ChittyID Integration table
export const chittyIdUsers = pgTable("chitty_id_users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  chittyId: varchar("chitty_id", { length: 255 }).unique().notNull(),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  organizationId: varchar("organization_id", { length: 255 }),
  permissions: text("permissions").array().default(sql`ARRAY[]::text[]`),
  isActive: varchar("is_active", { length: 10 }).notNull().default('true'),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ChittyPM Integration table
export const chittyPmProjects = pgTable("chitty_pm_projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  chittyPmId: varchar("chitty_pm_id", { length: 255 }).unique().notNull(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  description: text("description"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: varchar("status", { length: 50 }).notNull(),
  teamMembers: text("team_members").array().default(sql`ARRAY[]::text[]`),
  milestones: jsonb("milestones"),
  lastSyncDate: timestamp("last_sync_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Relations
export const casesRelations = relations(cases, ({ many }) => ({
  timelineEntries: many(timelineEntries),
}));

export const timelineEntriesRelations = relations(timelineEntries, ({ one, many }) => ({
  case: one(cases, {
    fields: [timelineEntries.caseId],
    references: [cases.id],
  }),
  sources: many(timelineSources),
  contradictions: many(timelineContradictions),
}));

export const timelineSourcesRelations = relations(timelineSources, ({ one }) => ({
  entry: one(timelineEntries, {
    fields: [timelineSources.entryId],
    references: [timelineEntries.id],
  }),
}));

export const timelineContradictionsRelations = relations(timelineContradictions, ({ one }) => ({
  entry: one(timelineEntries, {
    fields: [timelineContradictions.entryId],
    references: [timelineEntries.id],
  }),
  conflictingEntry: one(timelineEntries, {
    fields: [timelineContradictions.conflictingEntryId],
    references: [timelineEntries.id],
  }),
}));

export const dataIngestionJobsRelations = relations(dataIngestionJobs, ({ one }) => ({
  case: one(cases, {
    fields: [dataIngestionJobs.caseId],
    references: [cases.id],
  }),
}));

// Case parties schema
export const partySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  partyType: z.enum(['plaintiff', 'defendant', 'third_party', 'intervenor', 'witness']),
  representedBy: z.string().optional(),
  attorneyName: z.string().optional(),
  attorneyFirm: z.string().optional(),
  contactInfo: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  chittyId: z.string().optional(),
  role: z.string().optional(),
  notes: z.string().optional(),
});

// Insert schemas
export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
}).extend({
  parties: z.array(partySchema).optional(),
});

export const insertTimelineEntrySchema = createInsertSchema(timelineEntries).omit({
  id: true,
  chittyId: true,
  createdAt: true,
  lastModified: true,
});

export const insertTimelineSourceSchema = createInsertSchema(timelineSources).omit({
  id: true,
});

export const insertTimelineContradictionSchema = createInsertSchema(timelineContradictions).omit({
  id: true,
  createdAt: true,
});

export const insertDataIngestionJobSchema = createInsertSchema(dataIngestionJobs).omit({
  id: true,
  createdAt: true,
});

export const insertMcpIntegrationSchema = createInsertSchema(mcpIntegrations).omit({
  id: true,
  createdAt: true,
});

export const insertChittyIdUserSchema = createInsertSchema(chittyIdUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChittyPmProjectSchema = createInsertSchema(chittyPmProjects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Contradiction Detection Schema
export const contradictionReports = pgTable("contradiction_reports", {
  id: varchar("id").primaryKey(),
  caseId: uuid("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  timelineEntryIds: text("timeline_entry_ids").array().notNull(),
  contradictionType: varchar("contradiction_type", { enum: ['temporal', 'factual', 'witness', 'location', 'entity', 'logical'] }).notNull(),
  severity: varchar("severity", { enum: ['low', 'medium', 'high', 'critical'] }).notNull(),
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  conflictingStatements: jsonb("conflicting_statements").notNull(),
  suggestedResolution: text("suggested_resolution"),
  confidence: real("confidence").notNull(),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContradictionReportSchema = createInsertSchema(contradictionReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Communications tables
export const parties = pgTable("parties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  displayName: text("display_name"),
  chittyId: varchar("chitty_id", { length: 255 }),
  caseId: uuid("case_id").references(() => cases.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const partyIdentifiers = pgTable("party_identifiers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  partyId: uuid("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  idType: partyIdTypeEnum("id_type").notNull(),
  identifier: text("identifier").notNull(),
  normalizedIdentifier: text("normalized_identifier").generatedAlwaysAs(sql`
    CASE
      WHEN id_type = 'email' THEN lower(btrim(identifier))
      WHEN id_type = 'phone' THEN regexp_replace(identifier, '[^0-9\\+]', '', 'g')
      ELSE lower(btrim(identifier))
    END
  `),
}, (table) => [
  index("ux_party_identifier_unique").on(table.idType, table.normalizedIdentifier),
]);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  source: messageSourceEnum("source"),
  externalThreadId: text("external_thread_id"),
  softKey: text("soft_key"),
  caseId: uuid("case_id").references(() => cases.id),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
  confidence: real("confidence").default(1.0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ux_conversation_source_thread").on(table.source, table.externalThreadId),
]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  source: messageSourceEnum("source").notNull(),
  externalId: text("external_id"),
  externalThreadId: text("external_thread_id"),
  direction: messageDirectionEnum("direction"),
  senderPartyId: uuid("sender_party_id").references(() => parties.id),
  subject: text("subject"),
  bodyText: text("body_text"),
  normalizedText: text("normalized_text").generatedAlwaysAs(sql`
    lower(regexp_replace(coalesce(body_text,''), '\\s+', ' ', 'g'))
  `),
  contentHash: text("content_hash").generatedAlwaysAs(sql`md5(lower(regexp_replace(coalesce(body_text,''), '\\s+', ' ', 'g')))`),
  sentAt: timestamp("sent_at").notNull(),
  receivedAt: timestamp("received_at"),
  caseId: uuid("case_id").references(() => cases.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("ix_messages_sent_at").on(table.sentAt),
  index("ix_messages_content_hash").on(table.contentHash),
  index("ix_messages_case_id").on(table.caseId),
]);

export const messageParties = pgTable("message_parties", {
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }).notNull(),
  partyId: uuid("party_id").references(() => parties.id, { onDelete: "cascade" }).notNull(),
  role: messagePartyRoleEnum("role").notNull(),
}, (table) => [
  index("ix_message_parties_party").on(table.partyId),
]);

export const conversationMessages = pgTable("conversation_messages", {
  conversationId: uuid("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }).notNull(),
});

export const messageAttachments = pgTable("message_attachments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }).notNull(),
  fileName: text("file_name"),
  mimeType: text("mime_type"),
  url: text("url"),
  sha256: text("sha256"),
  sizeBytes: bigint("size_bytes", { mode: "number" }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Communications insert schemas
export const insertPartySchema = createInsertSchema(parties).omit({
  id: true,
  createdAt: true,
});

export const insertPartyIdentifierSchema = createInsertSchema(partyIdentifiers).omit({
  id: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertMessagePartySchema = createInsertSchema(messageParties);

export const insertConversationMessageSchema = createInsertSchema(conversationMessages);

export const insertMessageAttachmentSchema = createInsertSchema(messageAttachments).omit({
  id: true,
  createdAt: true,
});

// Communications relations
export const partiesRelations = relations(parties, ({ one, many }) => ({
  case: one(cases, {
    fields: [parties.caseId],
    references: [cases.id],
  }),
  identifiers: many(partyIdentifiers),
  sentMessages: many(messages),
  messageParties: many(messageParties),
}));

export const partyIdentifiersRelations = relations(partyIdentifiers, ({ one }) => ({
  party: one(parties, {
    fields: [partyIdentifiers.partyId],
    references: [parties.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  case: one(cases, {
    fields: [conversations.caseId],
    references: [cases.id],
  }),
  conversationMessages: many(conversationMessages),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  case: one(cases, {
    fields: [messages.caseId],
    references: [cases.id],
  }),
  senderParty: one(parties, {
    fields: [messages.senderPartyId],
    references: [parties.id],
  }),
  messageParties: many(messageParties),
  conversationMessages: many(conversationMessages),
  attachments: many(messageAttachments),
}));

export const messagePartiesRelations = relations(messageParties, ({ one }) => ({
  message: one(messages, {
    fields: [messageParties.messageId],
    references: [messages.id],
  }),
  party: one(parties, {
    fields: [messageParties.partyId],
    references: [parties.id],
  }),
}));

export const conversationMessagesRelations = relations(conversationMessages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationMessages.conversationId],
    references: [conversations.id],
  }),
  message: one(messages, {
    fields: [conversationMessages.messageId],
    references: [messages.id],
  }),
}));

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, {
    fields: [messageAttachments.messageId],
    references: [messages.id],
  }),
}));

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;


export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type TimelineEntry = typeof timelineEntries.$inferSelect;
export type InsertTimelineEntry = z.infer<typeof insertTimelineEntrySchema>;
export type TimelineSource = typeof timelineSources.$inferSelect;
export type InsertTimelineSource = z.infer<typeof insertTimelineSourceSchema>;
export type TimelineContradiction = typeof timelineContradictions.$inferSelect;
export type InsertTimelineContradiction = z.infer<typeof insertTimelineContradictionSchema>;
export type DataIngestionJob = typeof dataIngestionJobs.$inferSelect;
export type InsertDataIngestionJob = z.infer<typeof insertDataIngestionJobSchema>;
export type ContradictionReport = typeof contradictionReports.$inferSelect;
export type InsertContradictionReport = z.infer<typeof insertContradictionReportSchema>;
export type McpIntegration = typeof mcpIntegrations.$inferSelect;
export type InsertMcpIntegration = z.infer<typeof insertMcpIntegrationSchema>;
export type ChittyIdUser = typeof chittyIdUsers.$inferSelect;
export type InsertChittyIdUser = z.infer<typeof insertChittyIdUserSchema>;
export type ChittyPmProject = typeof chittyPmProjects.$inferSelect;
export type InsertChittyPmProject = z.infer<typeof insertChittyPmProjectSchema>;

// Communications types
export type Party = typeof parties.$inferSelect;
export type InsertParty = z.infer<typeof insertPartySchema>;
export type PartyIdentifier = typeof partyIdentifiers.$inferSelect;
export type InsertPartyIdentifier = z.infer<typeof insertPartyIdentifierSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageParty = typeof messageParties.$inferSelect;
export type InsertMessageParty = z.infer<typeof insertMessagePartySchema>;
export type ConversationMessage = typeof conversationMessages.$inferSelect;
export type InsertConversationMessage = z.infer<typeof insertConversationMessageSchema>;
export type MessageAttachment = typeof messageAttachments.$inferSelect;
export type InsertMessageAttachment = z.infer<typeof insertMessageAttachmentSchema>;
