import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  Zap, 
  CheckCircle, 
  Clock, 
  Hash, 
  FileCheck,
  AlertCircle,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BeaconData {
  evidenceId: string;
  beaconId: string;
  chittyId: string;
  timestamp: number;
  hash: string;
  metadata: {
    type: string;
    size: number;
    source: string;
    jurisdiction: string;
  };
}

interface BeaconVerification {
  beaconId: string;
  timestamp: number;
  hash: string;
  signature: string;
  status: 'pending' | 'verified' | 'failed';
}

export default function ChittyBeaconWidget() {
  const [formData, setFormData] = useState({
    chittyId: '',
    evidenceType: 'document',
    fileHash: '',
    fileSize: 0,
    source: ''
  });
  const [verifyBeaconId, setVerifyBeaconId] = useState('');
  const { toast } = useToast();

  // Health check query
  const { data: healthStatus } = useQuery({
    queryKey: ['/api/beacon/health'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Generate beacon mutation
  const generateBeaconMutation = useMutation({
    mutationFn: async (data: typeof formData): Promise<BeaconData> => {
      const response = await apiRequest('/api/beacon/beacon/generate', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },
    onSuccess: (data: BeaconData) => {
      toast({
        title: "ChittyBeacon Generated",
        description: `Beacon ID: ${data.beaconId}`,
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Verify beacon mutation
  const verifyBeaconMutation = useMutation({
    mutationFn: async (beaconId: string): Promise<BeaconVerification> => {
      const response = await apiRequest('/api/beacon/beacon/verify', {
        method: 'POST',
        body: JSON.stringify({ beaconId }),
      });
      return response.json();
    },
    onSuccess: (data: BeaconVerification) => {
      toast({
        title: data.status === 'verified' ? "Beacon Verified" : "Verification Failed",
        description: `Status: ${data.status}`,
        variant: data.status === 'verified' ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Verification Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!formData.chittyId || !formData.fileHash) {
      toast({
        title: "Missing Information",
        description: "ChittyID and File Hash are required",
        variant: "destructive",
      });
      return;
    }
    generateBeaconMutation.mutate(formData);
  };

  const handleVerify = () => {
    if (!verifyBeaconId) {
      toast({
        title: "Missing Beacon ID",
        description: "Please enter a beacon ID to verify",
        variant: "destructive",
      });
      return;
    }
    verifyBeaconMutation.mutate(verifyBeaconId);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Text copied to clipboard",
    });
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-error" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />;
      default:
        return <Shield className="w-4 h-4 text-primary-blue" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Service Status */}
      <Card className="evidence-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-gradient-primary">ChittyBeacon</span>
              <p className="text-sm text-slate-400 font-normal">Evidence Verification Service</p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {healthStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-slate-400">Status</div>
                <Badge className="status-verified mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  {(healthStatus as any).status}
                </Badge>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400">Version</div>
                <div className="text-lg font-semibold text-primary-blue">{(healthStatus as any).version}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400">Node ID</div>
                <div className="text-lg font-semibold text-white">{(healthStatus as any).nodeId}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-slate-400">Jurisdiction</div>
                <div className="text-lg font-semibold text-accent-emerald">{(healthStatus as any).jurisdiction}</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary-blue border-t-transparent rounded-full"></div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Generate Beacon */}
        <Card className="evidence-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-blue" />
              Generate Beacon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="chittyId">ChittyID</Label>
              <Input
                id="chittyId"
                className="input-professional"
                placeholder="CH-2024-VER-1234-A"
                value={formData.chittyId}
                onChange={(e) => setFormData(prev => ({ ...prev, chittyId: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="evidenceType">Evidence Type</Label>
              <Select
                value={formData.evidenceType}
                onValueChange={(value) => setFormData(prev => ({ ...prev, evidenceType: value }))}
              >
                <SelectTrigger className="input-professional">
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="document">Document</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="certificate">Certificate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="fileHash">File Hash (SHA-256)</Label>
              <Input
                id="fileHash"
                className="input-professional"
                placeholder="Enter cryptographic hash"
                value={formData.fileHash}
                onChange={(e) => setFormData(prev => ({ ...prev, fileHash: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                className="input-professional"
                placeholder="e.g., court_filing, notary, government"
                value={formData.source}
                onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value }))}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateBeaconMutation.isPending}
              className="btn-primary w-full"
            >
              {generateBeaconMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Generating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Generate Beacon
                </div>
              )}
            </Button>

            {generateBeaconMutation.data && (
              <div className="mt-6 p-4 bg-gradient-card border border-border rounded-lg">
                <h4 className="text-lg font-semibold text-success mb-3">Beacon Generated</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Beacon ID:</span>
                    <div className="flex items-center gap-2">
                      <code className="text-primary-blue font-mono text-xs">
                        {generateBeaconMutation.data.beaconId}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(generateBeaconMutation.data.beaconId)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Evidence ID:</span>
                    <code className="text-accent-emerald font-mono text-xs">
                      {generateBeaconMutation.data.evidenceId}
                    </code>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Hash:</span>
                    <code className="text-slate-300 font-mono text-xs truncate max-w-32">
                      {generateBeaconMutation.data.hash}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Verify Beacon */}
        <Card className="evidence-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-accent-emerald" />
              Verify Beacon
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="verifyBeaconId">Beacon ID</Label>
              <Input
                id="verifyBeaconId"
                className="input-professional"
                placeholder="CB-2025-BCN-0001-12345678-ABCD"
                value={verifyBeaconId}
                onChange={(e) => setVerifyBeaconId(e.target.value)}
              />
            </div>

            <Button
              onClick={handleVerify}
              disabled={verifyBeaconMutation.isPending}
              className="btn-primary w-full"
            >
              {verifyBeaconMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Verifying...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4" />
                  Verify Beacon
                </div>
              )}
            </Button>

            {verifyBeaconMutation.data && (
              <div className="mt-6 p-4 bg-gradient-card border border-border rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  {getStatusIcon(verifyBeaconMutation.data.status)}
                  Verification Result
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status:</span>
                    <Badge className={
                      verifyBeaconMutation.data.status === 'verified' 
                        ? 'status-verified' 
                        : 'status-pending'
                    }>
                      {verifyBeaconMutation.data.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Timestamp:</span>
                    <span className="text-slate-300">
                      {new Date(verifyBeaconMutation.data.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Signature:</span>
                    <code className="text-accent-purple font-mono text-xs truncate max-w-24">
                      {verifyBeaconMutation.data.signature}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}