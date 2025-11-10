/**
 * Communications Service
 *
 * Consumes platform data (iMessage, WhatsApp, email, DocuSign, OpenPhone)
 * FROM ChittyConnect rather than direct platform integrations.
 *
 * Architecture:
 * Platforms → ChittyConnect (integration hub) → ChittyChronicle (this service)
 */

import { chittyConnect, type ChittyConnectMessage, type ChittyConnectConversation } from './chittyConnectClient';
import { storage } from './storage';
import { emitContextEvent } from './contextEmitter';
import type { InsertParty, InsertMessage, InsertConversation } from '@shared/schema';

export interface CommunicationsSummary {
  summary: {
    totalParties: number;
    totalConversations: number;
    totalMessages: number;
    messagesBySource: Record<string, number>;
  };
  parties: any[];
  recentMessages: any[];
}

export interface CrossSourceMessage {
  id: string;
  platform: string;
  from: string;
  to: string[];
  subject?: string;
  body: string;
  sentAt: string;
  threadId: string;
}

export class CommunicationsService {

  /**
   * Sync messages from ChittyConnect for a case
   * This pulls platform data FROM ChittyConnect and stores locally for timeline integration
   */
  async syncMessagesFromChittyConnect(params: {
    caseId: string;
    platforms?: ('imessage' | 'whatsapp' | 'email' | 'docusign' | 'openphone')[];
    startDate?: string;
    endDate?: string;
  }): Promise<{
    synced: number;
    messages: any[];
  }> {
    const { caseId, platforms, startDate, endDate } = params;

    let allMessages: ChittyConnectMessage[] = [];

    // Get messages from ChittyConnect for all platforms
    const platformsToSync = platforms || ['imessage', 'whatsapp', 'email', 'docusign', 'openphone'];

    for (const platform of platformsToSync) {
      try {
        const messages = await chittyConnect.getMessages({
          platform,
          caseId,
          startDate,
          endDate,
        });
        allMessages = allMessages.concat(messages);
      } catch (error) {
        console.error(`Failed to sync messages from ${platform}:`, error);
        // Continue with other platforms
      }
    }

    // Store messages locally for timeline integration
    const stored = [];
    for (const msg of allMessages) {
      try {
        const storedMessage = await this.storeMessageLocally(msg, caseId);
        stored.push(storedMessage);
      } catch (error) {
        console.error(`Failed to store message ${msg.id}:`, error);
      }
    }

    // Emit context event
    await emitContextEvent('communications.messages.synced', {
      subject_id: caseId,
      payload: {
        caseId,
        messageCount: stored.length,
        platforms: platformsToSync,
      },
    });

    return {
      synced: stored.length,
      messages: stored,
    };
  }

  /**
   * Store a message from ChittyConnect into local database
   * for timeline linking and caching
   */
  private async storeMessageLocally(
    msg: ChittyConnectMessage,
    caseId: string
  ): Promise<any> {
    // Upsert sender party
    const senderParty = await storage.upsertPartyWithIdentifier(
      {
        caseId,
        displayName: msg.from,
      },
      {
        idType: this.getIdTypeFromPlatform(msg.platform, msg.from),
        identifier: msg.from,
        normalizedIdentifier: this.normalizeIdentifier(msg.from),
      }
    );

    // Upsert recipient parties
    const recipientParties = [];
    for (const recipient of msg.to) {
      const party = await storage.upsertPartyWithIdentifier(
        {
          caseId,
          displayName: recipient,
        },
        {
          idType: this.getIdTypeFromPlatform(msg.platform, recipient),
          identifier: recipient,
          normalizedIdentifier: this.normalizeIdentifier(recipient),
        }
      );
      recipientParties.push(party);
    }

    // Store message
    const messageData: Omit<InsertMessage, 'id'> = {
      caseId,
      source: msg.platform,
      externalId: msg.externalId,
      externalThreadId: msg.externalThreadId,
      direction: msg.direction,
      senderPartyId: senderParty.id,
      subject: msg.subject,
      bodyText: msg.bodyText,
      bodyHtml: msg.bodyHtml,
      sentAt: new Date(msg.sentAt),
      receivedAt: new Date(msg.receivedAt),
      metadata: msg.metadata,
    };

    const message = await storage.upsertBySourceExternalId(
      msg.platform,
      msg.externalId,
      messageData
    );

    // Link message to parties (recipients)
    for (const party of recipientParties) {
      await storage.linkMessageToParty(message.id, party.id, 'recipient');
    }

    return message;
  }

