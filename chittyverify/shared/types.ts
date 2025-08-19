/**
 * ChittyChain Evidence Ledger - Shared Types
 * Common types used across the application
 */

export enum EvidenceTier {
  DOCUMENTARY_EVIDENCE = 'DOCUMENTARY_EVIDENCE',
  EXPERT_TESTIMONY = 'EXPERT_TESTIMONY', 
  CORROBORATED_TESTIMONY = 'CORROBORATED_TESTIMONY',
  UNCORROBORATED_PERSON = 'UNCORROBORATED_PERSON',
  IMPEACHABLE = 'IMPEACHABLE',
  MACHINE_GENERATED = 'MACHINE_GENERATED'
}

export enum MintingStatus {
  PENDING = 'PENDING',
  VALIDATED = 'VALIDATED',
  MINTED = 'MINTED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED'
}

export enum UserType {
  COURT_OFFICER = 'COURT_OFFICER',
  ATTORNEY_PETITIONER = 'ATTORNEY_PETITIONER',
  ATTORNEY_RESPONDENT = 'ATTORNEY_RESPONDENT',
  EXPERT_WITNESS = 'EXPERT_WITNESS',
  PRO_SE_LITIGANT = 'PRO_SE_LITIGANT',
  THIRD_PARTY = 'THIRD_PARTY'
}

export enum CredibilityFactor {
  CONTEMPORANEOUS = 'CONTEMPORANEOUS',
  BUSINESS_DUTY = 'BUSINESS_DUTY',
  EXPERT_CERTIFICATION = 'EXPERT_CERTIFICATION',
  MULTIPLE_SOURCES = 'MULTIPLE_SOURCES',
  CHAIN_OF_CUSTODY = 'CHAIN_OF_CUSTODY',
  DIGITAL_SIGNATURE = 'DIGITAL_SIGNATURE'
}

export enum FactType {
  IDENTITY = 'IDENTITY',
  DATE = 'DATE',
  AMOUNT = 'AMOUNT',
  LOCATION = 'LOCATION',
  ACTION = 'ACTION',
  CONDITION = 'CONDITION',
  RELATIONSHIP = 'RELATIONSHIP',
  COMMUNICATION = 'COMMUNICATION'
}

export enum ClassificationLevel {
  FACT = 'FACT',
  INFERENCE = 'INFERENCE',
  OPINION = 'OPINION',
  CONCLUSION = 'CONCLUSION'
}

export enum Jurisdiction {
  COOK_COUNTY = 'COOK_COUNTY',
  ILLINOIS_STATE = 'ILLINOIS_STATE',
  FEDERAL_NORTHERN_DISTRICT_IL = 'FEDERAL_NORTHERN_DISTRICT_IL'
}

export enum CaseType {
  CIVIL = 'CIVIL',
  CRIMINAL = 'CRIMINAL',
  FAMILY = 'FAMILY',
  PROBATE = 'PROBATE',
  REAL_ESTATE = 'REAL_ESTATE',
  CORPORATE = 'CORPORATE'
}

export interface User {
  id: string;
  username: string;
  email: string;
  trustScore: number;
  type: UserType;
  createdAt: string;
}

export interface Case {
  id: string;
  name: string;
  description?: string;
  userId: string;
  status: string;
  trustScore: number;
  totalEvidence: number;
  verifiedEvidence: number;
  pendingEvidence: number;
  mintedEvidence: number;
  jurisdiction?: Jurisdiction;
  caseType?: CaseType;
  createdAt: string;
  updatedAt: string;
}

export interface Evidence {
  id: string;
  caseId: string;
  artifactId: string;
  title: string;
  description?: string;
  type: string;
  subtype?: string;
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  status: string;
  trustScore: number;
  blockchain?: any;
  facts?: any;
  analysis?: any;
  metadata?: any;
  uploadedAt: string;
  verifiedAt?: string;
  mintedAt?: string;
}

export interface AtomicFact {
  factId: string;
  parentDocument: string;
  factText: string;
  factType: FactType;
  locationInDocument: string;
  classificationLevel: ClassificationLevel;
  weight: number;
  credibilityFactors: CredibilityFactor[];
  relatedFacts: string[];
  supportsCaseTheory: string[];
  contradictsCaseTheory: string[];
  chittyChainStatus: MintingStatus;
}

export interface PropertyTaxRecord {
  id: string;
  evidenceId: string;
  pin: string;
  address: string;
  year: number;
  landAssessment?: number;
  buildingAssessment?: number;
  totalAssessment?: number;
  estimatedTax?: number;
  propertyClass?: string;
  squareFeet?: number;
  yearBuilt?: number;
  assessorData?: any;
  treasurerData?: any;
  scrapedAt: string;
}

export interface PaymentHistory {
  id: string;
  propertyTaxRecordId: string;
  paymentDate: string;
  amount: number;
  method?: string;
  confirmationNumber?: string;
  installmentNumber?: number;
  status: string;
}

export interface AnalysisResult {
  id: string;
  evidenceId: string;
  type: string;
  confidence?: number;
  results: any;
  recommendations?: any;
  metadata?: any;
  createdAt: string;
}

export interface BlockchainTransaction {
  id: string;
  evidenceId: string;
  transactionHash: string;
  blockNumber?: number;
  blockHash?: string;
  gasUsed?: number;
  gasPrice?: number;
  status: string;
  networkStatus: string;
  createdAt: string;
  confirmedAt?: string;
}