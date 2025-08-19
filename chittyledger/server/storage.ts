import { 
  type User, 
  type InsertUser, 
  type Case, 
  type InsertCase,
  type Evidence, 
  type InsertEvidence,
  type AtomicFact,
  type InsertFact,
  type ChainOfCustody,
  type Contradiction,
  type EvidenceTier,
  type EvidenceStatus
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Cases
  getCase(id: string): Promise<Case | undefined>;
  getCases(): Promise<Case[]>;
  createCase(caseData: InsertCase): Promise<Case>;
  updateCase(id: string, updates: Partial<Case>): Promise<Case | undefined>;

  // Evidence
  getEvidence(id: string): Promise<Evidence | undefined>;
  getEvidenceByCase(caseId: string): Promise<Evidence[]>;
  getAllEvidence(): Promise<Evidence[]>;
  createEvidence(evidence: InsertEvidence): Promise<Evidence>;
  updateEvidence(id: string, updates: Partial<Evidence>): Promise<Evidence | undefined>;

  // Atomic Facts
  getFactsByEvidence(evidenceId: string): Promise<AtomicFact[]>;
  createFact(fact: InsertFact): Promise<AtomicFact>;

  // Chain of Custody
  getChainOfCustody(evidenceId: string): Promise<ChainOfCustody[]>;
  addChainOfCustodyEntry(entry: Omit<ChainOfCustody, 'id'>): Promise<ChainOfCustody>;

  // Contradictions
  getContradictions(): Promise<Contradiction[]>;
  getActiveContradictions(): Promise<Contradiction[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private cases: Map<string, Case> = new Map();
  private evidence: Map<string, Evidence> = new Map();
  private atomicFacts: Map<string, AtomicFact> = new Map();
  private chainOfCustody: Map<string, ChainOfCustody> = new Map();
  private contradictions: Map<string, Contradiction> = new Map();

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    // Create sample users
    const attorney1: User = {
      id: randomUUID(),
      username: "j.mitchell",
      email: "j.mitchell@lawfirm.com",
      role: "attorney",
      createdAt: new Date("2024-01-01"),
    };

    const clerk1: User = {
      id: randomUUID(),
      username: "court.clerk",
      email: "clerk@courthouse.gov",
      role: "clerk",
      createdAt: new Date("2024-01-01"),
    };

    this.users.set(attorney1.id, attorney1);
    this.users.set(clerk1.id, clerk1);

    // Create sample case
    const case1: Case = {
      id: randomUUID(),
      caseNumber: "ILLINOIS-COOK-2024-CIVIL-4721",
      title: "Mitchell v. Sterling Industries",
      description: "Civil litigation regarding contract disputes and financial discrepancies",
      caseType: "CIVIL",
      status: "active",
      parties: {
        plaintiff: "J. Mitchell",
        defendant: "Sterling Industries LLC"
      },
      nextHearing: new Date("2024-01-25T14:00:00Z"),
      courtroom: "3B",
      judge: "Judge Martinez",
      attorneyId: attorney1.id,
      createdAt: new Date("2024-01-15"),
      updatedAt: new Date("2024-01-15"),
    };

    this.cases.set(case1.id, case1);

    // Create sample evidence
    const evidence1: Evidence = {
      id: randomUUID(),
      artifactId: "ART-000847",
      filename: "Financial_Statement.pdf",
      fileType: "application/pdf",
      fileSize: "2.4 MB",
      description: "Quarterly financial statement showing payment discrepancies",
      evidenceTier: "FINANCIAL_INSTITUTION",
      trustScore: "0.94",
      originalTrustScore: "0.94",
      status: "MINTED",
      blockNumber: "2847291",
      hashValue: "0x4a7b8c9d2e1f3a5b6c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
      mintedAt: new Date("2024-01-15T11:47:00Z"),
      trustDegradationRate: "0.0000",
      lastTrustUpdate: new Date("2024-01-15T11:47:00Z"),
      corroborationCount: 3,
      conflictCount: 0,
      mintingEligible: true,
      mintingScore: "0.85",
      chittytrustScore: "0.92",
      caseId: case1.id,
      uploadedBy: attorney1.id,
      uploadedAt: new Date("2024-01-15T09:32:00Z"),
      verifiedAt: new Date("2024-01-15T11:47:00Z"),
    };

    const evidence2: Evidence = {
      id: randomUUID(),
      artifactId: "ART-000848",
      filename: "Property_Photo.jpg",
      fileType: "image/jpeg",
      fileSize: "5.1 MB",
      description: "Photographic evidence of property condition",
      evidenceTier: "INDEPENDENT_THIRD_PARTY",
      trustScore: "0.65",
      originalTrustScore: "0.80",
      status: "VERIFIED",
      blockNumber: null,
      hashValue: null,
      mintedAt: null,
      trustDegradationRate: "0.0001",
      lastTrustUpdate: new Date("2024-01-15T10:15:00Z"),
      corroborationCount: 1,
      conflictCount: 0,
      mintingEligible: false,
      mintingScore: "0.45",
      chittytrustScore: "0.78",
      caseId: case1.id,
      uploadedBy: attorney1.id,
      uploadedAt: new Date("2024-01-15T10:15:00Z"),
      verifiedAt: new Date("2024-01-15T14:30:00Z"),
    };

    const evidence3: Evidence = {
      id: randomUUID(),
      artifactId: "ART-000849",
      filename: "Witness_Statement.pdf",
      fileType: "application/pdf",
      fileSize: "1.2 MB",
      description: "Witness testimony regarding the incident",
      evidenceTier: "UNCORROBORATED_PERSON",
      trustScore: "0.05",
      originalTrustScore: "0.20",
      status: "REQUIRES_CORROBORATION",
      blockNumber: null,
      hashValue: null,
      mintedAt: null,
      trustDegradationRate: "0.0002",
      lastTrustUpdate: new Date("2024-01-15T16:22:00Z"),
      corroborationCount: 0,
      conflictCount: 1,
      mintingEligible: false,
      mintingScore: "0.15",
      chittytrustScore: "0.22",
      caseId: case1.id,
      uploadedBy: attorney1.id,
      uploadedAt: new Date("2024-01-15T16:22:00Z"),
      verifiedAt: new Date("2024-01-15T18:45:00Z"),
    };

    this.evidence.set(evidence1.id, evidence1);
    this.evidence.set(evidence2.id, evidence2);
    this.evidence.set(evidence3.id, evidence3);

    // Create sample atomic fact
    const fact1: AtomicFact = {
      id: randomUUID(),
      factId: "FACT-0034",
      content: "Payment of $15,000 received on January 12, 2024",
      factType: "AMOUNT",
      confidenceScore: "0.89",
      evidenceId: evidence1.id,
      extractedAt: new Date("2024-01-15T12:00:00Z"),
      verifiedAt: new Date("2024-01-15T12:15:00Z"),
    };

    this.atomicFacts.set(fact1.id, fact1);

    // Create sample contradiction
    const contradiction1: Contradiction = {
      id: randomUUID(),
      conflictId: "CONFLICT-0034",
      description: "Temporal impossibility detected between payment receipt date and bank statement entry",
      contradictionType: "TEMPORAL",
      severity: "high",
      status: "active",
      evidenceId1: evidence1.id,
      evidenceId2: evidence2.id,
      detectedAt: new Date("2024-01-15T15:30:00Z"),
      resolvedAt: null,
    };

    this.contradictions.set(contradiction1.id, contradiction1);

    // Create chain of custody entries
    const custody1: ChainOfCustody = {
      id: randomUUID(),
      evidenceId: evidence1.id,
      action: "UPLOADED",
      performedBy: attorney1.id,
      timestamp: new Date("2024-01-15T09:32:00Z"),
      location: "Law Office",
      notes: "Initial upload by attorney",
      hashBefore: null,
      hashAfter: "0x4a7b8c9d2e1f3a5b6c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    };

    const custody2: ChainOfCustody = {
      id: randomUUID(),
      evidenceId: evidence1.id,
      action: "VERIFIED",
      performedBy: clerk1.id,
      timestamp: new Date("2024-01-15T11:47:00Z"),
      location: "Courthouse",
      notes: "Verified by court clerk",
      hashBefore: "0x4a7b8c9d2e1f3a5b6c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
      hashAfter: "0x4a7b8c9d2e1f3a5b6c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    };

    this.chainOfCustody.set(custody1.id, custody1);
    this.chainOfCustody.set(custody2.id, custody2);
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: randomUUID(),
      role: insertUser.role || 'attorney',
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  // Case methods
  async getCase(id: string): Promise<Case | undefined> {
    return this.cases.get(id);
  }

  async getCases(): Promise<Case[]> {
    return Array.from(this.cases.values());
  }

  async createCase(caseData: InsertCase): Promise<Case> {
    const case_: Case = {
      ...caseData,
      description: caseData.description || null,
      parties: caseData.parties || null,
      nextHearing: caseData.nextHearing || null,
      courtroom: caseData.courtroom || null,
      judge: caseData.judge || null,
      attorneyId: caseData.attorneyId || null,
      id: randomUUID(),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.cases.set(case_.id, case_);
    return case_;
  }

  async updateCase(id: string, updates: Partial<Case>): Promise<Case | undefined> {
    const case_ = this.cases.get(id);
    if (!case_) return undefined;
    
    const updatedCase = { ...case_, ...updates, updatedAt: new Date() };
    this.cases.set(id, updatedCase);
    return updatedCase;
  }

  // Evidence methods
  async getEvidence(id: string): Promise<Evidence | undefined> {
    return this.evidence.get(id);
  }

  async getEvidenceByCase(caseId: string): Promise<Evidence[]> {
    return Array.from(this.evidence.values()).filter(ev => ev.caseId === caseId);
  }

  async getAllEvidence(): Promise<Evidence[]> {
    return Array.from(this.evidence.values());
  }

  async createEvidence(evidenceData: InsertEvidence): Promise<Evidence> {
    const artifactCounter = this.evidence.size + 1;
    const originalTrust = this.calculateTrustScore(evidenceData.evidenceTier as EvidenceTier);
    const evidence: Evidence = {
      ...evidenceData,
      description: evidenceData.description || null,
      fileSize: evidenceData.fileSize || null,
      caseId: evidenceData.caseId || null,
      id: randomUUID(),
      artifactId: `ART-${artifactCounter.toString().padStart(6, '0')}`,
      trustScore: originalTrust,
      originalTrustScore: originalTrust,
      status: "PENDING",
      blockNumber: null,
      hashValue: null,
      mintedAt: null,
      trustDegradationRate: "0.0001", // Default degradation rate
      lastTrustUpdate: new Date(),
      corroborationCount: 0,
      conflictCount: 0,
      mintingEligible: false,
      mintingScore: "0.00",
      chittytrustScore: "0.00",
      uploadedBy: evidenceData.caseId || null, // TODO: get from auth context
      uploadedAt: new Date(),
      verifiedAt: null,
    };
    this.evidence.set(evidence.id, evidence);
    return evidence;
  }

  async updateEvidence(id: string, updates: Partial<Evidence>): Promise<Evidence | undefined> {
    const evidence = this.evidence.get(id);
    if (!evidence) return undefined;
    
    const updatedEvidence = { ...evidence, ...updates };
    this.evidence.set(id, updatedEvidence);
    return updatedEvidence;
  }

  // Calculate blockchain minting eligibility using 6D Trust evaluation
  async calculateMintingEligibility(evidenceId: string): Promise<{ eligible: boolean; score: string; reasons: string[]; sixDScores: any }> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) return { eligible: false, score: "0.00", reasons: ["Evidence not found"], sixDScores: {} };

    const reasons: string[] = [];
    
    // 6D Trust Revolution Framework for Blockchain Eligibility
    const sixDScores = {
      source: 0,
      time: 0,
      chain: 0,
      network: 0,
      outcomes: 0,
      justice: 0
    };

    // 1. SOURCE - Evidence tier reliability (max 20 points)
    const tierScores: Record<string, number> = {
      'SELF_AUTHENTICATING': 20,
      'GOVERNMENT': 18,
      'FINANCIAL_INSTITUTION': 16,
      'INDEPENDENT_THIRD_PARTY': 12,
      'BUSINESS_RECORDS': 8,
      'FIRST_PARTY_ADVERSE': 4,
      'FIRST_PARTY_FRIENDLY': 2,
      'UNCORROBORATED_PERSON': 0
    };
    sixDScores.source = tierScores[evidence.evidenceTier] || 0;
    if (sixDScores.source >= 16) {
      reasons.push(`✓ Source: High-tier evidence (${evidence.evidenceTier})`);
    } else if (sixDScores.source >= 8) {
      reasons.push(`✓ Source: Acceptable tier (${evidence.evidenceTier})`);
    } else {
      reasons.push(`✗ Source: Low-tier evidence (${evidence.evidenceTier})`);
    }

    // 2. TIME - Recency and relevance (max 15 points)
    const ageHours = (new Date().getTime() - evidence.uploadedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) {
      sixDScores.time = 15;
      reasons.push("✓ Time: Very recent evidence (<24h)");
    } else if (ageHours < 168) { // 1 week
      sixDScores.time = 12;
      reasons.push("✓ Time: Recent evidence (<1 week)");
    } else if (ageHours < 720) { // 30 days
      sixDScores.time = 8;
      reasons.push("✓ Time: Moderately recent (<30 days)");
    } else {
      sixDScores.time = 0;
      reasons.push("✗ Time: Evidence is old (>30 days)");
    }

    // 3. CHAIN - Chain of custody integrity (max 15 points)
    const custodyRecords = Array.from(this.chainOfCustody.values())
      .filter(c => c.evidenceId === evidenceId);
    if (custodyRecords.length >= 3) {
      sixDScores.chain = 15;
      reasons.push("✓ Chain: Complete custody tracking");
    } else if (custodyRecords.length >= 1) {
      sixDScores.chain = 10;
      reasons.push("✓ Chain: Basic custody tracking");
    } else {
      sixDScores.chain = 0;
      reasons.push("✗ Chain: No custody tracking");
    }

    // 4. NETWORK - Corroboration from multiple sources (max 20 points)
    if (evidence.corroborationCount >= 3) {
      sixDScores.network = 20;
      reasons.push(`✓ Network: Strong corroboration (${evidence.corroborationCount} sources)`);
    } else if (evidence.corroborationCount >= 2) {
      sixDScores.network = 15;
      reasons.push(`✓ Network: Good corroboration (${evidence.corroborationCount} sources)`);
    } else if (evidence.corroborationCount >= 1) {
      sixDScores.network = 8;
      reasons.push(`✓ Network: Some corroboration (${evidence.corroborationCount} sources)`);
    } else {
      sixDScores.network = 0;
      reasons.push("✗ Network: No corroboration");
    }

    // 5. OUTCOMES - Verification status (max 15 points)
    if (evidence.status === 'VERIFIED' || evidence.status === 'MINTED') {
      sixDScores.outcomes = 15;
      reasons.push("✓ Outcomes: Evidence verified");
    } else if (evidence.status === 'REQUIRES_CORROBORATION') {
      sixDScores.outcomes = 5;
      reasons.push("✗ Outcomes: Requires corroboration");
    } else {
      sixDScores.outcomes = 0;
      reasons.push("✗ Outcomes: Not verified");
    }

    // 6. JUSTICE - Conflict resolution (max 15 points)
    if (evidence.conflictCount === 0) {
      sixDScores.justice = 15;
      reasons.push("✓ Justice: No conflicts detected");
    } else if (evidence.conflictCount === 1) {
      sixDScores.justice = 8;
      reasons.push("✗ Justice: Minor conflicts present");
    } else {
      sixDScores.justice = 0;
      reasons.push(`✗ Justice: Multiple conflicts (${evidence.conflictCount})`);
    }

    const totalScore = Object.values(sixDScores).reduce((sum, score) => sum + score, 0);
    const finalScore = totalScore / 100; // Convert to 0-1 scale
    const eligible = finalScore >= 0.70; // Need 70% across all 6D metrics

    return {
      eligible,
      score: finalScore.toFixed(2),
      reasons,
      sixDScores
    };
  }

  // Update minting eligibility for evidence
  async updateMintingEligibility(evidenceId: string): Promise<Evidence | undefined> {
    const eligibility = await this.calculateMintingEligibility(evidenceId);
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) return undefined;

    const updatedEvidence = {
      ...evidence,
      mintingEligible: eligibility.eligible,
      mintingScore: eligibility.score,
    };

    this.evidence.set(evidenceId, updatedEvidence);
    return updatedEvidence;
  }

  // Calculate ChittyTrust score - separate from blockchain minting criteria
  async calculateChittyTrustScore(evidenceId: string): Promise<string> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) return "0.00";

    let score = parseFloat(evidence.originalTrustScore);

    // ChittyTrust evaluates based on 6D Trust Revolution metrics
    // Source reliability (already in original trust score)
    
    // Time factor - how current/relevant is the evidence
    const ageHours = (new Date().getTime() - evidence.uploadedAt.getTime()) / (1000 * 60 * 60);
    if (ageHours < 1) score += 0.05; // Very fresh
    else if (ageHours > 720) score -= 0.10; // Over 30 days old

    // Chain of custody integrity
    const custodyRecords = Array.from(this.chainOfCustody.values())
      .filter(c => c.evidenceId === evidenceId);
    if (custodyRecords.length > 0) {
      score += 0.03; // Proper chain of custody tracking
    }

    // Network corroboration
    score += evidence.corroborationCount * 0.02;

    // Conflict resolution
    score -= evidence.conflictCount * 0.08;

    // Justice/fairness - evidence tier quality
    const tierMultipliers: Record<string, number> = {
      'SELF_AUTHENTICATING': 1.1,
      'GOVERNMENT': 1.08,
      'FINANCIAL_INSTITUTION': 1.05,
      'INDEPENDENT_THIRD_PARTY': 1.02,
      'BUSINESS_RECORDS': 1.0,
      'FIRST_PARTY_ADVERSE': 0.95,
      'FIRST_PARTY_FRIENDLY': 0.90,
      'UNCORROBORATED_PERSON': 0.85
    };
    
    score *= (tierMultipliers[evidence.evidenceTier] || 1.0);

    return Math.max(0, Math.min(1, score)).toFixed(2);
  }

  // Update ChittyTrust score for evidence
  async updateChittyTrustScore(evidenceId: string): Promise<Evidence | undefined> {
    const chittyScore = await this.calculateChittyTrustScore(evidenceId);
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) return undefined;

    const updatedEvidence = {
      ...evidence,
      chittytrustScore: chittyScore,
    };

    this.evidence.set(evidenceId, updatedEvidence);
    return updatedEvidence;
  }

  // Atomic Facts methods
  async getFactsByEvidence(evidenceId: string): Promise<AtomicFact[]> {
    return Array.from(this.atomicFacts.values()).filter(fact => fact.evidenceId === evidenceId);
  }

  async createFact(factData: InsertFact): Promise<AtomicFact> {
    const factCounter = this.atomicFacts.size + 1;
    const fact: AtomicFact = {
      ...factData,
      evidenceId: factData.evidenceId || null,
      id: randomUUID(),
      factId: `FACT-${factCounter.toString().padStart(4, '0')}`,
      extractedAt: new Date(),
      verifiedAt: null,
    };
    this.atomicFacts.set(fact.id, fact);
    return fact;
  }

  // Chain of Custody methods
  async getChainOfCustody(evidenceId: string): Promise<ChainOfCustody[]> {
    return Array.from(this.chainOfCustody.values())
      .filter(entry => entry.evidenceId === evidenceId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async addChainOfCustodyEntry(entryData: Omit<ChainOfCustody, 'id'>): Promise<ChainOfCustody> {
    const entry: ChainOfCustody = {
      ...entryData,
      id: randomUUID(),
    };
    this.chainOfCustody.set(entry.id, entry);
    return entry;
  }

  // Contradictions methods
  async getContradictions(): Promise<Contradiction[]> {
    return Array.from(this.contradictions.values());
  }

  async getActiveContradictions(): Promise<Contradiction[]> {
    return Array.from(this.contradictions.values()).filter(c => c.status === 'active');
  }

  private calculateTrustScore(tier: EvidenceTier): string {
    const scores: Record<EvidenceTier, number> = {
      'SELF_AUTHENTICATING': 0.99,
      'GOVERNMENT': 0.95,
      'FINANCIAL_INSTITUTION': 0.90,
      'INDEPENDENT_THIRD_PARTY': 0.80,
      'BUSINESS_RECORDS': 0.70,
      'FIRST_PARTY_ADVERSE': 0.60,
      'FIRST_PARTY_FRIENDLY': 0.40,
      'UNCORROBORATED_PERSON': 0.20,
    };
    return scores[tier].toFixed(2);
  }

  // Trust degradation logic - everything degrades except minted evidence
  async calculateCurrentTrustScore(evidenceId: string): Promise<string> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) return "0.00";

    // If evidence is minted, trust is locked at verification moment
    if (evidence.status === "MINTED" && evidence.mintedAt) {
      return evidence.trustScore;
    }

    // Calculate time-based degradation for non-minted evidence
    const now = new Date();
    const lastUpdate = evidence.lastTrustUpdate;
    const hoursElapsed = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    const originalTrust = parseFloat(evidence.originalTrustScore);
    const degradationRate = parseFloat(evidence.trustDegradationRate || "0.0001");
    
    // Trust degrades over time if not minted
    const currentTrust = Math.max(0, originalTrust - (degradationRate * hoursElapsed));
    
    return currentTrust.toFixed(2);
  }

  // Mint evidence - locks trust score at current moment
  async mintEvidence(evidenceId: string, blockNumber: string, hashValue: string): Promise<Evidence | undefined> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) return undefined;

    const currentTrust = await this.calculateCurrentTrustScore(evidenceId);
    
    const updatedEvidence = {
      ...evidence,
      status: "MINTED" as const,
      blockNumber,
      hashValue,
      mintedAt: new Date(),
      trustScore: currentTrust, // Lock trust at minting moment
      trustDegradationRate: "0.0000", // No more degradation after minting
      lastTrustUpdate: new Date(),
      mintingEligible: true, // Already eligible if we're minting
      mintingScore: "1.00", // Perfect score when minted
    };
    
    this.evidence.set(evidenceId, updatedEvidence);
    
    // Add chain of custody entry
    await this.addChainOfCustodyEntry({
      evidenceId,
      action: "MINTED",
      performedBy: evidence.uploadedBy,
      timestamp: new Date(),
      location: "Blockchain",
      notes: `Minted to blockchain at block ${blockNumber}`,
      hashBefore: evidence.hashValue,
      hashAfter: hashValue,
    });
    
    return updatedEvidence;
  }

  // Verify evidence - trust starts degrading from this moment if not minted
  async verifyEvidence(evidenceId: string): Promise<Evidence | undefined> {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) return undefined;

    const updatedEvidence = {
      ...evidence,
      status: "VERIFIED" as const,
      verifiedAt: new Date(),
      lastTrustUpdate: new Date(), // Start degradation timer
    };
    
    this.evidence.set(evidenceId, updatedEvidence);
    
    // Add chain of custody entry
    await this.addChainOfCustodyEntry({
      evidenceId,
      action: "VERIFIED",
      performedBy: evidence.uploadedBy,
      timestamp: new Date(),
      location: "Legal Platform",
      notes: "Evidence verified - trust can begin degrading",
      hashBefore: evidence.hashValue,
      hashAfter: evidence.hashValue,
    });
    
    return updatedEvidence;
  }
}

export const storage = new MemStorage();
