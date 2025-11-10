import { db } from './db';
import {
  evidenceEnvelopes,
  evidenceDistributions,
  evidenceVisibilityOverrides,
  evidenceEnvelopeParticipants,
  orchestratorRoutingPolicy,
  auditLog,
  type EvidenceEnvelope,
  type EvidenceDistribution,
  type InsertEvidenceEnvelope,
  type InsertEvidenceDistribution,
} from '@shared/schema';
import { eq, and, or, inArray, sql } from 'drizzle-orm';

// Event types for orchestrator state machine
export type OrchestratorEvent =
  | { type: 'evidence.created'; payload: { envelopeId: string; userId: string } }
  | { type: 'evidence.submitted'; payload: { envelopeId: string; userId: string } }
  | { type: 'evidence.approved'; payload: { envelopeId: string; userId: string } }
  | { type: 'evidence.dispatch.requested'; payload: { envelopeId: string; targets: string[]; userId: string } }
  | { type: 'evidence.dispatch.completed'; payload: { distributionId: string } }
  | { type: 'evidence.dispatch.failed'; payload: { distributionId: string; error: string } };

// Evidence orchestrator for managing evidence lifecycle and ecosystem distribution
export class EvidenceOrchestrator {
  /**
   * Dispatch evidence to downstream ecosystem targets based on routing policy
   */
  async dispatchEvidence(envelopeId: string, userId: string): Promise<void> {
    // Get the evidence envelope
    const envelope = await db.query.evidenceEnvelopes.findFirst({
      where: eq(evidenceEnvelopes.id, envelopeId),
    });

    if (!envelope) {
      throw new Error(`Evidence envelope ${envelopeId} not found`);
    }

    // Get routing policy for this evidence
    const routingPolicies = await db.query.orchestratorRoutingPolicy.findMany({
      where: and(
        eq(orchestratorRoutingPolicy.visibilityScope, envelope.visibilityScope),
        eq(orchestratorRoutingPolicy.evidenceStatus, envelope.status),
        eq(orchestratorRoutingPolicy.isActive, true),
      ),
    });

    if (routingPolicies.length === 0) {
      console.log(`No active routing policy found for envelope ${envelopeId}`);
      return;
    }

    // Collect all allowed targets from matching policies
    const allowedTargets = new Set<string>();
    for (const policy of routingPolicies) {
      policy.allowedTargets?.forEach(target => allowedTargets.add(target));
    }

    // Create distribution records for each target
    for (const target of Array.from(allowedTargets)) {
      const existingDistribution = await db.query.evidenceDistributions.findFirst({
        where: and(
          eq(evidenceDistributions.envelopeId, envelopeId),
          eq(evidenceDistributions.target, target as any),
        ),
      });

      if (!existingDistribution) {
        await db.insert(evidenceDistributions).values({
          envelopeId,
          target: target as any,
          status: 'pending',
          payloadHash: this.generatePayloadHash(envelope),
        });

        // Log the dispatch request
        await this.logAudit({
          entityType: 'evidence_distribution',
          entityId: envelopeId,
          action: 'dispatch_requested',
          actorId: userId,
          context: { target },
        });
      }
    }

    // Emit event for dispatch requested
    this.emitEvent({
      type: 'evidence.dispatch.requested',
      payload: { envelopeId, targets: Array.from(allowedTargets), userId },
    });
  }

