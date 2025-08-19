/**
 * Enhanced Blockchain Minting Controls
 * Integrates the comprehensive blockchain services
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertCircle, Clock, Shield, Zap } from 'lucide-react';
import { artifactMintingService } from '../../lib/blockchain/artifact-minting';
import { trustLayer } from '../../lib/blockchain/trust-layer';
import { validationService } from '../../lib/blockchain/validation-service';

interface MintingControlsProps {
  evidenceId: string;
  evidenceData: any;
  onMintingComplete: (result: any) => void;
}

export function MintingControls({ evidenceId, evidenceData, onMintingComplete }: MintingControlsProps) {
  const [mintingState, setMintingState] = useState<'idle' | 'validating' | 'analyzing' | 'minting' | 'complete' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [trustAnalysis, setTrustAnalysis] = useState<any>(null);
  const [mintingResult, setMintingResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMintEvidence = async () => {
    try {
      setError(null);
      setProgress(0);
      
      // Step 1: Validation
      setMintingState('validating');
      setProgress(20);
      const validation = await validationService.validateEvidence(evidenceData);
      setValidationResult(validation);
      
      if (!validation.valid) {
        setError('Evidence validation failed');
        setMintingState('error');
        return;
      }

      // Step 2: Trust Analysis
      setMintingState('analyzing');
      setProgress(40);
      const analysis = await trustLayer.analyzeEvidence(evidenceData);
      setTrustAnalysis(analysis);

      // Step 3: Minting Process
      setMintingState('minting');
      setProgress(60);
      const mintResult = await artifactMintingService.mintEvidence({
        evidenceId,
        userId: 'current-user' // In real app, get from auth context
      });

      setProgress(100);
      setMintingResult(mintResult);
      
      if (mintResult.success) {
        setMintingState('complete');
        onMintingComplete(mintResult);
      } else {
        setError(mintResult.error || 'Minting failed');
        setMintingState('error');
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setMintingState('error');
    }
  };

  const getTrustColor = (score: number) => {
    if (score >= 0.9) return 'text-green-600 dark:text-green-400';
    if (score >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getStateIcon = () => {
    switch (mintingState) {
      case 'validating':
        return <Clock className="w-4 h-4 animate-spin" />;
      case 'analyzing':
        return <Shield className="w-4 h-4 animate-pulse" />;
      case 'minting':
        return <Zap className="w-4 h-4 animate-bounce" />;
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="border-amber-200/50 dark:border-amber-700/50 bg-gradient-to-br from-amber-50/30 via-white to-orange-50/30 dark:from-amber-950/20 dark:via-gray-900 dark:to-orange-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
          {getStateIcon()}
          ChittyChain Minting
        </CardTitle>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          Immutable blockchain evidence registration with trust verification
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {mintingState !== 'idle' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-amber-700 dark:text-amber-300">
                {mintingState === 'validating' && 'Validating evidence...'}
                {mintingState === 'analyzing' && 'Analyzing trust score...'}
                {mintingState === 'minting' && 'Minting to blockchain...'}
                {mintingState === 'complete' && 'Minting complete'}
                {mintingState === 'error' && 'Error occurred'}
              </span>
              <span className="text-amber-600 dark:text-amber-400">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {/* Validation Results */}
        {validationResult && (
          <div className="space-y-2">
            <h4 className="font-medium text-amber-900 dark:text-amber-100">Validation Results</h4>
            <div className="flex items-center gap-2">
              <Badge variant={validationResult.valid ? "default" : "destructive"}>
                {validationResult.valid ? 'Valid' : 'Invalid'}
              </Badge>
              <span className="text-sm text-amber-700 dark:text-amber-300">
                {validationResult.errors.length} errors, {validationResult.warnings.length} warnings
              </span>
            </div>
          </div>
        )}

        {/* Trust Analysis */}
        {trustAnalysis && (
          <div className="space-y-2">
            <h4 className="font-medium text-amber-900 dark:text-amber-100">Trust Analysis</h4>
            <div className="flex items-center gap-2">
              <span className="text-sm text-amber-700 dark:text-amber-300">Trust Score:</span>
              <span className={`font-semibold ${getTrustColor(trustAnalysis.overallScore)}`}>
                {(trustAnalysis.overallScore * 100).toFixed(1)}%
              </span>
            </div>
            {trustAnalysis.recommendations?.length > 0 && (
              <div className="text-xs text-amber-600 dark:text-amber-400">
                • {trustAnalysis.recommendations[0]}
              </div>
            )}
          </div>
        )}

        {/* Minting Results */}
        {mintingResult && mintingResult.success && (
          <div className="space-y-2">
            <h4 className="font-medium text-green-700 dark:text-green-300">Minting Successful</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-amber-600 dark:text-amber-400">Transaction:</span>
                <span className="font-mono text-amber-800 dark:text-amber-200">
                  {mintingResult.transactionHash?.substring(0, 12)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-600 dark:text-amber-400">Block:</span>
                <span className="font-mono text-amber-800 dark:text-amber-200">
                  #{mintingResult.blockNumber}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        <Separator className="bg-amber-200 dark:bg-amber-700" />

        {/* Action Button */}
        <Button
          onClick={handleMintEvidence}
          disabled={mintingState !== 'idle' && mintingState !== 'error'}
          className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-medium"
        >
          {mintingState === 'idle' && 'Mint to ChittyChain'}
          {mintingState === 'validating' && 'Validating...'}
          {mintingState === 'analyzing' && 'Analyzing...'}
          {mintingState === 'minting' && 'Minting...'}
          {mintingState === 'complete' && 'Minted Successfully'}
          {mintingState === 'error' && 'Retry Minting'}
        </Button>

        {/* Help Text */}
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          Evidence will be permanently recorded on the ChittyChain with cryptographic integrity
        </p>
      </CardContent>
    </Card>
  );
}