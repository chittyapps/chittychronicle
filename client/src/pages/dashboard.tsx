import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ModernLayout from "@/components/modern-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Download, Upload, AlertCircle, CheckCircle, Clock, FileText, 
  Link, Shield, Activity, TrendingUp, Users, Calendar, 
  AlertTriangle, FileCheck, Send, Package
} from "lucide-react";

interface Contradiction {
  entry1: any;
  entry2: any;
  contradictionType: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  suggestedResolution?: string;
}

interface Deadline {
  entry: any;
  daysUntilDue: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  isOverdue: boolean;
}

export default function Dashboard() {
  const { toast } = useToast();
  const [selectedCases, setSelectedCases] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'universal' | 'chittyledger' | 'chittycases'>('universal');
  const [exportOptions, setExportOptions] = useState({
    includeDocuments: true,
    includeChainProof: true,
    encryptFor: [] as string[],
  });

  // Fetch user's cases
  const { data: cases = [] } = useQuery({
    queryKey: ['/api/cases'],
    queryFn: async () => {
      const response = await fetch('/api/cases', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch cases');
      return response.json();
    },
  });

  // Fetch case summary for selected case
  const selectedCase = selectedCases[0];
  const { data: caseSummary } = useQuery({
    queryKey: ['/api/cases', selectedCase, 'summary'],
    queryFn: async () => {
      const response = await fetch(`/api/cases/${selectedCase}/summary`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch case summary');
      const data = await response.json();
      return data.summary;
    },
    enabled: !!selectedCase,
  });

  // Fetch contradictions
  const { data: contradictions } = useQuery<{ contradictions: Contradiction[] }>({
    queryKey: ['/api/timeline/contradictions', selectedCase],
    queryFn: async () => {
      const response = await fetch(`/api/timeline/contradictions/${selectedCase}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch contradictions');
      return response.json();
    },
    enabled: !!selectedCase,
  });

  // Fetch deadlines
  const { data: deadlines } = useQuery<{ deadlines: Deadline[] }>({
    queryKey: ['/api/timeline/deadlines', selectedCase],
    queryFn: async () => {
      const response = await fetch(`/api/timeline/deadlines/${selectedCase}?days=60`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch deadlines');
      return response.json();
    },
    enabled: !!selectedCase,
  });

  // Universal export mutation
  const exportMutation = useMutation({
    mutationFn: async () => {
      let endpoint = '/api/export/universal';
      if (exportFormat === 'chittyledger') {
        endpoint = '/api/export/chittyledger';
      } else if (exportFormat === 'chittycases') {
        endpoint = '/api/export/chittycases';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          caseIds: selectedCases,
          caseId: selectedCases[0], // For ChittyLedger
          options: exportOptions,
        }),
      });

      if (!response.ok) throw new Error('Export failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Export Successful",
        description: data.message || "Data exported successfully",
      });
      
      // Download the export
      const blob = new Blob([JSON.stringify(data.export, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chitty-export-${Date.now()}.json`;
      a.click();
    },
    onError: (error) => {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // ChittyPM sync mutation
  const syncChittyPM = useMutation({
    mutationFn: async (caseId: string) => {
      const response = await fetch(`/api/chittypm/projects/${caseId}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Sync failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "ChittyPM Sync Complete",
        description: `Project ${data.data.name} synced successfully`,
      });
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'major': return 'text-orange-600 bg-orange-100';
      case 'minor': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get current case details for sidebar
  const currentCaseDetails = cases.find((c: any) => c.id === selectedCase);

  return (
    <div className="flex h-screen bg-gray-50">
      {currentCaseDetails && (
        <Sidebar 
          caseDetails={currentCaseDetails}
          deadlines={deadlines?.deadlines?.map(d => d.entry) || []}
          onCreateEntry={() => {
            toast({
              title: "Create Timeline Entry",
              description: "Navigate to Timeline to create entries",
            });
          }}
        />
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeader currentCase={currentCaseDetails} />
        
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">ChittyChronicle Dashboard</h1>
                <p className="text-gray-600 mt-1">Comprehensive legal timeline management</p>
              </div>
              
              <div className="flex gap-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Universal Data</DialogTitle>
                      <DialogDescription>
                        Import data from other Chitty ecosystem applications
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Upload a Chitty Universal Export file (.json) to import cases, events, and tasks
                        </AlertDescription>
                      </Alert>
                      <input
                        type="file"
                        accept=".json"
                        className="w-full p-2 border rounded"
                        onChange={(e) => {
                          // Handle file import
                          const file = e.target.files?.[0];
                          if (file) {
                            // Process import
                            toast({
                              title: "Import Started",
                              description: "Processing universal import file...",
                            });
                          }
                        }}
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  onClick={() => exportMutation.mutate()}
                  disabled={selectedCases.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {/* Case Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Case Selection</CardTitle>
                <CardDescription>Select cases to view analytics and export data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select value={selectedCase} onValueChange={(value) => setSelectedCases([value])}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a case" />
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.caseName} - {c.caseNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectedCase && syncChittyPM.mutate(selectedCase)}
                      disabled={!selectedCase}
                    >
                      <Link className="w-4 h-4 mr-2" />
                      Sync with ChittyPM
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!selectedCase}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Verify on ChittyChain
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Overview */}
            {caseSummary && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Entries</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{caseSummary.timeline.totalEntries}</div>
                    <p className="text-xs text-gray-500 mt-1">
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      Active timeline items
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Contradictions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {caseSummary.timeline.contradictions}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Need resolution
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Upcoming Deadlines</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {caseSummary.timeline.upcomingDeadlines}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3 inline mr-1" />
                      Next 30 days
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Overdue Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {caseSummary.timeline.overdueItems}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Require immediate attention
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Main Content Tabs */}
            <Tabs defaultValue="contradictions" className="space-y-4">
              <TabsList>
                <TabsTrigger value="contradictions">Contradictions</TabsTrigger>
                <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
                <TabsTrigger value="export">Export Settings</TabsTrigger>
                <TabsTrigger value="parties">Parties</TabsTrigger>
              </TabsList>

              <TabsContent value="contradictions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Detected Contradictions</CardTitle>
                    <CardDescription>
                      AI-detected conflicts that need review and resolution
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {contradictions?.contradictions?.length === 0 ? (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertTitle>No Contradictions</AlertTitle>
                        <AlertDescription>
                          No contradictions detected in the timeline
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <div className="space-y-4">
                        {contradictions?.contradictions?.map((c: Contradiction, idx: number) => (
                          <div key={idx} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <Badge className={getSeverityColor(c.severity)}>
                                {c.severity.toUpperCase()}
                              </Badge>
                              <Badge variant="outline">{c.contradictionType}</Badge>
                            </div>
                            <p className="font-medium mb-2">{c.description}</p>
                            {c.suggestedResolution && (
                              <Alert className="mt-2">
                                <AlertDescription>
                                  <strong>Suggested Resolution:</strong> {c.suggestedResolution}
                                </AlertDescription>
                              </Alert>
                            )}
                            <div className="grid grid-cols-2 gap-4 mt-3">
                              <div className="p-3 bg-gray-50 rounded">
                                <p className="text-sm font-medium">Entry 1</p>
                                <p className="text-sm text-gray-600">{c.entry1.description}</p>
                                <p className="text-xs text-gray-500 mt-1">{c.entry1.date}</p>
                              </div>
                              <div className="p-3 bg-gray-50 rounded">
                                <p className="text-sm font-medium">Entry 2</p>
                                <p className="text-sm text-gray-600">{c.entry2.description}</p>
                                <p className="text-xs text-gray-500 mt-1">{c.entry2.date}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="deadlines" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Deadline Monitor</CardTitle>
                    <CardDescription>
                      Track upcoming and overdue deadlines
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {deadlines?.deadlines?.map((d: Deadline, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge className={getPriorityColor(d.priority)}>
                                {d.priority.toUpperCase()}
                              </Badge>
                              {d.isOverdue && (
                                <Badge variant="destructive">OVERDUE</Badge>
                              )}
                            </div>
                            <p className="font-medium mt-1">{d.entry.description}</p>
                            <p className="text-sm text-gray-600">
                              {d.isOverdue 
                                ? `Overdue by ${Math.abs(d.daysUntilDue)} days`
                                : `Due in ${d.daysUntilDue} days`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">{d.entry.date}</p>
                            <p className="text-xs text-gray-500">{d.entry.entryType}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="export" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Export Configuration</CardTitle>
                    <CardDescription>
                      Configure universal export settings for Chitty ecosystem integration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Export Format</label>
                      <Select value={exportFormat} onValueChange={(v: any) => setExportFormat(v)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="universal">
                            <div className="flex items-center">
                              <Package className="w-4 h-4 mr-2" />
                              Chitty Universal Format
                            </div>
                          </SelectItem>
                          <SelectItem value="chittyledger">
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 mr-2" />
                              ChittyLedger (Financial)
                            </div>
                          </SelectItem>
                          <SelectItem value="chittycases">
                            <div className="flex items-center">
                              <FileCheck className="w-4 h-4 mr-2" />
                              ChittyCases (Legal)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Export Options</label>
                      <div className="space-y-2">
                        <label className="flex items-center space-x-2">
                          <Checkbox 
                            checked={exportOptions.includeDocuments}
                            onCheckedChange={(checked) => 
                              setExportOptions(prev => ({ ...prev, includeDocuments: !!checked }))
                            }
                          />
                          <span className="text-sm">Include document references</span>
                        </label>
                        <label className="flex items-center space-x-2">
                          <Checkbox 
                            checked={exportOptions.includeChainProof}
                            onCheckedChange={(checked) => 
                              setExportOptions(prev => ({ ...prev, includeChainProof: !!checked }))
                            }
                          />
                          <span className="text-sm">Include ChittyChain verification proof</span>
                        </label>
                      </div>
                    </div>

                    <Alert>
                      <Shield className="h-4 w-4" />
                      <AlertDescription>
                        Exports are cryptographically signed with your ChittyID for verification
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="parties" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Case Parties</CardTitle>
                    <CardDescription>
                      Manage parties involved in the case
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {caseSummary?.parties && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-2">Plaintiffs</h3>
                          <div className="space-y-2">
                            {caseSummary.parties.plaintiffs.map((p: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>
                                  <p className="font-medium">{p.name}</p>
                                  {p.attorneyName && (
                                    <p className="text-sm text-gray-600">Rep: {p.attorneyName}</p>
                                  )}
                                </div>
                                <Badge variant="outline">Plaintiff</Badge>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h3 className="font-medium mb-2">Defendants</h3>
                          <div className="space-y-2">
                            {caseSummary.parties.defendants.map((p: any, idx: number) => (
                              <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>
                                  <p className="font-medium">{p.name}</p>
                                  {p.attorneyName && (
                                    <p className="text-sm text-gray-600">Rep: {p.attorneyName}</p>
                                  )}
                                </div>
                                <Badge variant="outline">Defendant</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}