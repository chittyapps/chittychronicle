import React, { useState } from 'react';
import { Navigation } from '@/components/ui/navigation';
import { Footer } from '@/components/ui/footer';
import VerificationDashboard from '@/components/verification/VerificationDashboard';
import AdaptiveVerificationFlow from '@/components/verification/AdaptiveVerificationFlow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Play,
  Pause,
  RotateCcw,
  Activity,
  Database,
  Lock
} from 'lucide-react';

const demoScenarios = [
  {
    id: 'government-doc',
    title: 'Government Document',
    description: 'Property tax record from Cook County',
    evidenceId: 'ART-GOV2025',
    currentStep: 4,
    progress: 95,
    tier: 'GOVERNMENT'
  },
  {
    id: 'financial-stmt',
    title: 'Financial Statement',
    description: 'Bank statement with transaction history',
    evidenceId: 'ART-FIN2025',
    currentStep: 3,
    progress: 67,
    tier: 'FINANCIAL_INSTITUTION'
  },
  {
    id: 'legal-brief',
    title: 'Legal Professional',
    description: 'Attorney-filed motion document',
    evidenceId: 'ART-LEG2025',
    currentStep: 2,
    progress: 45,
    tier: 'LEGAL_PROFESSIONAL'
  },
  {
    id: 'individual',
    title: 'Individual Submission',
    description: 'Personal affidavit with supporting docs',
    evidenceId: 'ART-IND2025',
    currentStep: 1,
    progress: 23,
    tier: 'INDIVIDUAL'
  }
];

export default function VerificationPage() {
  const [selectedScenario, setSelectedScenario] = useState(demoScenarios[0]);
  const [isPlaying, setIsPlaying] = useState(false);

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'GOVERNMENT':
        return 'bg-green-400/20 text-green-400 border-green-400/30';
      case 'FINANCIAL_INSTITUTION':
        return 'bg-blue-400/20 text-blue-400 border-blue-400/30';
      case 'LEGAL_PROFESSIONAL':
        return 'bg-purple-400/20 text-purple-400 border-purple-400/30';
      default:
        return 'bg-slate-400/20 text-slate-400 border-slate-400/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 to-slate-900">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-16 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 to-blue-400/10"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center text-white mb-12">
            <h1 className="text-5xl font-bold mb-4">
              Adaptive Verification
              <span className="text-green-400 block">Visualization</span>
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Intuitive progress indicators showing the step-by-step immutability process for legal evidence
            </p>
            
            {/* Live Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-green-400 mb-2">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">ChittyVerified</span>
                </div>
                <div className="text-2xl font-bold text-white">247</div>
                <div className="text-sm text-slate-400">Immutable artifacts</div>
              </div>
              
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Activity className="h-5 w-5" />
                  <span className="font-medium">Processing</span>
                </div>
                <div className="text-2xl font-bold text-white">12</div>
                <div className="text-sm text-slate-400">Active verifications</div>
              </div>
              
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-yellow-400 mb-2">
                  <Database className="h-5 w-5" />
                  <span className="font-medium">Blockchain Ready</span>
                </div>
                <div className="text-2xl font-bold text-white">18</div>
                <div className="text-sm text-slate-400">Awaiting mint approval</div>
              </div>
              
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center gap-2 text-purple-400 mb-2">
                  <Lock className="h-5 w-5" />
                  <span className="font-medium">Trust Score</span>
                </div>
                <div className="text-2xl font-bold text-white">4.82</div>
                <div className="text-sm text-slate-400">Average 6D rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Scenario Selector */}
            <div className="lg:col-span-1">
              <Card className="bg-slate-900 border-slate-700 sticky top-4">
                <CardHeader>
                  <CardTitle className="text-green-400 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Demo Scenarios
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {demoScenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedScenario.id === scenario.id
                          ? 'border-green-400/50 bg-green-400/10'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                      onClick={() => setSelectedScenario(scenario)}
                      data-testid={`scenario-${scenario.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white text-sm">
                          {scenario.title}
                        </h4>
                        <Badge className={getTierColor(scenario.tier)}>
                          {scenario.progress}%
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 mb-2">
                        {scenario.description}
                      </p>
                      <div className="text-xs text-slate-500">
                        ID: {scenario.evidenceId}
                      </div>
                    </div>
                  ))}
                  
                  {/* Playback Controls */}
                  <div className="pt-4 border-t border-slate-700">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="flex-1 border-green-400/30 text-green-400 hover:bg-green-400/10"
                        data-testid="button-play-pause"
                      >
                        {isPlaying ? (
                          <Pause className="h-3 w-3 mr-1" />
                        ) : (
                          <Play className="h-3 w-3 mr-1" />
                        )}
                        {isPlaying ? 'Pause' : 'Play'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-600 text-slate-400 hover:bg-slate-700"
                        data-testid="button-reset"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Verification Flow */}
            <div className="lg:col-span-3">
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    Live Verification Process
                  </h2>
                  <div className="flex items-center gap-2">
                    {isPlaying && (
                      <Badge className="bg-red-400/20 text-red-400 border-red-400/30">
                        <div className="animate-pulse w-2 h-2 bg-red-400 rounded-full mr-1"></div>
                        LIVE
                      </Badge>
                    )}
                    <Badge className={getTierColor(selectedScenario.tier)}>
                      {selectedScenario.tier.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  {selectedScenario.description} • Step {selectedScenario.currentStep}/5
                </p>
              </div>
              
              <AdaptiveVerificationFlow
                evidenceId={selectedScenario.evidenceId}
                currentStep={selectedScenario.currentStep}
                overallProgress={selectedScenario.progress}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Process Overview */}
      <section className="py-12 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              The ChittyVerify Process
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto">
              Every piece of evidence goes through our rigorous 5-step verification process 
              before reaching the blockchain-ready state.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {[
              {
                step: 1,
                title: 'Upload',
                description: 'Secure transmission with integrity checks',
                icon: <Shield className="h-6 w-6" />,
                color: 'text-blue-400'
              },
              {
                step: 2,
                title: 'Validation',
                description: 'Schema and format verification',
                icon: <CheckCircle2 className="h-6 w-6" />,
                color: 'text-green-400'
              },
              {
                step: 3,
                title: '6D Analysis',
                description: 'Comprehensive trust scoring',
                icon: <Activity className="h-6 w-6" />,
                color: 'text-purple-400'
              },
              {
                step: 4,
                title: 'ChittyVerify',
                description: 'Immutable off-chain lock',
                icon: <Lock className="h-6 w-6" />,
                color: 'text-yellow-400'
              },
              {
                step: 5,
                title: 'Blockchain Ready',
                description: 'Approved for final minting',
                icon: <Database className="h-6 w-6" />,
                color: 'text-red-400'
              }
            ].map((item) => (
              <Card key={item.step} className="bg-slate-900 border-slate-700">
                <CardContent className="p-6 text-center">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-slate-800 mb-4 ${item.color}`}>
                    {item.icon}
                  </div>
                  <h3 className="font-semibold text-white mb-2">
                    {item.step}. {item.title}
                  </h3>
                  <p className="text-sm text-slate-400">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}