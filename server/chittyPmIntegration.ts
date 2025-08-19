import { storage } from "./storage";
import type { Case, TimelineEntry } from "@shared/schema";

// Real ChittyPM integration service
export interface ChittyPmProject {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  status: 'active' | 'archived' | 'completed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate?: string;
  endDate?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChittyPmTask {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigneeId?: string;
  dueDate?: string;
  dependencies?: string[];
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChittyPmActivity {
  id: string;
  type: string;
  description: string;
  projectId?: string;
  taskId?: string;
  userId?: string;
  agentId?: string;
  metadata?: any;
  createdAt: Date;
}

export class ChittyPmIntegrationService {
  private baseUrl: string;
  private wsUrl: string;
  private ws?: WebSocket;

  constructor() {
    // In production, these would be environment variables
    this.baseUrl = process.env.CHITTYPM_API_URL || 'http://localhost:5001/api';
    this.wsUrl = process.env.CHITTYPM_WS_URL || 'ws://localhost:5001/ws';
  }

  // Connect to ChittyPM WebSocket for real-time updates
  async connectWebSocket(caseId: string): Promise<void> {
    if (typeof WebSocket === 'undefined') {
      console.log('WebSocket not available in this environment');
      return;
    }

    this.ws = new WebSocket(this.wsUrl);
    
    this.ws.onopen = () => {
      console.log('Connected to ChittyPM WebSocket');
      // Register as ChittyChronicle agent
      this.ws?.send(JSON.stringify({
        type: 'agent_register',
        name: `ChittyChronicle-${caseId}`,
        agentType: 'timeline_manager',
        capabilities: ['timeline_sync', 'task_creation', 'deadline_tracking'],
        sessionId: `timeline-${caseId}-${Date.now()}`
      }));
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleWebSocketMessage(message, caseId);
    };

    this.ws.onerror = (error) => {
      console.error('ChittyPM WebSocket error:', error);
    };
  }

  private async handleWebSocketMessage(message: any, caseId: string) {
    switch (message.type) {
      case 'task_updated':
        // Sync task update to timeline
        await this.syncTaskToTimeline(message.task, caseId);
        break;
      
      case 'project_updated':
        // Update case metadata with project changes
        await this.syncProjectToCase(message.project, caseId);
        break;
      
      case 'activity_created':
        // Log activity in timeline if relevant
        if (message.activity.type.includes('deadline') || message.activity.type.includes('task')) {
          await this.createTimelineFromActivity(message.activity, caseId);
        }
        break;
    }
  }

  // Create a ChittyPM project from a case
  async createProjectFromCase(caseData: Case, userId: string): Promise<ChittyPmProject> {
    const projectData = {
      name: caseData.caseName,
      description: `Legal case: ${caseData.caseNumber}`,
      ownerId: userId,
      status: 'active' as const,
      priority: 'high' as const,
      startDate: caseData.filingDate || undefined,
      endDate: caseData.trialDate || undefined,
      metadata: {
        caseId: caseData.id,
        caseNumber: caseData.caseNumber,
        jurisdiction: caseData.jurisdiction,
        isLegalCase: true
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create ChittyPM project: ${response.statusText}`);
      }

      const project = await response.json();
      
      // Store the project ID in the case
      await storage.updateCase(caseData.id, {
        chittyPmProjectId: project.id,
        metadata: {
          ...(caseData.metadata as any),
          chittyPmIntegration: {
            projectId: project.id,
            syncedAt: new Date().toISOString()
          }
        }
      }, userId);

      return project;
    } catch (error) {
      console.error('Error creating ChittyPM project:', error);
      throw error;
    }
  }

  // Sync timeline entries to ChittyPM tasks
  async syncTimelineToTasks(caseId: string, projectId: string): Promise<{ synced: number; errors: string[] }> {
    const result = await storage.getTimelineEntries(caseId, {});
    const entries = result.entries;
    let synced = 0;
    const errors: string[] = [];

    for (const entry of entries) {
      if (entry.entryType === 'task') {
        try {
          await this.createTaskFromTimelineEntry(entry, projectId);
          synced++;
        } catch (error) {
          errors.push(`Failed to sync entry ${entry.id}: ${error}`);
        }
      }
    }

    return { synced, errors };
  }

  // Create a ChittyPM task from a timeline entry
  async createTaskFromTimelineEntry(entry: TimelineEntry, projectId: string): Promise<ChittyPmTask> {
    const taskData = {
      projectId,
      title: entry.description,
      description: entry.detailedNotes || undefined,
      status: this.mapTimelineStatusToTaskStatus(entry.taskStatus),
      priority: this.mapConfidenceToPriority(entry.confidenceLevel),
      assigneeId: entry.assignedTo || undefined,
      dueDate: entry.dueDate || entry.date,
      dependencies: entry.dependencies || [],
      metadata: {
        timelineEntryId: entry.id,
        chittyId: entry.chittyId,
        originalType: entry.entryType,
        subtype: entry.taskSubtype
      }
    };

    const response = await fetch(`${this.baseUrl}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create ChittyPM task: ${response.statusText}`);
    }

    return await response.json();
  }

  // Sync ChittyPM task updates back to timeline
  async syncTaskToTimeline(task: ChittyPmTask, caseId: string): Promise<void> {
    const metadata = task.metadata as any;
    if (!metadata?.timelineEntryId) {
      // Create new timeline entry from ChittyPM task
      await storage.createTimelineEntry({
        caseId,
        entryType: 'task',
        taskSubtype: 'review',
        date: task.dueDate || new Date().toISOString().split('T')[0],
        description: task.title,
        detailedNotes: task.description || undefined,
        taskStatus: this.mapTaskStatusToTimeline(task.status),
        confidenceLevel: 'high',
        createdBy: 'chittypm-sync',
        modifiedBy: 'chittypm-sync',
        metadata: {
          chittyPmTaskId: task.id,
          syncedFrom: 'chittypm',
          syncedAt: new Date().toISOString()
        }
      });
    } else {
      // Update existing timeline entry
      await storage.updateTimelineEntry(
        metadata.timelineEntryId,
        {
          taskStatus: this.mapTaskStatusToTimeline(task.status),
          description: task.title,
          detailedNotes: task.description || undefined,
          dueDate: task.dueDate || undefined,
          assignedTo: task.assigneeId || undefined
        },
        'chittypm-sync'
      );
    }
  }

  // Sync ChittyPM project updates to case
  async syncProjectToCase(project: ChittyPmProject, caseId: string): Promise<void> {
    const metadata = project.metadata as any;
    if (metadata?.caseId === caseId) {
      await storage.updateCase(caseId, {
        metadata: {
          chittyPmProject: {
            ...project,
            lastSyncedAt: new Date().toISOString()
          }
        }
      }, 'chittypm-sync');
    }
  }

  // Create timeline entry from ChittyPM activity
  async createTimelineFromActivity(activity: ChittyPmActivity, caseId: string): Promise<void> {
    const description = activity.description;
    const isDeadline = activity.type.includes('deadline');
    const isTask = activity.type.includes('task');

    await storage.createTimelineEntry({
      caseId,
      entryType: isTask ? 'task' : 'event',
      eventSubtype: isDeadline ? 'deadline' : 'occurred',
      taskSubtype: isTask ? 'review' : undefined,
      date: new Date().toISOString().split('T')[0],
      description: `[ChittyPM Activity] ${description}`,
      confidenceLevel: 'medium',
      eventStatus: isTask ? undefined : 'occurred',
      taskStatus: isTask ? 'pending' : undefined,
      createdBy: 'chittypm-sync',
      modifiedBy: 'chittypm-sync',
      metadata: {
        chittyPmActivityId: activity.id,
        activityType: activity.type,
        syncedAt: new Date().toISOString()
      }
    });
  }

  // Fetch ChittyPM project details
  async getProject(projectId: string): Promise<ChittyPmProject> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ChittyPM project: ${response.statusText}`);
    }
    return await response.json();
  }

  // Fetch tasks for a project
  async getProjectTasks(projectId: string): Promise<ChittyPmTask[]> {
    const response = await fetch(`${this.baseUrl}/projects/${projectId}/tasks`);
    if (!response.ok) {
      throw new Error(`Failed to fetch ChittyPM tasks: ${response.statusText}`);
    }
    return await response.json();
  }

  // Utility methods for status mapping
  private mapTimelineStatusToTaskStatus(status?: string | null): 'todo' | 'in_progress' | 'done' | 'blocked' {
    switch (status) {
      case 'pending': return 'todo';
      case 'in_progress': return 'in_progress';
      case 'completed': return 'done';
      case 'blocked': return 'blocked';
      default: return 'todo';
    }
  }

  private mapTaskStatusToTimeline(status: string): 'pending' | 'in_progress' | 'completed' | 'blocked' {
    switch (status) {
      case 'todo': return 'pending';
      case 'in_progress': return 'in_progress';
      case 'done': return 'completed';
      case 'blocked': return 'blocked';
      default: return 'pending';
    }
  }

  private mapConfidenceToPriority(confidence: string): 'low' | 'medium' | 'high' | 'urgent' {
    switch (confidence) {
      case 'high': return 'high';
      case 'medium': return 'medium';
      case 'low': return 'low';
      case 'unverified': return 'low';
      default: return 'medium';
    }
  }

  // Disconnect WebSocket
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = undefined;
    }
  }
}

export const chittyPmIntegration = new ChittyPmIntegrationService();