import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronUp,
  MessageSquare,
  Mail,
  MessageCircle,
  Phone
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CommunicationContradiction {
  id: string;
  caseId: string;
  messageIds: string[];
  timelineEntryIds: string[];
  contradictionType: 'temporal' | 'factual' | 'witness' | 'location' | 'entity' | 'logical' | 'cross_platform';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  conflictingData: {
    type: 'message' | 'timeline_entry';
    id: string;
    source: string;
    content: string;
    timestamp: string;
    platform?: string;
    direction?: string;
  }[];
  suggestedResolution?: string;
  confidence: number;
  detectedAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata?: {
    analysisDetails: string;
    crossPlatformConflicts?: {
      platforms: string[];
      conflictReason: string;
    }[];
    identityConflicts?: {
      partyId: string;
      conflictReason: string;
    }[];
  };
}

interface CommunicationContradictionAnalysisResult {
  contradictions: CommunicationContradiction[];
  summary: {
    totalContradictions: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    crossPlatformCount: number;
    timelineIntegrationCount: number;
    analysisTimestamp: string;
  };
  recommendations: string[];
  crossPlatformInsights: {
    platformCoverage: string[];
    identityResolutionIssues: number;
    temporalInconsistencies: number;
  };
}

interface CommunicationsContradictionAnalyzerProps {
  caseId: string;
}

