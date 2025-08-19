import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Database, 
  CheckCircle, 
  RefreshCw, 
  Clock, 
  Shield,
  Eye,
  FileText,
  Settings
} from "lucide-react";

export default function NotionSync() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSync, setLastSync] = useState<Date | null>(new Date());
  const [evidenceCount, setEvidenceCount] = useState(847);

  const handleSync = () => {
    setSyncStatus('syncing');
    
    setTimeout(() => {
      setSyncStatus('success');
      setLastSync(new Date());
      setEvidenceCount(prev => prev + Math.floor(Math.random() * 10));
    }, 3000);
  };

  const syncModules = [
    { title: "Evidence Items", count: evidenceCount, lastSync: "2 minutes ago", status: "active", icon: FileText },
    { title: "Chain of Custody", count: 234, lastSync: "5 minutes ago", status: "active", icon: Shield },
    { title: "Contradiction Analysis", count: 12, lastSync: "1 hour ago", status: "warning", icon: Eye },
    { title: "Case Metadata", count: 45, lastSync: "10 minutes ago", status: "active", icon: Database }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      
      {/* Header */}
      <div className="mb-12">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 border-2 border-emerald-400 rounded-lg flex items-center justify-center">
                <Database className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Notion Integration</h1>
                <p className="text-slate-300">
                  Synchronize ChittyChain evidence with your Notion workspace
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge className={`px-4 py-2 rounded-lg ${
                syncStatus === 'success' ? 'bg-emerald-400/20 text-emerald-400' : 
                syncStatus === 'syncing' ? 'bg-blue-500/20 text-blue-400' : 
                'bg-slate-700 text-slate-300'
              }`}>
                {syncStatus === 'success' && <CheckCircle className="w-4 h-4 mr-2" />}
                {syncStatus === 'syncing' && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                {syncStatus === 'idle' && <Clock className="w-4 h-4 mr-2" />}
                {syncStatus === 'success' ? 'Synchronized' : 
                 syncStatus === 'syncing' ? 'Syncing...' : 'Ready'}
              </Badge>
              
              <Button 
                onClick={handleSync}
                disabled={syncStatus === 'syncing'}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold"
                data-testid="button-sync-notion"
              >
                <RefreshCw className={`w-5 h-5 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                {syncStatus === 'syncing' ? 'Syncing' : 'Sync Now'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
        {syncModules.map((module, i) => {
          const Icon = module.icon;
          return (
            <div key={i} className="bg-slate-800/30 backdrop-blur-sm border border-slate-600 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    module.status === 'active' ? 'bg-emerald-400/20' : 'bg-red-500/20'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      module.status === 'active' ? 'text-emerald-400' : 'text-red-400'
                    }`} />
                  </div>
                  
                  <div>
                    <div className="text-lg font-semibold text-white">{module.title}</div>
                    <div className="text-sm text-slate-400">Last sync: {module.lastSync}</div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-400">{module.count.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">Items</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Configuration & Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Configuration */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Settings className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Configuration</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm text-slate-400 mb-1">Database ID</div>
              <div className="font-mono text-blue-400 text-sm">24694de4357980dba689cf778c9708eb</div>
            </div>
            
            <div>
              <div className="text-sm text-slate-400 mb-1">Sync Interval</div>
              <div className="text-slate-300 text-sm">Every 5 minutes</div>
            </div>
            
            <div>
              <div className="text-sm text-slate-400 mb-1">Last Full Sync</div>
              <div className="text-slate-300 text-sm">
                {lastSync ? lastSync.toLocaleString() : 'Never'}
              </div>
            </div>
            
            <Button variant="outline" className="w-full border-emerald-400/30 text-emerald-400 hover:bg-emerald-400/10">
              Configure Settings
            </Button>
          </div>
        </div>

        {/* Sync Log */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-600 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Database className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Sync Log</h2>
          </div>
          
          <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm max-h-64 overflow-y-auto">
            <div className="space-y-2">
              <div className="text-emerald-400">→ Connection established</div>
              <div className="text-slate-300">→ Fetching evidence records...</div>
              <div className="text-blue-400">→ Processing {evidenceCount} evidence items</div>
              <div className="text-emerald-400">→ Blockchain verification: PASSED</div>
              {syncStatus === 'success' && (
                <>
                  <div className="text-emerald-400">→ Sync completed successfully</div>
                  <div className="text-slate-300">→ {evidenceCount} records synchronized</div>
                </>
              )}
              {syncStatus === 'syncing' && (
                <div className="text-blue-400 animate-pulse">→ Synchronization in progress...</div>
              )}
              <div className="pt-2">
                <span className="text-blue-400 animate-pulse">█</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}