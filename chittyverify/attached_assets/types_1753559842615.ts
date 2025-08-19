/**
 * ChittyChain Evidence Ledger - Type Definitions
 * Court-ready evidence management with blockchain backing
 */

// ===== MASTER EVIDENCE DATABASE =====
export interface MasterEvidence {
  artifactId: string; // "ART-" + unique ID
  caseBinding: string; // Relation to Cases
  userBinding: string; // Relation to Users
  evidenceType: EvidenceType;
  evidenceTier: EvidenceTier;
  evidenceWeight: number; // 0.0 to 1.0
  contentHash: string; // SHA-256
  originalFilename: string;
  uploadDate: Date;
  sourceVerificationStatus: VerificationStatus;
  authenticationMethod: AuthenticationMethod;
  chainOfCustody: string[]; // Array of custody log IDs
  extractedFacts: string[]; // Array of fact IDs
  supportingClaims: string[];
  contradictingClaims: string[];
  mintingStatus: MintingStatus;
  blockNumber?: string;
  auditNotes: string;
  // Additional metadata
  fileSize?: number;
  mimeType?: string;
  ipfsHash?: string;
  encryptionStatus?: boolean;
  redactionLevel?: RedactionLevel;
}

export enum EvidenceType {
  DOCUMENT = "Document",
  IMAGE = "Image",
  COMMUNICATION = "Communication",
  FINANCIAL_RECORD = "Financial Record",
  LEGAL_FILING = "Legal Filing",
  PHYSICAL_EVIDENCE = "Physical Evidence"
}

export enum EvidenceTier {
  SELF_AUTHENTICATING = "SELF_AUTHENTICATING",
  GOVERNMENT = "GOVERNMENT",
  FINANCIAL_INSTITUTION = "FINANCIAL_INSTITUTION",
  INDEPENDENT_THIRD_PARTY = "INDEPENDENT_THIRD_PARTY",
  BUSINESS_RECORDS = "BUSINESS_RECORDS",
  FIRST_PARTY_ADVERSE = "FIRST_PARTY_ADVERSE",
  FIRST_PARTY_FRIENDLY = "FIRST_PARTY_FRIENDLY",
  UNCORROBORATED_PERSON = "UNCORROBORATED_PERSON"
}

export enum VerificationStatus {
  VERIFIED = "Verified",
  PENDING = "Pending",
  FAILED = "Failed"
}

export enum AuthenticationMethod {
  SEAL = "Seal",
  STAMP = "Stamp",
  CERTIFICATION = "Certification",
  NOTARIZATION = "Notarization",
  DIGITAL_SIGNATURE = "Digital Signature",
  METADATA = "Metadata",
  WITNESS = "Witness",
  NONE = "None"
}

export enum MintingStatus {
  MINTED = "Minted",
  PENDING = "Pending",
  REJECTED = "Rejected",
  REQUIRES_CORROBORATION = "Requires Corroboration"
}

export enum RedactionLevel {
  NONE = "None",
  PARTIAL = "Partial",
  FULL = "Full"
}

// ===== ATOMIC FACTS DATABASE =====
export interface AtomicFact {
  factId: string; // "FACT-" + unique ID
  parentDocument: string; // Relation to Master Evidence
  factText: string;
  factType: FactType;
  locationInDocument: string; // "p.12 ¶3 l.4"
  classificationLevel: ClassificationLevel;
  weight: number; // 0.0 to 1.0
  credibilityFactors: CredibilityFactor[];
  relatedFacts: string[]; // Self-relation
  supportsCaseTheory: string[];
  contradictsCaseTheory: string[];
  chittyChainStatus: MintingStatus;
  verificationDate?: Date;
  verificationMethod?: string;
  // AI extraction metadata
  extractionMethod?: ExtractionMethod;
  extractionConfidence?: number;
  extractionTimestamp?: Date;
}

