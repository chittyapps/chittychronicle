/**
 * Evidence Details Page - Comprehensive evidence analysis and blockchain integration
 */

import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { ComprehensiveAnalyzer } from "@/components/evidence/ComprehensiveAnalyzer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Calendar, User, Shield, TrendingUp } from "lucide-react";
import { blockchainService } from "@/lib/services/blockchain-service";
import { useState, useEffect } from "react";

export default function EvidenceDetails() {
  const params = useParams();
  const evidenceId = params.id;
  const [blockchainStatus, setBlockchainStatus] = useState<any>(null);

  const { data: evidence, isLoading } = useQuery({
    queryKey: ["/api/evidence", evidenceId],
    enabled: !!evidenceId,
  });

  const { data: caseData } = useQuery({
    queryKey: ["/api/cases", evidence?.caseId],
    enabled: !!evidence?.caseId,
  });

  useEffect(() => {
    const loadBlockchainStatus = async () => {
      if (evidenceId) {
        const status = await blockchainService.getEvidenceVerificationStatus(evidenceId);
        setBlockchainStatus(status);
      }
    };
    loadBlockchainStatus();
  }, [evidenceId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!evidence) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Evidence Not Found</h1>
          <p className="text-gray-600 mb-8">The evidence you're looking for doesn't exist or has been removed.</p>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'minted': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAnalysisComplete = (results: any) => {
    console.log('Analysis completed:', results);
    // Could trigger a refetch or show success notification
  };

  return (
    <div className="min-h-screen bg-gray-50 bg-noise">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
          <span>/</span>
          <Link href={`/cases/${evidence.caseId}`} className="hover:text-gray-700">
            {caseData?.name || 'Case'}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{evidence.title}</span>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{evidence.title}</h1>
            <p className="text-gray-600 text-lg">{evidence.description}</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Evidence Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Evidence Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <Badge variant="outline">{evidence.type}</Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <Badge className={getStatusColor(evidence.status)}>
                      {evidence.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trust Score</label>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="font-semibold">{evidence.trustScore}/100</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Uploaded</label>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{new Date(evidence.uploadedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {evidence.metadata && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Metadata</label>
                    <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
                      {JSON.stringify(evidence.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Comprehensive Analysis */}
            <ComprehensiveAnalyzer
              evidenceId={evidenceId}
              caseId={evidence.caseId}
              evidence={evidence}
              onAnalysisComplete={handleAnalysisComplete}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Blockchain Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  Blockchain Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {blockchainStatus ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Minted</span>
                      <Badge variant={blockchainStatus.minted ? "default" : "outline"}>
                        {blockchainStatus.minted ? "Yes" : "No"}
                      </Badge>
                    </div>
                    
                    {blockchainStatus.minted && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Weight</span>
                          <span className="font-medium">
                            {(blockchainStatus.weight * 100).toFixed(0)}%
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Block #</span>
                          <span className="font-mono text-sm">
                            {blockchainStatus.blockNumber}
                          </span>
                        </div>
                        
                        <div>
                          <span className="text-sm text-gray-600">Minted At</span>
                          <div className="text-sm font-mono break-all">
                            {new Date(blockchainStatus.mintedAt).toLocaleString()}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Loading blockchain status...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Case Information */}
            {caseData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-purple-500" />
                    Case Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Case Name</label>
                      <Link href={`/cases/${caseData.id}`} className="text-blue-600 hover:underline">
                        {caseData.name}
                      </Link>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <Badge variant="outline">{caseData.status}</Badge>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Trust Score</label>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="font-semibold">{caseData.trustScore}/100</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Evidence Summary</label>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="font-semibold text-blue-600">{caseData.totalEvidence}</div>
                          <div className="text-blue-500">Total</div>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="font-semibold text-green-600">{caseData.verifiedEvidence}</div>
                          <div className="text-green-500">Verified</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="w-4 h-4 mr-2" />
                    Download Evidence
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="w-4 h-4 mr-2" />
                    Verify Chain
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    View Analytics
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}