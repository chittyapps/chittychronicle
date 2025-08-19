/**
 * ChittyID Claim Composition System
 * Bundles multiple evidence pieces into higher-order claims with validity scoring
 */

import { Pool } from 'pg';
import { ulid } from 'ulid';
import { createHash } from 'crypto';

export interface ClaimTemplate {
  id: string;
  type: string;
  name: string;
  description: string;
  requiredRoles: ClaimComponentRole[];
  validityRules: ValidityRule[];
  minValidityScore: number;
}

export interface ValidityRule {
  type: 'required_role' | 'min_evidence_count' | 'time_constraint' | 'contradiction_check' | 'custom';
  params: Record<string, any>;
  weight: number;
  failureMessage: string;
}

export type ClaimComponentRole = 
  | 'primary'          // Main evidence supporting the claim
  | 'supporting'       // Additional supporting evidence
  | 'corroborating'    // Independent confirmation
  | 'contradicting'    // Evidence against the claim
  | 'contextual'       // Background information
  | 'authenticating';  // Verification of other evidence

export interface ClaimComponent {
  evidenceId: string;
  role: ClaimComponentRole;
  weight: number;      // -1 to 1, negative for contradicting
  notes?: string;
}

export interface Claim {
  id: string;
  chittyId: string;
  type: string;
  assertion: string;
  authorIdentityId: string;
  components: ClaimComponent[];
  validityStatus: ClaimValidityStatus;
  validityScore: number;
  validityDetails: ValidityCheckResult[];
  freezeStatus: FreezeStatus;
  metadata: Record<string, any>;
}

export type ClaimValidityStatus = 
  | 'pending'          // Not yet validated
  | 'valid'            // All requirements met
  | 'partially_valid'  // Some requirements met
  | 'disputed'         // Contradictions found
  | 'invalidated';     // Failed validation

export type FreezeStatus = 
  | 'mutable'
  | 'pending_freeze'
  | 'frozen_offchain'
  | 'minting'
  | 'minted_onchain';

export interface ValidityCheckResult {
  rule: ValidityRule;
  passed: boolean;
  score: number;
  message: string;
  details?: Record<string, any>;
}

// Predefined claim templates for common legal scenarios
export const CLAIM_TEMPLATES: Record<string, ClaimTemplate> = {
  'breach_of_contract': {
    id: 'breach_of_contract',
    type: 'legal.contract',
    name: 'Breach of Contract',
    description: 'Claim that a party violated contract terms',
    requiredRoles: ['primary', 'supporting'],
    validityRules: [
      {
        type: 'required_role',
        params: { role: 'primary', minCount: 1 },
        weight: 0.4,
        failureMessage: 'Missing primary evidence (e.g., signed contract)'
      },
      {
        type: 'required_role',
        params: { role: 'supporting', minCount: 2 },
        weight: 0.3,
        failureMessage: 'Insufficient supporting evidence of breach'
      },
      {
        type: 'contradiction_check',
        params: { maxContradictionWeight: -0.3 },
        weight: 0.3,
        failureMessage: 'Significant contradicting evidence found'
      }
    ],
    minValidityScore: 0.7
  },
  
  'property_ownership': {
    id: 'property_ownership',
    type: 'property.title',
    name: 'Property Ownership',
    description: 'Claim of legal ownership of property',
    requiredRoles: ['primary', 'authenticating'],
    validityRules: [
      {
        type: 'required_role',
        params: { role: 'primary', minCount: 1, mustInclude: ['deed', 'title'] },
        weight: 0.5,
        failureMessage: 'Missing deed or title document'
      },
      {
        type: 'required_role',
        params: { role: 'authenticating', minCount: 1 },
        weight: 0.3,
        failureMessage: 'Missing authentication of ownership documents'
      },
      {
        type: 'time_constraint',
        params: { maxAgeMonths: 6, role: 'authenticating' },
        weight: 0.2,
        failureMessage: 'Authentication documents are too old'
      }
    ],
    minValidityScore: 0.8
  },
  
  'identity_verification': {
    id: 'identity_verification',
    type: 'identity.verification',
    name: 'Identity Verification',
    description: 'Claim that a person is who they claim to be',
    requiredRoles: ['primary', 'corroborating'],
    validityRules: [
      {
        type: 'required_role',
        params: { role: 'primary', minCount: 1, mustInclude: ['government_id'] },
        weight: 0.6,
        failureMessage: 'Missing government-issued ID'
      },
      {
        type: 'required_role',
        params: { role: 'corroborating', minCount: 2 },
        weight: 0.4,
        failureMessage: 'Insufficient corroborating evidence'
      }
    ],
    minValidityScore: 0.9
  }
};

export class ClaimCompositionSystem {
  constructor(private pool: Pool) {}

