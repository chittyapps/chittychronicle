import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { TrustScoreCard } from "@/components/TrustScoreCard";
import { MothershipStatus } from "@/components/MothershipStatus";
import { VerificationSteps } from "@/components/VerificationSteps";
import { BusinessStats } from "@/components/BusinessStats";
import UniversalEntityCreator from "@/components/UniversalEntityCreator";
import UniversalQuickStart from "@/components/UniversalQuickStart";
import ChittyIdDisplay from "@/components/ChittyIdDisplay";
import { Shield, Plus, CheckCircle, Clock, AlertCircle, QrCode, Share2, LogOut, Star, Lock, CreditCard, Users, MapPin, Package, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'verification' | 'business' | 'universal'>('overview');

  // Get user stats and ChittyID
  const { data: stats } = useQuery({
    queryKey: ['/api/stats'],
    enabled: !!user,
  });

  const { data: verifications } = useQuery({
    queryKey: ['/api/verifications'],
    enabled: !!user,
  });

  const createChittyIdMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/chittyid/create');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      toast({
        title: "ChittyID Created",
        description: "Your ChittyID has been successfully created!",
      });
    },
    onError: (error: any) => {
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
      
      // Handle mothership connection errors
      if (error.message?.includes('mothership') || error.message?.includes('central server')) {
        toast({
          title: "ChittyID Mothership Offline",
          description: "ChittyID generation requires connection to the central server at id.chitty.cc. Please wait for the server to come online.",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to create ChittyID. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addVerificationMutation = useMutation({
    mutationFn: async (data: { verificationType: string; metadata?: any }) => {
      const response = await apiRequest('POST', '/api/verifications', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/verifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Verification Added",
        description: "Your verification has been successfully added!",
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
        description: "Failed to add verification. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50" data-testid="loading-screen">
        <div className="text-center">
          <div className="w-8 h-8 chitty-gradient-l2 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Shield className="text-white h-5 w-5" />
          </div>
          <div className="text-slate-600">Loading your ChittyID...</div>
        </div>
      </div>
    );
  }

  const hasChittyId = (user as any)?.chittyId;
  const trustScore = (stats as any)?.trustScore || 0;
  const trustLevel = (stats as any)?.trustLevel || 'L0';
  const verificationStatus = (stats as any)?.verificationStatus || 'pending';

  return (
    <div className="dark-page">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 chitty-gradient-l2 rounded-lg flex items-center justify-center">
                <Shield className="text-white text-sm" />
              </div>
              <span className="text-xl font-bold dark-text" data-testid="text-logo">ChittyID</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm dark-muted" data-testid="text-welcome">
                Welcome, {(user as any)?.firstName || (user as any)?.email}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.href = '/api/logout'}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="flex space-x-8 border-b border-white/20">
            {[
              { key: 'overview', label: 'Overview', icon: Shield, colorClass: 'brain-analytical', href: '/' },
              { key: 'verification', label: 'Verification', icon: CheckCircle, colorClass: 'brain-practical', href: '/verification' },
              { key: 'universal', label: 'Universal IDs', icon: Users, colorClass: 'brain-experimental', href: '#universal' },
              { key: 'business', label: 'Business Network', icon: Share2, colorClass: 'brain-interpersonal', href: '/business' },
            ].map(({ key, label, icon: Icon, colorClass, href }) => (
              <a
                key={key}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  if (href === '/') {
                    setActiveTab('overview');
                  } else if (href === '/verification') {
                    window.location.href = '/verification';
                  } else if (href === '#universal') {
                    setActiveTab('universal');
                  } else if (href === '/business') {
                    window.location.href = '/business';
                  }
                }}
                className={`flex items-center space-x-2 pb-3 px-1 border-b-2 transition-colors ${
                  activeTab === key
                    ? `border-current ${colorClass}`
                    : 'border-transparent dark-muted hover:dark-text'
                }`}
                data-testid={`tab-${key}`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {!hasChittyId ? (
              /* Create ChittyID */
              <Card className="dark-card" data-testid="card-create-chittyid">
                <CardHeader className="brain-analytical-bg rainbow-cascade">
                  <CardTitle className="flex items-center space-x-2 text-white">
                    <Shield className="h-5 w-5" />
                    <span>Create Your ChittyID</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="dark-muted mb-6">
                    Start your verification journey by creating your unique ChittyID. This will be your trusted identity across our entire network.
                  </p>
                  <Button 
                    onClick={() => createChittyIdMutation.mutate()}
                    disabled={createChittyIdMutation.isPending}
                    className="brain-analytical-bg"
                    data-testid="button-create-chittyid"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {createChittyIdMutation.isPending ? 'Creating...' : 'Create ChittyID'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              /* ChittyID Dashboard */
              <div className="space-y-6">
                {/* ChittyID Display Card */}
                <ChittyIdDisplay
                  chittyId={user?.chittyId || 'Not Generated'}
                  trustScore={user?.trustScore || 100}
                  trustLevel={trustLevel}
                  isVerified={user?.isVerified || false}
                  firstName={user?.firstName}
                  lastName={user?.lastName}
                  email={user?.email}
                />
                
                <div className="grid lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <TrustScoreCard
                      chittyIdCode={(user as any)?.chittyId?.chittyIdCode || 'Not Generated'}
                      trustScore={trustScore}
                      trustLevel={trustLevel}
                      verificationStatus={verificationStatus}
                    />
                  
                  <Card className="dark-card" data-testid="card-quick-actions">
                    <CardHeader className="brain-experimental-bg rainbow-cascade">
                      <CardTitle className="text-white">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="h-20 flex-col brain-interpersonal border-current dark-card" data-testid="button-share-chittyid">
                          <Share2 className="h-6 w-6 mb-2" />
                          Share ChittyID
                        </Button>
                        <Button variant="outline" className="h-20 flex-col brain-analytical border-current dark-card" data-testid="button-qr-code">
                          <QrCode className="h-6 w-6 mb-2" />
                          QR Code
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Algorithmic Rainbow Spectrum */}
                  <Card className="dark-card" data-testid="card-brain-thinking">
                    <CardHeader className="rainbow-cascade">
                      <CardTitle className="text-white">Clear Algorithmic Spectrum</CardTitle>
                      <p className="text-sm text-white/80">Transparent color algorithms shift dynamically based on trust verification</p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Analytical - Blue */}
                        <div className="text-center p-4 rounded-lg rainbow-cascade-slow">
                          <Shield className="h-6 w-6 mx-auto mb-2 text-white" />
                          <div className="text-white font-semibold text-sm">ANALYTICAL</div>
                          <div className="text-white/80 text-xs">Logic • Data • Facts</div>
                        </div>

                        {/* Practical - Orange */}
                        <div className="text-center p-4 rounded-lg rainbow-cascade">
                          <CheckCircle className="h-6 w-6 mx-auto mb-2 text-white" />
                          <div className="text-white font-semibold text-sm">PRACTICAL</div>
                          <div className="text-white/80 text-xs">Process • Planning • Order</div>
                        </div>

                        {/* Interpersonal - Red */}
                        <div className="text-center p-4 rounded-lg rainbow-cascade-fast">
                          <Share2 className="h-6 w-6 mx-auto mb-2 text-white" />
                          <div className="text-white font-semibold text-sm">INTERPERSONAL</div>
                          <div className="text-white/80 text-xs">People • Emotion • Team</div>
                        </div>

                        {/* Experimental - Yellow */}
                        <div className="text-center p-4 rounded-lg rainbow-cascade">
                          <Star className="h-6 w-6 mx-auto mb-2 text-white" />
                          <div className="text-white font-semibold text-sm">EXPERIMENTAL</div>
                          <div className="text-white/80 text-xs">Vision • Creative • Future</div>
                        </div>
                      </div>
                      
                      <div className="mt-6 p-4 rainbow-cascade-slow rounded-lg opacity-90">
                        <div className="text-sm text-white mb-2 font-medium">Clear Color Evolution</div>
                        <div className="text-xs text-white/80">
                          Colors shift transparently using clear algorithms based on your trust metrics. 
                          Each verification unlocks new frequencies, creating a clear, evolving spectrum 
                          that represents your growing digital identity with complete transparency.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card data-testid="card-verification-status">
                    <CardHeader>
                      <CardTitle className="text-lg">Verification Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Array.isArray(verifications) ? verifications.map((verification: any, index: number) => (
                          <div key={verification.id} className="flex items-center justify-between" data-testid={`verification-${index}`}>
                            <div>
                              <div className="font-medium capitalize">
                                {verification.verificationType.replace('_', ' ')}
                              </div>
                              <div className="text-sm text-slate-600">
                                {new Date(verification.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <Badge
                              variant={verification.status === 'verified' ? 'default' : 'secondary'}
                              className={verification.status === 'verified' ? 'bg-blue-100 text-blue-600' : ''}
                            >
                              {verification.status === 'verified' ? (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              ) : verification.status === 'pending' ? (
                                <Clock className="h-3 w-3 mr-1" />
                              ) : (
                                <AlertCircle className="h-3 w-3 mr-1" />
                              )}
                              {verification.status}
                            </Badge>
                          </div>
                        )) : null}
                        {(!Array.isArray(verifications) || verifications.length === 0) && (
                          <div className="text-center text-slate-500 py-4" data-testid="no-verifications">
                            No verifications yet
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card data-testid="card-network-stats">
                    <CardHeader>
                      <CardTitle className="text-lg">Network Stats</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Business Partners</span>
                          <span className="font-semibold" data-testid="text-business-partners">{(stats as any)?.businessPartners || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Verifications</span>
                          <span className="font-semibold" data-testid="text-verification-count">{(stats as any)?.verificationCount || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Trust Level</span>
                          <Badge data-testid="badge-trust-level">{trustLevel}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'verification' && (
          <VerificationSteps
            hasChittyId={hasChittyId}
            verifications={Array.isArray(verifications) ? verifications : []}
            onAddVerification={(type, metadata) => addVerificationMutation.mutate({ verificationType: type, metadata })}
            isAddingVerification={addVerificationMutation.isPending}
            data-testid="verification-steps"
          />
        )}

        {activeTab === 'universal' && (
          <div className="space-y-8">
            {/* Check if user has created any universal entities, show quickstart if none */}
            <UniversalQuickStart />
            <UniversalEntityCreator />
          </div>
        )}

        {activeTab === 'business' && (
          <BusinessStats data-testid="business-stats" />
        )}
      </div>
    </div>
  );
}
