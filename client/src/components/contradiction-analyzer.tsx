import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Clock, 
  User, 
  MapPin, 
  FileX, 
  Brain,
  Zap,
  CheckCircle,
  XCircle,
  Info,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ContradictionReport {
  id: string;
  caseId: string;
  timelineEntryIds: string[];
  contradictionType: 'temporal' | 'factual' | 'witness' | 'location' | 'entity' | 'logical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  conflictingStatements: {
    entryId: string;
    statement: string;
    chittyId?: string;
    entityType?: 'person' | 'place' | 'thing' | 'event';
  }[];
  suggestedResolution?: string;
  confidence: number;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata?: {
    analysisDetails: string;
    chittyIdConflicts?: {
      entityId: string;
      conflictReason: string;
    }[];
  };
}

interface ContradictionAnalysisResult {
  contradictions: ContradictionReport[];
  summary: {
    totalContradictions: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    analysisTimestamp: string;
  };
  recommendations: string[];
}

interface ContradictionAnalyzerProps {
  caseId: string;
}

export function ContradictionAnalyzer({ caseId }: ContradictionAnalyzerProps) {
  const { toast } = useToast();
  const [expandedContradictions, setExpandedContradictions] = useState<Set<string>>(new Set());

  const { data: analysisResult, isLoading, refetch } = useQuery<ContradictionAnalysisResult>({
    queryKey: ['/api/cases', caseId, 'contradictions'],
    retry: false,
  });

  const analyzeContradictionsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('POST', `/api/cases/${caseId}/analyze-contradictions`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId, 'contradictions'] });
      toast({
        title: "Analysis Complete",
        description: "Contradiction analysis has been updated",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze contradictions. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resolveContradictionMutation = useMutation({
    mutationFn: async ({ contradictionId, resolution }: { contradictionId: string; resolution: string }) => {
      return await apiRequest('POST', `/api/contradictions/${contradictionId}/resolve`, {
        resolvedBy: 'current-user', // In real app, get from auth context
        resolution,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cases', caseId, 'contradictions'] });
      toast({
        title: "Contradiction Resolved",
        description: "The contradiction has been marked as resolved",
      });
    },
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <Info className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'high':
        return 'border-orange-200 bg-orange-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'temporal':
        return <Clock className="h-4 w-4" />;
      case 'witness':
        return <User className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'entity':
        return <Sparkles className="h-4 w-4" />;
      case 'factual':
        return <FileX className="h-4 w-4" />;
      case 'logical':
        return <Brain className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const toggleExpanded = (contradictionId: string) => {
    const newExpanded = new Set(expandedContradictions);
    if (newExpanded.has(contradictionId)) {
      newExpanded.delete(contradictionId);
    } else {
      newExpanded.add(contradictionId);
    }
    setExpandedContradictions(newExpanded);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Brain className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">AI Contradiction Detection</h2>
            <p className="text-sm text-gray-600">Advanced analysis powered by ChittyID</p>
          </div>
        </div>
        <Button
          onClick={() => analyzeContradictionsMutation.mutate()}
          disabled={analyzeContradictionsMutation.isPending}
          className="shadow-soft"
        >
          {analyzeContradictionsMutation.isPending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Zap className="h-4 w-4 mr-2" />
          )}
          {analyzeContradictionsMutation.isPending ? 'Analyzing...' : 'Run Analysis'}
        </Button>
      </div>

      {/* Analysis Summary */}
      {analysisResult && (
        <Card className="shadow-soft border-0">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <span>Analysis Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">{analysisResult.summary.totalContradictions}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analysisResult.summary.criticalCount}</div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{analysisResult.summary.highCount}</div>
                <div className="text-sm text-gray-600">High</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{analysisResult.summary.mediumCount}</div>
                <div className="text-sm text-gray-600">Medium</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analysisResult.summary.lowCount}</div>
                <div className="text-sm text-gray-600">Low</div>
              </div>
            </div>

            {analysisResult.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Recommendations</h4>
                <ul className="space-y-1">
                  {analysisResult.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-700 flex items-start">
                      <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mr-2 mt-2 flex-shrink-0"></div>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Contradictions List */}
      {isLoading ? (
        <Card className="shadow-soft border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-center space-x-3">
              <RefreshCw className="h-5 w-5 animate-spin text-purple-600" />
              <span>Running AI analysis...</span>
            </div>
            <Progress value={65} className="mt-4" />
          </CardContent>
        </Card>
      ) : analysisResult?.contradictions.length ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Detected Contradictions</h3>
          {analysisResult.contradictions.map((contradiction) => {
            const isExpanded = expandedContradictions.has(contradiction.id);
            return (
              <Card 
                key={contradiction.id} 
                className={cn("shadow-soft border transition-all duration-200", getSeverityColor(contradiction.severity))}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(contradiction.severity)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-semibold">{contradiction.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {getTypeIcon(contradiction.contradictionType)}
                            <span className="ml-1 capitalize">{contradiction.contradictionType}</span>
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(contradiction.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <p className="text-gray-700 text-sm">{contradiction.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!contradiction.resolvedAt && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resolveContradictionMutation.mutate({ 
                            contradictionId: contradiction.id, 
                            resolution: "Marked as resolved" 
                          })}
                          disabled={resolveContradictionMutation.isPending}
                        >
                          Resolve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpanded(contradiction.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      {/* Conflicting Statements */}
                      <div>
                        <h5 className="font-medium text-sm mb-2">Conflicting Statements</h5>
                        <div className="space-y-2">
                          {contradiction.conflictingStatements.map((statement, index) => (
                            <div key={index} className="bg-white p-3 rounded-lg border">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-500">Entry {statement.entryId.slice(-8)}</span>
                                {statement.chittyId && (
                                  <Badge variant="outline" className="text-xs">
                                    {statement.chittyId}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm">{statement.statement}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ChittyID Conflicts */}
                      {contradiction.metadata?.chittyIdConflicts?.length && (
                        <div>
                          <h5 className="font-medium text-sm mb-2">ChittyID Entity Conflicts</h5>
                          <div className="space-y-1">
                            {contradiction.metadata.chittyIdConflicts.map((conflict, index) => (
                              <div key={index} className="flex items-center justify-between bg-yellow-50 p-2 rounded">
                                <span className="text-sm font-mono">{conflict.entityId}</span>
                                <span className="text-xs text-gray-600">{conflict.conflictReason}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Suggested Resolution */}
                      {contradiction.suggestedResolution && (
                        <div>
                          <h5 className="font-medium text-sm mb-2">Suggested Resolution</h5>
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription className="text-sm">
                              {contradiction.suggestedResolution}
                            </AlertDescription>
                          </Alert>
                        </div>
                      )}
                    </div>
                  )}

                  {contradiction.resolvedAt && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">Resolved on {new Date(contradiction.resolvedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="shadow-soft border-dashed border-2 border-gray-300">
          <CardContent className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Contradictions Detected</h3>
            <p className="text-gray-600 mb-6">
              The AI analysis found no contradictions in your timeline entries. 
              This suggests your evidence is consistent and well-organized.
            </p>
            <Button
              onClick={() => analyzeContradictionsMutation.mutate()}
              disabled={analyzeContradictionsMutation.isPending}
              variant="outline"
            >
              <Zap className="h-4 w-4 mr-2" />
              Run Analysis Again
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}