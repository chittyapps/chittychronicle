import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  MessageSquare, Users, Search, Filter, Phone, Mail, 
  MessageCircle, FileText, Calendar, ArrowRight, ChevronLeft,
  Smartphone, Globe, User
} from "lucide-react";
import { Link as RouterLink } from "wouter";
import { MessageTimelineIntegration } from "@/components/message-timeline-integration";
import { CommunicationsContradictionAnalyzer } from "@/components/communications-contradiction-analyzer";

export default function Communications() {
  const { caseId } = useParams();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");

  const { data: caseDetails } = useQuery({
    queryKey: ["/api/cases", caseId],
    retry: false,
    enabled: !!caseId,
  });

  const { data: communicationsSummary } = useQuery({
    queryKey: ["/api/cases", caseId, "communications-summary"],
    retry: false,
    enabled: !!caseId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/cases", caseId, "messages"],
    retry: false,
    enabled: !!caseId,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["/api/cases", caseId, "conversations"],
    retry: false,
    enabled: !!caseId,
  });

  const { data: parties = [] } = useQuery({
    queryKey: ["/api/cases", caseId, "parties"],
    retry: false,
    enabled: !!caseId,
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ["/api/cases", caseId, "messages", "search", searchQuery],
    retry: false,
    enabled: !!caseId && searchQuery.length > 2,
  });

  const getSourceIcon = (source: string) => {
    switch (source) {
      case "email": return Mail;
      case "whatsapp": return MessageCircle;
      case "imessage": return Smartphone;
      case "openphone": return Phone;
      case "docusign": return FileText;
      default: return MessageSquare;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case "email": return "bg-blue-100 text-blue-700 border-blue-200";
      case "whatsapp": return "bg-green-100 text-green-700 border-green-200";
      case "imessage": return "bg-gray-100 text-gray-700 border-gray-200";
      case "openphone": return "bg-purple-100 text-purple-700 border-purple-200";
      case "docusign": return "bg-orange-100 text-orange-700 border-orange-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case "inbound": return "bg-green-50 border-l-4 border-l-green-500";
      case "outbound": return "bg-blue-50 border-l-4 border-l-blue-500";
      case "system": return "bg-yellow-50 border-l-4 border-l-yellow-500";
      default: return "bg-gray-50 border-l-4 border-l-gray-500";
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  if (!caseDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading case details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <RouterLink href={`/timeline/${caseId}`}>
                <Button variant="ghost" size="sm" data-testid="button-back-timeline">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back to Timeline
                </Button>
              </RouterLink>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Communications</h1>
                <p className="text-gray-600">{(caseDetails as any)?.caseName} - {(caseDetails as any)?.caseNumber}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button size="sm" variant="outline" data-testid="button-import-messages">
                <FileText className="h-4 w-4 mr-2" />
                Import Messages
              </Button>
              <Button size="sm" data-testid="button-add-message">
                <MessageSquare className="h-4 w-4 mr-2" />
                Add Message
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Messages</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(communicationsSummary as any)?.summary?.totalMessages || 0}
                  </p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Conversations</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(communicationsSummary as any)?.summary?.totalConversations || 0}
                  </p>
                </div>
                <MessageCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Parties</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(communicationsSummary as any)?.summary?.totalParties || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Sources</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {Object.keys((communicationsSummary as any)?.summary?.messagesBySource || {}).length}
                  </p>
                </div>
                <Globe className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Source Breakdown */}
        {(communicationsSummary as any)?.summary?.messagesBySource && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Messages by Source</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries((communicationsSummary as any).summary.messagesBySource).map(([source, count]: [string, any]) => {
                  const SourceIcon = getSourceIcon(source);
                  return (
                    <div key={source} className="text-center">
                      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${getSourceColor(source)} mb-2`}>
                        <SourceIcon className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium capitalize">{source}</p>
                      <p className="text-lg font-bold">{count as number}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search messages..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-messages"
                  />
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="messages" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="messages" data-testid="tab-messages">Messages</TabsTrigger>
            <TabsTrigger value="conversations" data-testid="tab-conversations">Conversations</TabsTrigger>
            <TabsTrigger value="parties" data-testid="tab-parties">Parties</TabsTrigger>
            <TabsTrigger value="contradictions" data-testid="tab-contradictions">Analysis</TabsTrigger>
          </TabsList>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-4">
            <div className="grid gap-4">
              {((searchQuery.length > 2 ? searchResults : messages) as any[]).map((message: any) => (
                <Card key={message.id} className={getDirectionColor(message.direction)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {(() => {
                            const SourceIcon = getSourceIcon(message.source);
                            return <SourceIcon className="h-4 w-4" />;
                          })()}
                          <Badge variant="outline" className={getSourceColor(message.source)}>
                            {message.source}
                          </Badge>
                          <Badge variant="outline" className={
                            message.direction === 'inbound' ? 'bg-green-100 text-green-700' :
                            message.direction === 'outbound' ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                          }>
                            {message.direction}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(message.sentAt)}
                          </span>
                        </div>
                        <div className="space-y-2">
                          {message.subject && (
                            <h4 className="font-medium">{message.subject}</h4>
                          )}
                          <p className="text-gray-700 line-clamp-3">{message.bodyText}</p>
                          {message.senderPartyId && (
                            <p className="text-sm text-gray-500">
                              From: {(parties as any[]).find((p: any) => p.id === message.senderPartyId)?.displayName || 'Unknown'}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MessageTimelineIntegration
                          message={message}
                          caseId={caseId!}
                          senderName={parties.find((p: any) => p.id === message.senderPartyId)?.displayName}
                        />
                        <Button variant="ghost" size="sm" data-testid={`button-view-message-${message.id}`}>
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(messages as any[])?.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No messages found</h3>
                    <p className="text-gray-600 mb-4">Start by importing messages from your communication platforms.</p>
                    <Button>
                      <FileText className="h-4 w-4 mr-2" />
                      Import Messages
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Conversations Tab */}
          <TabsContent value="conversations" className="space-y-4">
            <div className="grid gap-4">
              {(conversations as any[]).map((conversation: any) => (
                <Card key={conversation.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {(() => {
                            const SourceIcon = getSourceIcon(conversation.source);
                            return <SourceIcon className="h-4 w-4" />;
                          })()}
                          <Badge variant="outline" className={getSourceColor(conversation.source)}>
                            {conversation.source}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {conversation.externalThreadId}
                          </span>
                        </div>
                        <h4 className="font-medium mb-1">{conversation.subject || 'No Subject'}</h4>
                        <p className="text-sm text-gray-600">
                          Last activity: {formatDateTime(conversation.lastMessageAt || conversation.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{conversation.messageCount || 0} messages</p>
                        <Button variant="ghost" size="sm" className="mt-1">
                          View Thread
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(conversations as any[])?.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No conversations found</h3>
                    <p className="text-gray-600">Conversations will appear here as messages are grouped into threads.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Parties Tab */}
          <TabsContent value="parties" className="space-y-4">
            <div className="grid gap-4">
              {(parties as any[]).map((party: any) => (
                <Card key={party.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{party.displayName}</h4>
                          <p className="text-sm text-gray-600">{party.role || 'Unknown Role'}</p>
                          {party.chittyId && (
                            <Badge variant="outline" className="mt-1">
                              ChittyID: {party.chittyId}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        View Details
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {(parties as any[])?.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No parties found</h3>
                    <p className="text-gray-600">Parties will be automatically identified from imported messages.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Contradiction Analysis Tab */}
          <TabsContent value="contradictions" className="space-y-4">
            <CommunicationsContradictionAnalyzer caseId={caseId!} />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}