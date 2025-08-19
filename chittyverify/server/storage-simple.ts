import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { cases, masterEvidence, Case, MasterEvidence, InsertCase, InsertMasterEvidence } from "@shared/schema-simple";

export interface IStorage {
  // Cases
  getCase(id: string): Promise<Case | undefined>;
  getCasesByUserId(userId: string): Promise<Case[]>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<Case>): Promise<Case | undefined>;

  // Master Evidence  
  getMasterEvidence(id: string): Promise<MasterEvidence | undefined>;
  getMasterEvidenceByCase(caseId: string): Promise<MasterEvidence[]>;
  createMasterEvidence(evidence: InsertMasterEvidence): Promise<MasterEvidence>;
  updateMasterEvidence(id: string, updates: Partial<MasterEvidence>): Promise<MasterEvidence | undefined>;
}

export class DatabaseStorage implements IStorage {
  private db;

  constructor() {
    this.db = db;
  }

  // Cases
  async getCase(id: string): Promise<Case | undefined> {
    try {
      const result = await this.db.select().from(cases).where(eq(cases.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Database error in getCase:', error);
      throw error;
    }
  }

  async getCasesByUserId(userId: string): Promise<Case[]> {
    try {
      return await this.db.select().from(cases).orderBy(desc(cases.createdAt));
    } catch (error) {
      console.error('Database error in getCasesByUserId:', error);
      throw error;
    }
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const caseWithId = {
      ...caseData,
      id: `case-${randomUUID()}`,
      caseId: caseData.caseId || `${caseData.jurisdiction}-${new Date().getFullYear()}-${caseData.caseType}-${Date.now()}`
    };
    const [newCase] = await this.db.insert(cases).values(caseWithId).returning();
    return newCase;
  }

  async updateCase(id: string, updates: Partial<Case>): Promise<Case | undefined> {
    const [updated] = await this.db.update(cases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cases.id, id))
      .returning();
    return updated;
  }

  // Master Evidence
  async getMasterEvidence(id: string): Promise<MasterEvidence | undefined> {
    try {
      const result = await this.db.select().from(masterEvidence).where(eq(masterEvidence.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Database error in getMasterEvidence:', error);
      throw error;
    }
  }

  async getMasterEvidenceByCase(caseId: string): Promise<MasterEvidence[]> {
    try {
      return await this.db.select().from(masterEvidence)
        .where(eq(masterEvidence.caseBinding, caseId))
        .orderBy(desc(masterEvidence.uploadTimestamp));
    } catch (error) {
      console.error('Evidence query error:', error);
      throw error;
    }
  }

  async createMasterEvidence(evidence: InsertMasterEvidence): Promise<MasterEvidence> {
    const evidenceWithId = {
      ...evidence,
      id: `evidence-${randomUUID()}`,
      artifactId: `ART-${Date.now()}`,
    };
    const [newEvidence] = await this.db.insert(masterEvidence).values(evidenceWithId).returning();
    return newEvidence;
  }

  async updateMasterEvidence(id: string, updates: Partial<MasterEvidence>): Promise<MasterEvidence | undefined> {
    const [updated] = await this.db.update(masterEvidence)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(masterEvidence.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();