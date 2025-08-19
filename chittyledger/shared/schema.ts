import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Evidence Tier Enum
export const evidenceTiers = [
  'SELF_AUTHENTICATING',
  'GOVERNMENT', 
  'FINANCIAL_INSTITUTION',
  'INDEPENDENT_THIRD_PARTY',
  'BUSINESS_RECORDS',
  'FIRST_PARTY_ADVERSE',
  'FIRST_PARTY_FRIENDLY',
  'UNCORROBORATED_PERSON'
] as const;

export type EvidenceTier = typeof evidenceTiers[number];

// Evidence Status Enum
export const evidenceStatuses = [
  'PENDING',
  'MINTED',
  'VERIFIED',
  'REQUIRES_CORROBORATION',
  'CONTRADICTED'
] as const;

export type EvidenceStatus = typeof evidenceStatuses[number];

// Case Type Enum
export const caseTypes = [
  'CIVIL',
  'CRIMINAL',
  'FAMILY',
  'CORPORATE',
  'INTELLECTUAL_PROPERTY'
] as const;

export type CaseType = typeof caseTypes[number];

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default('attorney'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cases table
export const cases = pgTable("cases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  caseNumber: text("case_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  caseType: text("case_type").notNull(),
  status: text("status").notNull().default('active'),
  parties: jsonb("parties"),
  nextHearing: timestamp("next_hearing"),
  courtroom: text("courtroom"),
  judge: text("judge"),
  attorneyId: varchar("attorney_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Master Evidence table
export const masterEvidence = pgTable("master_evidence", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  artifactId: text("artifact_id").notNull().unique(),
  filename: text("filename").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: text("file_size"),
  description: text("description"),
  evidenceTier: text("evidence_tier").notNull(),
  trustScore: decimal("trust_score", { precision: 3, scale: 2 }).notNull(),
  originalTrustScore: decimal("original_trust_score", { precision: 3, scale: 2 }).notNull(),
  status: text("status").notNull().default('PENDING'),
  blockNumber: text("block_number"),
  hashValue: text("hash_value"),
  mintedAt: timestamp("minted_at"),
  trustDegradationRate: decimal("trust_degradation_rate", { precision: 5, scale: 4 }).default("0.0001"),
  lastTrustUpdate: timestamp("last_trust_update").defaultNow().notNull(),
  corroborationCount: integer("corroboration_count").default(0),
  conflictCount: integer("conflict_count").default(0),
  // Blockchain minting criteria - separate from trust scores
  mintingEligible: boolean("minting_eligible").default(false),
  mintingScore: decimal("minting_score", { precision: 3, scale: 2 }).default("0.00"),
  // ChittyTrust scoring system - separate evaluation
  chittytrustScore: decimal("chittytrust_score", { precision: 3, scale: 2 }).default("0.00"),
  caseId: varchar("case_id").references(() => cases.id),
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

// Atomic Facts table
export const atomicFacts = pgTable("atomic_facts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  factId: text("fact_id").notNull().unique(),
  content: text("content").notNull(),
  factType: text("fact_type").notNull(),
  confidenceScore: decimal("confidence_score", { precision: 3, scale: 2 }).notNull(),
  evidenceId: varchar("evidence_id").references(() => masterEvidence.id),
  extractedAt: timestamp("extracted_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

// Chain of Custody Log table
export const chainOfCustodyLog = pgTable("chain_of_custody_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  evidenceId: varchar("evidence_id").references(() => masterEvidence.id),
  action: text("action").notNull(),
  performedBy: varchar("performed_by").references(() => users.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  location: text("location"),
  notes: text("notes"),
  hashBefore: text("hash_before"),
  hashAfter: text("hash_after"),
});

// Contradictions table
export const contradictions = pgTable("contradictions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conflictId: text("conflict_id").notNull().unique(),
  description: text("description").notNull(),
  contradictionType: text("contradiction_type").notNull(),
  severity: text("severity").notNull().default('medium'),
  status: text("status").notNull().default('active'),
  evidenceId1: varchar("evidence_id_1").references(() => masterEvidence.id),
  evidenceId2: varchar("evidence_id_2").references(() => masterEvidence.id),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  role: true,
});

export const insertCaseSchema = createInsertSchema(cases).pick({
  caseNumber: true,
  title: true,
  description: true,
  caseType: true,
  parties: true,
  nextHearing: true,
  courtroom: true,
  judge: true,
  attorneyId: true,
});

export const insertEvidenceSchema = createInsertSchema(masterEvidence).pick({
  filename: true,
  fileType: true,
  fileSize: true,
  description: true,
  evidenceTier: true,
  caseId: true,
});

export const insertFactSchema = createInsertSchema(atomicFacts).pick({
  content: true,
  factType: true,
  confidenceScore: true,
  evidenceId: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;

export type Evidence = typeof masterEvidence.$inferSelect;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;

export type AtomicFact = typeof atomicFacts.$inferSelect;
export type InsertFact = z.infer<typeof insertFactSchema>;

export type ChainOfCustody = typeof chainOfCustodyLog.$inferSelect;
export type Contradiction = typeof contradictions.$inferSelect;
