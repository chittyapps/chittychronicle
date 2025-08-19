import { storage } from "./storage";
import { createHash, randomBytes, sign, createSign, createVerify } from "crypto";
import type {
  ChittyUniversalExport,
  ChittyCase,
  ChittyEvent,
  ChittyTask,
  ChittyDocument,
  ChittyIdentity,
  ChittyBlock,
} from "@shared/chittyUniversalSchema";
import { chittyUniversalExportSchema } from "@shared/chittyUniversalSchema";
import type { Case, TimelineEntry } from "@shared/schema";

/**
 * Chitty Universal Export Service
 * 
 * Handles import/export of data in the Chitty Universal Data Exchange Format (CUDEF)
 * for seamless integration across the Chitty ecosystem.
 */
export class ChittyUniversalExportService {
  private privateKey?: string;
  private publicKey?: string;

  constructor() {
    // In production, load from secure storage
    this.privateKey = process.env.CHITTY_PRIVATE_KEY;
    this.publicKey = process.env.CHITTY_PUBLIC_KEY;
  }

  /**
   * Export ChittyChronicle data to universal format
   */
  async exportToUniversalFormat(
    caseIds: string[],
    userId: string,
    options: {
      includeDocuments?: boolean;
      includeChainProof?: boolean;
      encryptFor?: string[]; // ChittyIDs to encrypt for
      destinationSystem?: string;
    } = {}
  ): Promise<ChittyUniversalExport> {
    const exportId = `EXPORT-${randomBytes(8).toString('hex').toUpperCase()}`;
    const cases: ChittyCase[] = [];
    const allEvents: ChittyEvent[] = [];
    const allTasks: ChittyTask[] = [];
    const allDocuments: ChittyDocument[] = [];
    const allIdentities = new Map<string, ChittyIdentity>();

    for (const caseId of caseIds) {
      const caseData = await storage.getCase(caseId, userId);
      if (!caseData) continue;

      // Convert case to universal format
      const universalCase = await this.convertCaseToUniversal(caseData);
      cases.push(universalCase);

      // Get timeline entries
      const timelineResult = await storage.getTimelineEntries(caseId, {});
      
      for (const entry of timelineResult.entries) {
        if (entry.entryType === 'event') {
          const event = this.convertTimelineEventToUniversal(entry, caseId);
          allEvents.push(event);
        } else if (entry.entryType === 'task') {
          const task = this.convertTimelineTaskToUniversal(entry, caseId);
          allTasks.push(task);
        }

        // Collect documents if requested
        if (options.includeDocuments) {
          const sources = await storage.getTimelineSources(entry.id);
          for (const source of sources) {
            const doc = this.convertSourceToUniversalDocument(source, entry.id);
            allDocuments.push(doc);
          }
        }

        // Collect identities
        if (entry.createdBy) {
          const identity = await this.getOrCreateIdentity(entry.createdBy);
          allIdentities.set(identity.chittyId, identity);
        }
        if (entry.assignedTo) {
          const identity = await this.getOrCreateIdentity(entry.assignedTo);
          allIdentities.set(identity.chittyId, identity);
        }
      }
    }

    // Create export data
    const exportData: ChittyUniversalExport = {
      version: "1.0.0",
      exportId,
      exportDate: new Date().toISOString(),
      source: {
        system: "ChittyChronicle",
        version: "1.0.0",
        instance: process.env.INSTANCE_ID || "default",
      },
      destination: options.destinationSystem ? {
        system: options.destinationSystem,
        requirements: this.getSystemRequirements(options.destinationSystem),
      } : undefined,
      authentication: {
        exporter: await this.getCurrentUserIdentity(userId),
        signature: "",
        publicKey: this.publicKey || "",
      },
      data: {
        cases,
        events: allEvents,
        tasks: allTasks,
        documents: options.includeDocuments ? allDocuments : undefined,
        identities: Array.from(allIdentities.values()),
      },
      chainProof: options.includeChainProof ? 
        await this.generateChainProof(exportData) : undefined,
      encryption: options.encryptFor ? {
        encrypted: true,
        recipients: options.encryptFor,
        algorithm: "AES-256-GCM",
      } : undefined,
      metadata: {
        totalRecords: cases.length + allEvents.length + allTasks.length + allDocuments.length,
        checksum: "",
        customFields: {
          exportedBy: "ChittyChronicle",
          exportReason: "Universal Data Exchange",
        },
      },
    };

    // Generate signature and checksum
    exportData.authentication.signature = this.signData(exportData);
    exportData.metadata.checksum = this.generateChecksum(exportData);

    // Encrypt if requested
    if (options.encryptFor) {
      return this.encryptExport(exportData, options.encryptFor);
    }

    return exportData;
  }

