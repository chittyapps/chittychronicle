import { db } from './db';
import {
  evidenceEnvelopes,
  evidenceDistributions,
  evidenceVisibilityOverrides,
  evidenceEnvelopeParticipants,
  orchestratorRoutingPolicy,
  auditLog,
  outboundMessages,
  type EvidenceEnvelope,
  type EvidenceDistribution,
  type InsertEvidenceEnvelope,
  type InsertEvidenceDistribution,
  type OutboundMessage,
} from '@shared/schema';
import { eq, and, or, inArray, sql } from 'drizzle-orm';
import { ChittyAdapterFactory, type ChittyDeliveryResponse } from './chittyAdapters';

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
   * Process pending distributions using outbox pattern
   */
  async processPendingDistributions(): Promise<void> {
    // First, create outbound messages for any distributions without them
    await this.createOutboundMessages();
    
    // Then process pending outbound messages
    await this.dispatchOutboundMessages();
  }

  /**
   * Create outbound messages for pending distributions (outbox pattern)
   */
  private async createOutboundMessages(): Promise<void> {
    const pendingDistributions = await db.query.evidenceDistributions.findMany({
      where: eq(evidenceDistributions.status, 'pending'),
    });

    for (const distribution of pendingDistributions) {
      // Check if outbound message already exists
      const existingMessage = await db.query.outboundMessages.findFirst({
        where: eq(outboundMessages.distributionId, distribution.id),
      });

      if (!existingMessage) {
        // Get the envelope data
        const envelope = await db.query.evidenceEnvelopes.findFirst({
          where: eq(evidenceEnvelopes.id, distribution.envelopeId),
        });

        if (envelope) {
          // Create outbound message with full payload
          await db.insert(outboundMessages).values({
            distributionId: distribution.id,
            target: distribution.target,
            payload: this.buildPayload(envelope),
            status: 'pending',
          });
        }
      }
    }
  }

  /**
   * Dispatch outbound messages using adapters
   */
  private async dispatchOutboundMessages(): Promise<void> {
    const pendingMessages = await db.query.outboundMessages.findMany({
      where: or(
        eq(outboundMessages.status, 'pending'),
        eq(outboundMessages.status, 'dispatching')
      ),
    });

    for (const message of pendingMessages) {
      // Skip if too many attempts (max 5 retries)
      if (parseInt(message.attemptCount || '0') >= 5) {
        await db.update(outboundMessages)
          .set({ status: 'failed', errorLog: 'Max retry attempts exceeded' })
          .where(eq(outboundMessages.id, message.id));
        continue;
      }

      try {
        // Mark as dispatching
        await db.update(outboundMessages)
          .set({ 
            status: 'dispatching',
            lastAttemptAt: new Date(),
            attemptCount: String(parseInt(message.attemptCount || '0') + 1),
          })
          .where(eq(outboundMessages.id, message.id));

        // Get adapter and send
        const adapter = ChittyAdapterFactory.getAdapter(message.target);
        const envelope = this.payloadToEnvelope(message.payload as any);
        const response = await adapter.send(envelope);

        if (response.success) {
          // Update outbound message
          await db.update(outboundMessages)
            .set({ 
              status: 'delivered',
              deliveredAt: new Date(),
              externalResponse: response,
            })
            .where(eq(outboundMessages.id, message.id));

          // Update distribution
          await db.update(evidenceDistributions)
            .set({ 
              status: 'dispatched',
              dispatchedAt: new Date(),
              acknowledgedAt: new Date(),
              externalId: response.externalId,
            })
            .where(eq(evidenceDistributions.id, message.distributionId));

          this.emitEvent({
            type: 'evidence.dispatch.completed',
            payload: { distributionId: message.distributionId },
          });
        } else {
          throw new Error(response.error || 'Delivery failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const currentAttempts = parseInt(message.attemptCount || '0') + 1;
        
        console.error(`[Orchestrator] Dispatch failed for message ${message.id} (attempt ${currentAttempts}/5):`, errorMessage);
        
        // Update outbound message with error
        await db.update(outboundMessages)
          .set({ 
            status: 'pending', // Reset to pending for retry
            errorLog: errorMessage,
          })
          .where(eq(outboundMessages.id, message.id));

        // Update distribution with correct retry count
        await db.update(evidenceDistributions)
          .set({ 
            status: 'failed',
            errorLog: errorMessage,
            retryCount: String(currentAttempts),
          })
          .where(eq(evidenceDistributions.id, message.distributionId));

        this.emitEvent({
          type: 'evidence.dispatch.failed',
          payload: { distributionId: message.distributionId, error: errorMessage },
        });
      }
    }
  }

  /**
   * Build payload from evidence envelope for outbound messages
   */
  private buildPayload(envelope: EvidenceEnvelope): any {
    return {
      envelopeId: envelope.id,
      caseId: envelope.caseId,
      timelineEntryId: envelope.timelineEntryId,
      ownerId: envelope.ownerId,
      title: envelope.title,
      description: envelope.description,
      contentHash: envelope.contentHash,
      sourceMetadata: envelope.sourceMetadata,
      chittyIds: envelope.chittyIds,
      version: envelope.version,
      status: envelope.status,
      visibilityScope: envelope.visibilityScope,
      createdAt: envelope.createdAt,
      createdBy: envelope.createdBy,
    };
  }

  /**
   * Convert payload back to envelope structure for adapter usage
   */
  private payloadToEnvelope(payload: any): EvidenceEnvelope {
    return {
      id: payload.envelopeId,
      caseId: payload.caseId,
      timelineEntryId: payload.timelineEntryId,
      ownerId: payload.ownerId,
      title: payload.title,
      description: payload.description,
      contentHash: payload.contentHash,
      sourceMetadata: payload.sourceMetadata,
      chittyIds: payload.chittyIds,
      version: payload.version,
      status: payload.status,
      visibilityScope: payload.visibilityScope,
      createdAt: payload.createdAt,
      createdBy: payload.createdBy,
    } as EvidenceEnvelope;
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
