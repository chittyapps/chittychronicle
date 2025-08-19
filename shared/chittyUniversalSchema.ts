import { z } from "zod";

/**
 * Chitty Universal Data Exchange Format (CUDEF)
 * 
 * A standardized schema for data exchange across the Chitty ecosystem.
 * This format ensures compatibility between ChittyChronicle, ChittyLedger,
 * ChittyCases, ChittyPM, and other Chitty applications.
 */

// ChittyChain Block Schema - for immutable audit trail
export const chittyBlockSchema = z.object({
  blockId: z.string().describe("Unique block identifier in ChittyChain"),
  previousBlockHash: z.string().describe("Hash of the previous block"),
  timestamp: z.string().datetime().describe("ISO 8601 timestamp"),
  dataHash: z.string().describe("SHA-256 hash of the data content"),
  signature: z.string().describe("Digital signature for verification"),
  chainId: z.string().describe("Identifier for the specific chain"),
  blockNumber: z.number().describe("Sequential block number"),
  validator: z.string().optional().describe("ChittyID of the validator"),
});

// ChittyID Identity Schema
export const chittyIdentitySchema = z.object({
  chittyId: z.string().regex(/^CID-[A-Z0-9]{8}$/).describe("Unique ChittyID"),
  type: z.enum(['person', 'organization', 'system', 'agent']),
  name: z.string(),
  email: z.string().email().optional(),
  roles: z.array(z.string()),
  publicKey: z.string().optional().describe("Public key for verification"),
  metadata: z.record(z.any()).optional(),
  verifiedAt: z.string().datetime().optional(),
  attestations: z.array(z.object({
    attestor: z.string().describe("ChittyID of attestor"),
    claim: z.string(),
    timestamp: z.string().datetime(),
    signature: z.string(),
  })).optional(),
});

// Universal Timestamp Schema
export const chittyTimestampSchema = z.object({
  occurred: z.string().datetime().describe("When the event occurred"),
  recorded: z.string().datetime().describe("When it was recorded in the system"),
  modified: z.string().datetime().optional().describe("Last modification time"),
  verified: z.string().datetime().optional().describe("When it was verified"),
});

// Universal Entity Schema - can represent any entity across Chitty apps
export const chittyEntitySchema = z.object({
  entityId: z.string().describe("Universal entity identifier"),
  entityType: z.enum([
    'case', 'task', 'event', 'transaction', 'document', 
    'contract', 'invoice', 'ticket', 'project', 'milestone'
  ]),
  sourceSystem: z.enum([
    'ChittyChronicle', 'ChittyLedger', 'ChittyCases', 'ChittyPM',
    'ChittyForge', 'ChittyCan', 'ChittyBeacon', 'Custom'
  ]),
  status: z.string().describe("Entity status in source system"),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'none']).optional(),
  timestamps: chittyTimestampSchema,
  relationships: z.array(z.object({
    relationType: z.enum(['parent', 'child', 'related', 'depends_on', 'blocks', 'references']),
    targetEntityId: z.string(),
    targetSystem: z.string().optional(),
    metadata: z.record(z.any()).optional(),
  })).optional(),
});

// Universal Document Schema
export const chittyDocumentSchema = z.object({
  documentId: z.string(),
  chittyId: z.string().optional().describe("ChittyID reference"),
  title: z.string(),
  type: z.string(),
  mimeType: z.string().optional(),
  hash: z.string().describe("Content hash for verification"),
  size: z.number().optional(),
  location: z.object({
    system: z.string(),
    path: z.string(),
    url: z.string().url().optional(),
  }),
  encryption: z.object({
    encrypted: z.boolean(),
    algorithm: z.string().optional(),
    keyId: z.string().optional(),
  }).optional(),
  signatures: z.array(z.object({
    signerId: z.string(),
    signature: z.string(),
    timestamp: z.string().datetime(),
    method: z.string(),
  })).optional(),
  metadata: z.record(z.any()).optional(),
});

// Universal Event Schema - for timeline events, ledger transactions, etc.
export const chittyEventSchema = z.object({
  eventId: z.string(),
  chittyId: z.string().optional(),
  eventType: z.string(),
  eventSubtype: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  participants: z.array(chittyIdentitySchema),
  location: z.object({
    physical: z.string().optional(),
    virtual: z.string().url().optional(),
    jurisdiction: z.string().optional(),
    coordinates: z.object({
      lat: z.number(),
      lng: z.number(),
    }).optional(),
  }).optional(),
  value: z.object({
    amount: z.number().optional(),
    currency: z.string().optional(),
    items: z.array(z.object({
      description: z.string(),
      quantity: z.number(),
      unitPrice: z.number().optional(),
    })).optional(),
  }).optional(),
  evidence: z.array(chittyDocumentSchema).optional(),
  timestamps: chittyTimestampSchema,
  verification: z.object({
    status: z.enum(['verified', 'pending', 'disputed', 'rejected']),
    verifiedBy: z.string().optional(),
    method: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  }).optional(),
  chainRecord: chittyBlockSchema.optional(),
});

