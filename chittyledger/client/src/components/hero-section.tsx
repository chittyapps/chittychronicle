import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, Scale, FileText, Database, CheckCircle, Activity, MapPin, Clock, Link, Target, Network, Gavel } from "lucide-react";

export default function HeroSection() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: dashboardApi.getStats,
  });

  if (isLoading) {
    return (
      <section className="min-h-screen relative overflow-hidden flex items-center justify-center bg-slate-900">
        <div className="text-xl text-emerald-400">Loading ChittyChain...</div>
      </section>
    );
  }

  const trustMetrics = [
    { icon: MapPin, value: "Source", color: "text-emerald-400" },
    { icon: Clock, value: "Time", color: "text-blue-400" },
    { icon: Link, value: "Chain", color: "text-cyan-400" },
    { icon: Target, value: "Outcomes", color: "text-purple-400" },
    { icon: Network, value: "Network", color: "text-yellow-400" },
    { icon: Gavel, value: "Justice", color: "text-red-400" }
  ];

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-6 left-8 flex items-center space-x-3">
        <div className="w-8 h-8 border-2 border-emerald-400 rounded-lg flex items-center justify-center">
          <Scale className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-emerald-400 font-semibold text-lg">ChittyChain</span>
      </div>

      <div className="absolute top-6 right-8">
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-4 py-1">
          6D Evidence Revolution
        </Badge>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-8 pt-32 pb-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center max-w-7xl mx-auto">
          
          {/* Left Column - Hero Content */}
          <div className="space-y-8">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight">
                The 6D Evidence
                <br />
                <span className="text-emerald-400">Revolution</span>
              </h1>
              
              <p className="text-xl text-slate-300 leading-relaxed max-w-lg">
                Beyond credit scores. Beyond binary trust. ChittyChain is the immutable 
                ledger that records Source, Time, Chain, Outcomes, Network, and Justice.
              </p>
            </div>

            {/* Trust Metrics */}
            <div className="flex items-center space-x-4">
              {trustMetrics.map((metric, i) => {
                const Icon = metric.icon;
                return (
                  <div key={i} className="flex flex-col items-center">
                    <div className={`w-12 h-12 rounded-lg border-2 border-slate-600 bg-slate-800 flex items-center justify-center ${metric.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs text-slate-400 mt-1">{metric.value}</span>
                  </div>
                );
              })}
            </div>

            <Button className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold inline-flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Experience ChittyChain
            </Button>
          </div>

          {/* Right Column - Evidence Preview */}
          <div className="relative">
            <div className="bg-slate-800/50 border border-slate-600 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <span className="text-emerald-400 text-sm font-semibold">Evidence Preview</span>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-sm">Verified</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <div className="text-sm text-slate-400 mb-2">Case ID: CHT-2024-001</div>
                  <div className="text-white font-medium">Contract Evidence Package</div>
                  <div className="text-slate-300 text-sm mt-1">Immutably recorded in ChittyChain ledger</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-emerald-400 font-bold text-lg">{stats?.evidenceArtifacts || '2,847'}</div>
                    <div className="text-slate-400 text-xs">Evidence Items</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-blue-400 font-bold text-lg">{stats?.verificationRate || '99.7'}%</div>
                    <div className="text-slate-400 text-xs">Trust Score</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-cyan-400 font-bold text-lg">{stats?.activeCases || '45'}</div>
                    <div className="text-slate-400 text-xs">Active Cases</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-6xl mx-auto">
          {[
            { icon: Shield, title: "Immutable Recording", desc: "Evidence permanently recorded with cryptographic integrity" },
            { icon: Scale, title: "Legal Ledger", desc: "Court-admissible chain of custody tracking" },
            { icon: Database, title: "Evidence Repository", desc: "Centralized ledger for all case evidence" }
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div key={i} className="bg-slate-800/30 border border-slate-600 rounded-xl p-6 text-center">
                <div className="w-12 h-12 bg-emerald-400/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
