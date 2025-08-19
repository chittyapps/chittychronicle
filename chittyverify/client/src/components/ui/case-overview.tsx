import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrustIndicator } from "./trust-indicator";
import { Briefcase } from "lucide-react";

interface CaseOverviewProps {
  case: {
    name: string;
    totalEvidence: number;
    verifiedEvidence: number;
    pendingEvidence: number;
    mintedEvidence: number;
    trustScore: number;
  };
}

export function CaseOverview({ case: caseData }: CaseOverviewProps) {
  return (
    <Card className="evidence-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Briefcase className="w-5 h-5 mr-2 text-primary-blue" />
          Case Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Evidence</span>
            <span className="font-semibold">{caseData.totalEvidence} items</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Verified</span>
            <span className="font-semibold text-status-verified">{caseData.verifiedEvidence} items</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Pending</span>
            <span className="font-semibold text-status-pending">{caseData.pendingEvidence} items</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Minted to Chain</span>
            <span className="font-semibold text-status-minted">{caseData.mintedEvidence} items</span>
          </div>
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Case Trust Score</span>
              <TrustIndicator score={caseData.trustScore} showLabel={false} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
