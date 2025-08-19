import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, FileText, Clock, TrendingUp, Users, Globe, 
  ExternalLink, Zap, Lock, Database, Brain, Scale,
  ChevronRight, Activity, CheckCircle, AlertTriangle
} from "lucide-react";
import { Link } from "wouter";

export default function ChittyEcosystem() {
  const [selectedApp, setSelectedApp] = useState<string | null>(null);

  const chittyApps = [
    {
      id: "chittychronicle",
      name: "ChittyChronicle",
      icon: Clock,
      description: "Legal timeline management and evidence tracking",
      status: "active",
      color: "blue",
      url: "/",
      features: ["Timeline Management", "Evidence Tracking", "Case Organization", "AI Automation"],
      details: "ADHD-friendly legal timeline management with automated document ingestion and evidence correlation."
    },
    {
      id: "chittyid",
      name: "ChittyID",
      icon: Shield,
      description: "Universal identity verification and trust scoring",
      status: "active", 
      color: "green",
      url: "https://id.chitty.cc/get",
      external: true,
      features: ["Identity Verification", "Trust Scoring", "Universal IDs", "API Integration"],
      details: "Comprehensive identity platform with Herrmann Brain Dominance trust scoring for people, places, things, and events."
    },
    {
      id: "chittyverify",
      name: "ChittyVerify", 
      icon: Lock,
      description: "Immutable evidence verification before blockchain",
      status: "active",
      color: "purple",
      url: "/verify",
      features: ["Evidence Verification", "Cryptographic Integrity", "Court Admissible", "Blockchain Ready"],
      details: "Immutable verification layer creating cryptographically verified evidence ready for blockchain commitment."
    },
    {
      id: "chittyledger",
      name: "ChittyLedger",
      icon: Database,
      description: "Blockchain evidence ledger with custody tracking",
      status: "active",
      color: "emerald",
      url: "/ledger", 
      features: ["Blockchain Storage", "Chain of Custody", "Evidence Tiering", "Contradiction Detection"],
      details: "Comprehensive legal evidence management with blockchain-inspired architecture and forensic analysis."
    },
    {
      id: "chittytrust",
      name: "ChittyTrust",
      icon: Brain,
      description: "6-dimensional trust scoring system",
      status: "active",
      color: "orange",
      url: "/trust",
      features: ["6D Trust Analysis", "Behavioral Scoring", "Entity Evaluation", "Outcome Tracking"],
      details: "Revolutionary trust scoring evaluating entities across Source, Temporal, Channel, Outcome, Network, and Justice dimensions."
    },
    {
      id: "chittyops",
      name: "ChittyOps",
      icon: Activity,
      description: "Operations and workflow automation",
      status: "development",
      color: "gray",
      url: "/ops",
      features: ["Workflow Automation", "Process Management", "System Operations", "Integration Hub"],
      details: "Operational backbone for managing workflows and automating processes across the Chitty ecosystem."
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-700";
      case "development": return "bg-yellow-100 text-yellow-700";
      case "maintenance": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getIconColor = (color: string) => {
    const colors = {
      blue: "bg-blue-50 text-blue-600",
      green: "bg-green-50 text-green-600", 
      purple: "bg-purple-50 text-purple-600",
      emerald: "bg-emerald-50 text-emerald-600",
      orange: "bg-orange-50 text-orange-600",
      gray: "bg-gray-50 text-gray-600"
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center px-6">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-soft">
              <Globe className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl">Chitty Ecosystem</span>
              <p className="text-xs text-gray-600">Universal Legal Technology Platform</p>
            </div>
          </div>
          
          <div className="ml-auto">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4 mr-1" />
                Back to ChittyChronicle
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Introduction */}
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              Chitty Ecosystem Platform
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              A comprehensive suite of legal technology applications providing identity verification, 
              evidence management, trust scoring, and timeline organization for modern legal practice.
            </p>
          </div>

          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="shadow-soft border-0">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-blue-50 rounded-xl w-fit mx-auto mb-4">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">6 Applications</h3>
                <p className="text-gray-600 text-sm">Integrated legal technology suite</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft border-0">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-green-50 rounded-xl w-fit mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">5 Active</h3>
                <p className="text-gray-600 text-sm">Production-ready applications</p>
              </CardContent>
            </Card>
            
            <Card className="shadow-soft border-0">
              <CardContent className="p-6 text-center">
                <div className="p-3 bg-purple-50 rounded-xl w-fit mx-auto mb-4">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Universal</h3>
                <p className="text-gray-600 text-sm">Cross-platform integration</p>
              </CardContent>
            </Card>
          </div>

          {/* Applications Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {chittyApps.map((app) => {
              const Icon = app.icon;
              return (
                <Card 
                  key={app.id} 
                  className="shadow-soft hover:shadow-elevated transition-all duration-200 cursor-pointer border-0 group"
                  onClick={() => setSelectedApp(selectedApp === app.id ? null : app.id)}
                >
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className={`p-3 rounded-xl ${getIconColor(app.color)}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(app.status)} variant="secondary">
                          {app.status}
                        </Badge>
                        {app.external && <ExternalLink className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <h3 className="font-semibold text-lg mb-2 group-hover:text-blue-600 transition-colors">
                      {app.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {app.description}
                    </p>
                    
                    {selectedApp === app.id && (
                      <div className="space-y-4 animate-fade-in">
                        <p className="text-sm text-gray-700 border-l-4 border-blue-200 pl-3">
                          {app.details}
                        </p>
                        
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm text-gray-800">Key Features:</h4>
                          <div className="grid grid-cols-2 gap-1">
                            {app.features.map((feature, index) => (
                              <div key={index} className="flex items-center text-xs text-gray-600">
                                <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          {app.external ? (
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(app.url, '_blank');
                              }}
                            >
                              Open Application
                              <ExternalLink className="h-3 w-3 ml-1" />
                            </Button>
                          ) : (
                            <Link href={app.url}>
                              <Button size="sm" className="w-full">
                                Open Application
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {selectedApp !== app.id && (
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Integration Architecture */}
          <Card className="shadow-soft border-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-yellow-600" />
                <span>Integration Architecture</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-3">Universal Identity Layer</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    ChittyID provides universal identity verification across all applications, 
                    enabling seamless authentication and trust scoring throughout the ecosystem.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Shield className="h-4 w-4 mr-2 text-green-500" />
                      Single sign-on across applications
                    </div>
                    <div className="flex items-center text-sm">
                      <Brain className="h-4 w-4 mr-2 text-orange-500" />
                      Herrmann Brain Dominance scoring
                    </div>
                    <div className="flex items-center text-sm">
                      <Globe className="h-4 w-4 mr-2 text-blue-500" />
                      Universal entity identification
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-3">Evidence Flow Pipeline</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Evidence flows from ChittyChronicle through ChittyVerify to ChittyLedger, 
                    ensuring proper verification and immutable storage.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-2 text-blue-500" />
                      Timeline organization in ChittyChronicle
                    </div>
                    <div className="flex items-center text-sm">
                      <Lock className="h-4 w-4 mr-2 text-purple-500" />
                      Cryptographic verification in ChittyVerify
                    </div>
                    <div className="flex items-center text-sm">
                      <Database className="h-4 w-4 mr-2 text-emerald-500" />
                      Immutable storage in ChittyLedger
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}