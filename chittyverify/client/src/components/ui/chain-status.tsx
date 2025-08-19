import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link as LinkIcon, Coins } from "lucide-react";

export function ChainStatus() {
  return (
    <Card className="evidence-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <LinkIcon className="w-5 h-5 mr-2 text-primary-blue" />
          Chain Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Latest Block</span>
            <span className="font-mono text-sm">#2,847,392</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Network Status</span>
            <Badge className="bg-status-verified/10 text-status-verified text-sm">
              <div className="w-2 h-2 bg-status-verified rounded-full mr-2"></div>
              Active
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Minting Cost</span>
            <span className="text-sm">0.15 CHITTY</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Gas Price</span>
            <span className="text-sm">20 gwei</span>
          </div>
          <Button className="w-full gradient-primary text-white hover:opacity-90 transition-opacity text-sm font-medium">
            <Coins className="w-4 h-4 mr-2" />
            Mint to Chain
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
