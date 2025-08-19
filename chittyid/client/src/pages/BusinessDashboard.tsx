import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Building, 
  Plus, 
  Users, 
  TrendingUp, 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  BarChart3,
  DollarSign,
  Eye,
  Settings,
  Download,
  Search,
  Filter,
  Calendar
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Business {
  id: string;
  name: string;
  domain?: string;
  industry?: string;
  trustThreshold: number;
  isActive: boolean;
  apiKey?: string;
  createdAt: string;
  updatedAt: string;
}

interface VerificationRequest {
  id: string;
  businessId: string;
  chittyId?: string;
  requestType: string;
  status: string;
  trustScoreAtRequest?: number;
  responseData?: any;
  createdAt: string;
  updatedAt: string;
}

const industryOptions = [
  'Real Estate',
  'Banking & Finance', 
  'Healthcare',
  'Technology',
  'Retail & E-commerce',
  'Hospitality',
  'Transportation',
  'Education',
  'Government',
  'Other'
];

const trustThresholdOptions = [
  { value: 0, label: 'No Minimum (0)', description: 'Accept all verified ChittyIDs' },
  { value: 200, label: 'Basic (200)', description: 'Email and phone verified' },
  { value: 500, label: 'Enhanced (500)', description: 'Government ID verified' },
  { value: 750, label: 'Premium (750)', description: 'Full verification suite' },
  { value: 900, label: 'Elite (900)', description: 'Maximum trust level' }
];

