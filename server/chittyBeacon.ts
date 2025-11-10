import { WebSocket } from 'ws';
import EventEmitter from 'events';
import { storage } from './storage';
import type { TimelineEntry, Case } from '@shared/schema';

interface BeaconAlert {
  id: string;
  type: 'deadline' | 'contradiction' | 'update' | 'verification' | 'milestone';
  severity: 'critical' | 'high' | 'medium' | 'low';
  caseId: string;
  entryId?: string;
  title: string;
  message: string;
  timestamp: Date;
  actionRequired: boolean;
  suggestedActions?: string[];
  metadata?: any;
}

interface BeaconSubscription {
  userId: string;
  caseId?: string;
  alertTypes: string[];
  channels: ('web' | 'email' | 'sms' | 'push')[];
  filters?: {
    minSeverity?: 'critical' | 'high' | 'medium' | 'low';
    keywords?: string[];
    parties?: string[];
  };
}

interface BeaconDigest {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  cases: string[];
  lastSent: Date;
  nextScheduled: Date;
  metrics: {
    totalAlerts: number;
    criticalAlerts: number;
    resolvedIssues: number;
    upcomingDeadlines: number;
  };
}

export class ChittyBeaconService extends EventEmitter {
  private wsConnections: Map<string, WebSocket> = new Map();
  private subscriptions: Map<string, BeaconSubscription[]> = new Map();
  private alertQueue: BeaconAlert[] = [];
  private readonly BEACON_API_URL = process.env.CHITTY_BEACON_API_URL || 'https://api.chittybeacon.com/v1';
  private readonly BEACON_WS_URL = process.env.CHITTY_BEACON_WS_URL || 'wss://beacon.chittybeacon.com';

  constructor() {
    super();
    this.startAlertProcessor();
    this.startDeadlineMonitor();
  }

  /**
   * Create a new alert
   */
  async createAlert(alert: Omit<BeaconAlert, 'id' | 'timestamp'>): Promise<BeaconAlert> {
    const fullAlert: BeaconAlert = {
      ...alert,
      id: `ALERT-${Date.now()}`,
      timestamp: new Date(),
    };

    this.alertQueue.push(fullAlert);
    this.emit('alert:created', fullAlert);
    
    // Process immediately for critical alerts
    if (fullAlert.severity === 'critical') {
      await this.processAlert(fullAlert);
    }

    return fullAlert;
  }

  /**
   * Subscribe to alerts
   */
  async subscribe(subscription: BeaconSubscription): Promise<string> {
    const subId = `SUB-${Date.now()}`;
    
    if (!this.subscriptions.has(subscription.userId)) {
      this.subscriptions.set(subscription.userId, []);
    }
    
    this.subscriptions.get(subscription.userId)!.push(subscription);
    
    // Setup WebSocket if web channel is included
    if (subscription.channels.includes('web')) {
      await this.setupWebSocketConnection(subscription.userId);
    }

    return subId;
  }

