import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useToast } from "@/hooks/use-toast";
import { useParams } from "wouter";
import AppHeader from "@/components/app-header";
import Sidebar from "@/components/sidebar";
import TimelineEntry from "@/components/timeline-entry";
import TimelineEntryModal from "@/components/timeline-entry-modal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Filter, Search, Calendar } from "lucide-react";
import type { Case, TimelineEntry as TimelineEntryType } from "@shared/schema";

export default function Timeline() {
  const { caseId } = useParams<{ caseId: string }>();
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntryType | null>(null);
  const [filters, setFilters] = useState({
    entryType: 'all',
    startDate: '',
    endDate: '',
    searchQuery: '',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  // Get case details
  const { data: caseDetails, isLoading: caseLoading } = useQuery<Case>({
    queryKey: ["/api/cases", caseId],
    queryFn: async () => {
      const response = await fetch(`/api/cases/${caseId}?`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!caseId,
    retry: false,
  });

  // Get timeline entries
  const { data: timelineData, isLoading: timelineLoading, refetch: refetchTimeline } = useQuery<{
    entries: TimelineEntryType[];
    total: number;
  }>({
    queryKey: ["/api/timeline/entries", caseId, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        caseId: caseId!,
        ...(filters.entryType !== 'all' && { entryType: filters.entryType }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      });
      
      const response = await fetch(`/api/timeline/entries?${params}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!caseId,
    retry: false,
  });

  // Get upcoming deadlines
  const { data: deadlinesData } = useQuery<{ deadlines: TimelineEntryType[] }>({
    queryKey: ["/api/timeline/analysis/deadlines", caseId],
    queryFn: async () => {
      const response = await fetch(`/api/timeline/analysis/deadlines?caseId=${caseId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error(`${response.status}: ${response.statusText}`);
      return response.json();
    },
    enabled: !!caseId,
    retry: false,
  });

  const handleCreateEntry = () => {
    setSelectedEntry(null);
    setShowEntryModal(true);
  };

  const handleEditEntry = (entry: TimelineEntryType) => {
    setSelectedEntry(entry);
    setShowEntryModal(true);
  };

  const handleModalClose = () => {
    setShowEntryModal(false);
    setSelectedEntry(null);
    refetchTimeline();
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  if (isLoading || caseLoading || timelineLoading) {
    return (
      <div className="min-h-screen bg-bg-light">
        <AppHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-300 rounded w-64 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <div className="h-64 bg-gray-300 rounded-lg"></div>
                <div className="h-48 bg-gray-300 rounded-lg"></div>
              </div>
              <div className="lg:col-span-3 space-y-6">
                <div className="h-32 bg-gray-300 rounded-lg"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-gray-300 rounded-lg"></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!caseDetails) {
    return (
      <div className="min-h-screen bg-bg-light">
        <AppHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="text-center py-12">
            <CardContent>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Case Not Found
              </h3>
              <p className="text-muted">
                The case you're looking for doesn't exist or you don't have access to it.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light">
      <AppHeader currentCase={caseDetails} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Sidebar */}
          <Sidebar 
            caseDetails={caseDetails} 
            deadlines={deadlinesData?.deadlines || []}
            onCreateEntry={handleCreateEntry}
          />

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Timeline Controls */}
            <Card className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900" data-testid="timeline-title">
                    Timeline Overview
                  </h2>
                  <p className="text-sm text-muted mt-1">
                    Chronological view of case events and tasks
                  </p>
                </div>
                <Button
                  onClick={handleCreateEntry}
                  className="bg-primary hover:bg-primary-dark text-white font-semibold"
                  data-testid="add-entry-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Entry
                </Button>
              </div>
              
              {/* Filters */}
              <div className="mt-6 flex flex-wrap gap-3">
                {/* Entry Type Filter */}
                <div className="flex gap-2">
                  {['all', 'event', 'task'].map((type) => (
                    <Button
                      key={type}
                      variant={filters.entryType === type ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange('entryType', type)}
                      className={
                        filters.entryType === type
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }
                      data-testid={`filter-${type}`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
                
                {/* Date Range */}
                <div className="flex items-center space-x-2">
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="text-xs"
                    data-testid="start-date-filter"
                  />
                  <span className="text-xs text-muted">to</span>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="text-xs"
                    data-testid="end-date-filter"
                  />
                </div>
              </div>
            </Card>

            {/* Timeline Visualization */}
            <Card className="p-6">
              <div className="relative">
                {timelineData && timelineData.entries.length > 0 ? (
                  <div className="space-y-6">
                    {timelineData.entries.map((entry, index) => (
                      <TimelineEntry
                        key={entry.id}
                        entry={entry}
                        isLast={index === timelineData.entries.length - 1}
                        onEdit={() => handleEditEntry(entry)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="w-16 h-16 text-muted mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No Timeline Entries
                    </h3>
                    <p className="text-muted mb-6">
                      Start building your case timeline by adding events and tasks
                    </p>
                    <Button
                      onClick={handleCreateEntry}
                      className="bg-primary hover:bg-primary-dark text-white font-semibold"
                      data-testid="create-first-entry-button"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Entry
                    </Button>
                  </div>
                )}
                
                {/* Timeline line - only show if there are entries */}
                {timelineData && timelineData.entries.length > 0 && (
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-300"></div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Entry Modal */}
        <TimelineEntryModal
          isOpen={showEntryModal}
          onClose={handleModalClose}
          caseId={caseId!}
          entry={selectedEntry}
        />
      </div>
    </div>
  );
}
