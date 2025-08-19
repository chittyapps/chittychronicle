import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Shield, 
  Eye, 
  Download, 
  Lock, 
  CheckCircle, 
  AlertTriangle,
  Key,
  Share2,
  FileText,
  Clock,
  User,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function SharePage() {
  const [match, params] = useRoute("/share/:shareId");
  const [pin, setPin] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const { toast } = useToast();

  const shareId = params?.shareId;

  const { data: shareData, error, isLoading, refetch } = useQuery({
    queryKey: ["/api/share", shareId],
    queryFn: async () => {
      if (!shareId) throw new Error("No share ID provided");
      
      const url = `/api/share/${shareId}${pin ? `?pin=${pin}` : ''}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          setAccessDenied(true);
          throw new Error(errorData.reason || 'Access denied');
        }
        throw new Error('Failed to access shared evidence');
      }
      
      const data = await response.json();
      setIsUnlocked(true);
      setAccessDenied(false);
      return data;
    },
    enabled: !!shareId,
    retry: false
  });

  const handlePinSubmit = () => {
    if (!pin) {
      toast({
        title: "PIN Required",
        description: "Please enter the security PIN",
        variant: "destructive",
      });
      return;
    }
    refetch();
  };

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case "view": return "bg-blue-500";
      case "download": return "bg-green-500";
      case "verify": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getAccessLevelIcon = (level: string) => {
    switch (level) {
      case "view": return <Eye className="w-4 h-4" />;
      case "download": return <Download className="w-4 h-4" />;
      case "verify": return <Shield className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  if (!match) {
    return <div>Page not found</div>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
        <Card className="professional-card w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary-blue border-t-transparent rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Loading Shared Evidence</h3>
            <p className="text-slate-400">Verifying access permissions...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      {/* Header */}
      <div className="bg-slate-900/50 border-b border-border">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Shared Evidence</h1>
              <p className="text-sm text-slate-400">Secure evidence sharing via ChittyVerify</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* PIN Entry (if required and not unlocked) */}
        {accessDenied && !isUnlocked && (
          <Card className="professional-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Lock className="w-6 h-6 text-warning" />
                <span className="text-white">Security PIN Required</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-400">
                This shared evidence is protected with a security PIN. Please enter the PIN provided by the sender.
              </p>
              
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="Enter 4-6 digit PIN"
                  className="input-professional"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={6}
                  data-testid="input-security-pin"
                />
                <Button
                  onClick={handlePinSubmit}
                  className="btn-primary"
                  data-testid="button-verify-pin"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Verify
                </Button>
              </div>

              {error && (
                <Alert className="alert-error">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {/* Evidence Display (if unlocked or no PIN required) */}
        {shareData && isUnlocked && (
          <>
            {/* Share Information */}
            <Card className="professional-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-primary-blue" />
                    <span className="text-white">Shared Evidence Access</span>
                  </div>
                  <Badge 
                    className={`${getAccessLevelColor(shareData.share.accessLevel)} text-white`}
                    data-testid="badge-access-level"
                  >
                    {getAccessLevelIcon(shareData.share.accessLevel)}
                    <span className="ml-1 capitalize">{shareData.share.accessLevel}</span>
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-slate-400">Share ID</Label>
                    <p className="text-white font-mono">{shareData.share.shareId}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Shared By</Label>
                    <p className="text-white">{shareData.share.sharedBy}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evidence Details */}
            <Card className="evidence-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary-blue" />
                  <div>
                    <span className="text-white">{shareData.evidence.title}</span>
                    <p className="text-sm text-slate-400 font-normal">Evidence Document</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-slate-400">Evidence ID</Label>
                    <p className="text-white font-mono">{shareData.evidence.id}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Type</Label>
                    <p className="text-white capitalize">{shareData.evidence.type}</p>
                  </div>
                  <div>
                    <Label className="text-slate-400">Status</Label>
                    <Badge className="bg-success text-white">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                </div>

                {/* Access Actions */}
                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button className="btn-primary" data-testid="button-view-evidence">
                    <Eye className="w-4 h-4 mr-2" />
                    View Evidence
                  </Button>
                  
                  {shareData.share.accessLevel !== "view" && (
                    <Button variant="outline" data-testid="button-download-evidence">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  )}
                  
                  {shareData.share.accessLevel === "verify" && (
                    <Button variant="outline" data-testid="button-verify-evidence">
                      <Shield className="w-4 h-4 mr-2" />
                      Full Verification
                    </Button>
                  )}
                </div>

                <Alert className="alert-info">
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    This evidence has been securely shared through ChittyVerify's immutable verification layer. 
                    All access is logged and audited.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* ChittyVerify Badge */}
            <Card className="professional-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-center gap-3 text-sm text-slate-400">
                  <Shield className="w-4 h-4 text-primary-blue" />
                  <span>Secured by ChittyVerify Evidence Platform</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-primary-blue hover:text-white"
                    data-testid="link-chittyverify"
                  >
                    Learn More
                    <ExternalLink className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Error State */}
        {error && !accessDenied && (
          <Card className="professional-card">
            <CardContent className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 text-warning mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Access Error</h3>
              <p className="text-slate-400 mb-4">{error.message}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}