  /**
   * Monitor deadlines and create alerts
   */
  async monitorDeadlines(caseId: string): Promise<BeaconAlert[]> {
    const alerts: BeaconAlert[] = [];
    const deadlines = await storage.getUpcomingDeadlines(caseId, 30);
    
    for (const deadline of deadlines) {
      const daysUntil = this.getDaysUntilDate(deadline.date);
      
      let severity: BeaconAlert['severity'] = 'low';
      let actionRequired = false;
      
      if (daysUntil <= 1) {
        severity = 'critical';
        actionRequired = true;
      } else if (daysUntil <= 3) {
        severity = 'high';
        actionRequired = true;
      } else if (daysUntil <= 7) {
        severity = 'medium';
      }

      if (severity !== 'low' || daysUntil <= 14) {
        const alert = await this.createAlert({
          type: 'deadline',
          severity,
          caseId,
          entryId: deadline.id,
          title: `Deadline Alert: ${deadline.description}`,
          message: `${daysUntil} days until deadline: ${deadline.description}`,
          actionRequired,
          suggestedActions: this.getSuggestedActionsForDeadline(deadline),
          metadata: {
            dueDate: deadline.dueDate || deadline.date,
            entryType: deadline.entryType,
            taskStatus: deadline.taskStatus,
          },
        });
        alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * Detect and alert on contradictions
   */
  async detectContradictions(caseId: string): Promise<BeaconAlert[]> {
    const alerts: BeaconAlert[] = [];
    const contradictions = await storage.getContradictions(caseId);
    
    for (const contradiction of contradictions.filter(c => !c.resolution)) {
      const alert = await this.createAlert({
        type: 'contradiction',
        severity: 'high',
        caseId,
        entryId: contradiction.entryId,
        title: 'Contradiction Detected',
        message: `Unresolved contradiction: ${contradiction.natureOfConflict}`,
        actionRequired: true,
        suggestedActions: [
          'Review conflicting entries',
          'Verify source documents',
          'Consult with team members',
          'Document resolution',
        ],
        metadata: {
          conflictingEntryId: contradiction.conflictingEntryId,
          natureOfConflict: contradiction.natureOfConflict,
        },
      });
      alerts.push(alert);
    }

    return alerts;
  }

  /**
   * Generate activity digest
   */
  async generateDigest(userId: string, period: 'daily' | 'weekly' | 'monthly'): Promise<BeaconDigest> {
    const cases = await storage.getCases(userId);
    const caseIds = cases.map(c => c.id);
    
    let totalAlerts = 0;
    let criticalAlerts = 0;
    let resolvedIssues = 0;
    let upcomingDeadlines = 0;

    for (const caseId of caseIds) {
      const deadlines = await storage.getUpcomingDeadlines(caseId, 30);
      upcomingDeadlines += deadlines.length;
      
      const contradictions = await storage.getContradictions(caseId);
      resolvedIssues += contradictions.filter(c => c.resolution).length;
      
      // Count alerts for this period
      const caseAlerts = this.alertQueue.filter(a => 
        a.caseId === caseId && 
        this.isInPeriod(a.timestamp, period)
      );
      totalAlerts += caseAlerts.length;
      criticalAlerts += caseAlerts.filter(a => a.severity === 'critical').length;
    }

    const digest: BeaconDigest = {
      userId,
      period,
      cases: caseIds,
      lastSent: new Date(),
      nextScheduled: this.getNextScheduledDate(period),
      metrics: {
        totalAlerts,
        criticalAlerts,
        resolvedIssues,
        upcomingDeadlines,
      },
    };

    // Send digest notification
    await this.sendDigest(digest);

    return digest;
  }

  /**
   * Get real-time updates via WebSocket
   */
  async connectRealtime(userId: string, onMessage: (alert: BeaconAlert) => void): Promise<() => void> {
    const ws = await this.setupWebSocketConnection(userId);
    
    const messageHandler = (data: any) => {
      const alert = JSON.parse(data.toString()) as BeaconAlert;
      onMessage(alert);
    };

    ws.on('message', messageHandler);

    // Return cleanup function
    return () => {
      ws.off('message', messageHandler);
      ws.close();
      this.wsConnections.delete(userId);
    };
  }

  /**
   * Get alert statistics for a case
   */
  async getAlertStats(caseId: string): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
    recentAlerts: BeaconAlert[];
    trends: any;
  }> {
    const caseAlerts = this.alertQueue.filter(a => a.caseId === caseId);
    
    const bySeverity: Record<string, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    
    const byType: Record<string, number> = {
      deadline: 0,
      contradiction: 0,
      update: 0,
      verification: 0,
      milestone: 0,
    };

    caseAlerts.forEach(alert => {
      bySeverity[alert.severity]++;
      byType[alert.type]++;
    });

    return {
      total: caseAlerts.length,
      bySeverity,
      byType,
      recentAlerts: caseAlerts.slice(-10),
      trends: this.calculateTrends(caseAlerts),
    };
  }

  // Private helper methods
  private async setupWebSocketConnection(userId: string): Promise<WebSocket> {
    if (this.wsConnections.has(userId)) {
      return this.wsConnections.get(userId)!;
    }

    const ws = new WebSocket(`${this.BEACON_WS_URL}?userId=${userId}`);
    
    ws.on('open', () => {
      console.log(`ChittyBeacon WebSocket connected for user ${userId}`);
    });

    ws.on('error', (error) => {
      console.error(`ChittyBeacon WebSocket error for user ${userId}:`, error);
    });

    ws.on('close', () => {
      this.wsConnections.delete(userId);
    });

    this.wsConnections.set(userId, ws);
    return ws;
  }

  private async processAlert(alert: BeaconAlert): Promise<void> {
    // Get relevant subscriptions
    const relevantSubs = Array.from(this.subscriptions.values())
      .flat()
      .filter(sub => 
        (!sub.caseId || sub.caseId === alert.caseId) &&
        sub.alertTypes.includes(alert.type) &&
        this.matchesFilters(alert, sub.filters)
      );

    // Send to each subscriber via their preferred channels
    for (const sub of relevantSubs) {
      for (const channel of sub.channels) {
        await this.sendViaChannel(alert, sub.userId, channel);
      }
    }
  }

  private async sendViaChannel(alert: BeaconAlert, userId: string, channel: string): Promise<void> {
    switch (channel) {
      case 'web':
        const ws = this.wsConnections.get(userId);
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(alert));
        }
        break;
      case 'email':
        // In production, send email
        console.log(`Would send email alert to ${userId}:`, alert.title);
        break;
      case 'sms':
        // In production, send SMS
        console.log(`Would send SMS alert to ${userId}:`, alert.title);
        break;
      case 'push':
        // In production, send push notification
        console.log(`Would send push notification to ${userId}:`, alert.title);
        break;
    }
  }

