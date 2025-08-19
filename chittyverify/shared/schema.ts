import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// USERS - Parties, counsel, experts, court officers with 6D Trust
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  registrationNumber: text("registration_number").notNull().unique(),
  userType: text("user_type").notNull(), // PARTY_PETITIONER, PARTY_RESPONDENT, ATTORNEY_PETITIONER, etc.
  fullName: text("full_name").notNull(),
  barNumber: text("bar_number"),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  verifiedStatus: boolean("verified_status").default(false),
  trustScore: integer("trust_score").default(75),
  lastActivity: timestamp("last_activity").default(sql`now()`),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  createdAt: timestamp("created_at").default(sql`now()`),
  // ChittyTrust 6D Trust Revolution - Beyond credit scores, beyond binary trust
  sourceScore: decimal("source_score", { precision: 3, scale: 2 }).default("0.50"), // Source reliability & authenticity
  timeScore: decimal("time_score", { precision: 3, scale: 2 }).default("0.50"), // Temporal consistency & timeliness
  channelScore: decimal("channel_score", { precision: 3, scale: 2 }).default("0.50"), // Communication channel integrity
  outcomesScore: decimal("outcomes_score", { precision: 3, scale: 2 }).default("0.50"), // Historical success & reliability
  networkScore: decimal("network_score", { precision: 3, scale: 2 }).default("0.50"), // Professional network strength
  justiceScore: decimal("justice_score", { precision: 3, scale: 2 }).default("0.50"), // Ethical alignment & fairness
  composite6DTrust: decimal("composite_6d_trust", { precision: 4, scale: 2 }).default("3.00"), // Sum of all 6 dimensions
});

