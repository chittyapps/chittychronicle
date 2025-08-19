import { storage } from "./storage";
import type { 
  TimelineEntry, 
  InsertTimelineEntry, 
  TimelineSource,
  InsertTimelineSource,
  InsertTimelineContradiction 
} from "@shared/schema";

export interface TimelineValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DeadlineInfo {
  entry: TimelineEntry;
  daysUntilDue: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  isOverdue: boolean;
}

export interface ContradictionDetail {
  entry1: TimelineEntry;
  entry2: TimelineEntry;
  contradictionType: 'date_conflict' | 'status_conflict' | 'dependency_conflict' | 'factual_conflict';
  description: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedResolution?: string;
}

export interface TimelineExport {
  caseId: string;
  caseName: string;
  exportDate: string;
  entries: TimelineEntry[];
  sources: { [entryId: string]: TimelineSource[] };
  contradictions: ContradictionDetail[];
  deadlines: DeadlineInfo[];
  summary: {
    totalEntries: number;
    taskCount: number;
    eventCount: number;
    verifiedCount: number;
    unverifiedCount: number;
    overdueCount: number;
    upcomingDeadlines: number;
    contradictionCount: number;
  };
}

export class TimelineService {
  
  // Validate timeline entry before creation/update
  async validateTimelineEntry(entry: Partial<InsertTimelineEntry>): Promise<TimelineValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Required field validation
    if (!entry.date) errors.push("Date is required");
    if (!entry.description) errors.push("Description is required");
    if (!entry.entryType) errors.push("Entry type is required");
    if (!entry.caseId) errors.push("Case ID is required");
    
    // Type-specific validation
    if (entry.entryType === 'task') {
      if (!entry.taskSubtype) warnings.push("Task subtype is recommended for tasks");
      if (!entry.taskStatus) entry.taskStatus = 'pending';
      if (!entry.assignedTo) warnings.push("Consider assigning this task to someone");
      if (!entry.dueDate) warnings.push("Tasks should have a due date");
      
      // Validate task status transitions
      if (entry.taskStatus === 'completed') {
        const metadata = entry.metadata as any;
        if (!metadata?.completedAt) {
          warnings.push("Completed tasks should have a completion timestamp");
        }
      }
    }
    
    if (entry.entryType === 'event') {
      if (!entry.eventSubtype) warnings.push("Event subtype is recommended for events");
      if (!entry.eventStatus) entry.eventStatus = 'occurred';
      
      // Check if event date is in the future
      const eventDate = new Date(entry.date);
      const today = new Date();
      if (eventDate > today && entry.eventStatus === 'occurred') {
        errors.push("Cannot mark future events as occurred");
      }
    }
    
    // Date validation
    if (entry.date) {
      const date = new Date(entry.date!);
      if (isNaN(date.getTime())) {
        errors.push("Invalid date format");
      }
    }
    
