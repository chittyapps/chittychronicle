import { storage } from "./storage";
import type { Case, InsertCase } from "@shared/schema";
import { timelineService } from "./timelineService";

export interface CaseParty {
  id?: string;
  name: string;
  partyType: 'plaintiff' | 'defendant' | 'third_party' | 'intervenor' | 'witness';
  representedBy?: string;
  attorneyName?: string;
  attorneyFirm?: string;
  contactInfo?: {
    email?: string;
    phone?: string;
    address?: string;
  };
  chittyId?: string;
  role?: string;
  notes?: string;
}

export interface CaseSummary {
  case: Case;
  parties: {
    plaintiffs: CaseParty[];
    defendants: CaseParty[];
    thirdParties: CaseParty[];
    witnesses: CaseParty[];
  };
  timeline: {
    totalEntries: number;
    upcomingDeadlines: number;
    overdueItems: number;
    contradictions: number;
  };
  jurisdiction: {
    court: string;
    judge: string;
    location: string;
  };
  keyDates: {
    filing: string | null;
    trial: string | null;
    discoveryDeadline: string | null;
    statuteOfLimitations: string | null;
  };
}

export interface JurisdictionInfo {
  jurisdiction: string;
  court: string;
  judge: string;
  rules: {
    discoveryPeriod: number; // days
    responsePeriod: number; // days
    motionNoticePeriod: number; // days
    appealPeriod: number; // days
  };
  localRules?: string[];
}

export class CaseManagementService {
  
  // Create a case with full party and jurisdiction information
  async createEnhancedCase(caseData: InsertCase & { parties?: CaseParty[] }): Promise<Case> {
    // Validate parties
    if (caseData.parties) {
      const hasPlaintiff = caseData.parties.some(p => p.partyType === 'plaintiff');
      const hasDefendant = caseData.parties.some(p => p.partyType === 'defendant');
      
      if (!hasPlaintiff) {
        throw new Error("Case must have at least one plaintiff");
      }
      if (!hasDefendant) {
        throw new Error("Case must have at least one defendant");
      }
    }
    
    // Add party IDs if not present
    const partiesWithIds = caseData.parties?.map(party => ({
      ...party,
      id: party.id || `party-${Date.now()}`
    }));
    
    const enhancedData = {
      ...caseData,
      parties: partiesWithIds || [],
      metadata: {
        ...(typeof caseData.metadata === 'object' ? caseData.metadata : {}),
        createdAt: new Date().toISOString(),
        partyCount: partiesWithIds?.length || 0,
        hasChittyIntegration: !!caseData.chittyPmProjectId
      }
    };
    
    const newCase = await storage.createCase(enhancedData);
    
    // Create initial timeline entries for key dates
    if (newCase.filingDate) {
      await this.createKeyDateEntry(newCase.id, 'filing', newCase.filingDate, caseData.createdBy);
    }
    if (newCase.trialDate) {
      await this.createKeyDateEntry(newCase.id, 'trial', newCase.trialDate, caseData.createdBy);
    }
    if (newCase.discoveryDeadline) {
      await this.createKeyDateEntry(newCase.id, 'discovery', newCase.discoveryDeadline, caseData.createdBy);
    }
    
    return newCase;
  }
  
  private async createKeyDateEntry(caseId: string, type: string, date: string, userId: string) {
    const descriptions: { [key: string]: string } = {
      filing: 'Case Filing Date',
      trial: 'Trial Date',
      discovery: 'Discovery Deadline',
      statute: 'Statute of Limitations Deadline'
    };
    
    await timelineService.createValidatedTimelineEntry({
      caseId,
      entryType: type === 'trial' ? 'event' : 'task',
      eventSubtype: type === 'trial' ? 'hearing' : undefined,
      taskSubtype: type !== 'trial' ? 'review' : undefined,
      date,
      description: descriptions[type] || `${type} Date`,
      confidenceLevel: 'high',
      eventStatus: type === 'filing' ? 'occurred' : 'upcoming',
      taskStatus: type !== 'trial' && type !== 'filing' ? 'pending' : undefined,
      createdBy: userId,
      modifiedBy: userId,
      tags: ['key-date', type],
      metadata: {
        isKeyDate: true,
        dateType: type
      }
    });
  }
  
