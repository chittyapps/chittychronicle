import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, decimal, boolean, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Simple Cases table matching database
export const cases = pgTable("cases", {
  id: varchar("id").primaryKey(),
  caseId: varchar("case_id").notNull().unique(),
  title: varchar("title").notNull(),
  description: text("description"),
  caseType: varchar("case_type"),
  caseNumber: varchar("case_number").notNull(),
  jurisdiction: varchar("jurisdiction").notNull(),
  status: varchar("status").default("active"),
  createdBy: varchar("created_by").notNull(),
  priority: varchar("priority").default("medium"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

// Simple Evidence table matching database
export const masterEvidence = pgTable("master_evidence", {
  id: varchar("id").primaryKey(),
  artifactId: varchar("artifact_id").notNull().unique(),
  title: varchar("title").notNull(),
  description: text("description"),
  type: varchar("type").notNull(),
  subtype: varchar("subtype"),
  status: varchar("status").default("uploaded"),
  caseId: varchar("case_id"),
  caseBinding: varchar("case_binding"),
  userBinding: varchar("user_binding").notNull(),
  evidenceType: varchar("evidence_type").notNull(),
  evidenceTier: varchar("evidence_tier"),
  filePath: varchar("file_path"),
  fileSize: integer("file_size"),
  fileHash: varchar("file_hash"),
  uploadTimestamp: timestamp("upload_timestamp").default(sql`now()`),
  trustScore: decimal("trust_score").default("0.0"),
  verificationStatus: varchar("verification_status").default("pending"),
  verifyStatus: varchar("verify_status").default("Unverified"),
  verifyTimestamp: timestamp("verify_timestamp"),
  verifySignature: varchar("verify_signature"),
  mintingStatus: varchar("minting_status").default("Pending"),
  blockchainHash: varchar("blockchain_hash"),
  metadata: jsonb("metadata").default(sql`'{}'`),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`)
});

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;
export type MasterEvidence = typeof masterEvidence.$inferSelect;
export type InsertMasterEvidence = typeof masterEvidence.$inferInsert;

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMasterEvidenceSchema = createInsertSchema(masterEvidence).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});