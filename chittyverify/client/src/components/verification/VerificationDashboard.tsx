import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdaptiveVerificationFlow from './AdaptiveVerificationFlow';
import BatchUploadWidget from '@/components/upload/BatchUploadWidget';
import { Shield, Zap, Database } from 'lucide-react';

export function VerificationDashboard() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          ChittyVerify Evidence Platform
        </h1>
        <p className="text-slate-300">
          Immutable verification layer before blockchain minting
        </p>
      </div>

      {/* Batch Upload */}
      <BatchUploadWidget />

      {/* Live Verification Process */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-green-400" />
          <h2 className="text-xl font-bold text-white">Live Verification Process</h2>
        </div>
        <AdaptiveVerificationFlow 
          evidenceId="DEMO-LIVE"
          currentStep={3}
          overallProgress={72}
        />
      </div>

      {/* Process Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Shield className="h-5 w-5" />
              ChittyVerify Layer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 text-sm mb-3">
              Immutable off-chain verification with cryptographic signatures
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Evidence Locked:</span>
                <span className="text-green-400">247 artifacts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Trust Score:</span>
                <span className="text-green-400">4.82/6.0</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-400">
              <Database className="h-5 w-5" />
              6D Trust Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 text-sm mb-3">
              Source, Time, Channel, Outcomes, Network, Justice scoring
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Processing:</span>
                <span className="text-blue-400">12 active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Queue:</span>
                <span className="text-slate-400">3 pending</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <Database className="h-5 w-5" />
              Blockchain Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-300 text-sm mb-3">
              Verified evidence ready for final blockchain minting
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Ready to Mint:</span>
                <span className="text-yellow-400">18 artifacts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">User Approval:</span>
                <span className="text-slate-400">Required</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default VerificationDashboard;