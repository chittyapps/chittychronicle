import { Card, CardContent } from "@/components/ui/card";

interface ProgressIndicatorProps {
  case: {
    name: string;
    totalEvidence: number;
    verifiedEvidence: number;
    pendingEvidence: number;
    mintedEvidence: number;
  };
}

export function ProgressIndicator({ case: caseData }: ProgressIndicatorProps) {
  const progress = caseData.totalEvidence > 0 
    ? (caseData.verifiedEvidence / caseData.totalEvidence) * 100 
    : 0;

  return (
    <Card className="evidence-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Case Progress</h3>
          <span className="text-sm text-gray-600">{caseData.name}</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex-1 bg-gray-200 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-status-verified to-primary-blue h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {caseData.verifiedEvidence} of {caseData.totalEvidence} evidence pieces verified
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-status-verified">{caseData.verifiedEvidence}</div>
            <div className="text-gray-600">Verified</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-status-pending">{caseData.pendingEvidence}</div>
            <div className="text-gray-600">Pending</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-status-minted">{caseData.mintedEvidence}</div>
            <div className="text-gray-600">Minted</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
