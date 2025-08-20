import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Crown, Zap, Shield, Sparkles } from "lucide-react";

interface UpgradePromptProps {
  context: "timeline" | "dashboard" | "ecosystem";
  compact?: boolean;
}

export function UpgradePrompt({ context, compact = false }: UpgradePromptProps) {
  const getContextContent = () => {
    switch (context) {
      case "timeline":
        return {
          title: "Unlock Advanced Timeline Features",
          description: "Get unlimited timeline entries, AI-powered evidence correlation, and blockchain verification with ChittyOS Pro",
          features: ["Unlimited timeline entries", "AI evidence analysis", "Blockchain verification", "Advanced search"],
          cta: "Upgrade to ChittyOS Pro"
        };
      case "dashboard":
        return {
          title: "Complete Legal Analytics Suite", 
          description: "Access comprehensive case analytics, trust scoring, and cross-platform evidence management",
          features: ["Advanced analytics", "Trust scoring", "Cross-platform sync", "Team collaboration"],
          cta: "Get Full ChittyOS"
        };
      case "ecosystem":
        return {
          title: "Join the Complete Chitty Ecosystem",
          description: "Unlock all 6 applications with ChittyID unique ID generation and universal authentication for people, places, things, and events",
          features: ["All 6 Chitty apps", "Universal ChittyID unique identifier generation", "Cross-app data portability", "Blockchain-verified identity"],
          cta: "Create ChittyID Account"
        };
      default:
        return {
          title: "Upgrade to Full Platform",
          description: "Get access to the complete Chitty ecosystem",
          features: ["Premium features", "Advanced tools", "Priority support"],
          cta: "Learn More"
        };
    }
  };

  const content = getContextContent();

  if (compact) {
    return (
      <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Crown className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">{content.title}</p>
                <p className="text-xs text-gray-600">This is ChittyChronicle Lite</p>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => window.open('https://id.chitty.cc/get', '_blank')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {content.cta}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">{content.title}</CardTitle>
          </div>
          <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
            Lite Version
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-700 mb-4">{content.description}</p>
        
        <div className="grid grid-cols-2 gap-2 mb-6">
          {content.features.map((feature, index) => (
            <div key={index} className="flex items-center text-sm">
              <Sparkles className="h-3 w-3 mr-2 text-blue-500" />
              {feature}
            </div>
          ))}
        </div>

        <div className="flex space-x-3">
          <Button 
            className="flex-1 bg-blue-600 hover:bg-blue-700"
            onClick={() => window.open('https://id.chitty.cc/get', '_blank')}
          >
            <Crown className="h-4 w-4 mr-2" />
            {content.cta}
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => window.open('https://chitty.cc', '_blank')}
          >
            Learn More
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}