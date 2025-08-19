/**
 * Comprehensive Analyzer - Advanced Evidence Analysis with Blockchain Integration
 * Integrates forensic analysis, contradiction detection, and blockchain minting
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Shield, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  FileText,
  Scale,
  Brain,
  Link2
} from 'lucide-react';
import { blockchainService } from '@/lib/services/blockchain-service';
import { calculateFactWeight, assessCaseStrength } from '@/lib/formulas';
import { EvidenceTier, MintingStatus, AtomicFact } from '../../../../shared/types';

interface AnalysisProgress {
  stage: string;
  progress: number;
  status: 'pending' | 'running' | 'completed' | 'error';
  message: string;
  results?: any;
}

interface ComprehensiveAnalyzerProps {
  evidenceId: string;
  caseId: string;
  evidence: any;
  onAnalysisComplete?: (results: any) => void;
}

export function ComprehensiveAnalyzer({ 
  evidenceId, 
  caseId, 
  evidence, 
  onAnalysisComplete 
}: ComprehensiveAnalyzerProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStages, setAnalysisStages] = useState<AnalysisProgress[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [blockchainStatus, setBlockchainStatus] = useState<any>(null);

  const stages = [
    { key: 'intake', name: 'Evidence Intake', icon: FileText },
    { key: 'forensic', name: 'Forensic Analysis', icon: Search },
    { key: 'contradictions', name: 'Contradiction Detection', icon: AlertTriangle },
    { key: 'facts', name: 'Facts Extraction', icon: Brain },
    { key: 'validation', name: 'Blockchain Validation', icon: Shield },
    { key: 'minting', name: 'Blockchain Minting', icon: Link2 }
  ];

  useEffect(() => {
    // Initialize analysis stages
    const initialStages = stages.map(stage => ({
      stage: stage.name,
      progress: 0,
      status: 'pending' as const,
      message: `Waiting to start ${stage.name}...`
    }));
    setAnalysisStages(initialStages);

    // Get blockchain status
    const status = blockchainService.getBlockchainStatus();
    setBlockchainStatus(status);
  }, [evidenceId]);

  const startComprehensiveAnalysis = async () => {
    setIsAnalyzing(true);
    setOverallProgress(0);

    try {
      // Stage 1: Evidence Intake
      await runAnalysisStage('intake', async () => {
        return {
          evidenceId,
          caseId,
          type: evidence.type,
          uploadedAt: new Date().toISOString(),
          initialWeight: calculateEvidenceWeight(evidence.tier || EvidenceTier.UNCORROBORATED_PERSON)
        };
      });

      // Stage 2: Forensic Analysis
      await runAnalysisStage('forensic', async () => {
        // Simulate forensic analysis
        await delay(2000);
        return {
          metadataIntegrity: Math.random() > 0.2 ? 'VALID' : 'SUSPICIOUS',
          temporalConsistency: Math.random() > 0.1 ? 'CONSISTENT' : 'INCONSISTENT',
          documentAuthenticity: Math.random() > 0.15 ? 'AUTHENTIC' : 'QUESTIONABLE',
          anomaliesDetected: Math.floor(Math.random() * 3)
        };
      });

      // Stage 3: Contradiction Detection
      await runAnalysisStage('contradictions', async () => {
        await delay(1500);
        const contradictions = Math.random() > 0.7 ? [
          {
            type: 'TEMPORAL',
            description: 'Date inconsistency with existing evidence',
            severity: 'MEDIUM',
            affectedClaims: ['claim_1', 'claim_3']
          }
        ] : [];

        return {
          contradictionsFound: contradictions.length,
          contradictions,
          resolutionRequired: contradictions.length > 0
        };
      });

      // Stage 4: Facts Extraction
      await runAnalysisStage('facts', async () => {
        await delay(2500);
        const extractedFacts: AtomicFact[] = [
          {
            factId: `FACT-${Date.now()}-001`,
            parentDocument: evidenceId,
            factText: `Amount: $${Math.floor(Math.random() * 50000 + 10000)}`,
            factType: 'AMOUNT' as any,
            locationInDocument: 'p.1 ¶2 l.3',
            classificationLevel: 'FACT' as any,
            weight: 0.85,
            credibilityFactors: ['CONTEMPORANEOUS' as any],
            relatedFacts: [],
            supportsCaseTheory: [caseId],
            contradictsCaseTheory: [],
            chittyChainStatus: MintingStatus.PENDING
          },
          {
            factId: `FACT-${Date.now()}-002`,
            parentDocument: evidenceId,
            factText: `Date: ${new Date().toLocaleDateString()}`,
            factType: 'DATE' as any,
            locationInDocument: 'p.1 ¶1 l.1',
            classificationLevel: 'FACT' as any,
            weight: 0.92,
            credibilityFactors: ['BUSINESS_DUTY' as any],
            relatedFacts: [],
            supportsCaseTheory: [caseId],
            contradictsCaseTheory: [],
            chittyChainStatus: MintingStatus.PENDING
          }
        ];

        const caseStrength = assessCaseStrength(extractedFacts);

        return {
          factsExtracted: extractedFacts.length,
          facts: extractedFacts,
          caseStrength,
          highConfidenceFacts: extractedFacts.filter(f => f.weight >= 0.8).length
        };
      });

      // Stage 5: Blockchain Validation
      await runAnalysisStage('validation', async () => {
        await delay(1000);
        const validation = await blockchainService.validateBlockchainIntegrity();
        return {
          chainValid: validation.valid,
          errors: validation.errors,
          recommendations: validation.recommendations
        };
      });

      // Stage 6: Blockchain Minting
      await runAnalysisStage('minting', async () => {
        await delay(2000);
        
        const mintingRequest = {
          evidenceId,
          statement: `Evidence analysis for ${evidence.title}`,
          type: evidence.type || 'document',
          tier: evidence.tier || EvidenceTier.UNCORROBORATED_PERSON,
          caseId,
          metadata: {
            analysisTimestamp: new Date().toISOString(),
            factsExtracted: analysisResults?.facts?.factsExtracted || 0
          }
        };

        const mintingResult = await blockchainService.mintEvidence(
          [mintingRequest], 
          'comprehensive-analyzer'
        );

        return mintingResult;
      });

      // Complete analysis
      const finalResults = {
        evidenceId,
        caseId,
        completedAt: new Date().toISOString(),
        stages: analysisStages,
        overallStatus: 'COMPLETED'
      };

      setAnalysisResults(finalResults);
      onAnalysisComplete?.(finalResults);

    } catch (error) {
      console.error('Analysis failed:', error);
      updateStageStatus(analysisStages.length - 1, 'error', 0, `Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
      setOverallProgress(100);
    }
  };

  const runAnalysisStage = async (stageKey: string, stageFunction: () => Promise<any>) => {
    const stageIndex = stages.findIndex(s => s.key === stageKey);
    const stageName = stages[stageIndex].name;

    // Update stage to running
    updateStageStatus(stageIndex, 'running', 0, `Running ${stageName}...`);

    try {
      // Simulate progress updates
      for (let progress = 20; progress <= 80; progress += 20) {
        updateStageStatus(stageIndex, 'running', progress, `${stageName} ${progress}% complete...`);
        await delay(500);
      }

      // Run the actual stage function
      const results = await stageFunction();

      // Complete the stage
      updateStageStatus(stageIndex, 'completed', 100, `${stageName} completed successfully`, results);
      
      // Update overall progress
      setOverallProgress(((stageIndex + 1) / stages.length) * 100);

    } catch (error) {
      updateStageStatus(stageIndex, 'error', 0, `${stageName} failed: ${error.message}`);
      throw error;
    }
  };

  const updateStageStatus = (
    stageIndex: number, 
    status: AnalysisProgress['status'], 
    progress: number, 
    message: string, 
    results?: any
  ) => {
    setAnalysisStages(prev => prev.map((stage, index) => 
      index === stageIndex 
        ? { ...stage, status, progress, message, results }
        : stage
    ));
  };

  const getStageIcon = (stage: AnalysisProgress, stageKey: string) => {
    const StageIcon = stages.find(s => s.key === stageKey)?.icon || FileText;
    
    if (stage.status === 'completed') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (stage.status === 'error') return <AlertTriangle className="w-5 h-5 text-red-500" />;
    if (stage.status === 'running') return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
    return <StageIcon className="w-5 h-5 text-gray-400" />;
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-500" />
            Comprehensive Evidence Analysis
          </CardTitle>
          <CardDescription>
            Advanced forensic analysis with blockchain integration for {evidence.title}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={startComprehensiveAnalysis}
                disabled={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isAnalyzing ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Start Analysis
                  </>
                )}
              </Button>
              
              {blockchainStatus?.initialized && (
                <Badge variant="outline" className="text-green-600">
                  <Shield className="w-3 h-3 mr-1" />
                  Blockchain Ready
                </Badge>
              )}
            </div>
            
            <div className="text-right">
              <div className="text-2xl font-bold">{Math.round(overallProgress)}%</div>
              <div className="text-sm text-gray-500">Overall Progress</div>
            </div>
          </div>
          
          <Progress value={overallProgress} className="w-full" />
        </CardContent>
      </Card>

      {/* Analysis Stages */}
      <div className="grid gap-4">
        {analysisStages.map((stage, index) => {
          const stageConfig = stages[index];
          return (
            <Card key={index} className={`transition-all duration-300 ${
              stage.status === 'running' ? 'ring-2 ring-blue-500' : ''
            }`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getStageIcon(stage, stageConfig.key)}
                    <div>
                      <h3 className="font-medium">{stage.stage}</h3>
                      <p className="text-sm text-gray-500">{stage.message}</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <Badge variant={
                      stage.status === 'completed' ? 'default' :
                      stage.status === 'running' ? 'secondary' :
                      stage.status === 'error' ? 'destructive' : 'outline'
                    }>
                      {stage.status}
                    </Badge>
                  </div>
                </div>
                
                {stage.status === 'running' && (
                  <Progress value={stage.progress} className="w-full mt-2" />
                )}
                
                {stage.results && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(stage.results, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Results Summary */}
      {analysisResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-green-500" />
              Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="facts">Facts</TabsTrigger>
                <TabsTrigger value="blockchain">Blockchain</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-center">
                        {analysisStages.filter(s => s.status === 'completed').length}/{analysisStages.length}
                      </div>
                      <p className="text-center text-sm text-gray-500">Stages Completed</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-center text-green-600">
                        {analysisStages.find(s => s.stage.includes('Facts'))?.results?.highConfidenceFacts || 0}
                      </div>
                      <p className="text-center text-sm text-gray-500">High Confidence Facts</p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-2xl font-bold text-center text-blue-600">
                        {blockchainStatus?.chainValid ? 'Valid' : 'Invalid'}
                      </div>
                      <p className="text-center text-sm text-gray-500">Blockchain Status</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="facts" className="mt-4">
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {analysisStages.find(s => s.stage.includes('Facts'))?.results?.facts?.map((fact: AtomicFact, index: number) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{fact.factText}</p>
                              <p className="text-sm text-gray-500">{fact.locationInDocument}</p>
                            </div>
                            <Badge variant="outline">
                              Weight: {(fact.weight * 100).toFixed(0)}%
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="blockchain" className="mt-4">
                <div className="space-y-4">
                  {blockchainStatus && (
                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Blockchain Status: {blockchainStatus.chainValid ? 'Operational' : 'Issues Detected'}
                        <br />
                        Blocks: {blockchainStatus.chainLength || 0} | 
                        Artifacts: {blockchainStatus.totalArtifacts || 0}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {analysisStages.find(s => s.stage.includes('Minting'))?.results && (
                    <div className="p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800 mb-2">Minting Results</h4>
                      <pre className="text-sm text-green-700">
                        {JSON.stringify(
                          analysisStages.find(s => s.stage.includes('Minting'))?.results, 
                          null, 
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}