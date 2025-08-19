import { useQuery } from "@tanstack/react-query";
import { evidenceApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image, AlertTriangle, MoreVertical } from "lucide-react";
import type { Evidence } from "@shared/schema";

export default function EvidenceTable() {
  const { data: evidence, isLoading } = useQuery({
    queryKey: ["/api/evidence"],
    queryFn: () => evidenceApi.getAll(),
  });

  if (isLoading) {
    return (
      <div className="data-grid rounded-2xl shadow-legal p-8">
        <div className="text-center py-8">
          <div className="font-tech text-legal-gold-500">Loading evidence...</div>
        </div>
      </div>
    );
  }

  if (!evidence || evidence.length === 0) {
    return (
      <div className="data-grid rounded-2xl shadow-legal p-8">
        <div className="text-center py-8">
          <div className="text-institutional-600">No evidence found</div>
        </div>
      </div>
    );
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="text-institutional-600 text-sm" />;
    }
    if (fileType === 'application/pdf') {
      return <FileText className="text-legal-gold-600 text-sm" />;
    }
    return <FileText className="text-institutional-600 text-sm" />;
  };

  const getTierBadgeColor = (tier: string) => {
    switch (tier) {
      case 'FINANCIAL_INSTITUTION':
        return 'bg-legal-gold-500/20 text-legal-gold-700';
      case 'INDEPENDENT_THIRD_PARTY':
        return 'bg-institutional-600/20 text-institutional-700';
      case 'UNCORROBORATED_PERSON':
        return 'bg-forensic-red-500/20 text-forensic-red-700';
      default:
        return 'bg-institutional-600/20 text-institutional-700';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'MINTED':
        return 'bg-legal-gold-500/20 text-legal-gold-700';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-700';
      case 'REQUIRES_CORROBORATION':
        return 'bg-forensic-red-500/20 text-forensic-red-700';
      default:
        return 'bg-institutional-600/20 text-institutional-700';
    }
  };

  const getTrustScoreWidth = (score: string) => {
    return `${parseFloat(score) * 100}%`;
  };

  const getTrustScoreColor = (score: string) => {
    const numScore = parseFloat(score);
    if (numScore >= 0.8) return 'bg-legal-gold-500';
    if (numScore >= 0.5) return 'bg-institutional-600';
    return 'bg-forensic-red-500';
  };

  return (
    <div className="data-grid rounded-2xl shadow-legal p-8" data-testid="evidence-table">
      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 pb-4 border-b border-institutional-300 mb-6">
        <div className="col-span-3 font-semibold text-institutional-700 text-sm">ARTIFACT</div>
        <div className="col-span-2 font-semibold text-institutional-700 text-sm">TYPE</div>
        <div className="col-span-2 font-semibold text-institutional-700 text-sm">TIER</div>
        <div className="col-span-2 font-semibold text-institutional-700 text-sm">TRUST SCORE</div>
        <div className="col-span-2 font-semibold text-institutional-700 text-sm">STATUS</div>
        <div className="col-span-1 font-semibold text-institutional-700 text-sm">ACTIONS</div>
      </div>
      
      {/* Evidence Rows */}
      <div className="space-y-4">
        {evidence.map((item) => (
          <div 
            key={item.id} 
            className="grid grid-cols-12 gap-4 items-center py-4 hover:bg-institutional-100/50 rounded-lg transition-all duration-200 cursor-pointer"
            data-testid={`evidence-row-${item.artifactId}`}
          >
            <div className="col-span-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-legal-gold-500/20 rounded-lg flex items-center justify-center">
                  {getFileIcon(item.fileType)}
                </div>
                <div>
                  <div className="font-tech text-sm text-institutional-900">{item.artifactId}</div>
                  <div className="text-xs text-institutional-600">{item.filename}</div>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <span className="text-sm text-institutional-700">{item.fileType.split('/')[0]}</span>
            </div>
            <div className="col-span-2">
              <Badge className={`${getTierBadgeColor(item.evidenceTier)} border-0 text-xs`}>
                {item.evidenceTier.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="col-span-2">
              <div className="flex items-center space-x-2">
                <div className="w-16 bg-institutional-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getTrustScoreColor(item.trustScore)}`}
                    style={{ width: getTrustScoreWidth(item.trustScore) }}
                  ></div>
                </div>
                <span className="font-tech text-sm text-institutional-700">{item.trustScore}</span>
              </div>
            </div>
            <div className="col-span-2">
              <Badge className={`${getStatusBadgeColor(item.status)} border-0 text-xs`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  item.status === 'MINTED' ? 'bg-legal-gold-500' :
                  item.status === 'PENDING' ? 'bg-yellow-500' : 'bg-forensic-red-500'
                }`}></div>
                {item.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="col-span-1">
              <Button variant="ghost" size="sm" data-testid={`evidence-actions-${item.artifactId}`}>
                <MoreVertical className="w-4 h-4 text-institutional-600" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
