/**
 * ChittyID Universal Identity Model
 * One identity system for people, places, things, and events
 */

// Base ChittyID format: domain.type.identifier[.context]
export type ChittyIDType = 'user' | 'service' | 'mcp' | 'org' | 'device' | 'place' | 'event' | 'artifact';

export interface ChittyID {
  // Core identity
  id: string;                    // Full ChittyID: chitty.cc.user.01ABC123
  domain: string;                // DNS-owned realm: chitty.cc, aribia.llc
  type: ChittyIDType;           // Entity type
  identifier: string;            // Unique ID (ULID recommended)
  context?: string;              // Optional: prod, staging, tenant/abc
  
  // Verification & Trust
  verificationStatus: VerificationStatus;
  trustLevel: number;            // 1-5 based on verification strength
  verificationMethods: VerificationMethod[];
  
  // Metadata
  created: Date;
  updated: Date;
  status: 'active' | 'suspended' | 'deleted';
  metadata: Record<string, any>;
}

export interface VerificationStatus {
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;          // ChittyID of verifier
  verificationLevel: 'none' | 'basic' | 'standard' | 'high' | 'maximum';
  expiresAt?: Date;              // For temporary verifications
}

export interface VerificationMethod {
  type: VerificationType;
  verifiedAt: Date;
  details: Record<string, any>;
  strength: number;              // 1-5 contribution to trust level
}

export type VerificationType = 
  // People verification
  | 'email'                      // Email confirmation
  | 'phone'                      // SMS/voice verification
  | 'government_id'              // Government ID check
  | 'biometric'                  // Face/fingerprint
  | 'social_proof'               // Social media verification
  | 'in_person'                  // Physical verification
  
  // Places verification  
  | 'address_verification'       // Physical address confirmed
  | 'business_registration'      // Business license
  | 'property_deed'              // Property ownership
  | 'geolocation'                // GPS coordinates confirmed
  | 'photo_verification'         // Visual confirmation
  
  // Things verification
  | 'cryptographic'              // Public key signature
  | 'manufacturer_cert'          // Device manufacturer cert
  | 'network_attestation'        // Network-level verification
  | 'hardware_attestation'       // TPM/secure element
  | 'code_signing'               // Software signature
  
  // Events verification
  | 'blockchain_anchor'          // Blockchain timestamp
  | 'witness_attestation'        // Multiple witness confirmation
  | 'sensor_data'                // IoT/sensor confirmation
  | 'audit_trail';               // System audit logs

// Specific entity types with their unique properties

export interface PersonIdentity extends ChittyID {
  type: 'user' | 'org';
  profile: {
    displayName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    bio?: string;
  };
  authentication: {
    methods: ('password' | 'webauthn' | 'magic_link' | 'social')[];
    mfaEnabled: boolean;
    lastLogin?: Date;
  };
}

export interface PlaceIdentity extends ChittyID {
  type: 'place';
  location: {
    name: string;
    address?: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    polygon?: GeoJSON.Polygon;    // For complex boundaries
    timezone?: string;
    locationType: 'physical' | 'virtual' | 'hybrid';
  };
  ownership?: {
    owner: string;                 // ChittyID of owner
    verifiedOwnership: boolean;
    documents?: string[];          // Reference to ownership docs
  };
}

export interface ThingIdentity extends ChittyID {
  type: 'service' | 'mcp' | 'device' | 'artifact';
  technical: {
    publicKey?: string;            // For cryptographic verification
    endpoints?: string[];          // Service endpoints
    capabilities?: string[];       // What this thing can do
    manufacturer?: string;
    model?: string;
    serialNumber?: string;
  };
  lifecycle: {
    manufactured?: Date;
    activated?: Date;
    lastSeen?: Date;
    decommissioned?: Date;
  };
}

export interface EventIdentity extends ChittyID {
  type: 'event';
  event: {
    name: string;
    timestamp: Date;
    duration?: number;             // Duration in ms
    location?: string;             // ChittyID of place
    participants?: string[];       // ChittyIDs of participants
    eventType: string;             // Domain-specific event type
  };
  verification: {
    witnesses: string[];           // ChittyIDs of witnesses
    evidence: Evidence[];          // Supporting evidence
    confidence: number;            // 0-100 confidence score
  };
}

