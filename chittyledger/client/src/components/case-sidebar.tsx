import { useQuery } from "@tanstack/react-query";
import { casesApi, contradictionsApi } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Upload, Search, Flag } from "lucide-react";

export default function CaseSidebar() {
  const { data: cases } = useQuery({
    queryKey: ["/api/cases"],
    queryFn: casesApi.getAll,
  });

  const { data: contradictions } = useQuery({
    queryKey: ["/api/contradictions"],
    queryFn: () => contradictionsApi.getAll(true),
  });

  const activeCase = cases?.[0]; // Get first case for demo
  const activeContradiction = contradictions?.[0];

  return (
    <div className="space-y-6">
      {/* Active Case Card */}
      {activeCase && (
        <Card className="evidence-card shadow-evidence border-legal-gold-500/20" data-testid="active-case-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-legal text-lg text-institutional-900">Active Case</CardTitle>
              <Badge className="bg-legal-gold-500/20 text-legal-gold-700 text-xs">
                PRIORITY
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="font-tech text-sm text-institutional-600">CASE ID</div>
              <div className="text-institutional-900 font-semibold">{activeCase.caseNumber}</div>
            </div>
            
            <div>
              <div className="font-tech text-sm text-institutional-600">PARTIES</div>
              <div className="text-institutional-900">{activeCase.title}</div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-tech text-xs text-institutional-600">EVIDENCE ITEMS</div>
                <div className="text-institutional-900 font-semibold text-lg">23</div>
              </div>
              <div>
                <div className="font-tech text-xs text-institutional-600">MINTED FACTS</div>
                <div className="text-institutional-900 font-semibold text-lg">187</div>
              </div>
            </div>
            
            {activeCase.nextHearing && (
              <div className="pt-3 border-t border-institutional-300">
                <div className="font-tech text-xs text-institutional-600 mb-2">NEXT HEARING</div>
                <div className="text-institutional-900 font-semibold">
                  {new Date(activeCase.nextHearing).toLocaleDateString()}
                </div>
                <div className="text-xs text-institutional-600">
                  {activeCase.judge}, {activeCase.courtroom}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Contradiction Alert */}
      {activeContradiction && (
        <Card className="bg-forensic-red-500/10 border-forensic-red-500/30" data-testid="contradiction-alert">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 bg-forensic-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-institutional-50 text-sm" />
              </div>
              <div>
                <h3 className="font-semibold text-forensic-red-500">Contradiction Detected</h3>
                <div className="text-xs text-forensic-red-700">{activeContradiction.conflictId}</div>
              </div>
            </div>
            
            <p className="text-sm text-institutional-700 mb-4">
              {activeContradiction.description}
            </p>
            
            <Button 
              className="w-full bg-forensic-red-500 hover:bg-forensic-red-600 text-institutional-50"
              data-testid="button-review-contradiction"
            >
              Review Contradiction
            </Button>
          </CardContent>
        </Card>
      )}
      
      {/* Quick Actions */}
      <Card className="evidence-card shadow-evidence border-legal-gold-500/20" data-testid="quick-actions-card">
        <CardHeader>
          <CardTitle className="font-legal text-lg text-institutional-900">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="ghost" 
            className="w-full justify-start space-x-3 p-3 hover:bg-institutional-100"
            data-testid="button-upload-evidence"
          >
            <div className="w-8 h-8 bg-legal-gold-500/20 rounded-lg flex items-center justify-center">
              <Upload className="text-legal-gold-600 text-sm" />
            </div>
            <span className="text-institutional-700">Upload New Evidence</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start space-x-3 p-3 hover:bg-institutional-100"
            data-testid="button-verify-chain"
          >
            <div className="w-8 h-8 bg-institutional-600/20 rounded-lg flex items-center justify-center">
              <Search className="text-institutional-600 text-sm" />
            </div>
            <span className="text-institutional-700">Verify Evidence Chain</span>
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start space-x-3 p-3 hover:bg-institutional-100"
            data-testid="button-report-issue"
          >
            <div className="w-8 h-8 bg-forensic-red-500/20 rounded-lg flex items-center justify-center">
              <Flag className="text-forensic-red-500 text-sm" />
            </div>
            <span className="text-institutional-700">Report Issue</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