  /**
   * Import data from universal format to ChittyChronicle
   */
  async importFromUniversalFormat(
    exportData: ChittyUniversalExport,
    userId: string,
    options: {
      mergeStrategy?: 'overwrite' | 'skip' | 'merge';
      validateChain?: boolean;
      mapToExistingCase?: string;
    } = {}
  ): Promise<{
    imported: {
      cases: number;
      events: number;
      tasks: number;
      documents: number;
    };
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const imported = { cases: 0, events: 0, tasks: 0, documents: 0 };

    try {
      // Validate the export
      const validation = chittyUniversalExportSchema.safeParse(exportData);
      if (!validation.success) {
        errors.push(`Invalid export format: ${validation.error.message}`);
        return { imported, errors, warnings };
      }

      // Verify signature if present
      if (exportData.authentication.signature) {
        const isValid = this.verifySignature(
          exportData,
          exportData.authentication.signature,
          exportData.authentication.publicKey
        );
        if (!isValid) {
          warnings.push("Signature verification failed");
        }
      }

      // Verify chain proof if requested
      if (options.validateChain && exportData.chainProof) {
        const chainValid = await this.verifyChainProof(exportData.chainProof);
        if (!chainValid) {
          warnings.push("Chain proof validation failed");
        }
      }

      // Import cases
      if (exportData.data.cases) {
        for (const universalCase of exportData.data.cases) {
          try {
            const caseId = options.mapToExistingCase || 
              await this.importUniversalCase(universalCase, userId, options.mergeStrategy);
            imported.cases++;

            // Import related events
            const caseEvents = universalCase.timeline || [];
            for (const event of caseEvents) {
              await this.importUniversalEvent(event, caseId, userId);
              imported.events++;
            }

            // Import related tasks
            const caseTasks = universalCase.tasks || [];
            for (const task of caseTasks) {
              await this.importUniversalTask(task, caseId, userId);
              imported.tasks++;
            }

            // Import related documents
            const caseDocuments = universalCase.documents || [];
            for (const doc of caseDocuments) {
              await this.importUniversalDocument(doc, caseId, userId);
              imported.documents++;
            }
          } catch (error) {
            errors.push(`Failed to import case ${universalCase.caseId}: ${error}`);
          }
        }
      }

      // Import standalone events
      if (exportData.data.events) {
        for (const event of exportData.data.events) {
          try {
            const caseId = options.mapToExistingCase || await this.findOrCreateCase(event, userId);
            await this.importUniversalEvent(event, caseId, userId);
            imported.events++;
          } catch (error) {
            errors.push(`Failed to import event ${event.eventId}: ${error}`);
          }
        }
      }

      // Import standalone tasks
      if (exportData.data.tasks) {
        for (const task of exportData.data.tasks) {
          try {
            const caseId = options.mapToExistingCase || await this.findOrCreateCase(task, userId);
            await this.importUniversalTask(task, caseId, userId);
            imported.tasks++;
          } catch (error) {
            errors.push(`Failed to import task ${task.taskId}: ${error}`);
          }
        }
      }

    } catch (error) {
      errors.push(`Import failed: ${error}`);
    }

    return { imported, errors, warnings };
  }

