import { sql, relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for ChittyAuth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  chittyId: varchar("chitty_id").unique(),
  trustScore: integer("trust_score").default(100),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Verification status enum
export const verificationStatusEnum = pgEnum('verification_status', [
  'pending',
  'in_progress', 
  'verified',
  'rejected',
  'expired'
]);

// Trust level enum
export const trustLevelEnum = pgEnum('trust_level', [
  'L0', // Basic
  'L1', // Verified
  'L2', // Enhanced  
  'L3', // Premium
  'L4', // Executive
  'L5'  // Emergency
]);

// ChittyID records
export const chittyIds = pgTable("chitty_ids", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  chittyIdCode: varchar("chitty_id_code").unique().notNull(), // CH-2024-VER-1234-A format
  trustScore: integer("trust_score").default(0),
  trustLevel: trustLevelEnum("trust_level").default('L0'),
  verificationStatus: verificationStatusEnum("verification_status").default('pending'),
  issuedAt: timestamp("issued_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Verification records for different types of verification
export const verifications = pgTable("verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chittyId: varchar("chitty_id").notNull().references(() => chittyIds.id),
  verificationType: varchar("verification_type").notNull(), // 'id_card', 'address', 'phone', 'email', etc.
  status: verificationStatusEnum("status").default('pending'),
  documentHash: varchar("document_hash"), // For security/privacy
  verifiedAt: timestamp("verified_at"),
  expiresAt: timestamp("expires_at"),
  metadata: jsonb("metadata"), // Store additional verification details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Business partners in the network
export const businesses = pgTable("businesses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  domain: varchar("domain").unique(),
  industry: varchar("industry"),
  trustThreshold: integer("trust_threshold").default(500), // Minimum trust score required
  isActive: boolean("is_active").default(true),
  apiKey: varchar("api_key").unique(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Verification requests from businesses
export const verificationRequests = pgTable("verification_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  businessId: varchar("business_id").notNull().references(() => businesses.id),
  chittyId: varchar("chitty_id").references(() => chittyIds.id),
  requestType: varchar("request_type").notNull(), // 'instant_verify', 'background_check', etc.
  status: varchar("status").default('pending'), // 'pending', 'approved', 'rejected'
  trustScoreAtRequest: integer("trust_score_at_request"),
  responseData: jsonb("response_data"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ one, many }) => ({
  chittyId: one(chittyIds, {
    fields: [users.id],
    references: [chittyIds.userId],
  }),
}));

export const chittyIdsRelations = relations(chittyIds, ({ one, many }) => ({
  user: one(users, {
    fields: [chittyIds.userId],
    references: [users.id],
  }),
  verifications: many(verifications),
  verificationRequests: many(verificationRequests),
}));

export const verificationsRelations = relations(verifications, ({ one }) => ({
  chittyId: one(chittyIds, {
    fields: [verifications.chittyId],
    references: [chittyIds.id],
  }),
}));

export const businessesRelations = relations(businesses, ({ many }) => ({
  verificationRequests: many(verificationRequests),
}));

export const verificationRequestsRelations = relations(verificationRequests, ({ one }) => ({
  business: one(businesses, {
    fields: [verificationRequests.businessId],
    references: [businesses.id],
  }),
  chittyId: one(chittyIds, {
    fields: [verificationRequests.chittyId],
    references: [chittyIds.id],
  }),
}));

// Schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertChittyIdSchema = createInsertSchema(chittyIds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertVerificationRequestSchema = createInsertSchema(verificationRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertChittyId = z.infer<typeof insertChittyIdSchema>;
export type ChittyId = typeof chittyIds.$inferSelect;
export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type Verification = typeof verifications.$inferSelect;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type Business = typeof businesses.$inferSelect;
export type InsertVerificationRequest = z.infer<typeof insertVerificationRequestSchema>;
export type VerificationRequest = typeof verificationRequests.$inferSelect;