export interface Evidence {
  type: 'photo' | 'video' | 'document' | 'sensor_data' | 'attestation';
  uri: string;                     // Location of evidence
  hash: string;                    // Content hash
  timestamp: Date;
  providedBy: string;              // ChittyID of provider
}

// Relationships between entities

export interface Relationship {
  id: string;
  from: string;                    // ChittyID
  to: string;                      // ChittyID
  type: RelationshipType;
  established: Date;
  expires?: Date;
  verified: boolean;
  metadata: Record<string, any>;
}

export type RelationshipType = 
  // Ownership
  | 'owns'                         // Person owns thing/place
  | 'manages'                      // Person manages thing/place
  | 'created'                      // Person/thing created thing/event
  
  // Location
  | 'located_at'                   // Thing/person at place
  | 'occurred_at'                  // Event at place
  | 'resides_at'                   // Person lives at place
  
  // Participation  
  | 'participated_in'              // Person/thing in event
  | 'witnessed'                    // Person witnessed event
  | 'operated'                     // Person operated thing
  
  // Hierarchy
  | 'parent_of'                    // Org parent of org
  | 'member_of'                    // Person member of org
  | 'component_of'                 // Thing part of thing
  
  // Trust
  | 'trusts'                       // Entity trusts entity
  | 'verified_by'                  // Entity verified by entity
  | 'delegates_to';                // Entity delegates to entity

// Trust level calculation based on entity type and verification

export function calculateTrustLevel(identity: ChittyID): number {
  let level = 1; // Base level
  
  // Calculate based on verification methods
  const methodStrengths = identity.verificationMethods.map(m => m.strength);
  if (methodStrengths.length > 0) {
    level = Math.max(...methodStrengths);
  }
  
  // Adjust based on entity type
  switch (identity.type) {
    case 'user':
    case 'org':
      // People need identity verification
      if (identity.verificationMethods.some(m => m.type === 'government_id')) level = Math.max(level, 4);
      if (identity.verificationMethods.some(m => m.type === 'biometric')) level = Math.max(level, 5);
      break;
      
    case 'service':
    case 'mcp':
      // Services use cryptographic verification
      if (identity.verificationMethods.some(m => m.type === 'cryptographic')) level = Math.max(level, 2);
      if (identity.verificationMethods.some(m => m.type === 'code_signing')) level = Math.max(level, 3);
      break;
      
    case 'place':
      // Places need ownership verification
      if (identity.verificationMethods.some(m => m.type === 'property_deed')) level = Math.max(level, 4);
      break;
      
    case 'event':
      // Events need witness verification
      const witnesses = identity.verificationMethods.filter(m => m.type === 'witness_attestation').length;
      if (witnesses >= 3) level = Math.max(level, 3);
      if (witnesses >= 5) level = Math.max(level, 4);
      break;
  }
  
  return Math.min(level, 5); // Cap at 5
}

// Unified tracking interface

export interface TrackingEvent {
  id: string;
  timestamp: Date;
  entityId: string;                // ChittyID being tracked
  action: string;                  // Domain-specific action
  location?: string;               // ChittyID of place
  actor?: string;                  // ChittyID of actor
  details: Record<string, any>;
  confidence: number;              // 0-100
}

export interface TrackingQuery {
  entityId?: string;               // Track specific entity
  entityType?: ChittyIDType;       // Filter by type
  location?: string;               // Events at location
  timeRange?: {
    start: Date;
    end: Date;
  };
  actions?: string[];              // Filter by actions
  minConfidence?: number;          // Minimum confidence
}

// Capability-based access control (instead of just roles)

export interface Capability {
  id: string;
  name: string;                    // human-readable name
  resource: string;                // what resource this applies to
  actions: string[];               // allowed actions
  conditions?: Condition[];        // optional conditions
}

export interface Condition {
  type: 'time' | 'location' | 'relationship' | 'trust_level' | 'custom';
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'in' | 'contains';
  value: any;
}

// Example capabilities:
// - "read:events.public" - Read public events
// - "write:artifacts.own" - Write own artifacts  
// - "execute:mcp.tools" - Execute MCP tools
// - "verify:identity.basic" - Perform basic identity verification
// - "track:entity.location" - Track entity locations