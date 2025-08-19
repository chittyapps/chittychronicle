import { 
  Briefcase, 
  Shield, 
  FileText, 
  BarChart3, 
  Users, 
  Archive,
  HelpCircle,
  ChevronRight
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

export default function ModernSidebar() {
  const [location] = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>(["chitty-tools"]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const sidebarSections = [
    {
      id: "chitty-tools",
      label: "Chitty Ecosystem",
      items: [
        {
          icon: Briefcase,
          label: "ChittyChronicle",
          href: "/dashboard",
          active: location === "/dashboard",
          badge: "Pro",
          external: false
        },
        {
          icon: Shield,
          label: "ChittyVerify",
          href: "#",
          active: false,
          badge: undefined,
          external: true
        },
        {
          icon: FileText,
          label: "ChittyCases",
          href: "#",
          active: false,
          badge: undefined,
          external: true
        },
      ]
    },
    {
      id: "analytics",
      label: "Analytics & Reports",
      items: [
        {
          icon: BarChart3,
          label: "Case Analytics",
          href: "/analytics",
          active: location === "/analytics",
          badge: undefined,
          external: false
        },
        {
          icon: Users,
          label: "Team Reports",
          href: "/reports",
          active: location === "/reports",
          badge: undefined,
          external: false
        },
        {
          icon: Archive,
          label: "Document Archive",
          href: "/archive",
          active: location === "/archive",
          badge: undefined,
          external: false
        },
      ]
    }
  ];

  return (
    <aside className="fixed left-0 top-16 z-40 w-64 h-[calc(100vh-4rem)] border-r bg-white overflow-y-auto">
      <div className="p-4 space-y-4">
        {/* Quick Actions */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2">
            Quick Actions
          </h3>
          <Button 
            className="w-full justify-start bg-blue-600 hover:bg-blue-700" 
            size="sm"
            data-testid="new-case-button"
          >
            <FileText className="mr-2 h-4 w-4" />
            New Case
          </Button>
          <Button 
            variant="outline" 
            className="w-full justify-start" 
            size="sm"
          >
            <Briefcase className="mr-2 h-4 w-4" />
            Import Documents
          </Button>
        </div>

        {/* Navigation Sections */}
        <div className="space-y-4">
          {sidebarSections.map((section) => (
            <Collapsible
              key={section.id}
              open={expandedSections.includes(section.id)}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                {section.label}
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${
                    expandedSections.includes(section.id) ? 'rotate-90' : ''
                  }`} 
                />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1 mt-1">
                {section.items.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`w-full justify-start pl-4 transition-all duration-200 ${
                        item.active
                          ? "bg-blue-50 text-blue-700 border-r-2 border-blue-600"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                      {item.external && (
                        <ChevronRight className="h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* Help Section */}
        <div className="pt-4 border-t space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-600 hover:text-gray-900"
          >
            <HelpCircle className="mr-2 h-4 w-4" />
            Help & Support
          </Button>
        </div>
      </div>
    </aside>
  );
}