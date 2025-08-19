import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Clock, FileText, Filter, Search, Eye } from "lucide-react";
import { Link } from "wouter";
import AppHeader from "@/components/app-header";
import type { Case, TimelineEntry } from "@shared/schema";

export default function Timelines() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCase, setSelectedCase] = useState<string>("all");
  const [entryType, setEntryType] = useState<string>("all");

  // Fetch all cases
  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    throwOnError: false,
  });

  // Fetch all timeline entries
  const { data: allTimelines = [] } = useQuery<TimelineEntry[]>({
    queryKey: ["/api/timeline/all"],
    throwOnError: false,
  });

  // Filter timeline entries
  const filteredTimelines = allTimelines.filter((entry) => {
    const matchesSearch = searchTerm === "" || 
      entry.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.entryType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCase = selectedCase === "all" || entry.caseId === selectedCase;
    const matchesType = entryType === "all" || entry.entryType === entryType;
    
    return matchesSearch && matchesCase && matchesType;
  });

  const formatDate = (dateString: string) => {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEntryTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'evidence':
        return 'bg-blue-100 text-blue-800';
      case 'witness':
        return 'bg-green-100 text-green-800';
      case 'deadline':
        return 'bg-red-100 text-red-800';
      case 'document':
        return 'bg-purple-100 text-purple-800';
      case 'court_filing':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCaseName = (caseId: string) => {
    const caseItem = cases.find(c => c.id === caseId);
    return caseItem ? `${caseItem.caseName} (${caseItem.caseNumber})` : 'Unknown Case';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="timelines-title">
              All Timelines
            </h1>
            <p className="text-gray-600 mt-2">
              View and manage timeline entries across all your cases
            </p>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filter Timeline Entries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label htmlFor="search" className="text-sm font-medium text-gray-700">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search descriptions, types..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                      data-testid="search-input"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="case-filter" className="text-sm font-medium text-gray-700">
                    Case
                  </label>
                  <Select value={selectedCase} onValueChange={setSelectedCase}>
                    <SelectTrigger data-testid="case-filter">
                      <SelectValue placeholder="All cases" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cases</SelectItem>
                      {cases.map((caseItem) => (
                        <SelectItem key={caseItem.id} value={caseItem.id}>
                          {caseItem.caseName} - {caseItem.caseNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="type-filter" className="text-sm font-medium text-gray-700">
                    Entry Type
                  </label>
                  <Select value={entryType} onValueChange={setEntryType}>
                    <SelectTrigger data-testid="type-filter">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="evidence">Evidence</SelectItem>
                      <SelectItem value="witness">Witness</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="court_filing">Court Filing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Entries */}
          <div className="space-y-4">
            {filteredTimelines.length === 0 ? (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Timeline Entries Found
                    </h3>
                    <p className="text-gray-600">
                      {searchTerm || selectedCase !== "all" || entryType !== "all" 
                        ? "No entries match your current filters."
                        : "Create your first timeline entry to get started."
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-600">
                    Showing {filteredTimelines.length} of {allTimelines.length} entries
                  </p>
                </div>
                
                {filteredTimelines.map((entry) => (
                  <Card key={entry.id} className="hover:shadow-md transition-shadow duration-200">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getEntryTypeColor(entry.entryType)}>
                              {entry.entryType}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {getCaseName(entry.caseId)}
                            </span>
                          </div>
                          
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {entry.description}
                          </h3>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatDate(entry.date)}</span>
                            </div>
                            {entry.detailedNotes && (
                              <div className="flex items-center gap-1">
                                <FileText className="w-4 h-4" />
                                <span>Notes available</span>
                              </div>
                            )}
                          </div>
                          
                          {entry.detailedNotes && (
                            <p className="text-gray-700 mt-2 line-clamp-2">
                              {entry.detailedNotes}
                            </p>
                          )}
                        </div>
                        
                        <div className="ml-4 flex flex-col items-end gap-2">
                          <Link href={`/timeline/${entry.caseId}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`view-case-timeline-${entry.id}`}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Timeline
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}