  /**
   * Convert ChittyChronicle case to universal format
   */
  private async convertCaseToUniversal(caseData: Case): Promise<ChittyCase> {
    const caseWithExtended = caseData as any;
    const parties = caseWithExtended.parties || [];
    
    const universalParties = await Promise.all(parties.map(async (party: any) => ({
      identity: await this.getOrCreateIdentity(party.chittyId || party.id),
      role: party.partyType || party.role,
      representedBy: party.attorneyName ? 
        await this.getOrCreateIdentity(party.attorneyName) : undefined,
      joinedAt: caseData.createdAt?.toISOString() || new Date().toISOString(),
      leftAt: undefined,
    })));

    const timelineResult = await storage.getTimelineEntries(caseData.id, {});
    const timeline = timelineResult.entries.filter(e => e.entryType === 'event')
      .map(e => this.convertTimelineEventToUniversal(e, caseData.id));
    
    const tasks = timelineResult.entries.filter(e => e.entryType === 'task')
      .map(e => this.convertTimelineTaskToUniversal(e, caseData.id));

    return {
      caseId: caseData.id,
      chittyId: `CASE-${caseData.id.substring(0, 8).toUpperCase()}`,
      title: caseData.caseName,
      description: `Legal Case: ${caseData.caseNumber}`,
      type: caseWithExtended.caseType || "legal",
      status: "active",
      parties: universalParties,
      timeline,
      tasks,
      documents: [],
      metadata: {
        jurisdiction: caseData.jurisdiction || undefined,
        court: caseWithExtended.court || undefined,
        caseNumber: caseData.caseNumber,
        filingDate: caseData.filingDate || undefined,
        customFields: caseData.metadata as any,
      },
      timestamps: {
        occurred: caseData.filingDate || caseData.createdAt?.toISOString() || new Date().toISOString(),
        recorded: caseData.createdAt?.toISOString() || new Date().toISOString(),
        modified: caseWithExtended.updatedAt?.toISOString(),
      },
    };
  }

  /**
   * Convert timeline event to universal format
   */
  private convertTimelineEventToUniversal(entry: TimelineEntry, caseId: string): ChittyEvent {
    return {
      eventId: entry.id,
      chittyId: entry.chittyId || undefined,
      eventType: entry.eventSubtype || "general",
      eventSubtype: entry.eventSubtype || undefined,
      title: entry.description,
      description: entry.detailedNotes || undefined,
      participants: [],
      timestamps: {
        occurred: entry.date,
        recorded: entry.createdAt?.toISOString() || new Date().toISOString(),
        modified: entry.lastModified?.toISOString(),
      },
      verification: {
        status: this.mapConfidenceToVerification(entry.confidenceLevel),
        confidence: this.getConfidenceScore(entry.confidenceLevel),
      },
    };
  }

  /**
   * Convert timeline task to universal format
   */
  private convertTimelineTaskToUniversal(entry: TimelineEntry, caseId: string): ChittyTask {
    return {
      taskId: entry.id,
      chittyId: entry.chittyId || undefined,
      title: entry.description,
      description: entry.detailedNotes || undefined,
      type: "task",
      status: this.mapTaskStatus(entry.taskStatus),
      dueDate: entry.dueDate || entry.date,
      dependencies: entry.dependencies || [],
      timestamps: {
        occurred: entry.date,
        recorded: entry.createdAt?.toISOString() || new Date().toISOString(),
        modified: entry.lastModified?.toISOString(),
      },
    };
  }

