import { Clock, Shield, AlertTriangle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TrustTimelineProps {
  evidence: {
    originalTrustScore: string;
    trustScore: string;
    status: string;
    verifiedAt: string | null;
    mintedAt: string | null;
    uploadedAt: string;
  };
}

export default function TrustTimeline({ evidence }: TrustTimelineProps) {
  const originalTrust = parseFloat(evidence.originalTrustScore);
  const currentTrust = parseFloat(evidence.trustScore);
  const degradationPercent = ((originalTrust - currentTrust) / originalTrust) * 100;

  const getTimeFromNow = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const hours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    return hours;
  };

  const uploadHours = getTimeFromNow(evidence.uploadedAt);
  const verifyHours = evidence.verifiedAt ? getTimeFromNow(evidence.verifiedAt) : null;
  const mintHours = evidence.mintedAt ? getTimeFromNow(evidence.mintedAt) : null;

  return (
    <div className="bg-institutional-50 rounded-xl p-6 shadow-sm border border-institutional-200" data-testid="trust-timeline">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-legal text-lg text-institutional-900">ChittyChain Evidence</h3>
        <Badge className={evidence.status === 'MINTED' ? 'bg-legal-gold-100 text-legal-gold-800' : 'bg-forensic-red-100 text-forensic-red-800'}>
          {evidence.status === 'MINTED' ? 'IN LEDGER' : 'DEGRADING'}
        </Badge>
      </div>

      {/* Trust Score Visualization */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-institutional-600">Evidence Score</span>
          <span className="font-tech text-lg font-bold text-legal-gold-600">
            {evidence.trustScore} / {evidence.originalTrustScore}
          </span>
        </div>
        <div className="h-3 bg-institutional-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-legal-gold-500 to-legal-gold-400 transition-all duration-1000"
            style={{ width: `${(currentTrust / originalTrust) * 100}%` }}
          />
        </div>
        {degradationPercent > 0 && (
          <div className="text-xs text-forensic-red-600 mt-1">
            ↓ {degradationPercent.toFixed(1)}% degraded since verification
          </div>
        )}
      </div>

      {/* Timeline Events */}
      <div className="space-y-4">
        {/* Upload Event */}
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-institutional-500 rounded-full flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-institutional-900">Evidence Uploaded</div>
            <div className="text-xs text-institutional-600">{uploadHours}h ago</div>
          </div>
          <div className="text-xs text-institutional-500">Initial state</div>
        </div>

        {/* Verification Event */}
        {evidence.verifiedAt && (
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-legal-gold-500 rounded-full flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-institutional-900">Evidence Verified</div>
              <div className="text-xs text-institutional-600">{verifyHours}h ago</div>
            </div>
            <div className="text-xs text-forensic-red-600">
              {evidence.status !== 'MINTED' ? '⚠️ Can degrade' : '✓ In Ledger'}
            </div>
          </div>
        )}

        {/* Minting Event */}
        {evidence.mintedAt ? (
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 bg-legal-gold-600 rounded-full flex items-center justify-center">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-institutional-900">Added to Ledger</div>
              <div className="text-xs text-institutional-600">{mintHours}h ago</div>
            </div>
            <div className="text-xs text-legal-gold-600">🔒 ChittyChain Ledger</div>
          </div>
        ) : (
          <div className="flex items-center space-x-4 opacity-50">
            <div className="w-8 h-8 bg-institutional-300 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-institutional-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-institutional-500">Not in Ledger</div>
              <div className="text-xs text-institutional-400">Evidence can continue to degrade</div>
            </div>
            <button 
              className="text-xs bg-institutional-300 text-institutional-600 px-3 py-1 rounded-full cursor-not-allowed"
              disabled
            >
              Not Qualified
            </button>
          </div>
        )}
      </div>

      {/* Key Insight */}
      <div className="mt-6 p-4 bg-legal-gold-50 rounded-lg border border-legal-gold-200">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-legal-gold-600 mt-0.5" />
          <div className="text-sm text-legal-gold-800">
            <strong>ChittyChain:</strong> The immutable evidence ledger that records qualified evidence permanently. 
            Evidence that doesn't meet ledger standards continues to degrade over time. 
            ChittyChain entries lock evidence state at the moment of qualification.
          </div>
        </div>
      </div>
    </div>
  );
}