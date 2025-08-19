import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Clock, CheckCircle2, XCircle, AlertTriangle, Lock } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ChittyVerifyWidgetProps {
  evidence: {
    id: string;
    artifactId: string;
    originalFilename: string;
    sourceVerificationStatus: string;
    verifyStatus?: string;
    verifyTimestamp?: string;
    mintingStatus: string;
  };
  compact?: boolean;
}

export function ChittyVerifyWidget({ evidence, compact = false }: ChittyVerifyWidgetProps) {
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);

  const chittyVerifyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/evidence/${evidence.id}/chitty-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases'] });
      setIsVerifying(false);
    },
    onError: () => {
      setIsVerifying(false);
    }
  });

  const handleChittyVerify = () => {
    setIsVerifying(true);
    chittyVerifyMutation.mutate();
  };

  const getVerifyStatusIcon = () => {
    switch (evidence.verifyStatus) {
      case 'ChittyVerified':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'Rejected':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getVerifyStatusColor = () => {
    switch (evidence.verifyStatus) {
      case 'ChittyVerified':
        return 'bg-green-500';
      case 'Rejected':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const canVerify = evidence.sourceVerificationStatus === 'Verified' && 
                   evidence.verifyStatus !== 'ChittyVerified';

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-slate-50 rounded border">
        {getVerifyStatusIcon()}
        <span className="text-sm font-medium">
          {evidence.verifyStatus === 'ChittyVerified' ? 'ChittyVerified' : 'Unverified'}
        </span>
        {evidence.verifyStatus === 'ChittyVerified' && (
          <Lock className="h-3 w-3 text-gray-500" />
        )}
      </div>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-400" />
            <span className="text-green-400">ChittyVerify</span>
          </CardTitle>
          <Badge 
            variant="outline" 
            className={`${getVerifyStatusColor()} text-white border-none`}
          >
            {evidence.verifyStatus || 'Unverified'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-slate-300">
          <p className="font-medium mb-2 text-white">Immutable Verification Layer</p>
          <p>Evidence gets cryptographically verified and locked off-chain before blockchain minting.</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Source Verification:</span>
            <Badge variant={evidence.sourceVerificationStatus === 'Verified' ? 'default' : 'secondary'}>
              {evidence.sourceVerificationStatus}
            </Badge>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>ChittyVerify Status:</span>
            <div className="flex items-center gap-1">
              {getVerifyStatusIcon()}
              <span className="font-medium">
                {evidence.verifyStatus || 'Unverified'}
              </span>
            </div>
          </div>

          {evidence.verifyTimestamp && (
            <div className="flex justify-between text-sm">
              <span>Verified At:</span>
              <span className="font-mono text-xs">
                {new Date(evidence.verifyTimestamp).toLocaleString()}
              </span>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <span>Ready for Minting:</span>
            <Badge variant={evidence.verifyStatus === 'ChittyVerified' ? 'default' : 'secondary'}>
              {evidence.verifyStatus === 'ChittyVerified' ? 'Yes' : 'No'}
            </Badge>
          </div>
        </div>

        {evidence.verifyStatus === 'ChittyVerified' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-700">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Immutably Verified</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Evidence is cryptographically locked and ready for blockchain minting
            </p>
          </div>
        )}

        {canVerify && (
          <Button 
            onClick={handleChittyVerify}
            disabled={isVerifying || chittyVerifyMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700"
            data-testid="button-chitty-verify"
          >
            {isVerifying || chittyVerifyMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Verifying...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                ChittyVerify Evidence
              </div>
            )}
          </Button>
        )}

        {!canVerify && evidence.sourceVerificationStatus !== 'Verified' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-700">
              Source verification required before ChittyVerify
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ChittyVerifyWidget;