  /**
   * Create a new claim with initial evidence
   */
  async createClaim(
    type: string,
    assertion: string,
    authorIdentityId: string,
    initialComponents: ClaimComponent[] = [],
    metadata: Record<string, any> = {}
  ): Promise<Claim> {
    const claimId = ulid();
    const tenantName = await this.getTenantName(authorIdentityId);
    const chittyId = this.generateClaimChittyId(tenantName, type);
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert claim
      await client.query(`
        INSERT INTO claims (
          id, chitty_id, claim_type, assertion, 
          author_identity_id, claim_data, validity_status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')
      `, [claimId, chittyId, type, assertion, authorIdentityId, JSON.stringify(metadata)]);
      
      // Add initial components
      for (const component of initialComponents) {
        await this.addComponentInternal(client, claimId, component, authorIdentityId);
      }
      
      await client.query('COMMIT');
      
      // Calculate initial validity
      const claim = await this.getClaim(claimId);
      const validity = await this.calculateValidity(claim);
      await this.updateValidity(claimId, validity);
      
      return await this.getClaim(claimId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add evidence component to existing claim
   */
  async addComponent(
    claimId: string,
    component: ClaimComponent,
    addedBy: string
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Verify claim is mutable
      const freezeCheck = await client.query(
        'SELECT freeze_status FROM claims WHERE id = $1',
        [claimId]
      );
      
      if (freezeCheck.rows[0]?.freeze_status !== 'mutable') {
        throw new Error('Cannot modify frozen claim');
      }
      
      await this.addComponentInternal(client, claimId, component, addedBy);
      
      await client.query('COMMIT');
      
      // Recalculate validity
      const claim = await this.getClaim(claimId);
      const validity = await this.calculateValidity(claim);
      await this.updateValidity(claimId, validity);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate claim validity based on template rules
   */
  async calculateValidity(claim: Claim): Promise<{
    status: ClaimValidityStatus;
    score: number;
    details: ValidityCheckResult[];
  }> {
    const template = CLAIM_TEMPLATES[claim.type] || this.getDefaultTemplate();
    const results: ValidityCheckResult[] = [];
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const rule of template.validityRules) {
      const result = await this.checkValidityRule(rule, claim);
      results.push(result);
      totalScore += result.score * rule.weight;
      totalWeight += rule.weight;
    }
    
    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    // Determine status
    let status: ClaimValidityStatus;
    if (normalizedScore >= template.minValidityScore) {
      status = 'valid';
    } else if (normalizedScore >= template.minValidityScore * 0.6) {
      status = 'partially_valid';
    } else if (this.hasSignificantContradictions(claim.components)) {
      status = 'disputed';
    } else {
      status = 'invalidated';
    }
    
    return { status, score: normalizedScore, details: results };
  }

  /**
   * Check individual validity rule
   */
  private async checkValidityRule(
    rule: ValidityRule,
    claim: Claim
  ): Promise<ValidityCheckResult> {
    switch (rule.type) {
      case 'required_role':
        return this.checkRequiredRole(rule, claim);
        
      case 'min_evidence_count':
        return this.checkMinEvidenceCount(rule, claim);
        
      case 'time_constraint':
        return this.checkTimeConstraint(rule, claim);
        
      case 'contradiction_check':
        return this.checkContradictions(rule, claim);
        
      case 'custom':
        return this.checkCustomRule(rule, claim);
        
      default:
        return {
          rule,
          passed: false,
          score: 0,
          message: `Unknown rule type: ${rule.type}`
        };
    }
  }

  /**
   * Check if required roles are present
   */
  private async checkRequiredRole(
    rule: ValidityRule,
    claim: Claim
  ): Promise<ValidityCheckResult> {
    const { role, minCount = 1, mustInclude = [] } = rule.params;
    const components = claim.components.filter(c => c.role === role);
    
    if (components.length < minCount) {
      return {
        rule,
        passed: false,
        score: components.length / minCount,
        message: rule.failureMessage,
        details: { found: components.length, required: minCount }
      };
    }
    
    // Check if specific evidence types are included
    if (mustInclude.length > 0) {
      const evidenceTypes = await this.getEvidenceTypes(
        components.map(c => c.evidenceId)
      );
      
      const missingTypes = mustInclude.filter(
        type => !evidenceTypes.includes(type)
      );
      
      if (missingTypes.length > 0) {
        return {
          rule,
          passed: false,
          score: 0.5,
          message: `Missing required evidence types: ${missingTypes.join(', ')}`,
          details: { missingTypes }
        };
      }
    }
    
    return {
      rule,
      passed: true,
      score: 1,
      message: 'Required role evidence present',
      details: { count: components.length }
    };
  }

  /**
   * Check minimum evidence count
   */
  private checkMinEvidenceCount(
    rule: ValidityRule,
    claim: Claim
  ): Promise<ValidityCheckResult> {
    const { minCount } = rule.params;
    const count = claim.components.filter(c => c.weight > 0).length;
    
    return Promise.resolve({
      rule,
      passed: count >= minCount,
      score: Math.min(count / minCount, 1),
      message: count >= minCount 
        ? 'Sufficient evidence count' 
        : rule.failureMessage,
      details: { found: count, required: minCount }
    });
  }

  /**
   * Check time constraints on evidence
   */
  private async checkTimeConstraint(
    rule: ValidityRule,
    claim: Claim
  ): Promise<ValidityCheckResult> {
    const { maxAgeMonths, role } = rule.params;
    const components = role 
      ? claim.components.filter(c => c.role === role)
      : claim.components;
    
    const evidenceAges = await this.getEvidenceAges(
      components.map(c => c.evidenceId)
    );
    
    const now = new Date();
    const maxAgeMs = maxAgeMonths * 30 * 24 * 60 * 60 * 1000;
    
    const tooOld = evidenceAges.filter(age => {
      const ageMs = now.getTime() - age.getTime();
      return ageMs > maxAgeMs;
    });
    
    return {
      rule,
      passed: tooOld.length === 0,
      score: 1 - (tooOld.length / evidenceAges.length),
      message: tooOld.length === 0 
        ? 'All evidence within time constraints'
        : rule.failureMessage,
      details: { 
        tooOldCount: tooOld.length,
        maxAgeMonths 
      }
    };
  }

  /**
   * Check for contradicting evidence
   */
  private checkContradictions(
    rule: ValidityRule,
    claim: Claim
  ): Promise<ValidityCheckResult> {
    const { maxContradictionWeight } = rule.params;
    const contradictionWeight = claim.components
      .filter(c => c.role === 'contradicting')
      .reduce((sum, c) => sum + Math.abs(c.weight), 0);
    
    const totalPositiveWeight = claim.components
      .filter(c => c.weight > 0)
      .reduce((sum, c) => sum + c.weight, 0);
    
    const contradictionRatio = totalPositiveWeight > 0 
      ? contradictionWeight / totalPositiveWeight 
      : contradictionWeight;
    
    return Promise.resolve({
      rule,
      passed: contradictionRatio <= Math.abs(maxContradictionWeight),
      score: Math.max(0, 1 - contradictionRatio),
      message: contradictionRatio <= Math.abs(maxContradictionWeight)
        ? 'Contradictions within acceptable range'
        : rule.failureMessage,
      details: { 
        contradictionRatio,
        threshold: Math.abs(maxContradictionWeight)
      }
    });
  }

  /**
   * Check custom validation rule
   */
  private async checkCustomRule(
    rule: ValidityRule,
    claim: Claim
  ): Promise<ValidityCheckResult> {
    // Custom rules would be implemented based on specific business logic
    // This is a placeholder for extensibility
    return {
      rule,
      passed: true,
      score: 1,
      message: 'Custom rule evaluation not implemented',
      details: {}
    };
  }

  /**
   * Freeze claim for immutability
   */
  async freezeClaim(claimId: string, freezeBy: string): Promise<{
    freezeHash: string;
    witnessSignatures: string[];
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get claim and components
      const claimResult = await client.query(`
        SELECT c.*, array_agg(
          json_build_object(
            'evidence_id', cc.evidence_id,
            'role', cc.role,
            'weight', cc.weight,
            'evidence_hash', e.content_hash
          )
        ) as components
        FROM claims c
        LEFT JOIN claim_components cc ON c.id = cc.claim_id
        LEFT JOIN evidence e ON cc.evidence_id = e.id
        WHERE c.id = $1
        GROUP BY c.id
      `, [claimId]);
      
      if (claimResult.rows.length === 0) {
        throw new Error('Claim not found');
      }
      
      const claim = claimResult.rows[0];
      
      if (claim.freeze_status !== 'mutable') {
        throw new Error('Claim already frozen');
      }
      
      // Generate freeze hash
      const freezeData = {
        claimId: claim.id,
        chittyId: claim.chitty_id,
        type: claim.claim_type,
        assertion: claim.assertion,
        authorId: claim.author_identity_id,
        components: claim.components,
        validityScore: claim.validity_score,
        timestamp: new Date().toISOString()
      };
      
      const freezeHash = createHash('sha256')
        .update(JSON.stringify(freezeData))
        .digest('hex');
      
      // Get witness signatures (component evidence hashes)
      const witnessSignatures = claim.components
        .filter(c => c.evidence_hash)
        .map(c => c.evidence_hash);
      
      // Update claim status
      await client.query(`
        UPDATE claims 
        SET freeze_status = 'frozen_offchain',
            frozen_at = CURRENT_TIMESTAMP,
            freeze_hash = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [claimId, freezeHash]);
      
      // Log freeze event
      await client.query(`
        INSERT INTO audit (
          actor_sub, action, target, target_type, meta
        ) VALUES ($1, 'claim_frozen', $2, 'claim', $3)
      `, [freezeBy, claimId, { freezeHash, witnessCount: witnessSignatures.length }]);
      
      await client.query('COMMIT');
      
      return { freezeHash, witnessSignatures };
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // Helper methods

  private async addComponentInternal(
    client: any,
    claimId: string,
    component: ClaimComponent,
    addedBy: string
  ): Promise<void> {
    // Verify evidence exists and is frozen
    const evidenceCheck = await client.query(
      'SELECT freeze_status FROM evidence WHERE id = $1',
      [component.evidenceId]
    );
    
    if (evidenceCheck.rows.length === 0) {
      throw new Error('Evidence not found');
    }
    
    if (evidenceCheck.rows[0].freeze_status === 'mutable') {
      throw new Error('Evidence must be frozen before adding to claim');
    }
    
    await client.query(`
      INSERT INTO claim_components (
        claim_id, evidence_id, role, weight, added_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (claim_id, evidence_id) 
      DO UPDATE SET role = $3, weight = $4, notes = $6
    `, [claimId, component.evidenceId, component.role, component.weight, addedBy, component.notes]);
  }

  private async getClaim(claimId: string): Promise<Claim> {
    const result = await this.pool.query(`
      SELECT c.*, 
        array_agg(
          json_build_object(
            'evidenceId', cc.evidence_id,
            'role', cc.role,
            'weight', cc.weight,
            'notes', cc.notes
          )
        ) FILTER (WHERE cc.evidence_id IS NOT NULL) as components
      FROM claims c
      LEFT JOIN claim_components cc ON c.id = cc.claim_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [claimId]);
    
    if (result.rows.length === 0) {
      throw new Error('Claim not found');
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      chittyId: row.chitty_id,
      type: row.claim_type,
      assertion: row.assertion,
      authorIdentityId: row.author_identity_id,
      components: row.components || [],
      validityStatus: row.validity_status,
      validityScore: parseFloat(row.validity_score || '0'),
      validityDetails: [],
      freezeStatus: row.freeze_status,
      metadata: row.claim_data || {}
    };
  }

  private async updateValidity(
    claimId: string,
    validity: { status: ClaimValidityStatus; score: number; details: ValidityCheckResult[] }
  ): Promise<void> {
    await this.pool.query(`
      UPDATE claims 
      SET validity_status = $2,
          validity_score = $3,
          claim_data = jsonb_set(
            COALESCE(claim_data, '{}'::jsonb),
            '{validity_details}',
            $4::jsonb
          ),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [claimId, validity.status, validity.score, JSON.stringify(validity.details)]);
  }

  private async getTenantName(identityId: string): Promise<string> {
    const result = await this.pool.query(`
      SELECT t.name 
      FROM identities i
      JOIN tenants t ON i.tenant_id = t.id
      WHERE i.id = $1
    `, [identityId]);
    
    return result.rows[0]?.name || 'default';
  }

  private generateClaimChittyId(tenantName: string, claimType: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${tenantName}.claim.${claimType}.${timestamp}${random}`;
  }

  private hasSignificantContradictions(components: ClaimComponent[]): boolean {
    const contradictionWeight = components
      .filter(c => c.role === 'contradicting')
      .reduce((sum, c) => sum + Math.abs(c.weight), 0);
    
    return contradictionWeight > 0.3;
  }

  private async getEvidenceTypes(evidenceIds: string[]): Promise<string[]> {
    if (evidenceIds.length === 0) return [];
    
    const result = await this.pool.query(`
      SELECT DISTINCT evidence_type 
      FROM evidence 
      WHERE id = ANY($1)
    `, [evidenceIds]);
    
    return result.rows.map(r => r.evidence_type);
  }

  private async getEvidenceAges(evidenceIds: string[]): Promise<Date[]> {
    if (evidenceIds.length === 0) return [];
    
    const result = await this.pool.query(`
      SELECT captured_at 
      FROM evidence 
      WHERE id = ANY($1)
    `, [evidenceIds]);
    
    return result.rows.map(r => new Date(r.captured_at));
  }

  private getDefaultTemplate(): ClaimTemplate {
    return {
      id: 'default',
      type: 'default',
      name: 'Default Claim Template',
      description: 'Basic claim validation',
      requiredRoles: ['primary'],
      validityRules: [
        {
          type: 'required_role',
          params: { role: 'primary', minCount: 1 },
          weight: 0.6,
          failureMessage: 'Missing primary evidence'
        },
        {
          type: 'contradiction_check',
          params: { maxContradictionWeight: -0.4 },
          weight: 0.4,
          failureMessage: 'Too many contradictions'
        }
      ],
      minValidityScore: 0.5
    };
  }
}