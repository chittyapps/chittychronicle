import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

interface MothershipStatusResponse {
  mothership: string;
  online: boolean;
  message: string;
}

export function MothershipStatus() {
  const { data: status, isLoading } = useQuery<MothershipStatusResponse>({
    queryKey: ['/api/chittyid/mothership/status'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  if (isLoading) {
    return (
      <Card className="mb-6" data-testid="mothership-status-loading">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 animate-spin" />
            <span className="text-sm text-slate-600">Checking mothership status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <Card className="mb-6" data-testid="mothership-status-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <span>ChittyID Mothership Status</span>
          <Badge 
            variant={status.online ? "default" : "destructive"}
            className={status.online ? "bg-blue-600" : "bg-red-600"}
            data-testid={`status-badge-${status.online ? 'online' : 'offline'}`}
          >
            {status.online ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <AlertCircle className="h-3 w-3 mr-1" />
            )}
            {status.online ? 'ONLINE' : 'OFFLINE'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-sm text-slate-600" data-testid="mothership-url">
            Server: <span className="font-mono text-blue-600">{status.mothership}</span>
          </div>
          <div className="text-sm" data-testid="mothership-message">
            {status.message}
          </div>
          {!status.online && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="text-sm text-yellow-800" data-testid="offline-warning">
                <strong>Important:</strong> ChittyID generation requires connection to the central mothership server. 
                Please wait for the server to come online to create new ChittyIDs.
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}