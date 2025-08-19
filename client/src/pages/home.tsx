import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import ModernLayout from "@/components/modern-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Calendar, Scale, FileText, Clock, AlertTriangle, TrendingUp, Activity, Bot } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import type { Case } from "@shared/schema";

const createCaseSchema = z.object({
  caseName: z.string().min(1, "Case name is required"),
  caseNumber: z.string().min(1, "Case number is required"),
  jurisdiction: z.string().optional(),
  filingDate: z.string().optional(),
  trialDate: z.string().optional(),
  discoveryDeadline: z.string().optional(),
});

type CreateCaseData = z.infer<typeof createCaseSchema>;

export default function Home() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Authentication is disabled for development - skip auth checks

  const { data: cases, isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    retry: false,
    throwOnError: false,
  });

  const form = useForm<CreateCaseData>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: {
      caseName: "",
      caseNumber: "",
      jurisdiction: "",
      filingDate: "",
      trialDate: "",
      discoveryDeadline: "",
    },
  });

  const createCaseMutation = useMutation({
    mutationFn: async (data: CreateCaseData) => {
      await apiRequest("POST", "/api/cases", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setShowCreateModal(false);
      form.reset();
      toast({
        title: "Success",
        description: "Case created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create case",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateCaseData) => {
    createCaseMutation.mutate(data);
  };

  if (isLoading || casesLoading) {
    return (
      <ModernLayout>
        <div className="animate-fade-in space-y-6">
          <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-24 bg-gray-100 rounded-lg"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ModernLayout>
    );
  }

  return (
    <ModernLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header with Stats */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">
                Legal Cases
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your legal cases and timeline entries
              </p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="shadow-soft"
              data-testid="create-case-button"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Scale className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Cases</p>
                    <p className="text-2xl font-bold">{cases?.length || 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-50 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">This Month</p>
                    <p className="text-2xl font-bold">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-yellow-50 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold">3</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-soft">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Urgent</p>
                    <p className="text-2xl font-bold">1</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cases Grid */}
        {!cases || cases.length === 0 ? (
          <Card className="shadow-soft border-dashed border-2 border-gray-200">
            <CardContent className="text-center py-16">
              <div className="max-w-sm mx-auto">
                <Scale className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                <h3 className="text-xl font-semibold mb-2">
                  No Cases Yet
                </h3>
                <p className="text-gray-600 mb-8">
                  Create your first case to start managing legal timelines and evidence tracking
                </p>
                <Button
                  onClick={() => setShowCreateModal(true)}
                  size="lg"
                  className="shadow-soft"
                  data-testid="create-first-case-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Case
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cases.map((caseItem) => (
              <div key={caseItem.id} onClick={() => window.location.href = `/timeline/${caseItem.id}`}>
                <Card className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border border-gray-200">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
                          {caseItem.caseName}
                        </CardTitle>
                        <p className="text-sm text-muted">{caseItem.caseNumber}</p>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        Active
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {caseItem.jurisdiction && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Scale className="w-4 h-4 mr-2" />
                          {caseItem.jurisdiction}
                        </div>
                      )}
                      
                      {caseItem.filingDate && (
                        <div className="flex items-center text-sm text-gray-600">
                          <FileText className="w-4 h-4 mr-2" />
                          Filed: {new Date(caseItem.filingDate).toLocaleDateString()}
                        </div>
                      )}
                      
                      {caseItem.trialDate && (
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          Trial: {new Date(caseItem.trialDate).toLocaleDateString()}
                        </div>
                      )}
                      
                      {caseItem.discoveryDeadline && (
                        <div className="flex items-center text-sm">
                          <Clock className="w-4 h-4 mr-2" />
                          <span className={
                            new Date(caseItem.discoveryDeadline) < new Date() 
                              ? "text-red-600" 
                              : "text-gray-600"
                          }>
                            Discovery: {new Date(caseItem.discoveryDeadline).toLocaleDateString()}
                          </span>
                          {new Date(caseItem.discoveryDeadline) < new Date() && (
                            <AlertTriangle className="w-4 h-4 ml-1 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.location.href = `/timeline/${caseItem.id}`}
                        data-testid={`view-timeline-${caseItem.id}`}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Timeline
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full"
                        onClick={() => window.location.href = `/automation/${caseItem.id}`}
                        data-testid={`automation-${caseItem.id}`}
                      >
                        <Bot className="w-4 h-4 mr-2" />
                        AI Automation
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {/* Create Case Modal */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Case</DialogTitle>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="caseName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Name *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Johnson v. Smith Corp" 
                            data-testid="case-name-input"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="caseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Case Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="2024-CV-001234" 
                            data-testid="case-number-input"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="jurisdiction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jurisdiction</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Superior Court of California" 
                          data-testid="jurisdiction-input"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="filingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Filing Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            data-testid="filing-date-input"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="trialDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Trial Date</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            data-testid="trial-date-input"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="discoveryDeadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discovery Deadline</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            data-testid="discovery-deadline-input"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    data-testid="cancel-create-case"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCaseMutation.isPending}
                    className="bg-primary hover:bg-primary-dark text-white"
                    data-testid="submit-create-case"
                  >
                    {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </ModernLayout>
  );
}