  // Get comprehensive case summary
  async getCaseSummary(caseId: string, userId: string): Promise<CaseSummary> {
    const caseData = await storage.getCase(caseId, userId);
    if (!caseData) {
      throw new Error("Case not found");
    }
    
    // Parse parties from JSON
    const caseWithParties = caseData as any;
    const parties = (caseWithParties.parties as CaseParty[]) || [];
    const partiesByType = {
      plaintiffs: parties.filter(p => p.partyType === 'plaintiff'),
      defendants: parties.filter(p => p.partyType === 'defendant'),
      thirdParties: parties.filter(p => p.partyType === 'third_party' || p.partyType === 'intervenor'),
      witnesses: parties.filter(p => p.partyType === 'witness')
    };
    
    // Get timeline statistics
    const timelineStats = await storage.getTimelineEntries(caseId, { limit: 1 });
    const deadlines = await timelineService.calculateDeadlines(caseId, 30);
    const contradictions = await timelineService.detectDetailedContradictions(caseId);
    
    return {
      case: caseData,
      parties: partiesByType,
      timeline: {
        totalEntries: timelineStats.totalCount,
        upcomingDeadlines: deadlines.filter(d => !d.isOverdue).length,
        overdueItems: deadlines.filter(d => d.isOverdue).length,
        contradictions: contradictions.length
      },
      jurisdiction: {
        court: caseWithParties.court || 'Not specified',
        judge: caseWithParties.judge || 'Not assigned',
        location: caseData.jurisdiction || 'Not specified'
      },
      keyDates: {
        filing: caseData.filingDate,
        trial: caseData.trialDate,
        discoveryDeadline: caseData.discoveryDeadline,
        statuteOfLimitations: caseWithParties.statuteOfLimitationsDate || null
      }
    };
  }
  
  // Update case parties
  async updateCaseParties(caseId: string, parties: CaseParty[], userId: string): Promise<Case> {
    const caseData = await storage.getCase(caseId, userId);
    if (!caseData) {
      throw new Error("Case not found");
    }
    
    // Validate parties
    const hasPlaintiff = parties.some(p => p.partyType === 'plaintiff');
    const hasDefendant = parties.some(p => p.partyType === 'defendant');
    
    if (!hasPlaintiff || !hasDefendant) {
      throw new Error("Case must have at least one plaintiff and one defendant");
    }
    
    // Add IDs to new parties
    const partiesWithIds = parties.map(party => ({
      ...party,
      id: party.id || `party-${Date.now()}`
    }));
    
    const updated = await storage.updateCase(caseId, {
      parties: partiesWithIds as any,
      metadata: {
        updatedAt: new Date().toISOString()
      }
    }, userId);
    
    if (!updated) {
      throw new Error("Failed to update case parties");
    }
    
    return updated;
  }
  
  // Get jurisdiction-specific rules and deadlines
  async getJurisdictionRules(jurisdiction: string): Promise<JurisdictionInfo> {
    // This would normally fetch from a database of jurisdiction rules
    // For now, return common defaults
    const jurisdictionRules: { [key: string]: JurisdictionInfo } = {
      'federal': {
        jurisdiction: 'Federal',
        court: 'U.S. District Court',
        judge: 'To be assigned',
        rules: {
          discoveryPeriod: 180,
          responsePeriod: 21,
          motionNoticePeriod: 14,
          appealPeriod: 30
        },
        localRules: ['FRCP', 'FRE', 'Local Rules']
      },
      'california': {
        jurisdiction: 'California State',
        court: 'Superior Court',
        judge: 'To be assigned',
        rules: {
          discoveryPeriod: 150,
          responsePeriod: 30,
          motionNoticePeriod: 16,
          appealPeriod: 60
        },
        localRules: ['CCP', 'CEC', 'Local Rules']
      },
      'new-york': {
        jurisdiction: 'New York State',
        court: 'Supreme Court',
        judge: 'To be assigned',
        rules: {
          discoveryPeriod: 120,
          responsePeriod: 20,
          motionNoticePeriod: 8,
          appealPeriod: 30
        },
        localRules: ['CPLR', 'Local Rules']
      }
    };
    
    const key = jurisdiction.toLowerCase().replace(/\s+/g, '-');
    return jurisdictionRules[key] || {
      jurisdiction: jurisdiction,
      court: 'Court',
      judge: 'To be assigned',
      rules: {
        discoveryPeriod: 180,
        responsePeriod: 30,
        motionNoticePeriod: 14,
        appealPeriod: 30
      }
    };
  }
  
