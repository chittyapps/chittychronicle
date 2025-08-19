import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { users, cases, masterEvidence, atomicFacts, chainOfCustodyLog, contradictionTracking, auditTrail } from "../shared/schema";
import type { User, InsertUser, Case, InsertCase, MasterEvidence, InsertMasterEvidence, AtomicFact, InsertAtomicFact, ChainOfCustodyLog, InsertChainOfCustodyLog, ContradictionTracking, InsertContradictionTracking, AuditTrail, InsertAuditTrail } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByRegistrationNumber(regNumber: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserTrustScore(id: string, trustScore: number): Promise<User | undefined>;

  // Cases
  getCase(id: string): Promise<Case | undefined>;
  getCasesByUserId(userId: string): Promise<Case[]>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<Case>): Promise<Case | undefined>;
  updateCaseStats(caseId: string): Promise<void>;

  // Master Evidence
  getMasterEvidence(id: string): Promise<MasterEvidence | undefined>;
  getMasterEvidenceByCase(caseId: string): Promise<MasterEvidence[]>;
  createMasterEvidence(evidence: InsertMasterEvidence): Promise<MasterEvidence>;
  updateMasterEvidence(id: string, updates: Partial<MasterEvidence>): Promise<MasterEvidence | undefined>;

  // Atomic Facts
  getAtomicFact(id: string): Promise<AtomicFact | undefined>;
  getAtomicFactsByEvidence(evidenceId: string): Promise<AtomicFact[]>;
  createAtomicFact(fact: InsertAtomicFact): Promise<AtomicFact>;
  updateAtomicFact(id: string, updates: Partial<AtomicFact>): Promise<AtomicFact | undefined>;

  // Chain of Custody
  getChainOfCustody(evidenceId: string): Promise<ChainOfCustodyLog[]>;
  createChainOfCustodyEntry(entry: InsertChainOfCustodyLog): Promise<ChainOfCustodyLog>;

  // Contradiction Tracking
  getContradictions(): Promise<ContradictionTracking[]>;
  createContradiction(contradiction: InsertContradictionTracking): Promise<ContradictionTracking>;

  // Audit Trail
  getAuditTrail(userId?: string): Promise<AuditTrail[]>;
  createAuditEntry(entry: InsertAuditTrail): Promise<AuditTrail>;
}

export class DatabaseStorage implements IStorage {
  public db;
  public users = users;
  public cases = cases;
  public masterEvidence = masterEvidence;
  public atomicFacts = atomicFacts;
  public chainOfCustodyLog = chainOfCustodyLog;
  public contradictionTracking = contradictionTracking;
  public auditTrail = auditTrail;

  constructor() {
    const sql = neon(process.env.DATABASE_URL!);
    this.db = drizzle(sql);
    
    // Initialize with clean state
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    // Database initialized - ready for authentic data only
    console.log('ChittyVerify Evidence Platform initialized - no mock data, authentic evidence only');
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByRegistrationNumber(regNumber: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.registrationNumber, regNumber)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const userData = {
      ...user,
      registrationNumber: user.registrationNumber || `REG${String(Math.floor(Math.random() * 99999999)).padStart(8, '0')}`
    };
    const [newUser] = await this.db.insert(users).values(userData).returning();
    return newUser;
  }

  async updateUserTrustScore(id: string, trustScore: number): Promise<User | undefined> {
    const [updated] = await this.db.update(users)
      .set({ trustScore })
      .where(eq(users.id, id))
      .returning();
    return updated;
  }

  // Cases
  async getCase(id: string): Promise<Case | undefined> {
    const result = await this.db.select().from(cases).where(eq(cases.id, id)).limit(1);
    return result[0];
  }