export function CommunicationsContradictionAnalyzer({ caseId }: CommunicationsContradictionAnalyzerProps) {
  const { toast } = useToast();
  const [expandedContradictions, setExpandedContradictions] = useState<Set<string>>(new Set());
  const [analysisMode, setAnalysisMode] = useState<'communications' | 'timeline' | 'unified'>('unified');

  const { data: analysisResult, isLoading, refetch } = useQuery<CommunicationContradictionAnalysisResult>({
    queryKey: ['/api/cases', caseId, 'communications-contradictions', analysisMode],
    retry: false,
  });

  const analyzeContradictionsMutation = useMutation({
    mutationFn: async (mode: string) => {
      return await apiRequest('POST', `/api/cases/${caseId}/analyze-communications-contradictions`, {
        mode,
        includeTimeline: mode === 'unified' || mode === 'timeline',
        includeCommunications: mode === 'unified' || mode === 'communications',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/cases', caseId, 'communications-contradictions'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['/api/cases', caseId, 'contradictions'] 
      });
      toast({
        title: "Analysis Complete",
        description: "Cross-platform contradiction analysis has been updated",
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
      return await apiRequest('POST', `/api/communications-contradictions/${contradictionId}/resolve`, {
        resolvedBy: 'current-user',
        resolution,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/cases', caseId, 'communications-contradictions'] 
      });
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
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-blue-500 bg-blue-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getContradictionTypeIcon = (type: string) => {
    switch (type) {
      case 'temporal':
        return <Clock className="h-4 w-4" />;
      case 'witness':
        return <User className="h-4 w-4" />;
      case 'location':
        return <MapPin className="h-4 w-4" />;
      case 'cross_platform':
        return <MessageSquare className="h-4 w-4" />;
      case 'entity':
        return <User className="h-4 w-4" />;
      case 'logical':
        return <Brain className="h-4 w-4" />;
      default:
        return <FileX className="h-4 w-4" />;
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />;
      case 'openphone':
        return <Phone className="h-4 w-4" />;
      case 'timeline':
        return <Clock className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const toggleContradictionExpansion = (contradictionId: string) => {
    const newExpanded = new Set(expandedContradictions);
    if (newExpanded.has(contradictionId)) {
      newExpanded.delete(contradictionId);
    } else {
      newExpanded.add(contradictionId);
    }
    setExpandedContradictions(newExpanded);
  };

  const runAnalysis = () => {
    analyzeContradictionsMutation.mutate(analysisMode);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Analyzing communications for contradictions...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Analysis Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5" />
            <span>Cross-Platform Contradiction Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Tabs value={analysisMode} onValueChange={(value: any) => setAnalysisMode(value)}>
              <TabsList>
                <TabsTrigger value="communications" data-testid="tab-communications-only">Communications Only</TabsTrigger>
                <TabsTrigger value="timeline" data-testid="tab-timeline-only">Timeline Only</TabsTrigger>
                <TabsTrigger value="unified" data-testid="tab-unified-analysis">Unified Analysis</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button 
              onClick={runAnalysis}
              disabled={analyzeContradictionsMutation.isPending}
              data-testid="button-run-contradiction-analysis"
            >
              {analyzeContradictionsMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>

          {/* Analysis Summary */}
          {analysisResult && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {analysisResult.summary.criticalCount}
                </div>
                <div className="text-sm text-gray-600">Critical</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {analysisResult.summary.highCount}
                </div>
                <div className="text-sm text-gray-600">High</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {analysisResult.summary.mediumCount}
                </div>
                <div className="text-sm text-gray-600">Medium</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {analysisResult.summary.lowCount}
                </div>
                <div className="text-sm text-gray-600">Low</div>
              </div>
            </div>
          )}

          {/* Cross-Platform Insights */}
          {analysisResult?.crossPlatformInsights && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Cross-Platform Insights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Platforms:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {analysisResult.crossPlatformInsights.platformCoverage.map((platform) => (
                      <Badge key={platform} variant="outline" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Identity Issues:</span>
                  <span className="ml-2 text-orange-600">
                    {analysisResult.crossPlatformInsights.identityResolutionIssues}
                  </span>
                </div>
                <div>
                  <span className="font-medium">Temporal Issues:</span>
                  <span className="ml-2 text-red-600">
                    {analysisResult.crossPlatformInsights.temporalInconsistencies}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contradictions List */}
      {analysisResult?.contradictions && analysisResult.contradictions.length > 0 ? (
        <div className="space-y-4">
          {analysisResult.contradictions.map((contradiction) => (
            <Card 
              key={contradiction.id} 
              className={cn(
                "border-l-4",
                getSeverityColor(contradiction.severity)
              )}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {getSeverityIcon(contradiction.severity)}
                      {getContradictionTypeIcon(contradiction.contradictionType)}
                      <h3 className="font-medium">{contradiction.title}</h3>
                      <Badge variant="outline" className="text-xs">
                        {contradiction.contradictionType.replace('_', ' ')}
                      </Badge>
                      <div className="text-sm text-gray-500">
                        Confidence: {Math.round(contradiction.confidence * 100)}%
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{contradiction.description}</p>

                    {/* Conflicting Data Preview */}
                    <div className="space-y-2 mb-3">
                      {contradiction.conflictingData.slice(0, 2).map((data, index) => (
                        <div key={index} className="flex items-start space-x-2 bg-gray-50 p-2 rounded">
                          {getSourceIcon(data.source)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {data.type === 'message' ? data.platform : 'timeline'}
                              </Badge>
                              {data.direction && (
                                <Badge variant="outline" className="text-xs">
                                  {data.direction}
                                </Badge>
                              )}
                              <span className="text-xs text-gray-500">
                                {new Date(data.timestamp).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm line-clamp-2">{data.content}</p>
                          </div>
                        </div>
                      ))}
                      
                      {contradiction.conflictingData.length > 2 && (
                        <button
                          onClick={() => toggleContradictionExpansion(contradiction.id)}
                          className="text-sm text-blue-600 flex items-center"
                          data-testid={`button-expand-contradiction-${contradiction.id}`}
                        >
                          {expandedContradictions.has(contradiction.id) ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-4 w-4 mr-1" />
                              Show {contradiction.conflictingData.length - 2} More
                            </>
                          )}
                        </button>
                      )}
                      
                      {expandedContradictions.has(contradiction.id) && (
                        <div className="space-y-2">
                          {contradiction.conflictingData.slice(2).map((data, index) => (
                            <div key={index + 2} className="flex items-start space-x-2 bg-gray-50 p-2 rounded">
                              {getSourceIcon(data.source)}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <Badge variant="outline" className="text-xs">
                                    {data.type === 'message' ? data.platform : 'timeline'}
                                  </Badge>
                                  {data.direction && (
                                    <Badge variant="outline" className="text-xs">
                                      {data.direction}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {new Date(data.timestamp).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm">{data.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {contradiction.suggestedResolution && (
                      <Alert className="mb-3">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Suggested Resolution:</strong> {contradiction.suggestedResolution}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <div className="ml-4">
                    {!contradiction.resolvedAt ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resolveContradictionMutation.mutate({
                          contradictionId: contradiction.id,
                          resolution: 'Marked as resolved by user'
                        })}
                        disabled={resolveContradictionMutation.isPending}
                        data-testid={`button-resolve-contradiction-${contradiction.id}`}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Resolve
                      </Button>
                    ) : (
                      <Badge variant="secondary">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Brain className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Contradictions Found</h3>
            <p className="text-gray-600 mb-4">
              Great! No contradictions were detected in your {analysisMode} data.
            </p>
            <Button variant="outline" onClick={runAnalysis}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Re-run Analysis
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {analysisResult?.recommendations && analysisResult.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5" />
              <span>AI Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysisResult.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm">{recommendation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}