import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Shield, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Zap,
  FileCheck,
  Database,
  Fingerprint,
  TrendingUp
} from 'lucide-react';

interface VerificationStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp?: string;
  details?: string[];
  trustImpact?: number;
}

interface AdaptiveVerificationFlowProps {
  evidenceId?: string;
  currentStep?: number;
  verificationSteps?: VerificationStep[];
  overallProgress?: number;
}

const defaultSteps: VerificationStep[] = [
  {
    id: 'upload',
    title: 'Evidence Upload',
    description: 'Secure file transmission and initial integrity checks',
    icon: <Upload className="h-5 w-5" />,
    status: 'completed',
    timestamp: '2025-01-26 20:15:32',
    details: [
      'File hash: a7b8c9d...',
      'Size: 2.4 MB',
      'Format: PDF'
    ],
    trustImpact: 15
  },
  {
    id: 'validation',
    title: 'Schema Validation',
    description: 'Content structure and format verification',
    icon: <FileCheck className="h-5 w-5" />,
    status: 'completed',
    timestamp: '2025-01-26 20:15:45',
    details: [
      'Document structure: Valid',
      'Metadata extracted',
      'OCR processed'
    ],
    trustImpact: 20
  },
  {
    id: 'trust-analysis',
    title: '6D Trust Analysis',
    description: 'Source, Time, Channel, Outcomes, Network, Justice scoring',
    icon: <TrendingUp className="h-5 w-5" />,
    status: 'processing',
    details: [
      'Source tier: Government (0.95)',
      'Temporal verification in progress',
      'Network analysis: 4/6 dimensions'
    ],
    trustImpact: 35
  },
  {
    id: 'chitty-verify',
    title: 'ChittyVerify Lock',
    description: 'Immutable off-chain verification and cryptographic signature',
    icon: <Shield className="h-5 w-5" />,
    status: 'pending',
    details: [
      'Awaiting trust analysis completion',
      'Cryptographic signature ready',
      'Immutable state preparation'
    ],
    trustImpact: 25
  },
  {
    id: 'blockchain-ready',
    title: 'Blockchain Ready',
    description: 'Verified evidence ready for final blockchain minting',
    icon: <Lock className="h-5 w-5" />,
    status: 'pending',
    details: [
      'Manual approval required',
      'No auto-minting configured',
      'User consent pending'
    ],
    trustImpact: 5
  }
];

export function AdaptiveVerificationFlow({ 
  evidenceId = 'ART-12345',
  currentStep = 2,
  verificationSteps = defaultSteps,
  overallProgress = 45
}: AdaptiveVerificationFlowProps) {
  
  const getStatusColor = (status: VerificationStep['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-400 border-green-400/30 bg-green-400/10';
      case 'processing':
        return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
      case 'failed':
        return 'text-red-400 border-red-400/30 bg-red-400/10';
      default:
        return 'text-slate-400 border-slate-600 bg-slate-800/50';
    }
  };

  const getStatusIcon = (status: VerificationStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'processing':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>;
      case 'failed':
        return <div className="h-4 w-4 bg-red-400 rounded-full"></div>;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const completedSteps = verificationSteps.filter(step => step.status === 'completed').length;
  const totalSteps = verificationSteps.length;

  return (
    <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700">
      <CardContent className="p-6">
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-green-400 mb-1">
                ChittyVerify Process
              </h3>
              <p className="text-slate-300 text-sm">
                Evidence ID: {evidenceId}
              </p>
            </div>
            <Badge className="bg-green-400/20 text-green-400 border-green-400/30">
              {completedSteps}/{totalSteps} Complete
            </Badge>
          </div>
          
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Verification Progress</span>
              <span className="text-green-400 font-medium">{overallProgress}%</span>
            </div>
            <Progress 
              value={overallProgress} 
              className="h-3 bg-slate-700"
              data-testid="progress-overall"
            />
          </div>
        </div>

        {/* Verification Steps */}
        <div className="space-y-4">
          {verificationSteps.map((step, index) => (
            <div
              key={step.id}
              className={`relative border rounded-lg p-4 transition-all duration-300 ${getStatusColor(step.status)}`}
              data-testid={`step-${step.id}`}
            >
              {/* Connection Line */}
              {index < verificationSteps.length - 1 && (
                <div className="absolute left-8 top-16 w-px h-6 bg-slate-600"></div>
              )}
              
              <div className="flex items-start gap-4">
                {/* Step Icon */}
                <div className="flex-shrink-0 relative">
                  <div className={`p-2 rounded-lg border ${getStatusColor(step.status)}`}>
                    {step.icon}
                  </div>
                  {/* Status Indicator */}
                  <div className="absolute -top-1 -right-1">
                    {getStatusIcon(step.status)}
                  </div>
                </div>
                
                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">{step.title}</h4>
                    {step.timestamp && step.status === 'completed' && (
                      <span className="text-xs text-slate-400">
                        {step.timestamp}
                      </span>
                    )}
                    {step.status === 'processing' && (
                      <div className="flex items-center gap-1 text-xs text-blue-400">
                        <Zap className="h-3 w-3" />
                        Processing...
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-300 mb-3">
                    {step.description}
                  </p>
                  
                  {/* Step Details */}
                  {step.details && step.details.length > 0 && (
                    <div className="space-y-1">
                      {step.details.map((detail, detailIndex) => (
                        <div 
                          key={detailIndex}
                          className="flex items-center gap-2 text-xs"
                        >
                          <div className="w-1 h-1 bg-slate-500 rounded-full"></div>
                          <span className="text-slate-400">{detail}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Trust Impact */}
                  {step.trustImpact && (
                    <div className="mt-3 flex items-center gap-2">
                      <Fingerprint className="h-3 w-3 text-green-400" />
                      <span className="text-xs text-green-400">
                        Trust Impact: +{step.trustImpact}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Processing Animation */}
              {step.status === 'processing' && (
                <div className="absolute inset-0 border border-blue-400/30 rounded-lg animate-pulse"></div>
              )}
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-4 border-t border-slate-700">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">
                {completedSteps}
              </div>
              <div className="text-xs text-slate-400">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">
                {verificationSteps.filter(s => s.status === 'processing').length}
              </div>
              <div className="text-xs text-slate-400">Processing</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-400">
                {verificationSteps.filter(s => s.status === 'pending').length}
              </div>
              <div className="text-xs text-slate-400">Pending</div>
            </div>
          </div>
        </div>

        {/* Next Action */}
        {overallProgress < 100 && (
          <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-600">
            <div className="flex items-center gap-2 text-sm">
              <Database className="h-4 w-4 text-blue-400" />
              <span className="text-slate-300">
                Next: {verificationSteps.find(s => s.status === 'processing' || s.status === 'pending')?.title}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default AdaptiveVerificationFlow;