  /**
   * Get aggregated communications summary for a case
   * Pulls from local cache first, falls back to ChittyConnect
   */
  async getCommunicationsSummary(caseId: string): Promise<CommunicationsSummary> {
    try {
      // Try local cache first
      const [parties, conversations, messages] = await Promise.all([
        storage.findPartiesByCase(caseId),
        storage.listConversationsByCase(caseId),
        storage.listMessagesByCase(caseId),
      ]);

      // If no local data, sync from ChittyConnect
      if (messages.length === 0) {
        await this.syncMessagesFromChittyConnect({ caseId });

        // Re-fetch after sync
        const [partiesAfterSync, conversationsAfterSync, messagesAfterSync] = await Promise.all([
          storage.findPartiesByCase(caseId),
          storage.listConversationsByCase(caseId),
          storage.listMessagesByCase(caseId),
        ]);

        return this.buildSummary(partiesAfterSync, conversationsAfterSync, messagesAfterSync);
      }

      return this.buildSummary(parties, conversations, messages);
    } catch (error) {
      console.error('Error fetching communications summary:', error);
      throw new Error('Failed to fetch communications summary');
    }
  }

  /**
   * Get cross-source messages for timeline generation
   */
  async getCrossSourceMessages(params: {
    caseId: string;
    startDate?: string;
    endDate?: string;
    platforms?: string[];
  }): Promise<CrossSourceMessage[]> {
    // Ensure data is synced from ChittyConnect
    await this.syncMessagesFromChittyConnect(params);

    // Get messages from local storage
    const messages = await storage.listMessagesByCase(params.caseId, {
      startDate: params.startDate,
      endDate: params.endDate,
    });

    return messages.map(msg => ({
      id: msg.id,
      platform: msg.source,
      from: msg.senderPartyId, // TODO: resolve to display name
      to: [], // TODO: resolve recipients
      subject: msg.subject || undefined,
      body: msg.bodyText,
      sentAt: msg.sentAt.toISOString(),
      threadId: msg.externalThreadId,
    }));
  }

  /**
   * Generate timeline entries from messages using AI analysis
   * This calls ChittyConnect's Cognitive-Coordination to extract legal events
   */
  async generateTimelineFromMessages(params: {
    caseId: string;
    conversationId?: string;
  }): Promise<{
    generated: number;
    entries: any[];
  }> {
    const { caseId, conversationId } = params;

    // Get messages
    const messages = conversationId
      ? await storage.listMessagesByConversation(conversationId)
      : await storage.listMessagesByCase(caseId);

    // Use ChittyConnect's Cognitive-Coordination for AI analysis
    const task = await chittyConnect.executeTask({
      task: {
        description: 'Extract legal events from messages for timeline generation',
        type: 'legal_timeline_extraction',
        metadata: {
          caseId,
          messageCount: messages.length,
          platforms: [...new Set(messages.map(m => m.source))],
        },
      },
      sessionId: `case-${caseId}`,
    });

    // TODO: Parse task.result.recommendations to create timeline entries
    // For now, return stub
    return {
      generated: 0,
      entries: [],
    };
  }

  // Helper methods

  private buildSummary(parties: any[], conversations: any[], messages: any[]): CommunicationsSummary {
    const messagesBySource = messages.reduce((acc: any, message: any) => {
      acc[message.source] = (acc[message.source] || 0) + 1;
      return acc;
    }, {});

    return {
      summary: {
        totalParties: parties.length,
        totalConversations: conversations.length,
        totalMessages: messages.length,
        messagesBySource,
      },
      parties: parties.slice(0, 10),
      recentMessages: messages.slice(0, 20),
    };
  }

  private getIdTypeFromPlatform(platform: string, identifier: string): string {
    if (platform === 'email') return 'email';
    if (platform === 'whatsapp') return 'whatsapp_jid';
    if (platform === 'imessage') return 'imessage';
    if (platform === 'openphone') return 'phone';
    if (platform === 'docusign') return 'email'; // DocuSign uses email

    // Try to infer from identifier
    if (identifier.includes('@')) return 'email';
    if (identifier.match(/^\+?\d+$/)) return 'phone';

    return 'other';
  }

  private normalizeIdentifier(identifier: string): string {
    // Email: lowercase
    if (identifier.includes('@')) {
      return identifier.toLowerCase();
    }

    // Phone: digits only
    if (identifier.match(/^\+?\d/)) {
      return identifier.replace(/\D/g, '');
    }

    return identifier.toLowerCase();
  }
}

export const communicationsService = new CommunicationsService();
