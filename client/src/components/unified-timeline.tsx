import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Clock, MessageSquare, Mail, MessageCircle, Phone, FileText, 
  User, MapPin, Database, Calendar, Search, Filter, ArrowRight,
  Smartphone, Globe
} from "lucide-react";
import { MessageTimelineIntegration } from "@/components/message-timeline-integration";

interface UnifiedTimelineItem {
  id: string;
  type: 'timeline_entry' | 'message';
  date: string;
  timestamp: string;
  title: string;
  description: string;
  source?: string;
  evidenceType?: string;
  significance?: string;
  confidence?: string;
  direction?: string;
  platform?: string;
  participants?: string;
  location?: string;
  messageId?: string;
  senderPartyId?: string;
  bodyText?: string;
  subject?: string;
}

interface UnifiedTimelineProps {
  caseId: string;
}

export function UnifiedTimeline({ caseId }: UnifiedTimelineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [selectedSource, setSelectedSource] = useState<string>("all");

  const { data: timelineEntries = [] } = useQuery({
    queryKey: ["/api/timeline", caseId],
    retry: false,
    enabled: !!caseId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/cases", caseId, "messages"],
    retry: false,
    enabled: !!caseId,
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["/api/cases", caseId, "parties"],
    retry: false,
    enabled: !!caseId,
  });

  // Merge timeline entries and messages into unified timeline
  const unifiedItems: UnifiedTimelineItem[] = [
    // Timeline entries
    ...timelineEntries.map((entry: any) => ({
      id: `timeline-${entry.id}`,
      type: 'timeline_entry' as const,
      date: entry.date,
      timestamp: entry.date,
      title: entry.description,
      description: entry.detailedNotes || entry.description,
      evidenceType: entry.evidenceType || 'document',
      significance: entry.significance,
      confidence: entry.confidenceLevel,
      participants: entry.participants,
      location: entry.location,
      source: entry.source || 'timeline',
    })),
    // Messages
    ...messages.map((message: any) => ({
      id: `message-${message.id}`,
      type: 'message' as const,
      date: message.sentAt.split('T')[0],
      timestamp: message.sentAt,
      title: message.subject || `${message.source} communication`,
      description: message.bodyText,
      source: message.source,
      platform: message.source,
      direction: message.direction,
      messageId: message.id,
      senderPartyId: message.senderPartyId,
      bodyText: message.bodyText,
      subject: message.subject,
      participants: (parties as any[]).find((p: any) => p.id === message.senderPartyId)?.displayName || 'Unknown',
    })),
  ]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .filter((item) => {
      // Search filter
      if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !item.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      // Type filter
      if (selectedFilter !== 'all' && item.type !== selectedFilter) {
        return false;
      }
      
      // Source filter
      if (selectedSource !== 'all' && item.source !== selectedSource) {
        return false;
      }
      
      return true;
    });

  const getItemIcon = (item: UnifiedTimelineItem) => {
    if (item.type === 'timeline_entry') {
      switch (item.evidenceType) {
        case 'document': return FileText;
        case 'witness': return User;
        case 'physical': return MapPin;
        case 'digital': return Database;
        case 'communication': return MessageSquare;
        default: return Clock;
      }
    } else {
      switch (item.platform) {
        case 'email': return Mail;
        case 'whatsapp': return MessageCircle;
        case 'imessage': return Smartphone;
        case 'openphone': return Phone;
        case 'docusign': return FileText;
        default: return MessageSquare;
      }
    }
  };

  const getItemColor = (item: UnifiedTimelineItem) => {
    if (item.type === 'timeline_entry') {
      switch (item.significance || item.confidence) {
        case 'high': return 'border-red-200 bg-red-50';
        case 'medium': return 'border-yellow-200 bg-yellow-50';
        case 'low': return 'border-green-200 bg-green-50';
        default: return 'border-gray-200 bg-gray-50';
      }
    } else {
      switch (item.direction) {
        case 'inbound': return 'border-green-200 bg-green-50';
        case 'outbound': return 'border-blue-200 bg-blue-50';
        case 'system': return 'border-yellow-200 bg-yellow-50';
        default: return 'border-gray-200 bg-gray-50';
      }
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'email': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'whatsapp': return 'bg-green-100 text-green-700 border-green-200';
      case 'imessage': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'openphone': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'docusign': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'timeline': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get unique sources for filter dropdown
  const availableSources = ['all', ...Array.from(new Set(unifiedItems.map(item => item.source).filter(Boolean)))];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search timeline..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-unified-timeline-search"
                />
              </div>
            </div>
            
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-48" data-testid="select-timeline-filter">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                <SelectItem value="timeline_entry">Timeline Entries</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedSource} onValueChange={setSelectedSource}>
              <SelectTrigger className="w-48" data-testid="select-source-filter">
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                {availableSources.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source === 'all' ? 'All Sources' : source.charAt(0).toUpperCase() + source.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {unifiedItems.filter(item => item.type === 'timeline_entry').length}
            </div>
            <div className="text-sm text-gray-600">Timeline Entries</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {unifiedItems.filter(item => item.type === 'message').length}
            </div>
            <div className="text-sm text-gray-600">Messages</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {availableSources.length - 1}
            </div>
            <div className="text-sm text-gray-600">Sources</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {unifiedItems.length}
            </div>
            <div className="text-sm text-gray-600">Total Items</div>
          </CardContent>
        </Card>
      </div>

      {/* Unified Timeline */}
      <div className="space-y-4">
        {unifiedItems.length > 0 ? (
          unifiedItems.map((item, index) => {
            const ItemIcon = getItemIcon(item);
            const isLast = index === unifiedItems.length - 1;
            
            return (
              <div key={item.id} className="relative">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                )}
                
                <Card className={`ml-12 ${getItemColor(item)} border-l-4`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Timeline icon */}
                        <div className="absolute left-2 top-4 w-8 h-8 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center">
                          <ItemIcon className="h-4 w-4 text-gray-600" />
                        </div>
                        
                        {/* Content */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <Badge variant="outline" className={getSourceColor(item.source || 'unknown')}>
                              {item.type === 'timeline_entry' ? 'Timeline' : item.platform}
                            </Badge>
                            
                            {item.type === 'message' && item.direction && (
                              <Badge variant="outline" className={
                                item.direction === 'inbound' ? 'bg-green-100 text-green-700' :
                                item.direction === 'outbound' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                              }>
                                {item.direction}
                              </Badge>
                            )}
                            
                            {item.significance && (
                              <Badge variant="outline" className={
                                item.significance === 'high' ? 'bg-red-100 text-red-700' :
                                item.significance === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }>
                                {item.significance}
                              </Badge>
                            )}
                            
                            <span className="text-sm text-gray-500">
                              {new Date(item.timestamp).toLocaleString()}
                            </span>
                          </div>
                          
                          <h3 className="font-medium text-gray-900">{item.title}</h3>
                          
                          <p className="text-gray-700 line-clamp-3">{item.description}</p>
                          
                          {item.participants && (
                            <p className="text-sm text-gray-500">
                              <User className="inline h-3 w-3 mr-1" />
                              Participants: {item.participants}
                            </p>
                          )}
                          
                          {item.location && (
                            <p className="text-sm text-gray-500">
                              <MapPin className="inline h-3 w-3 mr-1" />
                              Location: {item.location}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="ml-4 flex items-center space-x-2">
                        {item.type === 'message' && (
                          <MessageTimelineIntegration
                            message={{
                              id: item.messageId!,
                              source: item.platform!,
                              subject: item.subject,
                              bodyText: item.bodyText!,
                              sentAt: item.timestamp,
                              direction: item.direction!,
                              senderPartyId: item.senderPartyId,
                            }}
                            caseId={caseId}
                            senderName={item.participants}
                          />
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-view-item-${item.id}`}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Items Found</h3>
              <p className="text-gray-600">
                {searchQuery || selectedFilter !== 'all' || selectedSource !== 'all' 
                  ? 'Try adjusting your filters to see more items.'
                  : 'Timeline entries and messages will appear here as they are added.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}