// Universal Task/Action Schema
export const chittyTaskSchema = z.object({
  taskId: z.string(),
  chittyId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  type: z.enum(['task', 'action', 'milestone', 'deliverable']),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']),
  assignee: chittyIdentitySchema.optional(),
  assignor: chittyIdentitySchema.optional(),
  dueDate: z.string().datetime().optional(),
  completedDate: z.string().datetime().optional(),
  effort: z.object({
    estimated: z.number().optional(),
    actual: z.number().optional(),
    unit: z.enum(['hours', 'days', 'points']).optional(),
  }).optional(),
  dependencies: z.array(z.string()).optional(),
  deliverables: z.array(chittyDocumentSchema).optional(),
  verification: z.object({
    required: z.boolean(),
    method: z.string().optional(),
    criteria: z.array(z.string()).optional(),
  }).optional(),
  timestamps: chittyTimestampSchema,
  chainRecord: chittyBlockSchema.optional(),
});

// Universal Case/Project Schema
export const chittyCaseSchema = z.object({
  caseId: z.string(),
  chittyId: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  type: z.string(),
  status: z.enum(['active', 'closed', 'archived', 'pending']),
  parties: z.array(z.object({
    identity: chittyIdentitySchema,
    role: z.string(),
    representedBy: chittyIdentitySchema.optional(),
    joinedAt: z.string().datetime(),
    leftAt: z.string().datetime().optional(),
  })),
  timeline: z.array(chittyEventSchema),
  tasks: z.array(chittyTaskSchema),
  documents: z.array(chittyDocumentSchema),
  metadata: z.object({
    jurisdiction: z.string().optional(),
    court: z.string().optional(),
    caseNumber: z.string().optional(),
    filingDate: z.string().datetime().optional(),
    customFields: z.record(z.any()).optional(),
  }).optional(),
  financial: z.object({
    budget: z.number().optional(),
    spent: z.number().optional(),
    currency: z.string().optional(),
    transactions: z.array(z.string()).optional(), // References to ChittyLedger
  }).optional(),
  timestamps: chittyTimestampSchema,
  chainRecord: chittyBlockSchema.optional(),
});

// Master Universal Export Schema
export const chittyUniversalExportSchema = z.object({
  version: z.literal("1.0.0"),
  exportId: z.string(),
  exportDate: z.string().datetime(),
  source: z.object({
    system: z.string(),
    version: z.string(),
    instance: z.string().optional(),
  }),
  destination: z.object({
    system: z.string(),
    requirements: z.array(z.string()).optional(),
  }).optional(),
  authentication: z.object({
    exporter: chittyIdentitySchema,
    signature: z.string(),
    publicKey: z.string(),
  }),
  data: z.object({
    cases: z.array(chittyCaseSchema).optional(),
    events: z.array(chittyEventSchema).optional(),
    tasks: z.array(chittyTaskSchema).optional(),
    documents: z.array(chittyDocumentSchema).optional(),
    identities: z.array(chittyIdentitySchema).optional(),
    entities: z.array(chittyEntitySchema).optional(),
  }),
  relationships: z.array(z.object({
    sourceId: z.string(),
    sourceType: z.string(),
    targetId: z.string(),
    targetType: z.string(),
    relationshipType: z.string(),
    metadata: z.record(z.any()).optional(),
  })).optional(),
  chainProof: z.object({
    merkleRoot: z.string(),
    blockReferences: z.array(chittyBlockSchema),
    verificationUrl: z.string().url().optional(),
  }).optional(),
  encryption: z.object({
    encrypted: z.boolean(),
    recipients: z.array(z.string()).optional(), // ChittyIDs of recipients
    algorithm: z.string().optional(),
  }).optional(),
  metadata: z.object({
    totalRecords: z.number(),
    checksum: z.string(),
    compression: z.string().optional(),
    customFields: z.record(z.any()).optional(),
  }),
});

// Type exports
export type ChittyBlock = z.infer<typeof chittyBlockSchema>;
export type ChittyIdentity = z.infer<typeof chittyIdentitySchema>;
export type ChittyTimestamp = z.infer<typeof chittyTimestampSchema>;
export type ChittyEntity = z.infer<typeof chittyEntitySchema>;
export type ChittyDocument = z.infer<typeof chittyDocumentSchema>;
export type ChittyEvent = z.infer<typeof chittyEventSchema>;
export type ChittyTask = z.infer<typeof chittyTaskSchema>;
export type ChittyCase = z.infer<typeof chittyCaseSchema>;
export type ChittyUniversalExport = z.infer<typeof chittyUniversalExportSchema>;