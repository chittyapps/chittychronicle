import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { User, MapPin, Package, Calendar, Shield, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface UniversalEntity {
  id: string;
  chitty_id_code: string;
  entity_type: 'person' | 'place' | 'thing' | 'event';
  name: string;
  description?: string;
  trust_score: number;
  trust_level: string;
  is_public: boolean;
}

const entityConfig = {
  person: {
    icon: User,
    color: 'bg-blue-500',
    prefix: 'CP',
    label: 'Person',
    description: 'Create a ChittyID for an individual'
  },
  place: {
    icon: MapPin,
    color: 'bg-orange-500',
    prefix: 'CL',
    label: 'Place',
    description: 'Create a ChittyID for a location or venue'
  },
  thing: {
    icon: Package,
    color: 'bg-red-500',
    prefix: 'CT',
    label: 'Thing',
    description: 'Create a ChittyID for an object or asset'
  },
  event: {
    icon: Calendar,
    color: 'bg-yellow-500',
    prefix: 'CE',
    label: 'Event',
    description: 'Create a ChittyID for an activity or experience'
  }
};

export default function UniversalEntityCreator() {
  const [selectedType, setSelectedType] = useState<string>('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [attributes, setAttributes] = useState('{}');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createEntity = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/universal/create', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: (data: UniversalEntity) => {
      toast({
        title: "Universal ChittyID Created",
        description: `${data.chitty_id_code} created for ${data.name}`,
      });
      
      // Reset form
      setSelectedType('');
      setName('');
      setDescription('');
      setIsPublic(false);
      setAttributes('{}');
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/universal/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create universal entity",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !name.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select an entity type and provide a name",
        variant: "destructive",
      });
      return;
    }

    let parsedAttributes = {};
    if (attributes.trim()) {
      try {
        parsedAttributes = JSON.parse(attributes);
      } catch (error) {
        toast({
          title: "Invalid Attributes",
          description: "Attributes must be valid JSON",
          variant: "destructive",
        });
        return;
      }
    }

    createEntity.mutate({
      entity_type: selectedType,
      name: name.trim(),
      description: description.trim() || undefined,
      attributes: parsedAttributes,
      is_public: isPublic
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Shield className="mx-auto h-12 w-12 text-blue-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create Universal ChittyID
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Generate ChittyIDs for People, Places, Things, and Events
        </p>
      </div>

      {/* Entity Type Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(entityConfig).map(([type, config]) => {
          const Icon = config.icon;
          const isSelected = selectedType === type;
          
          return (
            <Card
              key={type}
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                isSelected 
                  ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950 dark:to-gray-900' 
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedType(type)}
              data-testid={`card-entity-type-${type}`}
            >
              <CardHeader className="text-center pb-2">
                <div className={`mx-auto p-3 rounded-full ${config.color} text-white mb-2`}>
                  <Icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{config.label}</CardTitle>
                <Badge variant="outline" className="mx-auto">
                  {config.prefix}-YYYY-VER-NNNN-X
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {config.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Creation Form */}
      {selectedType && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Create {entityConfig[selectedType as keyof typeof entityConfig].label} ChittyID
            </CardTitle>
            <CardDescription>
              Generate a unique ChittyID with advanced trust scoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={`Enter ${selectedType} name`}
                    data-testid="input-entity-name"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description (optional)"
                    data-testid="input-entity-description"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attributes">Additional Attributes (JSON)</Label>
                <Textarea
                  id="attributes"
                  value={attributes}
                  onChange={(e) => setAttributes(e.target.value)}
                  placeholder='{"key": "value", "location": "Chicago", "category": "tech"}'
                  className="font-mono text-sm"
                  rows={3}
                  data-testid="textarea-entity-attributes"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  data-testid="switch-entity-public"
                />
                <Label htmlFor="is_public">
                  Make this entity publicly discoverable
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createEntity.isPending || !selectedType || !name.trim()}
                data-testid="button-create-entity"
              >
                {createEntity.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Creating ChittyID...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Create {entityConfig[selectedType as keyof typeof entityConfig].prefix} ChittyID
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}