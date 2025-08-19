import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { OneClickAuthentication } from "@/components/authentication/OneClickAuthentication";
import { EvidenceCard } from "@/components/ui/evidence-card";
import ChittyBeaconWidget from "@/components/beacon/ChittyBeaconWidget";
import { QuickShareButton } from "@/components/sharing/QuickShareButton";
import { Shield, FileCheck, Lock, Zap, CheckCircle, Clock, Users, Award, Database, Globe } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const [selectedCaseId, setSelectedCaseId] = useState<string>("case-1");

  const { data: cases, isLoading: casesLoading } = useQuery({
    queryKey: ["/api/cases"],
  });

  const { data: currentCase } = useQuery({
    queryKey: ["/api/cases", selectedCaseId],
    enabled: !!selectedCaseId,
  });

  const { data: evidence, isLoading: evidenceLoading } = useQuery({
    queryKey: ["/api/cases", selectedCaseId, "evidence"],
    enabled: !!selectedCaseId,
  });

  const verificationLayers = [
    {
      name: "Source",
      icon: Shield,
      description: "Identity authentication",
      status: "verified",
      color: "text-primary-blue"
    },
    {
      name: "Time",
      icon: Clock,
      description: "Timestamp validation",
      status: "verified",
      color: "text-accent-emerald"
    },
    {
      name: "Integrity",
      icon: Lock,
      description: "Cryptographic hash",
      status: "verified",
      color: "text-accent-purple"
    },
    {
      name: "Custody",
      icon: FileCheck,
      description: "Chain of possession",
      status: "pending",
      color: "text-warning"
    },
    {
      name: "Trust",
      icon: Award,
      description: "Reputation scoring",
      status: "verified",
      color: "text-success"
    },
    {
      name: "Justice",
      icon: Users,
      description: "Legal standing",
      status: "verified",
      color: "text-primary-blue"
    }
  ];

  const ecosystemStats = [
    { label: "Active Cases", value: "1,247", icon: Database },
    { label: "ChittyID Users", value: "12,853", icon: Users },
    { label: "Evidence Verified", value: "34,291", icon: CheckCircle },
    { label: "Court Admissions", value: "2,106", icon: Award }
  ];

  if (casesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary-blue border-t-transparent rounded-full animate-spin"></div>
          <div className="text-lg text-muted-foreground">Loading ChittyVerify...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="hero-section py-24 fade-in">
        <div className="container-professional">
          <div className="text-center relative z-10">
            <div className="inline-flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="text-left">
                <h1 className="text-6xl font-bold">
                  <span className="text-white">Chitty</span>
                  <span className="text-gradient-primary">Verify</span>
                </h1>
                <p className="text-xl text-slate-400 font-light">Evidence Platform</p>
              </div>
            </div>
            
            <p className="text-2xl text-slate-300 mb-6 max-w-4xl mx-auto leading-relaxed">
              Stop uploading evidence over and over
            </p>
            
            <p className="text-lg text-slate-400 mb-12 max-w-4xl mx-auto leading-relaxed">
              Create immutable, court-ready evidence records with cryptographic proof that institutions trust. 
              Part of the ChittyTrust ecosystem for complete identity and evidence verification.
            </p>
            
            <div className="flex justify-center mb-16">
              <OneClickAuthentication />
            </div>

            {/* 6D Trust Verification Layers */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 max-w-6xl mx-auto">
              {verificationLayers.map((layer, index) => {
                const IconComponent = layer.icon;
                return (
                  <div key={layer.name} className="professional-card p-6 text-center slide-up" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex justify-center mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-card flex items-center justify-center shadow-professional ${
                        layer.status === 'verified' ? 'shadow-glow' : ''
                      }`}>
                        <IconComponent className={`w-6 h-6 ${layer.color}`} />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">{layer.name}</h3>
                    <p className="text-sm text-slate-400 mb-3">{layer.description}</p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                      layer.status === 'verified' 
                        ? 'status-verified' 
                        : 'status-pending'
                    }`}>
                      {layer.status === 'verified' ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Verified
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          Pending
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Ecosystem Stats */}
      <section className="py-16">
        <div className="container-professional">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {ecosystemStats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={stat.label} className="professional-card p-6 text-center scale-in" style={{ animationDelay: `${index * 150}ms` }}>
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div className="text-3xl font-bold text-gradient-primary mb-2">{stat.value}</div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ChittyBeacon Integration */}
      <section className="py-16">
        <div className="container-professional">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">ChittyBeacon Integration</h2>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto">
              Generate immutable evidence beacons and verify blockchain-ready evidence records with cryptographic proof
            </p>
          </div>
          <ChittyBeaconWidget />
        </div>
      </section>

      {/* Evidence Dashboard */}
      <section className="py-16">
        <div className="container-professional">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="text-4xl font-bold text-white mb-4">Evidence Dashboard</h2>
              <p className="text-lg text-slate-400">Manage your verified evidence and court-ready documentation</p>
            </div>
            <button className="btn-primary flex items-center gap-2">
              <Zap className="w-5 h-5" />
              New Evidence
            </button>
          </div>

          {evidenceLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="professional-card p-8 animate-pulse">
                  <div className="w-full h-32 bg-muted rounded-lg mb-4"></div>
                  <div className="w-3/4 h-4 bg-muted rounded mb-2"></div>
                  <div className="w-1/2 h-3 bg-muted rounded"></div>
                </div>
              ))}
            </div>
          ) : evidence && Array.isArray(evidence) && evidence.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {evidence.map((item: any, index: number) => (
                <EvidenceCard 
                  key={item.id} 
                  evidence={item}
                />
              ))}
            </div>
          ) : (
            <div className="professional-card p-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-card flex items-center justify-center">
                  <FileCheck className="w-8 h-8 text-primary-blue" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">No Evidence Yet</h3>
              <p className="text-lg text-slate-400 mb-8">
                Upload your first piece of evidence to start building your verified legal record.
              </p>
              <button className="btn-primary">
                Upload First Evidence
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ChittyTrust Ecosystem Integration */}
      <section className="py-16 bg-gradient-card border-y border-border">
        <div className="container-professional">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">ChittyTrust Ecosystem</h2>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto">
              ChittyVerify works seamlessly with ChittyID for identity verification and ChittyTrust for reputation scoring, 
              providing a complete solution for legal evidence management.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="professional-card p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                  <Users className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gradient-primary mb-4">ChittyID</h3>
              <p className="text-slate-400 mb-6">
                Verify "who you are" with decentralized identity authentication
              </p>
              <div className="status-verified text-sm">
                <Shield className="w-4 h-4" />
                Connected
              </div>
            </div>

            <div className="professional-card p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-success flex items-center justify-center shadow-glow">
                  <Shield className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-gradient-success mb-4">ChittyVerify</h3>
              <p className="text-slate-400 mb-6">
                Verify "what you can prove" with immutable evidence records
              </p>
              <div className="status-verified text-sm">
                <CheckCircle className="w-4 h-4" />
                Active
              </div>
            </div>

            <div className="professional-card p-8 text-center">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
                  <Award className="w-8 h-8 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">ChittyTrust</h3>
              <p className="text-slate-400 mb-6">
                Verify "how trustworthy" with reputation and trust scoring
              </p>
              <div className="status-pending text-sm">
                <Globe className="w-4 h-4" />
                Coming Soon
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}