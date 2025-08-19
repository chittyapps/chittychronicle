import { apiRequest } from "./queryClient";
import type { Case, Evidence, AtomicFact, ChainOfCustody, Contradiction, InsertEvidence, InsertCase, InsertFact } from "@shared/schema";

export interface DashboardStats {
  evidenceArtifacts: number;
  verificationRate: number;
  activeCases: number;
  criticalContradictions: number;
}

// Cases API
export const casesApi = {
  getAll: async (): Promise<Case[]> => {
    const response = await apiRequest("GET", "/api/cases");
    return response.json();
  },

  getById: async (id: string): Promise<Case> => {
    const response = await apiRequest("GET", `/api/cases/${id}`);
    return response.json();
  },

  create: async (data: InsertCase): Promise<Case> => {
    const response = await apiRequest("POST", "/api/cases", data);
    return response.json();
  },
};

// Evidence API
export const evidenceApi = {
  getAll: async (caseId?: string): Promise<Evidence[]> => {
    const url = caseId ? `/api/evidence?caseId=${caseId}` : "/api/evidence";
    const response = await apiRequest("GET", url);
    return response.json();
  },

  getById: async (id: string): Promise<Evidence> => {
    const response = await apiRequest("GET", `/api/evidence/${id}`);
    return response.json();
  },

  create: async (data: InsertEvidence): Promise<Evidence> => {
    const response = await apiRequest("POST", "/api/evidence", data);
    return response.json();
  },

  update: async (id: string, updates: Partial<Evidence>): Promise<Evidence> => {
    const response = await apiRequest("PATCH", `/api/evidence/${id}`, updates);
    return response.json();
  },
};

// Facts API
export const factsApi = {
  getByEvidence: async (evidenceId: string): Promise<AtomicFact[]> => {
    const response = await apiRequest("GET", `/api/evidence/${evidenceId}/facts`);
    return response.json();
  },

  create: async (data: InsertFact): Promise<AtomicFact> => {
    const response = await apiRequest("POST", "/api/facts", data);
    return response.json();
  },
};

// Chain of Custody API
export const custodyApi = {
  getByEvidence: async (evidenceId: string): Promise<ChainOfCustody[]> => {
    const response = await apiRequest("GET", `/api/evidence/${evidenceId}/custody`);
    return response.json();
  },
};

// Contradictions API
export const contradictionsApi = {
  getAll: async (activeOnly?: boolean): Promise<Contradiction[]> => {
    const url = activeOnly ? "/api/contradictions?active=true" : "/api/contradictions";
    const response = await apiRequest("GET", url);
    return response.json();
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiRequest("GET", "/api/dashboard/stats");
    return response.json();
  },
};