  private async sendDigest(digest: BeaconDigest): Promise<void> {
    // In production, this would send the digest via email
    console.log(`Sending ${digest.period} digest to ${digest.userId}`, digest.metrics);
  }

  private startAlertProcessor(): void {
    setInterval(() => {
      while (this.alertQueue.length > 0) {
        const alert = this.alertQueue.shift();
        if (alert && alert.severity !== 'critical') {
          this.processAlert(alert);
        }
      }
    }, 5000); // Process non-critical alerts every 5 seconds
  }

  private startDeadlineMonitor(): void {
    setInterval(async () => {
      // Monitor deadlines for all active cases
      const allCases = await this.getAllActiveCases();
      for (const caseId of allCases) {
        await this.monitorDeadlines(caseId);
      }
    }, 3600000); // Check every hour
  }

  private async getAllActiveCases(): Promise<string[]> {
    // In production, this would get all active cases from the database
    // For now, return empty array
    return [];
  }

  private getDaysUntilDate(date: string): number {
    const today = new Date();
    const targetDate = new Date(date);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getSuggestedActionsForDeadline(entry: TimelineEntry): string[] {
    const actions: string[] = [];
    
    if (entry.entryType === 'task') {
      switch (entry.taskSubtype) {
        case 'file':
          actions.push('Prepare filing documents', 'Review filing requirements', 'Submit to court');
          break;
        case 'draft':
          actions.push('Complete draft', 'Request review', 'Finalize document');
          break;
        case 'serve':
          actions.push('Prepare service documents', 'Arrange process server', 'File proof of service');
          break;
        case 'respond':
          actions.push('Review opposing documents', 'Draft response', 'File response');
          break;
        default:
          actions.push('Review task requirements', 'Complete necessary actions', 'Update status');
      }
    }

    return actions;
  }

  private matchesFilters(alert: BeaconAlert, filters?: any): boolean {
    if (!filters) return true;
    
    if (filters.minSeverity) {
      const severityLevels = { critical: 4, high: 3, medium: 2, low: 1 };
      if (severityLevels[alert.severity] < severityLevels[filters.minSeverity]) {
        return false;
      }
    }
    
    if (filters.keywords && filters.keywords.length > 0) {
      const alertText = `${alert.title} ${alert.message}`.toLowerCase();
      if (!filters.keywords.some((kw: string) => alertText.includes(kw.toLowerCase()))) {
        return false;
      }
    }

    return true;
  }

  private isInPeriod(date: Date, period: 'daily' | 'weekly' | 'monthly'): boolean {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    
    switch (period) {
      case 'daily': return days <= 1;
      case 'weekly': return days <= 7;
      case 'monthly': return days <= 30;
      default: return false;
    }
  }

  private getNextScheduledDate(period: 'daily' | 'weekly' | 'monthly'): Date {
    const next = new Date();
    switch (period) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }
    return next;
  }

  private calculateTrends(alerts: BeaconAlert[]): any {
    // Calculate alert trends over time
    const now = new Date();
    const lastWeek = alerts.filter(a => 
      (now.getTime() - a.timestamp.getTime()) <= 7 * 24 * 60 * 60 * 1000
    ).length;
    
    const previousWeek = alerts.filter(a => {
      const diff = now.getTime() - a.timestamp.getTime();
      return diff > 7 * 24 * 60 * 60 * 1000 && diff <= 14 * 24 * 60 * 60 * 1000;
    }).length;

    return {
      weeklyChange: lastWeek - previousWeek,
      percentageChange: previousWeek > 0 ? ((lastWeek - previousWeek) / previousWeek) * 100 : 0,
      trend: lastWeek > previousWeek ? 'increasing' : lastWeek < previousWeek ? 'decreasing' : 'stable',
    };
  }
}

export const chittyBeacon = new ChittyBeaconService();