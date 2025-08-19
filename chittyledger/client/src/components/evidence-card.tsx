import { useQuery } from "@tanstack/react-query";
import { evidenceApi, custodyApi, factsApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Tag, User, Building, Box } from "lucide-react";

export default function EvidenceCard() {
  const { data: evidence } = useQuery({
    queryKey: ["/api/evidence"],
    queryFn: () => evidenceApi.getAll(),
  });

  // Get the first evidence item for demonstration
  const firstEvidence = evidence?.[0];

  const { data: custody } = useQuery({
    queryKey: ["/api/evidence", firstEvidence?.id, "custody"],
    queryFn: () => custodyApi.getByEvidence(firstEvidence!.id),
    enabled: !!firstEvidence?.id,
  });

  const { data: facts } = useQuery({
    queryKey: ["/api/evidence", firstEvidence?.id, "facts"],
    queryFn: () => factsApi.getByEvidence(firstEvidence!.id),
    enabled: !!firstEvidence?.id,
  });

  if (!firstEvidence) {
    return (
      <div className="evidence-card p-8 rounded-2xl shadow-floating relative">
        <div className="text-center text-institutional-600">
          No evidence available
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'MINTED':
        return 'text-legal-gold-600 bg-legal-gold-500/10';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-500/10';
      case 'REQUIRES_CORROBORATION':
        return 'text-forensic-red-600 bg-forensic-red-500/10';
      default:
        return 'text-institutional-600 bg-institutional-500/10';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'FINANCIAL_INSTITUTION':
        return 'text-legal-gold-600 bg-legal-gold-500/10';
      case 'INDEPENDENT_THIRD_PARTY':
        return 'text-institutional-600 bg-institutional-500/10';
      case 'UNCORROBORATED_PERSON':
        return 'text-forensic-red-600 bg-forensic-red-500/10';
      default:
        return 'text-institutional-600 bg-institutional-500/10';
    }
  };

  return (
    <>
      {/* Main Evidence Card */}
      <div className="evidence-card p-8 rounded-2xl shadow-floating relative" data-testid="main-evidence-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="legal-seal w-8 h-8 rounded-full flex items-center justify-center">
              <Tag className="text-institutional-950 text-sm" />
            </div>
            <div>
              <div className="font-tech text-sm text-institutional-600">{firstEvidence.artifactId}</div>
              <div className="font-semibold text-institutional-900">{firstEvidence.filename}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="font-tech text-lg font-bold text-legal-gold-600">{firstEvidence.trustScore}</div>
                <div className="text-xs text-institutional-600">
                  {firstEvidence.status === 'MINTED' ? 'Locked' : 'Current'}
                </div>
              </div>
              {firstEvidence.status !== 'MINTED' && (
                <div className="flex flex-col items-center">
                  <div className="w-2 h-8 bg-gradient-to-b from-legal-gold-500 to-forensic-red-500 rounded-full relative">
                    <div 
                      className="absolute bottom-0 w-full bg-forensic-red-500 rounded-full transition-all duration-1000"
                      style={{ height: `${(1 - parseFloat(firstEvidence.trustScore)) * 100}%` }}
                    />
                  </div>
                  <div className="text-[8px] text-institutional-500 mt-1">DEGRADING</div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Evidence Tier Indicator */}
        <div className="mb-4">
          <Badge className={`${getTierColor(firstEvidence.evidenceTier)} border-0`}>
            <div className="w-2 h-2 bg-current rounded-full mr-2"></div>
            <span className="font-tech text-xs">{firstEvidence.evidenceTier}</span>
          </Badge>
        </div>
        
        {/* Chain of Custody Preview */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-institutional-700 mb-3">Chain of Custody</div>
          {custody?.slice(0, 2).map((entry, index) => (
            <div key={entry.id} className="flex items-center space-x-3 text-xs">
              <div className="w-6 h-6 bg-legal-gold-500 rounded-full flex items-center justify-center">
                {entry.action === 'UPLOADED' ? (
                  <User className="text-institutional-950 text-xs" />
                ) : (
                  <Building className="text-institutional-950 text-xs" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-institutional-700">{entry.action}</div>
                <div className="text-institutional-500">
                  {new Date(entry.timestamp).toLocaleDateString()} {new Date(entry.timestamp).toLocaleTimeString()}
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-legal-gold-500' : 'bg-institutional-400'}`}></div>
            </div>
          ))}
        </div>
        
        {/* Blockchain Status */}
        <div className="mt-6 pt-4 border-t border-institutional-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Box className="text-legal-gold-500 w-4 h-4" />
              <span className="font-tech text-xs text-institutional-600">
                Block #{firstEvidence.blockNumber || 'Pending'}
              </span>
            </div>
            <Badge className={getStatusColor(firstEvidence.status)}>
              <span className="font-tech text-xs">{firstEvidence.status}</span>
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Floating Atomic Facts */}
      {facts && facts.length > 0 && (
        <div 
          className="absolute -right-4 top-32 evidence-card p-4 rounded-xl shadow-evidence w-64 animate-float" 
          style={{ animationDelay: "1s" }}
          data-testid="floating-atomic-fact"
        >
          <div className="text-xs text-institutional-600 font-tech mb-2">{facts[0].factId}</div>
          <div className="text-sm text-institutional-800">"{facts[0].content}"</div>
          <div className="mt-3 flex justify-between items-center">
            <Badge className="bg-legal-gold-500/20 text-legal-gold-700 text-xs">
              {facts[0].factType}
            </Badge>
            <span className="font-tech text-xs text-legal-gold-600">{facts[0].confidenceScore}</span>
          </div>
        </div>
      )}
    </>
  );
}