export default function BusinessDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedBusiness, setSelectedBusiness] = useState<string | null>(null);
  const [showAddBusinessDialog, setShowAddBusinessDialog] = useState(false);
  const [businessForm, setBusinessForm] = useState({
    name: '',
    domain: '',
    industry: '',
    trustThreshold: 200
  });

  // Get businesses
  const { data: businesses = [], isLoading: businessesLoading } = useQuery({
    queryKey: ['/api/businesses'],
  });

  // Get verification requests for selected business
  const { data: verificationRequests = [] } = useQuery({
    queryKey: ['/api/verification-requests', selectedBusiness],
    enabled: !!selectedBusiness,
  });

  const createBusinessMutation = useMutation({
    mutationFn: async (data: typeof businessForm) => {
      const response = await apiRequest('POST', '/api/businesses', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/businesses'] });
      setShowAddBusinessDialog(false);
      setBusinessForm({ name: '', domain: '', industry: '', trustThreshold: 200 });
      toast({
        title: "Business Added",
        description: "Your business has been successfully added to the ChittyID network!",
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
        description: "Failed to add business. Please try again.",
        variant: "destructive",
      });
    },
  });

  const testVerificationMutation = useMutation({
    mutationFn: async (data: { chittyIdCode: string; requestType: string; apiKey: string }) => {
      const response = await apiRequest('POST', '/api/verify', data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Verification Test Complete",
        description: data.approved 
          ? `ChittyID verified successfully! Trust Score: ${data.trustScore}`
          : `Verification failed: ${data.message}`,
        variant: data.approved ? "default" : "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Test Failed",
        description: "Failed to test verification. Please check your API key and try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || businessesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" data-testid="loading-business">
        <div className="text-center">
          <Building className="h-8 w-8 text-blue-600 animate-pulse mx-auto mb-4" />
          <div className="text-slate-600">Loading business dashboard...</div>
        </div>
      </div>
    );
  }

  // Mock stats for demonstration
  const stats = {
    totalVerifications: 1247,
    successRate: 98.7,
    avgResponseTime: '0.3s',
    costSavings: '$12,340'
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Building className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold text-slate-900" data-testid="text-business-logo">ChittyID Business</span>
            </div>
            <div className="flex items-center space-x-6">
              <nav className="flex items-center space-x-4">
                <a href="/" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Overview</a>
                <a href="/verification" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Verification</a>
                <span className="text-sm text-blue-600 font-medium">Business</span>
              </nav>
              <span className="text-sm text-slate-600" data-testid="text-business-welcome">
                Welcome, {user?.firstName || user?.email}
              </span>
              <Button 
                onClick={() => window.location.href = '/api/logout'}
                variant="outline"
                size="sm"
                data-testid="button-logout"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card data-testid="card-total-verifications">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.totalVerifications.toLocaleString()}</div>
                  <div className="text-sm text-slate-600">Total Verifications</div>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-success-rate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.successRate}%</div>
                  <div className="text-sm text-slate-600">Success Rate</div>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-response-time">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.avgResponseTime}</div>
                  <div className="text-sm text-slate-600">Avg Response Time</div>
                </div>
                <Clock className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-cost-savings">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats.costSavings}</div>
                  <div className="text-sm text-slate-600">Cost Savings</div>
                </div>
                <DollarSign className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Management */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* My Businesses */}
            <Card data-testid="card-my-businesses">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>My Businesses</CardTitle>
                  <Dialog open={showAddBusinessDialog} onOpenChange={setShowAddBusinessDialog}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="button-add-business">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Business
                      </Button>
                    </DialogTrigger>
                    <DialogContent data-testid="dialog-add-business">
                      <DialogHeader>
                        <DialogTitle>Add New Business</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="business-name">Business Name</Label>
                          <Input
                            id="business-name"
                            placeholder="Acme Corporation"
                            value={businessForm.name}
                            onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                            data-testid="input-business-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="business-domain">Domain (Optional)</Label>
                          <Input
                            id="business-domain"
                            placeholder="acme.com"
                            value={businessForm.domain}
                            onChange={(e) => setBusinessForm({ ...businessForm, domain: e.target.value })}
                            data-testid="input-business-domain"
                          />
                        </div>
                        <div>
                          <Label htmlFor="business-industry">Industry</Label>
                          <Select value={businessForm.industry} onValueChange={(value) => setBusinessForm({ ...businessForm, industry: value })}>
                            <SelectTrigger data-testid="select-business-industry">
                              <SelectValue placeholder="Select industry" />
                            </SelectTrigger>
                            <SelectContent>
                              {industryOptions.map(industry => (
                                <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="trust-threshold">Trust Threshold</Label>
                          <Select value={businessForm.trustThreshold.toString()} onValueChange={(value) => setBusinessForm({ ...businessForm, trustThreshold: parseInt(value) })}>
                            <SelectTrigger data-testid="select-trust-threshold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {trustThresholdOptions.map(option => (
                                <SelectItem key={option.value} value={option.value.toString()}>
                                  <div>
                                    <div className="font-medium">{option.label}</div>
                                    <div className="text-xs text-slate-500">{option.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowAddBusinessDialog(false)}
                            data-testid="button-cancel-business"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => createBusinessMutation.mutate(businessForm)}
                            disabled={createBusinessMutation.isPending || !businessForm.name}
                            data-testid="button-submit-business"
                          >
                            {createBusinessMutation.isPending ? 'Adding...' : 'Add Business'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {businesses.length > 0 ? (
                  <div className="space-y-4">
                    {businesses.map((business: Business, index: number) => (
                      <div
                        key={business.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedBusiness === business.id
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setSelectedBusiness(business.id)}
                        data-testid={`business-item-${index}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-slate-900">{business.name}</div>
                            <div className="text-sm text-slate-600">
                              {business.industry} • Trust threshold: {business.trustThreshold}
                            </div>
                            {business.domain && (
                              <div className="text-xs text-slate-500 mt-1">{business.domain}</div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={business.isActive ? 'default' : 'secondary'}>
                              {business.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button variant="ghost" size="sm" data-testid={`button-view-business-${index}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500" data-testid="no-businesses-message">
                    <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <div className="font-medium mb-2">No businesses yet</div>
                    <div className="text-sm">Add your first business to start verifying customers with ChittyID</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Verification Requests */}
            {selectedBusiness && (
              <Card data-testid="card-verification-requests">
                <CardHeader>
                  <CardTitle>Recent Verification Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Input placeholder="Search requests..." className="max-w-sm" data-testid="input-search-requests" />
                      </div>
                      <Button variant="outline" size="sm" data-testid="button-filter-requests">
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                      </Button>
                      <Button variant="outline" size="sm" data-testid="button-export-requests">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ChittyID</TableHead>
                          <TableHead>Request Type</TableHead>
                          <TableHead>Trust Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Placeholder data since we don't have real requests */}
                        <TableRow data-testid="verification-request-0">
                          <TableCell className="font-mono">CH-2024-VER-1234-A</TableCell>
                          <TableCell>instant_verify</TableCell>
                          <TableCell>847</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          </TableCell>
                          <TableCell>2 hours ago</TableCell>
                        </TableRow>
                        <TableRow data-testid="verification-request-1">
                          <TableCell className="font-mono">CH-2024-VER-5678-B</TableCell>
                          <TableCell>background_check</TableCell>
                          <TableCell>623</TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          </TableCell>
                          <TableCell>4 hours ago</TableCell>
                        </TableRow>
                        <TableRow data-testid="verification-request-2">
                          <TableCell className="font-mono">CH-2024-VER-9012-C</TableCell>
                          <TableCell>instant_verify</TableCell>
                          <TableCell>156</TableCell>
                          <TableCell>
                            <Badge className="bg-red-100 text-red-600">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Rejected
                            </Badge>
                          </TableCell>
                          <TableCell>6 hours ago</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>

                    {verificationRequests.length === 0 && (
                      <div className="text-center py-8 text-slate-500" data-testid="no-requests-message">
                        <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                        <div>No verification requests yet</div>
                        <div className="text-sm">Requests will appear here once customers start using your ChittyID integration</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card data-testid="card-quick-actions">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" data-testid="button-view-api-docs">
                  <Settings className="h-4 w-4 mr-2" />
                  View API Documentation
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-test-integration">
                  <Search className="h-4 w-4 mr-2" />
                  Test Integration
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-generate-api-key">
                  <Shield className="h-4 w-4 mr-2" />
                  Generate API Key
                </Button>
                <Button variant="outline" className="w-full justify-start" data-testid="button-view-analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Analytics
                </Button>
              </CardContent>
            </Card>

            {/* Integration Guide */}
            <Card data-testid="card-integration-guide">
              <CardHeader>
                <CardTitle>Integration Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-slate-600">
                  <h4 className="font-medium text-slate-900 mb-2">Getting Started</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Add your business details</li>
                    <li>Generate an API key</li>
                    <li>Integrate ChittyID verification</li>
                    <li>Test your integration</li>
                    <li>Go live!</li>
                  </ol>
                </div>
                <Button size="sm" className="w-full" data-testid="button-view-full-guide">
                  View Full Guide
                </Button>
              </CardContent>
            </Card>

            {/* Support */}
            <Card data-testid="card-support">
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-slate-600">
                  Our team is here to help you integrate ChittyID successfully.
                </div>
                <Button variant="outline" size="sm" className="w-full" data-testid="button-contact-support">
                  Contact Support
                </Button>
                <Button variant="outline" size="sm" className="w-full" data-testid="button-schedule-demo">
                  Schedule Demo
                </Button>
              </CardContent>
            </Card>

            {/* Trust Threshold Guide */}
            <Card data-testid="card-trust-guide">
              <CardHeader>
                <CardTitle>Trust Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  {trustThresholdOptions.map((option, index) => (
                    <div key={option.value} className="flex items-start space-x-2" data-testid={`trust-level-${index}`}>
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <div>
                        <div className="font-medium text-slate-900">{option.label}</div>
                        <div className="text-slate-600">{option.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