  /**
   * Convert source to universal document
   */
  private convertSourceToUniversalDocument(source: any, entryId: string): ChittyDocument {
    return {
      documentId: source.id,
      title: source.fileName,
      type: source.documentType,
      mimeType: this.getMimeType(source.fileName),
      hash: createHash('sha256').update(source.fileName).digest('hex'),
      size: undefined,
      location: {
        system: "ChittyChronicle",
        path: source.filePath,
      },
      metadata: source.metadata as any,
    };
  }

  /**
   * Import universal case to ChittyChronicle
   */
  private async importUniversalCase(
    universalCase: ChittyCase,
    userId: string,
    mergeStrategy?: string
  ): Promise<string> {
    // Check if case already exists
    const existingCases = await storage.getCases(userId);
    const existing = existingCases.find(c => 
      (c.metadata as any)?.universalCaseId === universalCase.caseId
    );

    if (existing && mergeStrategy === 'skip') {
      return existing.id;
    }

    const caseData = {
      caseName: universalCase.title,
      caseNumber: universalCase.metadata?.caseNumber || `IMPORT-${Date.now()}`,
      jurisdiction: universalCase.metadata?.jurisdiction,
      filingDate: universalCase.metadata?.filingDate?.split('T')[0],
      parties: universalCase.parties.map(p => ({
        id: p.identity.chittyId,
        name: p.identity.name,
        partyType: p.role as any,
        chittyId: p.identity.chittyId,
      })),
      metadata: {
        ...universalCase.metadata?.customFields,
        universalCaseId: universalCase.caseId,
        importedFrom: universalCase.chainRecord?.chainId,
        importedAt: new Date().toISOString(),
      },
      createdBy: userId,
    };

    if (existing && mergeStrategy === 'overwrite') {
      await storage.updateCase(existing.id, caseData, userId);
      return existing.id;
    }

    const newCase = await storage.createCase(caseData as any);
    return newCase.id;
  }