    // Dependency validation
    if (entry.dependencies && entry.dependencies.length > 0) {
      for (const depId of entry.dependencies) {
        const depEntry = await storage.getTimelineEntry(depId, entry.caseId!);
        if (!depEntry) {
          errors.push(`Dependency ${depId} does not exist`);
        } else if (depEntry.date > entry.date!) {
          warnings.push(`This entry depends on a future event (${depEntry.description})`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  // Enhanced timeline entry creation with validation
  async createValidatedTimelineEntry(entryData: InsertTimelineEntry): Promise<TimelineEntry> {
    const validation = await this.validateTimelineEntry(entryData);
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Add metadata for tracking
    const enhancedData = {
      ...entryData,
      metadata: {
        ...(typeof entryData.metadata === 'object' ? entryData.metadata : {}),
        createdAt: new Date().toISOString(),
        validationWarnings: validation.warnings.length > 0 ? validation.warnings : undefined
      }
    };
    
    return await storage.createTimelineEntry(enhancedData);
  }
  
  // Calculate deadlines with priority
  async calculateDeadlines(caseId: string, daysAhead: number = 30): Promise<DeadlineInfo[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const entries = await storage.getUpcomingDeadlines(caseId, daysAhead);
    
    return entries.map(entry => {
      const dueDate = new Date(entry.dueDate || entry.date);
      dueDate.setHours(0, 0, 0, 0);
      
      const diffTime = dueDate.getTime() - today.getTime();
      const daysUntilDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Determine priority
      let priority: 'urgent' | 'high' | 'medium' | 'low';
      if (daysUntilDue < 0) {
        priority = 'urgent'; // Overdue
      } else if (daysUntilDue <= 3) {
        priority = 'urgent';
      } else if (daysUntilDue <= 7) {
        priority = 'high';
      } else if (daysUntilDue <= 14) {
        priority = 'medium';
      } else {
        priority = 'low';
      }
      
      return {
        entry,
        daysUntilDue,
        priority,
        isOverdue: daysUntilDue < 0
      };
    }).sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }
  
  // Advanced contradiction detection
  async detectDetailedContradictions(caseId: string): Promise<ContradictionDetail[]> {
    const result = await storage.getTimelineEntries(caseId, {});
    const entries = result.entries;
    const contradictions: ContradictionDetail[] = [];
    
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const entry1 = entries[i];
        const entry2 = entries[j];
        
        // Date conflicts for same events
        if (entry1.description.toLowerCase() === entry2.description.toLowerCase() && 
            entry1.date !== entry2.date) {
          contradictions.push({
            entry1,
            entry2,
            contradictionType: 'date_conflict',
            description: `Same event "${entry1.description}" has conflicting dates: ${entry1.date} vs ${entry2.date}`,
            severity: 'critical',
            suggestedResolution: 'Verify the correct date and update or remove the incorrect entry'
          });
        }
        
        // Task status conflicts
        if (entry1.entryType === 'task' && entry2.entryType === 'task' &&
            entry1.taskStatus === 'completed' && entry2.taskStatus === 'pending' &&
            entry1.dependencies?.includes(entry2.id)) {
          contradictions.push({
            entry1,
            entry2,
            contradictionType: 'dependency_conflict',
            description: `Task "${entry1.description}" marked as completed but depends on pending task "${entry2.description}"`,
            severity: 'major',
            suggestedResolution: 'Review task dependencies and update status accordingly'
          });
        }
        
        // Event status conflicts
        if (entry1.eventSubtype === 'deadline' && entry2.eventSubtype === 'deadline' &&
            Math.abs(new Date(entry1.date).getTime() - new Date(entry2.date).getTime()) < 24 * 60 * 60 * 1000 &&
            entry1.description.includes('filing') && entry2.description.includes('filing')) {
          contradictions.push({
            entry1,
            entry2,
            contradictionType: 'date_conflict',
            description: `Multiple filing deadlines on same/adjacent days may be duplicates`,
            severity: 'minor',
            suggestedResolution: 'Verify if these are separate deadlines or duplicates'
          });
        }
        
        // Factual conflicts based on confidence levels
        if (entry1.confidenceLevel === 'high' && entry2.confidenceLevel === 'low' &&
            this.detectFactualConflict(entry1.description, entry2.description)) {
          contradictions.push({
            entry1,
            entry2,
            contradictionType: 'factual_conflict',
            description: `High confidence entry conflicts with low confidence entry`,
            severity: 'minor',
            suggestedResolution: 'Verify the low confidence entry or consider removing it'
          });
        }
      }
    }
    
    // Store detected contradictions
    for (const contradiction of contradictions) {
      const contradictionData: InsertTimelineContradiction = {
        entryId: contradiction.entry1.id,
        conflictingEntryId: contradiction.entry2.id,
        natureOfConflict: contradiction.description,
        resolution: null,
        resolvedBy: null,
        resolvedDate: null
        /* metadata: {
          type: contradiction.contradictionType,
          suggestedResolution: contradiction.suggestedResolution
        } */
      };
      
      try {
        await storage.createTimelineContradiction(contradictionData);
      } catch (error) {
        // Contradiction might already exist
        console.log(`Contradiction already recorded or error: ${error}`);
      }
    }
    
    return contradictions;
  }
  
  private detectFactualConflict(desc1: string, desc2: string): boolean {
    const conflictPairs = [
      ['filed', 'not filed'],
      ['served', 'not served'],
      ['completed', 'pending'],
      ['approved', 'denied'],
      ['granted', 'denied'],
      ['present', 'absent'],
      ['guilty', 'not guilty']
    ];
    
    const desc1Lower = desc1.toLowerCase();
    const desc2Lower = desc2.toLowerCase();
    
    for (const [term1, term2] of conflictPairs) {
      if ((desc1Lower.includes(term1) && desc2Lower.includes(term2)) ||
          (desc1Lower.includes(term2) && desc2Lower.includes(term1))) {
        return true;
      }
    }
    
    return false;
  }
  
  // Export timeline with all related data
  async exportTimeline(caseId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<TimelineExport | string> {
    const caseData = await storage.getCase(caseId, '');
    const result = await storage.getTimelineEntries(caseId, {});
    const entries = result.entries;
    const contradictions = await this.detectDetailedContradictions(caseId);
    const deadlines = await this.calculateDeadlines(caseId, 90);
    
    // Get sources for each entry
    const sources: { [entryId: string]: TimelineSource[] } = {};
    for (const entry of entries) {
      sources[entry.id] = await storage.getTimelineSources(entry.id);
    }
    
    const exportData: TimelineExport = {
      caseId,
      caseName: caseData?.caseName || 'Unknown Case',
      exportDate: new Date().toISOString(),
      entries,
      sources,
      contradictions,
      deadlines,
      summary: {
        totalEntries: entries.length,
        taskCount: entries.filter(e => e.entryType === 'task').length,
        eventCount: entries.filter(e => e.entryType === 'event').length,
        verifiedCount: entries.filter(e => e.confidenceLevel === 'high').length,
        unverifiedCount: entries.filter(e => e.confidenceLevel === 'low' || e.confidenceLevel === 'unverified').length,
        overdueCount: deadlines.filter(d => d.isOverdue).length,
        upcomingDeadlines: deadlines.filter(d => !d.isOverdue && d.daysUntilDue <= 30).length,
        contradictionCount: contradictions.length
      }
    };
    
    if (format === 'json') {
      return exportData;
    } else if (format === 'csv') {
      return this.convertToCSV(exportData);
    } else {
      // PDF generation would require additional library
      return this.generatePDFContent(exportData);
    }
  }
  
  private convertToCSV(data: TimelineExport): string {
    const headers = ['Date', 'Type', 'Subtype', 'Description', 'Status', 'Confidence', 'Assigned To', 'Sources'];
    const rows = data.entries.map(entry => [
      entry.date,
      entry.entryType,
      entry.eventSubtype || entry.taskSubtype || '',
      entry.description,
      entry.eventStatus || entry.taskStatus || '',
      entry.confidenceLevel,
      entry.assignedTo || '',
      data.sources[entry.id]?.map(s => s.fileName).join('; ') || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    return csvContent;
  }
  
  private generatePDFContent(data: TimelineExport): string {
    // This would be replaced with actual PDF generation
    return `
TIMELINE REPORT
===============
Case: ${data.caseName}
Export Date: ${data.exportDate}

SUMMARY
-------
Total Entries: ${data.summary.totalEntries}
Tasks: ${data.summary.taskCount}
Events: ${data.summary.eventCount}
Verified: ${data.summary.verifiedCount}
Unverified: ${data.summary.unverifiedCount}
Overdue: ${data.summary.overdueCount}
Upcoming Deadlines: ${data.summary.upcomingDeadlines}
Contradictions: ${data.summary.contradictionCount}

TIMELINE ENTRIES
----------------
${data.entries.map(entry => `
${entry.date} - ${entry.entryType.toUpperCase()}: ${entry.description}
  Status: ${entry.eventStatus || entry.taskStatus || 'N/A'}
  Confidence: ${entry.confidenceLevel}
  ${entry.assignedTo ? `Assigned to: ${entry.assignedTo}` : ''}
`).join('\n')}

CONTRADICTIONS
--------------
${data.contradictions.map(c => `
${c.severity.toUpperCase()}: ${c.description}
  Suggested Resolution: ${c.suggestedResolution || 'Manual review required'}
`).join('\n')}

UPCOMING DEADLINES
------------------
${data.deadlines.filter(d => !d.isOverdue).map(d => `
${d.entry.date} - ${d.priority.toUpperCase()} PRIORITY: ${d.entry.description}
  Days until due: ${d.daysUntilDue}
`).join('\n')}
    `;
  }
  
  // Link source documents to timeline entries
  async linkSourceDocument(
    entryId: string, 
    source: Omit<InsertTimelineSource, 'entryId'>
  ): Promise<TimelineSource> {
    const sourceData = {
      ...source,
      entryId,
      verificationStatus: source.verificationStatus || 'pending' as const
    };
    
    return await storage.createTimelineSource(sourceData);
  }
  
  // Update verification status
  async updateVerificationStatus(
    entryId: string,
    sourceId: string,
    status: 'verified' | 'pending' | 'failed',
    notes?: string
  ): Promise<void> {
    // This would update the source verification status
    // Implementation would require adding an update method to storage
    console.log(`Updating verification status for source ${sourceId} to ${status}`);
  }
}

export const timelineService = new TimelineService();