  /**
   * Process pending distributions and attempt to send them to target systems
   */
  async processPendingDistributions(): Promise<void> {
    const pendingDistributions = await db.query.evidenceDistributions.findMany({
      where: eq(evidenceDistributions.status, 'pending'),
    });

    for (const distribution of pendingDistributions) {
      try {
        await this.sendToTarget(distribution);
        
        // Update distribution status to dispatched
        await db.update(evidenceDistributions)
          .set({ 
            status: 'dispatched',
            dispatchedAt: new Date(),
          })
          .where(eq(evidenceDistributions.id, distribution.id));

        this.emitEvent({
          type: 'evidence.dispatch.completed',
          payload: { distributionId: distribution.id },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        // Update distribution with error
        await db.update(evidenceDistributions)
          .set({ 
            status: 'failed',
            errorLog: errorMessage,
            retryCount: String(parseInt(distribution.retryCount || '0') + 1),
          })
          .where(eq(evidenceDistributions.id, distribution.id));

        this.emitEvent({
          type: 'evidence.dispatch.failed',
          payload: { distributionId: distribution.id, error: errorMessage },
        });
      }
    }
  }

  /**
   * Send evidence distribution to target ecosystem system
   */
  private async sendToTarget(distribution: EvidenceDistribution): Promise<void> {
    // Get the envelope data
    const envelope = await db.query.evidenceEnvelopes.findFirst({
      where: eq(evidenceEnvelopes.id, distribution.envelopeId),
    });

    if (!envelope) {
      throw new Error(`Envelope ${distribution.envelopeId} not found`);
    }

    // Simulate sending to different target systems
    // In production, this would integrate with actual ChittyLedger, ChittyVerify, etc.
    switch (distribution.target) {
      case 'chitty_ledger':
        await this.sendToChittyLedger(envelope);
        break;
      case 'chitty_verify':
        await this.sendToChittyVerify(envelope);
        break;
      case 'chitty_trust':
        await this.sendToChittyTrust(envelope);
        break;
      case 'chitty_chain':
        await this.sendToChittyChain(envelope);
        break;
      default:
        throw new Error(`Unknown target: ${distribution.target}`);
    }
  }

  /**
   * Send evidence to ChittyLedger for immutable record keeping
   */
  private async sendToChittyLedger(envelope: EvidenceEnvelope): Promise<void> {
    // TODO: Integrate with actual ChittyLedger API
    console.log(`Sending envelope ${envelope.id} to ChittyLedger`);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send evidence to ChittyVerify for verification workflows
   */
  private async sendToChittyVerify(envelope: EvidenceEnvelope): Promise<void> {
    // TODO: Integrate with actual ChittyVerify API
    console.log(`Sending envelope ${envelope.id} to ChittyVerify`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send evidence to ChittyTrust for trust scoring
   */
  private async sendToChittyTrust(envelope: EvidenceEnvelope): Promise<void> {
    // TODO: Integrate with actual ChittyTrust API
    console.log(`Sending envelope ${envelope.id} to ChittyTrust`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send evidence to ChittyChain for blockchain notarization
   */
  private async sendToChittyChain(envelope: EvidenceEnvelope): Promise<void> {
    // TODO: Integrate with actual ChittyChain API
    console.log(`Sending envelope ${envelope.id} to ChittyChain`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Generate payload hash for evidence envelope
   */
  private generatePayloadHash(envelope: EvidenceEnvelope): string {
    const payload = JSON.stringify({
      id: envelope.id,
      caseId: envelope.caseId,
      title: envelope.title,
      description: envelope.description,
      contentHash: envelope.contentHash,
      version: envelope.version,
    });
    
    // Simple hash function (in production, use crypto)
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
      const char = payload.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Log audit event
   */
  private async logAudit(entry: {
    entityType: string;
    entityId: string;
    action: string;
    actorId: string | null;
    context?: any;
  }): Promise<void> {
    await db.insert(auditLog).values({
      entityType: entry.entityType,
      entityId: entry.entityId,
      action: entry.action,
      actorId: entry.actorId,
      context: entry.context,
    });
  }

  /**
   * Emit orchestrator event (in production, this would use a real event bus)
   */
  private emitEvent(event: OrchestratorEvent): void {
    console.log(`[Orchestrator Event] ${event.type}:`, event.payload);
    // TODO: Integrate with actual event bus (Redis, RabbitMQ, etc.)
  }

  /**
   * Resolve effective permissions for a user on an evidence envelope
   */
  async resolveEffectivePermissions(envelopeId: string, userId: string): Promise<{
    canView: boolean;
    canComment: boolean;
    canAnnotate: boolean;
    canApprove: boolean;
  }> {
    // Check visibility overrides first
    const override = await db.query.evidenceVisibilityOverrides.findFirst({
      where: and(
        eq(evidenceVisibilityOverrides.envelopeId, envelopeId),
        eq(evidenceVisibilityOverrides.userId, userId),
      ),
    });

    if (override) {
      return {
        canView: override.canView,
        canComment: override.canComment,
        canAnnotate: override.canAnnotate,
        canApprove: override.canApprove,
      };
    }

    // Check participant permissions
    const participant = await db.query.evidenceEnvelopeParticipants.findFirst({
      where: and(
        eq(evidenceEnvelopeParticipants.envelopeId, envelopeId),
        eq(evidenceEnvelopeParticipants.userId, userId),
      ),
    });

    if (participant) {
      const permissions = participant.permissions || [];
      return {
        canView: permissions.includes('view'),
        canComment: permissions.includes('comment'),
        canAnnotate: permissions.includes('annotate'),
        canApprove: permissions.includes('approve'),
      };
    }

    // Default: no permissions
    return {
      canView: false,
      canComment: false,
      canAnnotate: false,
      canApprove: false,
    };
  }
}

// Export singleton instance
export const evidenceOrchestrator = new EvidenceOrchestrator();