export enum FactType {
  DATE = "DATE",
  AMOUNT = "AMOUNT",
  ADMISSION = "ADMISSION",
  IDENTITY = "IDENTITY",
  LOCATION = "LOCATION",
  RELATIONSHIP = "RELATIONSHIP",
  ACTION = "ACTION",
  STATUS = "STATUS"
}

export enum ClassificationLevel {
  FACT = "FACT",
  SUPPORTED_CLAIM = "SUPPORTED_CLAIM",
  ASSERTION = "ASSERTION",
  ALLEGATION = "ALLEGATION",
  CONTRADICTION = "CONTRADICTION"
}

export enum CredibilityFactor {
  AGAINST_INTEREST = "Against Interest",
  CONTEMPORANEOUS = "Contemporaneous",
  BUSINESS_DUTY = "Business Duty",
  OFFICIAL_DUTY = "Official Duty"
}

export enum ExtractionMethod {
  MANUAL = "Manual",
  GPT4 = "GPT-4",
  CLAUDE = "Claude",
  HYBRID = "Hybrid"
}

// ===== CASES DATABASE =====
export interface Case {
  caseId: string; // Jurisdiction + "-" + Year + "-" + Type + "-" + Number
  jurisdiction: Jurisdiction;
  caseNumber: string;
  caseType: CaseType;
  filingDate: Date;
  parties: string[]; // Array of user IDs
  judgeAssigned?: string;
  caseStatus: CaseStatus;
  totalEvidenceItems: number; // Rollup
  mintedFactsCount: number; // Rollup
  keyDates: KeyDate[];
  // Additional case metadata
  courtRoom?: string;
  nextHearingDate?: Date;
  estimatedValue?: number;
  priority?: CasePriority;
}

export enum Jurisdiction {
  ILLINOIS_COOK = "ILLINOIS-COOK",
  ILLINOIS_DUPAGE = "ILLINOIS-DUPAGE",
  // Add more as needed
}

export enum CaseType {
  DIVORCE = "DIVORCE",
  CUSTODY = "CUSTODY",
  CIVIL = "CIVIL",
  CRIMINAL = "CRIMINAL",
  PROBATE = "PROBATE"
}

export enum CaseStatus {
  ACTIVE = "Active",
  STAYED = "Stayed",
  CLOSED = "Closed",
  APPEAL = "Appeal"
}

export enum CasePriority {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
  URGENT = "Urgent"
}

export interface KeyDate {
  date: Date;
  description: string;
  type: "deadline" | "hearing" | "filing" | "milestone";
  completed: boolean;
}

// ===== USERS DATABASE =====
export interface User {
  registrationNumber: string; // "REG" + 8 digits
  userType: UserType;
  fullName: string;
  barNumber?: string; // If attorney
  email: string;
  phone?: string;
  verifiedStatus: boolean;
  cases: string[]; // Array of case IDs
  submittedEvidence: string[]; // Array of evidence IDs
  trustScore: number; // 0-100
  lastActivity?: Date;
  twoFactorEnabled: boolean;
  // Additional security metadata
  loginAttempts?: number;
  accountLocked?: boolean;
  passwordLastChanged?: Date;
}

export enum UserType {
  PARTY_PETITIONER = "PARTY_PETITIONER",
  PARTY_RESPONDENT = "PARTY_RESPONDENT",
  ATTORNEY_PETITIONER = "ATTORNEY_PETITIONER",
  ATTORNEY_RESPONDENT = "ATTORNEY_RESPONDENT",
  COURT_OFFICER = "COURT_OFFICER",
  EXPERT_WITNESS = "EXPERT_WITNESS"
}

// ===== CHAIN OF CUSTODY LOG =====
export interface ChainOfCustodyLog {
  logId: number; // Auto-number
  evidence: string; // Relation to Master Evidence
  custodian: string; // Relation to Users
  dateReceived: Date;
  dateTransferred?: Date;
  transferMethod: TransferMethod;
  integrityCheckMethod: IntegrityCheckMethod;
  integrityVerified: boolean;
  notes?: string;
  // Additional custody metadata
  location?: string;
  temperature?: string; // For physical evidence
  witnessSignature?: string;
  digitalSignature?: string;
}

