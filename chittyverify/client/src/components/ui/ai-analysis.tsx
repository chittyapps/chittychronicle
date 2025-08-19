import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Zap, TrendingUp, AlertTriangle } from "lucide-react";

export function AIAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    // Simulate analysis time
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsAnalyzing(false);
  };

  return (
    <Card className="evidence-card">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Brain className="w-5 h-5 mr-2 text-primary-blue" />
          AI Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-blue-900">Case Strength</h4>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex-1 bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: "78%" }}
                ></div>
              </div>
              <span className="text-sm font-medium text-blue-900">78%</span>
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h4 className="font-semibold text-yellow-900">Recommendations</h4>
            </div>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Collect additional financial documentation</li>
              <li>• Verify email authenticity with metadata</li>
              <li>• Consider expert witness testimony</li>
            </ul>
          </div>

          <Button 
            className="w-full bg-primary-blue text-white hover:bg-blue-600 transition-colors text-sm font-medium"
            onClick={handleRunAnalysis}
            disabled={isAnalyzing}
          >
            <Zap className="w-4 h-4 mr-2" />
            {isAnalyzing ? "Analyzing..." : "Run Full Analysis"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
