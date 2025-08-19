import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Shield, Clock, Users, Target, Network, Scale } from 'lucide-react';

interface SixDTrustProps {
  user?: {
    sourceScore: number;
    timeScore: number;
    channelScore: number;
    outcomesScore: number;
    networkScore: number;
    justiceScore: number;
    composite6DTrust: number;
    fullName?: string;
    userType?: string;
  };
  compact?: boolean;
}

const TRUST_DIMENSIONS = [
  {
    key: 'sourceScore',
    label: 'Source',
    icon: Shield,
    color: 'bg-green-500',
    description: 'Source reliability & authenticity'
  },
  {
    key: 'timeScore', 
    label: 'Time',
    icon: Clock,
    color: 'bg-blue-500',
    description: 'Temporal consistency & timeliness'
  },
  {
    key: 'channelScore',
    label: 'Channel', 
    icon: Network,
    color: 'bg-purple-500',
    description: 'Communication channel integrity'
  },
  {
    key: 'outcomesScore',
    label: 'Outcomes',
    icon: Target,
    color: 'bg-orange-500', 
    description: 'Historical success & reliability'
  },
  {
    key: 'networkScore',
    label: 'Network',
    icon: Users,
    color: 'bg-cyan-500',
    description: 'Professional network strength'
  },
  {
    key: 'justiceScore',
    label: 'Justice',
    icon: Scale,
    color: 'bg-emerald-500',
    description: 'Ethical alignment & fairness'
  }
];

export function SixDTrustWidget({ user, compact = false }: SixDTrustProps) {
  if (!user) {
    return (
      <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-400" />
              <CardTitle className="text-lg">ChittyTrust</CardTitle>
            </div>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              6D Trust Revolution
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-slate-300">No user selected</p>
            <p className="text-sm text-slate-400 mt-2">Select a user to view their 6D Trust profile</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const trustPercentage = (user.composite6DTrust / 6) * 100;
  
  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700">
        <Shield className="h-5 w-5 text-green-400" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">
              {user.composite6DTrust.toFixed(1)}/6.0
            </span>
            <Progress value={trustPercentage} className="flex-1 h-2" />
          </div>
          <p className="text-xs text-slate-400">{user.fullName}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-400" />
            <CardTitle className="text-lg">ChittyTrust</CardTitle>
          </div>
          <Badge variant="outline" className="text-blue-400 border-blue-400">
            6D Trust Revolution
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-green-400">
            The 6D Trust
          </h3>
          <h4 className="text-xl font-semibold text-green-400 mb-2">
            Revolution
          </h4>
          <p className="text-sm text-slate-300 mb-4">
            Beyond credit scores. Beyond binary trust. ChittyTrust measures what matters: 
            Source, Time, Channel, Outcomes, Network, and Justice.
          </p>
        </div>

        {user.fullName && (
          <div className="border-t border-slate-700 pt-4">
            <p className="text-sm text-slate-400">Trust Profile</p>
            <p className="font-medium">{user.fullName}</p>
            <p className="text-sm text-slate-400">{user.userType}</p>
          </div>
        )}

        <div className="space-y-3">
          <div className="text-center">
            <div className="text-3xl font-bold text-white mb-1">
              {user.composite6DTrust.toFixed(1)}
            </div>
            <p className="text-sm text-slate-400">Composite 6D Trust Score</p>
            <Progress value={trustPercentage} className="mt-2" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {TRUST_DIMENSIONS.map((dimension) => {
              const score = user[dimension.key as keyof typeof user] as number;
              const percentage = (score * 100);
              const IconComponent = dimension.icon;
              
              return (
                <div key={dimension.key} className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`p-2 rounded-full ${dimension.color} bg-opacity-20`}>
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <div className="text-lg font-bold text-white">
                      {score.toFixed(1)}
                    </div>
                    <div className="text-xs text-slate-400">
                      {dimension.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-700 pt-4">
            <Button 
              variant="outline" 
              className="w-full bg-blue-600 hover:bg-blue-700 border-blue-500 text-white"
              data-testid="button-experience-chittytrust"
            >
              <Shield className="h-4 w-4 mr-2" />
              Experience ChittyTrust
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SixDTrustWidget;