  async getCasesByUserId(userId: string): Promise<Case[]> {
    try {
      return await this.db.select({
        id: cases.id,
        caseId: cases.caseId,
        title: cases.title,
        description: cases.description,
        caseType: cases.caseType,
        caseNumber: cases.caseNumber,
        jurisdiction: cases.jurisdiction,
        status: cases.status,
        createdAt: cases.createdAt,
        updatedAt: cases.updatedAt
      }).from(cases).orderBy(desc(cases.createdAt));
    } catch (error) {
      console.error('Database error in getCasesByUserId:', error);
      throw error;
    }
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const caseWithId = {
      ...caseData,
      caseId: caseData.caseId || `${caseData.jurisdiction}-${new Date().getFullYear()}-${caseData.caseType}-${caseData.caseNumber}`
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

  async updateCaseStats(caseId: string): Promise<void> {
    // Get evidence counts for this case
    const evidenceList = await this.db.select().from(masterEvidence).where(eq(masterEvidence.caseBinding, caseId));
    const factsList = await this.db.select().from(atomicFacts);
    
    const totalEvidenceItems = evidenceList.length;
    const mintedFactsCount = factsList.filter(f => f.chittychainStatus === 'Minted').length;

    await this.db.update(cases)
      .set({
        totalEvidenceItems,
        mintedFactsCount,
        updatedAt: new Date()
      })
      .where(eq(cases.id, caseId));
  }

  // Master Evidence
  async getMasterEvidence(id: string): Promise<MasterEvidence | undefined> {
    const result = await this.db.select().from(masterEvidence).where(eq(masterEvidence.id, id)).limit(1);
    return result[0];
  }

  async getMasterEvidenceByCase(caseId: string): Promise<MasterEvidence[]> {
    try {
      return await this.db.select({
        id: masterEvidence.id,
        artifactId: masterEvidence.artifactId,
        title: masterEvidence.title,
        description: masterEvidence.description,
        type: masterEvidence.type,
        status: masterEvidence.status,
        caseBinding: masterEvidence.caseBinding,
        trustScore: masterEvidence.trustScore,
        uploadTimestamp: masterEvidence.uploadTimestamp,
        verifyStatus: masterEvidence.verifyStatus,
        verifyTimestamp: masterEvidence.verifyTimestamp,
        mintingStatus: masterEvidence.mintingStatus,
        createdAt: masterEvidence.createdAt
      }).from(masterEvidence).where(eq(masterEvidence.caseBinding, caseId)).orderBy(desc(masterEvidence.uploadTimestamp));
    } catch (error) {
      console.error('Evidence query error:', error);
      throw error;
    }
  }

  async createMasterEvidence(evidence: InsertMasterEvidence): Promise<MasterEvidence> {
    // DEDUPLICATION CHECK - Prevent duplicate evidence by content hash
    if (evidence.contentHash) {
      const existing = await this.db.select()
        .from(masterEvidence)
        .where(eq(masterEvidence.contentHash, evidence.contentHash))
        .limit(1);
      
      if (existing.length > 0) {
        throw new Error(`Evidence already exists with hash ${evidence.contentHash}. Artifact ID: ${existing[0].artifactId}`);
      }
    }

    // FILENAME DEDUPLICATION - Check for same filename in same case
    if (evidence.originalFilename && evidence.caseBinding) {
      const sameFile = await this.db.select()
        .from(masterEvidence)
        .where(eq(masterEvidence.caseBinding, evidence.caseBinding))
        .where(eq(masterEvidence.originalFilename, evidence.originalFilename))
        .limit(1);
      
      if (sameFile.length > 0) {
        throw new Error(`File "${evidence.originalFilename}" already uploaded to this case. Artifact ID: ${sameFile[0].artifactId}`);
      }
    }

    const evidenceWithId = {
      ...evidence,
      artifactId: evidence.artifactId || `ART-${randomUUID().slice(0, 8).toUpperCase()}`,
      sourceVerificationStatus: 'Pending', // All evidence starts as pending verification
      mintingStatus: 'Pending' // Not everything gets minted - requires manual approval
    };
    
    const [newEvidence] = await this.db.insert(masterEvidence).values(evidenceWithId).returning();
    
    // CREATE AUDIT ENTRY
    await this.createAuditEntry({
      user: evidence.userBinding,
      actionType: 'Upload',
      targetArtifact: newEvidence.id,
      successFailure: 'Success',
      details: `Uploaded evidence: ${evidence.originalFilename || 'Unknown filename'}`
    });
    
    return newEvidence;
  }

  async updateMasterEvidence(id: string, updates: Partial<MasterEvidence>): Promise<MasterEvidence | undefined> {
    const [updated] = await this.db.update(masterEvidence)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(masterEvidence.id, id))
      .returning();
    return updated;
  }

  // Atomic Facts
  async getAtomicFact(id: string): Promise<AtomicFact | undefined> {
    const result = await this.db.select().from(atomicFacts).where(eq(atomicFacts.id, id)).limit(1);
    return result[0];
  }

  async getAtomicFactsByEvidence(evidenceId: string): Promise<AtomicFact[]> {
    return await this.db.select().from(atomicFacts).where(eq(atomicFacts.parentDocument, evidenceId));
  }

  async createAtomicFact(fact: InsertAtomicFact): Promise<AtomicFact> {
    const factWithId = {
      ...fact,
      factId: fact.factId || `FACT-${randomUUID().slice(0, 8).toUpperCase()}`
    };
    const [newFact] = await this.db.insert(atomicFacts).values(factWithId).returning();
    return newFact;
  }

  async updateAtomicFact(id: string, updates: Partial<AtomicFact>): Promise<AtomicFact | undefined> {
    const [updated] = await this.db.update(atomicFacts)
      .set(updates)
      .where(eq(atomicFacts.id, id))
      .returning();
    return updated;
  }

  // Chain of Custody
  async getChainOfCustody(evidenceId: string): Promise<ChainOfCustodyLog[]> {
    return await this.db.select().from(chainOfCustodyLog).where(eq(chainOfCustodyLog.evidence, evidenceId));
  }

  async createChainOfCustodyEntry(entry: InsertChainOfCustodyLog): Promise<ChainOfCustodyLog> {
    const [newEntry] = await this.db.insert(chainOfCustodyLog).values(entry).returning();
    return newEntry;
  }

  // Contradiction Tracking
  async getContradictions(): Promise<ContradictionTracking[]> {
    return await this.db.select().from(contradictionTracking);
  }

  async createContradiction(contradiction: InsertContradictionTracking): Promise<ContradictionTracking> {
    const contradictionWithId = {
      ...contradiction,
      contradictionId: contradiction.contradictionId || `CONFLICT-${randomUUID().slice(0, 8).toUpperCase()}`
    };
    const [newContradiction] = await this.db.insert(contradictionTracking).values(contradictionWithId).returning();
    return newContradiction;
  }

  // Evidence Verification - Core deduplication and integrity checks
  async verifyEvidenceIntegrity(evidenceId: string, contentHash: string): Promise<boolean> {
    const evidence = await this.getMasterEvidence(evidenceId);
    if (!evidence) return false;
    
    // Hash verification - ensure content hasn't changed
    return evidence.contentHash === contentHash;
  }

  async checkEvidenceAlreadyVerified(contentHash: string): Promise<MasterEvidence | null> {
    if (!contentHash) return null;
    
    const verified = await this.db.select()
      .from(masterEvidence)
      .where(eq(masterEvidence.contentHash, contentHash))
      .where(eq(masterEvidence.sourceVerificationStatus, 'Verified'))
      .limit(1);
    
    return verified[0] || null;
  }

  async updateVerificationStatus(evidenceId: string, status: 'Verified' | 'Failed' | 'Pending'): Promise<MasterEvidence | undefined> {
    const [updated] = await this.db.update(masterEvidence)
      .set({ 
        sourceVerificationStatus: status,
        updatedAt: new Date()
      })
      .where(eq(masterEvidence.id, evidenceId))
      .returning();
    
    // AUDIT VERIFICATION ACTION
    if (updated) {
      await this.createAuditEntry({
        userRef: updated.userBinding,
        actionType: status === 'Verified' ? 'Verify' : 'Reject',
        targetArtifact: evidenceId,
        successFailure: 'Success',
        details: `Evidence verification status: ${status}`
      });
    }
    
    return updated;
  }

  // ChittyVerify - Immutable verification layer
  async chittyVerifyEvidence(evidenceId: string, verifyResult: {
    status: string;
    timestamp: Date;
    signature: string;
  }): Promise<MasterEvidence | undefined> {
    const [updated] = await this.db.update(masterEvidence)
      .set({ 
        verifyStatus: verifyResult.status,
        verifyTimestamp: verifyResult.timestamp,
        verifySignature: verifyResult.signature,
        updatedAt: new Date()
      })
      .where(eq(masterEvidence.id, evidenceId))
      .returning();
    
    // AUDIT CHITTYVERIFY ACTION
    if (updated) {
      await this.createAuditEntry({
        userRef: updated.userBinding,
        actionType: 'ChittyVerify',
        targetArtifact: evidenceId,
        successFailure: 'Success',
        details: `ChittyVerify status: ${verifyResult.status} - Immutable verification completed`
      });
    }
    
    return updated;
  }

  // Audit Trail
  async getAuditTrail(userId?: string): Promise<AuditTrail[]> {
    if (userId) {
      return await this.db.select().from(auditTrail).where(eq(auditTrail.user, userId));
    }
    return await this.db.select().from(auditTrail).orderBy(desc(auditTrail.timestamp));
  }

  async createAuditEntry(entry: InsertAuditTrail): Promise<AuditTrail> {
    const auditData = {
      ...entry,
      timestamp: new Date()
    };
    const [newEntry] = await this.db.insert(auditTrail).values(auditData).returning();
    return newEntry;
  }

  // Evidence sharing operations
  async createEvidenceShare(shareData: InsertEvidenceShare): Promise<EvidenceShare> {
    const [share] = await this.db
      .insert(evidenceShares)
      .values(shareData)
      .returning();
    return share;
  }

  async getEvidenceShareByShareId(shareId: string): Promise<EvidenceShare | undefined> {
    const [share] = await this.db
      .select()
      .from(evidenceShares)
      .where(eq(evidenceShares.shareId, shareId));
    return share;
  }

  async getEvidenceSharesByEvidence(evidenceId: string): Promise<EvidenceShare[]> {
    return await this.db
      .select()
      .from(evidenceShares)
      .where(eq(evidenceShares.evidenceId, evidenceId))
      .orderBy(desc(evidenceShares.sharedAt));
  }

  async updateEvidenceShareAccess(shareId: string, accessCount: number): Promise<void> {
    await this.db
      .update(evidenceShares)
      .set({ 
        accessCount,
        lastAccessedAt: new Date()
      })
      .where(eq(evidenceShares.shareId, shareId));
  }

  async deactivateEvidenceShare(shareId: string): Promise<void> {
    await this.db
      .update(evidenceShares)
      .set({ isActive: false })
      .where(eq(evidenceShares.shareId, shareId));
  }

  async createShareAccessLog(logData: InsertShareAccessLog): Promise<ShareAccessLog> {
    const [log] = await this.db
      .insert(shareAccessLogs)
      .values(logData)
      .returning();
    return log;
  }

  async getShareAccessLogs(shareId: string): Promise<ShareAccessLog[]> {
    return await this.db
      .select()
      .from(shareAccessLogs)
      .where(eq(shareAccessLogs.shareId, shareId))
      .orderBy(desc(shareAccessLogs.accessedAt));
  }
}

export const storage = new DatabaseStorage();