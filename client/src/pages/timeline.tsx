import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { 
  Clock, Plus, Upload, FileText, Calendar, MapPin, User, 
  AlertTriangle, CheckCircle, ExternalLink, ArrowRight, 
  Database, Shield, Brain, Link, ChevronLeft
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link as RouterLink } from "wouter";
import { ContradictionAnalyzer } from "@/components/contradiction-analyzer";

const createEntrySchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  location: z.string().optional(),
  participants: z.string().optional(),
  evidenceType: z.enum(["document", "witness", "physical", "digital", "communication"]),
  significance: z.enum(["high", "medium", "low"]),
  source: z.string().optional(),
});

type CreateEntryData = z.infer<typeof createEntrySchema>;

export default function Timeline() {
  const { caseId } = useParams();
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any>(null);

  const { data: caseDetails } = useQuery({
    queryKey: ["/api/cases", caseId],
    retry: false,
    enabled: !!caseId,
  });

  const { data: timelineEntries = [] } = useQuery({
    queryKey: ["/api/timeline", caseId],
    retry: false,
    enabled: !!caseId,
  });

  const form = useForm<CreateEntryData>({
    resolver: zodResolver(createEntrySchema),
    defaultValues: {
      date: "",
      time: "",
      title: "",
      description: "",
      location: "",
      participants: "",
      evidenceType: "document",
      significance: "medium",
      source: "",
    },
  });

  const createEntryMutation = useMutation({
    mutationFn: async (data: CreateEntryData) => {
      await apiRequest("POST", `/api/timeline/${caseId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/timeline", caseId] });
      setShowCreateModal(false);
      form.reset();
      toast({
        title: "Timeline Entry Created",
        description: "Entry added and queued for ecosystem ingestion",
      });
    },
  });

  const sendToEcosystemMutation = useMutation({
    mutationFn: async (entryId: string) => {
      // Send to ChittyLedger for evidence registration
      await apiRequest("POST", `/api/ecosystem/ingest`, {
        entryId,
        caseId,
        targets: ["chittyledger", "chittyverify", "chittytrust"]
      });
    },
    onSuccess: () => {
      toast({
        title: "Evidence Ingested",
        description: "Entry sent to ChittyLedger, ChittyVerify, and ChittyTrust for processing",
      });
    },
  });

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case "high": return "bg-red-100 text-red-700 border-red-200";
      case "medium": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "low": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getEvidenceTypeIcon = (type: string) => {
    switch (type) {
      case "document": return FileText;
      case "witness": return User;
      case "physical": return MapPin;
      case "digital": return Database;
      case "communication": return Link;
      default: return FileText;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center px-6">
          <div className="flex items-center space-x-4">
            <RouterLink href="/">
              <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Cases
              </Button>
            </RouterLink>
            
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-soft">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">{caseDetails?.caseName || "Case Timeline"}</h1>
                <p className="text-xs text-gray-600">{caseDetails?.caseNumber}</p>
              </div>
            </div>
          </div>

          <div className="ml-auto flex items-center space-x-3">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="shadow-soft"
              data-testid="create-entry-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Entry
            </Button>
            
            <RouterLink href="/ecosystem">
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-1" />
                Ecosystem
              </Button>
            </RouterLink>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Ecosystem Integration Status */}
          <Card className="shadow-soft border-0 bg-gradient-to-r from-blue-50 to-purple-50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span>Chitty Ecosystem Integration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <Database className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">ChittyLedger</p>
                    <p className="text-xs text-gray-600">Evidence storage</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Shield className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">ChittyVerify</p>
                    <p className="text-xs text-gray-600">Verification layer</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Brain className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">ChittyTrust</p>
                    <p className="text-xs text-gray-600">Trust scoring</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Contradiction Analysis */}
          <ContradictionAnalyzer caseId={caseId!} />

          {/* Timeline Entries */}
          {timelineEntries.length === 0 ? (
            <Card className="shadow-soft border-dashed border-2 border-gray-300">
              <CardContent className="text-center py-20">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold mb-3">No Timeline Entries</h3>
                <p className="text-gray-600 mb-8">
                  Start building your case timeline by adding the first entry
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  size="lg"
                  className="shadow-soft"
                  data-testid="create-first-entry-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Entry
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {timelineEntries.map((entry: any, index: number) => {
                const EvidenceIcon = getEvidenceTypeIcon(entry.evidenceType);
                
                return (
                  <Card 
                    key={entry.id} 
                    className="shadow-soft hover:shadow-elevated transition-all duration-200 border-0"
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        {/* Timeline marker */}
                        <div className="flex flex-col items-center">
                          <div className={`p-3 rounded-xl ${entry.significance === 'high' ? 'bg-red-100' : entry.significance === 'medium' ? 'bg-yellow-100' : 'bg-green-100'}`}>
                            <EvidenceIcon className={`h-5 w-5 ${entry.significance === 'high' ? 'text-red-600' : entry.significance === 'medium' ? 'text-yellow-600' : 'text-green-600'}`} />
                          </div>
                          {index < timelineEntries.length - 1 && (
                            <div className="w-px h-16 bg-gray-200 mt-4"></div>
                          )}
                        </div>

                        {/* Entry content */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{entry.title}</h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                                <div className="flex items-center">
                                  <Calendar className="h-4 w-4 mr-1" />
                                  {entry.date} {entry.time && `at ${entry.time}`}
                                </div>
                                {entry.location && (
                                  <div className="flex items-center">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {entry.location}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Badge className={getSignificanceColor(entry.significance)} variant="outline">
                                {entry.significance}
                              </Badge>
                              <Badge variant="secondary">
                                {entry.evidenceType}
                              </Badge>
                            </div>
                          </div>

                          <p className="text-gray-700 mb-4">{entry.description}</p>

                          {entry.participants && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-800">Participants:</p>
                              <p className="text-sm text-gray-600">{entry.participants}</p>
                            </div>
                          )}

                          {entry.source && (
                            <div className="mb-4">
                              <p className="text-sm font-medium text-gray-800">Source:</p>
                              <p className="text-sm text-gray-600">{entry.source}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <span>Created {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : 'recently'}</span>
                              {entry.ecosystemStatus && (
                                <div className="flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                  Ingested to ecosystem
                                </div>
                              )}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendToEcosystemMutation.mutate(entry.id)}
                              disabled={sendToEcosystemMutation.isPending || entry.ecosystemStatus === 'ingested'}
                            >
                              {entry.ecosystemStatus === 'ingested' ? (
                                <>
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Ingested
                                </>
                              ) : (
                                <>
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  Send to Ecosystem
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Create Entry Modal */}
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Timeline Entry</DialogTitle>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createEntryMutation.mutate(data))} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="Deposition of witness John Smith" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Detailed description of the event, evidence, or activity..."
                            className="min-h-20"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="evidenceType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Evidence Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select evidence type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="document">Document</SelectItem>
                              <SelectItem value="witness">Witness Testimony</SelectItem>
                              <SelectItem value="physical">Physical Evidence</SelectItem>
                              <SelectItem value="digital">Digital Evidence</SelectItem>
                              <SelectItem value="communication">Communication</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="significance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Significance</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select significance" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="Conference room, courthouse, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="source"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Source</FormLabel>
                          <FormControl>
                            <Input placeholder="Document source, witness name, etc." {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="participants"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Participants</FormLabel>
                        <FormControl>
                          <Input placeholder="Names of people involved" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-3 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={createEntryMutation.isPending}
                      className="shadow-soft"
                    >
                      {createEntryMutation.isPending ? "Creating..." : "Add Entry"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}