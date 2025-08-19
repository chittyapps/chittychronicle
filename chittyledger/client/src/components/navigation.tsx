import { Link, useLocation } from "wouter";
import { Scale, Home, FileText, Search, Link as LinkIcon, Database, Zap } from "lucide-react";

export default function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/evidence", icon: FileText, label: "Evidence" },
    { path: "/search", icon: Search, label: "Search" },
    { path: "/chain", icon: LinkIcon, label: "Chain" },
    { path: "/notion", icon: Database, label: "Notion" },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-20 bg-slate-800/90 backdrop-blur-sm border-r border-slate-600 z-50 flex flex-col items-center py-8">
      <Link href="/">
        <div 
          className="w-12 h-12 border-2 border-emerald-400 rounded-lg flex items-center justify-center mb-8 cursor-pointer hover:bg-emerald-400/10 transition-colors"
          data-testid="legal-seal-home"
        >
          <Scale className="text-emerald-400 w-6 h-6" />
        </div>
      </Link>
      
      <div className="flex flex-col space-y-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          
          return (
            <Link key={item.path} href={item.path}>
              <div 
                className="nav-item group cursor-pointer relative"
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <div 
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    isActive 
                      ? "bg-emerald-400 text-slate-900" 
                      : "bg-slate-700 text-slate-300 hover:bg-emerald-400 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                
                {/* Tooltip */}
                <div className={`
                  absolute left-16 top-1/2 transform -translate-y-1/2 
                  bg-slate-700 rounded-lg px-3 py-1 border border-slate-500
                  opacity-0 group-hover:opacity-100 transition-opacity duration-300
                  pointer-events-none whitespace-nowrap z-50
                `}>
                  <span className="text-sm text-slate-200">{item.label}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      
      {/* Status Indicator */}
      <div className="mt-auto">
        <div className="bg-slate-700 rounded-lg p-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
        </div>
      </div>
    </nav>
  );
}
