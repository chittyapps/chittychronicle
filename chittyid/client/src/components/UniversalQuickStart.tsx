import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { User, MapPin, Package, Calendar, Shield, Star, CheckCircle, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const quickStartEntities = [
  {
    type: 'person',
    name: 'Yourself',
    description: 'Create your personal ChittyID',
    icon: User,
    color: 'bg-blue-500',
    prefix: 'CP',
    example: 'CP-2025-VER-XXXX-X',
    prompt: 'Your full name',
    placeholder: 'John Doe'
  },
  {
    type: 'place',
    name: 'Your Location', 
    description: 'Add your home or office',
    icon: MapPin,
    color: 'bg-orange-500',
    prefix: 'CL',
    example: 'CL-2025-VER-XXXX-X',
    prompt: 'Location name',
    placeholder: 'Chicago, IL'
  },
  {
    type: 'thing',
    name: 'Your Device',
    description: 'Register your primary device',
    icon: Package,
    color: 'bg-red-500', 
    prefix: 'CT',
    example: 'CT-2025-VER-XXXX-X',
    prompt: 'Device name',
    placeholder: 'MacBook Pro 2024'
  },
  {
    type: 'event',
    name: 'Your Project',
    description: 'Track your current project',
    icon: Calendar,
    color: 'bg-yellow-500',
    prefix: 'CE', 
    example: 'CE-2025-VER-XXXX-X',
    prompt: 'Project or event name',
    placeholder: 'ChittyID Integration'
  }
];

export default function UniversalQuickStart() {
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: universalStats } = useQuery({
    queryKey: ['/api/universal/stats'],
    refetchInterval: 5000,
  });

  const createEntity = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('POST', '/api/universal/create', data);
      return response.json();
    },
    onSuccess: (data: any, variables: any) => {
      setCompletedSteps(prev => new Set([...Array.from(prev), variables.entity_type]));
      toast({
        title: "ChittyID Created!",
        description: `${data.chitty_id_code} generated successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/universal/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create entity",
        variant: "destructive",
      });
    }
  });

  const handleQuickCreate = (entityConfig: typeof quickStartEntities[0]) => {
    const defaultName = entityConfig.type === 'person' ? 'Demo User' :
                       entityConfig.type === 'place' ? 'Demo Location' :
                       entityConfig.type === 'thing' ? 'Demo Device' :
                       'Demo Project';

    createEntity.mutate({
      entity_type: entityConfig.type,
      name: defaultName,
      description: `Quick start ${entityConfig.type} for ChittyID system`,
      attributes: {},
      is_public: true
    });
  };

  const totalSteps = quickStartEntities.length;
  const completedCount = completedSteps.size;
  const progressPercent = (completedCount / totalSteps) * 100;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Universal ChittyID Quick Start
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create your first ChittyIDs across all entity types
        </p>
        
        <div className="mt-4 max-w-xs mx-auto">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progress</span>
            <span>{completedCount}/{totalSteps}</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quickStartEntities.map((entity) => {
          const Icon = entity.icon;
          const isCompleted = completedSteps.has(entity.type);
          const isCreating = createEntity.isPending;

          return (
            <Card
              key={entity.type}
              className={`transition-all duration-200 ${
                isCompleted 
                  ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900'
                  : 'hover:shadow-md'
              }`}
              data-testid={`card-quickstart-${entity.type}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${entity.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{entity.name}</CardTitle>
                      <Badge variant="outline" className="text-xs mt-1">
                        {entity.prefix}-2025-VER-XXXX-X
                      </Badge>
                    </div>
                  </div>
                  {isCompleted && (
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {entity.description}
                </p>
                
                <Button
                  onClick={() => handleQuickCreate(entity)}
                  disabled={isCompleted || isCreating}
                  size="sm"
                  className="w-full"
                  variant={isCompleted ? "outline" : "default"}
                  data-testid={`button-quickstart-${entity.type}`}
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Created
                    </>
                  ) : isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Quick Create
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {universalStats && Object.keys(universalStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Star className="h-5 w-5 text-blue-600" />
              Universal System Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-600" data-testid="stat-people">
                  {(universalStats as any)?.people?.total || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">People</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600" data-testid="stat-places">
                  {(universalStats as any)?.places?.total || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Places</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600" data-testid="stat-things">
                  {(universalStats as any)?.things?.total || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Things</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600" data-testid="stat-events">
                  {(universalStats as any)?.events?.total || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Events</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Universal Entities
                </div>
                <div className="text-xl font-bold" data-testid="stat-total">
                  {(universalStats as any)?.total_universal_entities || 0}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {completedCount === totalSteps && (
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900">
          <CardContent className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h4 className="text-lg font-semibold mb-2">Quick Start Complete!</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You've successfully created ChittyIDs for people, places, things, and events.
              Your universal identity system is now active!
            </p>
            <Badge className="bg-blue-600">
              Universal ChittyID System Activated
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}