import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, Calendar, Scale, FileText, Clock, AlertTriangle, 
  Search, Bell, Settings, User, Menu, TrendingUp, Activity 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { OnboardingWizard } from "@/components/onboarding-wizard";
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

// Modern Header Component
function ModernHeader() {
  const [location] = useLocation();
  
  const navItems = [
    { href: "/", label: "Cases", active: location === "/" },
    { href: "/dashboard", label: "Dashboard", active: location === "/dashboard" },
    { href: "/timelines", label: "Timelines", active: location === "/timelines" },
    { href: "/ecosystem", label: "Chitty Apps", active: location === "/ecosystem" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center px-6">
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-soft">
            <Clock className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">ChittyChronicle</h1>
            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Lite</Badge>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center space-x-1 ml-8">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button 
                variant={item.active ? "default" : "ghost"} 
                size="sm"
                className={item.active ? "shadow-soft" : ""}
              >
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Search */}
        <div className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search cases..." 
              className="pl-10 bg-gray-50 border-0 focus:bg-white"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="p-2">
            <Bell className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="sm" className="p-2">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" className="flex items-center space-x-2 p-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium">
              CC
            </div>
            <span className="hidden md:block text-sm font-medium">User</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

export default function ModernHome() {
  const { toast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    retry: false,
  });

  // Show onboarding if no cases exist
  const shouldShowOnboarding = !showOnboarding && cases && cases.length === 0 && !showCreateModal;

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
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ModernHeader />
        <main className="container mx-auto px-6 py-8">
          <div className="animate-fade-in space-y-6">
            <div className="h-8 bg-gray-200 rounded-lg w-64 animate-pulse"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6 h-32 bg-gray-100 rounded-lg"></CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ModernHeader />
      
      <main className="container mx-auto px-6 py-8">
        {shouldShowOnboarding ? (
          <OnboardingWizard 
            onComplete={(caseData) => {
              setShowOnboarding(false);
              toast({
                title: "Welcome to ChittyChronicle!",
                description: "Your case has been created successfully.",
              });
            }}
            onSkip={() => setShowOnboarding(false)}
          />
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Upgrade Prompt */}
            <UpgradePrompt context="dashboard" compact={true} />
            
            {/* Header Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Legal Cases</h1>
                  <p className="text-gray-600 mt-1">Manage your legal cases and timelines</p>
                </div>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowOnboarding(true)}
                    className="shadow-soft"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Start Guided Setup
                  </Button>
                  <Button
                    onClick={() => setShowCreateModal(true)}
                    className="shadow-soft"
                    data-testid="create-case-button"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Case
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="shadow-soft border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-blue-50 rounded-xl">
                        <Scale className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Active Cases</p>
                        <p className="text-2xl font-bold">{cases?.length || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-soft border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-green-50 rounded-xl">
                        <TrendingUp className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">This Month</p>
                        <p className="text-2xl font-bold">8</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-soft border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-yellow-50 rounded-xl">
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Deadlines</p>
                        <p className="text-2xl font-bold">3</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-soft border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-purple-50 rounded-xl">
                        <Activity className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Entries</p>
                        <p className="text-2xl font-bold">24</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Cases List */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Recent Cases</h2>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>

              {!cases || cases.length === 0 ? (
                <Card className="shadow-soft border-dashed border-2 border-gray-300">
                  <CardContent className="text-center py-20">
                    <Scale className="w-16 h-16 text-gray-400 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold mb-3">No Cases Yet</h3>
                    <p className="text-gray-600 mb-8">
                      Create your first case to start building timelines and managing evidence
                    </p>
                    <Button
                      onClick={() => setShowOnboarding(true)}
                      size="lg"
                      className="shadow-soft mr-3"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Start Guided Setup
                    </Button>
                    <Button
                      onClick={() => setShowCreateModal(true)}
                      variant="outline"
                      size="lg"
                    >
                      Create Case Manually
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {cases.map((caseItem: Case) => (
                    <Link key={caseItem.id} href={`/timeline/${caseItem.id}`}>
                      <Card className="shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer border-0">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-50 rounded-lg">
                                <Scale className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{caseItem.caseName}</h3>
                                <p className="text-sm text-gray-600">{caseItem.caseNumber}</p>
                              </div>
                            </div>
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              Active
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm text-gray-600">
                            {caseItem.jurisdiction && (
                              <div className="flex items-center">
                                <span className="w-20 font-medium">Court:</span>
                                <span>{caseItem.jurisdiction}</span>
                              </div>
                            )}
                            {caseItem.filingDate && (
                              <div className="flex items-center">
                                <span className="w-20 font-medium">Filed:</span>
                                <span>{new Date(caseItem.filingDate).toLocaleDateString()}</span>
                              </div>
                            )}
                            {caseItem.trialDate && (
                              <div className="flex items-center">
                                <span className="w-20 font-medium">Trial:</span>
                                <span>{new Date(caseItem.trialDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                            <div className="flex items-center space-x-4 text-xs text-gray-500">
                              <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>Updated recently</span>
                              </div>
                              <div className="flex items-center">
                                <FileText className="h-3 w-3 mr-1" />
                                <span>5 entries</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              View Timeline →
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Create Case Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Case</DialogTitle>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createCaseMutation.mutate(data))} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="caseName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Case Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="Smith v. Jones" {...field} />
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
                              <Input placeholder="2024-CV-001" {...field} />
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
                            <Input placeholder="Superior Court of California" {...field} />
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
                              <Input type="date" {...field} />
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
                              <Input type="date" {...field} />
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
                              <Input type="date" {...field} />
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
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createCaseMutation.isPending}
                        className="shadow-soft"
                      >
                        {createCaseMutation.isPending ? "Creating..." : "Create Case"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  );
}