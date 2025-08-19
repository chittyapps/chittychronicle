import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Upload, Bot, Zap, FileText, Settings, ExternalLink } from "lucide-react";
import { useParams } from "wouter";

interface IngestionJob {
  id: string;
  source: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  documentsFound: string;
  documentsProcessed: string;
  entriesCreated: string;
  errorLog?: string;
  createdAt: string;
}

interface McpIntegration {
  id: string;
  integrationName: string;
  platform: string;
  isActive: string;
  lastSyncDate?: string;
  syncStatus: string;
  createdAt: string;
}

export default function Automation() {
  const { caseId } = useParams();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentText, setDocumentText] = useState("");
  const [mcpForm, setMcpForm] = useState({
    integrationName: "",
    platform: "claude",
    apiEndpoint: "",
    authToken: ""
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch ingestion jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['/api/ingestion/jobs', caseId],
    enabled: !!caseId,
  });

  // Fetch MCP integrations
  const { data: integrations = [], isLoading: integrationsLoading } = useQuery({
    queryKey: ['/api/mcp/integrations'],
  });

  // Document ingestion mutation
  const ingestDocuments = useMutation({
    mutationFn: async (documents: Array<{fileName: string, content: string}>) => {
      return await apiRequest('/api/ingestion/process', {
        method: 'POST',
        body: { caseId, documents }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Documents Processed",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ingestion/jobs', caseId] });
      queryClient.invalidateQueries({ queryKey: ['/api/timeline/entries'] });
      setSelectedFiles([]);
      setDocumentText("");
    },
    onError: (error) => {
      toast({
        title: "Processing Failed",
        description: `Failed to process documents: ${error}`,
        variant: "destructive",
      });
    }
  });

  // MCP integration mutation
  const createIntegration = useMutation({
    mutationFn: async (integrationData: any) => {
      return await apiRequest('/api/mcp/integrations', {
        method: 'POST',
        body: integrationData
      });
    },
    onSuccess: () => {
      toast({
        title: "Integration Created",
        description: "MCP integration has been set up successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/integrations'] });
      setMcpForm({
        integrationName: "",
        platform: "claude",
        apiEndpoint: "",
        authToken: ""
      });
    },
    onError: (error) => {
      toast({
        title: "Integration Failed",
        description: `Failed to create integration: ${error}`,
        variant: "destructive",
      });
    }
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const processDocuments = async () => {
    if (!caseId) {
      toast({
        title: "No Case Selected",
        description: "Please select a case first",
        variant: "destructive",
      });
      return;
    }

    const documents: Array<{fileName: string, content: string}> = [];

    // Process uploaded files
    for (const file of selectedFiles) {
      const content = await file.text();
      documents.push({
        fileName: file.name,
        content
      });
    }

    // Process manual text input
    if (documentText.trim()) {
      documents.push({
        fileName: "manual_input.txt",
        content: documentText
      });
    }

    if (documents.length === 0) {
      toast({
        title: "No Documents",
        description: "Please upload files or enter text to process",
        variant: "destructive",
      });
      return;
    }

    ingestDocuments.mutate(documents);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'completed': return 100;
      case 'processing': return 60;
      case 'failed': return 0;
      default: return 20;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8" data-testid="automation-page">
      <div className="flex items-center space-x-2">
        <Bot className="h-8 w-8 text-blue-600" />
        <h1 className="text-3xl font-bold">ChittyChronicle Automation</h1>
      </div>

      <Tabs defaultValue="ingestion" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ingestion" data-testid="tab-ingestion">
            <FileText className="w-4 h-4 mr-2" />
            Document Ingestion
          </TabsTrigger>
          <TabsTrigger value="mcp" data-testid="tab-mcp">
            <Zap className="w-4 h-4 mr-2" />
            MCP Integration
          </TabsTrigger>
          <TabsTrigger value="jobs" data-testid="tab-jobs">
            <Settings className="w-4 h-4 mr-2" />
            Processing Jobs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingestion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Automated Document Processing</span>
              </CardTitle>
              <CardDescription>
                Upload legal documents to automatically extract timeline entries, dates, and evidence
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  ChittyChronicle uses AI to analyze documents and automatically create timeline entries. 
                  Review all generated entries for accuracy before relying on them for legal work.
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="file-upload">Upload Documents</Label>
                <Input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".txt,.pdf,.doc,.docx,.eml"
                  onChange={handleFileUpload}
                  className="mt-1"
                  data-testid="input-file-upload"
                />
                {selectedFiles.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {selectedFiles.map((file, index) => (
                      <Badge key={index} variant="secondary" className="mr-2">
                        {file.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="document-text">Or Enter Document Text</Label>
                <Textarea
                  id="document-text"
                  placeholder="Paste document content here for analysis..."
                  value={documentText}
                  onChange={(e) => setDocumentText(e.target.value)}
                  className="mt-1 min-h-[200px]"
                  data-testid="textarea-document-text"
                />
              </div>

              <Button
                onClick={processDocuments}
                disabled={ingestDocuments.isPending || (!selectedFiles.length && !documentText.trim())}
                className="w-full"
                data-testid="button-process-documents"
              >
                {ingestDocuments.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Processing Documents...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Process Documents
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mcp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ExternalLink className="h-5 w-5" />
                <span>MCP Integration Setup</span>
              </CardTitle>
              <CardDescription>
                Connect ChittyChronicle to Claude, ChatGPT, and other AI platforms
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="integration-name">Integration Name</Label>
                  <Input
                    id="integration-name"
                    placeholder="My AI Assistant"
                    value={mcpForm.integrationName}
                    onChange={(e) => setMcpForm(prev => ({...prev, integrationName: e.target.value}))}
                    data-testid="input-integration-name"
                  />
                </div>
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <Select
                    value={mcpForm.platform}
                    onValueChange={(value) => setMcpForm(prev => ({...prev, platform: value}))}
                  >
                    <SelectTrigger data-testid="select-platform">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude">Claude (Anthropic)</SelectItem>
                      <SelectItem value="chatgpt">ChatGPT (OpenAI)</SelectItem>
                      <SelectItem value="custom">Custom Platform</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="api-endpoint">API Endpoint (Optional)</Label>
                <Input
                  id="api-endpoint"
                  placeholder="https://api.platform.com/v1"
                  value={mcpForm.apiEndpoint}
                  onChange={(e) => setMcpForm(prev => ({...prev, apiEndpoint: e.target.value}))}
                  data-testid="input-api-endpoint"
                />
              </div>

              <div>
                <Label htmlFor="auth-token">Authentication Token (Optional)</Label>
                <Input
                  id="auth-token"
                  type="password"
                  placeholder="API token or key"
                  value={mcpForm.authToken}
                  onChange={(e) => setMcpForm(prev => ({...prev, authToken: e.target.value}))}
                  data-testid="input-auth-token"
                />
              </div>

              <Button
                onClick={() => createIntegration.mutate(mcpForm)}
                disabled={createIntegration.isPending || !mcpForm.integrationName}
                className="w-full"
                data-testid="button-create-integration"
              >
                {createIntegration.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating Integration...
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Create Integration
                  </>
                )}
              </Button>

              {integrations.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Active Integrations</h3>
                  {integrations.map((integration: McpIntegration) => (
                    <Card key={integration.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium" data-testid={`integration-name-${integration.id}`}>
                            {integration.integrationName}
                          </h4>
                          <p className="text-sm text-gray-600 capitalize">
                            {integration.platform} • {integration.syncStatus}
                          </p>
                        </div>
                        <Badge
                          variant={integration.isActive === 'true' ? 'default' : 'secondary'}
                          data-testid={`integration-status-${integration.id}`}
                        >
                          {integration.isActive === 'true' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Processing Jobs</CardTitle>
              <CardDescription>
                Monitor document ingestion and processing status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : jobs.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No processing jobs found</p>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job: IngestionJob) => (
                    <Card key={job.id} className="p-4" data-testid={`job-card-${job.id}`}>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            {job.source.replace('_', ' ').toUpperCase()} Processing
                          </h4>
                          <Badge
                            className={getStatusColor(job.status)}
                            data-testid={`job-status-${job.id}`}
                          >
                            {job.status.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <Progress
                          value={getStatusProgress(job.status)}
                          className="w-full"
                          data-testid={`job-progress-${job.id}`}
                        />
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Documents:</span>
                            <span className="ml-2 font-medium">{job.documentsProcessed}/{job.documentsFound}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Entries Created:</span>
                            <span className="ml-2 font-medium">{job.entriesCreated}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Created:</span>
                            <span className="ml-2 font-medium">
                              {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        
                        {job.errorLog && (
                          <Alert variant="destructive">
                            <AlertDescription>{job.errorLog}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}