export enum TransferMethod {
  SEALED_ENVELOPE = "SEALED_ENVELOPE",
  CERTIFIED_MAIL = "CERTIFIED_MAIL",
  SECURE_DIGITAL = "SECURE_DIGITAL",
  COURT_FILING = "COURT_FILING",
  NOTARY_TRANSFER = "NOTARY_TRANSFER",
  DIRECT_HANDOFF = "DIRECT_HANDOFF"
}

export enum IntegrityCheckMethod {
  HASH_VERIFICATION = "HASH_VERIFICATION",
  SEAL_INTACT = "SEAL_INTACT",
  WITNESS_CONFIRMATION = "WITNESS_CONFIRMATION",
  METADATA_MATCH = "METADATA_MATCH"
}

// ===== CONTRADICTION TRACKING =====
export interface ContradictionTracking {
  contradictionId: string; // "CONFLICT-" + unique ID
  conflictingFacts: string[]; // Array of fact IDs
  conflictType: ConflictType;
  winningFact?: string; // Fact ID
  resolutionMethod?: ResolutionMethod;
  resolutionDate?: Date;
  impactOnCase: string;
  // Additional conflict metadata
  severity?: ConflictSeverity;
  reviewerNotes?: string;
  appealable?: boolean;
}

export enum ConflictType {
  DIRECT_CONTRADICTION = "DIRECT_CONTRADICTION",
  TEMPORAL_IMPOSSIBILITY = "TEMPORAL_IMPOSSIBILITY",
  LOGICAL_INCONSISTENCY = "LOGICAL_INCONSISTENCY",
  PARTIAL_CONFLICT = "PARTIAL_CONFLICT"
}

export enum ResolutionMethod {
  HIERARCHY_RULE = "HIERARCHY_RULE",
  TEMPORAL_PRIORITY = "TEMPORAL_PRIORITY",
  AUTHENTICATION_SUPERIORITY = "AUTHENTICATION_SUPERIORITY",
  ADVERSE_ADMISSION = "ADVERSE_ADMISSION",
  CONTEMPORANEOUS_RECORD = "CONTEMPORANEOUS_RECORD"
}

export enum ConflictSeverity {
  MINOR = "Minor",
  MODERATE = "Moderate",
  MAJOR = "Major",
  CRITICAL = "Critical"
}

// ===== AUDIT TRAIL =====
export interface AuditTrail {
  actionId: number; // Auto-number
  timestamp: Date;
  user: string; // Relation to Users
  actionType: ActionType;
  targetArtifact?: string; // Relation to Master Evidence
  ipAddress: string;
  sessionId: string;
  successFailure: "Success" | "Failure";
  details: string;
  // Additional audit metadata
  userAgent?: string;
  duration?: number; // milliseconds
  errorCode?: string;
  dataChanged?: Record<string, any>;
}

export enum ActionType {
  UPLOAD = "Upload",
  VERIFY = "Verify",
  MINT = "Mint",
  REJECT = "Reject",
  QUERY = "Query",
  MODIFY = "Modify",
  ACCESS = "Access",
  DELETE = "Delete",
  EXPORT = "Export"
}

// ===== UTILITY TYPES =====
export interface DatabaseView {
  name: string;
  description: string;
  filters: Record<string, any>;
  sorting: Array<{ field: string; direction: "asc" | "desc" }>;
  grouping?: string;
}

export interface Formula {
  name: string;
  expression: string;
  dependsOn: string[];
  returnType: "number" | "string" | "boolean" | "date";
}

export interface Automation {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  enabled: boolean;
}

export interface AutomationTrigger {
  type: "field_change" | "new_record" | "scheduled" | "webhook";
  conditions: Record<string, any>;
}

export interface AutomationAction {
  type: "notify" | "update_field" | "mint_to_blockchain" | "send_email";
  parameters: Record<string, any>;
}