  // Calculate jurisdiction-specific deadlines
  async calculateJurisdictionDeadlines(caseId: string, userId: string): Promise<{
    deadline: string;
    description: string;
    basedOn: string;
    daysFromBase: number;
  }[]> {
    const caseData = await storage.getCase(caseId, userId);
    if (!caseData) {
      throw new Error("Case not found");
    }
    
    const jurisdiction = caseData.jurisdiction || 'federal';
    const rules = await this.getJurisdictionRules(jurisdiction);
    const deadlines = [];
    
    if (caseData.filingDate) {
      const filingDate = new Date(caseData.filingDate);
      
      // Calculate response deadline
      const responseDeadline = new Date(filingDate);
      responseDeadline.setDate(responseDeadline.getDate() + rules.rules.responsePeriod);
      deadlines.push({
        deadline: responseDeadline.toISOString().split('T')[0],
        description: 'Response/Answer Deadline',
        basedOn: 'Filing Date',
        daysFromBase: rules.rules.responsePeriod
      });
      
      // Calculate discovery deadline if not set
      if (!caseData.discoveryDeadline) {
        const discoveryDeadline = new Date(filingDate);
        discoveryDeadline.setDate(discoveryDeadline.getDate() + rules.rules.discoveryPeriod);
        deadlines.push({
          deadline: discoveryDeadline.toISOString().split('T')[0],
          description: 'Discovery Completion Deadline',
          basedOn: 'Filing Date',
          daysFromBase: rules.rules.discoveryPeriod
        });
      }
    }
    
    if (caseData.trialDate) {
      const trialDate = new Date(caseData.trialDate);
      
      // Pre-trial motion deadline
      const motionDeadline = new Date(trialDate);
      motionDeadline.setDate(motionDeadline.getDate() - rules.rules.motionNoticePeriod);
      deadlines.push({
        deadline: motionDeadline.toISOString().split('T')[0],
        description: 'Pre-trial Motion Deadline',
        basedOn: 'Trial Date',
        daysFromBase: -rules.rules.motionNoticePeriod
      });
      
      // Witness list deadline
      const witnessDeadline = new Date(trialDate);
      witnessDeadline.setDate(witnessDeadline.getDate() - 30);
      deadlines.push({
        deadline: witnessDeadline.toISOString().split('T')[0],
        description: 'Witness List Deadline',
        basedOn: 'Trial Date',
        daysFromBase: -30
      });
    }
    
    return deadlines;
  }
  
  // Search for cases by party name
  async searchCasesByParty(partyName: string, userId: string): Promise<Case[]> {
    const allCases = await storage.getCases(userId);
    
    return allCases.filter(caseData => {
      const caseWithParties = caseData as any;
      const parties = (caseWithParties.parties as CaseParty[]) || [];
      return parties.some(party => 
        party.name.toLowerCase().includes(partyName.toLowerCase()) ||
        party.attorneyName?.toLowerCase().includes(partyName.toLowerCase()) ||
        party.attorneyFirm?.toLowerCase().includes(partyName.toLowerCase())
      );
    });
  }
  
  // Get all cases for a specific jurisdiction
  async getCasesByJurisdiction(jurisdiction: string, userId: string): Promise<Case[]> {
    const allCases = await storage.getCases(userId);
    return allCases.filter(caseData => 
      caseData.jurisdiction?.toLowerCase().includes(jurisdiction.toLowerCase())
    );
  }
}

export const caseService = new CaseManagementService();