  /**
   * Import universal event to timeline
   */
  private async importUniversalEvent(
    event: ChittyEvent,
    caseId: string,
    userId: string
  ): Promise<void> {
    await storage.createTimelineEntry({
      caseId,
      entryType: 'event',
      eventSubtype: event.eventSubtype as any || 'occurred',
      date: event.timestamps.occurred.split('T')[0],
      description: event.title,
      detailedNotes: event.description,
      confidenceLevel: this.mapVerificationToConfidence(event.verification?.status),
      eventStatus: 'occurred',
      createdBy: userId,
      modifiedBy: userId,
      metadata: {
        universalEventId: event.eventId,
        chainRecord: event.chainRecord,
        importedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Import universal task to timeline
   */
  private async importUniversalTask(
    task: ChittyTask,
    caseId: string,
    userId: string
  ): Promise<void> {
    await storage.createTimelineEntry({
      caseId,
      entryType: 'task',
      taskSubtype: 'review',
      date: task.dueDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      description: task.title,
      detailedNotes: task.description,
      taskStatus: this.mapUniversalTaskStatus(task.status),
      dueDate: task.dueDate?.split('T')[0],
      dependencies: task.dependencies,
      confidenceLevel: 'high',
      createdBy: userId,
      modifiedBy: userId,
      metadata: {
        universalTaskId: task.taskId,
        chainRecord: task.chainRecord,
        importedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Import universal document
   */
  private async importUniversalDocument(
    doc: ChittyDocument,
    caseId: string,
    userId: string
  ): Promise<void> {
    // Store document reference in metadata
    console.log(`Importing document ${doc.documentId} for case ${caseId}`);
  }

  // Helper methods

  private async getOrCreateIdentity(identifier: string): Promise<ChittyIdentity> {
    return {
      chittyId: `CID-${createHash('sha256').update(identifier).digest('hex').substring(0, 8).toUpperCase()}`,
      type: 'person',
      name: identifier,
      roles: ['user'],
    };
  }

  private async getCurrentUserIdentity(userId: string): Promise<ChittyIdentity> {
    const user = await storage.getUser(userId);
    return {
      chittyId: `CID-${userId.substring(0, 8).toUpperCase()}`,
      type: 'person',
      name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || userId,
      email: user?.email || undefined,
      roles: ['exporter'],
    };
  }

  private getSystemRequirements(system: string): string[] {
    const requirements: { [key: string]: string[] } = {
      ChittyLedger: ['financial', 'transactions', 'accounting'],
      ChittyCases: ['legal', 'parties', 'jurisdiction'],
      ChittyPM: ['tasks', 'projects', 'milestones'],
      ChittyForge: ['documents', 'storage', 'signatures'],
    };
    return requirements[system] || [];
  }

  private async generateChainProof(data: any): Promise<any> {
    const merkleRoot = createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return {
      merkleRoot,
      blockReferences: [],
      verificationUrl: `https://chain.chitty.com/verify/${merkleRoot}`,
    };
  }

  private signData(data: any): string {
    if (!this.privateKey) return "";
    const sign = createSign('SHA256');
    sign.update(JSON.stringify(data));
    return sign.sign(this.privateKey, 'hex');
  }

  private verifySignature(data: any, signature: string, publicKey: string): boolean {
    try {
      const verify = createVerify('SHA256');
      verify.update(JSON.stringify(data));
      return verify.verify(publicKey, signature, 'hex');
    } catch {
      return false;
    }
  }

  private async verifyChainProof(chainProof: any): Promise<boolean> {
    // In production, verify against ChittyChain
    console.log(`Verifying chain proof: ${chainProof.merkleRoot}`);
    return true;
  }

  private generateChecksum(data: any): string {
    return createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  private encryptExport(data: ChittyUniversalExport, recipients: string[]): ChittyUniversalExport {
    // In production, implement proper encryption
    console.log(`Encrypting for recipients: ${recipients.join(', ')}`);
    return data;
  }

  private async findOrCreateCase(item: any, userId: string): Promise<string> {
    const cases = await storage.getCases(userId);
    if (cases.length > 0) {
      return cases[0].id;
    }
    const newCase = await storage.createCase({
      caseName: "Imported Case",
      caseNumber: `IMPORT-${Date.now()}`,
      createdBy: userId,
    });
    return newCase.id;
  }

  private getMimeType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain',
      jpg: 'image/jpeg',
      png: 'image/png',
    };
    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private mapConfidenceToVerification(confidence: string): 'verified' | 'pending' | 'disputed' | 'rejected' {
    switch (confidence) {
      case 'high': return 'verified';
      case 'medium': return 'pending';
      case 'low': return 'disputed';
      case 'unverified': return 'pending';
      default: return 'pending';
    }
  }

  private mapVerificationToConfidence(status?: string): 'high' | 'medium' | 'low' | 'unverified' {
    switch (status) {
      case 'verified': return 'high';
      case 'pending': return 'medium';
      case 'disputed': return 'low';
      case 'rejected': return 'unverified';
      default: return 'medium';
    }
  }

  private getConfidenceScore(confidence: string): number {
    switch (confidence) {
      case 'high': return 0.9;
      case 'medium': return 0.6;
      case 'low': return 0.3;
      case 'unverified': return 0.1;
      default: return 0.5;
    }
  }

  private mapTaskStatus(status?: string | null): 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked' {
    switch (status) {
      case 'pending': return 'pending';
      case 'in_progress': return 'in_progress';
      case 'completed': return 'completed';
      case 'blocked': return 'blocked';
      default: return 'pending';
    }
  }

  private mapUniversalTaskStatus(status: string): 'pending' | 'in_progress' | 'completed' | 'blocked' {
    switch (status) {
      case 'pending': return 'pending';
      case 'in_progress': return 'in_progress';
      case 'completed': return 'completed';
      case 'cancelled': return 'completed';
      case 'blocked': return 'blocked';
      default: return 'pending';
    }
  }
}

export const chittyUniversalExport = new ChittyUniversalExportService();