// CASES - Matter-level container with roll-ups & deadlines
export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseId: text("case_id").notNull().unique(), // Formula: Jurisdiction + "-" + Year + "-" + Type + "-" + Number
  jurisdiction: text("jurisdiction").notNull(), // e.g., ILLINOIS-COOK
  caseNumber: text("case_number").notNull(),
  caseType: text("case_type").notNull(), // DIVORCE, CUSTODY, CIVIL, CRIMINAL, PROBATE
  filingDate: timestamp("filing_date"),
  judgeAssigned: text("judge_assigned"),
  caseStatus: text("case_status").default("Active"), // Active, Stayed, Closed, Appeal
  totalEvidenceItems: integer("total_evidence_items").default(0),
  mintedFactsCount: integer("minted_facts_count").default(0),
  keyDates: jsonb("key_dates"), // Rich text/table structure
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// MASTER EVIDENCE - Canonical registry of every artifact
export const masterEvidence = pgTable("master_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artifactId: text("artifact_id").notNull().unique(), // Formula: "ART-" + id()
  caseBinding: varchar("case_binding").references(() => cases.id).notNull(),
  userBinding: varchar("user_binding").references(() => users.id).notNull(),
  evidenceType: text("evidence_type").notNull(), // Document, Image, Communication, Financial Record, Legal Filing, Physical Evidence
  evidenceTier: text("evidence_tier").notNull(), // SELF_AUTHENTICATING, GOVERNMENT, FINANCIAL_INSTITUTION, etc.
  evidenceWeight: decimal("evidence_weight", { precision: 3, scale: 2 }), // 0.0-1.0
  contentHash: text("content_hash"), // SHA-256
  originalFilename: text("original_filename"),
  uploadDate: timestamp("upload_date").default(sql`now()`),
  sourceVerificationStatus: text("source_verification_status").default("Pending"), // Verified, Pending, Failed
  authenticationMethod: text("authentication_method"), // Seal, Stamp, Certification, Notarization, etc.
  supportingClaims: jsonb("supporting_claims"), // Multi-select
  contradictingClaims: jsonb("contradicting_claims"), // Multi-select
  // ChittyVerify Status - Immutable verification before blockchain
  verifyStatus: text("verify_status").default("Unverified"), // ChittyVerified, Unverified, Rejected
  verifyTimestamp: timestamp("verify_timestamp"), // When ChittyVerify locked this evidence
  verifySignature: text("verify_signature"), // Cryptographic signature for immutability
  mintingStatus: text("minting_status").default("Pending"), // Minted, Pending, Rejected, Requires Corroboration
  blockNumber: text("block_number"),
  auditNotes: text("audit_notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

// ATOMIC FACTS - Line-item facts extracted from evidence
export const atomicFacts = pgTable("atomic_facts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  factId: text("fact_id").notNull().unique(), // Formula: "FACT-" + id()
  parentDocument: varchar("parent_document").references(() => masterEvidence.id).notNull(),
  factText: text("fact_text").notNull(),
  factType: text("fact_type").notNull(), // DATE, AMOUNT, ADMISSION, IDENTITY, LOCATION, RELATIONSHIP, ACTION, STATUS
  locationInDocument: text("location_in_document"), // p./¶/l.
  classificationLevel: text("classification_level").notNull(), // FACT, SUPPORTED_CLAIM, ASSERTION, ALLEGATION, CONTRADICTION
  weight: decimal("weight", { precision: 3, scale: 2 }), // 0.0-1.0
  credibilityFactors: jsonb("credibility_factors"), // Against Interest, Contemporaneous, Business Duty, Official Duty
  relatedFacts: jsonb("related_facts"), // Self-relation
  supportsCaseTheory: jsonb("supports_case_theory"), // Multi-select
  contradictsCaseTheory: jsonb("contradicts_case_theory"), // Multi-select
  chittychainStatus: text("chittychain_status").default("Pending"), // Minted, Pending, Rejected
  verificationDate: timestamp("verification_date"),
  verificationMethod: text("verification_method"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// CHAIN OF CUSTODY LOG - Immutable hand-off entries
export const chainOfCustodyLog = pgTable("chain_of_custody_log", {
  id: serial("log_id").primaryKey(),
  evidence: varchar("evidence").references(() => masterEvidence.id).notNull(),
  custodian: varchar("custodian").references(() => users.id).notNull(),
  dateReceived: timestamp("date_received").notNull(),
  dateTransferred: timestamp("date_transferred"),
  transferMethod: text("transfer_method"), // SEALED_ENVELOPE, CERTIFIED_MAIL, SECURE_DIGITAL, etc.
  integrityCheckMethod: text("integrity_check_method"), // HASH_VERIFICATION, SEAL_INTACT, etc.
  integrityVerified: boolean("integrity_verified").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// CONTRADICTION TRACKING - Conflicting-fact resolution engine
export const contradictionTracking = pgTable("contradiction_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contradictionId: text("contradiction_id").notNull().unique(), // Formula: "CONFLICT-" + id()
  conflictingFacts: jsonb("conflicting_facts"), // Relation to ATOMIC FACTS (many)
  conflictType: text("conflict_type").notNull(), // DIRECT_CONTRADICTION, TEMPORAL_IMPOSSIBILITY, etc.
  winningFact: varchar("winning_fact").references(() => atomicFacts.id),
  resolutionMethod: text("resolution_method"), // HIERARCHY_RULE, TEMPORAL_PRIORITY, etc.
  resolutionDate: timestamp("resolution_date"),
  impactOnCase: text("impact_on_case"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// AUDIT TRAIL - Every CRUD/read against the system
export const auditTrail = pgTable("audit_trail", {
  id: serial("action_id").primaryKey(),
  timestamp: timestamp("timestamp").default(sql`now()`),
  user: varchar("user").references(() => users.id).notNull(),
  actionType: text("action_type").notNull(), // Upload, Verify, Mint, Reject, Query, Modify, Access
  targetArtifact: varchar("target_artifact").references(() => masterEvidence.id),
  ipAddress: text("ip_address"),
  sessionId: text("session_id"),
  successFailure: text("success_failure").notNull(), // Success, Failure
  details: text("details"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

// Schema validation for inserts
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMasterEvidenceSchema = createInsertSchema(masterEvidence).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  evidenceWeight: z.number().min(0).max(1).optional(), // Allow number for weight
  artifactId: z.string().optional(), // Make artifactId optional
});

export const insertAtomicFactSchema = createInsertSchema(atomicFacts).omit({
  id: true,
  createdAt: true,
});

export const insertChainOfCustodyLogSchema = createInsertSchema(chainOfCustodyLog).omit({
  id: true,
  createdAt: true,
});

export const insertContradictionTrackingSchema = createInsertSchema(contradictionTracking).omit({
  id: true,
  createdAt: true,
});

export const insertAuditTrailSchema = createInsertSchema(auditTrail).omit({
  id: true,
  createdAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;

export type MasterEvidence = typeof masterEvidence.$inferSelect;
export type InsertMasterEvidence = z.infer<typeof insertMasterEvidenceSchema>;

export type AtomicFact = typeof atomicFacts.$inferSelect;
export type InsertAtomicFact = z.infer<typeof insertAtomicFactSchema>;

export type ChainOfCustodyLog = typeof chainOfCustodyLog.$inferSelect;
export type InsertChainOfCustodyLog = z.infer<typeof insertChainOfCustodyLogSchema>;

export type ContradictionTracking = typeof contradictionTracking.$inferSelect;
export type InsertContradictionTracking = z.infer<typeof insertContradictionTrackingSchema>;

export type AuditTrail = typeof auditTrail.$inferSelect;
export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;

// Evidence Sharing System
export const evidenceShares = pgTable("evidence_shares", {
  id: serial("id").primaryKey(),
  evidenceId: varchar("evidence_id").references(() => masterEvidence.id).notNull(),
  shareId: varchar("share_id", { length: 255 }).unique().notNull(),
  sharedBy: varchar("shared_by", { length: 255 }).notNull(), // ChittyID
  sharedWith: varchar("shared_with", { length: 255 }).notNull(), // Email or ChittyID
  accessLevel: varchar("access_level", { length: 50 }).notNull().default("view"), // view, download, verify
  expiresAt: timestamp("expires_at"),
  accessCount: integer("access_count").default(0),
  maxAccess: integer("max_access"), // null = unlimited
  isActive: boolean("is_active").default(true),
  securityPin: varchar("security_pin", { length: 10}), // Optional 4-6 digit PIN
  accessLog: jsonb("access_log").default([]), // Track access attempts
  sharedAt: timestamp("shared_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at"),
  metadata: jsonb("metadata").default({})
});

export const shareAccessLogs = pgTable("share_access_logs", {
  id: serial("id").primaryKey(),
  shareId: varchar("share_id", { length: 255 }).references(() => evidenceShares.shareId).notNull(),
  accessorId: varchar("accessor_id", { length: 255 }), // ChittyID or anonymous
  accessorEmail: varchar("accessor_email", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  action: varchar("action", { length: 50 }).notNull(), // view, download, verify, failed_auth
  success: boolean("success").default(true),
  accessedAt: timestamp("accessed_at").defaultNow(),
  metadata: jsonb("metadata").default({})
});

// Relations for sharing system - will be added after schema setup

// Insert schemas for sharing system
export const insertEvidenceShareSchema = createInsertSchema(evidenceShares).omit({
  id: true,
  sharedAt: true,
  accessCount: true,
  lastAccessedAt: true,
});

export const insertShareAccessLogSchema = createInsertSchema(shareAccessLogs).omit({
  id: true,
  accessedAt: true,
});

// Types for sharing system
export type EvidenceShare = typeof evidenceShares.$inferSelect;
export type InsertEvidenceShare = z.infer<typeof insertEvidenceShareSchema>;

export type ShareAccessLog = typeof shareAccessLogs.$inferSelect;
export type InsertShareAccessLog = z.infer<typeof insertShareAccessLogSchema>;