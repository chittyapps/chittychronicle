import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  CreditCard, 
  Shield, 
  Copy, 
  CheckCircle, 
  AlertCircle,
  User,
  TrendingUp
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChittyIdDisplayProps {
  chittyId: string;
  trustScore: number;
  trustLevel?: string;
  isVerified: boolean;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export default function ChittyIdDisplay({
  chittyId,
  trustScore,
  trustLevel = 'L0',
  isVerified,
  firstName,
  lastName,
  email
}: ChittyIdDisplayProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = () => {
    navigator.clipboard.writeText(chittyId);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "ChittyID copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const getTrustLevelColor = (level: string) => {
    const colors = {
      'L0': 'bg-gray-500',
      'L1': 'bg-blue-500',
      'L2': 'bg-green-500',
      'L3': 'bg-purple-500',
      'L4': 'bg-orange-500',
      'L5': 'bg-red-500'
    };
    return colors[level] || colors['L0'];
  };

  const getTrustLevelName = (level: string) => {
    const names = {
      'L0': 'Basic',
      'L1': 'Verified',
      'L2': 'Enhanced',
      'L3': 'Premium',
      'L4': 'Executive',
      'L5': 'Emergency'
    };
    return names[level] || 'Basic';
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            <span>ChittyID Identity Card</span>
          </div>
          {isVerified ? (
            <Badge className="bg-green-500 hover:bg-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              Verified
            </Badge>
          ) : (
            <Badge variant="secondary">
              <AlertCircle className="h-4 w-4 mr-1" />
              Unverified
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* ChittyID Display */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Universal Identity</p>
                <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
                  {chittyId}
                </p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyToClipboard}
                      className="ml-2"
                    >
                      {copied ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy ChittyID</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* User Info */}
          {(firstName || lastName || email) && (
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {firstName} {lastName}
                </p>
                {email && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {email}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Trust Score */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Trust Score</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {trustScore}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Trust Level</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`${getTrustLevelColor(trustLevel)} text-white`}>
                  {trustLevel}
                </Badge>
                <span className="text-sm font-semibold text-purple-600">
                  {getTrustLevelName(trustLevel)}
                </span>
              </div>
            </div>
          </div>

          {/* ChittyID Format Explanation */}
          <div className="text-xs text-gray-500 dark:text-gray-400 border-t pt-3">
            <p className="font-semibold mb-1">ChittyID Format:</p>
            <p>CP = ChittyPerson • Universal identity for individuals</p>
            <p>Format: VV-G-LLL-SSSS-T-YM-C-X</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}